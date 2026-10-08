"""Teste fără rețea și fără pytest: `uv run python tests/test_parser.py` (sau `pytest tests/` dacă e instalat)."""
import asyncio
import json
import os
import sys
from datetime import date, datetime, timedelta, timezone
from pathlib import Path

os.environ.update(SUPABASE_URL="http://sb.test", SUPABASE_SECRET_KEY="sb_secret_x", LLAMA_CLOUD_API_KEY="k", PARSER_TOKEN="t")
sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import httpx

import main
from extract import parse_month, to_rows
from reliability import (PermanentError, backoff_delay, check_cv, is_transient, iso, plan_claim, retry_async,
                         user_message)

NOW = datetime(2026, 10, 1, 12, 0, tzinfo=timezone.utc)
STALE, MAXC = timedelta(minutes=15), 3


def status_error(code: int) -> httpx.HTTPStatusError:
    req = httpx.Request("GET", "http://x")
    return httpx.HTTPStatusError("e", request=req, response=httpx.Response(code, request=req))


def test_transient_decisions():
    assert all(is_transient(status_error(c)) for c in (408, 429, 500, 502, 503))
    assert not any(is_transient(status_error(c)) for c in (400, 401, 404, 422))
    assert is_transient(httpx.ReadTimeout("t")) and is_transient(httpx.ConnectError("c")) and is_transient(TimeoutError())
    assert not is_transient(RuntimeError("job FAILED")) and not is_transient(PermanentError("x"))


def test_backoff_grows_and_caps():
    lo = [backoff_delay(a, rng=lambda: 0) for a in (1, 2, 3, 4)]
    hi = [backoff_delay(a, rng=lambda: 1) for a in (1, 2, 3, 4)]
    assert lo == [1, 2, 4, 8] and hi == [2, 4, 8, 16]
    assert backoff_delay(20, rng=lambda: 1) == 60


def test_retry_async():
    calls, slept = [], []

    async def sleep(d):
        slept.append(d)

    async def flaky():
        calls.append(1)
        if len(calls) < 3:
            raise status_error(503)
        return "ok"

    async def hard():
        calls.append(1)
        raise status_error(422)

    async def always():
        calls.append(1)
        raise status_error(429)

    assert asyncio.run(retry_async(flaky, max_tries=3, sleep=sleep)) == "ok" and len(calls) == 3 and len(slept) == 2
    calls.clear()
    try:
        asyncio.run(retry_async(hard, max_tries=3, sleep=sleep))
        assert False
    except httpx.HTTPStatusError:
        assert len(calls) == 1  # 4xx nu se reîncearcă
    calls.clear()
    try:
        asyncio.run(retry_async(always, max_tries=3, sleep=sleep))
        assert False
    except httpx.HTTPStatusError:
        assert len(calls) == 3  # limitat


def test_messages_are_romanian():
    assert "suprasolicitat" in user_message(status_error(429))
    assert "expirat" in user_message(httpx.ReadTimeout("t"))
    assert user_message(PermanentError("Fișierul CV este gol.")) == "Fișierul CV este gol."


def test_check_cv():
    check_cv("o/abc.PDF", 100)
    check_cv("o/abc.docx", 100)
    for path, size in (("o/a.exe", 10), ("o/a.pdf", 0), ("o/a.pdf", 11 * 1024 * 1024)):
        try:
            check_cv(path, size)
            assert False, (path, size)
        except PermanentError:
            pass


def row(status, attempts=0, started=None):
    return {"parsing_status": status, "parse_attempts": attempts, "parse_started_at": started and iso(started)}


def test_plan_claim():
    act, vals, cas = plan_claim(row("pending"), NOW, STALE, MAXC)
    assert act == "claim" and vals["parse_attempts"] == 1 and vals["parsing_status"] == "processing"
    assert cas == {"parsing_status": "eq.pending", "parse_attempts": "eq.0"}
    act, vals, _ = plan_claim(row("failed", 3), NOW, STALE, MAXC)  # reprocesare manuală: contor resetat
    assert act == "claim" and vals["parse_attempts"] == 1
    assert plan_claim(row("processing", 1, NOW - timedelta(minutes=5)), NOW, STALE, MAXC)[0] == "skip"
    act, vals, _ = plan_claim(row("processing", 1, NOW - timedelta(minutes=20)), NOW, STALE, MAXC)
    assert act == "claim" and vals["parse_attempts"] == 2
    assert plan_claim(row("processing", 1), NOW, STALE, MAXC)[0] == "claim"  # fără started_at = blocat
    act, vals, _ = plan_claim(row("processing", 3, NOW - timedelta(hours=1)), NOW, STALE, MAXC)
    assert act == "fail" and vals["parsing_status"] == "failed" and vals["parse_error"]
    assert plan_claim(row("parsed"), NOW, STALE, MAXC)[0] == "skip"
    assert plan_claim(row("needs_review"), NOW, STALE, MAXC)[0] == "skip"


