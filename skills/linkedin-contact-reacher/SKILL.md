---
name: linkedin-contact-reacher
description: Systematically discover LinkedIn contacts for job referrals or networking using BFS/DFS traversal. Extracts LinkedIn URLs, generates company email candidates, optionally sends connection requests, and saves output locally as JSON + CSV.
---

# LinkedIn Contact Reacher Skill

Discover LinkedIn contacts systematically (BFS or DFS), enrich them with email candidates, optionally send personalized connection requests, and save everything locally.

## Specialized Agents

| Agent | File | When to Use |
|-------|------|-------------|
| **Contact Discovery Agent** | [`skills/agents/contact-discovery-agent/SKILL.md`](../agents/contact-discovery-agent/SKILL.md) | BFS/DFS strategy, seed selection, traversal tuning |
| **Outreach Agent** | [`skills/agents/outreach-agent/SKILL.md`](../agents/outreach-agent/SKILL.md) | Message templates, connection request best practices, rate limits |
| **Email Generator Agent** | [`skills/agents/email-generator-agent/SKILL.md`](../agents/email-generator-agent/SKILL.md) | Email pattern logic, domain inference, validation |
| **QA Agent** | [`skills/agents/qa-agent/SKILL.md`](../agents/qa-agent/SKILL.md) | Pre-flight checks, session validation, output quality |
| **Automation Agent** | [`skills/agents/automation-agent/SKILL.md`](../agents/automation-agent/SKILL.md) | Timing, retry logic, rate limiting |

## Script Files

| File | Purpose |
|------|---------|
| `discoverContacts.js` | BFS/DFS traversal — finds contacts from seeds |
| `extractContactInfo.js` | Visits profiles, generates email candidates |
| `reachContacts.js` | Sends connection requests with personalized notes |
| `saveOutput.js` | Saves results to JSON + CSV locally |

## Prerequisites

- Logged into LinkedIn
- Playwright MCP tools available
- Output directory writable (default: `./output/`)

---

## Orchestrated Run Order

```
1. QA Agent          → preFlightCheck(page)
2. Discovery Agent   → discoverContacts()      ← BFS or DFS
3. Extract Agent     → extractContactInfo()    ← enrich + email candidates
4. [Optional] Reach  → reachContacts()         ← send connection requests
5. Save              → saveOutput()            ← JSON + CSV locally
6. QA Agent          → generateReport()
```

---

## Quick Start

### Scenario 1: Find referral contacts at a target company

```javascript
// ── Step 1: Discover contacts via BFS ─────────────────────────────────
// Paste discoverContacts.js, then:

const contacts = await discoverContacts(page, {
  seeds: [
    { type: 'search', company: 'Google', role: 'Engineering Manager' },
    { type: 'search', company: 'Google', role: 'Software Engineer' }
  ],
  strategy: 'bfs',          // breadth-first: broad coverage of the company
  maxContacts: 30,
  maxDepth: 1,              // depth=1: only direct search results, no expansion
  targetCompanies: ['Google'],
  targetRoles: ['engineer', 'manager', 'tech lead'],
  connectionDegree: ['1st', '2nd', '3rd'],
});

// ── Step 2: Enrich with email candidates ──────────────────────────────
// Paste extractContactInfo.js, then:

const enriched = await extractContactInfo(page, contacts, {
  companyDomains: { 'Google': 'google.com' },
  guessPersonalEmail: false,   // set true to also get gmail/outlook guesses
});

// ── Step 3: Save output ───────────────────────────────────────────────
// Paste saveOutput.js, then:

await saveOutput(enriched, {
  format: 'both',
  outputDir: './output',
  label: 'google-referrals'
});
// Output: ./output/google-referrals_2026-04-27T....{json,csv}

// ── Step 4: (Optional) Send connection requests ───────────────────────
// Paste reachContacts.js, then:

const { results, stats } = await reachContacts(page, enriched, {
  purpose: 'referral',
  userProfile: {
    name: 'Your Name',
    role: 'Software Engineer',
    targetCompany: 'Google'
  },
  maxPerSession: 10,      // stay under LinkedIn's limit
});

// Save final results with reach status
await saveOutput(results, { label: 'google-referrals-reached', format: 'both' });
```

### Scenario 2: Networking DFS — deep dive from one person's profile

```javascript
const contacts = await discoverContacts(page, {
  seeds: [{ type: 'profile', url: 'https://www.linkedin.com/in/someengineer/' }],
  strategy: 'dfs',          // depth-first: explore one thread deeply
  maxContacts: 20,
  maxDepth: 2,
  targetCompanies: ['Stripe', 'Shopify', 'Airbnb'],
  connectionDegree: ['2nd', '3rd'],
});

const enriched = await extractContactInfo(page, contacts, {
  companyDomains: {
    'Stripe':   'stripe.com',
    'Shopify':  'shopify.com',
    'Airbnb':   'airbnb.com',
  },
  guessPersonalEmail: false,
});

await saveOutput(enriched, { label: 'networking-dfs', format: 'both' });
```

### Scenario 3: Multiple companies, networking only (no outreach)

```javascript
const allContacts = [];

for (const target of [
  { company: 'Stripe', role: 'backend engineer' },
  { company: 'Shopify', role: 'software engineer' },
]) {
  const batch = await discoverContacts(page, {
    seeds: [{ type: 'search', ...target }],
    strategy: 'bfs',
    maxContacts: 15,
    maxDepth: 1,
    targetCompanies: [target.company],
  });
  allContacts.push(...batch);
  await page.waitForTimeout(5000); // pause between companies
}

const enriched = await extractContactInfo(page, allContacts, {
  companyDomains: { 'Stripe': 'stripe.com', 'Shopify': 'shopify.com' }
});

await saveOutput(enriched, { label: 'multi-company', format: 'both' });
```

