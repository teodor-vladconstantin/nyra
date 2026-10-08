"""Decizii pure de fiabilitate (fără rețea, fără variabile de mediu): ce erori se reîncearcă, cât se așteaptă,
cine poate revendica un candidat și ce mesaj (în română) vede recruiterul. Testate în tests/test_reliability.py."""
import random
from datetime import datetime, timedelta

import httpx

MAX_CV_BYTES = 10 * 1024 * 1024  # la fel ca limita bucket-ului „cvs”
CV_EXTENSIONS = (".pdf", ".docx")


class PermanentError(Exception):
    """Eșec care nu are rost reîncercat; mesajul e deja pentru recruiter (română)."""


def is_transient(exc: BaseException) -> bool:
    """429/5xx/timeout/conexiune = merită reîncercat. Restul (4xx, job eșuat, date invalide) = nu."""
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        return code in (408, 425, 429) or code >= 500
    return isinstance(exc, (httpx.TransportError, TimeoutError))  # httpx.TimeoutException e subclasă de TransportError


def backoff_delay(attempt: int, base: float = 2.0, cap: float = 60.0, rng=random.random) -> float:
    """Exponențial cu jitter: attempt 1 -> ~2s, 2 -> ~4s, 3 -> ~8s ... maxim `cap`."""
    d = min(cap, base * 2 ** (attempt - 1))
    return d / 2 + rng() * d / 2


def user_message(exc: BaseException) -> str:
    """Eroarea ca text pentru UI (parse_error). Detaliile tehnice rămân în loguri."""
    if isinstance(exc, PermanentError):
        return str(exc)
    if isinstance(exc, httpx.HTTPStatusError):
        code = exc.response.status_code
        if code == 429:
            return "Serviciul de analiză este suprasolicitat. Reîncearcă peste câteva minute."
        if code >= 500:
            return "Serviciul de analiză a CV-ului nu a răspuns. Reîncearcă peste câteva minute."
        if code in (401, 403):
            return "Serviciul de analiză a respins cererea (autentificare). Contactează administratorul."
        return f"Serviciul de analiză a refuzat fișierul (cod {code}). Verifică dacă CV-ul nu e corupt sau protejat cu parolă."
    if isinstance(exc, (httpx.TransportError, TimeoutError)):
        return "Analiza a expirat sau conexiunea s-a întrerupt. Reîncearcă peste câteva minute."
    return "Analiza CV-ului a eșuat neașteptat. Reîncearcă; dacă se repetă, contactează administratorul."


def check_cv(path: str, size: int) -> None:
    """Fișier gol, prea mare sau de alt tip decât PDF/DOCX -> PermanentError."""
    if not path.lower().endswith(CV_EXTENSIONS):
        raise PermanentError("Tip de fișier neacceptat. Se acceptă doar PDF și DOCX.")
    if size <= 0:
        raise PermanentError("Fișierul CV este gol.")
    if size > MAX_CV_BYTES:
        raise PermanentError(f"Fișierul depășește {MAX_CV_BYTES // (1024 * 1024)} MB.")


def iso(dt: datetime) -> str:
    return dt.strftime("%Y-%m-%dT%H:%M:%SZ")


def plan_claim(row: dict, now: datetime, stale_after: timedelta, max_attempts: int) -> tuple[str, dict, dict]:
    """Decide revendicarea unui candidat citit anterior. Întoarce (acțiune, valori de scris, filtre CAS).

    pending/failed       -> claim, încercări resetate la 1 (pornire proaspătă sau reprocesare manuală)
    processing vechi     -> claim cu încercări+1 (a murit procesul); peste `max_attempts` -> fail terminal
    processing recent / parsed / needs_review -> skip
    `now` trebuie să fie timezone-aware (UTC). Filtrele fac UPDATE-ul atomic: dacă rândul s-a schimbat între citire
    și scriere, nu se potrivește nimic și revendicarea se pierde (corect: altcineva lucrează deja).
    """
    status, attempts = row["parsing_status"], row.get("parse_attempts") or 0
    cas = {"parsing_status": f"eq.{status}", "parse_attempts": f"eq.{attempts}"}
    start = {"parsing_status": "processing", "parse_started_at": iso(now), "parse_error": None}
    if status in ("pending", "failed"):
        return "claim", {**start, "parse_attempts": 1}, cas
    if status != "processing":
        return "skip", {}, {}
    started = row.get("parse_started_at")
    if started and now - datetime.fromisoformat(started.replace("Z", "+00:00")) < stale_after:
        return "skip", {}, {}
    if attempts >= max_attempts:
        msg = "Analiza s-a oprit de mai multe ori înainte să se termine. Reîncarcă CV-ul sau contactează administratorul."
        return "fail", {"parsing_status": "failed", "parse_error": msg}, cas
    return "claim", {**start, "parse_attempts": attempts + 1}, cas


async def retry_async(fn, *, max_tries: int, sleep, on_retry=None, rng=random.random):
    """Rulează `fn()`; la erori tranzitorii reîncearcă cu backoff, cel mult `max_tries` ori în total."""
    for attempt in range(1, max_tries + 1):
        try:
            return await fn()
        except Exception as e:
            if attempt == max_tries or not is_transient(e):
                raise
            delay = backoff_delay(attempt, rng=rng)
            if on_retry:
                await on_retry(attempt, delay, e)
            await sleep(delay)
