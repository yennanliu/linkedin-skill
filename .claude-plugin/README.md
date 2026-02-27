# LinkedIn Job Auto-Apply Plugin

A Claude Code plugin for automating job applications on LinkedIn using Playwright MCP tools.

## Installation

### From Marketplace

```bash
claude

# Add to marketplace
/plugin marketplace add jerryliu/linkedin-skill

# Install the skill
/plugin install linkedin-job-auto-apply

# Use the skill
/linkedin-job-auto-apply
```

### Local Development

```bash
# Add local marketplace
/plugin marketplace add /path/to/linkedin-skill

# Install from local source
/plugin install linkedin-job-auto-apply@local
```

## Features

- Easy Apply automation for LinkedIn jobs
- Single job application testing
- Batch processing multiple jobs
- Multi-page automation
- Smart filtering (skips already applied jobs)
- Keyboard controls (Pause/Resume/Quit)
- Target-based stopping
- Configurable delays and safety features

## Prerequisites

- LinkedIn account (logged in)
- Resume uploaded to LinkedIn
- Playwright MCP tools configured in Claude Code
- Stable internet connection

## Usage

```
/linkedin-job-auto-apply
```

Claude will guide you through the automation process.

## Documentation

See the main README.md for detailed documentation, usage examples, and best practices.
