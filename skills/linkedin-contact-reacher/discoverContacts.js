/**
 * LinkedIn Contact Discovery — BFS / DFS traversal
 *
 * Discovers LinkedIn contacts systematically starting from a seed
 * (search results or a specific profile's connections), expanding
 * outward level by level (BFS) or depth-first (DFS).
 *
 * Usage:
 * ```javascript
 * const contacts = await discoverContacts(page, {
 *   seeds: [{ type: 'search', company: 'Google', role: 'Engineering Manager' }],
 *   strategy: 'bfs',      // 'bfs' | 'dfs'
 *   maxContacts: 50,
 *   maxDepth: 2,
 *   targetCompanies: ['Google', 'Meta'],
 *   targetRoles: ['engineering manager', 'tech lead'],
 * });
 * ```
 */

async function discoverContacts(page, options = {}) {
  const {
    seeds = [],                  // [{ type: 'search', company, role, keywords } | { type: 'profile', url }]
    strategy = 'bfs',            // 'bfs' (queue) | 'dfs' (stack)
    maxContacts = 30,            // max unique contacts to discover
    maxDepth = 2,                // max BFS/DFS levels from seed
    targetCompanies = [],        // filter: only include these companies (empty = all)
    targetRoles = [],            // filter: only include contacts whose title contains one of these
    delayMin = 3000,
    delayMax = 6000,
    connectionDegree = ['1st', '2nd', '3rd'],  // which connection degrees to include
  } = options;

  const delay = () =>
    page.waitForTimeout(delayMin + Math.random() * (delayMax - delayMin));

  const visited  = new Set();   // profile URLs already processed
  const contacts = [];          // final result list

  // frontier: items of { url, depth, via }
  // BFS uses shift(), DFS uses pop()
  const frontier = [];

  // ── Helper: collect profile URLs from a LinkedIn people-search page ──────
  async function collectSearchUrls(searchUrl) {
    await page.goto(searchUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1500);

    return page.evaluate(() => {
      const links = document.querySelectorAll(
        'a[href*="/in/"][data-control-name="search_srp_result"], ' +
        '.entity-result__title-text a, ' +
        'a[href*="linkedin.com/in/"]'
      );
      const found = new Set();
      links.forEach(a => {
        const m = (a.href || '').match(/linkedin\.com\/in\/([^?/]+)/);
        if (m) found.add('https://www.linkedin.com/in/' + m[1] + '/');
      });
      return [...found];
    });
  }

  // ── Helper: get basic card info (name, title, company, degree) from
  //    search result page without visiting the profile ─────────────────────
  async function collectSearchCards() {
    return page.evaluate(() => {
      const cards = [];
      document.querySelectorAll('.entity-result__item, .reusable-search__result-container')
        .forEach(card => {
          const nameEl  = card.querySelector('.entity-result__title-text a span[aria-hidden="true"]');
          const titleEl = card.querySelector('.entity-result__primary-subtitle');
          const compEl  = card.querySelector('.entity-result__secondary-subtitle');
          const linkEl  = card.querySelector('a[href*="/in/"]');
          const degreeEl = card.querySelector('.dist-value');

          const href = linkEl ? linkEl.href : '';
          const m = href.match(/linkedin\.com\/in\/([^?/]+)/);
          if (!m) return;

          cards.push({
            profileUrl:       'https://www.linkedin.com/in/' + m[1] + '/',
            name:             nameEl  ? nameEl.textContent.trim()  : null,
            title:            titleEl ? titleEl.textContent.trim() : null,
            company:          compEl  ? compEl.textContent.trim()  : null,
            connectionDegree: degreeEl ? degreeEl.textContent.trim() : 'unknown',
          });
        });
      return cards;
    });
  }

  // ── Helper: check if a contact passes role/company filters ──────────────
  function passesFilters(card) {
    if (targetCompanies.length > 0) {
      const co = (card.company || '').toLowerCase();
      if (!targetCompanies.some(t => co.includes(t.toLowerCase()))) return false;
    }
    if (targetRoles.length > 0) {
      const title = (card.title || '').toLowerCase();
      if (!targetRoles.some(r => title.includes(r.toLowerCase()))) return false;
    }
    if (!connectionDegree.includes(card.connectionDegree)) return false;
    return true;
  }

  // ── Seed the frontier ────────────────────────────────────────────────────
  for (const seed of seeds) {
    if (seed.type === 'search') {
      const parts = [seed.keywords, seed.role, seed.company].filter(Boolean);
      const q = encodeURIComponent(parts.join(' '));
      const seedUrl = `https://www.linkedin.com/search/results/people/?keywords=${q}&origin=GLOBAL_SEARCH_HEADER`;

      console.log(`\n[Discover] Seeding from search: "${parts.join(' ')}"`);
      await page.goto(seedUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
      await page.waitForTimeout(3000);

      const cards = await collectSearchCards();
      for (const card of cards) {
        if (!visited.has(card.profileUrl)) {
          frontier.push({ ...card, depth: 0, via: 'seed:search' });
        }
      }
    } else if (seed.type === 'profile') {
      if (!visited.has(seed.url)) {
        frontier.push({ profileUrl: seed.url, depth: 0, via: 'seed:profile', name: null, title: null, company: null, connectionDegree: '1st' });
      }
    }
  }

  console.log(`[Discover] Frontier seeded with ${frontier.length} items. Strategy: ${strategy.toUpperCase()}`);

  // ── Main traversal loop ──────────────────────────────────────────────────
  while (frontier.length > 0 && contacts.length < maxContacts) {
    // BFS: take from front; DFS: take from back
    const item = strategy === 'bfs' ? frontier.shift() : frontier.pop();

    if (visited.has(item.profileUrl)) continue;
    visited.add(item.profileUrl);

    console.log(`[Discover] [${strategy.toUpperCase()} depth=${item.depth}] ${item.name || item.profileUrl}`);

    // Apply filters (we may already have card data from search results)
    if (item.depth > 0 || seeds.some(s => s.type === 'profile')) {
      // For items added from connection expansion, we only have the URL —
      // skip filter check here and let extractContactInfo fill in details later.
      // We still skip companies/roles that are clearly wrong if we have data.
      if (item.name && !passesFilters(item)) {
        console.log(`  [Discover] Filtered out: ${item.name} (${item.title} @ ${item.company})`);
        await delay();
        continue;
      }
    }

    contacts.push({
      profileUrl:       item.profileUrl,
      name:             item.name        || null,
      title:            item.title       || null,
      company:          item.company     || null,
      connectionDegree: item.connectionDegree || 'unknown',
      depth:            item.depth,
      via:              item.via,
      // to be filled by extractContactInfo
      emailCandidates:        [],
      personalEmailCandidates: [],
      messageSent:      false,
      reachedAt:        null,
    });

    console.log(`  [Discover] Collected (${contacts.length}/${maxContacts}): ${item.name || '—'} @ ${item.company || '—'}`);

    // ── Expand: if under maxDepth, find this person's connections ────────
    if (item.depth < maxDepth && contacts.length < maxContacts) {
      const connUrl = item.profileUrl.replace(/\/$/, '') + '/';
      // LinkedIn "People Also Viewed" or connection search anchored to this person
      // The most reliable expansion: search people connected to this person
      // by navigating to their profile and collecting "People also viewed"
      try {
        await page.goto(connUrl, { waitUntil: 'domcontentloaded', timeout: 30000 });
        await page.waitForTimeout(2500);

        const neighbours = await page.evaluate(() => {
          const links = document.querySelectorAll(
            'a[href*="/in/"]'
          );
          const found = new Set();
          links.forEach(a => {
            const m = (a.href || '').match(/linkedin\.com\/in\/([^?/]+)/);
            if (m) found.add('https://www.linkedin.com/in/' + m[1] + '/');
          });
          return [...found].slice(0, 10); // cap per profile to avoid explosion
        });

        for (const nUrl of neighbours) {
          if (!visited.has(nUrl) && contacts.length + frontier.length < maxContacts * 3) {
            frontier.push({
              profileUrl: nUrl,
              depth: item.depth + 1,
              via: item.profileUrl,
              name: null, title: null, company: null, connectionDegree: 'unknown'
            });
          }
        }
        console.log(`  [Discover] Expanded: +${neighbours.length} neighbours queued`);
      } catch (e) {
        console.warn(`  [Discover] Expansion failed: ${e.message}`);
      }
    }

    await delay();
  }

  console.log(`\n[Discover] Done. Discovered ${contacts.length} contacts via ${strategy.toUpperCase()}.`);
  return contacts;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { discoverContacts };
}
