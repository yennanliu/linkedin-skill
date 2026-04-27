/**
 * LinkedIn Contact Reacher — Send Connection Requests
 *
 * Sends personalized connection requests (with optional notes) to a list
 * of discovered contacts. Respects LinkedIn's rate limits.
 *
 * Usage:
 * ```javascript
 * const results = await reachContacts(page, contacts, {
 *   purpose: 'referral',     // 'referral' | 'networking' | 'custom'
 *   customMessage: '',       // used when purpose='custom'
 *   userProfile: { name: 'Your Name', role: 'Software Engineer', targetCompany: 'Google' },
 *   maxPerSession: 15,       // LinkedIn recommends ≤ 20/day
 *   onlyUnreached: true,     // skip contacts already reached
 * });
 * ```
 *
 * LinkedIn limits:
 *   - ~100 connection requests per week (free accounts)
 *   - ~200–300 per week (Premium)
 *   - Connection note: max 300 characters
 */

// ── Message templates ─────────────────────────────────────────────────────
function buildMessage(purpose, contact, userProfile = {}) {
  const { name: myName = 'there', role = '', targetCompany = '' } = userProfile;
  const theirName = (contact.firstName || (contact.name || '').split(' ')[0] || 'there');
  const theirCompany = contact.currentCompany || contact.company || targetCompany;

  if (purpose === 'referral') {
    const msg = `Hi ${theirName}, I'm ${myName}${role ? `, a ${role}` : ''}, and I'm very interested in opportunities at ${theirCompany}. I'd love to connect and learn about your experience there. Would you be open to a quick chat? Thanks!`;
    return msg.substring(0, 300);
  }

  if (purpose === 'networking') {
    const msg = `Hi ${theirName}, I came across your profile and was impressed by your work${theirCompany ? ` at ${theirCompany}` : ''}. I'd love to connect and exchange ideas. Thanks for considering!`;
    return msg.substring(0, 300);
  }

  return ''; // no note — blank means no message sent with request
}

// ── Send a connection request to a single contact ─────────────────────────
async function reachSingleContact(page, contact, options = {}) {
  const { purpose = 'networking', customMessage = '', userProfile = {}, delayMin = 3000, delayMax = 6000 } = options;
  const delay = ms => page.waitForTimeout(ms || (delayMin + Math.random() * (delayMax - delayMin)));

  const url = contact.profileUrl;
  if (!url) return { ...contact, reachStatus: 'skipped', reason: 'no profileUrl' };

  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(3000);

    // Check if already connected or pending
    const alreadyConnected = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      return btns.some(b => {
        const t = b.textContent.trim();
        return t === 'Message' || t === 'Pending' || t === 'Following';
      });
    });

    if (alreadyConnected) {
      console.log(`  [Reach] Already connected/pending: ${contact.name || url}`);
      return { ...contact, reachStatus: 'already_connected' };
    }

    // Find and click the Connect button
    const connected = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const connectBtn = btns.find(b =>
        b.textContent.trim() === 'Connect' ||
        b.getAttribute('aria-label')?.includes('Connect')
      );
      if (connectBtn) { connectBtn.click(); return true; }

      // Sometimes Connect is hidden under a More menu
      const moreBtn = btns.find(b =>
        b.getAttribute('aria-label')?.includes('More actions') ||
        b.textContent.trim() === 'More'
      );
      if (moreBtn) { moreBtn.click(); return 'more'; }
      return false;
    });

    if (connected === 'more') {
      // Wait for dropdown, then click Connect inside it
      await delay(1500);
      const inDropdown = await page.evaluate(() => {
        const items = document.querySelectorAll('[role="menuitem"], .artdeco-dropdown__item');
        const item = Array.from(items).find(i => i.textContent.trim().startsWith('Connect'));
        if (item) { item.click(); return true; }
        return false;
      });
      if (!inDropdown) return { ...contact, reachStatus: 'skipped', reason: 'Connect not in More menu' };
    } else if (!connected) {
      return { ...contact, reachStatus: 'skipped', reason: 'Connect button not found' };
    }

    await delay(2000);

    // Modal opened — decide whether to add a note
    const message = purpose === 'custom' ? customMessage : buildMessage(purpose, contact, userProfile);
    const shouldAddNote = message.length > 0;

    if (shouldAddNote) {
      const noteClicked = await page.evaluate(() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const noteBtn = btns.find(b =>
          b.textContent.trim() === 'Add a note' ||
          b.getAttribute('aria-label')?.includes('Add a note')
        );
        if (noteBtn) { noteBtn.click(); return true; }
        return false;
      });

      if (noteClicked) {
        await delay(1000);
        // Type the message into the note textarea
        await page.evaluate((msg) => {
          const ta = document.querySelector('textarea[name="message"], textarea#custom-message');
          if (ta) {
            ta.value = msg;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
            ta.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }, message);
        await delay(800);
      }
    }

    // Click "Send" / "Send without a note"
    const sent = await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const sendBtn = btns.find(b =>
        b.textContent.trim() === 'Send' ||
        b.textContent.includes('Send without a note') ||
        b.getAttribute('aria-label')?.includes('Send invitation')
      );
      if (sendBtn) { sendBtn.click(); return true; }
      return false;
    });

    if (!sent) return { ...contact, reachStatus: 'failed', reason: 'Send button not found' };

    await delay(2500);

    // Verify: modal should be gone
    const modalGone = await page.evaluate(() =>
      !document.querySelector('[role="dialog"], .send-invite')
    );

    if (modalGone) {
      console.log(`  [Reach] ✅ Request sent: ${contact.name || url}`);
      return { ...contact, reachStatus: 'sent', messageSent: true, messageText: message, reachedAt: new Date().toISOString() };
    }

    return { ...contact, reachStatus: 'uncertain', reason: 'Modal still visible after send' };

  } catch (err) {
    return { ...contact, reachStatus: 'error', reason: err.message };
  }
}

