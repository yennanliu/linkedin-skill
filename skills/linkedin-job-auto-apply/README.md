# LinkedIn Job Auto-Apply Scripts

This directory contains the automation scripts for LinkedIn job applications.

## Files

### `autoApplyLinkedInJobs.js`
Main automation script with target-based execution and keyboard controls.

**Features:**
- Target-based stopping (e.g., stop after 20 successful applications)
- Keyboard controls: P=Pause, R=Resume, Q=Quit
- On-page status indicator
- Easy Apply automation
- LinkedIn-specific selectors

**Usage:**
```javascript
// Load the script (in Claude Code with Playwright MCP)
const { autoApplyLinkedInJobs } = require('./autoApplyLinkedInJobs.js');

// Basic usage - apply to 20 jobs
await autoApplyLinkedInJobs(page, { targetApplications: 20 });

// Advanced usage
await autoApplyLinkedInJobs(page, {
  startPage: 1,
  targetApplications: 50,
  maxPages: 30,
  searchKeywords: 'software engineer',
  location: 'United States',
  easyApplyOnly: true
});
```

### `applySingleJob.js`
Helper functions for single job application and job listing.

**Functions:**
- `applySingleJob(page, jobIndex)` - Apply to a single job
- `listJobs(page)` - List all jobs on current page

**Usage:**
```javascript
const { applySingleJob, listJobs } = require('./applySingleJob.js');

// Navigate to search page first
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');

// List available jobs
const jobs = await listJobs(page);
console.log(jobs);

// Apply to first job (index 0)
const result = await applySingleJob(page, 0);
console.log(result);
```

## Prerequisites

Before using these scripts:
1. Login to LinkedIn in your browser
2. Ensure your profile and resume are complete
3. Have Playwright MCP tools available in Claude Code

## Quick Start

### Method 1: Direct Code Execution
Copy the function code and paste directly into Claude Code's Playwright MCP code block.

### Method 2: Require/Import (if supported)
```javascript
// Load the script
const { autoApplyLinkedInJobs } = require('./skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js');

// Navigate to search page
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');

// Run automation
await autoApplyLinkedInJobs(page, { targetApplications: 20 });
```

## Configuration

Both scripts accept options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startPage` | number | 1 | Starting page number |
| `targetApplications` | number | 20 | Target successful applications |
| `maxPages` | number | 20 | Maximum pages to search |
| `searchKeywords` | string | 'software engineer' | Job search keywords |
| `location` | string | 'United States' | Job location |
| `easyApplyOnly` | boolean | true | Only apply to Easy Apply jobs |
| `delayMin` | number | 2000 | Minimum delay between applications (ms) |
| `delayMax` | number | 4000 | Maximum delay between applications (ms) |

## Returns

Both functions return result objects:

```javascript
{
  status: 'success' | 'failed' | 'skipped' | 'error',
  successful: 15,      // Number of successful applications
  failed: 2,           // Number of failed applications
  skipped: 10,         // Number of skipped (already applied)
  pages: [...]         // Per-page results
}
```

## Best Practices

1. **Test first**: Use `applySingleJob.js` to test with 1-2 jobs
2. **Start small**: Begin with `targetApplications: 10-20`
3. **Monitor**: Watch first few applications to ensure working correctly
4. **Use controls**: Press P to pause if needed
5. **Verify**: Check LinkedIn account after run
6. **Be cautious**: LinkedIn may flag excessive automation

## Troubleshooting

**Script not loading?**
- Copy/paste the function directly instead of using require()
- Playwright MCP may not support file system require()

**Application failing?**
- Verify you're logged in to LinkedIn
- Check for CAPTCHA or security challenges
- Test with single job first
- Increase delays between applications

**No jobs found?**
- Verify search URL is correct
- Check you're on the search results page
- Ensure Easy Apply filter is enabled (f_AL=true)

**Modal not closing?**
- LinkedIn may have changed the close button selector
- Check browser console for errors
- Try refreshing and restarting

## LinkedIn-Specific Notes

### Easy Apply
- This automation focuses on Easy Apply jobs only
- Some Easy Apply jobs may still require additional information
- The script will skip jobs that require more than basic submission

### Rate Limits
- LinkedIn may impose rate limits on automated actions
- Recommended: 20-50 applications per session
- Take breaks between sessions (several hours minimum)
- Be aware that excessive automation may result in account restrictions

### Security Challenges
- LinkedIn may present CAPTCHA if suspicious activity is detected
- The script cannot solve CAPTCHA automatically
- You'll need to solve manually if prompted

## License

MIT
