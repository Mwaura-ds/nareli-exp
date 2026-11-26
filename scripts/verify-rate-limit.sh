#!/usr/bin/env bash
# Regression check for NF-01: the contact rate limit must not be keyed on a
# caller-controlled x-forwarded-for header. Validation-only POSTs (empty body
# -> 400, no email is sent) are safe; no record is created.
set -uo pipefail

PORT=3311
BASE="http://127.0.0.1:$PORT"

PORT="$PORT" pnpm start >/tmp/nareli-rate-limit-server.log 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true' EXIT

ready=0
for _ in $(seq 1 50); do
  if curl -sf -o /dev/null --max-time 2 "$BASE/"; then ready=1; break; fi
  sleep 0.4
done
if [ "$ready" -ne 1 ]; then
  echo "FAIL: next start never became ready on port $PORT"
  tail -20 /tmp/nareli-rate-limit-server.log
  exit 1
fi

codes=""
for i in $(seq 1 7); do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 -X POST \
    "$BASE/api/contact" \
    -H 'content-type: application/json' \
    -H "x-forwarded-for: 198.51.100.$i" \
    -d '{}')
  codes="$codes $code"
done
echo "rotating X-Forwarded-For:$codes"

if ! echo "$codes" | grep -q '429'; then
  echo "FAIL: rotating x-forwarded-for bypassed the rate limit"
  exit 1
fi

echo "PASS: caller-controlled X-Forwarded-For cannot bypass the rate limit"
