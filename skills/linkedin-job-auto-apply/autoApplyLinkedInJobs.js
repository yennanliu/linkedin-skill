/**
 * LinkedIn Job Auto-Apply Automation Script
 *
 * Features:
 * - Robust "Easy Apply" detection using multiple selector strategies.
 * - Explicit filter activation: Automatically toggles "Easy Apply" if no jobs are found.
 * - Intelligent modal navigation: Handles single and multi-step applications.
 * - Questionnaire support: Fills fields with sensible default values to prevent skips.
 * - Keyboard controls: P=Pause, R=Resume, Q=Quit.
 * - Status indicator: On-page overlay showing real-time progress.
 *
 * Usage:
 * ```javascript
 * await autoApplyLinkedInJobs(page, {
 *   targetApplications: 20,
 *   searchKeywords: 'software engineer',
 *   location: 'United States'
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
    delayMin = 3000,
    delayMax = 5000
  } = options;

  const stats = { successful: 0, failed: 0, skipped: 0, totalProcessed: 0 };
  let isPaused = false;
  let shouldQuit = false;

  // ── Setup State and UI ──────────────────────────────────────────────────
  async function setupPageState() {
    await page.evaluate(() => {
      if (!window.linkedinAutoApplyState) {
        window.linkedinAutoApplyState = { isPaused: false, shouldQuit: false };
        window.linkedinKeyboardHandler = (e) => {
          if (e.key === 'p' || e.key === 'P') window.linkedinAutoApplyState.isPaused = true;
          else if (e.key === 'r' || e.key === 'R') window.linkedinAutoApplyState.isPaused = false;
          else if (e.key === 'q' || e.key === 'Q') window.linkedinAutoApplyState.shouldQuit = true;
        };
        document.addEventListener('keydown', window.linkedinKeyboardHandler);
      }
      
      let div = document.getElementById('linkedin-auto-apply-status');
      if (!div) {
        div = document.createElement('div');
        div.id = 'linkedin-auto-apply-status';
        div.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #0a66c2; color: white; padding: 15px; border-radius: 8px; z-index: 9999; font-family: sans-serif; box-shadow: 0 4px 10px rgba(0,0,0,0.3); min-width: 180px;';
        div.innerHTML = '<b>LinkedIn Auto-Apply</b><div id="ln-status">Init...</div><div style="font-size:10px;margin-top:5px;opacity:0.8">P:Pause | R:Resume | Q:Quit</div>';
        document.body.appendChild(div);
      }
    });
  }

  async function updateStatus(txt, color = '#0a66c2') {
    await page.evaluate(({ t, c }) => {
      const el = document.getElementById('ln-status');
      const div = document.getElementById('linkedin-auto-apply-status');
      if (el) el.textContent = t;
      if (div) div.style.background = c;
    }, { t: txt, c: color });
  }

  async function checkState() {
    const state = await page.evaluate(() => window.linkedinAutoApplyState || { isPaused: false, shouldQuit: false });
    isPaused = state.isPaused;
    shouldQuit = state.shouldQuit;
    while (isPaused && !shouldQuit) {
      await updateStatus('⏸️ PAUSED (Press R)', '#ff9500');
      await page.waitForTimeout(1000);
      const s = await page.evaluate(() => window.linkedinAutoApplyState);
      isPaused = s.isPaused;
      shouldQuit = s.shouldQuit;
    }
    return shouldQuit;
  }

  // ── Form Filling Logic ──────────────────────────────────────────────────
  async function fillFormDefaults() {
    await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"]');
      if (!modal) return;

      // Fill text inputs
      modal.querySelectorAll('input[type="text"], input[type="tel"], textarea').forEach(el => {
        if (el.value.trim()) return;
        const label = (el.labels?.[0]?.innerText || el.ariaLabel || '').toLowerCase();
        if (label.includes('phone') || label.includes('mobile')) el.value = '5550123456';
        else if (label.includes('experience') || label.includes('years')) el.value = '3';
        else el.value = 'N/A';
        el.dispatchEvent(new Event('input', { bubbles: true }));
      });

      // Handle radio buttons
      const radioGroups = {};
      modal.querySelectorAll('input[type="radio"]').forEach(r => {
        if (!radioGroups[r.name]) radioGroups[r.name] = [];
        radioGroups[r.name].push(r);
      });
      Object.values(radioGroups).forEach(group => {
        if (!group.some(r => r.checked)) {
          group[0].click();
        }
      });

      // Handle dropdowns
      modal.querySelectorAll('select').forEach(s => {
        if (!s.value) {
          const validOption = Array.from(s.options).find(o => o.value && !o.disabled);
          if (validOption) {
            s.value = validOption.value;
            s.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      });
    });
  }

  // ── Main Logic ──────────────────────────────────────────────────────────
  console.log('🚀 Starting LinkedIn Auto-Apply...');
  let currentPage = startPage;

  while (currentPage < startPage + maxPages && stats.successful < targetApplications) {
    if (await checkState()) break;

    const kw = encodeURIComponent(searchKeywords);
    const loc = encodeURIComponent(location);
    const url = `https://www.linkedin.com/jobs/search/?keywords=${kw}&location=${loc}&f_AL=true&start=${(currentPage - 1) * 25}`;
    
    await page.goto(url, { waitUntil: 'load', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(5000);
    await setupPageState();

    // Ensure Easy Apply filter is truly on
    const needsFilter = await page.evaluate(() => {
      const activeFilters = document.querySelector('.jobs-search-results-list__subtitle');
      return !document.body.innerText.includes('Easy Apply filter');
    });

    if (needsFilter) {
      await updateStatus('Adjusting filters...');
      await page.evaluate(() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => x.innerText.includes('All filters'));
        b?.click();
      });
      await page.waitForTimeout(2000);
      await page.evaluate(() => {
        const ea = Array.from(document.querySelectorAll('label, span, p')).find(l => l.innerText.trim() === 'Easy Apply');
        ea?.click();
      });
      await page.waitForTimeout(1000);
      await page.evaluate(() => {
        const show = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Show') && b.innerText.includes('results'));
        show?.click();
      });
      await page.waitForTimeout(4000);
    }

    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      return Array.from(cards).map((c, i) => ({
        index: i,
        title: c.querySelector('.job-card-list__title')?.innerText || 'Unknown',
        hasEasyApply: c.innerText.includes('Easy Apply'),
        alreadyApplied: c.innerText.includes('Applied') || c.innerText.includes('applied')
      }));
    });

    if (jobs.length === 0) {
      console.log('No jobs found on page', currentPage);
      break;
    }

    for (const job of jobs) {
      if (await checkState() || stats.successful >= targetApplications) break;

      if (job.alreadyApplied || !job.hasEasyApply) {
        stats.skipped++;
        continue;
      }

      await updateStatus(`Job: ${job.title.substring(0, 15)}... (${stats.successful}/${targetApplications})`);
      
      try {
        // Load job details
        await page.evaluate((idx) => {
          const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
          cards[idx]?.querySelector('a')?.click();
        }, job.index);
        await page.waitForTimeout(2000);

        // Click Easy Apply
        const clicked = await page.evaluate(() => {
          const btn = Array.from(document.querySelectorAll('button')).find(b => b.innerText.includes('Easy Apply') || b.ariaLabel?.includes('Easy Apply'));
          if (btn) { btn.click(); return true; }
          return false;
        });

        if (!clicked) { stats.skipped++; continue; }
        await page.waitForTimeout(3000);

        // Step through modal
        let step = 0;
        let jobApplied = false;
        while (step < 10) {
          step++;
          const modal = await page.evaluate(() => !!document.querySelector('[role="dialog"]'));
          if (!modal) break;

          await fillFormDefaults();

          const action = await page.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const submit = btns.find(b => b.innerText.trim() === 'Submit application' || b.innerText.trim() === 'Submit');
            if (submit) { submit.click(); return 'submitted'; }
            const next = btns.find(b => b.innerText.includes('Next') || b.innerText.includes('Continue') || b.innerText.includes('Review'));
            if (next) { next.click(); return 'next'; }
            return 'stuck';
          });

          if (action === 'submitted') {
            await page.waitForTimeout(4000);
            jobApplied = true;
            await page.evaluate(() => document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]')?.click());
            break;
          }
          if (action === 'stuck') {
            await page.evaluate(() => document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]')?.click());
            break;
          }
          await page.waitForTimeout(2500);
        }

        if (jobApplied) {
          stats.successful++;
          console.log(`✅ Applied: ${job.title}`);
        } else {
          stats.failed++;
        }
      } catch (err) {
        stats.failed++;
      }
      
      stats.totalProcessed++;
      await page.waitForTimeout(delayMin + Math.random() * (delayMax - delayMin));
    }
    currentPage++;
  }

  await updateStatus(`✅ Finished: ${stats.successful} apps`, '#057642');
  console.log('🏁 Automation complete.', stats);
  return stats;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { autoApplyLinkedInJobs };
}
