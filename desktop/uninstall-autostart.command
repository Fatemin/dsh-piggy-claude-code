#!/bin/zsh
set -euo pipefail

PLIST="$HOME/Library/LaunchAgents/io.github.dsh-piggy.desk.plist"
launchctl unload "$PLIST" >/dev/null 2>&1 || true
rm -f "$PLIST"
echo "Removed: $PLIST"
