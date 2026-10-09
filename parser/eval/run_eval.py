"""Evaluare de acuratețe a extragerii CV: rulează pipeline-ul real pe CV-uri etichetate manual și raportează
precision/recall/F1 pe câmp. Fără baza de date: citește fișiere locale.

Cost: fiecare CV nou costă credite LlamaCloud (~28/pagină). Rezultatul brut (text + extract) se salvează în
eval/.cache/<sha256>.json, deci re-scorarea după orice schimbare de reguli (extract.py) e GRATUITĂ.

Utilizare (din parser/, cu LLAMA_CLOUD_API_KEY în mediu):
  python eval/run_eval.py --cvs eval/cvs --draft     # creează eval/labels/<cv>.json precompletat; îl CORECTEZI de mână
  python eval/run_eval.py --cvs eval/cvs             # scorează față de eval/labels (după ce ai corectat etichetele)
Format etichetă: vezi eval/labels/EXAMPLE.json.
"""
import argparse
import asyncio
import hashlib
import json
import os
import re
import sys
from datetime import date
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")  # consola Windows (cp1252) nu are „→”, „ă” etc.
HERE = Path(__file__).parent
sys.path.insert(0, str(HERE.parent))
for k in ("SUPABASE_URL", "SUPABASE_SECRET_KEY", "PARSER_TOKEN"):  # main.py le cere la import; harness-ul nu le folosește
    os.environ.setdefault(k, "unused")
os.environ.setdefault("LLAMA_CLOUD_API_KEY", "")

import httpx  # noqa: E402

from extract import clean_skills, fold, to_rows  # noqa: E402

CACHE = HERE / ".cache"
LABELS = HERE / "labels"
TODAY = date.today()


async def run_llama(path: Path) -> dict:
    import main  # importat târziu: citește cheile din mediu
    content = path.read_bytes()
    async with httpx.AsyncClient(timeout=main.TIMEOUT) as http:
        text, result = await asyncio.gather(
            main.llamaparse(http, path.name, content), main.llama_extract(http, path.name, content))
    return {"text": text, "result": result}


def raw_for(path: Path) -> dict:
    key = hashlib.sha256(path.read_bytes()).hexdigest()
    f = CACHE / f"{key}.json"
    if f.exists():
        return json.loads(f.read_text(encoding="utf-8"))
    if not os.environ.get("LLAMA_CLOUD_API_KEY"):
        sys.exit(f"{path.name}: nu e în cache și lipsește LLAMA_CLOUD_API_KEY")
    print(f"  apel LlamaCloud (cost credite): {path.name}")
    raw = asyncio.run(run_llama(path))
    CACHE.mkdir(exist_ok=True)
    f.write_text(json.dumps(raw, ensure_ascii=False), encoding="utf-8")
    return raw


def predict(raw: dict) -> dict:
    rows, profile, issues = to_rows(raw["result"], "o", "c", TODAY, text=raw["text"])
    c = profile["contact"]
    return {
        "full_name": c.get("name"), "email": c.get("email"), "phone": c.get("phone"),
        "experiences": [{k: r[k] for k in ("company_name", "role_title", "start_date", "end_date", "seniority_level")} for r in rows],
        "skills": profile["skills"], "needs_review": bool(issues) or not rows, "issues": issues,
    }


# ---------------------------------------------------------------- scorare
def toks(s: str | None) -> set[str]:
    return {w for w in re.findall(r"[a-z0-9]+", fold(s or "")) if len(w) > 2}


def sim(a: str | None, b: str | None) -> float:
    x, y = toks(a), toks(b)
    return 1.0 if not x and not y else len(x & y) / max(1, len(x | y))


def month(v: str | None) -> str | None:
    return (v or "")[:7] or None


def digits(v: str | None) -> str:
    return re.sub(r"\D", "", v or "")[-9:]


def f1(tp: int, fp: int, fn: int) -> float:
    return 1.0 if tp + fp + fn == 0 else 2 * tp / (2 * tp + fp + fn)


