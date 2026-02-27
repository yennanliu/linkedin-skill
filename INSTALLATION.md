# Installation Guide

Complete installation instructions for the LinkedIn Auto-Apply skill.

## Prerequisites

Before installing, ensure you have:

1. **Claude Code installed**
   - Download from: https://claude.ai/code
   - Verify installation: `claude --version`

2. **Playwright MCP tools configured**
   - Should be set up in Claude Code
   - Test by starting Claude and checking available tools

3. **LinkedIn account**
   - Active LinkedIn account
   - Complete profile with resume uploaded
   - Valid login credentials

4. **System requirements**
   - macOS, Linux, or Windows
   - Stable internet connection
   - Modern web browser

## Installation Methods

### Method 1: Claude Code Marketplace (Recommended)

This is the easiest and recommended installation method.

1. **Start Claude Code**:
   ```bash
   claude
   ```

2. **Add the marketplace** (if not already added):
   ```bash
   /plugin marketplace add jerryliu/linkedin-skill
   ```

3. **Install the skill**:
   ```bash
   /plugin install linkedin-job-auto-apply
   ```

4. **Verify installation**:
   ```bash
   /plugin list
   ```

   You should see `linkedin-job-auto-apply` in the list.

5. **Test the skill**:
   ```bash
   /linkedin-job-auto-apply
   ```

---

### Method 2: Quick Install Script

Use the automated installation script.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jerryliu/linkedin-skill.git
   cd linkedin-skill
   ```

2. **Run the install script**:
   ```bash
   chmod +x install.sh
   ./install.sh
   ```

3. **Start Claude Code**:
   ```bash
   claude
   ```

4. **Use the skill**:
   ```bash
   /linkedin-job-auto-apply
   ```

**What the script does:**
- Creates `~/.claude/skills/linkedin-job-auto-apply/` directory
- Copies all skill files
- Verifies installation
- Shows next steps

---

### Method 3: Manual Installation

For advanced users or custom setups.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jerryliu/linkedin-skill.git
   cd linkedin-skill
   ```

2. **Create skills directory** (if not exists):
   ```bash
   mkdir -p ~/.claude/skills
   ```

3. **Copy skill files**:
   ```bash
   cp -r skills/linkedin-job-auto-apply ~/.claude/skills/
   ```

4. **Verify installation**:
   ```bash
   ls -la ~/.claude/skills/linkedin-job-auto-apply
   ```

   You should see:
   - `SKILL.md`
   - `README.md`
   - `autoApplyLinkedInJobs.js`
   - `applySingleJob.js`

5. **Start Claude Code and test**:
   ```bash
   claude
   /linkedin-job-auto-apply
   ```

---

### Method 4: Local Development

For contributors and developers.

1. **Clone the repository**:
   ```bash
   git clone https://github.com/jerryliu/linkedin-skill.git
   cd linkedin-skill
   ```

2. **Start Claude Code**:
   ```bash
   claude
   ```

3. **Add as local marketplace**:
   ```bash
   /plugin marketplace add /path/to/linkedin-skill
   ```

4. **Install from local source**:
   ```bash
   /plugin install linkedin-job-auto-apply@local
   ```

5. **Make changes and test**:
   - Edit files in `skills/linkedin-job-auto-apply/`
   - Changes are reflected immediately
   - No need to reinstall after edits

---

## Verification

After installation, verify everything works:

### Step 1: Check Installation
```bash
claude
/plugin list
```

Look for `linkedin-job-auto-apply` in the output.

### Step 2: Invoke the Skill
```bash
/linkedin-job-auto-apply
```

Claude should respond with information about the skill.

### Step 3: Test Single Job Application
Ask Claude:
```
Test the LinkedIn automation by applying to a single software engineering job
```

Claude will:
1. Open LinkedIn job search
2. List available jobs
3. Apply to one job
4. Show the result

If this works, your installation is successful! ✅

---

## Troubleshooting Installation

### Issue: "Command not found: claude"

**Solution:**
- Claude Code is not installed or not in PATH
- Install from: https://claude.ai/code
- On macOS/Linux: Add to PATH in `.bashrc` or `.zshrc`
- On Windows: Add to system PATH

---

### Issue: "Plugin not found"

**Solution:**
- Marketplace may not be added
- Try: `/plugin marketplace add jerryliu/linkedin-skill`
- Or use install script method instead

---

### Issue: "Skill files not found"

**Solution:**
- Check installation directory: `~/.claude/skills/linkedin-job-auto-apply/`
- Ensure `SKILL.md` exists in that directory
- Try reinstalling with install script

---

### Issue: "Permission denied" when running install.sh

**Solution:**
```bash
chmod +x install.sh
./install.sh
```

---

### Issue: Playwright MCP tools not available

**Solution:**
- Verify Playwright MCP is configured in Claude Code
- Check Claude Code settings for MCP tools
- Restart Claude Code
- Consult Claude Code documentation for MCP setup

---

## Post-Installation Setup

After successful installation:

### 1. Configure LinkedIn Account

- Ensure you're logged into LinkedIn
- Complete your profile
- Upload your resume
- Verify contact information

### 2. Review Documentation

- Read [QUICKSTART.md](./QUICKSTART.md) for quick start
- Review [USAGE_EXAMPLES.md](./USAGE_EXAMPLES.md) for examples
- Check [SKILL.md](./skills/linkedin-job-auto-apply/SKILL.md) for full details

### 3. Test Thoroughly

- Start with single job application
- Test with 2-3 jobs
- Verify applications in LinkedIn account
- Check for any errors

### 4. Configure Settings

Customize your automation:
- Search keywords
- Target location
- Number of applications
- Delay timings

---

## Updating

To update to the latest version:

### If installed via marketplace:
```bash
claude
/plugin update linkedin-job-auto-apply
```

### If installed manually:
```bash
cd linkedin-skill
git pull origin main
./install.sh
```

---

## Uninstallation

To remove the skill:

### If installed via marketplace:
```bash
claude
/plugin uninstall linkedin-job-auto-apply
```

### If installed manually:
```bash
rm -rf ~/.claude/skills/linkedin-job-auto-apply
```

---

## Getting Help

If you encounter installation issues:

1. **Check documentation**:
   - README.md
   - QUICKSTART.md
   - TROUBLESHOOTING section

2. **Search existing issues**:
   - GitHub Issues
   - Common problems and solutions

3. **Create new issue**:
   - Provide system details
   - Include error messages
   - Describe steps taken

4. **Community support**:
   - GitHub Discussions
   - Claude Code community

---

## Next Steps

After successful installation:

1. ✅ Read the [Quick Start Guide](./QUICKSTART.md)
2. ✅ Try your [first automation](./QUICKSTART.md#your-first-automation-5-minutes)
3. ✅ Review [usage examples](./USAGE_EXAMPLES.md)
4. ✅ Start applying to jobs!

Happy job hunting! 🎯
