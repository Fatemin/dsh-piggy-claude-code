#!/bin/sh
# Claude Code statusLine that shows the pig. Read-only, never reaches the model.
#
#   just the pig:        sh /path/to/bin/statusline.sh
#   after your own line: sh /path/to/bin/statusline.sh ~/.claude/my-statusline
#
# With arguments, that command runs first on the same stdin Claude Code sends,
# and the pig is appended to its output.
HERE=$(cd "$(dirname "$0")" && pwd)
input=$(cat)
base=""
if [ $# -gt 0 ]; then
  base=$(printf '%s' "$input" | "$@" 2>/dev/null)
fi
pig=$(sh "$HERE/pig-node.sh" "$HERE/pig.js" status-line 2>/dev/null)
if [ -n "$base" ] && [ -n "$pig" ]; then
  printf '%s · %s\n' "$base" "$pig"
elif [ -n "$base" ]; then
  printf '%s\n' "$base"
else
  printf '%s\n' "$pig"
fi
