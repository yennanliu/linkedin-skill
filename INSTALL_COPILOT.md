# Installing for GitHub Copilot

## Prerequisites

- GitHub Copilot subscription (Individual, Business, or Enterprise)
- Copilot Chat enabled in your editor (VS Code, JetBrains, etc.)
- Playwright MCP tools or browser automation available
- LinkedIn account (logged in, with resume uploaded)

## Install

The Copilot integration works via `.github/copilot-instructions.md` — a workspace-level instructions file that Copilot Chat reads automatically.

```bash
git clone https://github.com/yennanliu/linkedin-skill.git
cd linkedin-skill
```

The file `.github/copilot-instructions.md` is already included in this repo. If you want to add this skill to **your own project**, copy it:

```bash
cp .github/copilot-instructions.md /your-project/.github/copilot-instructions.md
# Commit it so Copilot picks it up
git add .github/copilot-instructions.md && git commit -m "Add LinkedIn auto-apply Copilot instructions"
```

## Usage

Open Copilot Chat in your editor and ask:

```
Help me apply to LinkedIn jobs automatically
```

or

```
Show me how to run the LinkedIn auto-apply batch automation
```

Copilot will reference the skill documentation and guide you to:
1. Paste `applySingleJob.js` functions into a Playwright block (test)
2. Run `autoApplyLinkedInJobs()` for batch automation

## Run the Automation

In Copilot Chat (with Playwright MCP tools available):

```javascript
// Test — paste applySingleJob.js first, then:
await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
await page.waitForTimeout(3000);
const jobs = await listJobs(page);
const result = await applySingleJob(page, 0);
console.log(result);

// Batch — paste autoApplyLinkedInJobs.js first, then:
await autoApplyLinkedInJobs(page, { targetApplications: 20 });
```

## Notes

- Copilot reads `.github/copilot-instructions.md` only when it's committed to the repository
- The JS files must still be pasted manually into Playwright code blocks (Copilot does not auto-execute files)
- For the best experience, open this repository folder directly in VS Code with Copilot enabled

## Uninstall

Remove or delete `.github/copilot-instructions.md` from your repo.
