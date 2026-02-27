#!/bin/bash

# LinkedIn Job Auto-Apply Skill Installer
# This script installs the LinkedIn job automation skill to Claude Code

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Print colored message
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

print_message "$BLUE" "========================================"
print_message "$BLUE" "LinkedIn Auto-Apply Skill Installer"
print_message "$BLUE" "========================================"
echo ""

# Check if Claude Code is installed
if ! command -v claude &> /dev/null; then
    print_message "$RED" "Error: Claude Code is not installed or not in PATH"
    print_message "$YELLOW" "Please install Claude Code first: https://claude.ai/code"
    exit 1
fi

print_message "$GREEN" "✓ Claude Code found"

# Determine installation directory
CLAUDE_DIR="$HOME/.claude"
SKILLS_DIR="$CLAUDE_DIR/skills"
INSTALL_DIR="$SKILLS_DIR/linkedin-job-auto-apply"

# Create directories if they don't exist
print_message "$BLUE" "Creating installation directories..."
mkdir -p "$SKILLS_DIR"

# Check if skill already exists
if [ -d "$INSTALL_DIR" ]; then
    print_message "$YELLOW" "Warning: LinkedIn skill already exists at $INSTALL_DIR"
    read -p "Do you want to overwrite it? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        print_message "$RED" "Installation cancelled"
        exit 1
    fi
    rm -rf "$INSTALL_DIR"
fi

# Copy skill files
print_message "$BLUE" "Installing LinkedIn Auto-Apply skill..."
mkdir -p "$INSTALL_DIR"

# Copy skill directory
cp -r skills/linkedin-job-auto-apply/* "$INSTALL_DIR/"

# Create a simple verification
if [ -f "$INSTALL_DIR/SKILL.md" ]; then
    print_message "$GREEN" "✓ Skill files installed successfully"
else
    print_message "$RED" "Error: Installation failed - SKILL.md not found"
    exit 1
fi

echo ""
print_message "$GREEN" "========================================"
print_message "$GREEN" "Installation Complete!"
print_message "$GREEN" "========================================"
echo ""

print_message "$BLUE" "Installation location: $INSTALL_DIR"
echo ""

print_message "$YELLOW" "Next steps:"
echo "  1. Start Claude Code: claude"
echo "  2. Use the skill: /linkedin-job-auto-apply"
echo "  3. Or ask: \"Help me apply to jobs on LinkedIn\""
echo ""

print_message "$BLUE" "Quick test:"
echo "  In Claude Code, try:"
echo "  /linkedin-job-auto-apply"
echo ""

print_message "$YELLOW" "Documentation:"
echo "  - Quick Start: $INSTALL_DIR/QUICKSTART.md"
echo "  - Full Docs: $INSTALL_DIR/SKILL.md"
echo "  - Examples: $INSTALL_DIR/USAGE_EXAMPLES.md"
echo ""

print_message "$GREEN" "Happy job hunting! 🎯"
