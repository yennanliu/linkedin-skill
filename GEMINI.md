# LinkedIn Skills for Gemini CLI

Two skills for LinkedIn automation using Playwright browser tools.

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
  location: 'United States'
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

---

## Prerequisites (both skills)

- User logged into LinkedIn
- Playwright MCP browser tools available
- Resume uploaded (job-apply skill only)
