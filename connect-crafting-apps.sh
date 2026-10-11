#!/usr/bin/env bash
# Registers the MCP servers of all ten Crafting Apps with Claude Code (user scope,
# so they work in every project). Safe to re-run: existing entries are replaced.
# Optional: ROOT=/some/folder ./connect-crafting-apps.sh  (default: ~/Craft)
set -uo pipefail

ROOT="${ROOT:-$HOME/Craft}"
mkdir -p "$ROOT"
# Store an absolute path: the servers are user-scoped and start from whatever
# directory Claude Code runs in, so a relative ROOT would point somewhere else.
ROOT="$(cd "$ROOT" && pwd)"

command -v claude >/dev/null || { echo "Claude Code ('claude') is not on your PATH."; exit 1; }

# app | extra arguments after "mcp" (all headless, no window needed)
#   photocraft:  file access limited to $ROOT
#   pdfcraft:    file access limited to $ROOT
#   vectorcraft: forced headless (otherwise it tries a running app first)
#   lightcraft:  persistent photo library in $ROOT/lightcraft-library
register() {
  local app="$1"; shift
  local cli
  # Register the full path: Claude Code may start servers with a shorter PATH
  # than this shell (e.g. the desktop app), and then a bare name isn't found.
  if ! cli="$(command -v "$app-cli")"; then
    echo "  skipped $app: $app-cli not found on PATH (is it installed?)"
    return
  fi
  claude mcp remove --scope user "$app" >/dev/null 2>&1 || true
  if claude mcp add --scope user "$app" -- "$cli" mcp "$@" >/dev/null; then
    echo "  connected $app"
  else
    echo "  FAILED to add $app"
  fi
}

echo "Connecting Crafting Apps to Claude Code (work folder: $ROOT)"
register photocraft  --automation-read-root "$ROOT" --automation-write-root "$ROOT"
register vectorcraft --headless
register filmcraft
register lightcraft  --library "$ROOT/lightcraft-library"
register pdfcraft    --root "$ROOT"
register effectcraft
register designcraft
register wordcraft
register gridcraft
register deckcraft

echo
claude mcp list
echo "Restart any running Claude Code session to pick up the new servers."
