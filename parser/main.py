"""Serviciu de parsing CV.

Flux: CV din Storage -> în paralel: previzualizare PDF (DOCX convertit cu LibreOffice), LlamaParse (text)
și LlamaExtract (contact + experiențe după schemă) -> normalizare + validare în Python (extract.py)
-> candidates + candidate_experiences.
Stateless: primește organization_id + candidate_id și filtrează orice citire/scriere pe organization_id.
Fiabilitate: candidatul se revendică atomic (UPDATE condiționat), erorile tranzitorii se reîncearcă cu backoff,
eșecul final ajunge `failed` + `parse_error`, iar un sweeper reia rândurile rămase blocate (restart/crash).
"""
import asyncio
import hmac
import logging
import os
import shutil
import tempfile
import uuid
from typing import Literal
from contextlib import asynccontextmanager
from datetime import datetime, timedelta, timezone
from pathlib import Path

import httpx
from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field

import embeddings
from extract import DATA_SCHEMA, SYSTEM_PROMPT, to_rows
from reliability import PermanentError, check_cv, is_transient, iso, plan_claim, retry_async, user_message

log = logging.getLogger("uvicorn.error")

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SUPABASE_KEY = os.environ["SUPABASE_SECRET_KEY"]
LLAMA_KEY = os.environ["LLAMA_CLOUD_API_KEY"]
PARSER_TOKEN = os.environ["PARSER_TOKEN"]
LLAMA_API = "https://api.cloud.llamaindex.ai/api"
LLAMA_URL = f"{LLAMA_API}/v2/parse"
SOFFICE = shutil.which("soffice") or shutil.which("libreoffice")

# Cheile noi (sb_secret_...) merg doar în header-ul apikey; cele vechi (JWT) și în Authorization.
SB_HEADERS = {"apikey": SUPABASE_KEY}
if not SUPABASE_KEY.startswith("sb_"):
    SB_HEADERS["Authorization"] = f"Bearer {SUPABASE_KEY}"

MAX_TRIES = int(os.getenv("PARSE_MAX_TRIES", "3"))             # încercări în același run (erori tranzitorii)
MAX_CLAIMS = int(os.getenv("PARSE_MAX_CLAIMS", "3"))           # reluări după crash înainte de `failed`
STALE_AFTER = timedelta(minutes=int(os.getenv("PARSE_STALE_MINUTES", "15")))
PENDING_AFTER = timedelta(minutes=int(os.getenv("PARSE_PENDING_MINUTES", "5")))
SWEEP_INTERVAL = int(os.getenv("PARSE_SWEEP_SECONDS", "60"))
SWEEP_PER_ORG = 5                                              # o organizație cu backlog nu le blochează pe celelalte
MAX_BACKLOG = 50                                               # candidați în lucru/așteptare, peste care sweeper-ul nu mai adaugă
SLOTS = asyncio.Semaphore(int(os.getenv("PARSE_CONCURRENCY", "4")))
TIMEOUT = httpx.Timeout(60, connect=10)

ACTIVE: set[str] = set()          # candidați în lucru în acest proces (sweeper-ul nu îi atinge)
TASKS: set[asyncio.Task] = set()  # referințe, ca taskurile să nu fie colectate de GC
SWEEP = {"last_run": None, "last_requeued": 0, "last_error": None, "runs": 0}


def now() -> datetime:
    return datetime.now(timezone.utc)


def check_token(authorization: str):
    if not hmac.compare_digest(authorization, f"Bearer {PARSER_TOKEN}"):
        raise HTTPException(401)


def spawn(coro) -> asyncio.Task:
    task = asyncio.create_task(coro)
    TASKS.add(task)
    task.add_done_callback(TASKS.discard)
    return task


@asynccontextmanager
async def lifespan(_: FastAPI):
    sweeper = asyncio.create_task(sweep_loop())
    yield
    sweeper.cancel()  # taskurile de parsing întrerupte rămân `processing`: le reia sweeper-ul următoarei instanțe


app = FastAPI(lifespan=lifespan)


class ParseRequest(BaseModel):
    organization_id: uuid.UUID  # UUID, nu str: valorile ajung în filtre PostgREST
    candidate_id: uuid.UUID


@app.get("/health")
def health():
    return {"ok": True, "docx_preview": SOFFICE is not None, "active": len(ACTIVE), "sweeper": SWEEP}


@app.post("/parse", status_code=202)
async def parse(req: ParseRequest, authorization: str = Header("")):
    check_token(authorization)
    # Idempotent: revendicarea (UPDATE condiționat) se face în run_one; un al doilea apel pentru același candidat nu face nimic.
    spawn(run_one(str(req.organization_id), str(req.candidate_id)))
    return {"accepted": True}


