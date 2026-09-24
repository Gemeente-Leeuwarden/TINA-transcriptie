#!/usr/bin/env bash
# Stop the TINA transcription/LLM worker started by start-worker.sh.
# Sends SIGTERM (the worker shuts down gracefully) and waits for it to exit.
set -euo pipefail
cd "$(dirname "$0")/gpu"

PID_FILE=worker.pid

if [[ ! -f "$PID_FILE" ]]; then
    echo "no $PID_FILE — worker not running (or not started via start-worker.sh)"
    exit 0
fi

pid=$(cat "$PID_FILE")
if ! kill -0 "$pid" 2>/dev/null; then
    echo "stale pid file (process $pid not running), cleaning up"
    rm -f "$PID_FILE"
    exit 0
fi

kill "$pid"
for _ in $(seq 1 15); do
    if ! kill -0 "$pid" 2>/dev/null; then
        rm -f "$PID_FILE"
        echo "worker stopped (pid $pid)"
        exit 0
    fi
    sleep 1
done

echo "worker (pid $pid) did not exit after 15s, sending SIGKILL"
kill -9 "$pid" 2>/dev/null || true
rm -f "$PID_FILE"
echo "worker killed (pid $pid)"
