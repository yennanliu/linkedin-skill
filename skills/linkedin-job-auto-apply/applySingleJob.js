/**
 * LinkedIn Single Job Application Helpers
 *
 * - listJobs()       : lists Easy Apply jobs on the current search results page
 * - applySingleJob() : applies to a specific job by index
 *
 * Both functions apply ONLY to Easy Apply jobs.
 * Questionnaire/form steps are handled by filling fields with sensible
 * default values (text inputs, number inputs, dropdowns, radio buttons).
 *
 * Usage:
 * ```javascript
 * await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
 * const jobs = await listJobs(page);
 * console.log(jobs);
 * const result = await applySingleJob(page, 0);
 * console.log(result);
 * ```
 */

/**
 * Fill all empty form fields in the Easy Apply modal with sensible defaults.
 * Handles: text/email/tel inputs, number inputs, native <select>, radio groups, textareas.
 */
async function fillFormDefaults(page) {
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
      if (input.value.trim()) return;
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
      if (select.value) return;
      const firstReal = Array.from(select.options).find(
        o => o.value && o.value !== '' && !o.disabled
      );
      if (firstReal) {
        select.value = firstReal.value;
        dispatch(select);
      }
    });

    // Radio groups — click first option if none selected
    const radioGroups = {};
    modal.querySelectorAll('input[type="radio"]').forEach(radio => {
      const key =
        radio.name ||
        radio.getAttribute('aria-name') ||
        radio.closest('fieldset')?.id ||
        'unnamed';
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

    // Textareas — fill only if required and empty
    modal.querySelectorAll('textarea').forEach(ta => {
      if (ta.value.trim()) return;
      if (ta.required || ta.getAttribute('aria-required') === 'true') {
        ta.value = 'Please see my LinkedIn profile and resume for details.';
        dispatch(ta);
      }
    });
  });

  // Let React re-render after field changes
  await page.waitForTimeout(500);
}

/**
 * Close the Easy Apply modal if it's open.
 */
async function closeModal(page) {
  await page.evaluate(() => {
    const btn = document.querySelector(
      'button[aria-label*="Dismiss"], button[data-test-modal-close-btn]'
    );
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
}

/**
 * List Easy Apply jobs on the current search results page.
 * @param {Page} page - Playwright page object
 * @returns {Promise<Array>} Array of job objects
 */
async function listJobs(page) {
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

/**
 * Apply to a single Easy Apply job by index.
 * Fills questionnaire fields with defaults rather than skipping.
 * @param {Page} page - Playwright page object
 * @param {number} jobIndex - 0-based index from listJobs()
 * @returns {Promise<Object>} Result: { status, reason?, job }
 */
async function applySingleJob(page, jobIndex) {
  console.log(`\n🔍 Applying to job at index ${jobIndex}...`);

  try {
    // Get job info
    const jobInfo = await page.evaluate((index) => {
      const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      const card = cards[index];
      if (!card) return null;

      const titleEl = card.querySelector('.job-card-list__title, .job-card-container__link');
      const companyEl = card.querySelector('.job-card-container__company-name, .job-card-container__primary-description');
      const locationEl = card.querySelector('.job-card-container__metadata-item, [class*="location"]');
      const footerEl = card.querySelector('[class*="applied"], .job-card-container__footer-item');
      const footerText = footerEl ? footerEl.textContent : '';

      return {
        title: (titleEl?.textContent?.trim() || 'Unknown').substring(0, 80),
        company: (companyEl?.textContent?.trim() || 'Unknown').substring(0, 50),
        location: (locationEl?.textContent?.trim() || 'Unknown').substring(0, 50),
        hasEasyApply: !!card.querySelector('button[aria-label*="Easy Apply"]'),
        alreadyApplied: footerText.includes('Applied') || footerText.includes('applied')
      };
    }, jobIndex);

    if (!jobInfo) {
      console.log('   ❌ Job not found at index', jobIndex);
      return { status: 'error', reason: 'Job not found', jobIndex };
    }

    console.log(`   Title   : ${jobInfo.title}`);
    console.log(`   Company : ${jobInfo.company}`);
    console.log(`   Location: ${jobInfo.location}`);

    if (jobInfo.alreadyApplied) {
      console.log('   ⚠️  SKIPPED: Already applied');
      return { status: 'skipped', reason: 'Already applied', job: jobInfo };
    }

    if (!jobInfo.hasEasyApply) {
      console.log('   ⚠️  SKIPPED: Not an Easy Apply job');
      return { status: 'skipped', reason: 'Not Easy Apply', job: jobInfo };
    }

    // Click the Easy Apply button on the card
    let clicked = await page.evaluate((index) => {
      const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      const card = cards[index];
      if (!card) return false;
      const btn = card.querySelector('button[aria-label*="Easy Apply"]');
      if (btn) { btn.click(); return true; }
      return false;
    }, jobIndex);

    if (!clicked) {
      // Fallback: click the card to load the detail pane, then find the button there
      await page.evaluate((index) => {
        const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
        if (cards[index]) cards[index].click();
      }, jobIndex);
      await page.waitForTimeout(2000);

      clicked = await page.evaluate(() => {
        const btn = document.querySelector(
          '.jobs-apply-button--top-card button[aria-label*="Easy Apply"], ' +
          '.jobs-s-apply button[aria-label*="Easy Apply"]'
        );
        if (btn) { btn.click(); return true; }
        return false;
      });

      if (!clicked) {
        console.log('   ⚠️  SKIPPED: Easy Apply button not found');
        return { status: 'skipped', reason: 'No Easy Apply button', job: jobInfo };
      }
    }

    await page.waitForTimeout(2000);

    const modalOpen = await page.evaluate(() =>
      !!document.querySelector('[role="dialog"], .jobs-easy-apply-modal')
    );

    if (!modalOpen) {
      console.log('   ⚠️  SKIPPED: Easy Apply modal did not open');
      return { status: 'skipped', reason: 'Modal did not open', job: jobInfo };
    }

    // ── Step loop — fill defaults then advance ─────────────────────────
    const maxSteps = 10;
    for (let step = 1; step <= maxSteps; step++) {
      // Fill any empty form fields before checking buttons
      await fillFormDefaults(page);

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

        if (success) {
          console.log('   ✅ SUCCESS: Application submitted');
          await closeModal(page);
          return { status: 'success', job: jobInfo };
        } else {
          console.log('   ❌ FAILED: Submission not confirmed');
          return { status: 'failed', reason: 'Submission not confirmed', job: jobInfo };
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

      // No actionable button found
      console.log(`   ❌ FAILED: No actionable button at step ${step}`);
      await closeModal(page);
      return { status: 'failed', reason: `No button at step ${step}`, job: jobInfo };
    }

    console.log('   ❌ FAILED: Exceeded max steps');
    await closeModal(page);
    return { status: 'failed', reason: 'Exceeded max steps', job: jobInfo };

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);
    try { await closeModal(page); } catch (e) { /* ignore */ }
    return { status: 'error', reason: error.message, jobIndex };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { listJobs, applySingleJob };
}
