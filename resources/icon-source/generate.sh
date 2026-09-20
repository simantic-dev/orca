#!/bin/bash
# Generate every committed app icon from resources/icon-source/simantic-logo-inverted.svg.
# See config/scripts/render-app-icons.mjs for the outputs; `pnpm build:icons` runs this.
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$(dirname "$(dirname "$SCRIPT_DIR")")"
exec node "$PROJECT_DIR/config/scripts/render-app-icons.mjs"
