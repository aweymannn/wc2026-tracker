/* ============================================================================
   KOVA OS — core engine
   State store (localStorage) · hash router · global controls (palette, quick
   capture, approvals, notifications, privacy) · formatting & chart helpers.
   Views register screens via KOVA.reg(); agent gateway lives in kova-agents.js.
   ========================================================================== */
'use strict';

const KOVA = (() => {
  const LS_KEY = 'kovaos.v1';
  let S = null;                 // app state (see kova-data.js schema)
  const screens = [];           // {id,title,icon,section,render,count?}
  let route = { id: 'home', param: null };
  let postRender = [];          // viz/hover binders queued during render

  /* ======================== persistence ================================== */
  function load() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) { S = JSON.parse(raw); rolloverDay(); return; }
    } catch (e) { console.warn('KOVA: stored state unreadable, reseeding', e); }
    S = KOVA_SEED();
  }
  let saveTimer = null;
  function save() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      try {
        localStorage.setItem(LS_KEY, JSON.stringify(S));
        if (KOVA.Sync && KOVA.Sync.onLocalSave) KOVA.Sync.onLocalSave();
      }
      catch (e) { toast('⚠ Could not save (storage full?)'); }
    }, 120);
  }
  // Swap in a full state object (used by device sync / restore) and repaint.
  function replaceState(next) {
    S = next; rolloverDay();
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) {}
    render();
  }
  function resetDemo() {
    if (!confirm('Reset ALL data back to the demo seed? Your local changes will be lost.')) return;
    localStorage.removeItem(LS_KEY); S = KOVA_SEED(); save(); render(); toast('Reset to demo data');
  }
  function exportJSON() {
    const blob = new Blob([JSON.stringify(S, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'kova-os-backup-' + todayISO() + '.json';
    a.click(); URL.revokeObjectURL(a.href);
    toast('Backup downloaded');
  }
  function importJSON(file) {
    const r = new FileReader();
    r.onload = () => {
      try {
        const data = JSON.parse(r.result);
        if (!data.settings || !data.workspaces) throw new Error('not a KOVA backup');
        S = data; save(); render(); toast('Backup restored');
      } catch (e) { toast('⚠ Invalid backup file'); }
    };
    r.readAsText(file);
  }
  // New day → carry unfinished outcomes forward, clear shutdown flag.
  function rolloverDay() {
    const t = todayISO();
    if (S.today && S.today.date !== t) {
      const carried = (S.today.outcomes || []).filter(o => !o.done);
      S.today = { date: t, outcomes: carried, shutdownDone: false, briefDismissed: false };
    }
  }

  /* ======================== small utils =================================== */
  const $ = (sel, el) => (el || document).querySelector(sel);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  const uid = () => 'x' + Math.random().toString(36).slice(2, 9);
  const todayISO = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate(), 12).toISOString().slice(0, 10); };
  const dayMs = 86400000;

  function dateOf(x) { return x ? new Date(x) : null; }
  function daysUntil(iso) {
    if (!iso) return null;
    const d = new Date(iso.length === 10 ? iso + 'T12:00' : iso);
    const t = new Date(); const t0 = new Date(t.getFullYear(), t.getMonth(), t.getDate(), 12);
    return Math.round((new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12) - t0) / dayMs);
  }
  function fmtTime(iso) {
    const d = new Date(iso);
    let h = d.getHours(); const m = d.getMinutes(); const ap = h >= 12 ? 'p' : 'a';
    h = h % 12 || 12;
    return h + (m ? ':' + String(m).padStart(2, '0') : '') + ap;
  }
  function fmtDay(iso) {
    const du = daysUntil(iso);
    if (du === 0) return 'Today'; if (du === 1) return 'Tomorrow'; if (du === -1) return 'Yesterday';
    const d = new Date(iso.length === 10 ? iso + 'T12:00' : iso);
    const opts = Math.abs(du) < 7 ? { weekday: 'short' } : { month: 'short', day: 'numeric' };
    return d.toLocaleDateString('en-US', opts);
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso.length === 10 ? iso + 'T12:00' : iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
  function dueBadge(iso, doneish) {
    if (!iso) return '';
    const du = daysUntil(iso);
    if (doneish) return `<span class="badge gray">${fmtDay(iso)}</span>`;
    if (du < 0) return `<span class="badge red">${-du}d overdue</span>`;
    if (du === 0) return `<span class="badge amber">today</span>`;
    if (du === 1) return `<span class="badge blue">tomorrow</span>`;
    if (du <= 7) return `<span class="badge gray">${fmtDay(iso)}</span>`;
    return `<span class="badge gray">${fmtDate(iso)}</span>`;
  }
  function money(n, opts) {
    if (n == null || isNaN(n)) return '—';
    const o = opts || {};
    const abs = Math.abs(n); let out;
    if (o.short && abs >= 1e6) out = '$' + (abs / 1e6).toFixed(2) + 'M';
    else if (o.short && abs >= 1e4) out = '$' + Math.round(abs / 1e3) + 'k';
    else out = '$' + abs.toLocaleString('en-US', { maximumFractionDigits: o.cents ? 2 : 0 });
    return `<span class="money">${n < 0 ? '−' : ''}${out}</span>`;
  }
  const pct = (x, dp) => (100 * x).toFixed(dp == null ? 0 : dp) + '%';

  /* ---- lookups ----------------------------------------------------------- */
  const ws = (id) => S.workspaces.find(w => w.id === id);
  const wsColor = (id) => { const w = ws(id); return w ? `var(--s${w.color})` : 'var(--ink-3)'; };
  const wsName = (id) => { const w = ws(id); return w ? w.name : ''; };
  const proj = (id) => S.projects.find(p => p.id === id);
  const wsChip = (id) => id ? `<span class="wsdot" style="background:${wsColor(id)}"></span> ${esc(wsName(id))}` : '';
  const healthBadge = (h) => ({ green: '<span class="badge green">on track</span>', amber: '<span class="badge amber">watch</span>', red: '<span class="badge red">at risk</span>', gray: '<span class="badge gray">paused</span>' }[h] || '');

  /* ---- computed ----------------------------------------------------------- */
  // Mortgages are excluded from the account sum (already netted inside property
  // equity); brokerage/retirement balances stand in for their positions, so only
  // self-custody positions (no backing account) are added separately.
  function netWorth() {
    const nonMortgage = S.accounts.filter(a => a.type !== 'mortgage').reduce((s, a) => s + a.balance, 0);
    const reEquity = S.properties.reduce((s, p) => s + p.valuation - p.debt, 0);
    const selfCustody = S.positions.filter(p => p.account === 'Self-custody').reduce((s, p) => s + p.qty * p.price, 0);
    return nonMortgage + reEquity + selfCustody;
  }
  function liquidCash() { return S.accounts.filter(a => a.liquidity === 'liquid' && a.balance > 0).reduce((s, a) => s + a.balance, 0); }
  function positionsValue() { return S.positions.reduce((s, p) => s + p.qty * p.price, 0); }
  function openTasks() { return S.tasks.filter(t => t.status === 'open'); }
  function tasksDueToday() { return openTasks().filter(t => t.due && daysUntil(t.due) <= 0); }
  function eventsToday() {
    return S.events.filter(e => daysUntil(e.start) === 0).sort((a, b) => a.start < b.start ? -1 : 1);
  }
  function pendingApprovals() { return S.approvals.filter(a => a.status === 'pending'); }
  function inboxOpen() { return S.messages.filter(m => !m.done && m.triage !== 'read' && m.triage !== 'archive'); }
  function unreadNotifs() { return S.notifications.filter(n => !n.read); }

  // Detect overlapping events on a given day (conflict detection §8.2).
  function conflictsOn(dayOffsetISO) {
    const evs = S.events.filter(e => (e.start || '').slice(0, 10) === dayOffsetISO && !e.tentative)
      .sort((a, b) => a.start < b.start ? -1 : 1);
    const out = [];
    for (let i = 0; i < evs.length; i++)
      for (let j = i + 1; j < evs.length; j++)
        if (evs[j].start < evs[i].end) out.push([evs[i], evs[j]]);
    return out;
  }
  // Focus capacity: free hours 8:00–18:00 today minus events (§8.3).
  function focusHours() {
    const evs = eventsToday().filter(e => e.kind !== 'deadline');
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), Math.max(8, now.getHours()), now.getHours() >= 8 ? now.getMinutes() : 0);
    const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 18, 0);
    if (start >= end) return 0;
    let busy = 0;
    evs.forEach(e => {
      const s = Math.max(+new Date(e.start), +start), en = Math.min(+new Date(e.end), +end);
      if (en > s) busy += en - s;
    });
    return Math.max(0, Math.round(((end - start) - busy) / 36e5 * 10) / 10);
  }

  /* ---- attention feed (§5, §30) — transparent scoring ---------------------- */
  function attention() {
    const items = [];
    unreadNotifs().forEach(n => {
      const priScore = { critical: 100, high: 70, normal: 40, digest: 10 }[n.pri] || 30;
      const du = daysUntil(n.due); const urg = du == null ? 0 : Math.max(0, 30 - du * 6);
      items.push({ score: priScore + urg, pri: n.pri, what: n.what, why: n.why + (n.action ? ' · ' + n.action : ''), link: n.link, kind: 'alert', ref: n.id });
    });
    pendingApprovals().forEach(a => items.push({ score: 62, pri: 'high', what: 'Approval: ' + a.title, why: 'Agent-proposed action awaiting your review', link: '#/agents', kind: 'approval', ref: a.id }));
    openTasks().filter(t => t.due && daysUntil(t.due) < 0).forEach(t =>
      items.push({ score: 55 + Math.min(20, -daysUntil(t.due) * 5) + (t.priority === 1 ? 15 : 0), pri: 'high', what: 'Overdue: ' + t.title, why: (-daysUntil(t.due)) + 'd overdue · ' + wsName(t.ws), link: '#/tasks', kind: 'task', ref: t.id }));
    inboxOpen().filter(m => m.importance === 1 && (m.triage === 'decision' || m.triage === 'reply')).forEach(m =>
      items.push({ score: 50, pri: 'high', what: (m.triage === 'decision' ? 'Decide: ' : 'Reply: ') + m.subject, why: 'From ' + m.from, link: '#/inbox', kind: 'message', ref: m.id }));
    conflictsOn(todayISO()).forEach(([a, b]) =>
      items.push({ score: 58, pri: 'high', what: 'Calendar conflict: ' + a.title + ' ↔ ' + b.title, why: fmtTime(b.start) + ' overlap — move or delegate one', link: '#/calendar', kind: 'conflict', ref: a.id }));
    return items.sort((a, b) => b.score - a.score);
  }

  /* ---- domain health (§5.1 portfolio snapshot) ------------------------------ */
  function domainHealth() {
    const d = [];
    const overdueP = openTasks().filter(t => t.due && daysUntil(t.due) < 0 && t.ws === 'ws_personal').length;
    d.push({ name: 'Personal', ws: 'ws_personal', rag: overdueP > 1 ? 'amber' : 'green', why: overdueP ? overdueP + ' overdue items' : 'systems quiet' });
    const famDecision = S.projects.find(p => p.id === 'p_kylen' && p.status === 'active');
    d.push({ name: 'Family', ws: 'ws_family', rag: famDecision ? 'amber' : 'green', why: famDecision ? 'pathway decision open' : 'on rhythm' });
    const kovaHealth = S.entities.filter(e => e.health === 'amber' || e.health === 'red').length;
    d.push({ name: 'Kova Group', ws: 'ws_holdings', rag: kovaHealth ? 'amber' : 'green', why: kovaHealth ? kovaHealth + ' companies need attention' : 'operating normally' });
    const reAlerts = S.properties.reduce((s, p) => s + (p.alerts || []).length, 0);
    d.push({ name: 'Real Estate', ws: 'ws_re', rag: reAlerts ? 'amber' : 'green', why: reAlerts ? reAlerts + ' property exceptions' : 'pipeline moving' });
    const nearStrike = S.positions.some(p => (p.options || []).some(o => o.type === 'cc' && p.price > o.strike * 0.95));
    d.push({ name: 'Investments', ws: 'ws_invest', rag: nearStrike ? 'amber' : 'green', why: nearStrike ? 'option near strike' : 'within risk limits' });
    const h = S.health.log.slice(-7); const sleepAvg = h.reduce((s, x) => s + x.sleepHrs, 0) / (h.length || 1);
    d.push({ name: 'Health', ws: 'ws_personal', rag: sleepAvg >= 6.8 ? 'green' : 'amber', why: 'sleep avg ' + sleepAvg.toFixed(1) + 'h · ' + h.filter(x => x.trained).length + ' sessions/7d' });
    return d;
  }

  /* ======================== router & shell ================================= */
  function reg(screen) { screens.push(screen); }
  function nav(hash) { location.hash = hash; }
  function parseHash() {
    const h = (location.hash || '#/home').replace(/^#\//, '');
    const [id, param] = h.split('/');
    route = { id: screens.some(s => s.id === id) ? id : 'home', param: param || null };
  }
  function screenById(id) { return screens.find(s => s.id === id); }

  const NAV_SECTIONS = [
    { name: 'Operate', ids: ['home', 'today', 'inbox', 'calendar', 'tasks', 'projects'] },
    { name: 'Portfolio', ids: ['portfolio', 'realestate', 'finance', 'investments'] },
    { name: 'Life', ids: ['family', 'docs', 'goals'] },
    { name: 'System', ids: ['agents', 'settings'] },
  ];

  function renderSidebar() {
    const el = $('#sidebar');
    let html = `<div class="logo"><div class="logo-mark">K</div><div class="logo-name">KOVA <span>OS</span></div></div><div class="nav">`;
    NAV_SECTIONS.forEach(sec => {
      html += `<div class="nav-section">${sec.name}</div>`;
      sec.ids.forEach(id => {
        const s = screenById(id); if (!s) return;
        const count = s.count ? s.count() : 0;
        html += `<button class="nav-item ${route.id === id ? 'active' : ''}" onclick="KOVA.nav('#/${id}')">
          <span class="ico">${s.icon}</span>${s.title}${count ? `<span class="count">${count}</span>` : ''}</button>`;
      });
    });
    html += `</div><div class="foot">
      <button class="nav-item" onclick="KOVA.togglePrivacy()"><span class="ico">${S.settings.privacy ? '🙈' : '👁'}</span>Privacy mode<span class="count">${S.settings.privacy ? 'on' : 'off'}</span></button>
      <div class="small muted" style="padding:6px 10px 2px">${KOVA.Sync && KOVA.Sync.enabled() ? 'Encrypted sync on' : 'Local data only'} · <span class="nowrap">${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span></div>
      <div id="sync-status">${KOVA.Sync && KOVA.Sync.statusLine ? KOVA.Sync.statusLine() : ''}</div>
    </div>`;
    el.innerHTML = html;
  }

  function renderTopbar() {
    const s = screenById(route.id);
    const ap = pendingApprovals().length, un = unreadNotifs().length;
    const ai = S.settings.ai;
    $('#topbar').innerHTML = `
      <div class="crumb">${s.icon} ${s.title}<span class="muted"> · ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</span></div>
      <div class="spacer"></div>
      <div class="searchbar" onclick="KOVA.openPalette()">⌕ Search or command… <kbd>⌘K</kbd></div>
      <button class="ai-pill" onclick="KOVA.nav('#/agents')" title="AI gateway status">
        <span class="ai-dot ${ai.connected ? 'on' : ''}"></span>${ai.connected ? esc(ai.model || 'local model') : 'AI offline'}</button>
      <button class="icon-btn" title="Approvals" onclick="KOVA.openApprovals()">✓${ap ? `<span class="bub">${ap}</span>` : ''}</button>
      <button class="icon-btn" title="Notifications" onclick="KOVA.openNotifs()">◔${un ? `<span class="bub accent">${un}</span>` : ''}</button>
      <button class="icon-btn" title="Quick capture (c)" onclick="KOVA.openCapture()">＋</button>`;
  }

  function renderTabbar() {
    const items = [
      { id: 'home', ico: '⌂', label: 'Home' },
      { id: 'today', ico: '☀', label: 'Today' },
      { id: 'capture', ico: '＋', label: 'Capture', cls: 'capture' },
      { id: 'inbox', ico: '▤', label: 'Inbox' },
      { id: 'more', ico: '≡', label: 'More' },
    ];
    $('#tabbar').innerHTML = items.map(i => `
      <button class="tab-item ${i.cls || ''} ${route.id === i.id ? 'active' : ''}"
        onclick="${i.id === 'capture' ? 'KOVA.openCapture()' : i.id === 'more' ? 'KOVA.openMore()' : `KOVA.nav('#/${i.id}')`}">
        <span class="ico">${i.ico}</span>${i.label}</button>`).join('');
  }

  function render() {
    if (!S) return;
    document.body.classList.toggle('privacy-on', !!S.settings.privacy);
    parseHash();
    renderSidebar(); renderTopbar(); renderTabbar();
    const s = screenById(route.id);
    postRender = [];
    $('#screen').innerHTML = s.render(route.param);
    postRender.forEach(fn => { try { fn(); } catch (e) { console.error(e); } });
    window.scrollTo(0, 0);
  }
  function after(fn) { postRender.push(fn); }
  function refresh() { save(); render(); }        // state changed → persist + repaint

  /* ======================== modal / toast =================================== */
  function modal(html, opts) {
    const root = $('#modal-root');
    root.innerHTML = `<div class="modal-back" onclick="if(event.target===this)KOVA.closeModal()">
      <div class="modal ${opts && opts.wide ? 'wide' : ''} ${opts && opts.cls ? opts.cls : ''}">${html}</div></div>`;
    const first = root.querySelector('input,textarea,select'); if (first && !(opts && opts.noFocus)) first.focus();
  }
  function closeModal() { $('#modal-root').innerHTML = ''; }
  function toast(msg) {
    const el = document.createElement('div'); el.className = 'toast'; el.textContent = msg;
    $('#toasts').appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .3s'; setTimeout(() => el.remove(), 320); }, 2600);
  }

  /* ======================== command palette (§21) ============================ */
  let palSel = 0;
  function openPalette() {
    modal(`<div class="palette-wrap">
      <input id="pal-q" placeholder="Search everything, or type a command…" autocomplete="off"
        oninput="KOVA.palRender()" onkeydown="KOVA.palKey(event)">
      <div class="pal-list" id="pal-list"></div></div>`, { cls: 'palette' });
    palSel = 0; palRender();
  }
  function palItems(q) {
    q = (q || '').toLowerCase().trim();
    const out = [];
    const push = (sec, label, meta, run, ico) => out.push({ sec, label, meta, run, ico: ico || '·' });
    // actions
    const actions = [
      ['New task', 'action', () => { closeModal(); openCapture('task'); }, '＋'],
      ['Quick capture', 'action', () => { closeModal(); openCapture(); }, '＋'],
      ['Run weekly review', 'action', () => { closeModal(); nav('#/goals/review'); }, '◎'],
      ['Record a decision', 'action', () => { closeModal(); nav('#/goals/decision'); }, '⚖'],
      ['Toggle privacy mode', 'action', () => { closeModal(); togglePrivacy(); }, '👁'],
      ['Open approval queue', 'action', () => { closeModal(); openApprovals(); }, '✓'],
      ['Talk to Copilot', 'action', () => { closeModal(); KOVA.Copilot.open(); }, '✦'],
      ['Export backup (JSON)', 'action', () => { closeModal(); exportJSON(); }, '⇩'],
    ];
    actions.forEach(([l, m, r, i]) => { if (!q || l.toLowerCase().includes(q)) push('Commands', l, m, r, i); });
    // screens
    screens.forEach(s => { if (!q || s.title.toLowerCase().includes(q)) push('Go to', s.title, 'screen', () => { closeModal(); nav('#/' + s.id); }, s.icon); });
    if (q) {
      S.tasks.filter(t => t.title.toLowerCase().includes(q)).slice(0, 5).forEach(t => push('Tasks', t.title, wsName(t.ws), () => { closeModal(); nav('#/tasks'); }));
      S.projects.filter(p => p.title.toLowerCase().includes(q)).slice(0, 4).forEach(p => push('Projects', p.title, wsName(p.ws), () => { closeModal(); nav('#/projects/' + p.id); }));
      S.contacts.filter(c => c.name.toLowerCase().includes(q) || (c.org || '').toLowerCase().includes(q)).slice(0, 4).forEach(c => push('People', c.name, c.org, () => { closeModal(); nav('#/family'); }));
      [...S.properties, ...S.opportunities].filter(p => p.name.toLowerCase().includes(q)).slice(0, 4).forEach(p => push('Real estate', p.name, p.stage || 'owned', () => { closeModal(); nav('#/realestate/' + p.id); }));
      S.documents.filter(dd => dd.title.toLowerCase().includes(q)).slice(0, 4).forEach(dd => push('Documents', dd.title, dd.type, () => { closeModal(); nav('#/docs'); }));
      S.positions.filter(p => p.ticker.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)).slice(0, 3).forEach(p => push('Investments', p.ticker + ' — ' + p.name, '', () => { closeModal(); nav('#/investments'); }));
      S.messages.filter(m => (m.subject + m.from).toLowerCase().includes(q)).slice(0, 3).forEach(m => push('Inbox', m.subject, m.from, () => { closeModal(); nav('#/inbox'); }));
    }
    return out.slice(0, 24);
  }
  function palRender() {
    const q = $('#pal-q') ? $('#pal-q').value : '';
    const items = palItems(q);
    palSel = Math.min(palSel, Math.max(0, items.length - 1));
    let html = ''; let lastSec = null;
    items.forEach((it, i) => {
      if (it.sec !== lastSec) { html += `<div class="pal-sec">${it.sec}</div>`; lastSec = it.sec; }
      html += `<div class="pal-item ${i === palSel ? 'sel' : ''}" onclick="KOVA.palRun(${i})" onmousemove="KOVA.palHover(${i})">
        <span class="ico">${it.ico}</span>${esc(it.label)}<span class="meta">${esc(it.meta || '')}</span></div>`;
    });
    $('#pal-list').innerHTML = html || '<div class="empty">No matches</div>';
    KOVA._palItems = items;
  }
  function palKey(e) {
    const items = KOVA._palItems || [];
    if (e.key === 'ArrowDown') { palSel = Math.min(items.length - 1, palSel + 1); palRender(); e.preventDefault(); }
    else if (e.key === 'ArrowUp') { palSel = Math.max(0, palSel - 1); palRender(); e.preventDefault(); }
    else if (e.key === 'Enter') { if (items[palSel]) items[palSel].run(); }
    else if (e.key === 'Escape') closeModal();
  }
  const palRun = (i) => { const it = (KOVA._palItems || [])[i]; if (it) it.run(); };
  const palHover = (i) => { if (palSel !== i) { palSel = i; palRender(); } };

  /* ======================== quick capture (§21.2) ============================ */
  function openCapture(presetType) {
    const wsOpts = S.workspaces.map(w => `<option value="${w.id}">${esc(w.name)}</option>`).join('');
    modal(`<h2>Quick capture</h2><div class="sub">One box for everything — KOVA infers what it is. Try “pay water bill friday”, “idea: bundle Sedona + kart day”, or a note.</div>
      <textarea id="cap-text" rows="3" placeholder="Capture a task, idea, note, or expense…"></textarea>
      <div class="grid cols-2">
        <div><label>Type</label><select id="cap-type">
          <option value="auto" ${!presetType ? 'selected' : ''}>Auto-detect</option>
          <option value="task" ${presetType === 'task' ? 'selected' : ''}>Task</option>
          <option value="idea">Idea / someday</option><option value="note">Note</option></select></div>
        <div><label>Workspace</label><select id="cap-ws"><option value="ws_personal">Personal</option>${wsOpts.replace('<option value="ws_personal">Personal</option>', '')}</select></div>
      </div>
      <div class="modal-foot">
        ${('webkitSpeechRecognition' in window) ? '<button class="btn ghost" onclick="KOVA.capVoice()">🎤 Voice</button>' : ''}
        <span class="spacer"></span>
        <button class="btn" onclick="KOVA.closeModal()">Cancel</button>
        <button class="btn primary" onclick="KOVA.capSave()">Capture</button></div>`);
    const ta = $('#cap-text');
    ta.addEventListener('keydown', (e) => { if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') capSave(); });
  }
  function capVoice() {
    const R = new webkitSpeechRecognition(); R.lang = 'en-US'; R.interimResults = false;
    toast('Listening…');
    R.onresult = (e) => { $('#cap-text').value += (($('#cap-text').value ? ' ' : '') + e.results[0][0].transcript); };
    R.onerror = () => toast('⚠ Voice capture failed');
    R.start();
  }
  // crude natural-language date extraction — good enough for capture triage
  function parseDue(text) {
    const t = text.toLowerCase();
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const mk = (offset) => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate() + offset, 12).toISOString().slice(0, 10); };
    if (/\btoday\b|\btonight\b/.test(t)) return mk(0);
    if (/\btomorrow\b/.test(t)) return mk(1);
    if (/\bnext week\b/.test(t)) return mk(7);
    for (let i = 0; i < 7; i++) {
      if (t.includes(days[i]) || new RegExp('\\b' + days[i].slice(0, 3) + '\\b').test(t)) {
        let off = (i - new Date().getDay() + 7) % 7; if (off === 0) off = 7; return mk(off);
      }
    }
    return null;
  }
  function capSave() {
    const text = $('#cap-text').value.trim(); if (!text) { closeModal(); return; }
    let type = $('#cap-type').value; const wsId = $('#cap-ws').value;
    if (type === 'auto') {
      if (/^idea[:\s]/i.test(text) || /\bsomeday\b/i.test(text)) type = 'idea';
      else if (/^note[:\s]/i.test(text) || /^log[:\s]/i.test(text)) type = 'note';
      else type = 'task';
    }
    if (type === 'task' || type === 'idea') {
      S.tasks.unshift({ id: uid(), title: text.replace(/^(idea|task)[:\s]+/i, ''), ws: wsId, projectId: null, due: type === 'task' ? parseDue(text) : null, status: type === 'idea' ? 'someday' : 'open', priority: 2, energy: 'med', estimateMin: 30, source: 'capture', nextAction: false, context: '' });
      logActivity('capture', 'Captured ' + type + ': ' + text.slice(0, 60));
      toast(type === 'idea' ? 'Idea saved to Someday' : 'Task captured' + (parseDue(text) ? ' · due ' + fmtDay(parseDue(text)) : ''));
    } else {
      S.captures.unshift({ id: uid(), text, ws: wsId, at: new Date().toISOString() });
      toast('Note captured');
    }
    closeModal(); refresh();
  }

  /* ======================== approvals & notifications ========================= */
  function openApprovals() {
    const list = pendingApprovals();
    modal(`<h2>Approval queue</h2><div class="sub">Agent-proposed actions wait here until you approve them (§22.3). Nothing executes without you.</div>
      <div class="rows">${list.map(a => {
        const ag = S.agents.find(x => x.id === a.agentId);
        return `<div class="feed-item"><div class="feed-rail" style="background:var(--warn)"></div>
        <div class="feed-body"><div class="feed-what">${esc(a.title)}</div>
        <div class="feed-why">${esc(a.detail)}</div>
        <div class="feed-why muted small">${ag ? esc(ag.name) : 'agent'} · ${fmtDay(a.at)} ${fmtTime(a.at)}</div>
        <div class="feed-act"><button class="btn sm primary" onclick="KOVA.approve('${a.id}')">Approve</button>
        <button class="btn sm" onclick="KOVA.rejectApproval('${a.id}')">Dismiss</button></div></div></div>`;
      }).join('') || '<div class="empty">Queue clear — healthy systems stay quiet.</div>'}</div>
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  }
  function approve(id) {
    const a = S.approvals.find(x => x.id === id); if (!a) return;
    a.status = 'approved'; a.resolvedAt = new Date().toISOString();
    if (a.payload && a.payload.task) {
      S.tasks.unshift(Object.assign({ id: uid(), status: 'open', priority: 2, energy: 'med', estimateMin: 20, source: 'agent', nextAction: true, projectId: null, context: '' }, a.payload.task));
      toast('Approved — task created');
    } else toast('Approved');
    logActivity('approval', 'Approved: ' + a.title);
    refresh(); openApprovals();
  }
  function rejectApproval(id) {
    const a = S.approvals.find(x => x.id === id); if (!a) return;
    a.status = 'rejected'; a.resolvedAt = new Date().toISOString();
    logActivity('approval', 'Dismissed: ' + a.title);
    refresh(); openApprovals();
  }
  function openNotifs() {
    const list = [...S.notifications].sort((a, b) => (a.read - b.read) || (a.at < b.at ? 1 : -1));
    const railColor = { critical: 'var(--crit)', high: 'var(--serious)', normal: 'var(--warn)', digest: 'var(--baseline)' };
    modal(`<h2>Notifications</h2><div class="sub">Exception-driven: what happened, why it matters, what to do, by when (§22.1).</div>
      <div class="rows">${list.map(n => `
        <div class="feed-item" style="${n.read ? 'opacity:.55' : ''}"><div class="feed-rail" style="background:${railColor[n.pri]}"></div>
        <div class="feed-body"><div class="feed-what">${esc(n.what)}</div>
          <div class="feed-why">${esc(n.why)} → <b>${esc(n.action)}</b>${n.due ? ' · by ' + fmtDay(n.due) : ''}</div>
          <div class="feed-act">
            <button class="btn sm" onclick="KOVA.closeModal();KOVA.nav('${n.link}')">Open</button>
            ${n.read ? '' : `<button class="btn sm ghost" onclick="KOVA.markRead('${n.id}')">Mark read</button>`}</div></div></div>`).join('') || '<div class="empty">No notifications.</div>'}</div>
      <div class="modal-foot">
        <button class="btn ghost" onclick="KOVA.markAllRead()">Mark all read</button>
        <button class="btn" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  }
  function markRead(id) { const n = S.notifications.find(x => x.id === id); if (n) n.read = true; refresh(); openNotifs(); }
  function markAllRead() { S.notifications.forEach(n => n.read = true); refresh(); closeModal(); }
  function openMore() {
    modal(`<h2>All screens</h2><div class="rows">` + NAV_SECTIONS.map(sec =>
      `<div class="pal-sec">${sec.name}</div>` + sec.ids.map(id => {
        const s = screenById(id);
        return `<div class="pal-item" onclick="KOVA.closeModal();KOVA.nav('#/${id}')"><span class="ico">${s.icon}</span>${s.title}</div>`;
      }).join('')).join('') + `</div>
      <div class="modal-foot"><button class="btn ghost" onclick="KOVA.togglePrivacy();KOVA.closeModal()">${S.settings.privacy ? 'Disable' : 'Enable'} privacy mode</button>
      <button class="btn" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  }

  function togglePrivacy() { S.settings.privacy = !S.settings.privacy; refresh(); toast(S.settings.privacy ? 'Privacy mode on — values hidden' : 'Privacy mode off'); }
  function logActivity(kind, text) { S.activity.unshift({ id: uid(), kind, text, at: new Date().toISOString() }); S.activity = S.activity.slice(0, 400); }

  /* ======================== viz helpers (dataviz-spec compliant) ============== */
  // sparkline — single series, 2px line, no chartjunk
  function spark(values, opts) {
    const o = Object.assign({ w: 120, h: 34, color: 'var(--s0)', fill: false, min: null, max: null }, opts || {});
    if (!values || values.length < 2) return '';
    const min = o.min != null ? o.min : Math.min(...values), max = o.max != null ? o.max : Math.max(...values);
    const rng = (max - min) || 1;
    const pts = values.map((v, i) => [(i / (values.length - 1)) * (o.w - 4) + 2, o.h - 3 - ((v - min) / rng) * (o.h - 8)]);
    const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
    const area = o.fill ? `<path d="${path} L${pts[pts.length - 1][0].toFixed(1)},${o.h - 2} L${pts[0][0].toFixed(1)},${o.h - 2} Z" fill="${o.color}" opacity="0.14"/>` : '';
    return `<svg class="spark" width="${o.w}" height="${o.h}" viewBox="0 0 ${o.w} ${o.h}" aria-hidden="true">${area}
      <path d="${path}" fill="none" stroke="${o.color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="${pts[pts.length - 1][0].toFixed(1)}" cy="${pts[pts.length - 1][1].toFixed(1)}" r="2.6" fill="${o.color}"/></svg>`;
  }
  // line/area chart with crosshair+tooltip (single series)
  function lineChart(id, rows, opts) {
    const o = Object.assign({ h: 180, color: 'var(--s0)', fmt: (v) => v, label: (r) => r.x }, opts || {});
    after(() => {
      const host = document.getElementById(id); if (!host) return;
      const w = host.clientWidth || 600, h = o.h, padL = 8, padR = 8, padT = 10, padB = 20;
      const vals = rows.map(r => r.y);
      const min = Math.min(...vals), max = Math.max(...vals); const rng = (max - min) || 1;
      const X = (i) => padL + (i / (rows.length - 1)) * (w - padL - padR);
      const Y = (v) => padT + (1 - (v - min) / rng) * (h - padT - padB);
      const pts = rows.map((r, i) => [X(i), Y(r.y)]);
      const path = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ');
      const gridY = [min, min + rng / 2, max];
      host.innerHTML = `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="trend chart">
        ${gridY.map(v => `<line x1="${padL}" x2="${w - padR}" y1="${Y(v).toFixed(1)}" y2="${Y(v).toFixed(1)}" stroke="var(--grid)" stroke-width="1"/>`).join('')}
        <path d="${path} L${pts[pts.length - 1][0].toFixed(1)},${h - padB} L${pts[0][0].toFixed(1)},${h - padB} Z" fill="${o.color}" opacity="0.12"/>
        <path d="${path}" fill="none" stroke="${o.color}" stroke-width="2" stroke-linejoin="round"/>
        <line id="${id}-x" y1="${padT}" y2="${h - padB}" stroke="var(--baseline)" stroke-width="1" style="display:none"/>
        <circle id="${id}-c" r="4" fill="${o.color}" stroke="var(--surface)" stroke-width="2" style="display:none"/>
        <text x="${padL}" y="${h - 6}" font-size="10" fill="var(--ink-3)">${esc(o.label(rows[0]))}</text>
        <text x="${w - padR}" y="${h - 6}" font-size="10" fill="var(--ink-3)" text-anchor="end">${esc(o.label(rows[rows.length - 1]))}</text>
      </svg><div class="tip" id="${id}-tip"></div>`;
      const tip = document.getElementById(id + '-tip'), xl = document.getElementById(id + '-x'), c = document.getElementById(id + '-c');
      host.onmousemove = (e) => {
        const b = host.getBoundingClientRect();
        const i = Math.max(0, Math.min(rows.length - 1, Math.round(((e.clientX - b.left - padL) / (w - padL - padR)) * (rows.length - 1))));
        xl.setAttribute('x1', X(i)); xl.setAttribute('x2', X(i)); xl.style.display = '';
        c.setAttribute('cx', X(i)); c.setAttribute('cy', Y(rows[i].y)); c.style.display = '';
        tip.style.display = 'block';
        tip.innerHTML = `<b>${esc(o.label(rows[i]))}</b> · ${o.fmt(rows[i].y)}`;
        const tx = Math.min(w - 150, Math.max(4, X(i) + 10));
        tip.style.left = tx + 'px'; tip.style.top = (Y(rows[i].y) - 34) + 'px';
      };
      host.onmouseleave = () => { tip.style.display = 'none'; xl.style.display = 'none'; c.style.display = 'none'; };
    });
    return `<div class="viz" id="${id}" style="height:${o.h}px"></div>`;
  }
  // horizontal magnitude bars — one measure, one hue, direct labels
  function barsH(rows, opts) {
    const o = Object.assign({ color: 'var(--s0)', fmt: (v) => v, max: null }, opts || {});
    const max = o.max != null ? o.max : Math.max(...rows.map(r => Math.abs(r.v)), 1);
    return `<div class="rows">` + rows.map(r => `
      <div style="padding:5px 0">
        <div style="display:flex;justify-content:space-between;font-size:12px;margin-bottom:3px">
          <span>${r.swatch ? `<span class="wsdot" style="background:${r.swatch}"></span> ` : ''}${esc(r.k)}</span>
          <span class="num muted">${o.fmt(r.v)}</span></div>
        <div class="bar"><i style="width:${Math.max(2, Math.round(Math.abs(r.v) / max * 100))}%;background:${r.swatch || o.color}"></i></div>
      </div>`).join('') + `</div>`;
  }
  // readiness ring (single value 0-100)
  function ring(val, opts) {
    const o = Object.assign({ size: 74, color: val >= 75 ? 'var(--good)' : val >= 55 ? 'var(--warn)' : 'var(--serious)' }, opts || {});
    const r = (o.size - 10) / 2, c = 2 * Math.PI * r;
    return `<div class="readiness-ring" style="width:${o.size}px;height:${o.size}px">
      <svg width="${o.size}" height="${o.size}" aria-label="readiness ${val}">
        <circle cx="${o.size / 2}" cy="${o.size / 2}" r="${r}" fill="none" stroke="var(--grid)" stroke-width="7"/>
        <circle cx="${o.size / 2}" cy="${o.size / 2}" r="${r}" fill="none" stroke="${o.color}" stroke-width="7"
          stroke-linecap="round" stroke-dasharray="${(c * val / 100).toFixed(1)} ${c.toFixed(1)}"
          transform="rotate(-90 ${o.size / 2} ${o.size / 2})"/></svg>
      <div class="val num">${val}</div></div>`;
  }

  /* ======================== boot ============================================ */
  function init() {
    load();
    window.addEventListener('hashchange', render);
    window.addEventListener('keydown', (e) => {
      const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName);
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); openPalette(); }
      else if (e.key === 'Escape') { closeModal(); if (KOVA.Copilot) KOVA.Copilot.close(); }
      else if (!typing && e.key === 'c' && !e.metaKey && !e.ctrlKey) { openCapture(); e.preventDefault(); }
    });
    $('#copilot-fab').addEventListener('click', () => KOVA.Copilot.open());
    if (!location.hash) location.hash = '#/home';
    render();
    if (KOVA.Sync && KOVA.Sync.checkOnLoad) KOVA.Sync.checkOnLoad();
    // keep "now" indicators fresh
    setInterval(() => { if (route.id === 'home' || route.id === 'today') render(); }, 90000);
  }

  return {
    // state & core
    get S() { return S; }, save, refresh, render, init, reg, nav, after,
    replaceState, resetDemo, exportJSON, importJSON, logActivity,
    // utils
    $, esc, uid, money, pct, fmtTime, fmtDay, fmtDate, dueBadge, daysUntil, todayISO,
    ws, wsColor, wsName, wsChip, proj, healthBadge,
    netWorth, liquidCash, positionsValue, openTasks, tasksDueToday, eventsToday,
    pendingApprovals, inboxOpen, unreadNotifs, conflictsOn, focusHours, attention, domainHealth,
    // ui
    modal, closeModal, toast, openPalette, palRender, palKey, palRun, palHover,
    openCapture, capSave, capVoice, openApprovals, approve, rejectApproval,
    openNotifs, markRead, markAllRead, openMore, togglePrivacy,
    // viz
    spark, lineChart, barsH, ring,
  };
})();