---

## Configuration Reference

### `discoverContacts(page, options)`

| Option | Default | Description |
|--------|---------|-------------|
| `seeds` | `[]` | Array of seed objects: `{ type: 'search', company, role, keywords }` or `{ type: 'profile', url }` |
| `strategy` | `'bfs'` | `'bfs'` (queue, broad) or `'dfs'` (stack, deep) |
| `maxContacts` | `30` | Maximum unique contacts to collect |
| `maxDepth` | `2` | Max traversal depth from seeds. `1` = search results only |
| `targetCompanies` | `[]` | Filter: only keep contacts at these companies (empty = all) |
| `targetRoles` | `[]` | Filter: only keep contacts whose title contains one of these strings |
| `connectionDegree` | `['1st','2nd','3rd']` | Which LinkedIn connection degrees to include |
| `delayMin` | `3000` | Min delay between navigations (ms) |
| `delayMax` | `6000` | Max delay (ms) |

### `extractContactInfo(page, contacts, options)`

| Option | Default | Description |
|--------|---------|-------------|
| `companyDomains` | `{}` | Map of `{ 'Company Name': 'domain.com' }` for email generation |
| `guessPersonalEmail` | `false` | Also generate gmail/outlook/hotmail variants |
| `delayMin` | `2500` | Min delay between profile visits (ms) |
| `delayMax` | `5000` | Max delay (ms) |

### `reachContacts(page, contacts, options)`

| Option | Default | Description |
|--------|---------|-------------|
| `purpose` | `'networking'` | `'referral'` \| `'networking'` \| `'custom'` |
| `customMessage` | `''` | Used when `purpose='custom'` (max 300 chars) |
| `userProfile` | `{}` | `{ name, role, targetCompany }` — used in message templates |
| `maxPerSession` | `15` | Max connection requests per session (LinkedIn limit: ~100/week) |
| `onlyUnreached` | `true` | Skip contacts already reached |
| `delayMin` | `4000` | Min delay between requests (ms) |
| `delayMax` | `8000` | Max delay (ms) |

### `saveOutput(contacts, options)`

| Option | Default | Description |
|--------|---------|-------------|
| `format` | `'both'` | `'json'` \| `'csv'` \| `'both'` |
| `outputDir` | `'./output'` | Output directory (Node.js) or download (browser) |
| `label` | `'contacts'` | Filename prefix. Result: `label_YYYY-MM-DDTHH-MM-SS.{json,csv}` |

---

## Output Schema

Each contact in the output has:

```json
{
  "name": "Jane Smith",
  "firstName": "Jane",
  "lastName": "Smith",
  "title": "Engineering Manager",
  "company": "Google",
  "location": "San Francisco, CA",
  "linkedinUrl": "https://www.linkedin.com/in/janesmith/",
  "connectionDegree": "2nd",
  "depth": 0,
  "companyDomain": "google.com",
  "emailCandidates": [
    "jane.smith@google.com",
    "jsmith@google.com",
    "janesmith@google.com",
    "janes@google.com"
  ],
  "personalEmailCandidates": [],
  "publicEmail": null,
  "websites": [],
  "messageSent": false,
  "reachStatus": "",
  "messageText": "",
  "reachedAt": null,
  "via": "seed:search"
}
```

---

## BFS vs DFS — When to Use Which

| | BFS | DFS |
|-|-----|-----|
| **Goal** | Cover many people at a company broadly | Explore one person's extended network deeply |
| **Best for** | Referral hunting at a specific company | Networking via a trusted contact's connections |
| **Depth setting** | `maxDepth: 1` or `2` | `maxDepth: 2` or `3` |
| **Result shape** | Wide and shallow — many contacts from search | Narrow and deep — contacts 2–3 hops away |
| **Risk** | May include less-relevant matches | May drift far from target company |

---

## Email Candidate Patterns

Generated email patterns (in priority order):

| Pattern | Example |
|---------|---------|
| `firstname.lastname@domain` | `jane.smith@google.com` |
| `flastname@domain` | `jsmith@google.com` |
| `firstnamelastname@domain` | `janesmith@google.com` |
| `firstnamei@domain` | `janes@google.com` |
| `firstname@domain` | `jane@google.com` |
| `lastname.firstname@domain` | `smith.jane@google.com` |
| `firstname_lastname@domain` | `jane_smith@google.com` |
| `f.lastname@domain` | `j.smith@google.com` |
| `lastname@domain` | `smith@google.com` |
| `firstname-lastname@domain` | `jane-smith@google.com` |

Verify candidates with tools like Hunter.io or email verification APIs before sending.

---

## Safety & Rate Limits

| Action | Recommended Limit |
|--------|------------------|
| Connection requests per day | ≤ 20 |
| Connection requests per week | ≤ 80 (free) / 150 (Premium) |
| Profile visits per session | ≤ 50 |
| Session duration | < 45 minutes |
| Break between sessions | 2+ hours |

LinkedIn may restrict accounts that send too many requests. Start conservatively.

---

## Legal & Ethical Usage

- Only contact people you have a genuine professional reason to reach
- Personalize messages — do not spam
- Respect LinkedIn's Terms of Service
- Do not use harvested emails for bulk cold outreach without consent
- Email candidates are guesses only — verify before use
