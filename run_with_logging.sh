#!/usr/bin/env bash
set -euo pipefail

# -----------------------------
# Config
# -----------------------------
APP_CMD="${APP_CMD:-npm run dev}"      # your normal start command
LOG_DIR="${LOG_DIR:-logs}"
LOG_FILE="${LOG_FILE:-$LOG_DIR/app.log}"
WATCHER="${WATCHER:-summarizer_watcher.py}"
PORT="${PORT:-5000}"

mkdir -p "$LOG_DIR"

# -----------------------------
# Helpers
# -----------------------------
free_port() {
  echo "→ Ensuring port $PORT is free…"

  # 1) If fuser exists, use it (common in many distros)
  if command -v fuser >/dev/null 2>&1; then
    fuser -k "${PORT}/tcp" >/dev/null 2>&1 || true
  fi

  # 2) Try lsof if available
  if command -v lsof >/dev/null 2>&1; then
    PIDS="$(lsof -t -i:${PORT} || true)"
    if [[ -n "${PIDS}" ]]; then
      echo "→ Killing PIDs on :$PORT: ${PIDS}"
      kill -9 ${PIDS} || true
    fi
  fi

  # 3) Fallback: kill any foreground dev server processes we know about
  #    This avoids killing Replit's language servers.
  if command -v pkill >/dev/null 2>&1; then
    pkill -f "tsx server/index.ts" >/dev/null 2>&1 || true
    pkill -f "node .*server/index.ts" >/dev/null 2>&1 || true
  else
    # Busybox killall fallback if pkill absent
    killall -q tsx 2>/dev/null || true
    killall -q node 2>/dev/null || true
  fi
}

cleanup() {
  # Stop background processes gracefully
  [[ -n "${APP_PID:-}" ]] && kill "${APP_PID}" 2>/dev/null || true
  [[ -n "${WATCHER_PID:-}" ]] && kill "${WATCHER_PID}" 2>/dev/null || true
}
trap cleanup EXIT

# -----------------------------
# Main
# -----------------------------
free_port

echo "→ Starting app with: ${APP_CMD}"
# Start app, tee to log
# (Remove the next line if you prefer to append instead of overwrite each run)
: > "$LOG_FILE"
set -m
bash -lc "$APP_CMD" 2>&1 | tee -a "$LOG_FILE" &
APP_PID=$!

# Start watcher
if [[ -f "$WATCHER" ]]; then
  echo "→ Starting log watcher: $WATCHER"
  python "$WATCHER" &
  WATCHER_PID=$!
else
  echo "⚠️  Watcher '$WATCHER' not found — skipping."
fi

# Wait for the app to exit; watcher will be cleaned up via trap
wait "$APP_PID" || true
