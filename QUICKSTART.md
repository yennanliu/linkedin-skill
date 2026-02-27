# LinkedIn Auto-Apply Quick Start Guide

Get started with LinkedIn job automation in minutes.

## Prerequisites Checklist

Before you begin, make sure you have:

- [ ] LinkedIn account (with valid credentials)
- [ ] Complete LinkedIn profile with resume uploaded
- [ ] Claude Code installed and configured
- [ ] Playwright MCP tools set up in Claude Code
- [ ] Stable internet connection

## Installation (3 minutes)

### Option 1: Marketplace Installation (Recommended)

```bash
# Start Claude Code
claude

# Add the marketplace
/plugin marketplace add jerryliu/linkedin-skill

# Install the skill
/plugin install linkedin-job-auto-apply

# Verify
/plugin list
```

### Option 2: Quick Install Script

```bash
git clone https://github.com/jerryliu/linkedin-skill.git
cd linkedin-skill
chmod +x install.sh
./install.sh
```

## Your First Automation (5 minutes)

### Step 1: Test with a Single Job

1. Start Claude Code in your terminal:
```bash
claude
```

2. Invoke the skill:
```
/linkedin-job-auto-apply
```

3. Ask Claude to test with one job:
```
Test the LinkedIn automation by applying to a single software engineering job
```

4. Claude will:
   - Open LinkedIn job search
   - List available Easy Apply jobs
   - Apply to one job as a test
   - Show you the result

### Step 2: Run Batch Automation

Once the test works, try batch automation:

```
Apply to 20 software engineering jobs on LinkedIn with Easy Apply
```

Claude will:
- Set up the automation
- Apply to up to 20 Easy Apply jobs
- Show real-time progress
- Allow keyboard controls (P/R/Q)

## Common First-Time Scenarios

### Scenario 1: Remote Software Engineering Jobs
```
Apply to 25 remote software engineering jobs on LinkedIn in the United States
```

### Scenario 2: Specific Location
```
Apply to backend developer jobs in San Francisco Bay Area, target 30 applications
```

### Scenario 3: Conservative Approach
```
Apply to 10 data analyst jobs on LinkedIn with longer delays between applications
```

## Keyboard Controls

While automation is running:

- **P** - Pause automation
- **R** - Resume automation
- **Q** - Quit gracefully

## Monitoring Progress

The automation provides:

1. **Console Output**: Real-time logs of each application
2. **On-Page Indicator**: Visual progress box showing:
   - Current page number
   - Jobs processed
   - Applications submitted

3. **Final Summary**: Statistics showing:
   - Total processed
   - Successful applications
   - Skipped jobs
   - Failed attempts

## Quick Configuration

Customize your automation:

```javascript
// In Claude Code, ask:
Apply to LinkedIn jobs with these settings:
- Target: 50 applications
- Keywords: "full stack developer"
- Location: "Seattle, WA"
- Max pages: 25
```

## Troubleshooting First Run

### Issue: "Easy Apply button not found"
**Fix**: Make sure you're logged into LinkedIn

### Issue: "No jobs found"
**Fix**: Verify the Easy Apply filter is enabled in your search

### Issue: CAPTCHA appears
**Fix**: Solve it manually, then try again later with fewer applications

### Issue: Applications failing
**Fix**:
1. Check internet connection
2. Verify profile is complete
3. Try with just 5 applications first

## Next Steps

Once you're comfortable:

1. **Read Full Documentation**: Check [SKILL.md](./SKILL.md) for advanced features
2. **Review Usage Examples**: See [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for more scenarios
3. **Customize Settings**: Adjust delays, targets, and filters
4. **Monitor Results**: Check your LinkedIn account for application confirmations

## Safety Tips for Beginners

1. **Start Small**: First session, do only 10-20 applications
2. **Test First**: Always test with 1-2 jobs before batch processing
3. **Monitor Closely**: Watch the first few applications
4. **Take Breaks**: Wait several hours between automation sessions
5. **Review Applications**: Check LinkedIn to verify successful applications

## Getting Help

If you encounter issues:

1. Check [Troubleshooting Section](./README.md#troubleshooting)
2. Review [Script Documentation](./skills/linkedin-job-auto-apply/README.md)
3. Test with single job application first
4. Verify LinkedIn account status

## Quick Reference

| Action | Command |
|--------|---------|
| Install skill | `/plugin install linkedin-job-auto-apply` |
| Use skill | `/linkedin-job-auto-apply` |
| Test single job | Ask Claude to "apply to one LinkedIn job as test" |
| Batch apply | Ask Claude to "apply to N jobs on LinkedIn" |
| Pause | Press **P** during automation |
| Resume | Press **R** after pausing |
| Quit | Press **Q** to exit gracefully |

---

**Ready to start?** Open Claude Code and type `/linkedin-job-auto-apply` to begin!
