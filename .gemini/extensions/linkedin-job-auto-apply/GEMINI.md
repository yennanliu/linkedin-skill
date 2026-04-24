# LinkedIn Job Auto-Apply

Automate LinkedIn job applications using Playwright browser automation.

## How to Use

When asked to apply to LinkedIn jobs, use the JavaScript functions from this skill.

**Step 1 — Single job test (always start here):**
```javascript
// Paste contents of applySingleJob.js, then:
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
await page.waitForTimeout(3000);
const jobs = await listJobs(page);
console.log(jobs);                         // show available jobs
const result = await applySingleJob(page, 0);
console.log(result);                       // { status: 'success'|'skipped'|'failed', job: {...} }
```

**Step 2 — Batch automation:**
```javascript
// Paste contents of autoApplyLinkedInJobs.js, then:
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,       // stop after 20 successful apps
  searchKeywords: 'software engineer',
  location: 'United States',
  easyApplyOnly: true
});
// Keyboard controls: P=Pause  R=Resume  Q=Quit
```

## Script Files

- `skills/linkedin-job-auto-apply/applySingleJob.js` — `listJobs()` + `applySingleJob()`
- `skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js` — batch automation

## Prerequisites

User must be logged into LinkedIn with a complete profile and resume uploaded.

## Limitations

- Easy Apply only (skips complex multi-form applications)
- Cannot solve CAPTCHA
- Requires browser to remain open
- Recommended max: 20–50 applications per session
