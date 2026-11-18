#!/usr/bin/env bash
# prot test runner — node self-tests + headless ui tests at both breakpoints.
# usage: tools/test.sh
set -u
cd "$(dirname "$0")/.." || exit 1

CHROME=${CHROME:-/c/Program Files/Google/Chrome/Application/chrome.exe}
ROOT=$(pwd -W 2>/dev/null || pwd)   # K:/Projects/... so file:// URLs resolve on windows
PAGE="file:///$ROOT/tests/ui.test.html"
fail=0

echo "== calc (node) =="
if node -e '
var Calc = require("./js/calc.js");
var fails = require("./js/selftest.js")(Calc, function (line) {
  if (line.indexOf("FAIL") === 0) console.log(line);
});
process.exit(fails ? 1 : 0);
'; then
  echo "pass  selftest"
else
  echo "FAIL  selftest"
  fail=1
fi

echo "== ui (headless) =="
for size in "1200,900 desktop" "420,760 mobile"; do
  set -- $size
  verdict=$("$CHROME" --headless --disable-gpu --no-sandbox --window-size="$1" \
    --dump-dom "$PAGE" 2>/dev/null |
    grep -o 'data-uitest="[a-z]*"' | head -1)
  if [ "$verdict" = 'data-uitest="green"' ]; then
    echo "pass  $2 ($1)"
  else
    echo "FAIL  $2 ($1) — ${verdict:-no verdict}"
    "$CHROME" --headless --disable-gpu --no-sandbox --window-size="$1" \
      --dump-dom "$PAGE" 2>/dev/null |
      awk '/uitest-out/{f=1} f' | sed 's/<[^>]*>//g' | grep -E 'FAIL|failing' | head -25
    fail=1
  fi
done

[ "$fail" -eq 0 ] && echo "all green" || echo "failing"
exit "$fail"
