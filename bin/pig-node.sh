#!/bin/sh
# Run node from hook and status-line contexts, whose PATH (notably under the
# desktop app) may not include nvm. No node found → exit 0 silently: the pig
# must never break Claude Code.
NODE=$(command -v node 2>/dev/null)
if [ -z "$NODE" ]; then
  for candidate in /usr/local/bin/node /opt/homebrew/bin/node "$HOME"/.nvm/versions/node/*/bin/node; do
    [ -x "$candidate" ] && NODE=$candidate
  done
fi
[ -n "$NODE" ] || exit 0
exec "$NODE" "$@"
