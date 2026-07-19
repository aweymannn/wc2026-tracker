/* ============================================================================
   KOVA OS — encrypted device sync
   ----------------------------------------------------------------------------
   Syncs the full app state between devices through the site's own Cloudflare
   Worker (/api/sync), end-to-end encrypted:

   passphrase ──PBKDF2──► syncId   (identifies the record; server sees only this)
              └─PBKDF2──► AES-GCM key (encrypts state BEFORE upload)

   The server stores ciphertext only. A wrong passphrase simply derives a
   different syncId — it behaves like an empty account rather than an error.
   Sync metadata (never the passphrase) lives outside the app state under its
   own localStorage key so the encrypted blob stays self-contained.

   Conflict model: last-writer-wins with optimistic concurrency. Every push
   carries the last rev this device saw; if the cloud moved on, the user picks
   "take cloud copy" or "overwrite with this device".
   ========================================================================== */
'use strict';

(() => {
  const K = KOVA;
  const Sync = (K.Sync = {});
  const META_KEY = 'kovaos.sync.v1';
  const PBKDF2_ITERS = 310000;
  const API = '/api/sync/';
  const enc = new TextEncoder();

  let meta = null;      // {enabled, syncId, keyJwk, lastRev, lastAt, dirty}
  let pushTimer = null;
  let busy = false;

  function loadMeta() {
    if (meta) return meta;
    try { meta = JSON.parse(localStorage.getItem(META_KEY)) || {}; }
    catch { meta = {}; }
    return meta;
  }
  function saveMeta() { localStorage.setItem(META_KEY, JSON.stringify(meta)); }

  /* ---- crypto ------------------------------------------------------------ */
  async function derive(passphrase) {
    const base = await crypto.subtle.importKey('raw', enc.encode(passphrase), 'PBKDF2', false, ['deriveBits', 'deriveKey']);
    const idBits = await crypto.subtle.deriveBits(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('KOVA-OS-sync-id-v1'), iterations: PBKDF2_ITERS }, base, 256);
    const syncId = [...new Uint8Array(idBits)].map(b => b.toString(16).padStart(2, '0')).join('');
    const key = await crypto.subtle.deriveKey(
      { name: 'PBKDF2', hash: 'SHA-256', salt: enc.encode('KOVA-OS-sync-enc-v1'), iterations: PBKDF2_ITERS },
      base, { name: 'AES-GCM', length: 256 }, true, ['encrypt', 'decrypt']);
    const keyJwk = await crypto.subtle.exportKey('jwk', key);
    return { syncId, keyJwk };
  }
  async function getKey() {
    return crypto.subtle.importKey('jwk', meta.keyJwk, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
  }
  function b64(buf) {
    const u = new Uint8Array(buf); let s = ''; const CH = 0x8000;
    for (let i = 0; i < u.length; i += CH) s += String.fromCharCode.apply(null, u.subarray(i, i + CH));
    return btoa(s);
  }
  function unb64(str) {
    const bin = atob(str); const u = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
    return u;
  }
  async function encryptState() {
    const key = await getKey();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ct = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(K.S)));
    const out = new Uint8Array(12 + ct.byteLength);
    out.set(iv, 0); out.set(new Uint8Array(ct), 12);
    return b64(out.buffer);
  }
  async function decryptBlob(blob) {
    const raw = unb64(blob);
    const key = await getKey();
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: raw.slice(0, 12) }, key, raw.slice(12));
    return JSON.parse(new TextDecoder().decode(pt));
  }

  /* ---- transport ---------------------------------------------------------- */
  async function apiGet() {
    const res = await fetch(API + meta.syncId, { cache: 'no-store' });
    if (res.status === 404) return { exists: false };
    if (res.status === 501) throw new Error('sync-not-configured');
    if (!res.ok) throw new Error('sync server ' + res.status);
    return res.json();
  }
  async function apiPut(blob, rev, baseRev) {
    const res = await fetch(API + meta.syncId, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blob, rev, baseRev }),
    });
    if (res.status === 409) return { conflict: true, ...(await res.json()) };
    if (res.status === 501) throw new Error('sync-not-configured');
    if (!res.ok) throw new Error('sync server ' + res.status);
    return res.json();
  }

  /* ---- core ops ----------------------------------------------------------- */
  Sync.enabled = () => !!loadMeta().enabled;

  Sync.push = async (opts) => {
    if (!Sync.enabled() || busy) return;
    busy = true;
    try {
      const blob = await encryptState();
      const rev = K.uid() + K.uid();
      const r = await apiPut(blob, rev, (opts && opts.force) ? (opts.baseRev || null) : (meta.lastRev || null));
      if (r.conflict) { busy = false; return Sync.conflictModal(r); }
      meta.lastRev = rev; meta.lastAt = r.at; meta.dirty = false; saveMeta();
      Sync.paintStatus();
      if (opts && opts.toast) K.toast('Synced ✓');
    } catch (e) {
      if (e.message === 'sync-not-configured') K.toast('⚠ Sync storage not set up yet — see Settings → Device sync');
      else K.toast('⚠ Sync push failed: ' + e.message);
    }
    busy = false;
  };

  Sync.pull = async (opts) => {
    if (!Sync.enabled() || busy) return;
    busy = true;
    try {
      const r = await apiGet();
      if (!r.exists) { if (opts && opts.toast) K.toast('No cloud copy yet — push from this device first'); busy = false; return; }
      const state = await decryptBlob(r.blob);
      meta.lastRev = r.rev; meta.lastAt = r.at; meta.dirty = false; saveMeta();
      busy = false;
      K.replaceState(state);
      if (opts && opts.toast) K.toast('Cloud copy applied ✓');
      return;
    } catch (e) {
      busy = false;
      if (e.name === 'OperationError') K.toast('⚠ Could not decrypt — different passphrase?');
      else if (e.message !== 'sync-not-configured') K.toast('⚠ Sync pull failed: ' + e.message);
      else K.toast('⚠ Sync storage not set up yet');
    }
  };

  // Called by KOVA.save() after every local persist.
  Sync.onLocalSave = () => {
    if (!Sync.enabled()) return;
    meta.dirty = true; saveMeta(); Sync.paintStatus();
    clearTimeout(pushTimer);
    pushTimer = setTimeout(() => Sync.push(), 4000);
  };

  // Called once on boot: adopt the cloud copy if it moved, push if we're ahead.
  Sync.checkOnLoad = async () => {
    if (!Sync.enabled()) return;
    try {
      const r = await apiGet();
      if (!r.exists) { if (meta.dirty || !meta.lastRev) Sync.push(); return; }
      if (r.rev === meta.lastRev) { if (meta.dirty) Sync.push(); return; }
      if (!meta.dirty) { // cloud moved, we have nothing local-only → adopt it
        const state = await decryptBlob(r.blob);
        meta.lastRev = r.rev; meta.lastAt = r.at; saveMeta();
        K.replaceState(state);
        K.toast('Synced from cloud ✓');
      } else Sync.conflictModal(r);
    } catch (e) { /* offline or not configured — stay quiet on boot */ }
  };

  Sync.conflictModal = (server) => {
    K.modal(`<h2>Sync conflict</h2>
      <div class="sub">Another device updated the cloud copy (${K.fmtDay(new Date(server.at).toISOString())} ${K.fmtTime(new Date(server.at).toISOString())}) and this device also has changes. Which wins?</div>
      <div class="callout warn">Last-writer-wins, whole copy — there is no merge. The losing side's changes since the last sync are discarded.</div>
      <div class="modal-foot">
        <button class="btn" onclick="KOVA.closeModal();KOVA.Sync.pull({toast:true})">Take cloud copy</button>
        <button class="btn primary" onclick="KOVA.closeModal();KOVA.Sync.push({force:true, baseRev:'${K.esc(server.rev)}', toast:true})">Overwrite with this device</button>
      </div>`, { noFocus: true });
  };

  /* ---- setup / teardown ---------------------------------------------------- */
  Sync.setup = async () => {
    const p1 = K.$('#sy-pass').value, p2 = K.$('#sy-pass2').value;
    if (p1.length < 8) { K.toast('Use at least 8 characters — a 3–4 word phrase is ideal'); return; }
    if (p1 !== p2) { K.toast('Passphrases don\'t match'); return; }
    K.toast('Deriving keys…');
    const d = await derive(p1);
    meta = { enabled: true, syncId: d.syncId, keyJwk: d.keyJwk, lastRev: null, lastAt: null, dirty: true };
    saveMeta();
    try {
      const r = await apiGet();
      if (r.exists) {
        K.modal(`<h2>Cloud copy found</h2>
          <div class="sub">A synced copy already exists for this passphrase (updated ${K.fmtDay(new Date(r.at).toISOString())}). Replace this device's data with it, or overwrite the cloud with this device?</div>
          <div class="modal-foot">
            <button class="btn primary" onclick="KOVA.closeModal();KOVA.Sync.pull({toast:true})">Use cloud copy here</button>
            <button class="btn" onclick="KOVA.closeModal();KOVA.Sync.push({force:true, baseRev:'${K.esc(r.rev)}', toast:true})">Overwrite cloud</button>
          </div>`, { noFocus: true });
      } else {
        await Sync.push({ toast: true });
      }
      K.render();
    } catch (e) {
      if (e.message === 'sync-not-configured') {
        K.render();
        K.toast('Keys saved — but the sync storage isn\'t deployed yet (run the setup workflow)');
      } else K.toast('⚠ ' + e.message);
    }
  };
  Sync.disable = () => {
    if (!confirm('Disable sync on this device? Local data stays; the cloud copy is untouched.')) return;
    meta = {}; saveMeta(); K.render(); K.toast('Sync disabled on this device');
  };
  Sync.deleteCloud = async () => {
    if (!confirm('Delete the encrypted cloud copy? Devices keep their local data but stop syncing until pushed again.')) return;
    try {
      await fetch(API + meta.syncId, { method: 'DELETE' });
      meta.lastRev = null; meta.lastAt = null; saveMeta();
      K.toast('Cloud copy deleted'); K.render();
    } catch (e) { K.toast('⚠ ' + e.message); }
  };

  /* ---- UI ------------------------------------------------------------------ */
  Sync.statusLine = () => {
    if (!Sync.enabled()) return '';
    const when = meta.lastAt ? K.fmtDay(new Date(meta.lastAt).toISOString()) + ' ' + K.fmtTime(new Date(meta.lastAt).toISOString()) : 'never';
    return `<div class="small muted" style="padding:2px 10px">Sync: ${meta.dirty ? 'pending…' : 'up to date'} · ${when}</div>`;
  };
  Sync.paintStatus = () => { /* cheap repaint of the sidebar footer line */
    const el = document.getElementById('sync-status'); if (el) el.innerHTML = Sync.statusLine();
  };

  // Settings card, rendered by the settings screen.
  Sync.settingsCard = () => {
    loadMeta();
    if (!Sync.enabled()) return `
      <div class="card section-gap"><div class="card-head"><h3>Device sync — encrypted</h3><span class="badge gray">off</span></div>
        <div class="small" style="color:var(--ink-2);margin-bottom:8px">
          Sync your data between phone and desktop through your own Cloudflare Worker.
          Everything is <b>encrypted in this browser</b> with a key derived from your passphrase before upload —
          the server stores unreadable ciphertext, and nothing can recover a lost passphrase.</div>
        <div class="grid cols-2">
          <div><label>Sync passphrase (min 8 chars — use 3–4 words)</label><input id="sy-pass" type="password" autocomplete="new-password"></div>
          <div><label>Repeat passphrase</label><input id="sy-pass2" type="password" autocomplete="new-password"></div>
        </div>
        <div class="btnrow" style="margin-top:10px">
          <button class="btn primary" onclick="KOVA.Sync.setup()">Enable sync on this device</button>
          <span class="small muted">use the same passphrase on every device</span>
        </div>
        <div class="small muted" style="margin-top:8px">Requires the one-time storage setup (GitHub → Actions → “KOVA sync setup”). A wrong passphrase isn't an error — it just looks like an empty account.</div>
      </div>`;
    const when = meta.lastAt ? new Date(meta.lastAt).toLocaleString() : 'never';
    return `
      <div class="card section-gap"><div class="card-head"><h3>Device sync — encrypted</h3><span class="badge green">on</span></div>
        <div class="small" style="color:var(--ink-2)">Last synced: ${when} · ${meta.dirty ? '<span style="color:var(--warn)">local changes pending</span>' : 'up to date'}<br>
        Record: <span class="mono">${meta.syncId.slice(0, 10)}…</span> (passphrase-derived; content is end-to-end encrypted)</div>
        <div class="btnrow" style="margin-top:10px">
          <button class="btn primary" onclick="KOVA.Sync.push({toast:true})">Sync now</button>
          <button class="btn" onclick="KOVA.Sync.pull({toast:true})">Pull cloud copy</button>
          <button class="btn ghost" onclick="KOVA.Sync.disable()">Disable here</button>
          <button class="btn danger" onclick="KOVA.Sync.deleteCloud()">Delete cloud copy</button>
        </div>
      </div>`;
  };
})();
