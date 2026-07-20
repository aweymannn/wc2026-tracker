/* ============================================================================
   HQ — AI Agent Control Center (§14) + local-model gateway + Copilot (§26)
   ----------------------------------------------------------------------------
   The gateway speaks the OpenAI-compatible chat API, which covers Ollama,
   LM Studio, llama.cpp server, vLLM and most local stacks. Agents assemble a
   compact context pack from LIVE app data, run against your model, and file
   results into the run log; anything action-shaped lands in the approval
   queue — agents propose, you approve (§14.3). With no model connected, runs
   are clearly labeled "simulated" and produced from the same live data.
   ========================================================================== */
'use strict';

(() => {
  const K = KOVA;
  const esc = K.esc;
  const A = (K.Agents = {});

  const LEVELS = ['L0 · Observe', 'L1 · Propose', 'L2 · Limited execute', 'L3 · Managed autonomy', 'L4 · Restricted'];

  /* ═══════════════ gateway: OpenAI-compatible client ═══════════════ */
  function aiCfg() { return K.S.settings.ai; }
  function headers() {
    const h = { 'Content-Type': 'application/json' };
    if (aiCfg().apiKey) h.Authorization = 'Bearer ' + aiCfg().apiKey;
    return h;
  }
  A.chat = async (messages, opts) => {
    const cfg = aiCfg();
    if (!cfg.connected) throw new Error('no model connected');
    const res = await fetch(cfg.baseUrl.replace(/\/$/, '') + '/v1/chat/completions', {
      method: 'POST', headers: headers(),
      body: JSON.stringify({ model: cfg.model, messages, temperature: (opts && opts.temperature) || 0.4, max_tokens: (opts && opts.maxTokens) || 700, stream: false }),
    });
    if (!res.ok) throw new Error('model server ' + res.status);
    const data = await res.json();
    return ((data.choices && data.choices[0] && data.choices[0].message) || {}).content || '(empty response)';
  };
  A.testConnection = async () => {
    const cfg = aiCfg();
    // pull values from the settings form when it's on screen
    const g = (id) => { const el = document.getElementById(id); return el ? el.value.trim() : null; };
    if (g('ai-url') !== null) {
      cfg.baseUrl = g('ai-url') || cfg.baseUrl; cfg.model = g('ai-model') || cfg.model;
      cfg.apiKey = g('ai-key') || ''; cfg.provider = g('ai-provider') || cfg.provider;
    }
    if (!cfg.baseUrl) { K.toast('Enter the base URL first'); return; }
    K.toast('Testing ' + cfg.baseUrl + '…');
    const t0 = performance.now();
    try {
      const res = await fetch(cfg.baseUrl.replace(/\/$/, '') + '/v1/models', { headers: headers() });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const data = await res.json();
      cfg.models = ((data && data.data) || []).map(m => m.id).slice(0, 30);
      cfg.latency = Math.round(performance.now() - t0);
      if (!cfg.model && cfg.models.length) cfg.model = cfg.models[0];
      cfg.connected = true; cfg.lastCheck = new Date().toISOString();
      if (cfg.provider === 'none') cfg.provider = 'openai';
      K.refresh();
      K.toast(`✓ Connected — ${cfg.models.length} models, ${cfg.latency}ms`);
    } catch (e) {
      cfg.connected = false; K.refresh();
      K.toast('✗ Could not reach model server: ' + e.message + ' (check CORS — see setup notes)');
    }
  };

  /* ═══════════════ context packs — live data, token-frugal ═══════════════ */
  const strip = (html) => String(html).replace(/<[^>]+>/g, '');
  const mm = (n) => strip(K.money(n, { short: true }));
  const CTX = {
    brief() {
      const S = K.S;
      return {
        outcomes: (S.today.outcomes || []).map(o => o.title + (o.done ? ' [done]' : '')),
        events: K.eventsToday().map(e => K.fmtTime(e.start) + ' ' + e.title + (e.prep ? ' (prep: ' + e.prep + ')' : '')),
        tasksDue: K.tasksDueToday().map(t => t.title + (K.daysUntil(t.due) < 0 ? ' [OVERDUE]' : '')),
        attention: K.attention().slice(0, 6).map(a => a.what + ' — ' + a.why),
        approvalsWaiting: K.pendingApprovals().map(a => a.title),
        conflicts: K.conflictsOn(K.todayISO()).map(([a, b]) => a.title + ' overlaps ' + b.title),
        focusHoursLeft: K.focusHours(),
        health: S.health.log.slice(-1)[0],
      };
    },
    triage() {
      return { messages: K.inboxOpen().slice(0, 12).map(m => ({ from: m.from, subject: m.subject, preview: m.preview.slice(0, 140), source: m.source, currentTriage: m.triage })) };
    },
    calprep() {
      const S = K.S;
      const next = S.events.filter(e => K.daysUntil(e.start) >= 0).sort((a, b) => a.start < b.start ? -1 : 1).slice(0, 4);
      return { meetings: next.map(e => ({ title: e.title, when: K.fmtDay(e.start) + ' ' + K.fmtTime(e.start), prep: e.prep || null, contact: e.contact ? (S.contacts.find(c => c.id === e.contact) || {}).name : null })) };
    },
    sourcing() {
      const S = K.S;
      return { buyBox: (S.knowledge.find(k2 => k2.id === 'k3') || {}).body, pipeline: S.opportunities.map(o => ({ name: o.name, stage: o.stage, ask: mm(o.asking), score: K.V.buyboxTotal(o).toFixed(1) })) };
    },
    underwrite(param) {
      const o = K.S.opportunities.find(x => x.id === param) || K.S.opportunities[0];
      const c = K.V.uwCalc(o.uw);
      return { deal: o.name, stage: o.stage, assumptions: o.uw, computed: { dscr: +c.dscr.toFixed(2), cashOnCash: +(c.coc * 100).toFixed(1) + '%', capRate: +(c.cap * 100).toFixed(1) + '%', yieldOnCost: +(c.yoc * 100).toFixed(1) + '%', noiYr: Math.round(c.noi), cashRequired: Math.round(c.cashIn) }, floors: 'DSCR≥1.25, CoC≥6%, YoC≥6.5%', risks: o.risks };
    },
    market() {
      const S = K.S;
      return { positions: S.positions.map(p => ({ ticker: p.ticker, qty: p.qty, price: p.price, basis: p.basis, options: (p.options || []).map(o => o.contracts + 'x ' + o.strike + (o.type === 'cc' ? 'C' : 'P') + ' exp ' + K.fmtDate(o.expiry)) })), premiumYtd: S.investMeta.premiumYtd, concentrationLimit: S.investMeta.targetMaxSinglePos, rules: (S.knowledge.find(k2 => k2.id === 'k4') || {}).body };
    },
    tribe() {
      const S = K.S; const e = S.entities.find(x => x.id === 'ent_tribe'); const p = K.proj('p_tribe');
      return { company: { name: e.name, stage: e.stage, cash: mm(e.cash), metrics: e.metrics, priorities: e.priorities, risks: e.risks }, project: { milestones: p.milestones, nextAction: p.nextAction } };
    },
    docs() {
      return { expiring: K.S.documents.filter(d => d.expires && K.daysUntil(d.expires) <= 60).map(d => d.title + ' expires ' + K.fmtDate(d.expires)), recent: K.S.documents.slice(0, 6).map(d => d.title) };
    },
    bills() {
      return { obligations: K.S.obligations.filter(o => K.daysUntil(o.due) >= 0 && K.daysUntil(o.due) <= 45).map(o => ({ name: o.name, amount: o.amount, due: K.fmtDate(o.due), recur: o.recur, autopay: o.autopay })), liquid: mm(K.liquidCash()) };
    },
    travel() { return { trips: K.S.trips }; },
    health() {
      const log = K.S.health.log.slice(-14);
      return { last14: log.map(l => ({ d: l.date.slice(5), sleep: l.sleepHrs, readiness: l.readiness, trained: l.trained })), plan: K.S.health.plan };
    },
    review() {
      const S = K.S;
      return {
        completedThisWeek: S.tasks.filter(t => t.status === 'done' && t.completedAt && K.daysUntil(t.completedAt) > -7).map(t => t.title),
        overdue: K.openTasks().filter(t => t.due && K.daysUntil(t.due) < 0).map(t => t.title),
        projectsAtRisk: S.projects.filter(p => p.health !== 'green').map(p => p.title + ' (' + p.health + ')'),
        lastReview: S.reviews.find(r => r.kind === 'weekly'),
      };
    },
  };

  const AGENT_PROMPTS = {
    brief: 'Write the morning operating brief: 1) top three outcomes with the single next step each, 2) schedule notes incl. conflicts, 3) decisions waiting, 4) one risk to watch. Max 180 words, punchy, second person.',
    triage: 'Triage these inbox items. For each: category (reply/decision/task/waiting/read), one-line reason, and for the two most important draft a 2-sentence reply. End with "PROPOSAL: <task title>" lines for any commitments that should become tasks.',
    calprep: 'Prepare me for the next meetings: for each, what to review, what to ask, and the outcome that would make it a win. Terse bullets.',
    sourcing: 'Compare the pipeline against the buy-box. Which deals deserve the next hour of attention and why? Anything that should be declined? Max 150 words.',
    underwrite: 'Give a second opinion on this underwriting: stress the weakest assumption, state whether floors hold under a 10% rent haircut and +50bps rate, and end with ADVANCE / HOLD / DECLINE + one sentence.',
    market: 'Review positions and option overlays against my rules. Flag expirations, strike proximity, concentration breaches. Recommend roll/assign/hold per option position with one-line reasoning. No trade execution.',
    tribe: 'Act as brand ops: given company status and milestones, list the three highest-leverage moves this week and draft one content hook for launch buildup.',
    docs: 'Review document status: what expires soon and what filing action is needed. One line each.',
    bills: 'Review upcoming obligations vs liquid cash: flag anything unusual, any renewal worth re-quoting, and the largest cash events in the window.',
    travel: 'Advance the most promising trip: propose concrete next steps, timing and budget sanity check. Brief.',
    health: 'Summarize the last 14 days: sleep and training consistency, readiness trend, one adjustment for next week. Supportive, no medical claims.',
    review: 'Pre-fill my weekly review: wins, misses with likely root cause, and propose next week\'s five outcomes based on projects at risk. Use the exact section labels Wins / Misses / Root causes / Next five.',
  };

  /* fallback outputs when no model is connected — same live data, honest label */
  function simulate(builder, ctx) {
    switch (builder) {
      case 'brief': {
        const c = ctx;
        return `Top outcomes: ${c.outcomes.join(' · ') || 'none set'}.\nSchedule: ${c.events.length} events, ${c.focusHoursLeft}h focus left${c.conflicts.length ? '; CONFLICT — ' + c.conflicts[0] : ''}.\nDecisions waiting: ${c.approvalsWaiting.length ? c.approvalsWaiting.join('; ') : 'none'}.\nWatch: ${c.attention[0] || 'all quiet'}.`;
      }
      case 'triage': return ctx.messages.slice(0, 6).map(m => `${m.from} — “${m.subject}” → ${m.currentTriage || 'reply'}`).join('\n') + '\n(Connect your local model for drafted replies.)';
      case 'calprep': return ctx.meetings.map(m => `${m.when} · ${m.title}${m.prep ? ' — prep: ' + m.prep : ''}`).join('\n');
      case 'sourcing': return ctx.pipeline.map(p => `${p.name} [${p.stage}] score ${p.score}`).join('\n') + '\nHighest score first — verify against buy-box floors before advancing.';
      case 'underwrite': { const c = ctx.computed; return `${ctx.deal}: DSCR ${c.dscr}, CoC ${c.cashOnCash}, YoC ${c.yieldOnCost}, NOI $${c.noiYr.toLocaleString()}/yr, cash in $${c.cashRequired.toLocaleString()}.\nFloors: ${ctx.floors}.\nRisks: ${(ctx.risks || []).join('; ') || '—'}.`; }
      case 'market': return ctx.positions.filter(p => p.options.length).map(p => `${p.ticker} @ ${p.price}: ${p.options.join(', ')}`).join('\n') + '\nCheck strike proximity in the Investments screen.';
      case 'tribe': return 'Priorities: ' + ctx.company.priorities.join(' · ') + '\nRisks: ' + ctx.company.risks.join(' · ');
      case 'docs': return (ctx.expiring.join('\n') || 'Nothing expiring within 60 days.');
      case 'bills': return ctx.obligations.map(o => `${o.due} · ${o.name} — $${o.amount.toLocaleString()}${o.autopay ? ' (autopay)' : ''}`).join('\n');
      case 'travel': return ctx.trips.map(t => `${t.name} [${t.stage}] — ${(t.checklist.find(c => !c.done) || {}).item || 'no open steps'}`).join('\n');
      case 'health': { const l = ctx.last14; const tr = l.filter(x => x.trained).length; const sl = (l.reduce((s, x) => s + x.sleep, 0) / l.length).toFixed(1); return `Last 14 days: ${tr} sessions, sleep avg ${sl}h, readiness now ${l[l.length - 1].readiness}.`; }
      case 'review': return `Wins: ${ctx.completedThisWeek.slice(0, 5).join('; ') || '—'}\nMisses: ${ctx.overdue.slice(0, 5).join('; ') || '—'}\nAt risk: ${ctx.projectsAtRisk.join('; ') || '—'}`;
      default: return 'No output.';
    }
  }

  /* ═══════════════ run an agent ═══════════════ */
  A.runAgent = async (id, param) => {
    const S = K.S;
    const ag = S.agents.find(a => a.id === id); if (!ag) return;
    const cfg = aiCfg();
    const ctx = (CTX[ag.builder] || (() => ({})))(param);
    K.toast((cfg.connected ? '✦ ' : '') + ag.name + ' running…');
    const t0 = performance.now();
    let output, mode, status = 'ok';
    if (cfg.connected) {
      try {
        output = await A.chat([
          { role: 'system', content: `You are the "${ag.name}" agent inside HQ, ${S.settings.name}'s personal command center. Approval policy: ${LEVELS[ag.level]} — you PROPOSE, the user approves; never claim to have executed anything. Use ONLY the JSON data provided. Be concise and concrete. Today is ${new Date().toDateString()}.` },
          { role: 'user', content: AGENT_PROMPTS[ag.builder] + '\n\nDATA:\n' + JSON.stringify(ctx) },
        ]);
        mode = 'live';
      } catch (e) { output = 'Run failed: ' + e.message; status = 'error'; mode = 'live'; ag.errors++; }
    } else {
      output = simulate(ag.builder, ctx); mode = 'simulated';
    }
    const durMs = Math.round(performance.now() - t0);
    ag.runs++; ag.lastRun = new Date().toISOString();
    const summary = output.split('\n')[0].slice(0, 110);
    S.agentRuns.unshift({ id: K.uid(), agentId: id, at: new Date().toISOString(), status, mode, durMs, summary, output });
    S.agentRuns = S.agentRuns.slice(0, 60);
    // structured side effects
    if (status === 'ok') {
      if (ag.builder === 'brief') { S.today.briefCustom = output; S.today.briefBy = ag.name + (mode === 'live' ? ' · ' + cfg.model : ' · simulated'); S.today.briefAt = new Date().toISOString(); }
      // any "PROPOSAL: xyz" lines become approval-gated tasks (§14.3 L1)
      (output.match(/^PROPOSAL:\s*(.+)$/gim) || []).slice(0, 4).forEach(line => {
        const title = line.replace(/^PROPOSAL:\s*/i, '').trim().slice(0, 120);
        if (title) S.approvals.unshift({ id: K.uid(), agentId: id, at: new Date().toISOString(), kind: 'task_create', title: 'Create task: “' + title + '”', detail: 'Proposed by ' + ag.name + (mode === 'live' ? ' (local model run)' : ' (simulated run)'), payload: { task: { title, ws: 'ws_personal', due: null } }, status: 'pending' });
      });
    }
    K.logActivity('agent', ag.name + ' ran (' + mode + ')');
    K.refresh();
    A.showRun(S.agentRuns[0].id);
  };

  A.draftReply = async (m) => {
    if (aiCfg().connected) {
      try {
        return await A.chat([
          { role: 'system', content: 'You draft short, warm, decisive email replies for ' + K.S.settings.name + '. 2-5 sentences, no signature.' },
          { role: 'user', content: `Reply to this message.\nFrom: ${m.from}\nSubject: ${m.subject}\nBody: ${m.preview}` },
        ], { maxTokens: 220 });
      } catch (e) { /* fall through to template */ }
    }
    return `Thanks for this — received and reviewing now. I'll come back to you by tomorrow with a decision on "${m.subject}". If it's time-sensitive, call me.`;
  };

  A.togglePause = (id) => {
    const ag = K.S.agents.find(a => a.id === id); if (!ag) return;
    ag.status = ag.status === 'paused' ? 'scheduled' : 'paused';
    K.refresh(); K.toast(ag.name + (ag.status === 'paused' ? ' paused' : ' resumed'));
  };
  A.showRun = (runId) => {
    const r = K.S.agentRuns.find(x => x.id === runId); if (!r) return;
    const ag = K.S.agents.find(a => a.id === r.agentId) || {};
    K.modal(`<h2 style="font-size:15px">${esc(ag.name || 'Agent')} — run output</h2>
      <div class="sub">${K.fmtDay(r.at)} ${K.fmtTime(r.at)} · ${r.durMs}ms ·
        <span class="badge ${r.mode === 'live' ? 'blue' : 'gray'}">${r.mode === 'live' ? '✦ local model' : 'simulated'}</span>
        <span class="badge ${r.status === 'ok' ? 'green' : 'red'}">${r.status}</span></div>
      <div style="font-size:13px;line-height:1.65;white-space:pre-wrap;background:var(--raised);border-radius:8px;padding:12px;max-height:46vh;overflow-y:auto">${esc(r.output)}</div>
      <div class="modal-foot">
        <button class="btn sm ghost" onclick="navigator.clipboard.writeText(KOVA.S.agentRuns.find(x=>x.id==='${r.id}').output).then(()=>KOVA.toast('Copied'))">Copy</button>
        <span class="spacer"></span>
        <button class="btn" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  };

  /* ═══════════════ AI Agents screen ═══════════════ */
  K.reg({
    id: 'agents', title: 'AI Agents', icon: '✦', count: () => K.pendingApprovals().length,
    render() {
      const S = K.S; const cfg = aiCfg();
      const totalRuns = S.agents.reduce((s, a) => s + a.runs, 0);
      const totalErr = S.agents.reduce((s, a) => s + a.errors, 0);
      const savedWk = Math.round(S.agents.filter(a => a.status !== 'paused').reduce((s, a) => s + a.timeSavedMin, 0) / 60 * 10) / 10;
      const trustAvg = (S.agents.reduce((s, a) => s + a.trust, 0) / S.agents.length).toFixed(1);
      return `
      <div class="card" style="${cfg.connected ? 'border-color:rgba(12,163,12,0.35)' : 'border-color:rgba(250,178,25,0.3)'}">
        <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap">
          <span class="ai-dot ${cfg.connected ? 'on' : ''}" style="width:10px;height:10px"></span>
          <div class="grow">
            <div style="font-weight:650">${cfg.connected ? 'Local model connected — agents run for real' : 'No local model yet — agents run in simulation'}</div>
            <div class="small muted">${cfg.connected
              ? esc(cfg.baseUrl) + ' · ' + esc(cfg.model) + ' · ' + (cfg.latency || '?') + 'ms · every run stays on your hardware'
              : 'Runs below are labeled “simulated” and built from your live data. When your AI machine is up: install Ollama, then Settings → AI Gateway → Test.'}</div>
          </div>
          <button class="btn ${cfg.connected ? '' : 'primary'}" onclick="KOVA.nav('#/settings')">${cfg.connected ? 'Gateway settings' : 'Connect local model'}</button>
        </div>
      </div>

      <div class="grid cols-4 section-gap">
        <div class="card metric"><div class="k">Lifetime runs</div><div class="v">${totalRuns}</div><div class="sub">${totalErr} errors · ${(totalRuns ? (100 - totalErr / totalRuns * 100).toFixed(1) : '—')}% success</div></div>
        <div class="card metric"><div class="k">Est. time saved</div><div class="v">${savedWk}h</div><div class="sub">per week, active agents</div></div>
        <div class="card metric tappable" onclick="KOVA.openApprovals()"><div class="k">Awaiting approval</div><div class="v">${K.pendingApprovals().length}</div><div class="sub">open queue →</div></div>
        <div class="card metric"><div class="k">Avg trust rating</div><div class="v">${trustAvg}/5</div><div class="sub">your correction rate drives this</div></div>
      </div>

      <div class="card-head section-gap"><h3>Agent registry — ${S.agents.length} agents</h3>
        <span class="muted small">levels: observe → propose → limited execute → managed autonomy (§14.3)</span></div>
      <div class="grid cols-2">${S.agents.map(a => `
        <div class="card">
          <div style="display:flex;gap:8px;align-items:start">
            <div class="grow"><div style="font-weight:650">${esc(a.name)}</div>
              <div class="small muted" style="margin-top:2px">${esc(a.purpose)}</div></div>
            <span class="badge ${a.status === 'paused' ? 'gray' : a.status === 'error' ? 'red' : 'blue'}">${a.status}</span></div>
          <div class="meta" style="margin:8px 0">
            <span class="badge gray">${LEVELS[a.level]}</span>
            <span>↻ ${esc(a.schedule)}</span>
            <span>${a.runs} runs · ${a.errors} err</span>
            <span>last ${a.lastRun ? K.fmtDay(a.lastRun) + ' ' + K.fmtTime(a.lastRun) : 'never'}</span>
          </div>
          <div class="small muted" style="margin-bottom:8px">reads: ${(a.dataAccess || []).join(', ')}</div>
          <div class="btnrow">
            <button class="btn sm primary" onclick="KOVA.Agents.runAgent('${a.id}')">▶ Run now</button>
            <button class="btn sm ghost" onclick="KOVA.Agents.togglePause('${a.id}')">${a.status === 'paused' ? 'Resume' : 'Pause'}</button>
            <span class="spacer"></span>
            <span class="small muted">trust ${'★'.repeat(a.trust)}${'☆'.repeat(5 - a.trust)}</span>
          </div>
        </div>`).join('')}</div>

      <div class="card section-gap pad-0">
        <div class="card-head" style="padding:14px 16px 4px"><h3>Run log</h3><span class="muted small">every agent action is recorded (§24.4)</span></div>
        <div class="tablewrap" style="margin:0;padding:0 16px 12px"><table>
          <thead><tr><th>When</th><th>Agent</th><th>Mode</th><th>Status</th><th>Summary</th></tr></thead>
          <tbody>${S.agentRuns.slice(0, 14).map(r => {
            const ag = S.agents.find(a => a.id === r.agentId) || {};
            return `<tr class="clickable" onclick="KOVA.Agents.showRun('${r.id}')">
              <td class="nowrap num">${K.fmtDay(r.at)} ${K.fmtTime(r.at)}</td>
              <td>${esc(ag.name || r.agentId)}</td>
              <td>${r.mode === 'live' ? '<span class="badge blue">✦ local</span>' : '<span class="badge gray">sim</span>'}</td>
              <td>${r.status === 'ok' ? '<span class="badge green">ok</span>' : r.status === 'error' ? '<span class="badge red">error</span>' : '<span class="badge amber">' + r.status + '</span>'}</td>
              <td style="max-width:340px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r.summary)}</td></tr>`;
          }).join('')}</tbody></table></div>
      </div>`;
    },
  });

  /* ═══════════════ Copilot (§26) ═══════════════ */
  const CP = (K.Copilot = {});
  CP.open = () => {
    const el = document.getElementById('copilot');
    el.classList.add('open');
    document.getElementById('copilot-fab').style.display = 'none';
    CP.render();
  };
  CP.close = () => {
    document.getElementById('copilot').classList.remove('open');
    document.getElementById('copilot-fab').style.display = '';
  };
  CP.render = () => {
    const S = K.S; const cfg = aiCfg();
    const thread = S.copilotThread || [];
    document.getElementById('copilot').innerHTML = `
      <div class="cp-head">
        <span class="ai-dot ${cfg.connected ? 'on' : ''}"></span>
        <b style="font-size:13.5px">HQ Copilot</b>
        <span class="small muted">${cfg.connected ? esc(cfg.model) : 'offline'}</span>
        <span class="spacer"></span>
        ${thread.length ? '<button class="btn sm ghost" onclick="KOVA.Copilot.clear()">clear</button>' : ''}
        <button class="icon-btn" style="width:28px;height:28px" onclick="KOVA.Copilot.close()">×</button>
      </div>
      <div class="cp-body" id="cp-body">
        ${thread.length ? '' : `<div class="cp-msg ai">${cfg.connected
          ? 'Connected to your local model. Ask about anything in HQ — “what needs my attention?”, “summarize the Mesa deal”, “draft a note to the lender”.'
          : 'No local model connected yet, so I can\'t reason freely — but your agents still run in simulation. Once your AI machine is running Ollama, connect it in <b>Settings → AI Gateway</b> and this chat comes alive, fully private on your hardware.'}</div>`}
        ${thread.map(m => `<div class="cp-msg ${m.role === 'user' ? 'user' : 'ai'}">${esc(m.content)}</div>`).join('')}
        ${CP._busy ? '<div class="cp-msg ai muted">thinking…</div>' : ''}
      </div>
      <div class="cp-foot">
        <textarea id="cp-in" placeholder="${cfg.connected ? 'Ask across your whole system…' : 'Model offline — connect in Settings'}"
          onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();KOVA.Copilot.send()}"></textarea>
        <button class="btn primary" onclick="KOVA.Copilot.send()">→</button>
      </div>`;
    const b = document.getElementById('cp-body'); b.scrollTop = b.scrollHeight;
  };
  CP.clear = () => { K.S.copilotThread = []; K.save(); CP.render(); };
  CP.snapshot = () => {
    const S = K.S;
    return JSON.stringify({
      today: { outcomes: (S.today.outcomes || []).map(o => o.title + (o.done ? ' ✓' : '')), events: K.eventsToday().map(e => K.fmtTime(e.start) + ' ' + e.title), tasksDue: K.tasksDueToday().map(t => t.title) },
      attention: K.attention().slice(0, 5).map(a => a.what),
      approvals: K.pendingApprovals().map(a => a.title),
      finance: { netWorth: strip(K.money(K.netWorth(), { short: true })), liquid: strip(K.money(K.liquidCash(), { short: true })) },
      pipeline: S.opportunities.filter(o => o.stage !== 'Declined').map(o => o.name + ' [' + o.stage + ']'),
      businesses: S.entities.map(e => e.name + ': ' + e.health),
      positions: S.positions.map(p => p.ticker + (p.options || []).map(o => ' ' + o.contracts + 'x' + o.strike + (o.type === 'cc' ? 'C' : 'P')).join('')),
      projectsAtRisk: S.projects.filter(p => p.health === 'amber' || p.health === 'red').map(p => p.title),
    });
  };
  CP.send = async () => {
    const inp = document.getElementById('cp-in');
    const text = (inp.value || '').trim(); if (!text) return;
    const S = K.S; const cfg = aiCfg();
    S.copilotThread = S.copilotThread || [];
    S.copilotThread.push({ role: 'user', content: text });
    if (!cfg.connected) {
      S.copilotThread.push({ role: 'assistant', content: 'I\'m offline until your local model is connected (Settings → AI Gateway). Quick answers from live data meanwhile: ' + K.tasksDueToday().length + ' tasks due today, ' + K.pendingApprovals().length + ' approvals waiting, top attention item: ' + (K.attention()[0] || {}).what + '.' });
      K.save(); CP.render(); return;
    }
    CP._busy = true; K.save(); CP.render();
    try {
      const history = S.copilotThread.slice(-8).map(m => ({ role: m.role, content: m.content }));
      const reply = await A.chat([
        { role: 'system', content: `You are the HQ Copilot — chief-of-staff for ${S.settings.name} inside this personal command center. Answer from the SNAPSHOT of live system data below; be direct, numerate and brief. You may recommend and draft, but actions require the user's approval — never claim to have executed anything.\nSNAPSHOT: ${CP.snapshot()}` },
        ...history,
      ], { maxTokens: 500 });
      S.copilotThread.push({ role: 'assistant', content: reply });
    } catch (e) {
      S.copilotThread.push({ role: 'assistant', content: '⚠ Model call failed: ' + e.message });
    }
    CP._busy = false;
    S.copilotThread = S.copilotThread.slice(-24);
    K.save(); CP.render();
  };
})();
