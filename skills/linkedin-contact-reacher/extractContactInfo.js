/**
 * LinkedIn Contact Info Extractor + Email Generator
 *
 * Visits each contact's LinkedIn profile, extracts detailed info,
 * and generates probable email address candidates.
 *
 * Usage:
 * ```javascript
 * const enriched = await extractContactInfo(page, contacts, {
 *   companyDomains: { 'Google': 'google.com', 'Meta': 'meta.com' },
 *   guessPersonalEmail: true,
 *   onlineLookup: true,    // search Hunter.io / emailformat.com / Google for domain
 *   validateEmails: true,  // validate top candidates via mailcheck.ai (free)
 * });
 * ```
 */

// ── Email pattern generators ──────────────────────────────────────────────
function generateEmailCandidates(firstName, lastName, domain) {
  if (!firstName || !lastName || !domain) return [];
  const f  = firstName.toLowerCase().replace(/[^a-z]/g, '');
  const l  = lastName.toLowerCase().replace(/[^a-z]/g, '');
  const fi = f[0] || '';
  const li = l[0] || '';

  // Most common corporate patterns, ordered by prevalence across industries
  return [
    `${f}.${l}@${domain}`,          // john.smith@company.com  (most common)
    `${fi}${l}@${domain}`,           // jsmith@company.com
    `${f}${l}@${domain}`,            // johnsmith@company.com
    `${f}${li}@${domain}`,           // johns@company.com
    `${f}@${domain}`,                // john@company.com (small companies)
    `${l}.${f}@${domain}`,           // smith.john@company.com
    `${f}_${l}@${domain}`,           // john_smith@company.com
    `${fi}.${l}@${domain}`,          // j.smith@company.com
    `${l}@${domain}`,                // smith@company.com
    `${f}-${l}@${domain}`,           // john-smith@company.com
  ];
}

// ── Parse "First Last" → { firstName, lastName } ─────────────────────────
function parseName(fullName) {
  if (!fullName) return { firstName: null, lastName: null };
  const parts = fullName.trim().split(/\s+/);
  if (parts.length === 1) return { firstName: parts[0], lastName: null };
  return {
    firstName: parts[0],
    lastName:  parts[parts.length - 1],
  };
}

// ── Infer company domain from company name ────────────────────────────────
function inferDomain(companyName, domainMap = {}) {
  if (!companyName) return null;

  // Check user-provided map first
  for (const [name, domain] of Object.entries(domainMap)) {
    if (companyName.toLowerCase().includes(name.toLowerCase())) return domain;
  }

  // Common well-known companies
  const wellKnown = {
    'google':    'google.com',
    'meta':      'meta.com',
    'facebook':  'meta.com',
    'microsoft': 'microsoft.com',
    'apple':     'apple.com',
    'amazon':    'amazon.com',
    'netflix':   'netflix.com',
    'uber':      'uber.com',
    'airbnb':    'airbnb.com',
    'twitter':   'twitter.com',
    'x corp':    'x.com',
    'linkedin':  'linkedin.com',
    'salesforce':'salesforce.com',
    'oracle':    'oracle.com',
    'ibm':       'ibm.com',
    'intel':     'intel.com',
    'nvidia':    'nvidia.com',
    'stripe':    'stripe.com',
    'shopify':   'shopify.com',
    'atlassian': 'atlassian.com',
    'slack':     'slack.com',
    'zoom':      'zoom.us',
    'dropbox':   'dropbox.com',
    'spotify':   'spotify.com',
    'twitter':   'twitter.com',
  };
  const lower = companyName.toLowerCase();
  for (const [key, domain] of Object.entries(wellKnown)) {
    if (lower.includes(key)) return domain;
  }

  // Fallback: slugify company name → company.com
  const slug = companyName
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|company|technologies|technology|group|solutions|services)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();
  return slug ? `${slug}.com` : null;
}

