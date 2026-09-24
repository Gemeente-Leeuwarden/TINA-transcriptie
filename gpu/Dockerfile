# TINA transcription/LLM worker.
#
# This is a pure network client: it consumes RabbitMQ jobs, pulls audio from
# MinIO, and POSTs to external OpenAI-compatible transcription/LLM servers.
# It does NOT run any GPU/ML code itself, so the image is CPU-only and builds
# for any arch (linux/amd64, linux/arm64) — see build-multiarch.sh.
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Install deps first so this layer is cached across app-code changes.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Application code.
COPY main.py storage.py wav.py ./
COPY transcription/ ./transcription/
COPY llm/ ./llm/

# Run as a non-root user.
RUN useradd --create-home --uid 10001 worker
USER worker

CMD ["python", "main.py"]
