# LinkedIn Job Auto-Apply Skill for Claude Code

A Claude Code skill for automating job applications on LinkedIn using Playwright MCP tools.

[![GitHub](https://img.shields.io/badge/GitHub-Repository-black?style=for-the-badge&logo=github)](https://github.com/jerryliu/linkedin-skill)

🌐 **[Visit Repository](https://github.com/jerryliu/linkedin-skill)** | 📚 **[Documentation](https://github.com/jerryliu/linkedin-skill/blob/main/SKILL.md)** | 🚀 **[Quick Start](https://github.com/jerryliu/linkedin-skill/blob/main/QUICKSTART.md)**

## Overview

This skill enables automated job applications on LinkedIn using Easy Apply. It supports:
- Easy Apply job automation
- Single job applications for testing
- Batch processing multiple jobs
- Multi-page automation
- Smart filtering (skips already applied jobs)
- Target-based execution with keyboard controls
- Configurable delays and safety features

## Key Features

- **Easy Apply Focus**: Optimized for LinkedIn's Easy Apply feature
- **Target-Based**: Stop automatically after N successful applications
- **Keyboard Controls**: Pause (P), Resume (R), Quit (Q) anytime
- **On-Page Status**: Visual progress indicator
- **Smart Filtering**: Skip already applied and non-Easy Apply jobs
- **Human-Like Delays**: Random delays to avoid detection
- **Comprehensive Error Handling**: Continues even when some jobs fail

## Installation

### Option 1: Claude Code Marketplace (Recommended)

Install directly from GitHub marketplace in Claude Code:

```bash
claude

# Add to marketplace
/plugin marketplace add jerryliu/linkedin-skill

# Install the skill
/plugin install linkedin-job-auto-apply

# Verify installation
/plugin list

# Use the skill
/linkedin-job-auto-apply
```

### Option 2: Quick Install Script

Run the installation script:

```bash
git clone https://github.com/jerryliu/linkedin-skill.git
cd linkedin-skill
./install.sh
```

This copies the skill to `~/.claude/skills/linkedin-job-auto-apply/`

### Option 3: Local Development

For local development and testing:

```bash
claude

# Add local marketplace
/plugin marketplace add /path/to/linkedin-skill

# Install from local source
/plugin install linkedin-job-auto-apply@local

# Or reference directly in project CLAUDE.md
```

In your project's `CLAUDE.md`:
```markdown
# Project Skills

Load the LinkedIn job automation skill:
@skill /path/to/linkedin-skill/SKILL.md
```

## Prerequisites

Before using this skill, ensure:
- You have a LinkedIn account and are logged in
- Your profile and resume are complete and up-to-date
- Playwright MCP tools are configured in Claude Code
- You have a stable internet connection

## Quick Start

### Using the Skill in Claude Code

1. Start Claude Code in your terminal
2. Invoke the skill:
```
/linkedin-job-auto-apply
```

3. Claude will guide you through:
   - Choosing between single job or batch automation
   - Configuring search parameters (keywords, location)
   - Setting up delays and safety features

### Manual Invocation

You can also ask Claude directly:
```
Help me apply to software engineering jobs on LinkedIn
```

Claude will recognize the task and offer to use this skill.

## Usage Examples

### Example 1: Test with Single Job
```
Use the LinkedIn job automation skill to apply to a single software engineering job as a test
```

### Example 2: Batch Apply to Remote Jobs
```
Use the LinkedIn skill to apply to remote software engineering jobs in United States,
process 3 pages with Easy Apply only
```

### Example 3: Targeted Job Search
```
Apply to backend developer positions on LinkedIn in San Francisco Bay Area,
target 25 applications, Easy Apply only
```

## Configuration

The skill supports these configuration options:

| Option | Default | Description |
|--------|---------|-------------|
| `startPage` | 1 | Starting page number |
| `targetApplications` | 20 | Target number of successful applications |
| `maxPages` | 20 | Maximum pages to process |
| `searchKeywords` | 'software engineer' | Job search keywords |
| `location` | 'United States' | Job location |
| `easyApplyOnly` | true | Only apply to Easy Apply jobs |
| `delayMin` | 2000 | Minimum delay between jobs (ms) |
| `delayMax` | 4000 | Maximum delay between jobs (ms) |

## Safety Features

- Automatically skips already applied jobs
- Focuses on Easy Apply jobs only (configurable)
- Random delays between applications (2-4 seconds default)
- Error handling for each job application
- Target-based stopping to prevent runaway execution
- Keyboard controls for manual intervention
- Detailed logging for monitoring progress

## Limitations

- **Easy Apply only**: Cannot handle complex applications requiring cover letters or assessments
- **Cannot solve CAPTCHA**: Must be solved manually if encountered
- **Cannot handle custom questions**: May skip jobs with additional required questions
- **Requires manual login**: Must be logged in before starting
- **Browser must remain open**: During execution
- **Rate limits**: LinkedIn may impose rate limits on automated actions

## Troubleshooting

### Common Issues

**Easy Apply button not found**
- Solution: Ensure you're logged in and Easy Apply filter is enabled

**Applications failing**
- Solutions:
  - Check internet connection
  - Verify account status (check for security challenges)
  - Increase delays between jobs
  - Test with single job first

**CAPTCHA or security challenges**
- Solution: LinkedIn has detected automation, solve manually and try again later

**Script stops unexpectedly**
- Solutions:
  - Check console for errors
  - Verify page structure hasn't changed
  - Try reducing maxPages value
  - Resume from last successful page

## Best Practices

1. **Start Small**: Test with 1-2 jobs before batch processing
2. **Verify Settings**: Confirm profile and resume are complete
3. **Monitor Execution**: Watch the first few applications
4. **Be Selective**: Only apply to genuinely suitable positions
5. **Respect Limits**: Maximum 20-50 jobs per session recommended
6. **Take Breaks**: Don't run continuous sessions, wait several hours between runs
7. **Review Applications**: Check your LinkedIn account after automation

## Legal & Ethical Usage

This tool is for **educational and personal productivity purposes only**.

**Important Warnings:**
- Only apply to jobs you're genuinely interested in and qualified for
- Do not spam applications
- Respect LinkedIn's Terms of Service
- Be aware that excessive automation may result in account restrictions
- LinkedIn may flag automated behavior and require verification
- Use responsibly and ethically

## Technical Details

### How It Works

1. Navigates to LinkedIn job search results with Easy Apply filter
2. Extracts job listings from the page
3. For each job:
   - Checks if already applied
   - Verifies Easy Apply availability
   - Clicks Easy Apply button
   - Handles single-step or multi-step application modal
   - Submits application
   - Verifies success message
   - Closes modal
4. Moves to next page and repeats until target reached

### Dependencies

- Playwright MCP tools (browser automation)
- LinkedIn account with valid session

### LinkedIn-Specific Implementation

- Uses LinkedIn's ARIA labels for accessibility-based selectors
- Handles LinkedIn's modal-based Easy Apply flow
- Manages LinkedIn's dynamic content loading
- Adapts to single-step and multi-step applications

### Reference Implementation

See the `SKILL.md` file for complete implementation details and code examples.

## Contributing

To improve this skill:
1. Test with different job types and scenarios
2. Report issues or edge cases
3. Suggest enhancements for better safety or efficiency
4. Submit pull requests with improvements

## License

MIT - This skill is for personal use. Please respect LinkedIn's Terms of Service.

## Support

For issues or questions:
1. Check the troubleshooting section in SKILL.md
2. Review the script documentation in skills/linkedin-job-auto-apply/README.md
3. Test with single job applications first
4. Check for LinkedIn security challenges or rate limits

## Acknowledgments

Inspired by the [104Skill](https://github.com/yennanliu/104Skill) project for job automation patterns.

---

**Remember**: Quality over quantity. Apply thoughtfully to positions that genuinely match your skills and interests. Be aware that LinkedIn actively monitors for automated behavior and may restrict accounts that violate their terms of service.
