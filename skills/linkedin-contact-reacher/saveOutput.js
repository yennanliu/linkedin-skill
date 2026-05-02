/**
 * Save contact reacher output to local files (JSON + CSV).
 *
 * Runs inside page.evaluate() so it uses the browser's built-in
 * mechanisms (download via anchor) — OR call from Node.js context
 * directly when using the module.exports form.
 *
 * Usage (browser / Playwright page.evaluate):
 * ```javascript
 * await saveOutput(contacts, { format: 'both', outputDir: './output' });
 * ```
 *
 * Usage (Node.js, paste into MCP code block):
 * ```javascript
 * // Paste saveOutput.js, then:
 * await saveOutput(contacts, { format: 'both', label: 'google-eng-mgrs' });
 * ```
 */

async function saveOutput(contacts, options = {}) {
  if (!contacts || !Array.isArray(contacts)) {
    console.error('[Save] contacts must be an array. Received:', typeof contacts);
    return null;
  }

  const {
    format    = 'both',       // 'json' | 'csv' | 'both'
    outputDir = './output',   // relative to CWD when running in Node
    label     = 'contacts',   // prefix for filenames
  } = options;

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseFilename = `${label}_${timestamp}`;

  // ── Normalise contacts for output ─────────────────────────────────────
  const rows = contacts.map(c => ({
    name:                    c.name             || '',
    firstName:               c.firstName        || '',
    lastName:                c.lastName         || '',
    title:                   c.title            || c.currentTitle || '',
    company:                 c.company          || c.currentCompany || '',
    location:                c.location         || '',
    linkedinUrl:             c.profileUrl       || '',
    connectionDegree:        c.connectionDegree || '',
    depth:                   c.depth            ?? '',
    companyDomain:           c.companyDomain    || '',
    emailCandidates:         (c.emailCandidates        || []).join(' | '),
    personalEmailCandidates: (c.personalEmailCandidates || []).join(' | '),
    publicEmail:             c.publicEmail      || '',
    websites:                (c.websites        || []).join(' | '),
    messageSent:             c.messageSent      ? 'yes' : 'no',
    reachStatus:             c.reachStatus      || '',
    messageText:             c.messageText      || '',
    reachedAt:               c.reachedAt        || '',
    via:                     c.via              || '',
    status:                  c.status           || '',
  }));

  // ── JSON ──────────────────────────────────────────────────────────────
  if (format === 'json' || format === 'both') {
    try {
      if (typeof require !== 'undefined') {
        // Node.js environment
        const fs   = require('fs');
        const path = require('path');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const jsonPath = path.join(outputDir, `${baseFilename}.json`);
        fs.writeFileSync(jsonPath, JSON.stringify(contacts, null, 2), 'utf8');
        console.log(`[Save] JSON → ${jsonPath}`);
      } else {
        // Browser environment — trigger download
        const blob = new Blob([JSON.stringify(contacts, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${baseFilename}.json`;
        a.click();
        console.log(`[Save] JSON download triggered: ${baseFilename}.json`);
      }
    } catch (e) {
      console.error('[Save] JSON save failed:', e.message);
    }
  }

  // ── CSV ───────────────────────────────────────────────────────────────
  if (format === 'csv' || format === 'both') {
    try {
      const headers = Object.keys(rows[0] || {});
      const escape  = v => `"${String(v).replace(/"/g, '""')}"`;
      const csvLines = [
        headers.map(escape).join(','),
        ...rows.map(row => headers.map(h => escape(row[h])).join(','))
      ];
      const csvContent = csvLines.join('\n');

      if (typeof require !== 'undefined') {
        const fs   = require('fs');
        const path = require('path');
        if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
        const csvPath = path.join(outputDir, `${baseFilename}.csv`);
        fs.writeFileSync(csvPath, csvContent, 'utf8');
        console.log(`[Save] CSV  → ${csvPath}`);
      } else {
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `${baseFilename}.csv`;
        a.click();
        console.log(`[Save] CSV download triggered: ${baseFilename}.csv`);
      }
    } catch (e) {
      console.error('[Save] CSV save failed:', e.message);
    }
  }

  // ── Summary ───────────────────────────────────────────────────────────
  const summary = {
    total:         contacts.length,
    withEmail:     contacts.filter(c => (c.emailCandidates || []).length > 0).length,
    publicEmail:   contacts.filter(c => c.publicEmail).length,
    reached:       contacts.filter(c => c.reachStatus === 'sent').length,
    failed:        contacts.filter(c => c.status === 'error').length,
    savedAt:       new Date().toISOString(),
    filename:      baseFilename,
  };

  console.log('\n[Save] Output summary:');
  console.log(`  Total contacts   : ${summary.total}`);
  console.log(`  With email guess : ${summary.withEmail}`);
  console.log(`  Public email     : ${summary.publicEmail}`);
  console.log(`  Reached (sent)   : ${summary.reached}`);
  console.log(`  Errors           : ${summary.failed}`);
  console.log(`  Saved as         : ${baseFilename}.{json,csv}`);

  return summary;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { saveOutput };
}
