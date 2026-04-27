---
name: linkedin-job-auto-apply
description: Automate job applications on LinkedIn using Playwright MCP tools. Features Easy Apply support, target-based stopping, keyboard controls (P/R/Q), on-page status indicator, and proven automation patterns.
---

# LinkedIn Job Application Automation Skill

This skill enables automated job applications on LinkedIn using Playwright MCP browser automation tools with intelligent target-based execution and real-time keyboard controls.

## Specialized Agents

This skill is backed by three specialist agents. Invoke them for deeper help:

| Agent | File | When to Use |
|-------|------|-------------|
| **Automation Agent** | [`skills/agents/automation-agent/SKILL.md`](../agents/automation-agent/SKILL.md) | Timing, retry logic, rate limiting, anti-detection |
| **Web Structure Agent** | [`skills/agents/web-structure-agent/SKILL.md`](../agents/web-structure-agent/SKILL.md) | Broken selectors, LinkedIn DOM changes, lazy loading |
| **QA Agent** | [`skills/agents/qa-agent/SKILL.md`](../agents/qa-agent/SKILL.md) | Verify submissions, validate results, session reports |

### Recommended Run Order

```
1. QA Agent      → preFlightCheck(page)          # verify session is healthy
2. [run automation]
3. QA Agent      → verifyApplicationSuccess()    # after each submit
4. QA Agent      → generateReport()              # end-of-session summary
```

If issues arise mid-run:
- Selectors return 0 results → invoke **Web Structure Agent**
- High failure rate / detected → invoke **Automation Agent**
- Unsure if applications went through → invoke **QA Agent**

## When to Use This Skill

Use this skill when:
- **Daily job hunting**: Apply to Easy Apply jobs automatically
- **Target-based applications**: Stop exactly when you reach N applications
- **Efficient batch processing**: Apply from search results
- **Controlled automation**: Need pause/resume/quit controls during execution
- **Scale applications**: Apply to dozens or hundreds of jobs efficiently
- **Resume from interruption**: Continue from specific page after breaks

## Script Files

This skill includes ready-to-use JavaScript files:

- **[`autoApplyLinkedInJobs.js`](./autoApplyLinkedInJobs.js)** - Main automation with target-based execution and keyboard controls
- **[`applySingleJob.js`](./applySingleJob.js)** - Helper functions for single job application and listing
- **[`README.md`](./README.md)** - Script documentation and usage guide

Simply copy/paste the functions into your Playwright MCP code block to use them.

## Prerequisites

Before using this skill, ensure:
- User is logged in to their LinkedIn account
- Resume is uploaded to LinkedIn
- Profile is complete and up-to-date
- Playwright MCP tools are available
- Stable internet connection

## Installation

### Claude Code Marketplace (Recommended)

```bash
claude

# Add to marketplace
/plugin marketplace add jerryliu/linkedin-skill

# Install the skill
/plugin install linkedin-job-auto-apply

# Use the skill
/linkedin-job-auto-apply
```

### Local Development

For testing local modifications:

```bash
# Add local marketplace
/plugin marketplace add /path/to/linkedin-skill

# Install from local source
/plugin install linkedin-job-auto-apply@local
```

## Usage Modes

### Mode 1: Single Job Application (Manual Testing)

Use this for testing or applying to one job at a time. Perfect for verifying the automation works before running batch jobs.

**Implementation:**

Helper functions are available in [`applySingleJob.js`](./applySingleJob.js).

**Quick Usage:**
```javascript
// Copy/paste the functions from applySingleJob.js, then:

// Step 1: Navigate to search page
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&location=United%20States&f_AL=true');
await page.waitForTimeout(3000);

// Step 2: List available Easy Apply jobs
const jobs = await listJobs(page);
console.log('Available Easy Apply jobs:', jobs);
// Output: [{ index: 0, title: "Software Engineer", company: "...", hasEasyApply: true }, ...]

// Step 3: Apply to first job (index 0)
const result = await applySingleJob(page, 0);
console.log(result);
// Output: { status: 'success', job: {...}, finalUrl: '...' }

// Step 4: Apply to another job (index 2)
const result2 = await applySingleJob(page, 2);
```

