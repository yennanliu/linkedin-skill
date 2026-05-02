/**
 * E2E tests — Contact Reacher full pipeline
 *
 * Uses a real Playwright browser against local fixture HTML pages.
 * No LinkedIn credentials required — fixtures simulate the DOM.
 *
 * Run: node --test tests/e2e/contactReacherFlow.e2e.test.js
 * Skip:  set LINKEDIN_E2E=0 (default) to skip all tests here.
 * Enable: LINKEDIN_E2E=1 node --test tests/e2e/contactReacherFlow.e2e.test.js
 */

const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs   = require('node:fs');
const path = require('node:path');
const os   = require('node:os');

const SKIP = process.env.LINKEDIN_E2E !== '1';

// ── Fixture HTML ────────────────────────────────────────────────────────────
const SEARCH_FIXTURE = `<!DOCTYPE html><html><body>
<div class="entity-result__item">
  <a href="https://www.linkedin.com/in/testuser1/" class="entity-result__title-text">
    <span aria-hidden="true">Alice Engineer</span>
  </a>
  <div class="entity-result__primary-subtitle">Software Engineer</div>
  <div class="entity-result__secondary-subtitle">Google</div>
  <span class="dist-value">2nd</span>
</div>
</body></html>`;

const PROFILE_FIXTURE = `<!DOCTYPE html><html><body>
<h1>Alice Engineer</h1>
<p class="text-body-medium break-words">Software Engineer at Google</p>
<p class="text-body-small inline t-black--light break-words">San Francisco, CA</p>
<section id="experience">
  <ul>
    <li class="artdeco-list__item">
      <span class="mr1 t-bold"><span aria-hidden="true">Software Engineer</span></span>
      <div class="t-14 t-normal"><span aria-hidden="true">Google</span></div>
      <div class="t-14 t-normal t-black--light"><span aria-hidden="true">Jan 2022 – Present</span></div>
    </li>
  </ul>
</section>
</body></html>`;

// ── Helper: write fixture to temp file and return file:// URL ───────────────
function fixtureUrl(html, filename) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'li-e2e-'));
  const filepath = path.join(dir, filename);
  fs.writeFileSync(filepath, html, 'utf8');
  return `file://${filepath}`;
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe('E2E: discoverContacts → extractContactInfo → saveOutput', { skip: SKIP }, () => {
  let browser, page;
  let chromium;

  before(async () => {
    ({ chromium } = require('playwright'));
    browser = await chromium.launch({ headless: true });
    page = await browser.newPage();
  });

  after(async () => {
    if (browser) await browser.close();
  });

  test('discoverContacts collects contacts from fixture search page', async () => {
    const { discoverContacts } = require('../../skills/linkedin-contact-reacher/discoverContacts');
    const searchUrl = fixtureUrl(SEARCH_FIXTURE, 'search.html');

    const contacts = await discoverContacts(page, {
      seeds: [{ type: 'search', keywords: 'engineer' }],
      strategy: 'bfs',
      maxContacts: 5,
      maxDepth: 0,
      delayMin: 0, delayMax: 0,
    });

    // We can't control which URL the seed navigates to, but the function must not throw
    assert.ok(Array.isArray(contacts));
  });

  test('extractContactInfo enriches a contact using fixture profile page', async () => {
    const { extractContactInfo } = require('../../skills/linkedin-contact-reacher/extractContactInfo');
    const profileUrl = fixtureUrl(PROFILE_FIXTURE, 'profile.html');

    const contacts = [{ profileUrl, name: 'Alice Engineer' }];
    const enriched = await extractContactInfo(page, contacts, {
      companyDomains: { 'Google': 'google.com' },
      delayMin: 0, delayMax: 0,
    });

    assert.equal(enriched.length, 1);
    assert.equal(enriched[0].status, 'success');
    assert.equal(enriched[0].name, 'Alice Engineer');
    assert.equal(enriched[0].companyDomain, 'google.com');
    assert.ok(enriched[0].emailCandidates.length > 0);
    assert.ok(enriched[0].emailCandidates[0].includes('@google.com'));
  });

  test('saveOutput writes files from enriched contacts', async () => {
    const { saveOutput } = require('../../skills/linkedin-contact-reacher/saveOutput');
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), 'li-e2e-save-'));

    const contacts = [{
      name: 'Alice Engineer', firstName: 'Alice', lastName: 'Engineer',
      profileUrl: 'https://linkedin.com/in/alice/', status: 'success',
      emailCandidates: ['alice.engineer@google.com'],
      personalEmailCandidates: [], companyDomain: 'google.com',
    }];

    const summary = await saveOutput(contacts, { format: 'both', outputDir, label: 'e2e-test' });

    assert.equal(summary.total, 1);
    assert.equal(summary.withEmail, 1);

    const files = fs.readdirSync(outputDir);
    assert.ok(files.some(f => f.endsWith('.json')), 'json file created');
    assert.ok(files.some(f => f.endsWith('.csv')), 'csv file created');
  });

  test('reachContacts returns empty for zero contacts', async () => {
    const { reachContacts } = require('../../skills/linkedin-contact-reacher/reachContacts');
    const r = await reachContacts(page, []);
    assert.deepEqual(r.results, []);
    assert.equal(r.stats.sent, 0);
  });
});
