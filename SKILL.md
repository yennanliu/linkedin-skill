---
name: linkedin-skills
description: Three LinkedIn automation skills — (1) auto-apply to Easy Apply jobs, (2) scrape profile data by company/country/industry, (3) discover contacts via BFS/DFS for referrals/networking with email generation. Uses Playwright MCP browser automation.
---

# LinkedIn Skills

Three skills for LinkedIn automation via Playwright MCP browser tools.

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

## Skill 3: Contact Reacher

Systematically discover LinkedIn contacts for job referrals or networking using BFS/DFS traversal. Extracts LinkedIn URLs, generates company email candidates, optionally sends connection requests, and saves output locally as JSON + CSV.

**Usage:** `/linkedin-contact-reacher`

Full docs: [skills/linkedin-contact-reacher/SKILL.md](./skills/linkedin-contact-reacher/SKILL.md)

```javascript
// Paste discoverContacts.js, then:
const contacts = await discoverContacts(page, {
  seeds: [{ type: 'search', company: 'Google', role: 'Software Engineer' }],
  strategy: 'bfs',
  maxContacts: 30,
  maxDepth: 1,
  targetCompanies: ['Google'],
});

// Paste extractContactInfo.js, then:
const enriched = await extractContactInfo(page, contacts, {
  companyDomains: { 'Google': 'google.com' },
});

// Paste saveOutput.js, then:
await saveOutput(enriched, { label: 'google-referrals', format: 'both' });
// Output: ./output/google-referrals_2026-04-27T....{json,csv}
```

---

## Specialized Agents

Both skills are backed by three specialist agents for deeper control:

| Agent | Skill Name | Purpose |
|-------|-----------|---------|
| **Strategy Agent** | `linkedin-strategy-agent` | Filter & score jobs, blocklist, seniority matching, session budget |
| **Automation Agent** | `linkedin-automation-agent` | Timing, retry logic, rate limiting, anti-detection patterns |
| **Web Structure Agent** | `linkedin-web-structure-agent` | LinkedIn DOM selectors, lazy loading, resilient element targeting |
| **QA Agent** | `linkedin-qa-agent` | Pre-flight checks, result verification, data quality reports |
| **Contact Discovery Agent** | `linkedin-contact-discovery-agent` | BFS/DFS traversal strategy, seed selection, depth tuning |
| **Outreach Agent** | `linkedin-outreach-agent` | Connection note templates, rate limits, acceptance rate optimization |
| **Email Generator Agent** | `linkedin-email-generator-agent` | Email pattern generation, domain inference, confidence scoring |

Full agent docs: [`skills/agents/`](./skills/agents/)

**Orchestrated run flow:**
```
1. QA Agent       → preFlightCheck(page)        # must PASS — abort if fails
2. Strategy Agent → filterJobs(jobs, prefs)      # score & filter before applying
3. [run skill with filtered list]
4. QA Agent       → verify / generateReport()   # after finishing
   ↓ selectors broken    → Web Structure Agent
   ↓ high failure rate   → Automation Agent
   ↓ irrelevant matches  → Strategy Agent
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