@app.post("/sweep")
async def sweep(authorization: str = Header("")):
    """Pentru cron extern (în plus față de sweeper-ul intern, util când instanța scalează la zero)."""
    check_token(authorization)
    return await sweep_once()


class EmbedRequest(BaseModel):
    texts: list[str] = Field(min_length=1, max_length=20)
    kind: Literal["query", "passage"]  # modelul ales nu folosește prefixe; câmpul rămâne pentru compatibilitate (ex. e5)


@app.post("/embed")
async def embed(req: EmbedRequest, authorization: str = Header("")):
    check_token(authorization)
    if any(len(t) > 20000 for t in req.texts):
        raise HTTPException(422, "text prea lung")
    vecs = await asyncio.get_running_loop().run_in_executor(embeddings.EXECUTOR, embeddings.embed_texts, req.texts)
    return {"embeddings": vecs}


BACKFILL_BATCH = 20


@app.post("/backfill-embeddings")
async def backfill_embeddings(authorization: str = Header("")):
    """Un lot de BACKFILL_BATCH candidați parsați fără embedding; se apelează repetat până remaining = 0."""
    check_token(authorization)
    loop = asyncio.get_running_loop()
    base = {"parsing_status": "in.(parsed,needs_review)", "embedding": "is.null"}
    done = 0
    async with httpx.AsyncClient(timeout=TIMEOUT) as http:
        r = await http.get(f"{SUPABASE_URL}/rest/v1/candidates", headers=SB_HEADERS, params={
            **base, "select": "id,organization_id,parsed_text,extracted_keywords",
            "order": "created_at.asc", "limit": str(BACKFILL_BATCH)})
        r.raise_for_status()
        for c in r.json():
            try:
                e = await http.get(f"{SUPABASE_URL}/rest/v1/candidate_experiences", headers=SB_HEADERS, params={
                    "candidate_id": f"eq.{c['id']}", "organization_id": f"eq.{c['organization_id']}",
                    "select": "role_title,description", "order": "position.asc"})
                e.raise_for_status()
                text_ = embeddings.candidate_text(c.get("extracted_keywords"), e.json(), c.get("parsed_text") or "")
                if not text_:
                    continue
                [vec] = await loop.run_in_executor(embeddings.EXECUTOR, embeddings.embed_texts, [text_])
                await patch(http, "candidates", c["id"], c["organization_id"], {"embedding": vec})
                done += 1
            except Exception:
                log.exception("backfill embedding failed candidate=%s", c["id"])
        # count exact prin Content-Range; candidații fără text rămân în număr (nu au ce embedda)
        cnt = await http.get(f"{SUPABASE_URL}/rest/v1/candidates", headers={**SB_HEADERS, "Prefer": "count=exact"},
                             params={**base, "select": "id", "limit": "1"})
        cnt.raise_for_status()
    return {"processed": done, "remaining": int(cnt.headers.get("content-range", "*/0").rsplit("/", 1)[-1])}


def fields(**kv) -> str:
    return " ".join(f"{k}={v}" for k, v in kv.items())


async def run_one(org_id: str, cand_id: str):
    """Revendică și procesează un candidat; SLOTS limitează concurența."""
    if cand_id in ACTIVE:
        return
    ACTIVE.add(cand_id)
    try:
        async with SLOTS, httpx.AsyncClient(timeout=TIMEOUT) as http:
            try:
                outcome, cand = await claim(http, org_id, cand_id)
            except Exception:
                log.exception("claim failed %s", fields(org=org_id, candidate=cand_id))  # rămâne pending: îl reia sweeper-ul
                return
            log.info("claim %s", fields(org=org_id, candidate=cand_id, outcome=outcome))
            if outcome == "claimed":
                await process(http, org_id, cand_id, cand)
    finally:
        ACTIVE.discard(cand_id)


async def claim(http: httpx.AsyncClient, org_id: str, cand_id: str) -> tuple[str, dict]:
    """Revendicare atomică: citește starea, apoi PATCH cu aceleași condiții (status + parse_attempts).
    Dacă între timp s-a schimbat rândul, PATCH-ul nu potrivește nimic și revendicarea se pierde ("lost")."""
    r = await http.get(f"{SUPABASE_URL}/rest/v1/candidates", headers=SB_HEADERS, params={
        "id": f"eq.{cand_id}", "organization_id": f"eq.{org_id}",
        "select": "id,cv_url,parsing_status,parse_attempts,parse_started_at",
    })
    r.raise_for_status()
    rows = r.json()
    if not rows:
        return "missing", {}
    cand = rows[0]
    action, values, cas = plan_claim(cand, now(), STALE_AFTER, MAX_CLAIMS)
    if action == "skip":
        return "skipped", cand
    r = await http.patch(
        f"{SUPABASE_URL}/rest/v1/candidates",
        headers={**SB_HEADERS, "Prefer": "return=representation"},
        params={"id": f"eq.{cand_id}", "organization_id": f"eq.{org_id}", **cas},
        json=values,
    )
    r.raise_for_status()
    if not r.json():
        return "lost", cand
    return ("claimed" if action == "claim" else "failed"), cand


