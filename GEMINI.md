# LinkedIn Skills for Gemini CLI

Three LinkedIn automation skills using Playwright browser tools, backed by seven specialized agents.

## Skills

| Skill | Invoke | Docs |
|-------|--------|------|
| Job Auto-Apply | `/linkedin-job-auto-apply` | `skills/linkedin-job-auto-apply/SKILL.md` |
| Profile Scraper | `/linkedin-profile-scraper` | `skills/linkedin-profile-scraper/SKILL.md` |
| Contact Reacher | `/linkedin-contact-reacher` | `skills/linkedin-contact-reacher/SKILL.md` |

## Specialized Agents

| Agent | File | Purpose |
|-------|------|---------|
| **Strategy** | `skills/agents/strategy-agent/SKILL.md` | Filter & score jobs |
| **Automation** | `skills/agents/automation-agent/SKILL.md` | Timing, retry, rate limiting |
| **Web Structure** | `skills/agents/web-structure-agent/SKILL.md` | DOM selectors, lazy loading |
| **QA** | `skills/agents/qa-agent/SKILL.md` | Pre-flight checks, result validation |
| **Contact Discovery** | `skills/agents/contact-discovery-agent/SKILL.md` | BFS/DFS strategy, seed selection |
| **Outreach** | `skills/agents/outreach-agent/SKILL.md` | Connection note templates, rate limits |
| **Email Generator** | `skills/agents/email-generator-agent/SKILL.md` | Email patterns, domain inference |

---

## Quick Usage

### Skill 1 — Job Auto-Apply

```javascript
// Paste autoApplyLinkedInJobs.js, then:
await autoApplyLinkedInJobs(page, {
  targetApplications: 20,
  searchKeywords: 'software engineer',
  location: 'United States',
  userProfile: {
    phone: '+1-555-000-0000',
    linkedinUrl: 'https://www.linkedin.com/in/yourhandle',
    city: 'San Francisco',
    zip: '94105',
    yearsExp: 5
  }
});
// Keyboard: P=Pause  R=Resume  Q=Quit
```

### Skill 2 — Profile Scraper

```javascript
// Paste scrapeLinkedInProfiles.js, then:
const results = await scrapeLinkedInProfiles(page, {
  company: 'Google',
  country: 'United States',
  industry: 'Software Development',
  maxProfiles: 20
});
console.log(JSON.stringify(results, null, 2));
```

### Skill 3 — Contact Reacher

```javascript
// Paste discoverContacts.js, then:
const contacts = await discoverContacts(page, {
  seeds: [{ type: 'search', company: 'Google', role: 'Software Engineer' }],
  strategy: 'bfs',
  maxContacts: 30,
  maxDepth: 1,
  targetCompanies: ['Google'],
});

// Paste extractContactInfo.js, then:
const enriched = await extractContactInfo(page, contacts, {
  companyDomains: { 'Google': 'google.com' },
});

// Paste saveOutput.js, then:
await saveOutput(enriched, { label: 'google-referrals', format: 'both' });
// Output: ./output/google-referrals_TIMESTAMP.{json,csv}
```

---

## Prerequisites

- Logged into LinkedIn
- Playwright MCP browser tools available
- Resume uploaded (job-apply skill only)

## Further Reading

- Full config options & scenarios → each skill's `SKILL.md`
- Profile scraper deep-dive → `PROFILE_SCRAPER.md`
- Gemini-specific install → `INSTALL_GEMINI.md`