**Returns:**
```javascript
{
  status: 'success' | 'failed' | 'skipped' | 'error',
  job: {
    title: "Software Engineer",
    company: "Tech Company",
    location: "San Francisco, CA",
    hasEasyApply: true
  },
  finalUrl: "https://www.linkedin.com/jobs/..."
}
```

> **💡 Tip**: Always test with Mode 1 (single job) before running batch automation to verify the flow works correctly.

### Mode 2: Target-Based Automation with Keyboard Controls

Use this for applying to jobs with **real-time keyboard controls** and **target-based stopping**.

**Features:**
- Press **P** to PAUSE automation
- Press **R** to RESUME automation
- Press **Q** to QUIT automation
- Stops automatically when target number of applications is reached
- On-page status indicator showing progress
- Efficient Easy Apply automation

**Configuration:**
```javascript
const options = {
  startPage: 1,               // Starting page number
  targetApplications: 20,     // Target number of successful applications
  maxPages: 20,              // Maximum number of pages to search
  searchKeywords: 'software engineer',  // Job search keywords
  location: 'United States',  // Job location
  easyApplyOnly: true        // Only apply to Easy Apply jobs
};
```

**Implementation:**

The complete automation function is available in [`autoApplyLinkedInJobs.js`](./autoApplyLinkedInJobs.js).

**Quick Usage:**
```javascript
// Copy/paste the function from autoApplyLinkedInJobs.js, then run:

// Basic: Apply to 20 Easy Apply jobs
await autoApplyLinkedInJobs(page, { targetApplications: 20 });

// Advanced: Custom configuration
await autoApplyLinkedInJobs(page, {
  startPage: 1,              // Start from page 1
  targetApplications: 50,    // Target 50 applications
  maxPages: 30,              // Search up to 30 pages
  searchKeywords: 'backend developer',
  location: 'San Francisco Bay Area',
  easyApplyOnly: true
});

// While running, use keyboard controls:
// - Press P to pause
// - Press R to resume
// - Press Q to quit gracefully
```

**Returns:**
```javascript
{
  successful: 15,     // Number of successful applications
  failed: 2,          // Number of failed applications
  skipped: 10,        // Number of skipped (already applied)
  pages: [            // Per-page details
    { pageNumber: 1, successful: 8, failed: 1, skipped: 5 },
    { pageNumber: 2, successful: 7, failed: 1, skipped: 5 }
  ]
}
```

> **💡 Tip**: For full implementation details, see [`autoApplyLinkedInJobs.js`](./autoApplyLinkedInJobs.js). The script includes comprehensive error handling, keyboard controls, and status indicator setup.

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `startPage` | number | 1 | Starting page number for job search |
| `targetApplications` | number | 20 | Target number of successful applications (stops when reached) |
| `maxPages` | number | 20 | Maximum number of pages to search |
| `searchKeywords` | string | 'software engineer' | Job search keywords |
| `location` | string | 'United States' | Job location |
| `easyApplyOnly` | boolean | true | Only apply to Easy Apply jobs |
| `delayMin` | number | 2000 | Minimum delay between applications (ms) |
| `delayMax` | number | 4000 | Maximum delay between applications (ms) |

## Key Features

### ✨ Easy Apply Support
- Focuses on LinkedIn's Easy Apply feature
- Automatically handles simple application flows
- Skips complex applications requiring additional steps

### ✨ Target-Based Execution
- Stops automatically when target number of successful applications is reached
- Precise control - won't waste time processing unnecessary jobs
- Example: Target 20 applications = exactly 20 successful submissions

### ⌨️ Real-Time Keyboard Controls
- **P** = Pause automation (take a break, check results)
- **R** = Resume automation (continue from where you paused)
- **Q** = Quit automation (graceful exit with results summary)

### 📊 On-Page Status Indicator
- Always visible progress box on page
- Shows: Current progress (e.g., "Applications: 5/20")
- Color-coded: Green (running), Orange (paused), Blue (completed)

### 🎯 Smart Filtering
- **Skip already applied jobs**: Detects jobs already applied to
- **Easy Apply detection**: Only processes Easy Apply jobs (configurable)
- **Human-like delays**: 2-4 seconds between applications (avoids detection)
- **Robust error handling**: Continues on failures

## Safety Features

