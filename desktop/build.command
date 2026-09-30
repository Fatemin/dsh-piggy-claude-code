#!/bin/zsh
set -euo pipefail

DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$DIR"

# Same as the traffic-light build: the CommandLineTools swift cannot link
# package manifests on this macOS, the Homebrew toolchain can.
if [ -d "/opt/homebrew/opt/swift/bin" ]; then
  export PATH="/opt/homebrew/opt/swift/bin:$PATH"
fi

export CLANG_MODULE_CACHE_PATH="$DIR/.build/clang-module-cache"
export SWIFTPM_CACHE_PATH="$DIR/.build/swiftpm-cache"

swift build -c release

echo "Built: $DIR/.build/release/DshPiggyDesk"
