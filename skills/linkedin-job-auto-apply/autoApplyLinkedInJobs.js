/**
 * LinkedIn Job Auto-Apply Automation Script
 *
 * Features:
 * - Target-based execution (stops after N successful applications)
 * - Keyboard controls: P=Pause, R=Resume, Q=Quit
 * - On-page status indicator
 * - Easy Apply automation
 * - Human-like delays
 * - Comprehensive error handling
 *
 * Usage:
 * ```javascript
 * await autoApplyLinkedInJobs(page, {
 *   startPage: 1,
 *   targetApplications: 20,
 *   maxPages: 20,
 *   searchKeywords: 'software engineer',
 *   location: 'United States',
 *   easyApplyOnly: true
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
    easyApplyOnly = true,
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
    window.linkedinAutoApplyState = {
      isPaused: false,
      shouldQuit: false
    };

    // Remove existing listener if any
    if (window.linkedinKeyboardHandler) {
      document.removeEventListener('keydown', window.linkedinKeyboardHandler);
    }

    // Add keyboard event listener
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
    // Remove existing indicator if any
    const existing = document.getElementById('linkedin-auto-apply-status');
    if (existing) existing.remove();

    // Create status indicator
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
      <div style="margin-top: 8px; font-size: 12px; opacity: 0.9;">
        P=Pause | R=Resume | Q=Quit
      </div>
    `;
    document.body.appendChild(statusDiv);
  });

  // Helper: Update status indicator
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

  // Helper: Check keyboard state
  async function checkKeyboardState() {
    const state = await page.evaluate(() => window.linkedinAutoApplyState);
    isPaused = state.isPaused;
    shouldQuit = state.shouldQuit;

    // Wait while paused
    while (isPaused && !shouldQuit) {
      await updateStatus('⏸️ PAUSED', '#ff9500');
      await page.waitForTimeout(1000);
      const newState = await page.evaluate(() => window.linkedinAutoApplyState);
      isPaused = newState.isPaused;
      shouldQuit = newState.shouldQuit;
    }

    return shouldQuit;
  }

  // Helper: Apply to a single job
  async function applyToJob(job, jobIndex) {
    console.log(`\n🔍 [${stats.totalProcessed + 1}] Processing: ${job.title}`);
    console.log(`   Company: ${job.company}`);
    console.log(`   Location: ${job.location}`);

    let result;
    try {
      // Check if already applied
      if (job.alreadyApplied) {
        console.log('   ⚠️  SKIPPED: Already applied');
        result = { status: 'skipped', reason: 'Already applied', job };
        stats.skipped++;
        return result;
      }

      // Check if has Easy Apply
      if (easyApplyOnly && !job.hasEasyApply) {
        console.log('   ⚠️  SKIPPED: Not an Easy Apply job');
        result = { status: 'skipped', reason: 'Not Easy Apply', job };
        stats.skipped++;
        return result;
      }

      // Click Easy Apply button
      const easyApplyClicked = await page.evaluate((index) => {
        const jobCards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
        const card = jobCards[index];
        if (!card) return false;

        const easyApplyButton = card.querySelector('button[aria-label*="Easy Apply"], button:has-text("Easy Apply")');
        if (easyApplyButton) {
          easyApplyButton.click();
          return true;
        }
        return false;
      }, jobIndex);

      if (!easyApplyClicked) {
        console.log('   ⚠️  SKIPPED: Easy Apply button not found');
        result = { status: 'skipped', reason: 'No Easy Apply button', job };
        stats.skipped++;
        return result;
      }

      // Wait for Easy Apply modal
      await page.waitForTimeout(2000);

      // Check if modal opened
      const modalOpen = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"], .jobs-easy-apply-modal');
        return !!modal;
      });

      if (!modalOpen) {
        console.log('   ⚠️  SKIPPED: Easy Apply modal did not open');
        result = { status: 'skipped', reason: 'Modal did not open', job };
        stats.skipped++;
        return result;
      }

      // Handle Easy Apply modal (single-step or multi-step)
      let currentStep = 0;
      const maxSteps = 5;

      while (currentStep < maxSteps) {
        currentStep++;

        // Check for Submit button (final step)
        const hasSubmitButton = await page.evaluate(() => {
          const submitButton = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent.includes('Submit application') ||
                         btn.textContent.trim() === 'Submit' ||
                         btn.getAttribute('aria-label')?.includes('Submit'));
          return !!submitButton;
        });

        if (hasSubmitButton) {
          // Click Submit
          await page.evaluate(() => {
            const submitButton = Array.from(document.querySelectorAll('button'))
              .find(btn => btn.textContent.includes('Submit application') ||
                           btn.textContent.trim() === 'Submit' ||
                           btn.getAttribute('aria-label')?.includes('Submit'));
            if (submitButton) submitButton.click();
          });

          await page.waitForTimeout(2500);

          // Verify success
          const success = await page.evaluate(() => {
            const successText = document.body.textContent;
            return successText.includes('Application sent') ||
                   successText.includes('Your application was sent') ||
                   successText.includes('Application submitted');
          });

          // Close modal
          await page.evaluate(() => {
            const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
            if (closeButton) closeButton.click();
          });
          await page.waitForTimeout(1000);

          if (success) {
            console.log('   ✅ SUCCESS: Application submitted');
            result = { status: 'success', job };
            stats.successful++;
            return result;
          } else {
            console.log('   ❌ FAILED: Submission not confirmed');
            result = { status: 'failed', reason: 'Submission not confirmed', job };
            stats.failed++;
            return result;
          }
        }

        // Check for Next button (multi-step)
        const hasNextButton = await page.evaluate(() => {
          const nextButton = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent.trim() === 'Next' ||
                         btn.textContent.includes('Continue') ||
                         btn.getAttribute('aria-label')?.includes('next step'));
          return !!nextButton;
        });

        if (hasNextButton) {
          // Click Next
          await page.evaluate(() => {
            const nextButton = Array.from(document.querySelectorAll('button'))
              .find(btn => btn.textContent.trim() === 'Next' ||
                           btn.textContent.includes('Continue') ||
                           btn.getAttribute('aria-label')?.includes('next step'));
            if (nextButton) nextButton.click();
          });

          await page.waitForTimeout(1500);
          continue;
        }

        // Neither Submit nor Next found - requires additional info
        console.log(`   ⚠️  SKIPPED: Requires additional information (step ${currentStep})`);

        // Close modal
        await page.evaluate(() => {
          const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
          if (closeButton) closeButton.click();
        });
        await page.waitForTimeout(1000);

        result = { status: 'skipped', reason: 'Requires additional information', job };
        stats.skipped++;
        return result;
      }

      // Exceeded max steps
      console.log('   ❌ FAILED: Too many steps');

      // Close modal
      await page.evaluate(() => {
        const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
        if (closeButton) closeButton.click();
      });
      await page.waitForTimeout(1000);

      result = { status: 'failed', reason: 'Too many steps', job };
      stats.failed++;
      return result;

    } catch (error) {
      console.log(`   ❌ ERROR: ${error.message}`);

      // Try to close modal
      try {
        await page.evaluate(() => {
          const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
          if (closeButton) closeButton.click();
        });
        await page.waitForTimeout(1000);
      } catch (e) {
        // Ignore cleanup errors
      }

      result = { status: 'error', reason: error.message, job };
      stats.failed++;
      return result;
    }
  }

  // Helper: Collect jobs from current page
  async function collectJobsFromPage() {
    const jobs = await page.evaluate(() => {
      const jobCards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      const jobList = [];

      jobCards.forEach((card, index) => {
        const titleElement = card.querySelector('.job-card-list__title, .job-card-container__link');
        const title = titleElement ? titleElement.textContent.trim() : 'Unknown';

        const companyElement = card.querySelector('.job-card-container__company-name, .job-card-container__primary-description');
        const company = companyElement ? companyElement.textContent.trim() : 'Unknown';

        const locationElement = card.querySelector('.job-card-container__metadata-item, [class*="location"]');
        const location = locationElement ? locationElement.textContent.trim() : 'Unknown';

        const easyApplyButton = card.querySelector('button[aria-label*="Easy Apply"], button:has-text("Easy Apply")');
        const hasEasyApply = !!easyApplyButton;

        const appliedIndicator = card.querySelector('[class*="applied"], .job-card-container__footer-item');
        const appliedText = appliedIndicator ? appliedIndicator.textContent : '';
        const alreadyApplied = appliedText.includes('Applied') || appliedText.includes('applied');

        jobList.push({
          index,
          title: title.substring(0, 80),
          company: company.substring(0, 50),
          location: location.substring(0, 50),
          hasEasyApply,
          alreadyApplied
        });
      });

      return jobList;
    });

    return jobs;
  }

  // ── Main Automation Loop ───────────────────────────────────────────────
  console.log('\n' + '='.repeat(70));
  console.log('🚀 LinkedIn Auto-Apply Automation');
  console.log(`   Target Applications: ${targetApplications}`);
  console.log(`   Start Page         : ${startPage}`);
  console.log(`   Max Pages          : ${maxPages}`);
  console.log(`   Search Keywords    : ${searchKeywords}`);
  console.log(`   Location           : ${location}`);
  console.log(`   Easy Apply Only    : ${easyApplyOnly}`);
  console.log('   Controls           : P=Pause | R=Resume | Q=Quit');
  console.log('='.repeat(70) + '\n');

  const runStart = Date.now();
  let currentPage = startPage;
  const endPage = startPage + maxPages - 1;

  // Build search URL
  const baseUrl = 'https://www.linkedin.com/jobs/search/';
  const params = new URLSearchParams({
    keywords: searchKeywords,
    location: location,
    ...(easyApplyOnly && { f_AL: 'true' })
  });

  while (currentPage <= endPage && stats.successful < targetApplications && !shouldQuit) {
    // Check for quit/pause
    if (await checkKeyboardState()) break;

    console.log(`\n📄 [Page ${currentPage}]`);
    await updateStatus(`Page ${currentPage} | Apps: ${stats.successful}/${targetApplications}`, '#0a66c2');

    // Navigate to page
    const pageUrl = `${baseUrl}?${params.toString()}&start=${(currentPage - 1) * 25}`;
    await page.goto(pageUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Collect jobs
    const jobs = await collectJobsFromPage();
    console.log(`   Found ${jobs.length} jobs on this page`);

    if (jobs.length === 0) {
      console.log('   No more jobs found. Stopping.');
      break;
    }

    const pageStats = {
      pageNumber: currentPage,
      successful: 0,
      failed: 0,
      skipped: 0
    };

    // Process jobs
    for (let i = 0; i < jobs.length && stats.successful < targetApplications && !shouldQuit; i++) {
      // Check for quit/pause
      if (await checkKeyboardState()) break;

      const job = jobs[i];

      // Update status
      await updateStatus(
        `Page ${currentPage} | Job ${i + 1}/${jobs.length}\nApps: ${stats.successful}/${targetApplications}`,
        '#0a66c2'
      );

      // Apply to job
      const result = await applyToJob(job, i);
      stats.totalProcessed++;

      if (result.status === 'success') {
        pageStats.successful++;

        // Check if reached target
        if (stats.successful >= targetApplications) {
          console.log(`\n🎯 Target reached! ${stats.successful} successful applications`);
          break;
        }
      } else if (result.status === 'skipped') {
        pageStats.skipped++;
      } else {
        pageStats.failed++;
      }

      // Human-like delay between jobs
      const delay = delayMin + Math.random() * (delayMax - delayMin);
      console.log(`   ⏱️  Waiting ${(delay / 1000).toFixed(1)}s before next job...`);
      await page.waitForTimeout(delay);
    }

    stats.pages.push(pageStats);
    console.log(`   Page ${currentPage} Summary: ${pageStats.successful} success, ${pageStats.failed} failed, ${pageStats.skipped} skipped`);

    currentPage++;
  }

  // ── Final Summary ──────────────────────────────────────────────────────
  const runEnd = Date.now();
  const durationSec = ((runEnd - runStart) / 1000).toFixed(1);

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

  // Update final status
  await updateStatus(
    `✅ Complete: ${stats.successful}/${targetApplications} applications`,
    '#057642'
  );

  // Cleanup keyboard listener
  await page.evaluate(() => {
    if (window.linkedinKeyboardHandler) {
      document.removeEventListener('keydown', window.linkedinKeyboardHandler);
      window.linkedinKeyboardHandler = null;
    }
  });

  return stats;
}

// Export function (if using module system)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { autoApplyLinkedInJobs };
}
