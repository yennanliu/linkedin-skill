# Changelog

All notable changes to the LinkedIn Auto-Apply skill will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]
## [1.0.3] - 2026-04-25

### Changed
- Auto-release from CI/CD pipeline
- All tests passed (unit + full-flow + install)

## [1.0.2] - 2026-04-24

### Changed
- Auto-release from CI/CD pipeline
- All tests passed (unit + full-flow + install)

## [1.0.1] - 2026-04-24

### Changed
- Auto-release from CI/CD pipeline
- All tests passed successfully


### Planned
- Enhanced multi-step Easy Apply handling
- CAPTCHA detection and notification
- Resume selection based on job type
- Results export to CSV/JSON
- Configuration presets

## [1.0.0] - 2026-02-27

### Added
- Initial release of LinkedIn Auto-Apply skill
- Easy Apply automation support
- Single job application mode for testing
- Batch automation with target-based execution
- Keyboard controls (Pause/Resume/Quit)
- On-page status indicator
- Smart job filtering (Easy Apply, already applied)
- Human-like random delays between applications
- Comprehensive error handling
- Multi-page job search automation
- Configurable search parameters (keywords, location)
- Real-time console logging
- Final statistics summary

### Features
- **Target-Based Execution**: Stops automatically after reaching target applications
- **Keyboard Controls**: P (Pause), R (Resume), Q (Quit)
- **Status Indicator**: Visual progress box on page
- **Easy Apply Focus**: Optimized for LinkedIn Easy Apply jobs
- **Multi-Step Handling**: Handles both simple and multi-step Easy Apply forms
- **Error Recovery**: Continues processing even when some jobs fail

### Documentation
- Complete SKILL.md with detailed usage instructions
- README.md with overview and installation
- QUICKSTART.md for new users
- USAGE_EXAMPLES.md with 21+ examples
- INSTALLATION.md with setup instructions
- CONTRIBUTING.md for contributors
- Script-level README.md for developers

### Scripts
- `autoApplyLinkedInJobs.js` - Main automation script
- `applySingleJob.js` - Helper functions for single job applications
- `install.sh` - Installation script

### Safety Features
- Skips already applied jobs
- Easy Apply only filter (configurable)
- Random delays to avoid detection
- Target-based stopping
- Graceful error handling
- Keyboard interrupt support

### Known Limitations
- Cannot handle CAPTCHA (manual intervention required)
- Cannot handle complex custom application forms
- May skip jobs requiring additional information
- Requires manual login
- LinkedIn may impose rate limits

## Version History

### Version Numbering

- **Major version** (1.x.x): Breaking changes or major feature additions
- **Minor version** (x.1.x): New features, backward compatible
- **Patch version** (x.x.1): Bug fixes, minor improvements

### Release Notes Format

Each release will include:
- **Added**: New features
- **Changed**: Changes in existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security updates

## Future Roadmap

### Version 1.1.0 (Planned)
- Enhanced CAPTCHA detection
- Multi-resume support
- Advanced filtering options
- Improved error messages

### Version 1.2.0 (Planned)
- Results export functionality
- Statistics dashboard
- Configuration presets
- Integration with job tracking tools

### Version 2.0.0 (Planned)
- ML-based job matching
- Smart application recommendations
- Advanced analytics
- Mobile support (if applicable)

## Maintenance

This project is actively maintained. Updates will be released as needed for:
- LinkedIn UI changes
- Bug fixes
- Feature enhancements
- Security updates

## Reporting Issues

If you encounter bugs or have suggestions:
1. Check existing issues on GitHub
2. Create a new issue with detailed information
3. Include version number and error logs

## Stay Updated

- Watch the GitHub repository for updates
- Check CHANGELOG.md for version changes
- Review release notes before updating

---

**Note**: LinkedIn may update their platform which could affect automation. This skill will be updated as needed to maintain compatibility.
