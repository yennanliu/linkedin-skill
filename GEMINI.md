# LinkedIn Skills for Gemini CLI

Two skills for LinkedIn automation using Playwright browser tools, backed by four specialized agents.

---

## Specialized Agents

Four agents support both skills. Load them when you need deeper expertise:

| Agent | File | Purpose |
|-------|------|---------|
| **Strategy Agent** | `skills/agents/strategy-agent/SKILL.md` | Filter & score jobs, blocklist, seniority matching, session budget |
| **Automation Agent** | `skills/agents/automation-agent/SKILL.md` | Timing, retry logic, rate limiting, anti-detection patterns |
| **Web Structure Agent** | `skills/agents/web-structure-agent/SKILL.md` | LinkedIn DOM selectors, lazy loading, virtual scroll, resilient targeting |
| **QA Agent** | `skills/agents/qa-agent/SKILL.md` | Pre-flight checks, result verification, data validation, session reports |

### Orchestrated Run Order

```
1. QA Agent       → preFlightCheck(page)        # must PASS — abort if fails
2. Strategy Agent → filterJobs(jobs, prefs)      # score & filter before applying
3. [run skill]
4. QA Agent       → generateReport()            # PASS/WARN/FAIL
   ↓ selectors broken   → Web Structure Agent
   ↓ high failure rate  → Automation Agent
   ↓ wrong job matches  → Strategy Agent
```

---

## Skill 1: Job Auto-Apply

Automate LinkedIn Easy Apply job applications.

**Files:**
- `skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js` — batch automation with keyboard controls (P/R/Q)
- `skills/linkedin-job-auto-apply/applySingleJob.js` — `listJobs(page)` + `applySingleJob(page, index)`

**Quick usage:**
```javascript
// Paste autoApplyLinkedInJobs.js, then:
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
```

Full instructions: `skills/linkedin-job-auto-apply/SKILL.md`

---

## Skill 2: Profile Scraper

Scrape LinkedIn profiles filtered by company, country, and industry.

**Extracted fields:** name, current company, country/location, work history (title, company, date range, location), industry.

**Files:**
- `skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js` — batch scraper
- `skills/linkedin-profile-scraper/scrapeSingleProfile.js` — single profile by URL

**Quick usage:**
```javascript
// Single profile test:
// Paste scrapeSingleProfile.js, then:
const p = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');
console.log(p);

// Batch scrape by filters:
// Paste scrapeLinkedInProfiles.js, then:
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});
console.log(JSON.stringify(results, null, 2));
```

Full instructions: `skills/linkedin-profile-scraper/SKILL.md`

Detailed usage guide: `PROFILE_SCRAPER.md`

---

## Prerequisites (both skills)

- User logged into LinkedIn
- Playwright MCP browser tools available
- Resume uploaded (job-apply skill only)
