#!/usr/bin/env sh
set -eu
SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(git -C "$SCRIPT_DIR" rev-parse --show-toplevel)
git -C "$ROOT" apply -R --check "$SCRIPT_DIR/DIFF_FILE.patch"
git -C "$ROOT" apply -R "$SCRIPT_DIR/DIFF_FILE.patch"
printf '%s\n' 'ROLLBACK_OK: custom-domain architecture restored to the pre-change behavior.'
