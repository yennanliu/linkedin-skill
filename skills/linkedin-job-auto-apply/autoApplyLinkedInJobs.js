/**
 * LinkedIn Job Auto-Apply Automation Script (Multi-Tab Version)
 *
 * Features:
 * - Isolated application flow: Opens each job in a new tab to preserve search results.
 * - Robust "Easy Apply" detection and form filling.
 * - Intelligent modal navigation: Handles single and multi-step applications.
 * - Keyboard controls: P=Pause, R=Resume, Q=Quit.
 * - Status indicator: On-page overlay showing real-time progress.
 */

async function autoApplyLinkedInJobs(page, options = {}) {
  const {
    startPage = 1,
    targetApplications = 20,
    maxPages = 20,
    searchKeywords = 'software engineer',
    location = 'United States',
    delayMin = 3000,
    delayMax = 5000,
    // userProfile: personal values used when filling Easy Apply form fields.
    // Set these to avoid detectable placeholder values like '0000000000'.
    userProfile = {}
  } = options;

  const formProfile = {
    phone: userProfile.phone || '0000000000',
    linkedinUrl: userProfile.linkedinUrl || 'https://www.linkedin.com/in/me',
    city: userProfile.city || 'Remote',
    zip: userProfile.zip || '00000',
    yearsExp: userProfile.yearsExp || 3,
  };

  // Track processed job URLs to avoid re-applying to the same job on multiple pages
  const processedUrls = new Set();

  const stats = { successful: 0, failed: 0, skipped: 0, totalProcessed: 0 };
  let isPaused = false;
  let shouldQuit = false;

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
    try {
      await page.evaluate(({ t, c }) => {
        const el = document.getElementById('ln-status');
        const div = document.getElementById('linkedin-auto-apply-status');
        if (el) el.textContent = t;
        if (div) div.style.background = c;
      }, { t: txt, c: color });
    } catch (e) {}
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

  async function fillFormDefaults(p) {
    await p.evaluate((fp) => {
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
          input.value = fp.phone;
        } else if (label.includes('linkedin') || label.includes('url') || label.includes('website')) {
          input.value = fp.linkedinUrl;
        } else if (label.includes('city') || label.includes('address')) {
          input.value = fp.city;
        } else if (label.includes('zip') || label.includes('postal')) {
          input.value = fp.zip;
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
          input.value = String(fp.yearsExp);
        } else if (label.includes('salary') || label.includes('rate') || label.includes('compensation')) {
          input.value = '0';
        } else {
          input.value = '1';
        }
        dispatch(input);
      });

      // Native <select> dropdowns
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

      // Radio groups
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

      // Textareas
      modal.querySelectorAll('textarea').forEach(ta => {
        if (ta.value.trim()) return;
        if (ta.required || ta.getAttribute('aria-required') === 'true') {
          ta.value = 'Please see my LinkedIn profile and resume for details.';
          dispatch(ta);
        }
      });
    }, formProfile);
    await p.waitForTimeout(500);
  }

  let currentPage = startPage;
  while (currentPage < startPage + maxPages && stats.successful < targetApplications) {
    if (await checkState()) break;
    const url = `https://www.linkedin.com/jobs/search/?keywords=${encodeURIComponent(searchKeywords)}&location=${encodeURIComponent(location)}&f_AL=true&start=${(currentPage - 1) * 25}`;
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 }).catch(() => {});
    await page.waitForTimeout(5000);
    await setupPageState();

    // Scroll to load all jobs
    await page.evaluate(async () => {
      const el = document.querySelector('.jobs-search-results-list');
      if (el) {
        for (let i = 0; i < 5; i++) {
          el.scrollTop = el.scrollHeight;
          await new Promise(r => setTimeout(r, 1000));
        }
      }
    });

    const jobs = await page.evaluate(() => {
      const cards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      return Array.from(cards).map((c, i) => {
        const titleEl = c.querySelector('.job-card-list__title, .job-card-container__link');
        const linkEl = c.querySelector('a');
        return {
          index: i,
          title: titleEl?.innerText?.trim() || 'Unknown',
          url: linkEl?.href || null,
          hasEasyApply: !!c.querySelector('button[aria-label*="Easy Apply"]') || c.innerText.includes('Easy Apply'),
          alreadyApplied: c.innerText.includes('Applied') || c.innerText.includes('applied')
        };
      });
    });

    if (jobs.length === 0) break;

    for (const job of jobs) {
      if (await checkState() || stats.successful >= targetApplications) break;
      if (job.alreadyApplied || !job.hasEasyApply || !job.url) { stats.skipped++; continue; }
      if (processedUrls.has(job.url)) { stats.skipped++; continue; }
      processedUrls.add(job.url);

      await updateStatus(`Apply: ${job.title.substring(0, 15)}... (${stats.successful}/${targetApplications})`);
      
      const context = page.context();
      const newTab = await context.newPage();
      try {
        await newTab.goto(job.url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await newTab.waitForTimeout(3000);

        const clicked = await newTab.evaluate(() => {
          const btn = document.querySelector('.jobs-apply-button--top-card button[aria-label*="Easy Apply"], .jobs-s-apply button[aria-label*="Easy Apply"]');
          if (btn) { btn.click(); return true; }
          return false;
        });

        if (!clicked) {
          stats.skipped++;
          await newTab.close();
          continue;
        }

        await newTab.waitForTimeout(3000);

        let step = 0;
        let jobApplied = false;
        while (step < 12) {
          step++;
          const modalExists = await newTab.evaluate(() => !!document.querySelector('[role="dialog"]'));
          if (!modalExists) break;

          await fillFormDefaults(newTab);
          const action = await newTab.evaluate(() => {
            const btns = Array.from(document.querySelectorAll('button'));
            const submit = btns.find(b => b.textContent.includes('Submit application') || b.textContent.trim() === 'Submit');
            if (submit) { submit.click(); return 'submitted'; }
            const next = btns.find(b => b.textContent.includes('Next') || b.textContent.includes('Continue') || b.textContent.includes('Review'));
            if (next) { next.click(); return 'next'; }
            return 'none';
          });

          if (action === 'submitted') {
            await newTab.waitForTimeout(4000);
            const success = await newTab.evaluate(() => {
              const t = document.body.textContent;
              return t.includes('Application sent') || t.includes('Your application was sent') || t.includes('Application submitted');
            });
            if (success) jobApplied = true;
            break;
          }
          if (action === 'none') break;
          await newTab.waitForTimeout(2000);
        }
        
        if (jobApplied) {
          stats.successful++;
          console.log(`✅ Applied: ${job.title}`);
        } else {
          stats.failed++;
        }
      } catch (err) {
        stats.failed++;
      } finally {
        await newTab.close();
      }
      
      stats.totalProcessed++;
      await page.waitForTimeout(delayMin + Math.random() * (delayMax - delayMin));
    }
    currentPage++;
  }
  return stats;
}

if (typeof module !== 'undefined' && module.exports) { module.exports = { autoApplyLinkedInJobs }; }
