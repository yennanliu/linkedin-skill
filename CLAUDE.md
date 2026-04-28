# CLAUDE.md

Guidance for Claude Code when working in this repository.

## What This Is

Three LinkedIn automation skills using Playwright MCP browser automation.

| Skill | Invoke | Docs |
|-------|--------|------|
| Job Auto-Apply | `/linkedin-job-auto-apply` | `skills/linkedin-job-auto-apply/SKILL.md` |
| Profile Scraper | `/linkedin-profile-scraper` | `skills/linkedin-profile-scraper/SKILL.md` |
| Contact Reacher | `/linkedin-contact-reacher` | `skills/linkedin-contact-reacher/SKILL.md` |

Seven specialist agents live in `skills/agents/` — see `SKILL.md` (root) for the full table.

## Key Design Points

- **SKILL.md is the entry point** — Claude reads it when a skill is invoked; JS files are *pasted* into Playwright MCP code blocks, not auto-executed.
- **All DOM work goes through `page.evaluate()`** — never use `page.locator()`, `page.waitForSelector()`, or other Playwright-specific APIs; the unit test mock only exposes `goto`, `waitForTimeout`, and `evaluate`.
- **No build step** — JS files run in the browser context. The `module.exports` guard at the bottom is for test environments only.
- **CI auto-releases** — every passing push to `main` bumps the patch version in `plugin.json` + `marketplace.json` and creates a GitHub Release.

## CI Validation

```bash
# Syntax check
node --check skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js
node --check skills/linkedin-job-auto-apply/applySingleJob.js
node --check skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js
node --check skills/linkedin-profile-scraper/scrapeSingleProfile.js
node --check skills/linkedin-contact-reacher/discoverContacts.js
node --check skills/linkedin-contact-reacher/extractContactInfo.js
node --check skills/linkedin-contact-reacher/reachContacts.js
node --check skills/linkedin-contact-reacher/saveOutput.js

# JSON config
jq . .claude-plugin/plugin.json
jq . .claude-plugin/marketplace.json

# Install script
bash install.sh
```

CI runs on push/PR to `main` via `.github/workflows/test.yml`. Required files (must stay present and non-empty): `SKILL.md`, `install.sh`, `README.md`, `QUICKSTART.md`, `INSTALLATION.md`, `USAGE_EXAMPLES.md`, `CONTRIBUTING.md`, `CHANGELOG.md`, `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`.

## LinkedIn DOM Selectors

Selectors are fragile — update if LinkedIn redesigns. See `skills/agents/web-structure-agent/SKILL.md` for the full reference.

**Job apply:** `.job-card-container`, `button[aria-label*="Easy Apply"]`, `[role="dialog"]`, `button` containing "Submit application"

**Profile scraper (aero architecture, 2024+):**
- Name: first `h2` that isn't a UI label (LinkedIn aero uses `h2`, not `h1`)
- Headline / location: `p` tags in document order after the name `h2`
- **workHistory**: visit `/in/{vanityName}/details/experience/` and parse `document.body.innerText` — the main profile page does NOT render the Experience section in the DOM (aero lazy-loads it via RSC and it never lands in the HTML)
- Old selectors (`#experience`, `li.artdeco-list__item`, `li.pvs-list__paged-list-item`, `t-bold`) are **deprecated** — LinkedIn aero uses hashed CSS class names

**Contact reacher:** `button[aria-label*="Connect"]`, `button[aria-label*="More actions"]`, `textarea[name="message"]`

## Profile Scraper Scripts

| Script | Approach | workHistory |
|--------|----------|-------------|
| `scripts/run_scraper_voyager.js` | **Recommended** — visits `/details/experience/` subpage, parses `innerText` | ✅ Full history |
| `scripts/run_scraper_dom.js` | Fallback — top-card DOM only | ⚠️ Current job only |
| `scripts/run_scraper.js` | Legacy — DOM scraper with incremental scroll | ⚠️ Current job only |

Run the recommended scraper:
```bash
node scripts/run_scraper_voyager.js
```

Session management: run `node scripts/login_cli.js` first to save `scripts/cookies.json`.

## Further Reading

- Platform install dirs & plugin flow → `INSTALLATION.md`
- Full usage examples → `USAGE_EXAMPLES.md`
- Profile scraper deep-dive → `PROFILE_SCRAPER.md`
- Agent orchestration → `SKILL.md` (root)