// ── Online domain discovery ───────────────────────────────────────────────
// Tries emailformat.com → Hunter.io → Google to find the real email domain/pattern.
// Returns { domain, pattern } or null if nothing found.
async function lookupDomainOnline(page, companyName) {
  const slug = companyName
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|co|company|technologies|technology|group|solutions|services|platforms)\b/g, '')
    .replace(/[^a-z0-9]+/g, '')
    .trim();

  if (!slug) return null;

  // 1. emailformat.com — simple public directory of corporate email patterns
  try {
    await page.goto(`https://www.emailformat.com/${slug}/`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(1000);
    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      // Page shows lines like "john@company.com  100%"
      const domainMatch = text.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const patternMatch = text.match(/([a-z{}.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      return {
        domain:  domainMatch  ? domainMatch[1].toLowerCase()  : null,
        pattern: patternMatch ? patternMatch[1].toLowerCase() : null,
      };
    });
    if (result.domain && !result.domain.includes('emailformat.com')) return result;
  } catch (_) {}

  // 2. Hunter.io public company page
  try {
    await page.goto(`https://hunter.io/companies/${slug}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(1200);
    const result = await page.evaluate(() => {
      const text = document.body.innerText;
      const domainMatch  = text.match(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      const patternMatch = text.match(/([a-z{}.]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
      return {
        domain:  domainMatch  ? domainMatch[1].toLowerCase()  : null,
        pattern: patternMatch ? patternMatch[1].toLowerCase() : null,
      };
    });
    if (result.domain && !result.domain.includes('hunter.io')) return result;
  } catch (_) {}

  // 3. Google search fallback — extract first @domain.com mention from results
  try {
    const q = encodeURIComponent(`"${companyName}" employee email format site:hunter.io OR site:emailformat.com OR site:rocketreach.co`);
    await page.goto(`https://www.google.com/search?q=${q}`, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await page.waitForTimeout(1200);
    const result = await page.evaluate((name) => {
      const text = document.body.innerText;
      // Avoid matching google.com itself
      const matches = [...text.matchAll(/@([a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g)]
        .map(m => m[1].toLowerCase())
        .filter(d => !d.includes('google') && !d.includes('gstatic') && !d.includes('schema'));
      return matches.length > 0 ? { domain: matches[0], pattern: null } : null;
    }, companyName);
    if (result) return result;
  } catch (_) {}

  return null;
}

// ── Email validation via mailcheck.ai (free, no key required) ────────────
// Validates top N candidates. Returns array of { email, valid, mx, status }.
async function validateEmailCandidates(page, candidates, { maxValidate = 3 } = {}) {
  const validated = [];

  for (let i = 0; i < candidates.length; i++) {
    const email = candidates[i];
    if (i < maxValidate) {
      try {
        await page.goto(
          `https://api.mailcheck.ai/email/${encodeURIComponent(email)}`,
          { waitUntil: 'domcontentloaded', timeout: 10000 }
        );
        await page.waitForTimeout(400);
        const json = await page.evaluate(() => {
          try { return JSON.parse(document.body.innerText); } catch { return null; }
        });
        validated.push({
          email,
          valid:      json?.status === 'valid',
          mx:         json?.mx       ?? null,
          disposable: json?.disposable ?? false,
          status:     json?.status    ?? 'unknown',
        });
      } catch (_) {
        validated.push({ email, valid: null, mx: null, status: 'error' });
      }
      await page.waitForTimeout(300);
    } else {
      validated.push({ email, valid: null, mx: null, status: 'not_checked' });
    }
  }

  return validated;
}

// ── Visit a single profile and extract all available data ────────────────
async function extractSingleContact(page, profileUrl, options = {}) {
  const {
    companyDomains  = {},
    guessPersonalEmail = false,
    onlineLookup    = false,
    validateEmails  = false,
    delayMin = 2000,
    delayMax = 4000,
  } = options;

  try {
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(2500);

    // Scroll to trigger lazy-loaded sections
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight / 3));
    await page.waitForTimeout(600);
    await page.evaluate(() => {
      const el = document.querySelector('#experience');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(800);

    const data = await page.evaluate(() => {
      const text = el => el ? el.textContent.trim() : null;
      const first = sel => text(document.querySelector(sel));

      // Basic info
      const name     = first('h1');
      const headline = first('.text-body-medium.break-words');
      const location = first('.text-body-small.inline.t-black--light.break-words');

      // Email: LinkedIn sometimes shows it in the contact info section
      const emailEl = document.querySelector(
        'a[href^="mailto:"], ' +
        '[data-field="email"] a, ' +
        '.pv-contact-info__contact-type a[href^="mailto:"]'
      );
      const publicEmail = emailEl
        ? (emailEl.href || '').replace('mailto:', '').trim() || emailEl.textContent.trim()
        : null;

      // Website / personal links
      const websiteEls = document.querySelectorAll(
        '.pv-contact-info__contact-type a[href]:not([href^="mailto:"]):not([href*="linkedin.com"])'
      );
      const websites = Array.from(websiteEls).map(a => a.href).filter(Boolean);

      // Experience — current job
      const expSection = document.querySelector('#experience');
      let currentCompany = null;
      let currentTitle   = null;
      const workHistory  = [];

      if (expSection) {
        const parentSection = expSection.closest('section') || expSection.parentElement;
        const items = parentSection
          ? parentSection.querySelectorAll('li.artdeco-list__item')
          : [];

        items.forEach(item => {
          const boldEl    = item.querySelector('.t-bold span[aria-hidden="true"], .mr1.t-bold span[aria-hidden="true"]');
          const normalEls = item.querySelectorAll('.t-14.t-normal span[aria-hidden="true"]');
          const lightEls  = item.querySelectorAll('.t-14.t-normal.t-black--light span[aria-hidden="true"]');
          const title   = boldEl           ? boldEl.textContent.trim()   : null;
          const company = normalEls[0]     ? normalEls[0].textContent.trim() : null;
          const dateRange = lightEls[0]   ? lightEls[0].textContent.trim()  : null;
          if (title || company) workHistory.push({ title, company, dateRange });
        });

        if (workHistory.length > 0) {
          currentTitle   = workHistory[0].title;
          currentCompany = workHistory[0].company;
        }
      }

      return { name, headline, location, publicEmail, websites, currentCompany, currentTitle, workHistory, profileUrl: window.location.href };
    });

    // ── Domain resolution ─────────────────────────────────────────────────
    const { firstName, lastName } = parseName(data.name);
    let domain = inferDomain(data.currentCompany, companyDomains);
    let onlinePattern = null;

    // If built-in lookup failed and online lookup is enabled, search external sites
    if (!domain && onlineLookup && data.currentCompany) {
      console.log(`  [Domain] Built-in lookup failed — searching online for "${data.currentCompany}"...`);
      try {
        const found = await lookupDomainOnline(page, data.currentCompany);
        if (found) {
          domain = found.domain;
          onlinePattern = found.pattern;
          console.log(`  [Domain] Found online: ${domain}${onlinePattern ? ` (pattern: ${onlinePattern})` : ''}`);
        }
      } catch (_) {}
      // Restore to LinkedIn profile after external navigation
      try {
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(800);
      } catch (_) {}
    }

    // ── Generate email candidates ──────────────────────────────────────────
    let emailCandidates = domain && firstName && lastName
      ? generateEmailCandidates(firstName, lastName, domain)
      : [];

    // ── Personal email guesses ────────────────────────────────────────────
    const personalEmailCandidates = [];
    if (guessPersonalEmail && firstName && lastName) {
      const f = firstName.toLowerCase().replace(/[^a-z]/g, '');
      const l = lastName.toLowerCase().replace(/[^a-z]/g, '');
      personalEmailCandidates.push(
        `${f}.${l}@gmail.com`,
        `${f}${l}@gmail.com`,
        `${f}.${l}@outlook.com`,
        `${f}${l}@hotmail.com`,
      );
    }

    // If a public email was found on the profile, put it first
    if (data.publicEmail) {
      emailCandidates = [data.publicEmail, ...emailCandidates.filter(e => e !== data.publicEmail)];
    }

    // ── Email validation ───────────────────────────────────────────────────
    let emailCandidatesValidated = null;
    if (validateEmails && emailCandidates.length > 0) {
      console.log(`  [Validate] Checking top email candidates via mailcheck.ai...`);
      try {
        emailCandidatesValidated = await validateEmailCandidates(page, emailCandidates, { maxValidate: 3 });
        // Restore page after validation requests
        await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await page.waitForTimeout(800);
      } catch (_) {}
    }

    return {
      status: 'success',
      ...data,
      firstName,
      lastName,
      companyDomain: domain,
      domainSource: domain
        ? (Object.keys(companyDomains).some(k => (data.currentCompany || '').toLowerCase().includes(k.toLowerCase()))
            ? 'user-provided'
            : onlinePattern ? 'online-lookup' : 'built-in')
        : null,
      onlineEmailPattern: onlinePattern,
      emailCandidates,
      emailCandidatesValidated,
      personalEmailCandidates,
    };

  } catch (err) {
    return { status: 'error', reason: err.message, profileUrl };
  }
}

// ── Batch enrich a list of contacts ─────────────────────────────────────
async function extractContactInfo(page, contacts, options = {}) {
  const { delayMin = 2500, delayMax = 5000 } = options;
  const delay = () => page.waitForTimeout(delayMin + Math.random() * (delayMax - delayMin));

  const enriched = [];
  let idx = 0;

  console.log(`\n[Extract] Enriching ${contacts.length} contacts...`);

  for (const contact of contacts) {
    idx++;
    console.log(`[Extract] [${idx}/${contacts.length}] ${contact.name || contact.profileUrl}`);

    const info = await extractSingleContact(page, contact.profileUrl, options);

    enriched.push({ ...contact, ...info });

    if (info.status === 'success') {
      const validCount = (info.emailCandidatesValidated || []).filter(e => e.valid).length;
      const validNote  = info.emailCandidatesValidated ? ` | ${validCount} valid` : '';
      console.log(`  ✅ ${info.name} @ ${info.currentCompany || '—'} | domain: ${info.companyDomain || '—'} (${info.domainSource || '?'}) | ${info.emailCandidates.length} candidates${validNote}`);
    } else {
      console.log(`  ❌ Failed: ${info.reason}`);
    }

    if (idx < contacts.length) await delay();
  }

  console.log(`\n[Extract] Done. ${enriched.filter(c => c.status === 'success').length}/${contacts.length} enriched.\n`);
  return enriched;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    extractContactInfo, extractSingleContact,
    generateEmailCandidates, inferDomain, parseName,
    lookupDomainOnline, validateEmailCandidates,
  };
}
