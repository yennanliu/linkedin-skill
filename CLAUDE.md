# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What This Is

Two LinkedIn automation skills using Playwright MCP browser automation. Supports Claude Code (primary), Gemini CLI, and GitHub Copilot.

| Skill | Invoke | Description |
|-------|--------|-------------|
| Job Auto-Apply | `/linkedin-job-auto-apply` | Apply to Easy Apply jobs in batch |
| Profile Scraper | `/linkedin-profile-scraper` | Scrape profiles by company/country/industry |

| Platform | Config file | Install dir |
|----------|-------------|-------------|
| Claude Code | `SKILL.md` | `~/.claude/skills/<skill-name>/` |
| Gemini CLI | `GEMINI.md` / `.gemini/extensions/…/GEMINI.md` | `~/.gemini/extensions/linkedin-job-auto-apply/` |
| GitHub Copilot | `.github/copilot-instructions.md` | committed to repo |

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
node --check skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js
node --check skills/linkedin-profile-scraper/scrapeSingleProfile.js
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

skills/
  linkedin-job-auto-apply/
    SKILL.md                   # Skill prompt (entry point)
    autoApplyLinkedInJobs.js   # Batch automation with keyboard controls
    applySingleJob.js          # listJobs() + applySingleJob() helpers

  linkedin-profile-scraper/
    SKILL.md                   # Skill prompt (entry point)
    scrapeLinkedInProfiles.js  # Batch scraper by company/country/industry
    scrapeSingleProfile.js     # Scrape one profile by URL

docs/                 # GitHub Pages site (LinkedIn-styled UI)
```

### Key Design Points

**SKILL.md is the entry point** — when a user runs `/linkedin-job-auto-apply` or `/linkedin-profile-scraper`, Claude reads the corresponding `SKILL.md` and follows its instructions. The JS files are not auto-executed; they are pasted into Playwright MCP code blocks.

**Profile scraper flow:** search results page → collect profile URLs → visit each profile and scroll to trigger lazy-loaded sections → extract structured data via `page.evaluate()`.

**Scraper selectors** (fragile — update if LinkedIn redesigns):
- Name: `h1`
- Location: `.text-body-small.inline.t-black--light.break-words`
- Experience section anchor: `#experience`
- Experience items: `li.artdeco-list__item` inside the section
- Title: `.t-bold span[aria-hidden="true"]`
- Company: `.t-14.t-normal span[aria-hidden="true"]`
- Date/location: `.t-14.t-normal.t-black--light span[aria-hidden="true"]`

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
