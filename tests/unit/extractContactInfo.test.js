/**
 * Unit tests — extractContactInfo.js
 * Run: node --test tests/unit/extractContactInfo.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const {
  parseName,
  generateEmailCandidates,
  inferDomain,
  extractSingleContact,
  extractContactInfo,
} = require('../../skills/linkedin-contact-reacher/extractContactInfo');

// ── parseName ──────────────────────────────────────────────────────────────
describe('parseName', () => {
  test('splits "First Last"', () => {
    const r = parseName('Jane Smith');
    assert.equal(r.firstName, 'Jane');
    assert.equal(r.lastName, 'Smith');
  });

  test('handles middle names — takes first and last word', () => {
    const r = parseName('John Michael Doe');
    assert.equal(r.firstName, 'John');
    assert.equal(r.lastName, 'Doe');
  });

  test('single name — lastName is null', () => {
    const r = parseName('Madonna');
    assert.equal(r.firstName, 'Madonna');
    assert.equal(r.lastName, null);
  });

  test('null input returns nulls', () => {
    const r = parseName(null);
    assert.equal(r.firstName, null);
    assert.equal(r.lastName, null);
  });

  test('empty string returns nulls', () => {
    const r = parseName('');
    assert.equal(r.firstName, null);
    assert.equal(r.lastName, null);
  });

  test('extra whitespace is trimmed', () => {
    const r = parseName('  Jane   Doe  ');
    assert.equal(r.firstName, 'Jane');
    assert.equal(r.lastName, 'Doe');
  });

  test('hyphenated name treated as one part', () => {
    const r = parseName('Mary-Anne Smith');
    assert.equal(r.firstName, 'Mary-Anne');
    assert.equal(r.lastName, 'Smith');
  });

  test('non-ASCII name normalised by email generator', () => {
    const r = parseName('José García');
    assert.equal(r.firstName, 'José');
    assert.equal(r.lastName, 'García');
  });
});

// ── generateEmailCandidates ────────────────────────────────────────────────
describe('generateEmailCandidates', () => {
  test('produces 10 candidates for valid inputs', () => {
    const candidates = generateEmailCandidates('Jane', 'Smith', 'example.com');
    assert.equal(candidates.length, 10);
  });

  test('first candidate is firstname.lastname@domain', () => {
    const [first] = generateEmailCandidates('Jane', 'Smith', 'example.com');
    assert.equal(first, 'jane.smith@example.com');
  });

  test('all candidates contain the domain', () => {
    const candidates = generateEmailCandidates('Jane', 'Smith', 'acme.io');
    assert.ok(candidates.every(e => e.endsWith('@acme.io')));
  });

  test('strips non-alpha from name parts', () => {
    const candidates = generateEmailCandidates('José', 'García', 'co.com');
    assert.ok(candidates.every(e => !e.includes('é') && !e.includes('í')));
  });

  test('returns empty array when firstName is missing', () => {
    assert.deepEqual(generateEmailCandidates('', 'Smith', 'co.com'), []);
  });

  test('returns empty array when lastName is missing', () => {
    assert.deepEqual(generateEmailCandidates('Jane', '', 'co.com'), []);
  });

  test('returns empty array when domain is missing', () => {
    assert.deepEqual(generateEmailCandidates('Jane', 'Smith', ''), []);
  });

  test('returns empty array for null inputs', () => {
    assert.deepEqual(generateEmailCandidates(null, null, null), []);
  });

  test('all candidates are lowercase', () => {
    const candidates = generateEmailCandidates('JANE', 'SMITH', 'CO.COM');
    assert.ok(candidates.every(e => e === e.toLowerCase()));
  });
});

// ── inferDomain ────────────────────────────────────────────────────────────
describe('inferDomain', () => {
  test('user-provided map takes priority', () => {
    assert.equal(inferDomain('Acme Corp', { 'Acme': 'acme.io' }), 'acme.io');
  });

  test('user map is case-insensitive', () => {
    assert.equal(inferDomain('GOOGLE', { 'google': 'google.com' }), 'google.com');
  });

  test('returns built-in domain for Google', () => {
    assert.equal(inferDomain('Google'), 'google.com');
  });

  test('returns built-in domain for Meta', () => {
    assert.equal(inferDomain('Meta'), 'meta.com');
  });

  test('Facebook maps to meta.com', () => {
    assert.equal(inferDomain('Facebook'), 'meta.com');
  });

  test('no duplicate twitter key — returns twitter.com', () => {
    assert.equal(inferDomain('Twitter'), 'twitter.com');
  });

  test('X Corp maps to x.com', () => {
    assert.equal(inferDomain('X Corp'), 'x.com');
  });

  test('slugify fallback strips noise words', () => {
    const d = inferDomain('Widgets Inc');
    assert.equal(d, 'widgets.com');
  });

  test('slugify fallback strips multiple noise words', () => {
    const d = inferDomain('Acme Technologies Group');
    assert.equal(d, 'acme.com');
  });

  test('returns null for null input', () => {
    assert.equal(inferDomain(null), null);
  });

  test('returns null for empty string', () => {
    assert.equal(inferDomain(''), null);
  });

  test('slug-only result appends .com', () => {
    const d = inferDomain('Zapier');
    assert.equal(d, 'zapier.com');
  });
});

// ── extractSingleContact ───────────────────────────────────────────────────
describe('extractSingleContact — success', () => {
  function makePage(profileData) {
    return {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = typeof fn === 'function' ? fn.toString() : '';
        if (src.includes('scrollTo')) return undefined;
        if (src.includes('window.location.href')) return profileData;
        return null;
      },
    };
  }

  test('returns status=success for valid profile data', async () => {
    const page = makePage({
      name: 'Jane Smith', headline: 'Engineer', location: 'SF',
      publicEmail: null, websites: [], currentCompany: 'Google',
      currentTitle: 'SWE', workHistory: [], profileUrl: 'https://linkedin.com/in/jane/',
    });
    const r = await extractSingleContact(page, 'https://linkedin.com/in/jane/');
    assert.equal(r.status, 'success');
  });

  test('generates emailCandidates when company is known', async () => {
    const page = makePage({
      name: 'Jane Smith', headline: '', location: '',
      publicEmail: null, websites: [], currentCompany: 'Google',
      currentTitle: 'SWE', workHistory: [], profileUrl: 'https://linkedin.com/in/jane/',
    });
    const r = await extractSingleContact(page, 'https://linkedin.com/in/jane/');
    assert.ok(r.emailCandidates.length > 0);
    assert.ok(r.emailCandidates[0].includes('@google.com'));
  });

  test('publicEmail is placed first in emailCandidates', async () => {
    const page = makePage({
      name: 'Jane Smith', headline: '', location: '',
      publicEmail: 'jane@google.com', websites: [], currentCompany: 'Google',
      currentTitle: 'SWE', workHistory: [], profileUrl: 'https://linkedin.com/in/jane/',
    });
    const r = await extractSingleContact(page, 'https://linkedin.com/in/jane/');
    assert.equal(r.emailCandidates[0], 'jane@google.com');
  });

  test('domainSource is "built-in" for known company', async () => {
    const page = makePage({
      name: 'Jane Smith', headline: '', location: '',
      publicEmail: null, websites: [], currentCompany: 'Microsoft',
      currentTitle: 'SWE', workHistory: [], profileUrl: 'https://linkedin.com/in/jane/',
    });
    const r = await extractSingleContact(page, 'https://linkedin.com/in/jane/');
    assert.equal(r.domainSource, 'built-in');
  });

  test('domainSource is "user-provided" when domain given in options', async () => {
    const page = makePage({
      name: 'Jane Smith', headline: '', location: '',
      publicEmail: null, websites: [], currentCompany: 'Acme Corp',
      currentTitle: 'SWE', workHistory: [], profileUrl: 'https://linkedin.com/in/jane/',
    });
    const r = await extractSingleContact(page, 'https://linkedin.com/in/jane/', {
      companyDomains: { 'Acme': 'acme.io' },
    });
    assert.equal(r.domainSource, 'user-provided');
    assert.equal(r.companyDomain, 'acme.io');
  });

  test('emailCandidatesValidated is null when validateEmails not set', async () => {
    const page = makePage({
      name: 'Jane Smith', headline: '', location: '',
      publicEmail: null, websites: [], currentCompany: 'Google',
      currentTitle: 'SWE', workHistory: [], profileUrl: '',
    });
    const r = await extractSingleContact(page, 'https://linkedin.com/in/jane/');
    assert.equal(r.emailCandidatesValidated, null);
  });
});

describe('extractSingleContact — error handling', () => {
  test('returns status=error when goto throws', async () => {
    const page = {
      goto: async () => { throw new Error('timeout'); },
      waitForTimeout: async () => {},
      evaluate: async () => null,
    };
    const r = await extractSingleContact(page, 'https://linkedin.com/in/broken/');
    assert.equal(r.status, 'error');
    assert.ok(r.reason.includes('timeout'));
  });

  test('returns status=error when evaluate returns null', async () => {
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = typeof fn === 'function' ? fn.toString() : '';
        if (src.includes('scrollTo')) return undefined;
        return null;
      },
    };
    const r = await extractSingleContact(page, 'https://linkedin.com/in/broken/');
    assert.equal(r.status, 'error');
    assert.equal(r.profileUrl, 'https://linkedin.com/in/broken/');
  });
});

// ── extractContactInfo batch ───────────────────────────────────────────────
describe('extractContactInfo', () => {
  test('returns empty array for empty contacts list', async () => {
    const page = { goto: async () => {}, waitForTimeout: async () => {}, evaluate: async () => ({}) };
    const r = await extractContactInfo(page, []);
    assert.deepEqual(r, []);
  });

  test('returns empty array for null contacts', async () => {
    const page = { goto: async () => {}, waitForTimeout: async () => {}, evaluate: async () => ({}) };
    const r = await extractContactInfo(page, null);
    assert.deepEqual(r, []);
  });

  test('enriches a single contact', async () => {
    const profileData = {
      name: 'Jane Smith', headline: 'Engineer', location: 'SF',
      publicEmail: null, websites: [], currentCompany: 'Google',
      currentTitle: 'SWE', workHistory: [], profileUrl: 'https://linkedin.com/in/jane/',
    };
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = typeof fn === 'function' ? fn.toString() : '';
        if (src.includes('scrollTo')) return undefined;
        if (src.includes('window.location.href')) return profileData;
        return null;
      },
    };
    const contacts = [{ profileUrl: 'https://linkedin.com/in/jane/', name: 'Jane Smith' }];
    const r = await extractContactInfo(page, contacts, { delayMin: 0, delayMax: 0 });
    assert.equal(r.length, 1);
    assert.equal(r[0].status, 'success');
  });
});
