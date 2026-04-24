# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

A Claude Code plugin/skill that automates LinkedIn job applications via Playwright MCP browser automation. It is distributed as a Claude Code marketplace plugin (`yennanliu/linkedin-skill`) and installed via `/plugin` commands.

## Plugin Installation (End-User Flow)

```bash
/plugin marketplace add yennanliu/linkedin-skill
/plugin install linkedin-job-auto-apply
/linkedin-job-auto-apply
```

For local development:
```bash
/plugin marketplace add /path/to/linkedin-skill
/plugin install linkedin-job-auto-apply@local
```

## Validation (CI)

JavaScript syntax check (no build step needed):
```bash
node --check skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js
node --check skills/linkedin-job-auto-apply/applySingleJob.js
```

Validate JSON config:
```bash
jq . .claude-plugin/plugin.json
jq . .claude-plugin/marketplace.json
```

Run install script:
```bash
bash install.sh
```

CI runs automatically on push/PR to `main` via `.github/workflows/test.yml`.

## Architecture

```
.claude-plugin/
  plugin.json         # Plugin manifest (name, version, skills path)
  marketplace.json    # Marketplace listing metadata

skills/linkedin-job-auto-apply/
  SKILL.md            # Skill prompt loaded by Claude Code when invoked
  autoApplyLinkedInJobs.js  # Main batch automation (target-based, keyboard controls)
  applySingleJob.js   # Helper: listJobs() and applySingleJob() for single-job use

docs/                 # GitHub Pages site (LinkedIn-styled UI)
```

### Key Design Points

**SKILL.md is the entry point** — when a user runs `/linkedin-job-auto-apply`, Claude reads `skills/linkedin-job-auto-apply/SKILL.md` and follows the instructions there. The JS files are not auto-executed; Claude is instructed to copy/paste them into Playwright MCP code blocks.

**Two JS files, two usage modes:**
- `applySingleJob.js` — exports `listJobs(page)` and `applySingleJob(page, index)` for testing/manual one-at-a-time use
- `autoApplyLinkedInJobs.js` — exports `autoApplyLinkedInJobs(page, options)` for batch automation with target-based stopping and P/R/Q keyboard controls

**No Node.js package.json** — the JS files run in the Playwright MCP browser context (injected via `page.evaluate()`), not as standalone Node modules. The `module.exports` guard at the bottom is for optional use in test environments only.

**CI/CD auto-releases** — every push to `main` that passes all 6 CI jobs automatically bumps the patch version in `plugin.json` and `marketplace.json`, commits it with `[skip ci]`, and creates a GitHub Release.

### LinkedIn Selectors Used

The automation targets these LinkedIn-specific DOM selectors (may need updating if LinkedIn changes its UI):
- Job cards: `.job-card-container`, `.jobs-search-results__list-item`
- Easy Apply button: `button[aria-label*="Easy Apply"]`
- Modal: `[role="dialog"]`, `.jobs-easy-apply-modal`
- Submit: `button` containing "Submit application"
- Close: `button[aria-label*="Dismiss"]`

### Required Files for CI to Pass

Any PR must keep all these files present and non-empty: `SKILL.md`, `install.sh`, `README.md`, `QUICKSTART.md`, `INSTALLATION.md`, `USAGE_EXAMPLES.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`.
