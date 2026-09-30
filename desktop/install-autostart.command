#!/bin/zsh
# Build the floating pig and start it at login (LaunchAgent), like the traffic light.
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
PLIST="$HOME/Library/LaunchAgents/io.github.dsh-piggy.desk.plist"

"$DIR/build.command"
mkdir -p "$HOME/Library/LaunchAgents"
sed -e "s#__APP_PATH__#$DIR/.build/release/DshPiggyDesk#g" \
    -e "s#__PIGGY_ROOT__#$(dirname "$DIR")#g" \
  "$DIR/io.github.dsh-piggy.desk.plist.template" > "$PLIST"

launchctl unload "$PLIST" >/dev/null 2>&1 || true
launchctl load "$PLIST"

echo "Installed: $PLIST"