// ── Batch reach contacts ──────────────────────────────────────────────────
async function reachContacts(page, contacts, options = {}) {
  const {
    maxPerSession = 15,     // stay well under LinkedIn's weekly limit
    onlyUnreached = true,
    delayMin = 4000,
    delayMax = 8000,
    ...restOptions
  } = options;

  const delay = () => page.waitForTimeout(delayMin + Math.random() * (delayMax - delayMin));

  const toProcess = onlyUnreached
    ? contacts.filter(c => !c.messageSent && c.reachStatus !== 'sent')
    : contacts;

  const batch = toProcess.slice(0, maxPerSession);
  const results = [];
  const stats = { sent: 0, skipped: 0, failed: 0, alreadyConnected: 0 };

  console.log(`\n[Reach] Starting outreach: ${batch.length} contacts (max ${maxPerSession}/session)`);
  console.log(`[Reach] Purpose: ${restOptions.purpose || 'networking'}`);

  for (let i = 0; i < batch.length; i++) {
    const contact = batch[i];
    console.log(`[Reach] [${i + 1}/${batch.length}] ${contact.name || contact.profileUrl}`);

    const result = await reachSingleContact(page, contact, { delayMin, delayMax, ...restOptions });
    results.push(result);

    if      (result.reachStatus === 'sent')              stats.sent++;
    else if (result.reachStatus === 'already_connected') stats.alreadyConnected++;
    else if (result.reachStatus === 'skipped')           stats.skipped++;
    else                                                  stats.failed++;

    if (i < batch.length - 1) await delay();
  }

  // Contacts not in the batch pass through unchanged
  const unchanged = contacts.slice(maxPerSession);

  console.log('\n[Reach] Session complete:');
  console.log(`  ✅ Sent        : ${stats.sent}`);
  console.log(`  🔗 Already connected: ${stats.alreadyConnected}`);
  console.log(`  ⏭️  Skipped     : ${stats.skipped}`);
  console.log(`  ❌ Failed      : ${stats.failed}`);

  return { results: [...results, ...unchanged], stats };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { reachContacts, reachSingleContact, buildMessage };
}