- **Skip already applied jobs**: Saves time and avoids duplicate applications
- **Easy Apply filtering**: Focus on simple, one-click applications
- **Human-like random delays**: 2-4 seconds between applications (avoids detection)
- **Graceful error handling**: One failure doesn't stop the entire process
- **Tab cleanup**: Always closes application tabs, even on errors
- **Target-based stopping**: Prevents runaway execution
- **Real-time monitoring**: Detailed console output and on-page status
- **Keyboard interrupt**: Press Q anytime to gracefully quit

## Technical Implementation Details

### Critical Selectors (LinkedIn-Specific)

```javascript
// Easy Apply button
'button[aria-label*="Easy Apply"]'
'button:has-text("Easy Apply")'

// Job cards
'.job-card-container'
'.jobs-search-results__list-item'

// Already applied indicator
'text=Applied'
'.job-card-container__footer-item'

// Submit button in Easy Apply modal
'button[aria-label="Submit application"]'
'button:has-text("Submit")'

// Next button in multi-step Easy Apply
'button[aria-label="Continue to next step"]'
'button:has-text("Next")'
```

### Application Flow Pattern

1. **Stay on search results page** - Process jobs from list
2. **Check for Easy Apply badge** - Filter for Easy Apply jobs only
3. **Check for already-applied** - Look for "Applied" indicator (fast skip)
4. **Click Easy Apply button** - Opens modal (not new tab)
5. **Handle application modal** - May be single-step or multi-step
6. **Submit application** - Click Submit button
7. **Verify success** - Check for confirmation message
8. **Close modal** - Return to search results

### Timing Strategy (Optimized)

```javascript
// After navigation
await page.waitForTimeout(3000);  // Let page and jobs load

// After clicking Easy Apply
await page.waitForTimeout(2000);  // Let modal open

// After each form step
await page.waitForTimeout(1500);  // Let next step load

// After submit
await page.waitForTimeout(2500);  // Let confirmation show

// Between jobs (human-like)
const delay = 2000 + Math.random() * 2000;  // 2-4 seconds random
```

### Success Verification

```javascript
// ✅ RELIABLE - Check for confirmation message
const successIndicator = await page.locator('text=Application sent').isVisible();
if (successIndicator) {
  // Confirmed success
}

// ✅ RELIABLE - Check modal is closed
const modalClosed = await page.locator('[role="dialog"]').count() === 0;
```

## Limitations

- **Easy Apply only**: Cannot handle complex applications requiring cover letters, assessments, or multi-page forms
- **Cannot handle CAPTCHA**: Must be solved manually if encountered
- **Cannot handle custom questions**: May skip jobs with additional required questions
- **Requires browser open**: Browser must stay open during execution
- **User must be logged in**: Must be logged in before starting
- **Rate limits**: LinkedIn may impose rate limits on automated actions

## Troubleshooting

### Problem: "Easy Apply button not found"
**Solution**: Verify user is logged in and ensure you're filtering for Easy Apply jobs only

### Problem: Applications failing
**Solutions**:
1. Check internet connection
2. Verify account status (LinkedIn may flag automated behavior)
3. Increase delays between jobs
4. Test with manual single job application first
5. Check for CAPTCHA or security challenges

### Problem: Script stops unexpectedly
**Solutions**:
1. Check console for errors
2. Verify page structure hasn't changed
3. Try reducing maxPages value
4. Resume from last successful page
5. Check for LinkedIn security measures

### Problem: "Already applied" not detected
**Solution**: LinkedIn may have changed the indicator text or structure - verify the selector

## Best Practices

### Before Running
- Test with 1-2 jobs manually first
- Verify resume and profile are complete
- Check search criteria match your skills
- Ensure stable internet connection
- Review LinkedIn's acceptable use policies

### During Execution
- Monitor first few applications
- Be ready to stop if errors occur
- Don't interfere with browser while running
- Watch for CAPTCHA or security challenges

### After Completion
- Verify successful applications in LinkedIn account
- Check email for confirmation/interview invites
- Review any failed applications
- Take breaks between automation sessions

## Legal & Ethical Usage

**Important**: This tool is for educational and personal productivity purposes only.

