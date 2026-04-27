# LinkedIn Skills for Claude Code

Two Claude Code skills for LinkedIn automation using Playwright MCP tools.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/yennanliu/linkedin-skill)

🌐 **[繁體中文 README](README_zh-TW.md)** | 🌐 **[Visit Repository](https://github.com/yennanliu/linkedin-skill)** | 📚 **[Documentation](https://github.com/yennanliu/linkedin-skill/blob/main/QUICKSTART.md)** | 🚀 **[Quick Start](https://github.com/yennanliu/linkedin-skill/blob/main/QUICKSTART.md)**

---

## Skills

| Skill | Invoke | Description |
|-------|--------|-------------|
| Job Auto-Apply | `/linkedin-job-auto-apply` | Apply to Easy Apply jobs in batch |
| Profile Scraper | `/linkedin-profile-scraper` | Scrape profiles by company/country/industry |

## Specialized Agents

Four agents back both skills with deeper expertise on demand:

| Agent | Skill Name | Purpose |
|-------|-----------|---------|
| **Strategy Agent** | `linkedin-strategy-agent` | Score & filter jobs by relevance, seniority, blocklist; plan session budget |
| **Automation Agent** | `linkedin-automation-agent` | Timing, retry logic, rate limiting, anti-detection patterns |
| **Web Structure Agent** | `linkedin-web-structure-agent` | LinkedIn DOM selectors, lazy loading, virtual scroll, resilient targeting |
| **QA Agent** | `linkedin-qa-agent` | Pre-flight checks, result verification, data quality reports |

**Orchestrated run flow:**
```
1. QA Agent       → preFlightCheck(page)        # must PASS — abort if fails
2. Strategy Agent → filterJobs(jobs, prefs)      # score & filter before applying
3. [run skill]
4. QA Agent       → generateReport()            # PASS / WARN / FAIL
```

Agent docs: [`skills/agents/`](./skills/agents/)

---

## Skill 1: Job Auto-Apply

Automate LinkedIn Easy Apply job applications.

### Key Features

- **Easy Apply Focus**: Optimized for LinkedIn's Easy Apply feature
- **Target-Based**: Stop automatically after N successful applications
- **Keyboard Controls**: Pause (P), Resume (R), Quit (Q) anytime
- **On-Page Status**: Visual progress indicator
- **Smart Filtering**: Skip already applied, non-Easy Apply, and duplicate jobs across pages
- **Human-Like Delays**: Random delays to avoid detection
- **Comprehensive Error Handling**: Continues even when some jobs fail
- **Agent System**: Strategy, Automation, Web Structure, and QA agents for reliability

### Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `startPage` | 1 | Starting page number |
| `targetApplications` | 20 | Target number of successful applications |
| `maxPages` | 20 | Maximum pages to process |
| `searchKeywords` | `'software engineer'` | Job search keywords |
| `location` | `'United States'` | Job location |
| `delayMin` | 3000 | Minimum delay between jobs (ms) |
| `delayMax` | 5000 | Maximum delay between jobs (ms) |
| `userProfile.phone` | `'0000000000'` | Your phone number for form filling |
| `userProfile.linkedinUrl` | `'...'` | Your LinkedIn URL for form filling |
| `userProfile.city` | `'Remote'` | Your city for form filling |
| `userProfile.zip` | `'00000'` | Your ZIP code for form filling |
| `userProfile.yearsExp` | `3` | Years of experience for numeric fields |

### Quick Start

```javascript
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,
  searchKeywords: 'software engineer',
  location: 'United States',
  userProfile: {
    phone: '+1-555-000-0000',
    linkedinUrl: 'https://www.linkedin.com/in/yourhandle',
    city: 'San Francisco',
    zip: '94105',
    yearsExp: 5
  }
});
// Keyboard: P=Pause  R=Resume  Q=Quit
```

### Usage Examples

```
# Test with a single job
Use the LinkedIn job automation skill to apply to a single software engineering job as a test

# Batch apply to remote jobs
Use the LinkedIn skill to apply to remote software engineering jobs in United States,
process 3 pages with Easy Apply only

# Targeted search
Apply to backend developer positions on LinkedIn in San Francisco Bay Area,
target 25 applications, Easy Apply only
```

---

## Skill 2: Profile Scraper

Scrape LinkedIn profiles filtered by company, country, and/or industry.

### Extracted Fields

| Field | Description |
|-------|-------------|
| `name` | Full name |
| `headline` | Professional headline |
| `location` | Current country / city |
| `currentCompany` | Most recent employer |
| `currentTitle` | Current job title |
| `industry` | Industry label |
| `workHistory` | Array of `{ title, company, dateRange, location }` |
| `profileUrl` | LinkedIn profile URL |

### Configuration

| Option | Default | Description |
|--------|---------|-------------|
| `company` | `''` | Target company name |
| `country` | `''` | Target country |
| `industry` | `''` | Target industry |
| `keywords` | `''` | Additional search keywords |
| `maxProfiles` | 20 | Maximum profiles to scrape |

### Usage Examples

```javascript
// Single profile
const profile = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');

// Engineers at Google in the US
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});

// Finance professionals in Singapore
const results = await scrapeLinkedInProfiles(page, {
  industry: 'Financial Services',
  country: 'Singapore',
  maxProfiles: 15
});
```

For a detailed guide, see [PROFILE_SCRAPER.md](PROFILE_SCRAPER.md).

---

## Installation

### Claude Code (Recommended)

```bash
claude

/plugin marketplace add yennanliu/linkedin-skill

# Install job auto-apply skill
/plugin install linkedin-job-auto-apply

# Install profile scraper skill
/plugin install linkedin-profile-scraper

/plugin list
```

### Quick Install Script

```bash
git clone https://github.com/yennanliu/linkedin-skill.git
cd linkedin-skill
./install.sh
```

### Local Development

```bash
claude
/plugin marketplace add /path/to/linkedin-skill
/plugin install linkedin-job-auto-apply@local
/plugin install linkedin-profile-scraper@local
```

---

## Prerequisites

- LinkedIn account (logged in)
- Playwright MCP tools configured in Claude Code or Gemini CLI
- Resume uploaded (job-apply skill only)
- Stable internet connection

---

## Platform Support

| Platform | Config | Install dir |
|----------|--------|-------------|
| Claude Code | `SKILL.md` | `~/.claude/skills/<skill-name>/` |
| Gemini CLI | `GEMINI.md` | `~/.gemini/extensions/linkedin-skill/` |
| GitHub Copilot | `.github/copilot-instructions.md` | committed to repo |

---

## Safety & Legal

This tool is for **educational and personal productivity purposes only**.

- Only apply to jobs you're genuinely interested in and qualified for
- Respect LinkedIn's Terms of Service
- Use human-like delays and rate limiting (built in)
- Maximum 20-50 applications per session recommended
- Excessive automation may result in account restrictions

---

## Troubleshooting

**Easy Apply button not found** — ensure you're logged in and the Easy Apply filter is enabled.

**Applications failing** — check internet connection, verify account status, increase delays, test with a single job first.

**CAPTCHA encountered** — solve manually, then wait several hours before retrying.

**Script stops unexpectedly** — check console for errors, reduce `maxPages`, or resume from the last successful page.

---

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) for guidelines.

## License

MIT — use responsibly and respect LinkedIn's Terms of Service.

## Acknowledgments

Inspired by [104Skill](https://github.com/yennanliu/104Skill).
