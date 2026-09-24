#!/usr/bin/env bash
# Start the TINA transcription/LLM worker (gpu/main.py) in the background.
# Uses gpu/.venv, logs to gpu/worker.log, PID in gpu/worker.pid.
set -euo pipefail
cd "$(dirname "$0")/gpu"

PID_FILE=worker.pid
LOG_FILE=worker.log

if [[ -f "$PID_FILE" ]] && kill -0 "$(cat "$PID_FILE")" 2>/dev/null; then
    echo "worker already running (pid $(cat "$PID_FILE"))"
    exit 0
fi

if [[ ! -x .venv/bin/python ]]; then
    echo "error: gpu/.venv not found — create it first:" >&2
    echo "  cd gpu && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt" >&2
    exit 1
fi

if [[ ! -f ../.env ]]; then
    echo "error: root .env not found — copy sample.env to .env first" >&2
    exit 1
fi

nohup .venv/bin/python main.py >> "$LOG_FILE" 2>&1 &
pid=$!
echo "$pid" > "$PID_FILE"

sleep 2
if ! kill -0 "$pid" 2>/dev/null; then
    rm -f "$PID_FILE"
    echo "error: worker exited immediately — last log lines:" >&2
    tail -n 10 "$LOG_FILE" >&2
    exit 1
fi

echo "worker started (pid $pid), logging to gpu/$LOG_FILE"
