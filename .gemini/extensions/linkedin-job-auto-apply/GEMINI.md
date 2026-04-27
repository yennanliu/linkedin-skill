# LinkedIn Skills

Three LinkedIn automation skills using Playwright browser tools, backed by seven specialist agents.

---

## Specialized Agents

| Agent | File | When to Use |
|-------|------|-------------|
| **Strategy Agent** | `skills/agents/strategy-agent/SKILL.md` | Filter jobs by relevance, blocklist, seniority, session budget |
| **Automation Agent** | `skills/agents/automation-agent/SKILL.md` | Timing, retry logic, rate limiting, anti-detection |
| **Web Structure Agent** | `skills/agents/web-structure-agent/SKILL.md` | Broken selectors, LinkedIn DOM changes, lazy loading |
| **QA Agent** | `skills/agents/qa-agent/SKILL.md` | Pre-flight checks, verify results, data quality reports |
| **Contact Discovery Agent** | `skills/agents/contact-discovery-agent/SKILL.md` | BFS/DFS strategy, seed selection, traversal tuning |
| **Outreach Agent** | `skills/agents/outreach-agent/SKILL.md` | Connection note templates, rate limits, acceptance rates |
| **Email Generator Agent** | `skills/agents/email-generator-agent/SKILL.md` | Email patterns, domain inference, confidence scoring |

**Orchestrated run order:**
1. QA Agent: `preFlightCheck(page)` — must PASS before continuing
2. Strategy Agent: `filterJobs(jobs, prefs)` — score and filter job list
3. Run the automation skill
4. QA Agent: verify results and generate report

---

## Skill 1: Job Auto-Apply

Automatically apply to LinkedIn Easy Apply jobs.

```javascript
// Paste autoApplyLinkedInJobs.js, then:
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,       // stop after N successful apps
  searchKeywords: 'software engineer',
  location: 'United States',
  easyApplyOnly: true
});
// Keyboard: P=Pause  R=Resume  Q=Quit
```

Files: `autoApplyLinkedInJobs.js`, `applySingleJob.js`

---

## Skill 2: Profile Scraper

Scrape profiles filtered by company / country / industry.

**Extracted:** name · current company · location · work history (title, company, date range, country) · industry

```javascript
// Single profile test:
// Paste scrapeSingleProfile.js, then:
const p = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');

// Batch scrape:
// Paste scrapeLinkedInProfiles.js, then:
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});
console.log(JSON.stringify(results, null, 2));
```

Files: `scrapeLinkedInProfiles.js`, `scrapeSingleProfile.js`

---

## Skill 3: Contact Reacher

Discover contacts via BFS/DFS, enrich with email candidates, optionally send connection requests, save JSON + CSV.

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
```

Files: `discoverContacts.js`, `extractContactInfo.js`, `reachContacts.js`, `saveOutput.js`

---

## Prerequisites

User must be logged into LinkedIn. Playwright MCP tools required.