- Only apply to jobs you're genuinely interested in and qualified for
- Do not spam applications
- Respect rate limits and server load
- Use responsibly and in accordance with LinkedIn Terms of Service
- Recommended maximum: 20-50 jobs per session
- Take breaks between sessions (several hours minimum)
- Be aware that excessive automation may result in account restrictions

## Example Workflows

### Workflow 1: Quick Daily Job Hunt (Recommended)
Apply to 20 Easy Apply jobs starting from page 1, with keyboard controls available.
```javascript
// Most common use case - apply to 20 jobs
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,
  searchKeywords: 'software engineer',
  location: 'United States'
});

// While running:
// - Press P to pause (take a break)
// - Press R to resume
// - Press Q to quit gracefully
```

### Workflow 2: Targeted Job Search
Target specific job types and locations.
```javascript
// Backend developer positions in Bay Area
await autoApplyLinkedInJobs(page, {
  targetApplications: 30,
  maxPages: 20,
  searchKeywords: 'backend developer python',
  location: 'San Francisco Bay Area',
  easyApplyOnly: true
});
```

### Workflow 3: Resume from Specific Page
If you've already processed pages 1-5, start from page 6.
```javascript
// Continue from page 6
await autoApplyLinkedInJobs(page, {
  startPage: 6,
  targetApplications: 20,
  maxPages: 15
});
```

### Workflow 4: Conservative Approach
Use longer delays to be more cautious.
```javascript
// Slower, more conservative automation
await autoApplyLinkedInJobs(page, {
  targetApplications: 15,
  delayMin: 4000,  // 4 seconds minimum
  delayMax: 7000   // 7 seconds maximum
});
```

### Workflow 5: Testing with Single Job
Test the automation with Mode 1 (single job) first before batch processing.
```javascript
// Navigate to search page
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
await page.waitForTimeout(3000);

// List available jobs
const jobs = await listJobs(page);
console.log(`Found ${jobs.length} Easy Apply jobs`);

// Apply to first job (index 0) using Mode 1
const result = await applySingleJob(page, 0);
console.log('Test result:', result);

// If successful, run batch automation
if (result.status === 'success') {
  await autoApplyLinkedInJobs(page, { targetApplications: 20 });
}
```

## Technical Notes

### Browser Automation
- Uses Playwright MCP tools for browser control
- Handles modal management (opening/closing Easy Apply modals)
- Implements wait times for page loads and DOM updates

### Job Detection
- Identifies Easy Apply jobs using LinkedIn-specific selectors
- Filters out already applied jobs
- Excludes non-Easy Apply positions (if configured)

### Application Flow
1. Navigate to LinkedIn job search results
2. Extract Easy Apply job listings
3. For each job:
   - Check if already applied
   - Click Easy Apply button
   - Wait for modal to open
   - Handle single-step or multi-step application
   - Submit application
   - Verify success message
   - Close modal
4. Move to next page and repeat

### Error Recovery
- Try-catch blocks around each job application
- Continues to next job if one fails
- Cleans up modals even on errors
- Provides detailed error messages

## What Makes This Skill Different?

This skill is specifically designed for LinkedIn's unique application system:

### Key Improvements

1. **Easy Apply Focus** ⭐
   - Optimized for LinkedIn's Easy Apply feature
   - Handles single-click applications efficiently
   - Skips complex multi-step applications

2. **Modal Management** ⭐
   - LinkedIn uses modals, not new tabs
   - Proper modal handling and cleanup
   - Works with both simple and multi-step modals

3. **Smart Job Filtering** ⭐
   - Detects Easy Apply badge before clicking
   - Identifies already-applied jobs
   - Filters by location, keywords, etc.

4. **LinkedIn-Specific Selectors** ⭐
   - Uses LinkedIn's ARIA labels and semantic HTML
   - Adapts to LinkedIn's dynamic content loading
   - Handles LinkedIn's infinite scroll

5. **Keyboard Controls** ⭐
   - Pause/Resume/Quit anytime with P/R/Q keys
   - Full control during automation
   - Safe interruption mechanism

6. **Target-Based Execution** ⭐
   - Stop exactly when you reach your target
   - No wasted time
   - Precise control

---

**Remember**: Use this skill responsibly for genuine job applications to suitable positions. Quality matters more than quantity. Be aware of LinkedIn's terms of service and use automation sparingly to avoid account restrictions.
