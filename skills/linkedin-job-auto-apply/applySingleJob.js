/**
 * LinkedIn Single Job Application Helper Functions
 *
 * Usage:
 * 1. Navigate to LinkedIn jobs search page with Easy Apply filter
 * 2. Call listJobs(page) to see available jobs
 * 3. Call applySingleJob(page, jobIndex) to apply to a specific job
 *
 * Example:
 * ```javascript
 * await page.goto('https://www.linkedin.com/jobs/search/?keywords=software%20engineer&f_AL=true');
 * const jobs = await listJobs(page);
 * console.log(jobs);
 * const result = await applySingleJob(page, 0);
 * console.log(result);
 * ```
 */

/**
 * List all Easy Apply jobs on the current search results page
 * @param {Page} page - Playwright page object
 * @returns {Promise<Array>} Array of job objects with title, company, location, etc.
 */
async function listJobs(page) {
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

      // Check for Easy Apply button
      const easyApplyButton = card.querySelector('button[aria-label*="Easy Apply"], button:has-text("Easy Apply")');
      const hasEasyApply = !!easyApplyButton;

      // Check if already applied
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

/**
 * Apply to a single job by index on the current search results page
 * @param {Page} page - Playwright page object
 * @param {number} jobIndex - Index of the job in the search results (0-based)
 * @returns {Promise<Object>} Result object with status and details
 */
async function applySingleJob(page, jobIndex) {
  console.log(`\n🔍 Applying to job at index ${jobIndex}...`);

  try {
    // Get job info
    const jobInfo = await page.evaluate((index) => {
      const jobCards = document.querySelectorAll('.job-card-container, .jobs-search-results__list-item');
      const card = jobCards[index];

      if (!card) return null;

      const titleElement = card.querySelector('.job-card-list__title, .job-card-container__link');
      const title = titleElement ? titleElement.textContent.trim() : 'Unknown';

      const companyElement = card.querySelector('.job-card-container__company-name, .job-card-container__primary-description');
      const company = companyElement ? companyElement.textContent.trim() : 'Unknown';

      const locationElement = card.querySelector('.job-card-container__metadata-item, [class*="location"]');
      const location = locationElement ? locationElement.textContent.trim() : 'Unknown';

      // Check for already applied
      const appliedIndicator = card.querySelector('[class*="applied"], .job-card-container__footer-item');
      const appliedText = appliedIndicator ? appliedIndicator.textContent : '';
      const alreadyApplied = appliedText.includes('Applied') || appliedText.includes('applied');

      return {
        title: title.substring(0, 80),
        company: company.substring(0, 50),
        location: location.substring(0, 50),
        alreadyApplied
      };
    }, jobIndex);

    if (!jobInfo) {
      console.log('   ❌ FAILED: Job not found at index', jobIndex);
      return { status: 'error', reason: 'Job not found', jobIndex };
    }

    console.log(`   Title: ${jobInfo.title}`);
    console.log(`   Company: ${jobInfo.company}`);
    console.log(`   Location: ${jobInfo.location}`);

    // Check if already applied
    if (jobInfo.alreadyApplied) {
      console.log('   ⚠️  SKIPPED: Already applied');
      return { status: 'skipped', reason: 'Already applied', job: jobInfo };
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
      return { status: 'skipped', reason: 'No Easy Apply button', job: jobInfo };
    }

    // Wait for Easy Apply modal to open
    await page.waitForTimeout(2000);

    // Check if modal opened
    const modalOpen = await page.evaluate(() => {
      const modal = document.querySelector('[role="dialog"], .jobs-easy-apply-modal');
      return !!modal;
    });

    if (!modalOpen) {
      console.log('   ⚠️  SKIPPED: Easy Apply modal did not open');
      return { status: 'skipped', reason: 'Modal did not open', job: jobInfo };
    }

    // Handle Easy Apply modal (may be single-step or multi-step)
    let currentStep = 0;
    const maxSteps = 5; // Prevent infinite loop

    while (currentStep < maxSteps) {
      currentStep++;

      // Check for "Submit" button (final step)
      const hasSubmitButton = await page.evaluate(() => {
        const submitButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent.includes('Submit application') ||
                       btn.textContent.trim() === 'Submit' ||
                       btn.getAttribute('aria-label')?.includes('Submit'));
        return !!submitButton;
      });

      if (hasSubmitButton) {
        // Click Submit button
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

        if (success) {
          console.log('   ✅ SUCCESS: Application submitted successfully');

          // Close modal
          await page.evaluate(() => {
            const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
            if (closeButton) closeButton.click();
          });
          await page.waitForTimeout(1000);

          return { status: 'success', job: jobInfo };
        } else {
          console.log('   ❌ FAILED: Application submission not confirmed');
          return { status: 'failed', reason: 'Submission not confirmed', job: jobInfo };
        }
      }

      // Check for "Next" button (multi-step application)
      const hasNextButton = await page.evaluate(() => {
        const nextButton = Array.from(document.querySelectorAll('button'))
          .find(btn => btn.textContent.trim() === 'Next' ||
                       btn.textContent.includes('Continue') ||
                       btn.getAttribute('aria-label')?.includes('next step'));
        return !!nextButton;
      });

      if (hasNextButton) {
        // Click Next button
        await page.evaluate(() => {
          const nextButton = Array.from(document.querySelectorAll('button'))
            .find(btn => btn.textContent.trim() === 'Next' ||
                         btn.textContent.includes('Continue') ||
                         btn.getAttribute('aria-label')?.includes('next step'));
          if (nextButton) nextButton.click();
        });

        await page.waitForTimeout(1500);
        continue; // Go to next step
      }

      // If neither Submit nor Next button found, may require additional info
      console.log(`   ⚠️  SKIPPED: Application requires additional information (step ${currentStep})`);

      // Close modal
      await page.evaluate(() => {
        const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
        if (closeButton) closeButton.click();
      });
      await page.waitForTimeout(1000);

      return { status: 'skipped', reason: 'Requires additional information', job: jobInfo };
    }

    // If we exceeded max steps
    console.log('   ❌ FAILED: Too many steps in application');

    // Close modal
    await page.evaluate(() => {
      const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
      if (closeButton) closeButton.click();
    });
    await page.waitForTimeout(1000);

    return { status: 'failed', reason: 'Too many steps', job: jobInfo };

  } catch (error) {
    console.log(`   ❌ ERROR: ${error.message}`);

    // Try to close any open modal
    try {
      await page.evaluate(() => {
        const closeButton = document.querySelector('button[aria-label*="Dismiss"], button[data-test-modal-close-btn]');
        if (closeButton) closeButton.click();
      });
      await page.waitForTimeout(1000);
    } catch (e) {
      // Ignore cleanup errors
    }

    return { status: 'error', reason: error.message, jobIndex };
  }
}

// Export functions (if using module system)
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { listJobs, applySingleJob };
}