async def process(http: httpx.AsyncClient, org_id: str, cand_id: str, cand: dict):
    ctx = fields(org=org_id, candidate=cand_id)

    async def on_retry(attempt: int, delay: float, e: BaseException):
        log.warning("transient error, retry in %.1fs %s attempt=%d: %r", delay, ctx, attempt, e)
        await patch(http, "candidates", cand_id, org_id, {"parse_started_at": iso(now())})  # rămâne „în lucru” pentru sweeper

    started = now()
    try:
        if not cand.get("cv_url"):
            raise PermanentError("Candidatul nu are CV atașat.")
        await patch(http, "candidates", cand_id, org_id, {"parse_started_at": iso(started)})  # ceasul începe după ce are slot
        await retry_async(lambda: _process(http, org_id, cand_id, cand["cv_url"]),
                          max_tries=MAX_TRIES, sleep=asyncio.sleep, on_retry=on_retry)
    except Exception as e:
        if isinstance(e, PermanentError):
            log.warning("parse rejected %s: %s", ctx, e)
        else:
            log.exception("parse failed %s", ctx)
        try:
            await patch(http, "candidates", cand_id, org_id, {"parsing_status": "failed", "parse_error": user_message(e)})
        except Exception:
            log.exception("could not mark candidate failed %s", ctx)  # rămâne processing: îl reia sweeper-ul
        return
    log.info("done %s seconds=%.1f", ctx, (now() - started).total_seconds())


async def _process(http: httpx.AsyncClient, org_id: str, cand_id: str, cv_url: str):
    # Cheia de serviciu ocolește RLS din Storage: nu descărcăm nimic din afara folderului organizației.
    if not cv_url.startswith(f"{org_id}/") or ".." in cv_url:
        raise PermanentError("Calea CV-ului nu aparține organizației.")
    cv = await http.get(f"{SUPABASE_URL}/storage/v1/object/cvs/{cv_url}", headers=SB_HEADERS)
    cv.raise_for_status()
    check_cv(cv_url, len(cv.content))
    # Numele trimis la LlamaCloud e cel din Storage (uuid), nu numele original al fișierului.
    filename = cv_url.rsplit("/", 1)[-1]

    # return_exceptions: nicio sarcină nu rămâne orfană când alta cade (o reîncercare le-ar dubla)
    done = await asyncio.gather(
        make_preview(http, org_id, filename, cv.content),
        llamaparse(http, filename, cv.content),
        extract(http, filename, cv.content),
        return_exceptions=True,
    )
    if err := next((d for d in done if isinstance(d, BaseException)), None):
        raise err
    preview, text, result = done
    if result is None:
        rows_, profile, status = [], None, "needs_review"
    else:
        rows_, profile, issues = to_rows(result, org_id, cand_id, text=text)
        if issues:
            log.info("extraction issues candidate=%s: %s", cand_id, "; ".join(issues))
        status = "needs_review" if issues else "parsed"

    # Editările manuale ale recrutorului (edited_manually) nu se suprascriu la reprocesare.
    cand_edited, kept = await manual_edits(http, cand_id, org_id)
    await delete_experiences(http, cand_id, org_id)
    rows_ = drop_matching(rows_, kept)
    if rows_:
        ins = await http.post(f"{SUPABASE_URL}/rest/v1/candidate_experiences",
                              headers={**SB_HEADERS, "Prefer": "return=minimal"}, json=rows_)
        ins.raise_for_status()
    contact = (profile or {}).pop("contact", {}) if profile else {}
    if cand_edited:
        contact = {k: v for k, v in contact.items() if k not in PROTECTED_CONTACT}
    await patch(http, "candidates", cand_id, org_id, {
        **{k: v for k, v in contact.items() if v},
        "parsed_text": text, "extracted_keywords": profile, "parsing_status": status, "preview_path": preview,
        "parse_error": None,
    })
    log.info("parsed %s", fields(org=org_id, candidate=cand_id, status=status, experiences=len(rows_)))
    try:  # embedding-ul nu trebuie să strice parsarea
        text_ = embeddings.candidate_text(profile, rows_, text)
        if text_:
            [vec] = await asyncio.get_running_loop().run_in_executor(embeddings.EXECUTOR, embeddings.embed_texts, [text_])
            await patch(http, "candidates", cand_id, org_id, {"embedding": vec})
    except Exception:
        log.exception("embedding failed %s", fields(org=org_id, candidate=cand_id))


