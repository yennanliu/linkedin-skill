# GitHub Copilot Instructions — LinkedIn Job Auto-Apply

This repository contains a LinkedIn job application automation skill for AI coding assistants.

## What This Skill Does

Automates LinkedIn Easy Apply job applications using Playwright browser automation. Key capabilities:
- Batch apply to N jobs and stop automatically when target is reached
- Keyboard controls during automation: **P** = Pause, **R** = Resume, **Q** = Quit
- Skips already-applied jobs and non-Easy-Apply listings
- Human-like random delays (2–4 s) between applications

## Script Files

| File | Purpose |
|------|---------|
| `skills/linkedin-job-auto-apply/applySingleJob.js` | `listJobs(page)` and `applySingleJob(page, index)` — for testing |
| `skills/linkedin-job-auto-apply/autoApplyLinkedInJobs.js` | `autoApplyLinkedInJobs(page, options)` — batch automation |

The JS functions run inside Playwright's `page.evaluate()` context (browser-side), not in Node.js directly.

## How to Use This Skill with Copilot

Ask Copilot Chat:
- "Help me apply to LinkedIn jobs automatically"
- "Show me how to use the LinkedIn auto-apply skill"
- "Apply to 20 software engineer jobs on LinkedIn"

Copilot will guide you to paste the appropriate JS function into a Playwright code block and run it.

## Quick Start

```javascript
// 1. Paste applySingleJob.js content, then test:
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
await page.waitForTimeout(3000);
const jobs = await listJobs(page);
const result = await applySingleJob(page, 0);

// 2. If test passes, run batch:
// Paste autoApplyLinkedInJobs.js content, then:
await autoApplyLinkedInJobs(page, { targetApplications: 20 });
```

## Prerequisites

- Logged into LinkedIn with complete profile and resume
- Playwright MCP tools available in your AI assistant
