---
name: linkedin-skills
description: Two LinkedIn automation skills — (1) auto-apply to Easy Apply jobs, (2) scrape profile data by company/country/industry. Uses Playwright MCP browser automation.
---

# LinkedIn Skills

Two skills for LinkedIn automation via Playwright MCP browser tools.

---

## Skill 1: Job Auto-Apply

Automatically apply to LinkedIn Easy Apply jobs with target-based stopping and keyboard controls.

**Usage:** `/linkedin-job-auto-apply`

Full docs: [skills/linkedin-job-auto-apply/SKILL.md](./skills/linkedin-job-auto-apply/SKILL.md)

```javascript
// Paste autoApplyLinkedInJobs.js, then:
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,
  searchKeywords: 'software engineer',
  location: 'United States'
});
// P=Pause  R=Resume  Q=Quit
```

---

## Skill 2: Profile Scraper

Search LinkedIn people by company, country, and industry — scrape name, current company, location, work history, and industry for each.

**Usage:** `/linkedin-profile-scraper`

Full docs: [skills/linkedin-profile-scraper/SKILL.md](./skills/linkedin-profile-scraper/SKILL.md)

```javascript
// Paste scrapeLinkedInProfiles.js, then:
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});
console.log(JSON.stringify(results, null, 2));
```

---

## Specialized Agents

Both skills are backed by three specialist agents for deeper control:

| Agent | Skill Name | Purpose |
|-------|-----------|---------|
| **Automation Agent** | `linkedin-automation-agent` | Timing, retry logic, rate limiting, anti-detection patterns |
| **Web Structure Agent** | `linkedin-web-structure-agent` | LinkedIn DOM selectors, lazy loading, resilient element targeting |
| **QA Agent** | `linkedin-qa-agent` | Pre-flight checks, result verification, data quality reports |

Full agent docs: [`skills/agents/`](./skills/agents/)

**Typical run flow:**
```
1. QA Agent      → preFlightCheck(page)       # before starting
2. [run skill]
3. QA Agent      → verify / generateReport()  # after finishing
   ↓ if selectors broken → Web Structure Agent
   ↓ if high failure rate → Automation Agent
```

---

## Installation

```bash
# Claude Code marketplace
/plugin marketplace add yennanliu/linkedin-skill
/plugin install linkedin-job-auto-apply
/plugin install linkedin-profile-scraper

# Or via install script (auto-detects Claude/Gemini)
./install.sh
```

See [INSTALLATION.md](./INSTALLATION.md) | [INSTALL_GEMINI.md](./INSTALL_GEMINI.md) | [INSTALL_COPILOT.md](./INSTALL_COPILOT.md)