async def extract(http: httpx.AsyncClient, filename: str, content: bytes) -> dict | None:
    """Rezultatul brut LlamaExtract; None la eșec (candidatul ajunge „needs_review”, textul se păstrează)."""
    try:
        return await llama_extract(http, filename, content)
    except Exception as e:
        if is_transient(e):
            raise  # se reîncearcă tot pipeline-ul; needs_review doar pentru erori care nu se vor repara singure
        log.exception("LlamaExtract failed")
        return None


async def llama_extract(http: httpx.AsyncClient, filename: str, content: bytes) -> dict:
    auth = {"Authorization": f"Bearer {LLAMA_KEY}"}
    r = await http.post(f"{LLAMA_API}/v1/beta/files", headers=auth,
                        files={"file": (filename, content)}, data={"purpose": "extract"})
    r.raise_for_status()
    r = await http.post(f"{LLAMA_API}/v2/extract", headers=auth, json={
        "file_input": r.json()["id"],
        "configuration": {
            "tier": "agentic",
            "extraction_target": "per_doc",
            "data_schema": DATA_SCHEMA,
            "system_prompt": SYSTEM_PROMPT,
        },
    })
    r.raise_for_status()
    job_id = r.json()["id"]
    for _ in range(150):  # ~5 minute
        await asyncio.sleep(2)
        r = await http.get(f"{LLAMA_API}/v2/extract/{job_id}", headers=auth)
        r.raise_for_status()
        job = r.json()
        if job["status"] == "COMPLETED":
            return job["extract_result"] or {}
        if job["status"] in ("FAILED", "CANCELLED", "ERROR"):
            raise RuntimeError(f"LlamaExtract job {job_id} {job['status']}: {job.get('error_message')}")
    raise TimeoutError(f"LlamaExtract job {job_id} did not finish")


async def make_preview(http: httpx.AsyncClient, org_id: str, filename: str, content: bytes) -> str | None:
    """PDF-ul se afișează direct (preview_path null); DOCX-ul se convertește ca previzualizarea să fie la fel pentru orice CV."""
    if filename.lower().endswith(".pdf"):
        return None
    if not SOFFICE:
        log.warning("LibreOffice lipsește: fără previzualizare pentru %s", filename)
        return None
    with tempfile.TemporaryDirectory() as tmp:
        src = Path(tmp) / filename
        src.write_bytes(content)
        proc = await asyncio.create_subprocess_exec(
            SOFFICE, "--headless", "--norestore", "--convert-to", "pdf", "--outdir", tmp, str(src),
            env={**os.environ, "HOME": tmp}, stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE,
        )
        try:
            _, err = await asyncio.wait_for(proc.communicate(), timeout=90)
        except asyncio.TimeoutError:
            proc.kill()
            log.warning("conversie DOCX expirată: %s", filename)
            return None
        pdf = src.with_suffix(".pdf")
        if proc.returncode != 0 or not pdf.exists():
            log.warning("conversie DOCX eșuată: %s %s", filename, err.decode(errors="ignore")[:300])
            return None
        # Cale deterministă + upsert: reprocesarea sau o reîncercare suprascrie, nu lasă previzualizări orfane (GDPR).
        path = f"{org_id}/{filename}.preview.pdf"
        r = await http.post(f"{SUPABASE_URL}/storage/v1/object/cvs/{path}",
                            headers={**SB_HEADERS, "Content-Type": "application/pdf", "x-upsert": "true"}, content=pdf.read_bytes())
        r.raise_for_status()
        return path


async def llamaparse(http: httpx.AsyncClient, filename: str, content: bytes) -> str:
    auth = {"Authorization": f"Bearer {LLAMA_KEY}"}
    r = await http.post(
        f"{LLAMA_URL}/upload",
        headers=auth,
        files={"file": (filename, content)},
        data={"configuration": '{"tier": "cost_effective", "version": "latest"}'},
    )
    r.raise_for_status()
    job_id = r.json()["id"]
    for _ in range(120):  # ~4 minute
        await asyncio.sleep(2)
        r = await http.get(f"{LLAMA_URL}/{job_id}", headers=auth)
        r.raise_for_status()
        job = r.json()["job"]
        if job["status"] == "COMPLETED":
            break
        if job["status"] in ("FAILED", "CANCELLED"):
            raise RuntimeError(f"LlamaParse job {job_id} {job['status']}: {job.get('error_message')}")
    else:
        raise TimeoutError(f"LlamaParse job {job_id} did not finish")
    r = await http.get(f"{LLAMA_URL}/{job_id}", headers=auth, params={"expand": "text_full"})
    r.raise_for_status()
    return r.json()["text_full"]


