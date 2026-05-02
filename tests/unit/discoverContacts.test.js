/**
 * Unit tests — discoverContacts.js
 * Run: node --test tests/unit/discoverContacts.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { discoverContacts } = require('../../skills/linkedin-contact-reacher/discoverContacts');

// ── Mock page ──────────────────────────────────────────────────────────────
function makePage({ cards = [], neighbours = [] } = {}) {
  return {
    goto: async () => {},
    waitForTimeout: async () => {},
    evaluate: async (fn) => {
      const src = typeof fn === 'function' ? fn.toString() : '';
      // collectSearchCards — returns cards array
      if (src.includes('entity-result__item')) return cards;
      // collectSearchUrls — returns neighbour URLs
      if (src.includes('scrollTo')) return undefined;
      // neighbours expansion
      if (src.includes('/in/')) return neighbours;
      return [];
    },
  };
}

// ── Edge-case guards ───────────────────────────────────────────────────────
describe('discoverContacts — guards', () => {
  test('returns empty array when seeds is empty', async () => {
    const page = makePage();
    const r = await discoverContacts(page, { seeds: [] });
    assert.deepEqual(r, []);
  });

  test('returns empty array when maxContacts is 0', async () => {
    const page = makePage({ cards: [{ profileUrl: 'https://linkedin.com/in/jane/', name: 'Jane', title: 'SWE', company: 'Google', connectionDegree: '2nd' }] });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Google' }],
      maxContacts: 0,
    });
    assert.deepEqual(r, []);
  });

  test('returns empty array when seeds is not an array', async () => {
    const page = makePage();
    const r = await discoverContacts(page, { seeds: null });
    assert.deepEqual(r, []);
  });

  test('defaults to bfs when strategy is invalid', async () => {
    const page = makePage({
      cards: [{ profileUrl: 'https://linkedin.com/in/jane/', name: 'Jane', title: 'SWE', company: 'Google', connectionDegree: '2nd' }],
    });
    // Should not throw
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Google' }],
      strategy: 'invalid_strategy',
      maxContacts: 1,
      maxDepth: 0,
    });
    assert.ok(Array.isArray(r));
  });
});

// ── BFS traversal ─────────────────────────────────────────────────────────
describe('discoverContacts — BFS', () => {
  const CARD = { profileUrl: 'https://linkedin.com/in/jane/', name: 'Jane', title: 'SWE', company: 'Google', connectionDegree: '2nd' };

  test('collects contacts from search seed', async () => {
    const page = makePage({ cards: [CARD] });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Google' }],
      strategy: 'bfs',
      maxContacts: 5,
      maxDepth: 0,
      delayMin: 0, delayMax: 0,
    });
    assert.equal(r.length, 1);
    assert.equal(r[0].name, 'Jane');
  });

  test('does not exceed maxContacts', async () => {
    const cards = Array.from({ length: 10 }, (_, i) => ({
      profileUrl: `https://linkedin.com/in/person${i}/`,
      name: `Person ${i}`, title: 'SWE', company: 'Google', connectionDegree: '2nd',
    }));
    const page = makePage({ cards });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Google' }],
      strategy: 'bfs',
      maxContacts: 3,
      maxDepth: 0,
      delayMin: 0, delayMax: 0,
    });
    assert.ok(r.length <= 3);
  });

  test('deduplicates profile URLs', async () => {
    const card = { profileUrl: 'https://linkedin.com/in/jane/', name: 'Jane', title: 'SWE', company: 'Google', connectionDegree: '2nd' };
    // Simulate same URL returned twice from two seeds
    let callCount = 0;
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = typeof fn === 'function' ? fn.toString() : '';
        if (src.includes('scrollTo')) return undefined;
        if (src.includes('entity-result__item')) return [card];
        return [];
      },
    };
    const r = await discoverContacts(page, {
      seeds: [
        { type: 'search', company: 'Google' },
        { type: 'search', company: 'Google' },
      ],
      strategy: 'bfs',
      maxContacts: 10,
      maxDepth: 0,
      delayMin: 0, delayMax: 0,
    });
    // jane should appear exactly once
    const janeCount = r.filter(c => c.profileUrl === 'https://linkedin.com/in/jane/').length;
    assert.equal(janeCount, 1);
  });

  test('seed type=profile adds URL directly to frontier', async () => {
    const page = makePage({ neighbours: [] });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'profile', url: 'https://linkedin.com/in/testuser/' }],
      strategy: 'bfs',
      maxContacts: 1,
      maxDepth: 0,
      delayMin: 0, delayMax: 0,
    });
    assert.equal(r.length, 1);
    assert.equal(r[0].profileUrl, 'https://linkedin.com/in/testuser/');
  });

  test('each contact has required fields', async () => {
    const page = makePage({ cards: [CARD] });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Google' }],
      maxContacts: 1, maxDepth: 0, delayMin: 0, delayMax: 0,
    });
    const c = r[0];
    for (const field of ['profileUrl', 'name', 'title', 'company', 'depth', 'via', 'emailCandidates']) {
      assert.ok(field in c, `contact has field: ${field}`);
    }
  });
});

// ── Filters ───────────────────────────────────────────────────────────────
describe('discoverContacts — filters', () => {
  test('targetCompanies filters out non-matching contacts', async () => {
    const cards = [
      { profileUrl: 'https://linkedin.com/in/a/', name: 'Alice', title: 'PM',  company: 'Google', connectionDegree: '2nd' },
      { profileUrl: 'https://linkedin.com/in/b/', name: 'Bob',   title: 'SWE', company: 'Amazon', connectionDegree: '2nd' },
    ];
    const page = makePage({ cards });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Google' }],
      targetCompanies: ['Google'],
      maxContacts: 10, maxDepth: 0, delayMin: 0, delayMax: 0,
    });
    assert.ok(r.every(c => (c.company || '').toLowerCase().includes('google')));
  });

  test('targetRoles filters out non-matching titles', async () => {
    const cards = [
      { profileUrl: 'https://linkedin.com/in/a/', name: 'Alice', title: 'Software Engineer', company: 'Acme', connectionDegree: '2nd' },
      { profileUrl: 'https://linkedin.com/in/b/', name: 'Bob',   title: 'HR Manager',        company: 'Acme', connectionDegree: '2nd' },
    ];
    const page = makePage({ cards });
    const r = await discoverContacts(page, {
      seeds: [{ type: 'search', company: 'Acme' }],
      targetRoles: ['engineer'],
      maxContacts: 10, maxDepth: 0, delayMin: 0, delayMax: 0,
    });
    assert.ok(r.every(c => (c.title || '').toLowerCase().includes('engineer')));
  });
});
