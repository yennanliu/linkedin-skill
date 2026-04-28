const { chromium } = require('playwright');
const { scrapeLinkedInProfiles } = require('../skills/linkedin-profile-scraper/scrapeLinkedInProfiles.js');
const fs = require('fs');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const storageState = 'cookies.json';
  
  if (!fs.existsSync(storageState)) {
    console.error('❌ Error: cookies.json not found. Please login first.');
    process.exit(1);
  }

  const context = await browser.newContext({ storageState });
  const page = await context.newPage();

  try {
    console.log('🌐 Navigating to search page...');
    const results = await scrapeLinkedInProfiles(page, {
      company: 'Google',
      keywords: 'Product Manager',
      maxProfiles: 10,
      delayMin: 5000,
      delayMax: 8000
    });

    console.log('\nFinal Results:');
    console.log(JSON.stringify(results, null, 2));
    
    // Save to file for user reference
    fs.writeFileSync('scrape_results.json', JSON.stringify(results, null, 2));
    console.log('\n💾 Results saved to scrape_results.json');

  } catch (error) {
    console.error('❌ Error during scraping:', error);
  } finally {
    await browser.close();
  }
})();
