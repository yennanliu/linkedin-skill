# GitHub Copilot Instructions — LinkedIn Automation Skills

This repository contains two LinkedIn automation skills using Playwright browser automation.

---

## Skill 1: Job Auto-Apply

Automates LinkedIn Easy Apply job applications.

| File | Purpose |
|------|---------|
| `skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js` | Batch apply with target-based stopping and P/R/Q keyboard controls |
| `skills/linkedin-job-auto-apply/applySingleJob.js` | `listJobs(page)` + `applySingleJob(page, index)` for single-job testing |

**Usage:**
```javascript
// Test first (paste applySingleJob.js):
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
const jobs = await listJobs(page);
const result = await applySingleJob(page, 0);

// Batch (paste autoApplyLinkedInJobs.js):
await autoApplyLinkedInJobs(page, { targetApplications: 20, searchKeywords: 'software engineer' });
```

---

## Skill 2: Profile Scraper

Scrapes LinkedIn profiles filtered by **company**, **country**, and/or **industry**.

**Extracted fields:** name · current company · location/country · work history (title, company, date range, location) · industry headline

| File | Purpose |
|------|---------|
| `skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js` | Batch scrape by search filters |
| `skills/linkedin-profile-scraper/scrapeSingleProfile.js` | Scrape one profile by URL |

**Usage:**
```javascript
// Single profile (paste scrapeSingleProfile.js):
const p = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');
console.log(p.name, p.currentCompany, p.location, p.workHistory);

// Batch scrape (paste scrapeLinkedInProfiles.js):
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});
console.log(JSON.stringify(results, null, 2));
```

---

## How to Ask Copilot

- "Help me scrape LinkedIn profiles at Stripe in Singapore"
- "Apply to 20 LinkedIn software engineer jobs automatically"
- "Show me how to use the LinkedIn profile scraper"

Copilot will guide you to paste the appropriate JS into a Playwright code block and run it.

## Prerequisites

- Logged into LinkedIn (both skills)
- Playwright MCP tools available
- Resume uploaded to LinkedIn (job-apply skill only)