def fake_postgrest(db: dict, between_get_and_patch=None):
    """Imită PostgREST pentru un rând: GET îl întoarce, PATCH se aplică doar dacă filtrele eq. se potrivesc."""
    def handler(req: httpx.Request) -> httpx.Response:
        p = dict(req.url.params)
        if req.method == "GET":
            snap = dict(db)
            if between_get_and_patch:
                between_get_and_patch(db)
            return httpx.Response(200, json=[snap])
        match = all(str(db.get(k)) == v[3:] for k, v in p.items() if v.startswith("eq."))
        if not match:
            return httpx.Response(200, json=[])
        db.update(json.loads(req.content))
        return httpx.Response(200, json=[db])
    return httpx.MockTransport(handler)


def claim_with(db, hook=None):
    async def go():
        async with httpx.AsyncClient(transport=fake_postgrest(db, hook)) as http:
            return (await main.claim(http, "o", "c"))[0]
    return asyncio.run(go())


def test_claim_is_idempotent():
    db = {"id": "c", "organization_id": "o", "cv_url": "o/x.pdf", **row("pending")}
    assert claim_with(db) == "claimed" and db["parsing_status"] == "processing" and db["parse_attempts"] == 1
    assert claim_with(db) == "skipped"  # al doilea /parse: nimic de făcut


def test_claim_lost_race():
    db = {"id": "c", "organization_id": "o", "cv_url": "o/x.pdf", **row("pending")}
    assert claim_with(db, lambda d: d.update(parsing_status="processing")) == "lost"  # altcineva a fost mai rapid


def test_claim_stale_exhausted_fails():
    db = {"id": "c", "organization_id": "o", "cv_url": "o/x.pdf", **row("processing", 3, datetime.now(timezone.utc) - timedelta(days=1))}
    assert claim_with(db) == "failed" and db["parsing_status"] == "failed" and "oprit" in db["parse_error"]


# ---------------------------------------------------------------- normalizare extract.py
T = date(2026, 9, 1)


def one(**kw):
    return to_rows({"experiences": [{"company_name": "A", "role_title": "Dev", **kw}]}, "o", "c", T)


def test_date_formats():
    for v, want in (("2022-03-15", date(2022, 3, 1)), ("3.2022", date(2022, 3, 1)), ("Ianuarie 2021", date(2021, 1, 1)),
                    ("DECEMBRIE 2019", date(2019, 12, 1)), ("2020", date(2020, 1, 1)), ("Noi. 2018", date(2018, 11, 1))):
        assert parse_month(v)[0] == want, v
    for v in ("Prezent", "până în prezent", "CURRENT"):
        assert parse_month(v) == (None, True, True), v
    for v in ("1899", "2022-00", "luna 2022x", "abc"):
        assert parse_month(v)[1] is False, v


def test_overlapping_periods_count_once():
    rows, _, issues = to_rows({"experiences": [
        {"company_name": "A", "role_title": "Dev", "start_date": "2020-01", "end_date": "2022-01"},
        {"company_name": "B", "role_title": "Dev", "start_date": "2021-01", "end_date": "2021-06"},
        {"company_name": "C", "role_title": "Dev", "start_date": "2022-01", "end_date": "prezent"},
    ]}, "o", "c", T)
    assert issues == [] and rows[2]["seniority_level"] == "senior"  # 24 luni înainte (nu 29) + 56 în rol


def test_future_and_unreadable_dates():
    rows, _, issues = one(start_date="2030-01")
    assert rows[0]["start_date"] is None and any("viitor" in i for i in issues)
    rows, _, issues = one(start_date="cândva", end_date="2020-01")
    assert rows[0]["start_date"] is None and any("ilizibilă" in i for i in issues)
    rows, _, _ = one(start_date="2025-01", end_date="2030-01")  # final planificat = rol în desfășurare
    assert rows[0]["end_date"] is None


def test_diacritics_and_skills():
    rows, profile, _ = one(employment_type="Normă întreagă", skills=["Engleză", "engleza", "Ț-SQL", "  "])
    assert rows[0]["employment_type"] == "full_time"
    assert profile["skills"] == ["Engleză", "Ț-SQL"]
    rows, _, _ = one(employment_type="Stagiu de practică")
    assert rows[0]["employment_type"] == "internship"
    c = to_rows({"full_name": "ȘTEFAN ȚURCANU", "experiences": []}, "o", "c", T)[1]["contact"]
    assert c["name"] == "Ștefan Țurcanu"


def test_empty_cv():
    rows, profile, issues = to_rows({}, "o", "c", T)
    assert rows == [] and profile["skills"] == [] and issues == ["nicio experiență profesională găsită"]
    rows, profile, issues = to_rows(None, "o", "c", T, text="")
    assert rows == [] and profile["contact"] == {"name": None, "email": None, "phone": None, "location": None}
    assert to_rows({"experiences": "x"}, "o", "c", T)[2][0].startswith("rezultat invalid")  # AI malformat -> needs_review, fără excepție


def test_edited_experiences_not_duplicated():
    kept = [{"company_name": "Acme  SRL", "role_title": "Dev", "start_date": "2020-03-01"}]
    rows = [{"company_name": "acme srl", "role_title": "dev", "start_date": "2020-03"},
            {"company_name": "Beta", "role_title": "Dev", "start_date": "2021-01"}]
    assert main.drop_matching(rows, kept) == rows[1:]


if __name__ == "__main__":
    tests = [(n, f) for n, f in sorted(globals().items()) if n.startswith("test_")]
    for name, fn in tests:
        fn()
        print("ok", name)
    print(f"OK: {len(tests)} teste")
