#!/bin/bash

# LinkedIn Job Auto-Apply — Multi-Platform Installer
# Supports: Claude Code, Gemini CLI, GitHub Copilot

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

msg()  { echo -e "${2}${1}${NC}"; }
ok()   { msg "✓ $1" "$GREEN"; }
info() { msg "$1" "$BLUE"; }
warn() { msg "⚠  $1" "$YELLOW"; }
err()  { msg "✗ $1" "$RED"; }

SKILL_DIR="skills/linkedin-job-auto-apply"

install_claude() {
  info "Installing for Claude Code..."
  DEST="$HOME/.claude/skills/linkedin-job-auto-apply"
  if [ -d "$DEST" ]; then
    warn "Already installed at $DEST — overwriting."
    rm -rf "$DEST"
  fi
  mkdir -p "$DEST"
  cp -r "$SKILL_DIR"/* "$DEST/"
  [ -f "$DEST/SKILL.md" ] && ok "Claude Code: installed to $DEST" || { err "Claude Code install failed"; return 1; }
  echo "  Usage: claude → /linkedin-job-auto-apply"
}

install_gemini() {
  info "Installing for Gemini CLI..."
  DEST="$HOME/.gemini/extensions/linkedin-job-auto-apply"
  mkdir -p "$DEST"
  cp ".gemini/extensions/linkedin-job-auto-apply/gemini-extension.json" "$DEST/"
  cp ".gemini/extensions/linkedin-job-auto-apply/GEMINI.md" "$DEST/"
  # Include JS files so Gemini can reference them
  cp "$SKILL_DIR/autoApplyLinkedInJobs.js" "$DEST/"
  cp "$SKILL_DIR/applySingleJob.js" "$DEST/"
  [ -f "$DEST/gemini-extension.json" ] && ok "Gemini CLI: installed to $DEST" || { err "Gemini CLI install failed"; return 1; }
  echo "  Usage: gemini → ask about LinkedIn job automation"
}

install_copilot() {
  info "Installing for GitHub Copilot..."
  mkdir -p ".github"
  cp ".github/copilot-instructions.md" ".github/copilot-instructions.md" 2>/dev/null || true
  ok "Copilot: .github/copilot-instructions.md is ready (commit it to your repo)"
  echo "  Usage: commit .github/copilot-instructions.md — Copilot picks it up automatically"
}

echo ""
info "========================================"
info "  LinkedIn Auto-Apply — Installer"
info "========================================"
echo ""

# Auto-detect or let user choose
INSTALLED=0

if command -v claude &>/dev/null; then
  install_claude && INSTALLED=$((INSTALLED+1))
  echo ""
fi

if command -v gemini &>/dev/null; then
  install_gemini && INSTALLED=$((INSTALLED+1))
  echo ""
fi

# Copilot: install if .github dir already exists or if neither Claude nor Gemini found
if [ -d ".github" ] || [ "$INSTALLED" -eq 0 ]; then
  install_copilot && INSTALLED=$((INSTALLED+1))
  echo ""
fi

if [ "$INSTALLED" -eq 0 ]; then
  err "No supported AI CLI found (claude, gemini)."
  echo ""
  echo "Manual install options:"
  echo "  Claude Code : cp -r $SKILL_DIR ~/.claude/skills/linkedin-job-auto-apply"
  echo "  Gemini CLI  : cp -r .gemini/extensions/linkedin-job-auto-apply ~/.gemini/extensions/"
  echo "  Copilot     : commit .github/copilot-instructions.md to your repo"
  exit 1
fi

echo ""
info "========================================"
ok "Done! $INSTALLED platform(s) configured."
info "========================================"
echo ""
echo "Next: make sure you're logged into LinkedIn, then start your AI assistant."
echo "Docs: INSTALLATION.md | QUICKSTART.md | USAGE_EXAMPLES.md"
echo ""
