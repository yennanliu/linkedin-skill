# Installing for Gemini CLI

## Prerequisites

- [Gemini CLI](https://github.com/google-gemini/gemini-cli) installed
- Playwright MCP tools configured in Gemini CLI
- LinkedIn account (logged in, with resume uploaded)

## Install

```bash
git clone https://github.com/yennanliu/linkedin-skill.git
cd linkedin-skill
./install.sh
```

The script copies the extension to `~/.gemini/extensions/linkedin-job-auto-apply/`.

**Manual install:**
```bash
cp -r .gemini/extensions/linkedin-job-auto-apply ~/.gemini/extensions/
cp skills/linkedin-job-auto-apply/*.js ~/.gemini/extensions/linkedin-job-auto-apply/
```

## Usage

Start Gemini CLI and ask:

```
Help me apply to LinkedIn software engineer jobs automatically
```

or

```
Apply to 20 Easy Apply jobs on LinkedIn for "backend developer" in "San Francisco"
```

Gemini will:
1. Read the skill context from `GEMINI.md`
2. Guide you to paste the JS functions into a Playwright code block
3. Run the automation in your browser

## Quick Test

Before batch automation, test with a single job:

```
Test the LinkedIn automation with a single job application
```

## Uninstall

```bash
rm -rf ~/.gemini/extensions/linkedin-job-auto-apply
```
