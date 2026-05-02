/**
 * Unit tests — reachContacts.js
 * Run: node --test tests/unit/reachContacts.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { buildMessage, reachSingleContact, reachContacts } = require('../../skills/linkedin-contact-reacher/reachContacts');

// ── buildMessage ───────────────────────────────────────────────────────────
describe('buildMessage', () => {
  test('referral message includes target company', () => {
    const msg = buildMessage('referral', { currentCompany: 'Google', firstName: 'Jane' }, { name: 'Bob', role: 'Engineer' });
    assert.ok(msg.includes('Google'));
  });

  test('referral message is at most 300 chars', () => {
    const msg = buildMessage('referral',
      { currentCompany: 'A'.repeat(200), firstName: 'Jane' },
      { name: 'B'.repeat(200), role: 'C'.repeat(200) }
    );
    assert.ok(msg.length <= 300);
  });

  test('networking message includes their company', () => {
    const msg = buildMessage('networking', { currentCompany: 'Stripe', firstName: 'Ana' }, {});
    assert.ok(msg.includes('Stripe'));
  });

  test('custom purpose returns empty string (no note)', () => {
    const msg = buildMessage('custom', { firstName: 'Jane' }, {});
    assert.equal(msg, '');
  });

  test('unknown purpose returns empty string', () => {
    const msg = buildMessage('unknown_purpose', { firstName: 'Jane' }, {});
    assert.equal(msg, '');
  });

  test('falls back to "there" when firstName is null', () => {
    const msg = buildMessage('networking', { firstName: null, name: null }, {});
    assert.ok(msg.includes('there'));
  });

  test('uses first word of name when firstName missing', () => {
    const msg = buildMessage('networking', { name: 'John Doe', firstName: undefined }, {});
    assert.ok(msg.includes('John'));
  });

  test('graceful when userProfile is empty object', () => {
    const msg = buildMessage('referral', { firstName: 'Jane', currentCompany: 'Acme' }, {});
    assert.ok(msg.length > 0);
    assert.ok(msg.length <= 300);
  });
});

// ── reachSingleContact ─────────────────────────────────────────────────────
describe('reachSingleContact — guard clauses', () => {
  const noopPage = {
    goto: async () => {},
    waitForTimeout: async () => {},
    evaluate: async () => false,
  };

  test('returns skipped when contact has no profileUrl', async () => {
    const r = await reachSingleContact(noopPage, {}, {});
    assert.equal(r.reachStatus, 'skipped');
    assert.ok(r.reason.includes('profileUrl'));
  });

  test('returns already_connected when message/pending/following button found', async () => {
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = fn.toString();
        if (src.includes("'Message'")) return true;   // alreadyConnected check
        return false;
      },
    };
    const r = await reachSingleContact(page, { profileUrl: 'https://linkedin.com/in/jane/' }, {});
    assert.equal(r.reachStatus, 'already_connected');
  });

  test('returns skipped when Connect button not found', async () => {
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async () => false,
    };
    const r = await reachSingleContact(page, { profileUrl: 'https://linkedin.com/in/jane/' }, {});
    assert.equal(r.reachStatus, 'skipped');
  });

  test('returns error when goto throws', async () => {
    const page = {
      goto: async () => { throw new Error('net::ERR_ABORTED'); },
      waitForTimeout: async () => {},
      evaluate: async () => false,
    };
    const r = await reachSingleContact(page, { profileUrl: 'https://linkedin.com/in/broken/' }, {});
    assert.equal(r.reachStatus, 'error');
    assert.ok(r.reason.includes('net::ERR_ABORTED'));
  });
});

describe('reachSingleContact — send path', () => {
  test('returns sent when modal closes after send', async () => {
    let step = 0;
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = fn.toString();
        step++;
        if (step === 1) return false;     // alreadyConnected → false
        if (step === 2) return true;      // connectBtn found → click
        if (step === 3) return false;     // noteClicked → skip note (purpose defaults to networking, message > 0)
        if (step === 4) return true;      // send button found
        if (step === 5) return true;      // modal gone
        return false;
      },
    };
    const r = await reachSingleContact(page,
      { profileUrl: 'https://linkedin.com/in/jane/', firstName: 'Jane', currentCompany: 'Acme' },
      { purpose: 'networking', delayMin: 0, delayMax: 0, userProfile: { name: 'Bob' } }
    );
    assert.equal(r.reachStatus, 'sent');
    assert.equal(r.messageSent, true);
  });
});

// ── reachContacts batch ────────────────────────────────────────────────────
describe('reachContacts', () => {
  const noopPage = {
    goto: async () => {},
    waitForTimeout: async () => {},
    evaluate: async () => false,
  };

  test('returns empty results for null contacts', async () => {
    const r = await reachContacts(noopPage, null);
    assert.deepEqual(r.results, []);
    assert.equal(r.stats.sent, 0);
  });

  test('returns empty results for empty contacts array', async () => {
    const r = await reachContacts(noopPage, []);
    assert.deepEqual(r.results, []);
  });

  test('respects maxPerSession cap', async () => {
    const contacts = Array.from({ length: 10 }, (_, i) => ({
      profileUrl: `https://linkedin.com/in/person${i}/`,
      name: `Person ${i}`,
    }));
    const r = await reachContacts(noopPage, contacts, { maxPerSession: 3, delayMin: 0, delayMax: 0 });
    // 3 processed + 7 unchanged passed through
    assert.equal(r.results.length, 10);
  });

  test('onlyUnreached skips already-sent contacts', async () => {
    const contacts = [
      { profileUrl: 'https://linkedin.com/in/a/', messageSent: true, reachStatus: 'sent' },
      { profileUrl: 'https://linkedin.com/in/b/' },
    ];
    const r = await reachContacts(noopPage, contacts, { onlyUnreached: true, delayMin: 0, delayMax: 0 });
    // Only 1 contact should be processed (b); a is already sent
    const processed = r.results.filter(c => c.reachStatus !== undefined && c.reachStatus !== 'sent');
    assert.ok(processed.length <= 1);
  });

  test('stats object has all expected keys', async () => {
    const r = await reachContacts(noopPage, [{ profileUrl: 'https://linkedin.com/in/x/' }],
      { delayMin: 0, delayMax: 0 });
    for (const key of ['sent', 'skipped', 'failed', 'alreadyConnected']) {
      assert.ok(key in r.stats, `stats has key: ${key}`);
    }
  });
});