def score(label: dict, pred: dict) -> dict:
    errors: list[str] = []
    contact = {
        "nume": fold(label.get("full_name") or "") == fold(pred["full_name"] or ""),
        "email": (label.get("email") or "").lower() == (pred["email"] or "").lower(),
        "telefon": digits(label.get("phone")) == digits(pred["phone"]),
    }
    errors += [f"{k}: așteptat {label.get({'nume': 'full_name', 'email': 'email', 'telefon': 'phone'}[k])!r}, extras "
               f"{pred[{'nume': 'full_name', 'email': 'email', 'telefon': 'phone'}[k]]!r}" for k, ok in contact.items() if not ok]

    want, got = label.get("experiences", []), list(pred["experiences"])
    pairs = []
    for w in want:  # potrivire: firmă + rol suficient de asemănătoare
        best = max(range(len(got)), key=lambda i: sim(w["company_name"], got[i]["company_name"]) + sim(w["role_title"], got[i]["role_title"]), default=None)
        if best is not None and sim(w["company_name"], got[best]["company_name"]) >= 0.5 and sim(w["role_title"], got[best]["role_title"]) >= 0.4:
            pairs.append((w, got.pop(best)))
        else:
            errors.append(f"experiență ratată: {w['company_name']} / {w['role_title']}")
    for g in got:
        errors.append(f"experiență în plus: {g['company_name']} / {g['role_title']}")
    dates_ok = seniority_ok = seniority_n = 0
    for w, g in pairs:
        s_ok, e_ok = month(w.get("start_date")) == month(g["start_date"]), month(w.get("end_date")) == month(g["end_date"])
        dates_ok += s_ok and e_ok
        if not (s_ok and e_ok):
            errors.append(f"date {w['company_name']}: așteptat {w.get('start_date')}→{w.get('end_date')}, extras {g['start_date']}→{g['end_date']}")
        if w.get("seniority_level"):
            seniority_n += 1
            seniority_ok += w["seniority_level"] == g["seniority_level"]
    ws, ps = {fold(s) for s in clean_skills(label.get("skills", []))}, {fold(s) for s in pred["skills"]}
    return {
        "contact": contact, "exp_tp": len(pairs), "exp_fn": len(want) - len(pairs), "exp_fp": len(got),
        "dates_ok": dates_ok, "seniority": (seniority_ok, seniority_n),
        "sk_tp": len(ws & ps), "sk_fp": len(ps - ws), "sk_fn": len(ws - ps), "errors": errors,
    }


def main_cli():
    ap = argparse.ArgumentParser()
    ap.add_argument("--cvs", required=True, type=Path)
    ap.add_argument("--draft", action="store_true", help="creează etichete precompletate din extragere, de corectat manual")
    a = ap.parse_args()
    files = sorted(p for p in a.cvs.iterdir() if p.suffix.lower() in (".pdf", ".docx"))
    LABELS.mkdir(exist_ok=True)

    if a.draft:
        for p in files:
            f = LABELS / f"{p.stem}.json"
            if f.exists():
                continue
            pr = predict(raw_for(p))
            f.write_text(json.dumps({k: pr[k] for k in ("full_name", "email", "phone", "experiences", "skills")}, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"  etichetă draft: {f.name}  → verific-o cu CV-ul în față și corectează")
        return

    tot = {"nume": 0, "email": 0, "telefon": 0, "tp": 0, "fp": 0, "fn": 0, "dates": 0, "sen_ok": 0, "sen_n": 0, "stp": 0, "sfp": 0, "sfn": 0}
    n = flagged_bad = bad = flagged_good = good = 0
    for p in files:
        lf = LABELS / f"{p.stem}.json"
        if not lf.exists():
            print(f"(fără etichetă, sărit: {p.name})")
            continue
        pr = predict(raw_for(p))
        s = score(json.loads(lf.read_text(encoding="utf-8")), pr)
        n += 1
        for k in ("nume", "email", "telefon"):
            tot[k] += s["contact"][k]
        tot["tp"] += s["exp_tp"]; tot["fp"] += s["exp_fp"]; tot["fn"] += s["exp_fn"]; tot["dates"] += s["dates_ok"]
        tot["sen_ok"] += s["seniority"][0]; tot["sen_n"] += s["seniority"][1]
        tot["stp"] += s["sk_tp"]; tot["sfp"] += s["sk_fp"]; tot["sfn"] += s["sk_fn"]
        wrong = bool(s["errors"])
        bad += wrong; good += not wrong
        flagged_bad += wrong and pr["needs_review"]; flagged_good += (not wrong) and pr["needs_review"]
        if wrong:
            print(f"\n{p.name}  [{'needs_review' if pr['needs_review'] else 'PARSED (greșeli nesemnalizate!)'}]")
            for e in s["errors"]:
                print("   -", e)
    if not n:
        sys.exit("Nicio etichetă găsită (eval/labels/*.json).")
    pct = lambda a, b: f"{100 * a / b:5.1f}%" if b else "  n/a"
    print(f"\n==== {n} CV-uri ====")
    print(f"Nume corect      {pct(tot['nume'], n)}   Email {pct(tot['email'], n)}   Telefon {pct(tot['telefon'], n)}")
    P, R = tot["tp"] / max(1, tot["tp"] + tot["fp"]), tot["tp"] / max(1, tot["tp"] + tot["fn"])
    print(f"Experiențe       precision {100 * P:5.1f}%  recall {100 * R:5.1f}%  F1 {100 * f1(tot['tp'], tot['fp'], tot['fn']):5.1f}%")
    print(f"Date corecte (din cele potrivite) {pct(tot['dates'], tot['tp'])}   Seniority corect {pct(tot['sen_ok'], tot['sen_n'])}")
    print(f"Skills F1        {100 * f1(tot['stp'], tot['sfp'], tot['sfn']):5.1f}%")
    print(f"CV-uri cu cel puțin o greșeală: {bad}/{n}; dintre ele semnalate needs_review: {flagged_bad}/{bad or 1}"
          f"  | alarme false (CV perfect dar semnalat): {flagged_good}/{good or 1}")


if __name__ == "__main__":
    main_cli()
