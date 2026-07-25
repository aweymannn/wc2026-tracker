/* ============================================================================
   HQ — screens, part 2
   Business Portfolio · Real Estate · Finance · Investments · Family & Health ·
   Documents & Knowledge · Goals & Reviews · Settings & Integrations
   ========================================================================== */
'use strict';

(() => {
  const K = KOVA;
  const V = (K.V = K.V || {});
  const esc = K.esc, money = K.money;

  /* ═══════════════════════ BUSINESS PORTFOLIO ═══════════════════════ */
  K.reg({
    id: 'portfolio', title: 'Business Portfolio', icon: '◈',
    render(param) {
      const S = K.S;
      if (param) return V.entityDetail(param);
      const totCash = S.entities.reduce((s, e) => s + e.cash, 0);
      const totRev = S.entities.reduce((s, e) => s + e.revenueMTD, 0);
      return `
      <div class="grid cols-3">
        <div class="card metric"><div class="k">Combined operating cash</div><div class="v">${money(totCash, { short: true })}</div><div class="sub">across ${S.entities.length} entities</div></div>
        <div class="card metric"><div class="k">Revenue MTD</div><div class="v">${money(totRev, { short: true })}</div><div class="sub">all companies</div></div>
        <div class="card metric"><div class="k">Compliance due ≤45d</div><div class="v">${S.entities.flatMap(e => e.compliance).filter(c => K.daysUntil(c.due) <= 45).length}</div><div class="sub">filings & renewals</div></div>
      </div>
      <div class="grid cols-2 section-gap">${S.entities.map(e => `
        <div class="card" style="cursor:pointer" onclick="KOVA.nav('#/portfolio/${e.id}')">
          <div style="display:flex;align-items:start;gap:8px">
            <div class="grow"><div style="font-weight:700;font-size:15px">${esc(e.name)}</div>
              <div class="small muted">${esc(e.type)} · ${esc(e.stage)}</div></div>
            ${K.healthBadge(e.health)}</div>
          <div style="display:flex;gap:18px;margin:10px 0 6px;align-items:flex-end">
            <div><div class="small muted">Cash</div><div style="font-weight:650" class="num">${money(e.cash, { short: true })}</div></div>
            <div><div class="small muted">Rev MTD</div><div style="font-weight:650" class="num">${money(e.revenueMTD, { short: true })}</div></div>
            <div style="margin-left:auto">${K.spark(e.revTrend, { w: 110, h: 30, color: K.wsColor(e.ws), fill: true })}<div class="small muted" style="text-align:right">6-mo revenue</div></div>
          </div>
          <div class="small" style="color:var(--ink-2)">Now: ${esc(e.priorities[0] || '—')}</div>
        </div>`).join('')}</div>
      <div class="small muted section-gap">Holding-company view over Kova Holdings, Kova Living, Kova Stays and TRIBE (§10). Click a company for its operating dashboard.</div>`;
    },
  });
  V.entityDetail = (id) => {
    const S = K.S; const e = S.entities.find(x => x.id === id);
    if (!e) return '<div class="empty">Company not found.</div>';
    const props = S.properties.filter(p => p.entity === id);
    const projs = S.projects.filter(p => p.ws === e.ws);
    const docs = S.documents.filter(dd => dd.rel === id);
    return `<button class="detail-back" onclick="KOVA.nav('#/portfolio')">← Portfolio</button>
    <div class="card">
      <div style="display:flex;gap:8px;align-items:start">
        <div class="grow"><h2 style="font-size:18px">${esc(e.name)}</h2>
        <div class="small muted">${esc(e.type)} · ${esc(e.stage)} · ownership ${esc(e.ownership)}</div></div>${K.healthBadge(e.health)}</div>
      <p style="color:var(--ink-2);font-size:13.5px">${esc(e.purpose)}</p>
      <div class="grid cols-4">${e.metrics.map(([k, v]) => `<div class="card metric" style="background:var(--raised)"><div class="k">${esc(k)}</div><div class="v" style="font-size:17px">${esc(v)}</div></div>`).join('')}</div>
    </div>
    <div class="two-col section-gap">
      <div>
        <div class="card"><div class="card-head"><h3>Current priorities</h3></div>
          <div class="rows">${e.priorities.map(p => `<div class="row"><span class="dot" style="background:${K.wsColor(e.ws)}"></span><div class="grow"><div class="title">${esc(p)}</div></div></div>`).join('')}</div></div>
        ${props.length ? `<div class="card section-gap"><div class="card-head"><h3>Properties</h3></div>
          <div class="rows">${props.map(p => `<div class="row clickable" onclick="KOVA.nav('#/realestate/${p.id}')">
            <div class="grow"><div class="title">${esc(p.name)}</div><div class="meta"><span>occ ${K.pct(p.occupancy)}</span><span>DSCR ${p.dscr}</span><span>${(p.workOrders || []).length} work orders</span></div></div>
            ${(p.alerts || []).length ? `<span class="badge amber">${p.alerts.length} alerts</span>` : '<span class="badge green">ok</span>'}</div>`).join('')}</div></div>` : ''}
        ${projs.length ? `<div class="card section-gap"><div class="card-head"><h3>Linked projects</h3></div>
          <div class="rows">${projs.map(p => `<div class="row clickable" onclick="KOVA.nav('#/projects/${p.id}')"><div class="grow"><div class="title">${esc(p.title)}</div></div>${K.healthBadge(p.health)}</div>`).join('')}</div></div>` : ''}
      </div>
      <div>
        <div class="card"><div class="card-head"><h3>Risks & decisions</h3></div>
          <div class="rows">${e.risks.map(r => `<div class="row"><span class="dot" style="background:var(--warn)"></span><div class="grow"><div class="title" style="font-size:13px">${esc(r)}</div></div></div>`).join('') || '<div class="empty">No open risks.</div>'}</div></div>
        <div class="card section-gap"><div class="card-head"><h3>Compliance calendar</h3></div>
          <div class="rows">${e.compliance.map(c => `<div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(c.item)}</div></div>${K.dueBadge(c.due)}</div>`).join('') || '<div class="empty">Nothing due.</div>'}</div></div>
        ${docs.length ? `<div class="card section-gap"><div class="card-head"><h3>Documents</h3></div>
          <div class="rows">${docs.map(dd => `<div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(dd.title)}</div><div class="meta">${esc(dd.type)}</div></div></div>`).join('')}</div></div>` : ''}
      </div>
    </div>`;
  };

  /* ═══════════════════════ REAL ESTATE ═══════════════════════ */
  const STAGES = ['Sourced', 'Initial screen', 'Underwriting', 'Offer submitted', 'Under contract', 'Diligence', 'Financing', 'Closing', 'Owned', 'Declined'];
  K.reg({
    id: 'realestate', title: 'Real Estate', icon: '⌗',
    render(param) {
      const S = K.S;
      if (param) {
        const opp = S.opportunities.find(o => o.id === param);
        if (opp) return V.oppDetail(opp);
        const prop = S.properties.find(p => p.id === param);
        if (prop) return V.propDetail(prop);
      }
      const active = S.opportunities.filter(o => o.stage !== 'Declined');
      const cols = STAGES.filter(st => st !== 'Owned').map(st => ({ st, items: S.opportunities.filter(o => o.stage === st) })).filter(c => c.items.length);
      return `
      <div class="card-head"><h3>Owned assets</h3></div>
      <div class="grid cols-2">${S.properties.map(p => `
        <div class="card" style="cursor:pointer" onclick="KOVA.nav('#/realestate/${p.id}')">
          <div style="display:flex;gap:8px;align-items:start"><div class="grow">
            <div style="font-weight:650">${esc(p.name)}</div><div class="small muted">${esc(p.address)} · ${esc(p.strategy)}</div></div>
            ${(p.alerts || []).length ? `<span class="badge amber">${p.alerts.length} exceptions</span>` : '<span class="badge green">quiet</span>'}</div>
          <div class="grid cols-4" style="margin-top:10px;gap:8px">
            <div><div class="small muted">Occupancy</div><div class="num" style="font-weight:650">${K.pct(p.occupancy)}</div></div>
            <div><div class="small muted">NOI /mo</div><div class="num" style="font-weight:650">${money(p.rentMo - p.expensesMo, { short: true })}</div></div>
            <div><div class="small muted">DSCR</div><div class="num" style="font-weight:650">${p.dscr}</div></div>
            <div><div class="small muted">Equity</div><div class="num" style="font-weight:650">${money(p.valuation - p.debt, { short: true })}</div></div>
          </div></div>`).join('')}</div>

      <div class="card-head section-gap"><h3>Acquisition pipeline (${active.length} active)</h3></div>
      <div class="pipe">${cols.map(c => `
        <div class="pipe-col"><h4>${c.st}<span class="spacer"></span>${c.items.length}</h4>
          ${c.items.map(o => `<div class="pipe-card" onclick="KOVA.nav('#/realestate/${o.id}')">
            <div style="font-size:12.5px;font-weight:650">${esc(o.name)}</div>
            <div class="small muted">${esc(o.market)} · ${o.units} units</div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;align-items:center">
              <span class="num small">${money(o.asking, { short: true })}</span>
              <span class="badge ${V.buyboxTotal(o) >= 7 ? 'green' : V.buyboxTotal(o) >= 5.5 ? 'amber' : 'red'}">score ${V.buyboxTotal(o).toFixed(1)}</span></div>
            ${o.deadline ? `<div class="small muted" style="margin-top:4px">deadline ${K.fmtDay(o.deadline)}</div>` : ''}
          </div>`).join('')}</div>`).join('')}</div>
      <div class="small muted section-gap">Pipeline stages, buy-box scoring and underwriting follow §11. Click a deal to see assumptions, sensitivity and next actions — the underwriting model is live and editable.</div>`;
    },
  });
  V.buyboxTotal = (o) => { const f = Object.values(o.score); return f.reduce((s, x) => s + x, 0) / f.length; };

  /* live underwriting model (§11.3) */
  V.uwCalc = (uw) => {
    const loan = uw.price * (1 - uw.downPct / 100);
    const down = uw.price * uw.downPct / 100;
    const closing = uw.price * uw.closingPct / 100;
    const cashIn = down + closing + uw.rehab;
    const r = uw.ratePct / 100 / 12, n = uw.termYrs * 12;
    const pmt = r > 0 ? loan * r / (1 - Math.pow(1 + r, -n)) : loan / n;
    const gsi = (uw.rentMo + uw.otherIncMo) * 12;
    const egi = gsi * (1 - uw.vacancyPct / 100);
    const opex = egi * uw.opexPct / 100 + uw.taxesYr + uw.insYr + egi * uw.mgmtPct / 100;
    const noi = egi - opex;
    const ds = pmt * 12;
    return {
      loan, down, closing, cashIn, pmt, gsi, egi, opex, noi, ds,
      dscr: ds ? noi / ds : 0,
      coc: cashIn ? (noi - ds) / cashIn : 0,
      cap: uw.price ? noi / uw.price : 0,
      yoc: (uw.price + uw.rehab + closing) ? noi / (uw.price + uw.rehab + closing) : 0,
    };
  };
  const UW_FIELDS = [
    ['price', 'Price $'], ['downPct', 'Down %'], ['ratePct', 'Rate %'], ['termYrs', 'Term yrs'],
    ['closingPct', 'Closing %'], ['rehab', 'Rehab $'], ['rentMo', 'Rent /mo $'], ['otherIncMo', 'Other inc /mo $'],
    ['vacancyPct', 'Vacancy %'], ['opexPct', 'Opex % (ex T/I/M)'], ['taxesYr', 'Taxes /yr $'], ['insYr', 'Insurance /yr $'], ['mgmtPct', 'Mgmt %'],
  ];
  const SCORE_LABELS = { yieldOnCost: 'Yield on cost', irr: 'Levered IRR', dscr: 'DSCR', fit: 'Strategic fit', submarket: 'Submarket quality', revenue: 'Revenue confidence', regulatory: 'Regulatory risk', insurance: 'Insurance / climate', complexity: 'Op complexity', exit: 'Exit liquidity' };

  V.oppDetail = (o) => {
    const c = V.uwCalc(o.uw);
    const pass = (v, floor) => v >= floor ? 'var(--good)' : 'var(--crit)';
    return `<button class="detail-back" onclick="KOVA.nav('#/realestate')">← Real estate</button>
    <div class="card">
      <div style="display:flex;gap:10px;align-items:start;flex-wrap:wrap">
        <div class="grow"><h2 style="font-size:18px">${esc(o.name)}</h2>
          <div class="small muted">${esc(o.market)} · ${o.units} units · ${esc(o.strategy)} · via ${esc(o.source)}</div></div>
        <select style="width:auto" onchange="KOVA.V.oppStage('${o.id}', this.value)">
          ${STAGES.map(s => `<option ${o.stage === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
      </div>
      <div class="callout" style="margin-top:10px"><b>Next:</b> ${esc(o.nextAction)}${o.deadline ? ` · <b>deadline ${K.fmtDay(o.deadline)}</b>` : ''}</div>
    </div>
    <div class="two-col section-gap">
      <div class="card">
        <div class="card-head"><h3>Underwriting — live model</h3><span class="muted small">edit any assumption</span></div>
        <div class="grid cols-4" style="gap:8px">${UW_FIELDS.map(([f, l]) => `
          <div><label style="margin-top:4px">${l}</label>
          <input class="num" type="number" step="any" value="${o.uw[f]}" oninput="KOVA.V.uwSet('${o.id}','${f}',this.value)"></div>`).join('')}</div>
        <hr class="divider">
        <div class="grid cols-4" style="gap:8px">
          <div class="card metric" style="background:var(--raised)"><div class="k">DSCR</div><div class="v num" style="font-size:19px;color:${pass(c.dscr, 1.25)}">${c.dscr.toFixed(2)}</div><div class="sub">floor 1.25</div></div>
          <div class="card metric" style="background:var(--raised)"><div class="k">Cash-on-cash</div><div class="v num" style="font-size:19px;color:${pass(c.coc, 0.06)}">${K.pct(c.coc, 1)}</div><div class="sub">floor 6%</div></div>
          <div class="card metric" style="background:var(--raised)"><div class="k">Cap rate</div><div class="v num" style="font-size:19px">${K.pct(c.cap, 1)}</div><div class="sub">at price</div></div>
          <div class="card metric" style="background:var(--raised)"><div class="k">Yield on cost</div><div class="v num" style="font-size:19px;color:${pass(c.yoc, 0.065)}">${K.pct(c.yoc, 1)}</div><div class="sub">floor 6.5%</div></div>
        </div>
        <div class="small muted num" style="margin-top:10px">
          NOI ${money(Math.round(c.noi))} /yr · debt service ${money(Math.round(c.ds))} /yr · cash required ${money(Math.round(c.cashIn))} (down ${money(Math.round(c.down), { short: true })} + closing ${money(Math.round(c.closing), { short: true })} + rehab ${money(o.uw.rehab, { short: true })})
        </div>
        <div class="btnrow" style="margin-top:10px">
          <button class="btn sm" onclick="KOVA.Agents.runAgent('ag_underwrite','${o.id}')">✦ Agent second opinion</button>
        </div>
      </div>
      <div>
        <div class="card"><div class="card-head"><h3>Buy-box score · ${V.buyboxTotal(o).toFixed(1)}/10</h3></div>
          ${K.barsH(Object.entries(o.score).map(([k, v]) => ({ k: SCORE_LABELS[k] || k, v })), { max: 10, color: 'var(--s0)', fmt: v => v + '/10' })}
          <div class="small muted" style="margin-top:6px">Assumption-driven, not a verdict — see §11.2. Edit factors in seed data or via agent runs.</div></div>
        <div class="card section-gap"><div class="card-head"><h3>Risks & notes</h3></div>
          <div class="rows">${(o.risks || []).map(r => `<div class="row"><span class="dot" style="background:var(--warn)"></span><div class="grow"><div class="title" style="font-size:13px">${esc(r)}</div></div></div>`).join('') || '<div class="empty">None logged.</div>'}</div>
          ${o.notes ? `<div class="small" style="color:var(--ink-2);margin-top:8px">${esc(o.notes)}</div>` : ''}</div>
      </div>
    </div>`;
  };
  V.uwSet = (id, f, val) => {
    const o = K.S.opportunities.find(x => x.id === id); if (!o) return;
    o.uw[f] = +val || 0; K.save();
    // repaint only the outputs by re-rendering the screen (inputs keep focus via value match)
    const active = document.activeElement; const sel = active ? { id: active.getAttribute('oninput'), pos: active.selectionStart } : null;
    K.render();
    if (sel) { const el = [...document.querySelectorAll('input')].find(i => i.getAttribute('oninput') === sel.id); if (el) { el.focus(); try { el.setSelectionRange(sel.pos, sel.pos); } catch (e) {} } }
  };
  V.oppStage = (id, stage) => {
    const o = K.S.opportunities.find(x => x.id === id); if (!o) return;
    o.stage = stage; K.logActivity('re', o.name + ' → ' + stage); K.refresh(); K.toast('Moved to ' + stage);
  };
  V.propDetail = (p) => {
    const S = K.S;
    const noi = (p.rentMo - p.expensesMo) * 12;
    return `<button class="detail-back" onclick="KOVA.nav('#/realestate')">← Real estate</button>
    <div class="card">
      <div style="display:flex;gap:8px;align-items:start"><div class="grow">
        <h2 style="font-size:18px">${esc(p.name)}</h2>
        <div class="small muted">${esc(p.address)} · ${esc(p.strategy)} · acquired ${p.acquired}</div></div>
        ${(p.alerts || []).length ? `<span class="badge amber">${p.alerts.length} exceptions</span>` : '<span class="badge green">quiet</span>'}</div>
      <div class="grid cols-4" style="margin-top:12px">
        <div class="card metric" style="background:var(--raised)"><div class="k">NOI (annual)</div><div class="v" style="font-size:18px">${money(noi, { short: true })}</div></div>
        <div class="card metric" style="background:var(--raised)"><div class="k">Occupancy</div><div class="v" style="font-size:18px">${K.pct(p.occupancy)}</div></div>
        <div class="card metric" style="background:var(--raised)"><div class="k">DSCR</div><div class="v" style="font-size:18px">${p.dscr}</div></div>
        <div class="card metric" style="background:var(--raised)"><div class="k">Equity</div><div class="v" style="font-size:18px">${money(p.valuation - p.debt, { short: true })}</div><div class="sub">${money(p.valuation, { short: true })} − ${money(p.debt, { short: true })} @ ${p.rate}%</div></div>
      </div>
      ${(p.alerts || []).length ? `<div class="callout warn" style="margin-top:10px">${p.alerts.map(esc).join(' · ')}</div>` : ''}
    </div>
    <div class="two-col section-gap">
      <div class="card"><div class="card-head"><h3>Work orders</h3></div>
        <div class="rows">${(p.workOrders || []).map(w => `
          <div class="row"><span class="dot" style="background:${w.priority === 'high' ? 'var(--crit)' : w.priority === 'med' ? 'var(--warn)' : 'var(--baseline)'}"></span>
          <div class="grow"><div class="title">${esc(w.title)}</div><div class="meta"><span>${esc(w.status)}</span><span>${esc(w.vendor || '')}</span><span>${w.ageDays}d old</span></div></div></div>`).join('') || '<div class="empty">No open work orders.</div>'}</div></div>
      <div class="card"><div class="card-head"><h3>Renewals & compliance</h3></div>
        <div class="rows">${(p.renewals || []).map(r2 => `<div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(r2.item)}</div></div>${K.dueBadge(r2.due)}</div>`).join('')}</div></div>
    </div>`;
  };

  /* ═══════════════════════ FINANCE & NET WORTH ═══════════════════════ */
  let scenarioAdj = { label: '', amount: 0, day: 30 };
  K.reg({
    id: 'finance', title: 'Finance', icon: '⊞',
    render() {
      const S = K.S;
      const nw = K.netWorth(), liq = K.liquidCash();
      const catSum = (f) => S.accounts.filter(f).reduce((s, a) => s + a.balance, 0);
      const cats = [
        ['Cash & equivalents', catSum(a => a.liquidity === 'liquid' && a.balance > 0 && a.type !== 'heloc')],
        ['Brokerage & retirement', catSum(a => a.type === 'brokerage' || a.type === 'retirement')],
        ['Real estate equity', S.properties.reduce((s, p) => s + p.valuation - p.debt, 0) + catSum(a => a.type === 'asset')],
        ['Self-custody assets', S.positions.filter(p => p.account === 'Self-custody').reduce((s, p) => s + p.qty * p.price, 0)],
        ['Liabilities (non-mortgage)', catSum(a => a.type === 'heloc')],
      ];
      const rows = S.nwHistory.map(h => ({ x: h.m, y: h.total }));
      const forecast = V.cashForecast();
      const dueSoon = [...S.obligations].filter(o => K.daysUntil(o.due) >= 0).sort((a, b) => a.due < b.due ? -1 : 1);
      return `
      <div class="grid cols-4">
        <div class="card metric"><div class="k">Net worth</div><div class="v">${money(nw, { short: true })}</div><div class="sub">${money(nw - S.nwHistory[0].total, { short: true })} vs 12mo ago</div></div>
        <div class="card metric"><div class="k">Liquid cash</div><div class="v">${money(liq, { short: true })}</div><div class="sub">+ $130k HELOC available</div></div>
        <div class="card metric"><div class="k">90-day low point</div><div class="v">${money(forecast.low, { short: true })}</div><div class="sub">around ${K.fmtDate(forecast.lowDate)}</div></div>
        <div class="card metric"><div class="k">Obligations ≤30d</div><div class="v">${money(dueSoon.filter(o => K.daysUntil(o.due) <= 30).reduce((s, o) => s + o.amount, 0), { short: true })}</div><div class="sub">${dueSoon.filter(o => K.daysUntil(o.due) <= 30).length} items</div></div>
      </div>
      <div class="two-col section-gap">
        <div>
          <div class="card"><div class="card-head"><h3>Net worth — 12 months</h3></div>
            ${K.lineChart('nw-chart', rows, { h: 190, fmt: (v) => '$' + (v / 1e6).toFixed(2) + 'M', label: (r) => r.x })}</div>
          <div class="card section-gap"><div class="card-head"><h3>Cash forecast — 90 days</h3><span class="muted small">income − obligations, from live data</span></div>
            ${K.lineChart('cf-chart', forecast.rows, { h: 170, color: 'var(--s4)', fmt: (v) => money(Math.round(v), { short: true }).replace(/<[^>]+>/g, ''), label: (r) => r.x })}
            <div class="grid cols-3" style="margin-top:10px;gap:8px">
              <div><label>Scenario label</label><input id="sc-label" value="${esc(scenarioAdj.label)}" placeholder="e.g. Gilbert land sale"></div>
              <div><label>Amount (+in / −out)</label><input id="sc-amount" type="number" value="${scenarioAdj.amount || ''}" placeholder="250000"></div>
              <div><label>Day (0–90)</label><input id="sc-day" type="number" value="${scenarioAdj.day}" min="0" max="90"></div>
            </div>
            <div class="btnrow" style="margin-top:8px"><button class="btn sm" onclick="KOVA.V.scenario()">Model scenario</button>
            ${scenarioAdj.amount ? '<button class="btn sm ghost" onclick="KOVA.V.scenarioClear()">Clear</button>' : ''}</div></div>
        </div>
        <div>
          <div class="card"><div class="card-head"><h3>Balance sheet</h3></div>
            ${K.barsH(cats.map(([k, v]) => ({ k, v })), { fmt: (v) => money(Math.round(v), { short: true }) })}
            <hr class="divider">
            <div class="rows">${S.accounts.map(a => `
              <div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(a.name)}</div>
              <div class="meta"><span>${esc(a.institution)}</span><span>${esc(a.owner)}</span></div></div>
              <span class="num" style="font-weight:650;color:${a.balance < 0 ? 'var(--serious)' : 'var(--ink)'}">${money(a.balance, { short: true })}</span></div>`).join('')}</div></div>
          <div class="card section-gap"><div class="card-head"><h3>Bills, renewals & compliance</h3></div>
            <div class="rows">${dueSoon.slice(0, 9).map(o => `
              <div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(o.name)}</div>
              <div class="meta"><span>${esc(o.category)}</span><span>${o.recur}</span>${o.autopay ? '<span>autopay</span>' : ''}</div></div>
              <span class="num small" style="margin-right:8px">${money(o.amount, { short: true })}</span>${K.dueBadge(o.due)}</div>`).join('')}</div></div>
        </div>
      </div>`;
    },
  });
  V.cashForecast = () => {
    const S = K.S;
    const incomeMo = S.properties.reduce((s, p) => s + p.rentMo * p.occupancy, 0) + S.entities.reduce((s, e) => s + e.revenueMTD, 0) * 0.35; // conservative margin on business revenue
    let bal = K.liquidCash();
    const rows = []; let low = bal, lowDate = K.todayISO();
    for (let dd = 0; dd <= 90; dd += 3) {
      const iso = new Date(Date.now() + dd * 86400000).toISOString().slice(0, 10);
      // obligations falling due in this 3-day window (recurring approximated monthly)
      S.obligations.forEach(o => {
        const du = K.daysUntil(o.due);
        const hits = [];
        if (du >= dd - 2 && du <= dd) hits.push(1);
        if (o.recur === 'monthly') { for (let m = 1; m <= 3; m++) { const du2 = du + m * 30; if (du2 >= dd - 2 && du2 <= dd) hits.push(1); } }
        hits.forEach(() => bal -= o.amount);
      });
      bal += incomeMo / 10; // 3-day slice of monthly income
      if (scenarioAdj.amount && Math.abs(dd - scenarioAdj.day) <= 1) bal += scenarioAdj.amount;
      if (bal < low) { low = bal; lowDate = iso; }
      rows.push({ x: K.fmtDate(iso), y: Math.round(bal) });
    }
    return { rows, low, lowDate };
  };
  V.scenario = () => {
    scenarioAdj = { label: K.$('#sc-label').value, amount: +K.$('#sc-amount').value || 0, day: Math.min(90, Math.max(0, +K.$('#sc-day').value || 0)) };
    K.render(); K.toast(scenarioAdj.amount ? 'Scenario applied to forecast' : 'Enter an amount');
  };
  V.scenarioClear = () => { scenarioAdj = { label: '', amount: 0, day: 30 }; K.render(); };

  /* ═══════════════════════ INVESTMENTS ═══════════════════════ */
  K.reg({
    id: 'investments', title: 'Investments', icon: '∿',
    render() {
      const S = K.S;
      const total = K.positionsValue();
      const pos = [...S.positions].sort((a, b) => b.qty * b.price - a.qty * a.price);
      const options = S.positions.flatMap(p => (p.options || []).map(o => ({ p, o })));
      const alerts = [];
      options.forEach(({ p, o }) => {
        const dte = K.daysUntil(o.expiry);
        if (o.type === 'cc' && p.price >= o.strike) alerts.push(`${p.ticker} ${o.strike}C is ITM — assignment likely at expiry (${dte}d)`);
        else if (o.type === 'cc' && p.price >= o.strike * 0.95) alerts.push(`${p.ticker} within 5% of ${o.strike}C strike, ${dte}d to expiry`);
        if (o.type === 'csp' && p.price <= o.strike * 1.05) alerts.push(`${p.ticker} ${o.strike}P near the money — assignment would deploy ${money(o.strike * 100 * o.contracts, { short: true }).replace(/<[^>]+>/g, '')}`);
        if (dte <= 5) alerts.push(`${p.ticker} ${o.type === 'cc' ? o.strike + 'C' : o.strike + 'P'} expires ${K.fmtDay(o.expiry)}`);
      });
      // single-name concentration excludes broad index funds — they aren't idiosyncratic risk
      const singles = pos.filter(p => !p.broad && p.qty);
      const maxP = singles[0] || null;
      const maxW = maxP ? (maxP.qty * maxP.price) / total : 0;
      if (maxW > S.investMeta.targetMaxSinglePos) alerts.push(`${maxP.ticker} is ${K.pct(maxW)} of portfolio — above your ${K.pct(S.investMeta.targetMaxSinglePos)} single-name limit`);
      return `
      <div class="grid cols-4">
        <div class="card metric"><div class="k">Positions value</div><div class="v">${money(total, { short: true })}</div><div class="sub">prices as of ${K.fmtDay(S.investMeta.pricesAsOf)} · <a onclick="KOVA.V.refreshPrices()" style="cursor:pointer">update</a></div></div>
        <div class="card metric"><div class="k">Option premium YTD</div><div class="v">${money(S.investMeta.premiumYtd, { short: true })}</div><div class="sub">covered calls + CSPs</div></div>
        <div class="card metric"><div class="k">Open option obligations</div><div class="v">${options.length}</div><div class="sub">${options.filter(({ o }) => K.daysUntil(o.expiry) <= 7).length} expiring ≤7d</div></div>
        <div class="card metric"><div class="k">Largest single name</div><div class="v">${K.pct(maxW)}</div><div class="sub">${maxP ? maxP.ticker : '—'} · limit ${K.pct(S.investMeta.targetMaxSinglePos)} (indexes excluded)</div></div>
      </div>
      ${alerts.length ? `<div class="callout warn section-gap"><b>Alerts:</b> ${[...new Set(alerts)].map(esc).join(' · ')}</div>` : ''}
      <div class="two-col section-gap">
        <div class="card pad-0"><div style="padding:14px 16px 4px" class="card-head"><h3>Positions</h3></div>
          <div class="tablewrap" style="margin:0;padding:0 16px 10px"><table>
            <thead><tr><th>Asset</th><th class="num">Qty</th><th class="num">Price</th><th class="num">Value</th><th class="num">P/L</th><th class="num">Weight</th></tr></thead>
            <tbody>${pos.map(p => {
              const val = p.qty * p.price, pl = p.basis ? (p.price - p.basis) / p.basis : 0;
              return `<tr class="clickable" onclick="KOVA.V.posDetail('${p.id}')">
                <td><b>${esc(p.ticker)}</b><div class="small muted">${esc(p.name)}</div></td>
                <td class="num">${p.qty || '—'}</td><td class="num">${money(p.price, { cents: p.price < 10 })}</td>
                <td class="num">${money(Math.round(val), { short: true })}</td>
                <td class="num" style="color:${pl >= 0 ? 'var(--good)' : 'var(--serious)'}">${p.basis ? (pl >= 0 ? '+' : '') + K.pct(pl) : '—'}</td>
                <td class="num">${val ? K.pct(val / total) : '—'}</td></tr>`;
            }).join('')}</tbody></table></div></div>
        <div>
          <div class="card"><div class="card-head"><h3>Option overlays</h3></div>
            <div class="rows">${options.map(({ p, o }) => {
              const dte = K.daysUntil(o.expiry);
              const near = o.type === 'cc' ? p.price >= o.strike * 0.95 : p.price <= o.strike * 1.05;
              return `<div class="row"><div class="grow">
                <div class="title"><b>${esc(p.ticker)}</b> ${o.contracts}× ${o.strike}${o.type === 'cc' ? 'C (covered call)' : 'P (cash-secured put)'}</div>
                <div class="meta"><span>expires ${K.fmtDay(o.expiry)} (${dte}d)</span><span>premium ${money(o.premium)}</span><span>spot ${money(p.price)}</span></div></div>
                <span class="badge ${near ? 'amber' : 'green'}">${near ? 'near strike' : 'OTM'}</span></div>`;
            }).join('') || '<div class="empty">No open option positions.</div>'}</div>
            <div class="small muted" style="margin-top:8px">Analysis and reminders only — no trades execute from HQ (§13.4).</div></div>
          <div class="card section-gap"><div class="card-head"><h3>Concentration</h3></div>
            ${K.barsH(pos.filter(p => p.qty).map(p => ({ k: p.ticker, v: Math.round(p.qty * p.price / 1000) })), { fmt: (v) => '$' + v + 'k' })}</div>
        </div>
      </div>`;
    },
  });
  V.posDetail = (id) => {
    const p = K.S.positions.find(x => x.id === id); if (!p) return;
    K.modal(`<h2>${esc(p.ticker)} — ${esc(p.name)}</h2>
      <div class="sub">${p.qty ? p.qty + ' @ basis ' + (p.basis || '—') + ' · now ' + p.price : 'No shares — option strategy only'} · account: ${esc(p.account)}</div>
      <label>Thesis</label><div style="font-size:13px;background:var(--raised);border-radius:8px;padding:10px">${esc(p.thesis)}</div>
      <label>Invalidation criteria</label><div style="font-size:13px;background:var(--raised);border-radius:8px;padding:10px">${esc(p.invalidation)}</div>
      <label>Update price (manual refresh)</label><input type="number" step="any" id="pos-price" value="${p.price}">
      <div class="small muted" style="margin-top:6px">Next review: ${K.fmtDate(p.review)} · linked to decision journal (§13.3)</div>
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Close</button>
      <button class="btn primary" onclick="KOVA.V.posSave('${p.id}')">Save</button></div>`, { noFocus: true });
  };
  V.posSave = (id) => {
    const p = K.S.positions.find(x => x.id === id);
    p.price = +K.$('#pos-price').value || p.price;
    K.S.investMeta.pricesAsOf = new Date().toISOString();
    K.closeModal(); K.refresh(); K.toast('Position updated');
  };
  V.refreshPrices = () => K.toast('Manual for now — edit any position. Read-only brokerage sync is on the roadmap.');

  /* ═══════════════════════ FAMILY & HEALTH ═══════════════════════ */
  K.reg({
    id: 'family', title: 'Family & Health', icon: '⌂',
    render() {
      const S = K.S;
      const famEvents = S.events.filter(e => ['family', 'school', 'sport'].includes(e.kind) && K.daysUntil(e.start) >= 0 && K.daysUntil(e.start) <= 7).sort((a, b) => a.start < b.start ? -1 : 1);
      const log = S.health.log;
      const last = log[log.length - 1] || {};
      const wk = log.slice(-7);
      const trainedWk = wk.filter(x => x.trained).length;
      const sleepAvg = (wk.reduce((s, x) => s + x.sleepHrs, 0) / (wk.length || 1)).toFixed(1);
      const kylen = S.family.members[0];
      return `
      <div class="two-col">
        <div>
          <div class="card"><div class="card-head"><h3>Family week ahead</h3></div>
            <div class="rows">${famEvents.map(e => `
              <div class="row"><span class="wsdot" style="background:${K.wsColor(e.ws)}"></span>
              <div class="grow"><div class="title">${esc(e.title)}</div>
              <div class="meta"><span>${K.fmtDay(e.start)} ${K.fmtTime(e.start)}</span>${e.location ? `<span>${esc(e.location)}</span>` : ''}</div></div>
              <span class="badge gray">${e.kind}</span></div>`).join('') || '<div class="empty">Clear family calendar this week.</div>'}</div></div>

          <div class="card section-gap"><div class="card-head"><h3>Household operations</h3></div>
            <div class="rows">${S.family.household.filter(h => h.status === 'open').map(h => `
              <div class="row"><button class="check" onclick="KOVA.V.hhDone('${h.id}')">✓</button>
              <div class="grow"><div class="title">${esc(h.title)}</div><div class="meta">${h.vendor ? esc(h.vendor) : 'DIY'}</div></div>${K.dueBadge(h.due)}</div>`).join('') || '<div class="empty">Household board clear.</div>'}</div></div>

          <div class="card section-gap">
            <div class="card-head"><h3>${esc(kylen.name)} — development</h3></div>
            <div style="font-size:13.5px"><b>${esc(kylen.profile.activity)}</b></div>
            <div class="small" style="color:var(--ink-2);margin-top:4px">${esc(kylen.profile.goals)}</div>
            <div class="callout" style="margin-top:10px">Decision open: MLS Next vs ECNL — tryouts in progress, family decision target ${K.fmtDate(K.proj('p_kylen').target)}. <a href="#/projects/p_kylen">Open project →</a></div>
          </div>

          <div class="card section-gap"><div class="card-head"><h3>Traditions & wish list</h3></div>
            <div class="chiprow">${S.family.traditions.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
            <div class="chiprow">${S.family.wishlist.map(t => `<span class="chip" style="border-style:dashed">☆ ${esc(t)}</span>`).join('')}</div></div>
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>Health & performance</h3></div>
            <div style="display:flex;gap:16px;align-items:center;margin-bottom:10px">
              ${K.ring(last.readiness || 0)}
              <div><div style="font-weight:650">Readiness ${last.readiness}</div>
              <div class="small muted">sleep avg ${sleepAvg}h · ${trainedWk}/7 sessions this week</div></div></div>
            <div class="small muted">Sleep — 28 days</div>
            ${K.spark(log.map(x => x.sleepHrs), { w: 320, h: 44, color: 'var(--s6)', fill: true, min: 5, max: 9 })}
            <div class="small muted" style="margin-top:8px">Weight — 28 days (${last.weight} lb)</div>
            ${K.spark(log.map(x => x.weight), { w: 320, h: 44, color: 'var(--s4)', fill: true })}
          </div>
          <div class="card section-gap"><div class="card-head"><h3>Training week</h3></div>
            <div class="rows">${S.health.plan.map(p => {
              const today = new Date().toLocaleDateString('en-US', { weekday: 'short' }) === p.day;
              return `<div class="row" style="${today ? 'background:var(--accent-soft);border-radius:8px;margin:0 -8px;padding:9px 8px' : ''}">
                <span class="small muted" style="width:34px">${p.day}</span>
                <div class="grow"><div class="title" style="font-size:13px">${esc(p.session)}</div></div>
                ${today ? '<span class="badge blue">today</span>' : ''}</div>`;
            }).join('')}</div></div>
          <div class="card section-gap"><div class="card-head"><h3>Appointments</h3></div>
            <div class="rows">${S.health.appointments.map(a => `
              <div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(a.what)}</div></div>
              ${a.when ? K.dueBadge(a.when) : '<span class="badge amber">to book</span>'}</div>`).join('')}</div>
            <div class="small muted" style="margin-top:6px">Organization and trends only — not medical advice (§16).</div></div>
          <div class="card section-gap"><div class="card-head"><h3>Travel pipeline</h3></div>
            <div class="rows">${S.trips.map(t => `
              <div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(t.name)}</div>
              <div class="meta"><span>${esc(t.dates || '')}</span><span>budget ${money(t.budget, { short: true })}</span></div></div>
              <span class="badge ${t.stage === 'booked' ? 'green' : t.stage === 'planning' ? 'blue' : 'gray'}">${t.stage}</span></div>`).join('')}</div></div>
        </div>
      </div>`;
    },
  });
  V.hhDone = (id) => { const h = K.S.family.household.find(x => x.id === id); if (h) h.status = 'done'; K.refresh(); K.toast('Done'); };

  /* ═══════════════════════ DOCUMENTS & KNOWLEDGE ═══════════════════════ */
  let docQ = '';
  K.reg({
    id: 'docs', title: 'Documents', icon: '▤',
    render() {
      const S = K.S;
      const expiring = S.documents.filter(dd => dd.expires && K.daysUntil(dd.expires) <= 45 && K.daysUntil(dd.expires) >= 0).sort((a, b) => a.expires < b.expires ? -1 : 1);
      let docs = [...S.documents].sort((a, b) => (a.effective < b.effective ? 1 : -1));
      if (docQ) docs = docs.filter(dd => (dd.title + ' ' + dd.type).toLowerCase().includes(docQ.toLowerCase()));
      return `
      ${expiring.length ? `<div class="callout warn"><b>Expiring soon:</b> ${expiring.map(dd => esc(dd.title) + ' (' + K.fmtDay(dd.expires) + ')').join(' · ')}</div>` : ''}
      <div class="two-col section-gap">
        <div class="card pad-0">
          <div style="padding:14px 16px 8px"><input placeholder="Search documents…" value="${esc(docQ)}" oninput="KOVA.V.docSearch(this.value)"></div>
          <div class="rows" style="padding:0 16px 8px">${docs.map(dd => `
            <div class="row"><span class="ico" style="opacity:.7">${dd.source === 'drive' ? '△' : '✉'}</span>
            <div class="grow"><div class="title" style="font-size:13px">${esc(dd.title)} ${dd.confidential ? '<span class="badge gray">🔒</span>' : ''}</div>
            <div class="meta"><span>${esc(dd.type)}</span><span>${K.wsChip(dd.ws)}</span><span>filed ${K.fmtDate(dd.effective)}</span></div></div>
            ${dd.expires ? K.dueBadge(dd.expires) : ''}</div>`).join('') || '<div class="empty">No matches.</div>'}</div>
        </div>
        <div>
          <div class="card"><div class="card-head"><h3>Knowledge base</h3></div>
            <div class="rows">${S.knowledge.map(k2 => `
              <div class="row clickable" onclick="KOVA.V.kbOpen('${k2.id}')">
              <span class="ico" style="opacity:.7">${k2.kind === 'sop' ? '≡' : k2.kind === 'research' ? '◎' : '✎'}</span>
              <div class="grow"><div class="title" style="font-size:13px">${esc(k2.title)}</div>
              <div class="meta"><span>${k2.kind.toUpperCase()}</span><span>updated ${K.fmtDate(k2.updated)}</span></div></div></div>`).join('')}</div></div>
          <div class="card section-gap"><div class="card-head"><h3>Filing model</h3></div>
            <div class="small" style="color:var(--ink-2)">Documents are organized by relationships — workspace, entity, project, property, expiration — not folders (§18.2). Drive indexing arrives with the n8n bridge; for now records link out to source systems.</div></div>
        </div>
      </div>`;
    },
  });
  V.docSearch = (q) => { docQ = q; K.render(); const el = K.$('#screen input'); if (el) { el.focus(); el.setSelectionRange(q.length, q.length); } };
  V.kbOpen = (id) => {
    const k2 = K.S.knowledge.find(x => x.id === id); if (!k2) return;
    K.modal(`<h2 style="font-size:15px">${esc(k2.title)}</h2><div class="sub">${k2.kind.toUpperCase()} · ${K.wsName(k2.ws)} · updated ${K.fmtDate(k2.updated)}</div>
      <div style="font-size:13.5px;line-height:1.65;white-space:pre-wrap;background:var(--raised);border-radius:8px;padding:12px">${esc(k2.body)}</div>
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  };

  /* ═══════════════════════ GOALS & REVIEWS ═══════════════════════ */
  K.reg({
    id: 'goals', title: 'Goals & Reviews', icon: '◎',
    render(param) {
      if (param === 'review') K.after(() => { V.weeklyReviewFlow(); history.replaceState(null, '', '#/goals'); });
      if (param === 'decision') K.after(() => { V.decisionModal(); history.replaceState(null, '', '#/goals'); });
      const S = K.S;
      const areas = {};
      S.goals.forEach(g => (areas[g.area] = areas[g.area] || []).push(g));
      const decDue = S.decisions.filter(dd => !dd.actual && K.daysUntil(dd.reviewDate) <= 0);
      return `
      <div class="btnrow">
        <button class="btn primary" onclick="KOVA.V.weeklyReviewFlow()">▶ Run weekly review</button>
        <button class="btn" onclick="KOVA.V.decisionModal()">⚖ Record decision</button>
        <span class="spacer"></span>
        <span class="small muted">${S.reviews.filter(r => r.kind === 'weekly').length} weekly reviews on record</span>
      </div>
      ${decDue.length ? `<div class="callout section-gap"><b>Decision reviews due:</b> ${decDue.map(dd => esc(dd.q)).join(' · ')} — score expected vs actual below.</div>` : ''}
      <div class="two-col section-gap">
        <div>${Object.entries(areas).map(([area, gs]) => `
          <div class="card" style="margin-bottom:12px"><div class="card-head"><h3>${esc(area)}</h3></div>
            <div class="rows">${gs.map(g => {
              const p = S.projects.find(pp => pp.goal === g.id && pp.status === 'active');
              const prog = g.target > 1 ? Math.min(1, (g.current - g.baseline) / (g.target - g.baseline || 1)) : g.current >= g.target ? 1 : 0;
              return `<div class="row" style="align-items:flex-start">
                <div class="grow"><div class="title">${esc(g.title)}</div>
                  <div class="meta"><span>${esc(g.metric)}: ${g.current.toLocaleString()} / ${g.target.toLocaleString()}</span><span>by ${esc(String(g.horizon))}</span>
                  ${!p ? '<span style="color:var(--warn)">⚠ no active project</span>' : `<span>→ ${esc(p.title.slice(0, 34))}</span>`}</div>
                  <div class="bar" style="margin-top:6px"><i style="width:${Math.round(prog * 100)}%;background:${K.wsColor(g.ws)}"></i></div></div>
                <span class="badge ${g.status === 'on_track' ? 'green' : g.status === 'at_risk' ? 'amber' : g.status === 'needs_decision' ? 'serious' : 'gray'}">${g.status.replace('_', ' ')}</span>
              </div>`;
            }).join('')}</div></div>`).join('')}
        </div>
        <div>
          <div class="card"><div class="card-head"><h3>Decision journal</h3></div>
            <div class="rows">${S.decisions.map(dd => `
              <div class="row clickable" onclick="KOVA.V.decisionOpen('${dd.id}')" style="align-items:flex-start">
                <div class="grow"><div class="title" style="font-size:13px">${esc(dd.q)}</div>
                <div class="meta"><span>${esc(dd.decision.slice(0, 44))}</span><span>conf ${Math.round(dd.confidence * 100)}%</span></div></div>
                ${dd.actual ? '<span class="badge green">reviewed</span>' : K.daysUntil(dd.reviewDate) <= 0 ? '<span class="badge amber">review due</span>' : K.dueBadge(dd.reviewDate)}</div>`).join('')}</div></div>
          <div class="card section-gap"><div class="card-head"><h3>Review history</h3></div>
            <div class="rows">${S.reviews.slice(0, 8).map(r => `
              <div class="row clickable" onclick="KOVA.V.reviewOpen('${r.id}')">
                <span class="ico">${r.kind === 'weekly' ? '◎' : '☾'}</span>
                <div class="grow"><div class="title" style="font-size:13px">${r.kind === 'weekly' ? 'Weekly review' : 'Daily shutdown'} — ${K.fmtDate(r.date)}</div>
                <div class="meta"><span>${esc((r.wins || '').slice(0, 60))}</span></div></div></div>`).join('') || '<div class="empty">No reviews yet.</div>'}</div></div>
        </div>
      </div>`;
    },
  });
  V.weeklyReviewFlow = () => {
    const S = K.S;
    const doneWk = S.tasks.filter(t => t.status === 'done' && t.completedAt && K.daysUntil(t.completedAt) > -7).length;
    const overdue = K.openTasks().filter(t => t.due && K.daysUntil(t.due) < 0);
    const blocked = S.projects.filter(p => p.health === 'amber' || p.health === 'red');
    K.modal(`<h2>Weekly review</h2><div class="sub">Guided operating session (§2.3). The system pre-fills what it knows; you add judgement.</div>
      <div class="callout" style="margin-bottom:8px">
        This week: <b>${doneWk}</b> tasks completed · <b>${overdue.length}</b> overdue · <b>${blocked.length}</b> projects need attention
        (${blocked.map(p => esc(p.title.split('(')[0].trim())).join(', ') || 'none'}) ·
        <b>${K.pendingApprovals().length}</b> approvals waiting · agents ran <b>${S.agentRuns.length}</b> times.
      </div>
      <label>1 · Wins & completed outcomes</label><textarea id="wr-wins" rows="2" placeholder="What moved?"></textarea>
      <label>2 · Missed commitments — and the root cause</label><textarea id="wr-missed" rows="2" placeholder="Not just what slipped — why."></textarea>
      <label>3 · Decisions made or needed</label><textarea id="wr-dec" rows="2"></textarea>
      <label>4 · Next week's top five outcomes</label><textarea id="wr-next" rows="3" placeholder="One per line — these seed next week's focus"></textarea>
      <label>5 · Notes (calendar, family, health, agents)</label><textarea id="wr-notes" rows="2"></textarea>
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Cancel</button>
      <button class="btn primary" onclick="KOVA.V.weeklyReviewSave()">Complete review</button></div>`);
  };
  V.weeklyReviewSave = () => {
    const g = (s) => K.$(s).value.trim();
    K.S.reviews.unshift({ id: K.uid(), kind: 'weekly', date: K.todayISO(), wins: g('#wr-wins'), missed: g('#wr-missed'), decisions: g('#wr-dec'), outcomes: g('#wr-next'), notes: g('#wr-notes') });
    K.logActivity('review', 'Weekly review completed');
    K.closeModal(); K.refresh(); K.toast('Weekly review saved ✓');
  };
  V.reviewOpen = (id) => {
    const r = K.S.reviews.find(x => x.id === id); if (!r) return;
    const row = (k, v) => v ? `<label>${k}</label><div style="font-size:13px;background:var(--raised);border-radius:8px;padding:9px;white-space:pre-wrap">${esc(v)}</div>` : '';
    K.modal(`<h2>${r.kind === 'weekly' ? 'Weekly review' : 'Daily shutdown'} — ${K.fmtDate(r.date)}</h2>
      ${row('Wins', r.wins)}${row('Missed / root cause', r.missed)}${row('Decisions', r.decisions)}${row('Next outcomes', r.outcomes)}${row('Notes', r.notes)}
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  };
  V.decisionModal = () => {
    K.modal(`<h2>Record a decision</h2><div class="sub">Capture assumptions before the outcome is known (§19.4).</div>
      <label>The question</label><input id="dc-q" placeholder="e.g. Take the Mesa 8-plex at revised terms?">
      <label>Decision & rationale</label><textarea id="dc-d" rows="2"></textarea>
      <label>Expected outcome</label><textarea id="dc-e" rows="2" placeholder="What do you expect to be true, by when?"></textarea>
      <div class="grid cols-2">
        <div><label>Confidence</label><select id="dc-c">${[90, 80, 70, 60, 50].map(c => `<option value="${c / 100}" ${c === 70 ? 'selected' : ''}>${c}%</option>`).join('')}</select></div>
        <div><label>Review date</label><input id="dc-r" type="date" value="${new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10)}"></div>
      </div>
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Cancel</button>
      <button class="btn primary" onclick="KOVA.V.decisionSave()">Record</button></div>`);
  };
  V.decisionSave = () => {
    const g = (s) => K.$(s).value;
    if (!g('#dc-q').trim()) { K.toast('Give the decision a question'); return; }
    K.S.decisions.unshift({ id: K.uid(), q: g('#dc-q').trim(), context: '', options: '', decision: g('#dc-d').trim(), date: K.todayISO(), confidence: +g('#dc-c'), expected: g('#dc-e').trim(), reviewDate: g('#dc-r'), actual: null, ws: 'ws_personal' });
    K.closeModal(); K.refresh(); K.toast('Decision recorded');
  };
  V.decisionOpen = (id) => {
    const dd = K.S.decisions.find(x => x.id === id); if (!dd) return;
    K.modal(`<h2 style="font-size:15px">${esc(dd.q)}</h2>
      <div class="sub">decided ${K.fmtDate(dd.date)} · confidence ${Math.round(dd.confidence * 100)}% · review ${K.fmtDate(dd.reviewDate)}</div>
      <label>Decision</label><div style="font-size:13px;background:var(--raised);border-radius:8px;padding:9px">${esc(dd.decision)}</div>
      <label>Expected</label><div style="font-size:13px;background:var(--raised);border-radius:8px;padding:9px">${esc(dd.expected)}</div>
      <label>Actual result (fill at review)</label><textarea id="dc-actual" rows="2">${esc(dd.actual || '')}</textarea>
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Close</button>
      <button class="btn primary" onclick="KOVA.V.decisionResult('${dd.id}')">Save result</button></div>`, { noFocus: true });
  };
  V.decisionResult = (id) => {
    const dd = K.S.decisions.find(x => x.id === id);
    dd.actual = K.$('#dc-actual').value.trim() || null;
    K.closeModal(); K.refresh(); K.toast(dd.actual ? 'Outcome recorded — compare with what you expected' : 'Saved');
  };

  /* ═══════════════════════ SETTINGS & INTEGRATIONS ═══════════════════════ */
  K.reg({
    id: 'settings', title: 'Settings', icon: '⚙',
    render() {
      const S = K.S; const ai = S.settings.ai; const n8n = S.settings.n8n;
      return `
      <div class="two-col">
        <div>
          <div class="card"><div class="card-head"><h3>AI gateway — local model</h3>
            <span class="ai-dot ${ai.connected ? 'on' : ''}" style="margin-left:4px"></span></div>
            <div class="small" style="color:var(--ink-2);margin-bottom:8px">
              HQ agents and the Copilot run against <b>your own model on your own hardware</b>. Anything OpenAI-compatible works: Ollama, LM Studio, llama.cpp, vLLM. Nothing is sent to a cloud provider unless you point the URL at one.</div>
            <div class="grid cols-2">
              <div><label>Provider preset</label>
                <select id="ai-provider" onchange="KOVA.V.aiPreset(this.value)">
                  <option value="none" ${ai.provider === 'none' ? 'selected' : ''}>Not configured</option>
                  <option value="ollama" ${ai.provider === 'ollama' ? 'selected' : ''}>Ollama (default port 11434)</option>
                  <option value="lmstudio" ${ai.provider === 'lmstudio' ? 'selected' : ''}>LM Studio (port 1234)</option>
                  <option value="openai" ${ai.provider === 'openai' ? 'selected' : ''}>Custom OpenAI-compatible</option>
                </select></div>
              <div><label>Base URL</label><input id="ai-url" value="${esc(ai.baseUrl)}" placeholder="http://localhost:11434"></div>
              <div><label>Model</label><input id="ai-model" value="${esc(ai.model)}" placeholder="llama3.1:8b" list="ai-models">
                <datalist id="ai-models">${(ai.models || []).map(m => `<option value="${esc(m)}">`).join('')}</datalist></div>
              <div><label>API key (only if your endpoint needs one)</label><input id="ai-key" type="password" value="${esc(ai.apiKey)}"></div>
            </div>
            <div class="btnrow" style="margin-top:10px">
              <button class="btn primary" onclick="KOVA.Agents.testConnection()">Test & save connection</button>
              ${ai.connected ? `<span class="badge green">connected · ${esc(ai.model || 'model?')} · ${ai.latency || '?'}ms</span>` : '<span class="badge gray">offline</span>'}
            </div>
            <hr class="divider">
            <details><summary class="small" style="cursor:pointer;color:var(--ink-2)">Setup notes (CORS) — read once when connecting</summary>
              <div class="small" style="color:var(--ink-2);margin-top:8px">
              Browsers require your model server to allow requests from this app's origin.<br><br>
              <b>Ollama:</b> start with <code>OLLAMA_ORIGINS="*"</code> (or this site's exact origin):<pre class="code">OLLAMA_ORIGINS="*" ollama serve</pre>
              <b>LM Studio:</b> Server tab → enable CORS.<br>
              <b>Remote/HTTPS note:</b> when using HQ from its https:// URL, browsers only allow plain-http calls to <code>localhost</code> — so run HQ on the same machine as the model, or serve the model behind https on your LAN.</div></details>
          </div>

          <div class="card section-gap"><div class="card-head"><h3>n8n bridge — communications & sync</h3></div>
            <div class="small" style="color:var(--ink-2);margin-bottom:8px">n8n is the integration spine (§25): Gmail, Google Calendar, Shopify and Apple Health flow through n8n workflows into HQ's inbox endpoint. Runs on your own hardware next to the model.</div>
            <div class="grid cols-2">
              <div><label>n8n base URL</label><input id="n8n-url" value="${esc(n8n.baseUrl)}" placeholder="http://localhost:5678"></div>
              <div><label>Inbox webhook path</label><input id="n8n-path" value="${esc(n8n.inboxPath)}"></div>
            </div>
            <div class="btnrow" style="margin-top:10px">
              <button class="btn" onclick="KOVA.V.n8nSave()">${n8n.enabled ? 'Update' : 'Enable'} bridge</button>
              ${n8n.enabled ? '<span class="badge green">enabled</span><button class="btn sm ghost" onclick="KOVA.V.n8nOff()">disable</button>' : '<span class="badge gray">off</span>'}
            </div>
            <details style="margin-top:8px"><summary class="small" style="cursor:pointer;color:var(--ink-2)">Expected payload for the inbox webhook</summary>
            <pre class="code">GET {base}${esc(n8n.inboxPath)} → [
  { "source": "gmail", "from": "…", "subject": "…",
    "preview": "…", "received": "ISO date", "importance": 1 }
]</pre></details>
          </div>

          <div class="card section-gap"><div class="card-head"><h3>Connectors roadmap</h3></div>
            <div class="rows">${S.settings.connectors.map(c => `
              <div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(c.name)}</div>
              <div class="meta">${esc(c.note)}</div></div><span class="badge gray">${c.status}</span></div>`).join('')}</div></div>
        </div>

        <div>
          <div class="card"><div class="card-head"><h3>Profile & preferences</h3></div>
            <label>Your name</label><input id="set-name" value="${esc(S.settings.name)}" onchange="KOVA.S.settings.name=this.value;KOVA.save()">
            <label>Privacy mode</label>
            <div class="btnrow"><button class="btn" onclick="KOVA.togglePrivacy()">${S.settings.privacy ? 'Disable' : 'Enable'} privacy mode</button>
            <span class="small muted">blurs all money values for over-the-shoulder safety</span></div></div>

          ${K.Sync && K.Sync.settingsCard ? K.Sync.settingsCard() : ''}

          <div class="card section-gap"><div class="card-head"><h3>Data — yours, locally</h3></div>
            <div class="small" style="color:var(--ink-2);margin-bottom:10px">Everything lives in this browser's local storage — plus, if enabled above, an end-to-end encrypted cloud copy that only your passphrase can open. Export a JSON backup any time.</div>
            <div class="btnrow">
              <button class="btn" onclick="KOVA.exportJSON()">⇩ Export backup</button>
              <label class="btn" style="margin:0">⇪ Import backup<input type="file" accept=".json" style="display:none" onchange="KOVA.importJSON(this.files[0])"></label>
              <button class="btn danger" onclick="KOVA.resetDemo()">Reset to demo data</button>
            </div></div>

          <div class="card section-gap"><div class="card-head"><h3>Workspaces</h3></div>
            <div class="rows">${S.workspaces.map(w => `
              <div class="row"><span class="wsdot" style="background:var(--s${w.color})"></span>
              <div class="grow"><div class="title" style="font-size:13px">${esc(w.name)}</div></div></div>`).join('')}</div>
            <div class="small muted" style="margin-top:6px">Personal and business context coexist — one attention budget across all of it (§1.3).</div></div>

          <div class="card section-gap"><div class="card-head"><h3>About & help</h3></div>
            <div class="small" style="color:var(--ink-2);line-height:1.7">
              <b>HQ</b> — your personal command center, built from the Product Framework.<br>
              Architecture: static app · local-first data · supervised agents · your model, your hardware.<br>
              Keyboard: <kbd>⌘K</kbd> command palette · <kbd>c</kbd> quick capture · <kbd>esc</kbd> close.
            </div>
            <div class="btnrow" style="margin-top:10px"><a class="btn" href="kova-guide.html" target="_blank" rel="noopener">📖 Open the Field Guide</a>
            <span class="small muted">setup · tour · security reference</span></div></div>
        </div>
      </div>`;
    },
  });
  V.aiPreset = (p) => {
    const urls = { ollama: 'http://localhost:11434', lmstudio: 'http://localhost:1234', openai: '', none: '' };
    if (urls[p] !== undefined && p !== 'openai') K.$('#ai-url').value = urls[p];
    K.S.settings.ai.provider = p; K.save();
  };
  V.n8nSave = () => {
    const n8n = K.S.settings.n8n;
    n8n.baseUrl = K.$('#n8n-url').value.trim().replace(/\/$/, '');
    n8n.inboxPath = K.$('#n8n-path').value.trim() || '/webhook/kova-inbox';
    n8n.enabled = !!n8n.baseUrl;
    K.refresh(); K.toast(n8n.enabled ? 'n8n bridge enabled' : 'Enter the n8n base URL');
  };
  V.n8nOff = () => { K.S.settings.n8n.enabled = false; K.refresh(); };
})();
