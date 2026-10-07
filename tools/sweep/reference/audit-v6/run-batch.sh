#!/usr/bin/env bash
# Runs the read-only capture scripts one after another, the browser closed and reopened between big runs.
cd /d/Code/e-commerce
A=.playwright-cli/audit-v6
run() {
  local s=$1
  local start=$(date +%s)
  npx playwright cli --raw run-code --filename=$A/scripts/$s.js > $A/data/$s.json 2> $A/data/$s.err
  echo "$s exit=$? $(( $(date +%s)-start ))s"
}
fresh() { npx playwright cli close >/dev/null 2>&1; npx playwright cli open about:blank >/dev/null 2>&1; }
for s in "$@"; do
  case $s in
    FRESH) fresh ;;
    *) run $s ;;
  esac
done
echo BATCH-DONE
