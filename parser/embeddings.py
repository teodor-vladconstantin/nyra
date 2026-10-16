"""Embeddings locale (fastembed/ONNX, fără torch): 384 dim, multilingv (include româna), vectori L2-normalizați.
Modelul se încarcă lazy la prima folosire, ca RAM-ul să nu crească la pornire.
multilingual-e5-small nu e în lista fastembed, deci modelul e paraphrase-multilingual-MiniLM-L12-v2 (fără prefixe query/passage)."""
import math
import os
import threading
from concurrent.futures import ThreadPoolExecutor

MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
DIM = 384
MAX_CHARS = 2000  # ~512 tokeni; restul se taie

_model = None
_lock = threading.Lock()
# Un singur fir: un singur calcul ONNX odată, ca să încapă în ~1 GB RAM.
EXECUTOR = ThreadPoolExecutor(max_workers=1, thread_name_prefix="embed")


def _load():
    global _model
    with _lock:
        if _model is None:
            from fastembed import TextEmbedding  # import lazy: costă ~100 MB RAM
            # cache_dir vine din FASTEMBED_CACHE_PATH (setat în Dockerfile, modelul e deja descărcat la build)
            _model = TextEmbedding(MODEL, cache_dir=os.getenv("FASTEMBED_CACHE_PATH"), threads=2)
    return _model


def l2_normalize(v) -> list[float]:
    n = math.sqrt(sum(x * x for x in v))
    return [float(x) / n for x in v] if n else [float(x) for x in v]


def embed_texts(texts: list[str]) -> list[list[float]]:
    """Blocant (CPU): se apelează din EXECUTOR, nu din event loop."""
    out = [l2_normalize(v) for v in _load().embed([t[:MAX_CHARS] for t in texts], batch_size=8)]
    assert all(len(v) == DIM for v in out), "dimensiune embedding neașteptată"
    return out


def candidate_text(profile: dict | None, experiences: list[dict], cv_text: str = "") -> str:
    """Rezumat + competențe + titluri/descrieri de experiențe + începutul CV-ului, tăiat la MAX_CHARS."""
    profile = profile or {}
    parts = [(profile.get("summary") or "").strip(), ", ".join(profile.get("skills") or [])]
    for e in experiences:
        parts.append(" - ".join(p for p in ((e.get("role_title") or "").strip(), (e.get("description") or "").strip()) if p))
    parts.append(" ".join((cv_text or "").split()))
    return "\n".join(p for p in parts if p)[:MAX_CHARS]
