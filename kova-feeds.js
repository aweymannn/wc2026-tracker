/* ============================================================================
   HQ — Tier-1 data feeds (client side)
   ----------------------------------------------------------------------------
   · Live quotes  — /api/quotes on the hq Worker (Stooq + CoinGecko, free, no
     keys). Auto-refreshes when the Investments screen opens with stale prices.
   · Fidelity CSV — import the Positions export: equities/ETFs update or create
     positions; short calls/puts map to covered-call / CSP overlays; per-account
     totals can update HQ account balances via an explicit mapping preview.
   · Mercury      — direct read-only bank API. The token is pasted once in
     Settings and lives ONLY inside the app state (E2E-encrypted in sync); the
     Worker relay just forwards it per-request because browsers can't call
     api.mercury.com cross-origin. Balances map to HQ accounts once, then
     refresh automatically; matching entity cash follows the account owner.
   ========================================================================== */
'use strict';

(() => {
  const K = KOVA;
  const F = (K.Feeds = {});
  const esc = K.esc;

  function finCfg() {
    const s = K.S.settings;
    if (!s.finance) s.finance = { mercuryToken: '', mercuryMap: {}, lastMercuryAt: null };
    return s.finance;
  }
  const CRYPTO_IDS = { BTC: 'bitcoin', ETH: 'ethereum', SOL: 'solana' };

  /* ═══════════════ live quotes ═══════════════ */
  let quotesBusy = false;
  F.refreshQuotes = async (opts) => {
    if (quotesBusy) return;
    const S = K.S;
    const syms = [], ids = [];
    S.positions.forEach(p => {
      if (CRYPTO_IDS[p.ticker]) ids.push(CRYPTO_IDS[p.ticker]);
      else if (/^[A-Z][A-Z0-9.]{0,9}$/.test(p.ticker)) syms.push(p.ticker);
    });
    if (!syms.length && !ids.length) return;
    quotesBusy = true;
    try {
      const res = await fetch('/api/quotes?s=' + syms.join(',') + '&c=' + ids.join(','), { cache: 'no-store' });
      if (!res.ok) throw new Error('quotes ' + res.status);
      const data = await res.json();
      let updated = 0;
      S.positions.forEach(p => {
        const cg = CRYPTO_IDS[p.ticker];
        const px = cg ? (data.crypto || {})[cg] : (data.quotes || {})[p.ticker];
        if (px && isFinite(px)) { p.price = px; updated++; }
      });
      if (updated) {
        S.investMeta.pricesAsOf = new Date().toISOString();
        K.refresh();
        if (opts && opts.toast) K.toast(updated + ' prices updated' + ((data.misses || []).length ? ' · no quote: ' + data.misses.join(', ') : ''));
      } else if (opts && opts.toast) K.toast('⚠ No quotes returned' + ((data.misses || []).length ? ' for ' + data.misses.join(', ') : ''));
    } catch (e) {
      if (opts && opts.toast) K.toast('⚠ Price feed unavailable: ' + e.message + ' (are you on the hq URL?)');
    }
    quotesBusy = false;
  };
  // silent auto-refresh when Investments opens with prices older than 15 min
  F.autoQuotes = () => {
    const at = K.S.investMeta.pricesAsOf;
    if (at && Date.now() - new Date(at).getTime() < 15 * 60 * 1000) return;
    F.refreshQuotes({});
  };

  /* ═══════════════ Fidelity CSV import ═══════════════ */
  function parseCSVText(text) {
    const rows = []; let cur = [], field = '', inQ = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (inQ) {
        if (ch === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; }
        else field += ch;
      } else if (ch === '"') inQ = true;
      else if (ch === ',') { cur.push(field); field = ''; }
      else if (ch === '\n' || ch === '\r') {
        if (ch === '\r' && text[i + 1] === '\n') i++;
        cur.push(field); rows.push(cur); cur = []; field = '';
      } else field += ch;
    }
    if (field || cur.length) { cur.push(field); rows.push(cur); }
    return rows;
  }
  const numOf = (s) => {
    if (s == null) return null;
    let t = String(s).trim().replace(/[$,"]/g, '');
    if (/^\(.*\)$/.test(t)) t = '-' + t.slice(1, -1);
    const v = parseFloat(t.replace(/%$/, ''));
    return isFinite(v) ? v : null;
  };
  const MONEY_MARKET = /^(SPAXX|FDRXX|FZFXX|SPRXX|FDLXX|FCASH|CORE)/i;

  function parseFidelity(text) {
    const rows = parseCSVText(text);
    const hIdx = rows.findIndex(r => r.some(c => /symbol/i.test(c)) && r.some(c => /quantity/i.test(c)));
    if (hIdx < 0) throw new Error('No Symbol/Quantity header found — export the Positions CSV from Fidelity and try again');
    const header = rows[hIdx].map(c => c.trim().toLowerCase());
    const col = (...names) => header.findIndex(h => names.some(n => h.includes(n)));
    const cSym = col('symbol'), cQty = col('quantity'), cPx = col('last price'),
      cVal = col('current value'), cAvg = col('average cost basis'), cTot = col('cost basis total', 'cost basis'),
      cAcct = col('account name'), cAcctNum = col('account number', 'account');
    const out = { equities: [], options: [], accounts: {}, skipped: [] };
    for (let i = hIdx + 1; i < rows.length; i++) {
      const row = rows[i];
      const rawSym = ((cSym >= 0 && row[cSym]) || '').trim();
      if (!rawSym || /^(pending|the data|date downloaded|brokerage)/i.test(rawSym)) continue;
      const acct = (((cAcct >= 0 && row[cAcct]) || (cAcctNum >= 0 && row[cAcctNum]) || 'Fidelity') + '').trim() || 'Fidelity';
      const val = numOf(cVal >= 0 ? row[cVal] : null);
      if (val != null) out.accounts[acct] = (out.accounts[acct] || 0) + val;
      const qty = numOf(cQty >= 0 ? row[cQty] : null);
      const sym = rawSym.replace(/\s+/g, '');
      const opt = sym.match(/^-?([A-Z]{1,6})(\d{2})(\d{2})(\d{2})([CP])([\d.]+)$/);
      if (opt) {
        out.options.push({
          under: opt[1], expiry: '20' + opt[2] + '-' + opt[3] + '-' + opt[4],
          right: opt[5], strike: parseFloat(opt[6]),
          contracts: Math.abs(qty || 0), short: (qty || 0) < 0,
        });
        continue;
      }
      if (MONEY_MARKET.test(rawSym)) continue; // cash — already in the account total
      if (/^[A-Z][A-Z0-9.]{0,9}$/.test(rawSym)) {
        const px = numOf(cPx >= 0 ? row[cPx] : null);
        let basis = numOf(cAvg >= 0 ? row[cAvg] : null);
        if (basis == null) { const tot = numOf(cTot >= 0 ? row[cTot] : null); if (tot != null && qty) basis = tot / qty; }
        out.equities.push({ ticker: rawSym, qty, price: px, basis, acct });
      } else out.skipped.push(rawSym);
    }
    if (!out.equities.length && !out.options.length) throw new Error('No positions found in that file');
    return out;
  }

  F.importCSV = () => {
    K.modal(`<h2>Import Fidelity positions</h2>
      <div class="sub">Fidelity → Positions → the download icon → CSV. Parsed entirely in your browser — the file never leaves this device.</div>
      <input type="file" accept=".csv,text/csv" id="fid-file">
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Cancel</button>
      <button class="btn primary" onclick="KOVA.Feeds.csvParse()">Preview import</button></div>`, { noFocus: true });
  };
  F.csvParse = () => {
    const el = K.$('#fid-file');
    if (!el || !el.files || !el.files[0]) { K.toast('Choose the CSV file first'); return; }
    const r = new FileReader();
    r.onload = () => {
      try { F._pending = parseFidelity(r.result); F.csvPreview(); }
      catch (e) { K.toast('⚠ ' + e.message); }
    };
    r.readAsText(el.files[0]);
  };
  F.csvPreview = () => {
    const p = F._pending; const S = K.S;
    const acctOpts = (sel) => ['<option value="skip">— don\'t update a balance —</option>']
      .concat(S.accounts.map(a => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.name)}</option>`)).join('');
    const guess = (name) => { const n = name.toLowerCase();
      const hit = S.accounts.find(a => (n.includes('roth') || n.includes('ira') || n.includes('401')) ? a.type === 'retirement' : a.type === 'brokerage');
      return hit ? hit.id : 'skip'; };
    K.modal(`<h2>Preview — Fidelity import</h2>
      <div class="sub">${p.equities.length} positions · ${p.options.filter(o => o.short).length} short options → overlays · ${p.skipped.length ? p.skipped.length + ' rows skipped (' + esc(p.skipped.slice(0, 4).join(', ')) + ')' : 'nothing skipped'}</div>
      <div class="rows" style="max-height:180px;overflow-y:auto">${p.equities.map(e => `
        <div class="row"><div class="grow"><div class="title" style="font-size:13px"><b>${esc(e.ticker)}</b> — ${e.qty ?? '?'} @ ${e.price ?? '?'}</div>
        <div class="meta"><span>${esc(e.acct)}</span><span>basis ${e.basis ? e.basis.toFixed(2) : '—'}</span></div></div>
        <span class="badge ${S.positions.some(x => x.ticker === e.ticker) ? 'blue' : 'green'}">${S.positions.some(x => x.ticker === e.ticker) ? 'update' : 'new'}</span></div>`).join('')}
      ${p.options.filter(o => o.short).map(o => `<div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(o.under)} ${o.contracts}× ${o.strike}${o.right} exp ${o.expiry}</div></div><span class="badge amber">${o.right === 'C' ? 'covered call' : 'CSP'}</span></div>`).join('')}
      </div>
      <label style="margin-top:12px">Update HQ account balances from the file's per-account totals</label>
      ${Object.entries(p.accounts).map(([name, total], i) => `
        <div class="grid cols-2" style="margin-bottom:6px;align-items:center">
          <div class="small">${esc(name)} → <b class="num">${K.money(Math.round(total), { short: true })}</b></div>
          <select id="fid-map-${i}" data-acct="${esc(name)}">${acctOpts(guess(name))}</select>
        </div>`).join('')}
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Cancel</button>
      <button class="btn primary" onclick="KOVA.Feeds.csvApply()">Apply import</button></div>`, { noFocus: true, wide: true });
  };
  F.csvApply = () => {
    const p = F._pending; const S = K.S;
    let up = 0, added = 0, overlays = 0;
    p.equities.forEach(e => {
      let pos = S.positions.find(x => x.ticker === e.ticker);
      if (!pos) {
        pos = { id: K.uid(), ticker: e.ticker, name: e.ticker + ' (imported)', account: e.acct, qty: 0, basis: 0, price: 0, thesis: 'Imported from Fidelity CSV — add your thesis.', invalidation: '—', review: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), options: [] };
        S.positions.push(pos); added++;
      } else up++;
      if (e.qty != null) pos.qty = e.qty;
      if (e.price != null) pos.price = e.price;
      if (e.basis != null) pos.basis = +e.basis.toFixed(2);
    });
    p.options.filter(o => o.short && o.contracts).forEach(o => {
      let pos = S.positions.find(x => x.ticker === o.under);
      if (!pos) {
        pos = { id: K.uid(), ticker: o.under, name: o.under + ' (options)', account: 'Fidelity', qty: 0, basis: 0, price: 0, thesis: 'Imported from Fidelity CSV.', invalidation: '—', review: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10), options: [] };
        S.positions.push(pos);
      }
      pos.options = pos.options || [];
      const type = o.right === 'C' ? 'cc' : 'csp';
      const existing = pos.options.find(x => x.type === type && x.strike === o.strike && x.expiry.slice(0, 10) === o.expiry);
      if (existing) existing.contracts = o.contracts;
      else pos.options.push({ type, strike: o.strike, expiry: o.expiry, contracts: o.contracts, premium: 0, opened: K.todayISO() });
      overlays++;
    });
    document.querySelectorAll('[id^="fid-map-"]').forEach(sel => {
      const target = sel.value; if (target === 'skip') return;
      const acct = S.accounts.find(a => a.id === target); if (!acct) return;
      acct.balance = Math.round(p.accounts[sel.getAttribute('data-acct')] || acct.balance);
    });
    S.investMeta.pricesAsOf = new Date().toISOString();
    F._pending = null;
    K.closeModal(); K.refresh();
    K.toast(`Imported: ${up} updated, ${added} new, ${overlays} option overlays`);
    K.logActivity('import', 'Fidelity CSV imported');
  };

  /* ═══════════════ Mercury ═══════════════ */
  let mercuryBusy = false;
  F.mercurySaveToken = () => {
    const cfg = finCfg();
    cfg.mercuryToken = (K.$('#mrc-token') ? K.$('#mrc-token').value : '').trim();
    cfg.mercuryMap = cfg.mercuryToken ? cfg.mercuryMap : {};
    K.refresh();
    K.toast(cfg.mercuryToken ? 'Mercury token saved (stored only in your encrypted data)' : 'Mercury token cleared');
  };
  F.mercuryRefresh = async (opts) => {
    const cfg = finCfg();
    if (!cfg.mercuryToken) { if (opts && opts.toast) { K.toast('Add your Mercury read-only token in Settings first'); K.nav('#/settings'); } return; }
    if (mercuryBusy) return;
    mercuryBusy = true;
    try {
      const res = await fetch('/api/relay/mercury/accounts', { headers: { 'x-mercury-token': cfg.mercuryToken }, cache: 'no-store' });
      if (res.status === 401 || res.status === 403) throw new Error('Mercury rejected the token — check it under Mercury → Settings → API Tokens');
      if (!res.ok) throw new Error('relay ' + res.status);
      const data = await res.json();
      const list = (data.accounts || []).map(a => ({ id: a.id || a.accountNumber || a.name, name: a.name || a.nickname || 'Account', balance: a.currentBalance != null ? a.currentBalance : a.availableBalance }));
      if (!list.length) throw new Error('no accounts returned');
      mercuryBusy = false;
      if (list.some(a => cfg.mercuryMap[a.id] === undefined)) return F.mercuryMapModal(list);
      F.mercuryApply(list, opts);
    } catch (e) {
      mercuryBusy = false;
      if (opts && opts.toast) K.toast('⚠ Mercury refresh failed: ' + e.message);
    }
  };
  F.mercuryMapModal = (list) => {
    const S = K.S;
    const opts = (sel) => ['<option value="skip">— ignore this account —</option>']
      .concat(S.accounts.map(a => `<option value="${a.id}" ${sel === a.id ? 'selected' : ''}>${esc(a.name)}</option>`)).join('');
    const guess = (name) => { const n = name.toLowerCase();
      const hit = S.accounts.find(a => n && a.name.toLowerCase().split(' ').some(w => w.length > 3 && n.includes(w)));
      return hit ? hit.id : 'skip'; };
    F._mercuryList = list;
    K.modal(`<h2>Map Mercury accounts</h2>
      <div class="sub">One-time: match each Mercury account to its HQ account. Balances (and matching entity cash) refresh automatically after this.</div>
      ${list.map((a, i) => `<div class="grid cols-2" style="margin-bottom:6px;align-items:center">
        <div class="small">${esc(a.name)} → <b class="num">${K.money(Math.round(a.balance || 0), { short: true })}</b></div>
        <select id="mrc-map-${i}">${opts(guess(a.name))}</select></div>`).join('')}
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Cancel</button>
      <button class="btn primary" onclick="KOVA.Feeds.mercuryMapSave()">Save mapping & refresh</button></div>`, { noFocus: true });
  };
  F.mercuryMapSave = () => {
    const cfg = finCfg(); const list = F._mercuryList || [];
    list.forEach((a, i) => { const sel = K.$('#mrc-map-' + i); cfg.mercuryMap[a.id] = sel ? sel.value : 'skip'; });
    K.closeModal();
    F.mercuryApply(list, { toast: true });
  };
  F.mercuryApply = (list, opts) => {
    const cfg = finCfg(); const S = K.S;
    let applied = 0;
    list.forEach(a => {
      const target = cfg.mercuryMap[a.id];
      if (!target || target === 'skip' || a.balance == null) return;
      const acct = S.accounts.find(x => x.id === target); if (!acct) return;
      acct.balance = Math.round(a.balance); applied++;
      const ent = S.entities.find(e => e.name === acct.owner);
      if (ent) ent.cash = Math.round(a.balance);
    });
    cfg.lastMercuryAt = Date.now();
    K.refresh();
    if (opts && opts.toast) K.toast(applied + ' balances updated from Mercury ✓');
  };
  // silent auto-refresh when Finance opens and the last pull is >60 min old
  F.autoMercury = () => {
    const cfg = finCfg();
    if (!cfg.mercuryToken) return;
    if (cfg.lastMercuryAt && Date.now() - cfg.lastMercuryAt < 60 * 60 * 1000) return;
    F.mercuryRefresh({});
  };
})();
