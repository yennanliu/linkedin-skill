# LinkedIn Skills

Two LinkedIn automation skills using Playwright browser tools.

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

## Prerequisites

User must be logged into LinkedIn. Playwright MCP tools required.
