const { chromium } = require('playwright');
const fs = require('fs');

(async () => {
  console.log('Opening browser for manual login...');
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  await page.goto('https://www.linkedin.com/login');
  
  console.log('Please log in manually in the opened browser.');
  console.log('Once you reach the LinkedIn feed, I will save the session.');

  // Periodically check if we are on the feed page
  const checkInterval = setInterval(async () => {
    try {
      if (page.url().includes('linkedin.com/feed')) {
        console.log('✅ Feed page detected! Saving session...');
        await context.storageState({ path: 'cookies.json' });
        console.log('💾 Session saved to cookies.json');
        clearInterval(checkInterval);
        await browser.close();
        process.exit(0);
      }
    } catch (e) {
      // browser might be closed
      clearInterval(checkInterval);
      process.exit(0);
    }
  }, 2000);

  // Keep process alive
  await new Promise(() => {});
})();