async def sweep_loop():
    while True:
        await asyncio.sleep(SWEEP_INTERVAL)
        try:
            await sweep_once()
        except Exception:
            log.exception("sweep failed")


async def sweep_once() -> dict:
    """Reia candidații blocați: processing mai vechi de STALE_AFTER sau pending mai vechi de PENDING_AFTER.
    Scanare globală, dar plafonată per organizație (SWEEP_PER_ORG); fiecare rând se procesează doar cu propriul organization_id."""
    t = now()
    try:
        async with httpx.AsyncClient(timeout=TIMEOUT) as http:
            r = await http.get(f"{SUPABASE_URL}/rest/v1/candidates", headers=SB_HEADERS, params={
                "select": "id,organization_id",
                "or": (f"(and(parsing_status.eq.processing,parse_started_at.lt.{iso(t - STALE_AFTER)}),"
                       f"and(parsing_status.eq.processing,parse_started_at.is.null),"
                       f"and(parsing_status.eq.pending,created_at.lt.{iso(t - PENDING_AFTER)}))"),
                "order": "created_at.asc", "limit": "100",
            })
            r.raise_for_status()
            rows = r.json()
    except Exception as e:
        SWEEP.update(last_run=iso(t), last_error=repr(e)[:300], runs=SWEEP["runs"] + 1)
        raise
    per_org: dict[str, int] = {}
    queued = 0
    for row in rows:
        org, cid = row["organization_id"], row["id"]
        if cid in ACTIVE or len(ACTIVE) >= MAX_BACKLOG or per_org.get(org, 0) >= SWEEP_PER_ORG:
            continue
        per_org[org] = per_org.get(org, 0) + 1
        queued += 1
        spawn(run_one(org, cid))
    SWEEP.update(last_run=iso(t), last_requeued=queued, last_error=None, runs=SWEEP["runs"] + 1)
    if queued:
        log.info("sweep requeued=%d", queued)
    return {"found": len(rows), "requeued": queued}


PROTECTED_CONTACT = {"name", "email", "phone", "location"}


def exp_key(r: dict) -> tuple:
    norm = lambda v: " ".join(str(v or "").split()).lower()
    return norm(r.get("company_name")), norm(r.get("role_title")), str(r.get("start_date") or "")[:7]


def drop_matching(rows: list[dict], kept: list[dict]) -> list[dict]:
    """Elimină experiențele extrase care dublează una editată manual (aceeași firmă, rol și lună de început)."""
    keys = {exp_key(k) for k in kept}
    return [r for r in rows if exp_key(r) not in keys]


async def manual_edits(http: httpx.AsyncClient, cand_id: str, org_id: str) -> tuple[bool, list[dict]]:
    """(candidatul e editat manual?, experiențele editate manual care rămân)."""
    scope = {"organization_id": f"eq.{org_id}"}
    c = await http.get(f"{SUPABASE_URL}/rest/v1/candidates", headers=SB_HEADERS,
                       params={**scope, "id": f"eq.{cand_id}", "select": "edited_manually"})
    c.raise_for_status()
    e = await http.get(f"{SUPABASE_URL}/rest/v1/candidate_experiences", headers=SB_HEADERS,
                       params={**scope, "candidate_id": f"eq.{cand_id}", "edited_manually": "eq.true",
                               "select": "company_name,role_title,start_date"})
    e.raise_for_status()
    return bool((c.json() or [{}])[0].get("edited_manually")), e.json()


async def delete_experiences(http: httpx.AsyncClient, cand_id: str, org_id: str):
    r = await http.delete(f"{SUPABASE_URL}/rest/v1/candidate_experiences", headers=SB_HEADERS,
                          params={"candidate_id": f"eq.{cand_id}", "organization_id": f"eq.{org_id}",
                                  "edited_manually": "eq.false"})
    r.raise_for_status()


async def patch(http: httpx.AsyncClient, table: str, row_id: str, org_id: str, values: dict):
    r = await http.patch(
        f"{SUPABASE_URL}/rest/v1/{table}",
        headers={**SB_HEADERS, "Prefer": "return=minimal"},
        params={"id": f"eq.{row_id}", "organization_id": f"eq.{org_id}"},
        json=values,
    )
    r.raise_for_status()
