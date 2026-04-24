/**
 * Unit tests for LinkedIn Profile Scraper
 * Tests logic in isolation using a mock Playwright page object.
 * Run: node --test tests/profileScraper.unit.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

// ── Load source files ──────────────────────────────────────────────────────
const scraperSrc = fs.readFileSync(
  path.join(__dirname, '../skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js'), 'utf8'
);
const singleSrc = fs.readFileSync(
  path.join(__dirname, '../skills/linkedin-profile-scraper/scrapeSingleProfile.js'), 'utf8'
);

// Strip module.exports guard so eval works in this scope
const stripExports = (src) => src.replace(/if \(typeof module[\s\S]+$/, '');
eval(stripExports(scraperSrc));  // defines scrapeLinkedInProfiles
eval(stripExports(singleSrc));   // defines scrapeSingleProfile

// ── Mock profile data ──────────────────────────────────────────────────────
const MOCK_PROFILE = {
  name: 'Jane Doe',
  headline: 'Software Engineer at Acme',
  location: 'San Francisco, CA',
  currentCompany: 'Acme Corp',
  currentTitle: 'Software Engineer',
  industry: 'Software Development',
  workHistory: [
    { title: 'Software Engineer', company: 'Acme Corp', dateRange: 'Jan 2022 – Present', location: 'San Francisco, CA' },
    { title: 'Junior Engineer',   company: 'Beta Ltd',  dateRange: 'Jun 2019 – Dec 2021', location: 'New York, NY' }
  ],
  profileUrl: 'https://www.linkedin.com/in/janedoe/'
};

// ── Mock page factory ──────────────────────────────────────────────────────
// Each evaluate call is identified by a unique snippet in the fn source.
// Order matters: most specific patterns first.
function makePage({ profileUrls = [], profileData = MOCK_PROFILE } = {}) {
  const calls = { goto: [], waitForTimeout: [], evaluate: [] };

  const page = {
    _calls: calls,

    goto: async (url) => { calls.goto.push(url); },

    waitForTimeout: async (ms) => { calls.waitForTimeout.push(ms); },

    evaluate: async (fn) => {
      const src = fn.toString();
      calls.evaluate.push(src.slice(0, 60));

      // Search results page — collect profile links
      if (src.includes('linkedin.com/in/')) return profileUrls;

      // Scroll calls — no meaningful return
      if (src.includes('scrollTo')) return undefined;

      // Profile data extraction — identified by #experience (unique to this call)
      if (src.includes('#experience')) return profileData;

      return null;
    }
  };

  return page;
}

// ── Tests: scrapeLinkedInProfiles ──────────────────────────────────────────
describe('scrapeLinkedInProfiles — options', () => {
  test('returns an empty array when no profiles found', async () => {
    const page = makePage({ profileUrls: [] });
    const results = await scrapeLinkedInProfiles(page, { maxPages: 1, maxProfiles: 10 });
    assert.ok(Array.isArray(results));
    assert.equal(results.length, 0);
  });

  test('navigates to LinkedIn people search URL', async () => {
    const page = makePage({ profileUrls: [] });
    await scrapeLinkedInProfiles(page, { company: 'Google', maxPages: 1, maxProfiles: 10 });

    assert.ok(page._calls.goto.length > 0, 'goto was called');
    const url = page._calls.goto[0];
    assert.ok(url.includes('linkedin.com/search/results/people'), 'navigates to people search');
    assert.ok(url.includes('Google'), 'includes company in query');
  });

  test('includes country and industry in search query', async () => {
    const page = makePage({ profileUrls: [] });
    await scrapeLinkedInProfiles(page, {
      country: 'Singapore',
      industry: 'Finance',
      maxPages: 1,
      maxProfiles: 10
    });
    const url = page._calls.goto[0];
    assert.ok(url.includes('Singapore'), 'includes country');
    assert.ok(url.includes('Finance'),   'includes industry');
  });

  test('stops at maxProfiles even when more URLs are found', async () => {
    const urls = Array.from({ length: 10 }, (_, i) =>
      `https://www.linkedin.com/in/person${i}/`
    );
    const page = makePage({ profileUrls: urls });
    const results = await scrapeLinkedInProfiles(page, { maxPages: 1, maxProfiles: 3 });
    assert.equal(results.length, 3, 'stopped at maxProfiles=3');
  });

  test('deduplicates profile URLs from search results', async () => {
    const repeated = [
      'https://www.linkedin.com/in/janedoe/',
      'https://www.linkedin.com/in/janedoe/'
    ];
    const page = makePage({ profileUrls: repeated });
    const results = await scrapeLinkedInProfiles(page, { maxPages: 1, maxProfiles: 5 });
    assert.equal(results.length, 1, 'deduplicates — visits only 1 profile');
  });

  test('returns status=error for profiles that throw', async () => {
    const page = {
      goto: async (url) => {
        // throw only when visiting a profile page (not search)
        if (url.includes('/in/')) throw new Error('network error');
      },
      waitForTimeout: async () => {},
      evaluate: async (fn) => {
        const src = fn.toString();
        if (src.includes('linkedin.com/in/'))
          return ['https://www.linkedin.com/in/broken/'];
        return null;
      }
    };
    const results = await scrapeLinkedInProfiles(page, { maxPages: 1, maxProfiles: 1 });
    assert.equal(results.length, 1);
    assert.equal(results[0].status, 'error');
    assert.ok(results[0].reason.includes('network error'));
  });
});

// ── Tests: scrapeSingleProfile ─────────────────────────────────────────────
describe('scrapeSingleProfile — success path', () => {
  test('returns status=success', async () => {
    const page = makePage();
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    assert.equal(result.status, 'success');
  });

  test('navigates to the given profile URL', async () => {
    const page = makePage();
    const url = 'https://www.linkedin.com/in/janedoe/';
    await scrapeSingleProfile(page, url);
    assert.equal(page._calls.goto[0], url);
  });

  test('extracts all expected top-level fields', async () => {
    const page = makePage();
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    for (const field of ['name', 'headline', 'location', 'currentCompany', 'currentTitle', 'industry', 'workHistory', 'profileUrl']) {
      assert.ok(field in result, `result has field: ${field}`);
    }
  });

  test('name matches mock data', async () => {
    const page = makePage();
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    assert.equal(result.name, 'Jane Doe');
  });

  test('currentCompany matches mock data', async () => {
    const page = makePage();
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    assert.equal(result.currentCompany, 'Acme Corp');
  });

  test('workHistory is an array', async () => {
    const page = makePage();
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    assert.ok(Array.isArray(result.workHistory));
  });

  test('workHistory entries have required fields', async () => {
    const page = makePage();
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    assert.ok(result.workHistory.length > 0, 'at least one entry');
    const entry = result.workHistory[0];
    for (const field of ['title', 'company', 'dateRange', 'location']) {
      assert.ok(field in entry, `work entry has field: ${field}`);
    }
  });

  test('scrolls page to trigger lazy-loaded sections', async () => {
    const page = makePage();
    await scrapeSingleProfile(page, 'https://www.linkedin.com/in/janedoe/');
    const scrollCalls = page._calls.evaluate.filter((s) => s.includes('scrollTo'));
    assert.ok(scrollCalls.length >= 2, 'scrolled at least twice');
  });
});

describe('scrapeSingleProfile — error handling', () => {
  test('returns status=error when goto throws', async () => {
    const page = {
      goto: async () => { throw new Error('timeout'); },
      waitForTimeout: async () => {},
      evaluate: async () => null
    };
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/broken/');
    assert.equal(result.status, 'error');
    assert.ok(result.reason.includes('timeout'));
  });

  test('returns status=error when evaluate throws', async () => {
    const page = {
      goto: async () => {},
      waitForTimeout: async () => {},
      evaluate: async () => { throw new Error('DOM error'); }
    };
    const result = await scrapeSingleProfile(page, 'https://www.linkedin.com/in/broken/');
    assert.equal(result.status, 'error');
  });

  test('includes profileUrl in error result', async () => {
    const page = {
      goto: async () => { throw new Error('fail'); },
      waitForTimeout: async () => {},
      evaluate: async () => null
    };
    const url = 'https://www.linkedin.com/in/broken/';
    const result = await scrapeSingleProfile(page, url);
    assert.equal(result.profileUrl, url);
  });
});

// ── Source integrity ───────────────────────────────────────────────────────
describe('source file integrity', () => {
  test('scrapeLinkedInProfiles is an async function returning a Promise', () => {
    assert.equal(typeof scrapeLinkedInProfiles, 'function');
    const page = { goto: async () => {}, waitForTimeout: async () => {}, evaluate: async () => [] };
    assert.ok(scrapeLinkedInProfiles(page, { maxPages: 0, maxProfiles: 0 }) instanceof Promise);
  });

  test('scrapeSingleProfile is an async function returning a Promise', () => {
    assert.equal(typeof scrapeSingleProfile, 'function');
    const page = { goto: async () => {}, waitForTimeout: async () => {}, evaluate: async () => ({}) };
    assert.ok(scrapeSingleProfile(page, 'https://www.linkedin.com/in/test/') instanceof Promise);
  });

  test('scraper source contains required LinkedIn selectors', () => {
    assert.ok(singleSrc.includes('#experience'),       'has #experience anchor');
    assert.ok(singleSrc.includes('aria-hidden'),       'reads aria-hidden spans');
    assert.ok(singleSrc.includes('scrollTo'),          'scrolls to load sections');
    assert.ok(scraperSrc.includes('/people/'),         'targets /people/ search');
    assert.ok(scraperSrc.includes('linkedin.com/in/'), 'collects /in/ profile links');
  });
});
