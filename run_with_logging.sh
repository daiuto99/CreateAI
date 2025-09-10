#!/usr/bin/env bash
set -euo pipefail

# Detect how Replit runs your app (uses .replit run command first).
detect_cmd() {
  if [ -f .replit ]; then
    CMD=$(grep -E '^run *= *"' .replit | sed -E 's/^[^"]*"([^"]*)".*$/\1/' || true)
    if [ -n "${CMD:-}" ]; then echo "$CMD"; return; fi
  fi
  if [ -f package.json ] && grep -q '"start"' package.json; then echo "npm run start"; return; fi
  if [ -f server.js ]; then echo "node server.js"; return; fi
  if [ -f index.js ]; then echo "node index.js"; return; fi
  if [ -f main.py ]; then echo "python main.py"; return; fi
  if [ -f app.py ]; then echo "python app.py"; return; fi
  echo "ERROR: Could not detect how to run your app. Set APP_CMD or edit this script." >&2
  exit 1
}

APP_CMD="${APP_CMD:-$(detect_cmd)}"
echo "→ Starting app with: $APP_CMD"

mkdir -p logs summaries
touch logs/app.log

# Start your app and tee ALL output to logs/app.log
( bash -lc "$APP_CMD 2>&1 | tee -a logs/app.log" ) &
APP_PID=$!

# Start the near-real-time watcher
python summarizer_watcher.py &
WATCH_PID=$!

cleanup() { kill $APP_PID $WATCH_PID 2>/dev/null || true; }
trap cleanup EXIT
wait $APP_PID
