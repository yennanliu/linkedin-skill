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
The script copies the extension to `~/.gemini/extensions/linkedin-skill/`.

**Manual install:**
```bash
cp -r .gemini/extensions/linkedin-job-auto-apply ~/.gemini/extensions/linkedin-skill
cp skills/linkedin-job-auto-apply/*.js ~/.gemini/extensions/linkedin-skill/
cp skills/linkedin-profile-scraper/*.js ~/.gemini/extensions/linkedin-skill/
cp skills/linkedin-contact-reacher/*.js ~/.gemini/extensions/linkedin-skill/
mkdir -p ~/.gemini/extensions/linkedin-skill/skills/agents
cp -r skills/agents/* ~/.gemini/extensions/linkedin-skill/skills/agents/
```

## Usage

Start Gemini CLI and ask:

### 1. Job Auto-Apply
```
Help me apply to LinkedIn software engineer jobs automatically
```

### 2. Profile Scraper
```
Scrape 20 profiles of Software Engineers at Google in the United States
```

### 3. Contact Reacher (Networking)
```
Discover 10 contacts at Google for a referral and generate their email addresses
```

Gemini will:
1. Read the skill context from `GEMINI.md`
2. Guide you to paste the JS functions into a Playwright code block
3. Run the automation in your browser

## Specialized Agents

The skills are supported by 7 specialized agents (Strategy, Automation, Web Structure, QA, Contact Discovery, Outreach, Email Generator) that provide deeper expertise for complex tasks.

## Quick Test

Before batch automation, test with a single job:

```
Test the LinkedIn automation with a single job application
```

## Uninstall

```bash
rm -rf ~/.gemini/extensions/linkedin-skill
```
