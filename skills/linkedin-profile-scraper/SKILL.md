---
name: linkedin-profile-scraper
description: Scrape LinkedIn profile data (name, current company, country, work history, industry) filtered by company, country, and industry. Uses Playwright MCP browser automation.
---

# LinkedIn Profile Scraper Skill

Search LinkedIn people by **company**, **country**, and/or **industry**, then extract structured profile data for each result.

## Specialized Agents

This skill is backed by three specialist agents. Invoke them for deeper help:

| Agent | File | When to Use |
|-------|------|-------------|
| **Automation Agent** | [`skills/agents/automation-agent/SKILL.md`](../agents/automation-agent/SKILL.md) | Timing strategy, retry logic, rate limiting |
| **Web Structure Agent** | [`skills/agents/web-structure-agent/SKILL.md`](../agents/web-structure-agent/SKILL.md) | Broken selectors, missing fields, lazy load fixes |
| **QA Agent** | [`skills/agents/qa-agent/SKILL.md`](../agents/qa-agent/SKILL.md) | Validate scraped data, completeness reports |

### Recommended Run Order

```
1. QA Agent          → preFlightCheck(page)         # verify session is healthy
2. [run batch scrape]
3. QA Agent          → validateBatchResults()        # check data quality
4. QA Agent          → generateReport()              # structured summary
```

If issues arise:
- Fields returning null / empty → invoke **Web Structure Agent** for selector updates
- Scraper getting rate-limited → invoke **Automation Agent** for back-off strategy
- Low completeness scores → invoke **QA Agent** to identify which fields need fixing

## Extracted Fields

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

## Script Files

- **`scrapeLinkedInProfiles.js`** — batch scraper: searches by filters, visits each profile, returns array of profiles
- **`scrapeSingleProfile.js`** — scrape one profile by URL

## Prerequisites

- User logged into LinkedIn
- Playwright MCP browser tools available

## Usage

### Single Profile

```javascript
// Paste scrapeSingleProfile.js first, then:
const profile = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');
console.log(JSON.stringify(profile, null, 2));
```

### Batch by Company / Country / Industry

```javascript
// Paste scrapeLinkedInProfiles.js first, then:

// Example 1: engineers at Google in the US
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});

// Example 2: finance professionals in Singapore
const results = await scrapeLinkedInProfiles(page, {
  industry: 'Financial Services',
  country: 'Singapore',
  maxProfiles: 15
});

// Example 3: keyword search
const results = await scrapeLinkedInProfiles(page, {
  keywords: 'machine learning',
  company: 'OpenAI',
  maxProfiles: 10
});

console.log(JSON.stringify(results, null, 2));
```

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `company` | `''` | Target company name |
| `country` | `''` | Target country |
| `industry` | `''` | Target industry |
| `keywords` | `''` | Additional search keywords |
| `maxProfiles` | `10` | Max profiles to scrape |
| `maxPages` | `5` | Max search result pages to scan |
| `delayMin` | `2000` | Min delay between requests (ms) |
| `delayMax` | `4000` | Max delay between requests (ms) |

## Output Example

```json
[
  {
    "status": "success",
    "name": "Jane Smith",
    "headline": "Senior Software Engineer at Google",
    "location": "San Francisco, California",
    "currentCompany": "Google",
    "currentTitle": "Senior Software Engineer",
    "industry": "Software Development",
    "workHistory": [
      {
        "title": "Senior Software Engineer",
        "company": "Google",
        "dateRange": "Jan 2021 – Present · 3 yrs",
        "location": "San Francisco, CA"
      },
      {
        "title": "Software Engineer",
        "company": "Meta",
        "dateRange": "Jun 2018 – Dec 2020 · 2 yrs 6 mos",
        "location": "Menlo Park, CA"
      }
    ],
    "profileUrl": "https://www.linkedin.com/in/janesmith/"
  }
]
```

## How to Run (Step by Step)

1. **Log into LinkedIn** in the browser controlled by Playwright
2. **Test single profile** first to confirm scraping works:
   ```javascript
   const p = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/satyanadella/');
   console.log(p.name, p.currentCompany, p.location);
   ```
3. **Run batch scrape** with your filters
4. **Export results** — paste this to save as JSON:
   ```javascript
   copy(JSON.stringify(results, null, 2));  // copies to clipboard in browser console
   ```

## Limitations

- LinkedIn may paginate or limit search results
- Some profile fields may be private or hidden
- Excessive scraping may trigger LinkedIn rate limits — keep `maxProfiles` ≤ 50 per session
- Work history accuracy depends on LinkedIn's DOM structure (update selectors if LinkedIn redesigns)
- Recommended session limit: 30–50 profiles, with breaks between sessions

## Troubleshooting

**Empty workHistory:** LinkedIn lazy-loads experience sections. The script scrolls to trigger them, but if the page is slow, increase `delayMin` to `3000`.

**name is null:** LinkedIn may show a login wall. Ensure you are logged in before running.

**No profiles found in search:** Try broader keywords or remove some filters. LinkedIn search ranking can be unpredictable.
