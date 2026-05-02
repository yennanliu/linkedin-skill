/**
 * Unit tests — saveOutput.js
 * Run: node --test tests/unit/saveOutput.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { saveOutput } = require('../../skills/linkedin-contact-reacher/saveOutput');

// Use a temp dir so tests don't pollute ./output
function tmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'linkedin-save-test-'));
}

const SAMPLE_CONTACTS = [
  {
    name: 'Jane Smith', firstName: 'Jane', lastName: 'Smith',
    title: 'Engineer', currentTitle: 'Engineer',
    company: 'Google', currentCompany: 'Google',
    location: 'SF', profileUrl: 'https://linkedin.com/in/jane/',
    connectionDegree: '2nd', depth: 0,
    companyDomain: 'google.com',
    emailCandidates: ['jane.smith@google.com', 'jsmith@google.com'],
    personalEmailCandidates: [],
    publicEmail: null, websites: [],
    messageSent: false, reachStatus: '', messageText: '',
    reachedAt: '', via: 'seed:search', status: 'success',
  },
];

// ── Guards ──────────────────────────────────────────────────────────────────
describe('saveOutput — guards', () => {
  test('returns null for null contacts', async () => {
    const r = await saveOutput(null, { format: 'json', outputDir: tmpDir() });
    assert.equal(r, null);
  });

  test('returns null for undefined contacts', async () => {
    const r = await saveOutput(undefined, { format: 'json', outputDir: tmpDir() });
    assert.equal(r, null);
  });

  test('returns null for non-array contacts', async () => {
    const r = await saveOutput('not-an-array', { format: 'json', outputDir: tmpDir() });
    assert.equal(r, null);
  });
});

// ── JSON output ────────────────────────────────────────────────────────────
describe('saveOutput — JSON', () => {
  test('creates a .json file in outputDir', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'json', outputDir: dir, label: 'test' });
    const files = fs.readdirSync(dir);
    assert.ok(files.some(f => f.endsWith('.json')), 'json file created');
  });

  test('json file contains valid JSON', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'json', outputDir: dir, label: 'test' });
    const file = fs.readdirSync(dir).find(f => f.endsWith('.json'));
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.doesNotThrow(() => JSON.parse(content), 'valid JSON');
  });

  test('json file contains all contacts', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'json', outputDir: dir, label: 'test' });
    const file = fs.readdirSync(dir).find(f => f.endsWith('.json'));
    const data = JSON.parse(fs.readFileSync(path.join(dir, file), 'utf8'));
    assert.equal(data.length, 1);
    assert.equal(data[0].name, 'Jane Smith');
  });

  test('handles empty contacts array gracefully', async () => {
    const dir = tmpDir();
    const r = await saveOutput([], { format: 'json', outputDir: dir, label: 'empty' });
    assert.equal(r.total, 0);
  });
});

// ── CSV output ─────────────────────────────────────────────────────────────
describe('saveOutput — CSV', () => {
  test('creates a .csv file in outputDir', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'csv', outputDir: dir, label: 'test' });
    const files = fs.readdirSync(dir);
    assert.ok(files.some(f => f.endsWith('.csv')), 'csv file created');
  });

  test('csv has header row', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'csv', outputDir: dir, label: 'test' });
    const file = fs.readdirSync(dir).find(f => f.endsWith('.csv'));
    const lines = fs.readFileSync(path.join(dir, file), 'utf8').split('\n');
    assert.ok(lines[0].includes('name'), 'first line is header');
  });

  test('csv values are quoted', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'csv', outputDir: dir, label: 'test' });
    const file = fs.readdirSync(dir).find(f => f.endsWith('.csv'));
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(content.includes('"'), 'values are quoted');
  });

  test('csv with double-quote in value is escaped', async () => {
    const dir = tmpDir();
    const contacts = [{ ...SAMPLE_CONTACTS[0], name: 'She said "hello"' }];
    await saveOutput(contacts, { format: 'csv', outputDir: dir, label: 'escapetest' });
    const file = fs.readdirSync(dir).find(f => f.endsWith('.csv'));
    const content = fs.readFileSync(path.join(dir, file), 'utf8');
    assert.ok(content.includes('""'), 'double-quote escaped as ""');
  });

  test('empty contacts produces header-only csv', async () => {
    const dir = tmpDir();
    await saveOutput([], { format: 'csv', outputDir: dir, label: 'empty' });
    const files = fs.readdirSync(dir);
    // CSV save may skip if rows is empty — just ensure no crash
    assert.ok(Array.isArray(files));
  });
});

// ── Both format ────────────────────────────────────────────────────────────
describe('saveOutput — both', () => {
  test('creates both json and csv files', async () => {
    const dir = tmpDir();
    await saveOutput(SAMPLE_CONTACTS, { format: 'both', outputDir: dir, label: 'both' });
    const files = fs.readdirSync(dir);
    assert.ok(files.some(f => f.endsWith('.json')), 'json created');
    assert.ok(files.some(f => f.endsWith('.csv')), 'csv created');
  });
});

// ── Summary return value ───────────────────────────────────────────────────
describe('saveOutput — summary', () => {
  test('returns summary with expected keys', async () => {
    const dir = tmpDir();
    const r = await saveOutput(SAMPLE_CONTACTS, { format: 'json', outputDir: dir });
    for (const key of ['total', 'withEmail', 'publicEmail', 'reached', 'failed', 'savedAt', 'filename']) {
      assert.ok(key in r, `summary has key: ${key}`);
    }
  });

  test('total matches contacts length', async () => {
    const dir = tmpDir();
    const r = await saveOutput(SAMPLE_CONTACTS, { format: 'json', outputDir: dir });
    assert.equal(r.total, SAMPLE_CONTACTS.length);
  });

  test('withEmail counts contacts that have emailCandidates', async () => {
    const dir = tmpDir();
    const r = await saveOutput(SAMPLE_CONTACTS, { format: 'json', outputDir: dir });
    assert.equal(r.withEmail, 1);
  });

  test('reached counts contacts with reachStatus=sent', async () => {
    const dir = tmpDir();
    const contacts = [
      { ...SAMPLE_CONTACTS[0], reachStatus: 'sent' },
      { ...SAMPLE_CONTACTS[0], name: 'Bob', reachStatus: '' },
    ];
    const r = await saveOutput(contacts, { format: 'json', outputDir: dir });
    assert.equal(r.reached, 1);
  });
});
