/**
 * LinkedIn Job Auto-Apply Automation Script
 *
 * Applies ONLY to Easy Apply jobs.
 * When a questionnaire/form step is encountered, fills fields with
 * sensible default values (text inputs, number inputs, dropdowns,
 * radio buttons) and continues — never skips due to forms.
 *
 * Usage:
 * ```javascript
 * await autoApplyLinkedInJobs(page, {
 *   startPage: 1,
 *   targetApplications: 20,
 *   maxPages: 20,
 *   searchKeywords: 'software engineer',
 *   location: 'United States',
 *   delayMin: 2000,
 *   delayMax: 4000
 * });
 * ```
 */

async function autoApplyLinkedInJobs(page, options = {}) {
  const {
    startPage = 1,
    targetApplications = 20,
    maxPages = 20,
    searchKeywords = 'software engineer',
    location = 'United States',
    delayMin = 2000,
    delayMax = 4000
  } = options;

  // ── Statistics ──────────────────────────────────────────────────────────
  const stats = {
    successful: 0,
    failed: 0,
    skipped: 0,
    totalProcessed: 0,
    pages: []
  };

  // ── Keyboard Controls State ────────────────────────────────────────────
  let isPaused = false;
  let shouldQuit = false;

  // ── Setup Keyboard Controls ────────────────────────────────────────────
  await page.evaluate(() => {
    window.linkedinAutoApplyState = { isPaused: false, shouldQuit: false };

    if (window.linkedinKeyboardHandler) {
      document.removeEventListener('keydown', window.linkedinKeyboardHandler);
    }

    window.linkedinKeyboardHandler = (e) => {
      if (e.key === 'p' || e.key === 'P') {
        window.linkedinAutoApplyState.isPaused = true;
        console.log('⏸️  PAUSED - Press R to resume, Q to quit');
      } else if (e.key === 'r' || e.key === 'R') {
        window.linkedinAutoApplyState.isPaused = false;
        console.log('▶️  RESUMED');
      } else if (e.key === 'q' || e.key === 'Q') {
        window.linkedinAutoApplyState.shouldQuit = true;
        console.log('🛑 QUIT requested - finishing current job...');
      }
    };

    document.addEventListener('keydown', window.linkedinKeyboardHandler);
  });

  // ── Setup Status Indicator ─────────────────────────────────────────────
  await page.evaluate(() => {
    const existing = document.getElementById('linkedin-auto-apply-status');
    if (existing) existing.remove();

    const statusDiv = document.createElement('div');
    statusDiv.id = 'linkedin-auto-apply-status';
    statusDiv.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #0a66c2;
      color: white;
      padding: 15px 20px;
      border-radius: 8px;
      font-family: -apple-system, system-ui, sans-serif;
      font-size: 14px;
      font-weight: 600;
      z-index: 999999;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      min-width: 200px;
    `;
    statusDiv.innerHTML = `
      <div style="font-size: 16px; margin-bottom: 8px;">LinkedIn Auto-Apply</div>
      <div id="linkedin-status-text">Starting...</div>
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">P=Pause | R=Resume | Q=Quit</div>
    `;
    document.body.appendChild(statusDiv);
  });

  async function updateStatus(text, color = '#0a66c2') {
    await page.evaluate(({ text, color }) => {
      const statusDiv = document.getElementById('linkedin-auto-apply-status');
      const statusText = document.getElementById('linkedin-status-text');
      if (statusDiv && statusText) {
        statusDiv.style.background = color;
        statusText.textContent = text;
      }
    }, { text, color });
  }

  async function checkKeyboardState() {
    const state = await page.evaluate(() => window.linkedinAutoApplyState);
    isPaused = state.isPaused;
    shouldQuit = state.shouldQuit;

    while (isPaused && !shouldQuit) {
      await updateStatus('⏸️ PAUSED', '#ff9500');
      await page.waitForTimeout(1000);
      const newState = await page.evaluate(() => window.linkedinAutoApplyState);
      isPaused = newState.isPaused;
      shouldQuit = newState.shouldQuit;
    }

    return shouldQuit;
  }

  // ── Fill form fields with sensible defaults ────────────────────────────
  // Runs on every modal step before attempting Next/Submit.
  // Handles: text inputs, number inputs, native <select>, radio groups.
  async function fillFormDefaults() {
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], .jobs-easy-apply-modal');
      if (!modal) return;

      function getLabel(el) {
        const ariaLabel = el.getAttribute('aria-label') || '';
        const labelEl = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
        return (ariaLabel + ' ' + (labelEl ? labelEl.textContent : '')).toLowerCase();
      }

      function dispatch(el) {
        el.dispatchEvent(new Event('input', { bubbles: true }));
        el.dispatchEvent(new Event('change', { bubbles: true }));
      }

      // Text / email / tel inputs
      modal.querySelectorAll(
        'input[type="text"], input[type="email"], input[type="tel"], input:not([type])'
      ).forEach(input => {
        if (input.value.trim()) return; // already filled
        const label = getLabel(input);
        if (label.includes('phone') || label.includes('tel') || label.includes('mobile')) {
          input.value = '0000000000';
        } else if (label.includes('linkedin') || label.includes('url') || label.includes('website')) {
          input.value = 'https://www.linkedin.com/in/me';
        } else if (label.includes('city') || label.includes('address')) {
          input.value = 'Remote';
        } else if (label.includes('zip') || label.includes('postal')) {
          input.value = '00000';
        } else {
          input.value = 'N/A';
        }
        dispatch(input);
      });

      // Number inputs
      modal.querySelectorAll('input[type="number"]').forEach(input => {
        if (input.value.trim()) return;
        const label = getLabel(input);
        if (label.includes('year') || label.includes('experience') || label.includes('exp')) {
          input.value = '3';
        } else if (label.includes('salary') || label.includes('rate') || label.includes('compensation')) {
          input.value = '0';
        } else {
          input.value = '1';
        }
        dispatch(input);
      });

      // Native <select> dropdowns — pick first non-placeholder option
      modal.querySelectorAll('select').forEach(select => {
        if (select.value) return; // already has a value
        const firstReal = Array.from(select.options).find(
          o => o.value && o.value !== '' && !o.disabled
        );
        if (firstReal) {
          select.value = firstReal.value;
          dispatch(select);
        }
      });

      // Radio button groups — click first option if none selected
      const radioGroups = {};
      modal.querySelectorAll('input[type="radio"]').forEach(radio => {
        const key = radio.name || radio.getAttribute('aria-name') || radio.closest('fieldset')?.id || 'unnamed';
        if (!radioGroups[key]) radioGroups[key] = [];
        radioGroups[key].push(radio);
      });
      Object.values(radioGroups).forEach(group => {
        if (group.some(r => r.checked)) return;
        const first = group[0];
        first.checked = true;
        first.dispatchEvent(new Event('click', { bubbles: true }));
        dispatch(first);
      });

      // Textareas — leave empty unless required (LinkedIn usually pre-fills from profile)
      modal.querySelectorAll('textarea').forEach(ta => {
        if (ta.value.trim()) return;
        if (ta.required || ta.getAttribute('aria-required') === 'true') {
          ta.value = 'Please see my LinkedIn profile and resume for details.';
          dispatch(ta);
        }
      });
    });

    // Small pause so React re-renders after field changes
    await page.waitForTimeout(500);
  }

  // ── Close modal helper ─────────────────────────────────────────────────
  async function closeModal() {
    await page.evaluate(() => {
      const btn = document.querySelector(
        'button[aria-label*="Dismiss"], button[data-test-modal-close-btn]'
      );
      if (btn) btn.click();
    });
    await page.waitForTimeout(1000);
  }

  // ── Apply to a single job ──────────────────────────────────────────────
  async function applyToJob(job, jobIndex) {
    console.log(`\n🔍 [${stats.totalProcessed + 1}] Processing: ${job.title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   Location: ${job.location}`);

    try {
      if (job.alreadyApplied) {
        console.log('   ⚠️  SKIPPED: Already applied');
        stats.skipped++;
        return { status: 'skipped', reason: 'Already applied', job };
      }

      if (!job.hasEasyApply) {
        console.log('   ⚠️  SKIPPED: Not an Easy Apply job');
        stats.skipped++;
        return { status: 'skipped', reason: 'Not Easy Apply', job };
      }

      // Click the Easy Apply button on the job card
      const clicked = await page.evaluate((index) => {
        const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
        const card = cards[index];
        if (!card) return false;
        const btn = card.querySelector('button[aria-label*="Easy Apply"]');
        if (btn) { btn.click(); return true; }
        return false;
      }, jobIndex);

      if (!clicked) {
        // Try clicking the card first so the detail pane loads, then find the button there
        await page.evaluate((index) => {
          const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
          if (cards[index]) cards[index].click();
        }, jobIndex);
        await page.waitForTimeout(2000);

        const clickedDetailPane = await page.evaluate(() => {
          const btn = document.querySelector(
            '.jobs-apply-button--top-card button[aria-label*="Easy Apply"], ' +
            '.jobs-s-apply button[aria-label*="Easy Apply"]'
          );
          if (btn) { btn.click(); return true; }
          return false;
        });

        if (!clickedDetailPane) {
          console.log('   ⚠️  SKIPPED: Easy Apply button not found');
          stats.skipped++;
          return { status: 'skipped', reason: 'No Easy Apply button', job };
        }
      }

      await page.waitForTimeout(2000);

      const modalOpen = await page.evaluate(() =>
        !!document.querySelector('[role="dialog"], .jobs-easy-apply-modal')
      );

      if (!modalOpen) {
        console.log('   ⚠️  SKIPPED: Easy Apply modal did not open');
        stats.skipped++;
        return { status: 'skipped', reason: 'Modal did not open', job };
      }

      // ── Step loop — fill defaults then advance ─────────────────────────
      const maxSteps = 10;
      for (let step = 1; step <= maxSteps; step++) {
        // Fill any empty form fields before checking buttons
        await fillFormDefaults();

        const hasSubmit = await page.evaluate(() =>
          !!Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent.includes('Submit application') ||
            b.textContent.trim() === 'Submit' ||
            b.getAttribute('aria-label')?.includes('Submit')
          )
        );

        if (hasSubmit) {
          await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
              b.textContent.includes('Submit application') ||
              b.textContent.trim() === 'Submit' ||
              b.getAttribute('aria-label')?.includes('Submit')
            );
            if (btn) btn.click();
          });

          await page.waitForTimeout(2500);

          const success = await page.evaluate(() => {
            const t = document.body.textContent;
            return t.includes('Application sent') ||
                   t.includes('Your application was sent') ||
                   t.includes('Application submitted');
          });

          await closeModal();

          if (success) {
            console.log('   ✅ SUCCESS: Application submitted');
            stats.successful++;
            return { status: 'success', job };
          } else {
            console.log('   ❌ FAILED: Submission not confirmed');
            stats.failed++;
            return { status: 'failed', reason: 'Submission not confirmed', job };
          }
        }

        const hasNext = await page.evaluate(() =>
          !!Array.from(document.querySelectorAll('button')).find(b =>
            b.textContent.trim() === 'Next' ||
            b.textContent.includes('Continue') ||
            b.getAttribute('aria-label')?.includes('next step')
          )
        );

        if (hasNext) {
          await page.evaluate(() => {
            const btn = Array.from(document.querySelectorAll('button')).find(b =>
              b.textContent.trim() === 'Next' ||
              b.textContent.includes('Continue') ||
              b.getAttribute('aria-label')?.includes('next step')
            );
            if (btn) btn.click();
          });
          await page.waitForTimeout(1500);
          continue;
        }

        // No Submit or Next — truly unhandled state; bail
        console.log(`   ❌ FAILED: No actionable button found at step ${step}`);
        await closeModal();
        stats.failed++;
        return { status: 'failed', reason: `No button at step ${step}`, job };
      }

      // Exceeded max steps
      console.log('   ❌ FAILED: Exceeded max steps');
      await closeModal();
      stats.failed++;
      return { status: 'failed', reason: 'Exceeded max steps', job };

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);
      try { await closeModal(); } catch (e) { /* ignore */ }
      stats.failed++;
      return { status: 'error', reason: error.message, job };
    }
  }

  // ── Collect jobs from current page ────────────────────────────────────
  async function collectJobsFromPage() {
    return page.evaluate(() => {
      const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      return Array.from(cards).map((card, index) => {
        const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link');
        const companyEl = card.querySelector('.job-card-container__company-name, .job-card-container__primary-description');
        const locationEl = card.querySelector('.job-card-container__metadata-item, [class*="location"]');
        const footerEl = card.querySelector('[class*="applied"], .job-card-container__footer-item');
        const footerText = footerEl ? footerEl.textContent : '';

        return {
          index,
          title: (titleEl?.textContent?.trim() || 'Unknown').substring(0, 80),
          company: (companyEl?.textContent?.trim() || 'Unknown').substring(0, 50),
          location: (locationEl?.textContent?.trim() || 'Unknown').substring(0, 50),
          hasEasyApply: !!card.querySelector('button[aria-label*="Easy Apply"]'),
          alreadyApplied: footerText.includes('Applied') || footerText.includes('applied')
        };
      });
    });
  }

  // ── Main loop ──────────────────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('🚀 LinkedIn Auto-Apply (Easy Apply only)');
  console.log(`   Target Applications: ${targetApplications}`);
  console.log(`   Start Page         : ${startPage}`);
  console.log(`   Max Pages          : ${maxPages}`);
  console.log(`   Search Keywords    : ${searchKeywords}`);
  console.log(`   Location           : ${location}`);
  console.log('   Controls           : P=Pause | R=Resume | Q=Quit');
  console.log('='.repeat(70) + '\n');

  const runStart = Date.now();
  let currentPage = startPage;
  const endPage = startPage + maxPages - 1;

  // Always enable the Easy Apply filter (f_AL=true)
  const params = new URLSearchParams({
    keywords: searchKeywords,
    location: location,
    f_AL: 'true'
  });
  const baseUrl = 'https://www.linkedin.com/jobs/search/';

  while (currentPage <= endPage && stats.successful < targetApplications && !shouldQuit) {
    if (await checkKeyboardState()) break;

    console.log(`\n📄 [Page ${currentPage}]`);
    await updateStatus(`Page ${currentPage} | Apps: ${stats.successful}/${targetApplications}`, '#0a66c2');

    const pageUrl = `${baseUrl}?${params.toString()}&start=${(currentPage - 1) * 25}`;
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    const jobs = await collectJobsFromPage();
    console.log(`   Found ${jobs.length} jobs on this page`);

    if (jobs.length === 0) {
      console.log('   No more jobs found. Stopping.');
      break;
    }

    const pageStats = { pageNumber: currentPage, successful: 0, failed: 0, skipped: 0 };

    for (let i = 0; i < jobs.length && stats.successful < targetApplications && !shouldQuit; i++) {
      if (await checkKeyboardState()) break;

      await updateStatus(
        `Page ${currentPage} | Job ${i + 1}/${jobs.length}\nApps: ${stats.successful}/${targetApplications}`,
        '#0a66c2'
      );

      const result = await applyToJob(jobs[i], i);
      stats.totalProcessed++;

      if (result.status === 'success') {
        pageStats.successful++;
        if (stats.successful >= targetApplications) {
          console.log(`\n🎯 Target reached! ${stats.successful} applications submitted.`);
          break;
        }
      } else if (result.status === 'skipped') {
        pageStats.skipped++;
      } else {
        pageStats.failed++;
      }

      const delay = delayMin + Math.random() * (delayMax - delayMin);
      console.log(`   ⏱️  Waiting ${(delay / 1000).toFixed(1)}s...`);
      await page.waitForTimeout(delay);
    }

    stats.pages.push(pageStats);
    console.log(
      `   Page ${currentPage} summary: ` +
      `${pageStats.successful} success, ${pageStats.failed} failed, ${pageStats.skipped} skipped`
    );

    currentPage++;
  }

  // ── Final summary ──────────────────────────────────────────────────────
  const durationSec = ((Date.now() - runStart) / 1000).toFixed(1);

  console.log('\n' + '='.repeat(70));
  console.log('📊 Final Summary');
  console.log('='.repeat(70));
  console.log(`   Total Processed        : ${stats.totalProcessed}`);
  console.log(`   ✅ Successfully Applied: ${stats.successful}`);
  console.log(`   ⚠️  Skipped            : ${stats.skipped}`);
  console.log(`   ❌ Failed              : ${stats.failed}`);
  console.log(`   ⏱️  Duration           : ${durationSec}s`);
  console.log(`   🎯 Target Reached      : ${stats.successful >= targetApplications ? 'YES' : 'NO'}`);
  console.log('='.repeat(70) + '\n');

  await updateStatus(
    `✅ Complete: ${stats.successful}/${targetApplications} applications`,
    '#057642'
  );

  await page.evaluate(() => {
    if (window.linkedinKeyboardHandler) {
      document.removeEventListener('keydown', window.linkedinKeyboardHandler);
      window.linkedinKeyboardHandler = null;
    }
  });

  return stats;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { autoApplyLinkedInJobs };
}
