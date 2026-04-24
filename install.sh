#!/bin/bash

# LinkedIn Skills — Multi-Platform Installer
# Supports: Claude Code, Gemini CLI, GitHub Copilot
# Installs: skills + Playwright MCP browser tools

set -e

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

msg()  { echo -e "${2}${1}${NC}"; }
ok()   { msg "✓ $1" "$GREEN"; }
info() { msg "  $1" "$BLUE"; }
warn() { msg "⚠  $1" "$YELLOW"; }
err()  { msg "✗ $1" "$RED"; }
sep()  { echo -e "${BLUE}────────────────────────────────────────${NC}"; }

# ── Playwright MCP ─────────────────────────────────────────────────────────────
install_playwright_mcp() {
  info "Checking Playwright MCP..."

  if ! command -v node &>/dev/null; then
    warn "Node.js not found. Install from https://nodejs.org (v18+)"
    warn "Then re-run this script."
    return 1
  fi

  NODE_VER=$(node -e "process.stdout.write(process.version)")
  info "Node.js $NODE_VER found"

  # Check if @playwright/mcp is already installed globally or via npx cache
  if npx --yes @playwright/mcp@latest --version &>/dev/null 2>&1; then
    ok "Playwright MCP already available"
  else
    info "Installing @playwright/mcp globally..."
    npm install -g @playwright/mcp@latest
    ok "Playwright MCP installed"
  fi

  # Install browser binaries (chromium only for speed; add --with-deps on Linux)
  info "Installing Playwright browser (chromium)..."
  if [[ "$OSTYPE" == "linux-gnu"* ]]; then
    npx playwright install chromium --with-deps 2>&1 | tail -3
  else
    npx playwright install chromium 2>&1 | tail -3
  fi
  ok "Playwright browser ready"
}

configure_playwright_claude() {
  info "Configuring Playwright MCP in Claude Code..."
  CLAUDE_CONFIG="$HOME/.claude/claude_desktop_config.json"
  mkdir -p "$(dirname "$CLAUDE_CONFIG")"

  if [ -f "$CLAUDE_CONFIG" ]; then
    # Merge: add mcpServers key if missing
    if ! jq -e '.mcpServers["playwright"]' "$CLAUDE_CONFIG" &>/dev/null; then
      jq '.mcpServers["playwright"] = {"command": "npx", "args": ["@playwright/mcp@latest"]}' \
        "$CLAUDE_CONFIG" > /tmp/claude_config_tmp.json
      mv /tmp/claude_config_tmp.json "$CLAUDE_CONFIG"
      ok "Playwright MCP added to Claude config"
    else
      ok "Playwright MCP already configured in Claude"
    fi
  else
    cat > "$CLAUDE_CONFIG" <<'JSON'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
JSON
    ok "Claude config created with Playwright MCP"
  fi
  info "Config: $CLAUDE_CONFIG"
}

configure_playwright_gemini() {
  info "Configuring Playwright MCP in Gemini CLI..."
  GEMINI_CONFIG="$HOME/.gemini/settings.json"
  mkdir -p "$(dirname "$GEMINI_CONFIG")"

  if [ -f "$GEMINI_CONFIG" ]; then
    if ! jq -e '.mcpServers["playwright"]' "$GEMINI_CONFIG" &>/dev/null; then
      jq '.mcpServers["playwright"] = {"command": "npx", "args": ["@playwright/mcp@latest"]}' \
        "$GEMINI_CONFIG" > /tmp/gemini_settings_tmp.json
      mv /tmp/gemini_settings_tmp.json "$GEMINI_CONFIG"
      ok "Playwright MCP added to Gemini config"
    else
      ok "Playwright MCP already configured in Gemini"
    fi
  else
    cat > "$GEMINI_CONFIG" <<'JSON'
{
  "mcpServers": {
    "playwright": {
      "command": "npx",
      "args": ["@playwright/mcp@latest"]
    }
  }
}
JSON
    ok "Gemini config created with Playwright MCP"
  fi
  info "Config: $GEMINI_CONFIG"
}

