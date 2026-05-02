/**
 * Unit tests — applySingleJob.js
 * Run: node --test tests/unit/applySingleJob.test.js
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { listJobs, applySingleJob } = require('../../skills/linkedin-job-auto-apply/applySingleJob');

// ── Mock helpers ───────────────────────────────────────────────────────────
const noop = async () => {};

function makeListPage(jobs = []) {
  return {
    goto: noop,
    waitForTimeout: noop,
    evaluate: async () => jobs,
  };
}

// ── listJobs ───────────────────────────────────────────────────────────────
describe('listJobs', () => {
  test('returns array from page.evaluate', async () => {
    const JOBS = [
      { index: 0, title: 'SWE', company: 'Google', location: 'SF', hasEasyApply: true, alreadyApplied: false },
    ];
    const page = makeListPage(JOBS);
    const r = await listJobs(page);
    assert.deepEqual(r, JOBS);
  });

  test('returns empty array when no jobs', async () => {
    const page = makeListPage([]);
    const r = await listJobs(page);
    assert.deepEqual(r, []);
  });
});

// ── applySingleJob ─────────────────────────────────────────────────────────
describe('applySingleJob — guard clauses', () => {
  test('returns error when jobInfo is null (index out of bounds)', async () => {
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async () => null,
    };
    const r = await applySingleJob(page, 99);
    assert.equal(r.status, 'error');
    assert.ok(r.reason.includes('not found'));
  });

  test('returns skipped when job is already applied', async () => {
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async () => ({
        title: 'SWE', company: 'Google', location: 'SF',
        hasEasyApply: true, alreadyApplied: true,
      }),
    };
    const r = await applySingleJob(page, 0);
    assert.equal(r.status, 'skipped');
    assert.ok(r.reason.toLowerCase().includes('applied'));
  });

  test('returns skipped when not an Easy Apply job', async () => {
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async () => ({
        title: 'SWE', company: 'Acme', location: 'NY',
        hasEasyApply: false, alreadyApplied: false,
      }),
    };
    const r = await applySingleJob(page, 0);
    assert.equal(r.status, 'skipped');
    assert.ok(r.reason.toLowerCase().includes('easy apply'));
  });

  test('returns skipped when Easy Apply button not found after clicking card', async () => {
    let step = 0;
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async () => {
        step++;
        if (step === 1) return { title: 'SWE', company: 'X', location: 'Y', hasEasyApply: true, alreadyApplied: false };
        return false; // button click fails, fallback click also fails
      },
    };
    const r = await applySingleJob(page, 0);
    assert.ok(['skipped', 'failed', 'error'].includes(r.status));
  });

  test('handles null userProfile without throwing', async () => {
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async () => null,
    };
    // Should not throw TypeError
    const r = await applySingleJob(page, 0, null);
    assert.equal(r.status, 'error');
  });

  test('returns error on thrown exception', async () => {
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async () => { throw new Error('DOM crash'); },
    };
    const r = await applySingleJob(page, 0);
    assert.equal(r.status, 'error');
    assert.ok(r.reason.includes('DOM crash'));
  });
});

describe('applySingleJob — success path', () => {
  test('returns success when application submitted', async () => {
    let step = 0;
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async (fn) => {
        const src = typeof fn === 'function' ? fn.toString() : '';
        step++;
        // Step 1: jobInfo
        if (step === 1) return { title: 'SWE', company: 'Google', location: 'SF', hasEasyApply: true, alreadyApplied: false };
        // Step 2: click Easy Apply button on card
        if (step === 2) return true;
        // Step 3: modal check
        if (src.includes('jobs-easy-apply-modal') || src.includes('[role="dialog"]')) return true;
        // Step 4: fillFormDefaults (in modal)
        if (src.includes('querySelectorAll')) return undefined;
        // Step 5: hasSubmit
        if (src.includes('Submit application') || src.includes("'Submit'")) return true;
        // Step 6: click submit
        if (src.includes('Submit')) return undefined;
        // Step 7: success text
        if (src.includes('Application sent')) return true;
        // Step 8: closeModal
        return false;
      },
    };
    const r = await applySingleJob(page, 0, { phone: '555-0000', yearsExp: 3 });
    assert.equal(r.status, 'success');
  });

  test('returns failed when submission not confirmed', async () => {
    let step = 0;
    const page = {
      goto: noop,
      waitForTimeout: noop,
      evaluate: async (fn) => {
        const src = typeof fn === 'function' ? fn.toString() : '';
        step++;
        if (step === 1) return { title: 'SWE', company: 'Acme', location: 'NY', hasEasyApply: true, alreadyApplied: false };
        if (step === 2) return true;                        // click button
        if (src.includes('jobs-easy-apply-modal')) return true;  // modal open
        if (src.includes('querySelectorAll')) return undefined;   // fillFormDefaults
        if (src.includes('Submit application')) return true;     // hasSubmit
        if (src.includes('Application sent')) return false;      // not confirmed
        return false;
      },
    };
    const r = await applySingleJob(page, 0);
    assert.equal(r.status, 'failed');
  });
});
