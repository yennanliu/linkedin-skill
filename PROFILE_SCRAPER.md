# LinkedIn Profile Scraper — Usage Guide

Scrape LinkedIn profiles filtered by company, country, and/or industry using Playwright MCP automation.

## Invoke

**Claude Code:**
```
/linkedin-profile-scraper
```

**Gemini CLI:**
```
/linkedin-profile-scraper
```

---

## Prerequisites

1. You are logged into LinkedIn in the browser controlled by Playwright MCP.
2. Playwright MCP browser tools are available in your AI assistant session.

---

## What Is Extracted

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

---

## Quick Start

### Single Profile

Ask your assistant:
```
Scrape the LinkedIn profile at https://www.linkedin.com/in/username/
```

Or in code (paste `scrapeSingleProfile.js` first):
```javascript
const profile = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/username/');
console.log(JSON.stringify(profile, null, 2));
```

### Batch Scrape by Filters

Ask your assistant:
```
Scrape up to 20 LinkedIn profiles for software engineers at Google in the United States
```

Or in code (paste `scrapeLinkedInProfiles.js` first):
```javascript
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});
console.log(JSON.stringify(results, null, 2));
```

---

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `company` | `''` | Filter by company name |
| `country` | `''` | Filter by country |
| `industry` | `''` | Filter by industry |
| `keywords` | `''` | Additional search keywords |
| `maxProfiles` | 20 | Maximum number of profiles to scrape |

All filters are optional — use whichever combination suits your search.

---

## Example Queries

### Engineers at a Specific Company
```javascript
await scrapeLinkedInProfiles(page, {
  company: 'OpenAI',
  industry: 'Software Development',
  maxProfiles: 15
});
```

### Finance Professionals by Country
```javascript
await scrapeLinkedInProfiles(page, {
  industry: 'Financial Services',
  country: 'Singapore',
  maxProfiles: 25
});
```

### Keyword + Company Search
```javascript
await scrapeLinkedInProfiles(page, {
  keywords: 'machine learning',
  company: 'DeepMind',
  maxProfiles: 10
});
```

### Country-wide Industry Search
```javascript
await scrapeLinkedInProfiles(page, {
  industry: 'Biotechnology',
  country: 'Germany',
  maxProfiles: 30
});
```

---

## How It Works

1. Builds a LinkedIn People search URL from the provided filters.
2. Collects profile URLs from the search results page(s).
3. Visits each profile and scrolls to trigger lazy-loaded sections.
4. Extracts structured data via `page.evaluate()`.
5. Returns an array of profile objects.

---

## Output Format

```json
[
  {
    "name": "Jane Smith",
    "headline": "Senior Software Engineer at Google",
    "location": "San Francisco, California",
    "currentCompany": "Google",
    "currentTitle": "Senior Software Engineer",
    "industry": "Software Development",
    "profileUrl": "https://www.linkedin.com/in/janesmith/",
    "workHistory": [
      {
        "title": "Senior Software Engineer",
        "company": "Google",
        "dateRange": "Jan 2021 – Present",
        "location": "Mountain View, CA"
      },
      {
        "title": "Software Engineer",
        "company": "Meta",
        "dateRange": "Jun 2018 – Dec 2020",
        "location": "Menlo Park, CA"
      }
    ]
  }
]
```

---

## Limitations

- **Login required**: Must be logged into LinkedIn before scraping.
- **Search results**: LinkedIn limits people search results; results vary by account type (free vs. Premium).
- **Selector fragility**: LinkedIn may change its DOM structure, which can break selectors. See CLAUDE.md for current selectors.
- **Rate limiting**: Scraping too many profiles too quickly may trigger LinkedIn's rate limiter. Use `maxProfiles` conservatively.
- **Private profiles**: Private or restricted profiles may return partial data.

---

## Troubleshooting

**No results returned**
- Confirm you are logged into LinkedIn.
- Try loosening filters (fewer constraints = more results).
- Check if LinkedIn is showing a CAPTCHA or verification screen.

**Partial profile data**
- Some fields may be empty if the profile owner has hidden them.
- Scroll-based lazy loading may not trigger for all profiles — retry the specific URL.

**CAPTCHA / rate limit**
- Wait 30–60 minutes before trying again.
- Reduce `maxProfiles` to stay under LinkedIn's detection thresholds.

---

## Files

| File | Purpose |
|------|---------|
| `skills/linkedin-profile-scraper/SKILL.md` | Skill entry point (read by Claude/Gemini) |
| `skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js` | Batch scraper |
| `skills/linkedin-profile-scraper/scrapeSingleProfile.js` | Single profile scraper |

---

## Legal & Ethical Usage

- Only scrape data for lawful purposes.
- Do not store or share scraped personal data beyond your immediate use case.
- Respect LinkedIn's [User Agreement](https://www.linkedin.com/legal/user-agreement) and [robots.txt](https://www.linkedin.com/robots.txt).
- Excessive scraping may violate LinkedIn's terms and result in account restrictions.
