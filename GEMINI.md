# LinkedIn Job Auto-Apply Skill for Gemini CLI

Automate LinkedIn job applications using Playwright browser automation.

## Skill Files

- `skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js` — batch automation with target-based stopping and P/R/Q keyboard controls
- `skills/linkedin-job-auto-apply/applySingleJob.js` — `listJobs(page)` and `applySingleJob(page, index)` helpers for single-job use

## Usage

When the user asks to apply to LinkedIn jobs, follow the instructions in `skills/linkedin-job-auto-apply/SKILL.md`.

**Quick test (single job):**
```javascript
// Paste applySingleJob.js functions, then:
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
const jobs = await listJobs(page);
const result = await applySingleJob(page, 0);
```

**Batch automation:**
```javascript
// Paste autoApplyLinkedInJobs.js function, then:
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,
  searchKeywords: 'software engineer',
  location: 'United States'
});
// Keyboard controls while running: P=Pause  R=Resume  Q=Quit
```

## Prerequisites

- User logged into LinkedIn
- Resume uploaded to LinkedIn profile
- Playwright MCP browser tools available

## Configuration Options

| Option | Default | Description |
|--------|---------|-------------|
| `targetApplications` | 20 | Stop after N successful applications |
| `searchKeywords` | `'software engineer'` | Job search query |
| `location` | `'United States'` | Job location filter |
| `easyApplyOnly` | `true` | Only Easy Apply jobs |
| `startPage` | 1 | Resume from page N |
| `delayMin` / `delayMax` | 2000 / 4000 ms | Human-like delay range |
