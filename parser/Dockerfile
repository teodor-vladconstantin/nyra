# Serviciul de parsing, cu LibreOffice pentru conversia DOCX -> PDF (previzualizare CV).
FROM python:3.12-slim

RUN apt-get update \
 && apt-get install -y --no-install-recommends libreoffice-writer-nogui fonts-dejavu fonts-liberation \
 && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:0.12 /uv /usr/local/bin/uv

WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-install-project
# Modelul de embeddings (~220 MB) se descarcă la build, într-un director stabil: prima cerere nu mai descarcă nimic.
ENV FASTEMBED_CACHE_PATH=/opt/fastembed
RUN uv run --no-sync python -c "from fastembed import TextEmbedding; TextEmbedding('sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2')"
COPY *.py ./

EXPOSE 8000
CMD ["sh", "-c", "uv run --no-sync uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