# ── Skills ─────────────────────────────────────────────────────────────────────
install_claude() {
  sep
  info "Installing skills for Claude Code..."
  for skill in linkedin-job-auto-apply linkedin-profile-scraper; do
    DEST="$HOME/.claude/skills/$skill"
    [ -d "$DEST" ] && { warn "Overwriting $DEST"; rm -rf "$DEST"; }
    mkdir -p "$DEST"
    cp -r "skills/$skill/"* "$DEST/"
    [ -f "$DEST/SKILL.md" ] && ok "$skill installed" || { err "Install failed: $skill"; return 1; }
  done
  echo ""
  configure_playwright_claude
  echo ""
  info "Restart Claude Code for MCP changes to take effect"
  info "Usage: claude → /linkedin-job-auto-apply  or  /linkedin-profile-scraper"
}

install_gemini() {
  sep
  info "Installing skills for Gemini CLI..."
  DEST="$HOME/.gemini/extensions/linkedin-job-auto-apply"
  mkdir -p "$DEST"
  cp ".gemini/extensions/linkedin-job-auto-apply/gemini-extension.json" "$DEST/"
  cp ".gemini/extensions/linkedin-job-auto-apply/GEMINI.md"             "$DEST/"
  cp "skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js"          "$DEST/"
  cp "skills/linkedin-job-auto-apply/applySingleJob.js"                 "$DEST/"
  cp "skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js"        "$DEST/"
  cp "skills/linkedin-profile-scraper/scrapeSingleProfile.js"           "$DEST/"
  [ -f "$DEST/gemini-extension.json" ] && ok "Extension installed to $DEST" || { err "Gemini install failed"; return 1; }
  echo ""
  configure_playwright_gemini
  echo ""
  info "Restart Gemini CLI for MCP changes to take effect"
  info "Usage: gemini → ask about LinkedIn job automation or profile scraping"
}

install_copilot() {
  sep
  info "Installing for GitHub Copilot..."
  # copilot-instructions.md is already in .github/ — just confirm it's there
  [ -f ".github/copilot-instructions.md" ] && ok "copilot-instructions.md present" || { err ".github/copilot-instructions.md missing"; return 1; }
  echo ""
  info "Playwright MCP for Copilot (VS Code):"
  info "  1. Install the 'Playwright MCP' VS Code extension, or"
  info "  2. Add to VS Code settings.json:"
  info '     "mcp": {"servers": {"playwright": {"command": "npx", "args": ["@playwright/mcp@latest"]}}}'
  echo ""
  info "Commit .github/copilot-instructions.md — Copilot picks it up automatically"
}

# ── Main ───────────────────────────────────────────────────────────────────────
echo ""
msg "════════════════════════════════════════" "$BLUE"
msg "  LinkedIn Skills — Installer" "$BLUE"
msg "════════════════════════════════════════" "$BLUE"
echo ""

# Install Playwright MCP first (shared dependency)
sep
install_playwright_mcp || warn "Playwright MCP setup skipped — install Node.js and re-run"
echo ""

INSTALLED=0

if command -v claude &>/dev/null; then
  install_claude && INSTALLED=$((INSTALLED+1))
  echo ""
fi

if command -v gemini &>/dev/null; then
  install_gemini && INSTALLED=$((INSTALLED+1))
  echo ""
fi

if [ -d ".github" ] || [ "$INSTALLED" -eq 0 ]; then
  install_copilot && INSTALLED=$((INSTALLED+1))
  echo ""
fi

if [ "$INSTALLED" -eq 0 ]; then
  err "No supported AI CLI found (claude, gemini)."
  echo ""
  echo "Manual install:"
  echo "  Claude : cp -r skills/linkedin-job-auto-apply ~/.claude/skills/"
  echo "           cp -r skills/linkedin-profile-scraper ~/.claude/skills/"
  echo "  Gemini : cp -r .gemini/extensions/linkedin-job-auto-apply ~/.gemini/extensions/"
  echo "  Copilot: commit .github/copilot-instructions.md to your repo"
  echo ""
  echo "Playwright MCP (all platforms):"
  echo "  npm install -g @playwright/mcp@latest"
  echo "  npx playwright install chromium"
  exit 1
fi

echo ""
msg "════════════════════════════════════════" "$GREEN"
ok "Done! $INSTALLED platform(s) configured."
msg "════════════════════════════════════════" "$GREEN"
echo ""
echo "Next: log into LinkedIn, start your AI assistant, and go!"
echo "Docs: INSTALLATION.md | QUICKSTART.md | USAGE_EXAMPLES.md"
echo ""
