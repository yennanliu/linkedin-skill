# Contributing to LinkedIn Auto-Apply Skill

Thank you for your interest in contributing to the LinkedIn Auto-Apply skill! This document provides guidelines for contributing.

## How to Contribute

### Reporting Issues

If you encounter bugs or issues:

1. **Check existing issues** first to avoid duplicates
2. **Provide detailed information**:
   - Your environment (OS, Claude Code version, browser)
   - Steps to reproduce the issue
   - Expected vs actual behavior
   - Error messages or logs
   - Screenshots if applicable

### Suggesting Enhancements

Have ideas for improvements?

1. **Check existing feature requests** first
2. **Describe your suggestion**:
   - What problem does it solve?
   - How would it work?
   - Any implementation ideas?

### Code Contributions

#### Before You Start

1. **Discuss major changes**: Open an issue first for significant modifications
2. **Check compatibility**: Ensure changes work with Claude Code and Playwright MCP
3. **Test thoroughly**: Test with various job types and scenarios

#### Development Setup

1. **Fork the repository**
2. **Clone your fork**:
   ```bash
   git clone https://github.com/YOUR-USERNAME/linkedin-skill.git
   cd linkedin-skill
   ```

3. **Create a branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Install locally**:
   ```bash
   ./install.sh
   ```

#### Making Changes

1. **Code Style**:
   - Use clear, descriptive variable names
   - Add comments for complex logic
   - Follow existing code patterns
   - Keep functions focused and modular

2. **Testing**:
   - Test with single job application first
   - Test with batch automation (5-10 jobs)
   - Test pause/resume/quit controls
   - Verify error handling
   - Check across different job types

3. **Documentation**:
   - Update README.md if adding features
   - Update SKILL.md with new usage patterns
   - Add examples to USAGE_EXAMPLES.md
   - Update CHANGELOG.md

#### Submitting Changes

1. **Commit your changes**:
   ```bash
   git add .
   git commit -m "feat: add your feature description"
   ```

   Use conventional commit messages:
   - `feat:` - New feature
   - `fix:` - Bug fix
   - `docs:` - Documentation changes
   - `refactor:` - Code refactoring
   - `test:` - Testing improvements
   - `chore:` - Maintenance tasks

2. **Push to your fork**:
   ```bash
   git push origin feature/your-feature-name
   ```

3. **Create a Pull Request**:
   - Provide clear description of changes
   - Reference related issues
   - Explain testing performed
   - Include screenshots if applicable

## Areas for Contribution

### High Priority

1. **Improved Selectors**:
   - LinkedIn frequently updates their UI
   - More robust CSS/ARIA selectors needed
   - Fallback selector strategies

2. **Enhanced Error Handling**:
   - Better detection of application failures
   - More informative error messages
   - Automatic retry logic

3. **CAPTCHA Detection**:
   - Early detection of CAPTCHA challenges
   - Graceful handling and user notification

4. **Multi-Step Application Handling**:
   - Better support for complex Easy Apply forms
   - Handling of custom questions
   - File upload automation

### Medium Priority

1. **Configuration Presets**:
   - Save and load configuration profiles
   - Job type-specific settings
   - Industry-specific templates

2. **Results Tracking**:
   - Better logging of applications
   - Export results to CSV/JSON
   - Application success tracking

3. **Advanced Filtering**:
   - Filter by salary range
   - Filter by company size
   - Filter by job posting date

4. **Resume Customization**:
   - Switch between multiple resumes
   - Resume selection based on job type

### Nice to Have

1. **Statistics Dashboard**:
   - Visual representation of applications
   - Success rate tracking
   - Response rate monitoring

2. **Integration Features**:
   - Export to job tracking tools
   - Notification systems
   - Calendar integration for follow-ups

3. **Smart Application**:
   - ML-based job matching
   - Automatic keyword optimization
   - Application quality scoring

## Testing Guidelines

### Manual Testing Checklist

Before submitting a PR, test:

- [ ] Single job application works
- [ ] Batch automation works (test with 5 jobs)
- [ ] Keyboard controls (P/R/Q) work correctly
- [ ] Status indicator updates properly
- [ ] Error handling works (test with edge cases)
- [ ] Already-applied detection works
- [ ] Easy Apply filter works correctly
- [ ] Page navigation works
- [ ] Target-based stopping works
- [ ] Graceful exit on quit (Q)

### Edge Cases to Test

- Jobs already applied to
- Jobs without Easy Apply
- Multi-step Easy Apply forms
- Jobs requiring additional information
- Network interruptions
- Page load failures
- Modal not opening
- Submit button not found

## Code Review Process

Pull requests will be reviewed for:

1. **Functionality**: Does it work as intended?
2. **Code Quality**: Is it readable and maintainable?
3. **Testing**: Has it been thoroughly tested?
4. **Documentation**: Are changes documented?
5. **Compatibility**: Works with Claude Code and Playwright MCP?
6. **Safety**: No security vulnerabilities or risky patterns?

## Community Guidelines

1. **Be Respectful**: Treat all contributors with respect
2. **Be Constructive**: Provide helpful feedback
3. **Be Patient**: Maintainers review PRs as time allows
4. **Be Ethical**: Promote responsible use of automation

## Legal and Ethical Considerations

### Important Reminders

1. **Respect LinkedIn Terms of Service**:
   - This tool should be used responsibly
   - Don't spam applications
   - Only apply to genuinely suitable positions

2. **No Malicious Features**:
   - Don't add features that bypass security
   - Don't add features that deceive platforms
   - Don't add features for mass spamming

3. **User Responsibility**:
   - Users are responsible for their actions
   - This tool is for personal productivity only
   - Not for commercial use without proper licensing

## Questions?

- **General questions**: Open a GitHub Discussion
- **Bug reports**: Open a GitHub Issue
- **Feature requests**: Open a GitHub Issue
- **Security concerns**: Email maintainers directly

## Recognition

Contributors will be recognized in:
- README.md acknowledgments section
- CHANGELOG.md for their contributions
- GitHub contributors list

Thank you for helping improve the LinkedIn Auto-Apply skill! 🎉
