# LinkedIn Job Auto-Apply Scripts

This directory contains the automation scripts for LinkedIn job applications.

## Files

### `autoApplyLinkedInJobs.js`
Main automation script with target-based execution, improved filter handling, and questionnaire support.

**Enhanced Features:**
- **Explicit Filter Activation**: Automatically opens "All filters" and toggles "Easy Apply" if no jobs are initially found.
- **Robust Detection**: Uses multiple selector strategies and text-based matching for "Easy Apply", "Submit", and "Next" buttons.
- **Questionnaire Support**: Fills common form fields (years of experience, phone number, dropdowns, radio buttons) with sensible default values to prevent skipping.
- **Target-based stopping**: Stops exactly when the desired number of successful applications is reached.
- **Keyboard controls**: P=Pause, R=Resume, Q=Quit.
- **Status indicator**: Real-time on-page progress overlay.

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
  location: 'United States'
});
```

### `applySingleJob.js`
Helper functions for single job application and job listing.

**Functions:**
- `applySingleJob(page, jobIndex)` - Apply to a single job
- `listJobs(page)` - List all jobs on current page

## Prerequisites

Before using these scripts:
1. Login to LinkedIn in your browser
2. Ensure your profile and resume are complete
3. Have Playwright MCP tools available

## Configuration

Both scripts accept options:

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startPage` | number | 1 | Starting page number |
| `targetApplications` | number | 20 | Target successful applications |
| `maxPages` | number | 20 | Maximum pages to search |
| `searchKeywords` | string | 'software engineer' | Job search keywords |
| `location` | string | 'United States' | Job location |
| `delayMin` | number | 3000 | Minimum delay between applications (ms) |
| `delayMax` | number | 5000 | Maximum delay between applications (ms) |

## Troubleshooting

**No jobs found?**
- The script now automatically attempts to toggle the "Easy Apply" filter if it detects it's missing.
- Ensure you are logged in and the page has finished its initial load.

**Stuck in modal?**
- Some jobs require complex information or custom questions the script cannot handle. 
- The script will attempt to fill basic fields but will gracefully skip and close the modal if it remains stuck after 10 steps.

**Rate Limits**
- LinkedIn may impose rate limits. It is recommended to apply to 20-50 jobs per session and take several hours break between sessions.

## License

MIT
