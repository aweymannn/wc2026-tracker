/* ============================================================================
   KOVA OS — screens, part 1
   Command Center · Today · Universal Inbox · Calendar · Tasks · Projects
   Screens register with KOVA.reg(); view actions live on KOVA.V.
   ========================================================================== */
'use strict';

(() => {
  const K = KOVA;
  const V = (K.V = K.V || {});
  const esc = K.esc, money = K.money;

  const SRC_ICO = { gmail: '✉', sms: '✆', slack: '⌗', pm: '⌂', finance: '$', agent: '✦' };
  const fmtRange = (e) => K.fmtTime(e.start) + '–' + K.fmtTime(e.end);
  const RAG = { green: 'var(--good)', amber: 'var(--warn)', red: 'var(--crit)', gray: 'var(--baseline)' };

  /* ═══════════════════════ COMMAND CENTER ═══════════════════════ */
  K.reg({
    id: 'home', title: 'Command Center', icon: '◉',
    render() {
      const S = K.S;
      const outcomes = S.today.outcomes || [];
      const doneN = outcomes.filter(o => o.done).length;
      const feed = K.attention().slice(0, 8);
      const evs = K.eventsToday();
      const conflicts = K.conflictsOn(K.todayISO());
      const conflictIds = new Set(conflicts.flat().map(e => e.id));
      const readiness = S.health.log[S.health.log.length - 1] || { readiness: 0 };
      const propAlerts = S.properties.reduce((s, p) => s + (p.alerts || []).length, 0);
      const nearStrike = S.positions.flatMap(p => (p.options || []).filter(o => o.type === 'cc' && p.price > o.strike * 0.95).map(o => p.ticker));
      const now = new Date();

      const metricCards = [
        { k: 'Focus hours left', v: K.focusHours() + 'h', sub: 'until 6pm, after events', link: '#/calendar' },
        { k: 'Tasks due today', v: K.tasksDueToday().length, sub: K.openTasks().filter(t => t.due && K.daysUntil(t.due) < 0).length + ' overdue', link: '#/tasks' },
        { k: 'Approvals waiting', v: K.pendingApprovals().length, sub: 'agent-proposed actions', act: 'KOVA.openApprovals()' },
        { k: 'Needs response', v: K.inboxOpen().filter(m => m.triage === 'reply' || m.triage === 'decision').length, sub: 'inbox items', link: '#/inbox' },
        { k: 'Liquid cash', v: money(K.liquidCash(), { short: true }), sub: 'across operating accounts', link: '#/finance' },
        { k: 'Market watch', v: nearStrike.length ? nearStrike.join(', ') : 'quiet', sub: nearStrike.length ? 'near covered-call strike' : 'no threshold alerts', link: '#/investments' },
        { k: 'Property exceptions', v: propAlerts, sub: 'across owned assets', link: '#/realestate' },
        { k: 'Health readiness', v: readiness.readiness, sub: 'sleep ' + (S.health.log[S.health.log.length - 1] || {}).sleepHrs + 'h last night', link: '#/family' },
      ];

      return `
      <div class="card" style="background:linear-gradient(135deg,rgba(57,135,229,0.10),rgba(144,133,233,0.06));border-color:rgba(57,135,229,0.25)">
        <div class="card-head"><h3>Today's three outcomes</h3>
          <span class="muted small">${doneN}/${outcomes.length} · ~${outcomes.reduce((s, o) => s + (o.done ? 0 : o.focusMin), 0)} focus min needed</span>
          <button class="link" onclick="KOVA.V.editOutcomes()">edit</button></div>
        <div class="rows">${outcomes.map(o => `
          <div class="row ${o.done ? 'done' : ''}">
            <button class="check ${o.done ? 'on' : ''}" onclick="KOVA.V.toggleOutcome('${o.id}')" aria-label="toggle outcome">✓</button>
            <div class="grow"><div class="title">${esc(o.title)}</div></div>
            ${o.link && K.proj(o.link) ? `<span class="badge gray proj-chip">${esc(K.proj(o.link).title.slice(0, 26))}</span>` : ''}
            <span class="muted small num">${o.focusMin}m</span>
          </div>`).join('') || '<div class="empty">No outcomes yet — set your top three.</div>'}</div>
        <div class="bar" style="margin-top:10px"><i style="width:${outcomes.length ? Math.round(doneN / outcomes.length * 100) : 0}%"></i></div>
      </div>

      <div class="grid cols-4 section-gap">${metricCards.map(c => `
        <div class="card metric tappable" onclick="${c.act || `KOVA.nav('${c.link}')`}">
          <div class="k">${c.k}</div><div class="v">${c.v}</div><div class="sub">${c.sub}</div></div>`).join('')}
      </div>

      <div class="two-col section-gap">
        <div class="card">
          <div class="card-head"><h3>Attention feed</h3><span class="muted small">ranked by urgency · impact · risk (§30)</span></div>
          ${feed.map(f => `
            <div class="feed-item">
              <div class="feed-rail" style="background:${{ critical: 'var(--crit)', high: 'var(--serious)', normal: 'var(--warn)' }[f.pri] || 'var(--baseline)'}"></div>
              <div class="feed-body">
                <div class="feed-what">${esc(f.what)}</div>
                <div class="feed-why">${esc(f.why)}</div>
                <div class="feed-act">
                  <button class="btn sm" onclick="KOVA.nav('${f.link}')">Open</button>
                  ${f.kind === 'alert' ? `<button class="btn sm ghost" onclick="KOVA.V.snoozeAlert('${f.ref}')">Dismiss</button>` : ''}
                  ${f.kind === 'approval' ? `<button class="btn sm primary" onclick="KOVA.approve('${f.ref}')">Approve</button>` : ''}
                  ${f.kind === 'task' ? `<button class="btn sm ghost" onclick="KOVA.V.completeTask('${f.ref}')">Done</button>` : ''}
                  <span class="muted small">score ${Math.round(f.score)}</span>
                </div></div></div>`).join('') || '<div class="empty">Nothing needs attention. Healthy systems stay quiet.</div>'}
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>Domain health</h3></div>
            <div class="rows">${K.domainHealth().map(dh => `
              <div class="row">
                <span class="dot" style="background:${RAG[dh.rag]}"></span>
                <div class="grow"><div class="title">${esc(dh.name)}</div></div>
                <span class="muted small" style="text-align:right">${esc(dh.why)}</span>
              </div>`).join('')}</div>
          </div>

          <div class="card section-gap">
            <div class="card-head"><h3>Today's timeline</h3><button class="link" onclick="KOVA.nav('#/calendar')">calendar →</button></div>
            <div class="tl">${evs.map(e => `
              <div class="tl-item ${conflictIds.has(e.id) ? 'conflict' : (new Date(e.start) <= now && now <= new Date(e.end) ? 'now' : '')}">
                <span class="t">${K.fmtTime(e.start)}</span>
                <div class="title" style="font-size:13px">${esc(e.title)} ${conflictIds.has(e.id) ? '<span class="badge red">conflict</span>' : ''}</div>
                <div class="meta"><span>${K.wsChip(e.ws)}</span><span>${fmtRange(e)}</span>${e.location ? `<span>${esc(e.location)}</span>` : ''}</div>
              </div>`).join('') || '<div class="empty">Clear calendar today.</div>'}</div>
          </div>
        </div>
      </div>`;
    },
  });

  V.toggleOutcome = (id) => { const o = K.S.today.outcomes.find(x => x.id === id); if (o) o.done = !o.done; K.refresh(); };
  V.snoozeAlert = (id) => { const n = K.S.notifications.find(x => x.id === id); if (n) n.read = true; K.refresh(); K.toast('Dismissed'); };
  V.completeTask = (id) => { const t = K.S.tasks.find(x => x.id === id); if (t) { t.status = 'done'; t.completedAt = new Date().toISOString(); } K.refresh(); K.toast('Done'); };
  V.editOutcomes = () => {
    const o = K.S.today.outcomes;
    K.modal(`<h2>Today's three outcomes</h2><div class="sub">If everything else slipped but these got done, today was a win.</div>
      ${[0, 1, 2].map(i => `<input id="out-${i}" style="margin-bottom:8px" placeholder="Outcome ${i + 1}" value="${esc(o[i] ? o[i].title : '')}">`).join('')}
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Cancel</button>
      <button class="btn primary" onclick="KOVA.V.saveOutcomes()">Save</button></div>`);
  };
  V.saveOutcomes = () => {
    const prev = K.S.today.outcomes;
    K.S.today.outcomes = [0, 1, 2].map(i => {
      const v = K.$('#out-' + i).value.trim(); if (!v) return null;
      const old = prev[i];
      return { id: old ? old.id : K.uid(), title: v, done: old && old.title === v ? old.done : false, focusMin: old ? old.focusMin : 45, link: old ? old.link : null };
    }).filter(Boolean);
    K.closeModal(); K.refresh();
  };

  /* ═══════════════════════ TODAY ═══════════════════════ */
  K.reg({
    id: 'today', title: 'Today', icon: '☀',
    render() {
      const S = K.S;
      const due = K.openTasks().filter(t => t.due && K.daysUntil(t.due) <= 0)
        .sort((a, b) => (a.priority - b.priority) || (K.daysUntil(a.due) - K.daysUntil(b.due)));
      const doneToday = S.tasks.filter(t => t.status === 'done' && t.completedAt && K.daysUntil(t.completedAt) === 0);
      const evs = K.eventsToday();
      const fam = evs.filter(e => ['family', 'school', 'sport'].includes(e.kind));
      const hh = S.family.household.filter(h => h.status === 'open' && K.daysUntil(h.due) <= 7);
      const dayName = new Date().toLocaleDateString('en-US', { weekday: 'short' });
      const plan = S.health.plan.find(p => p.day === dayName);
      const last = S.health.log[S.health.log.length - 1] || {};
      const ai = S.settings.ai;

      return `
      <div class="card">
        <div class="card-head"><h3>Morning brief</h3>
          <button class="link" onclick="KOVA.Agents.runAgent('ag_brief')">${ai.connected ? '✦ regenerate with local model' : '✦ run brief agent'}</button></div>
        <div style="font-size:13.5px;line-height:1.6">${V.briefText()}</div>
      </div>

      <div class="two-col section-gap">
        <div>
          <div class="card">
            <div class="card-head"><h3>Execute — due & at risk</h3><button class="link" onclick="KOVA.V.taskModal()">+ task</button></div>
            <div class="rows">${due.map(t => V.taskRow(t)).join('') || '<div class="empty">Nothing due. Pull from Next Actions if you have capacity.</div>'}</div>
            ${doneToday.length ? `<hr class="divider"><div class="small muted">Completed today</div><div class="rows">${doneToday.map(t => V.taskRow(t)).join('')}</div>` : ''}
          </div>

          <div class="card section-gap">
            <div class="card-head"><h3>Schedule</h3><span class="muted small">${evs.length} events · ${K.focusHours()}h focus left</span></div>
            <div class="tl">${evs.map(e => `
              <div class="tl-item ${new Date(e.start) <= new Date() && new Date() <= new Date(e.end) ? 'now' : ''}">
                <span class="t">${K.fmtTime(e.start)}</span>
                <div class="title" style="font-size:13px">${esc(e.title)}</div>
                <div class="meta"><span>${fmtRange(e)}</span><span>${K.wsChip(e.ws)}</span></div>
                ${e.prep ? `<div class="callout" style="margin-top:6px;font-size:12px">Prep: ${esc(e.prep)}</div>` : ''}
              </div>`).join('') || '<div class="empty">Open day — protect it for deep work.</div>'}</div>
          </div>
        </div>

        <div>
          <div class="card">
            <div class="card-head"><h3>Family logistics</h3></div>
            <div class="rows">
              ${fam.map(e => `<div class="row"><span class="wsdot" style="background:${K.wsColor(e.ws)}"></span>
                <div class="grow"><div class="title">${esc(e.title)}</div><div class="meta">${fmtRange(e)}${e.location ? ' · ' + esc(e.location) : ''}</div></div></div>`).join('')}
              ${hh.map(h => `<div class="row"><span class="wsdot" style="background:var(--s2)"></span>
                <div class="grow"><div class="title">${esc(h.title)}</div><div class="meta">household${h.vendor ? ' · ' + esc(h.vendor) : ''}</div></div>${K.dueBadge(h.due)}</div>`).join('')}
              ${!fam.length && !hh.length ? '<div class="empty">Nothing on the family board today.</div>' : ''}
            </div>
          </div>

          <div class="card section-gap">
            <div class="card-head"><h3>Training & recovery</h3></div>
            <div style="display:flex;gap:16px;align-items:center">
              ${K.ring(last.readiness || 0)}
              <div>
                <div style="font-weight:650">${plan ? esc(plan.session) : 'Rest day'}</div>
                <div class="small muted">readiness ${last.readiness} · sleep ${last.sleepHrs}h</div>
                <div class="small muted">${(last.readiness || 0) < 60 ? 'Below 60 — consider swapping to Zone 2 / mobility.' : 'Green light for the planned session.'}</div>
              </div>
            </div>
          </div>

          <div class="card section-gap">
            <div class="card-head"><h3>Evening shutdown</h3></div>
            <div class="small muted" style="margin-bottom:10px">5 minutes: confirm outcomes, reschedule what's left, capture decisions, set tomorrow's top three.</div>
            <button class="btn primary" style="width:100%" onclick="KOVA.V.shutdownFlow()">${S.today.shutdownDone ? 'Shutdown complete ✓ — reopen' : 'Start daily shutdown'}</button>
          </div>
        </div>
      </div>`;
    },
  });

  V.briefText = () => {
    const S = K.S;
    const custom = S.today.briefCustom;
    if (custom) return `<div style="white-space:pre-wrap">${esc(custom)}</div><div class="small muted" style="margin-top:6px">✦ generated by ${esc(custom_src())} · ${K.fmtTime(S.today.briefAt || new Date().toISOString())}</div>`;
    function custom_src() { return S.today.briefBy || 'brief agent'; }
    const feed = K.attention();
    const conflicts = K.conflictsOn(K.todayISO());
    const due = K.tasksDueToday().length;
    const dec = K.inboxOpen().filter(m => m.triage === 'decision').length;
    const ap = K.pendingApprovals().length;
    const parts = [];
    parts.push(`<b>Focus:</b> ${(S.today.outcomes || []).map(o => esc(o.title)).join(' · ') || 'set your three outcomes'}.`);
    parts.push(`<b>Load:</b> ${K.eventsToday().length} events, ${due} tasks due, ${K.focusHours()}h of focus time available.`);
    if (conflicts.length) parts.push(`<b>Conflict:</b> ${esc(conflicts[0][0].title)} overlaps ${esc(conflicts[0][1].title)} at ${K.fmtTime(conflicts[0][1].start)} — resolve one.`);
    if (dec || ap) parts.push(`<b>Decisions:</b> ${dec} inbox decisions + ${ap} agent approvals waiting.`);
    if (feed[0]) parts.push(`<b>Top risk:</b> ${esc(feed[0].what)}.`);
    return parts.map(p => '• ' + p).join('<br>') + '<div class="small muted" style="margin-top:6px">assembled from live data — connect a local model for a written brief</div>';
  };

  V.shutdownFlow = () => {
    const S = K.S;
    const unfinished = (S.today.outcomes || []).filter(o => !o.done);
    const openDue = K.openTasks().filter(t => t.due && K.daysUntil(t.due) <= 0);
    K.modal(`<h2>Daily shutdown</h2><div class="sub">Close the day deliberately (§6.4).</div>
      <div class="card-head"><h3>1 · Outcomes</h3></div>
      <div class="rows">${(S.today.outcomes || []).map(o => `
        <div class="row ${o.done ? 'done' : ''}"><button class="check ${o.done ? 'on' : ''}" onclick="KOVA.V.toggleOutcome('${o.id}');KOVA.V.shutdownFlow()">✓</button>
        <div class="grow"><div class="title">${esc(o.title)}</div></div></div>`).join('') || '<div class="empty">No outcomes were set today.</div>'}</div>
      <div class="card-head" style="margin-top:12px"><h3>2 · Unfinished (${unfinished.length + openDue.length})</h3></div>
      <div class="small muted">Unfinished outcomes carry to tomorrow automatically. Due tasks stay due — reschedule below if needed.</div>
      ${openDue.length ? `<div class="btnrow" style="margin-top:8px"><button class="btn sm" onclick="KOVA.V.deferDue(1)">Move due tasks → tomorrow</button></div>` : ''}
      <div class="card-head" style="margin-top:12px"><h3>3 · Capture</h3></div>
      <textarea id="sd-notes" rows="2" placeholder="Decisions made, lessons, loose ends…">${esc(S.today.shutdownNotes || '')}</textarea>
      <div class="card-head" style="margin-top:12px"><h3>4 · Tomorrow's first outcome</h3></div>
      <input id="sd-tomorrow" placeholder="The one thing tomorrow must produce" value="${esc(S.today.tomorrowFirst || '')}">
      <div class="modal-foot"><button class="btn" onclick="KOVA.closeModal()">Later</button>
      <button class="btn primary" onclick="KOVA.V.shutdownSave()">Complete shutdown</button></div>`, { noFocus: true });
  };
  V.deferDue = (days) => {
    K.openTasks().filter(t => t.due && K.daysUntil(t.due) <= 0).forEach(t => {
      const n = new Date(); t.due = new Date(n.getFullYear(), n.getMonth(), n.getDate() + days, 12).toISOString().slice(0, 10);
    });
    K.refresh(); K.toast('Due tasks moved to tomorrow'); V.shutdownFlow();
  };
  V.shutdownSave = () => {
    const S = K.S;
    S.today.shutdownDone = true;
    S.today.shutdownNotes = K.$('#sd-notes').value.trim();
    S.today.tomorrowFirst = K.$('#sd-tomorrow').value.trim();
    S.reviews.unshift({ id: K.uid(), kind: 'shutdown', date: K.todayISO(), wins: (S.today.outcomes || []).filter(o => o.done).map(o => o.title).join('; '), missed: (S.today.outcomes || []).filter(o => !o.done).map(o => o.title).join('; '), notes: S.today.shutdownNotes, outcomes: S.today.tomorrowFirst });
    K.logActivity('review', 'Daily shutdown completed');
    K.closeModal(); K.refresh(); K.toast('Day closed. See you tomorrow.');
  };

  /* ═══════════════════════ UNIVERSAL INBOX ═══════════════════════ */
  const TRIAGE = [
    ['reply', 'Requires reply'], ['decision', 'Requires decision'], ['task', 'Requires task'],
    ['waiting', 'Waiting on someone'], ['read', 'Read only'],
  ];
  let inboxFilter = 'attention';
  K.reg({
    id: 'inbox', title: 'Inbox', icon: '▤', count: () => K.inboxOpen().length,
    render() {
      const S = K.S;
      let list = S.messages.filter(m => !m.done);
      if (inboxFilter === 'attention') list = list.filter(m => ['reply', 'decision', 'task'].includes(m.triage));
      else if (inboxFilter !== 'all') list = list.filter(m => m.triage === inboxFilter);
      list = [...list].sort((a, b) => (a.importance - b.importance) || (a.received < b.received ? 1 : -1));
      const n8n = S.settings.n8n;
      return `
      <div class="chiprow">
        <button class="chip ${inboxFilter === 'attention' ? 'on' : ''}" onclick="KOVA.V.inboxF('attention')">Needs attention</button>
        ${TRIAGE.map(([id, name]) => `<button class="chip ${inboxFilter === id ? 'on' : ''}" onclick="KOVA.V.inboxF('${id}')">${name}</button>`).join('')}
        <button class="chip ${inboxFilter === 'all' ? 'on' : ''}" onclick="KOVA.V.inboxF('all')">All</button>
        <span class="spacer"></span>
        <button class="chip" onclick="KOVA.V.syncInbox()" title="Pull new items from your n8n bridge">↻ Sync ${n8n.enabled ? '' : '(configure n8n)'}</button>
      </div>
      <div class="card pad-0"><div class="rows" style="padding:4px 14px">
        ${list.map(m => `
        <div class="row clickable" onclick="KOVA.V.openMsg('${m.id}')">
          <span class="ico" style="width:20px;text-align:center;flex:none;opacity:.85">${SRC_ICO[m.source] || '·'}</span>
          <div class="grow">
            <div class="title">${m.importance === 1 ? '<span class="dot" style="background:var(--serious);margin-right:5px"></span>' : ''}<b>${esc(m.from)}</b> — ${esc(m.subject)}</div>
            <div class="meta"><span>${esc(m.preview.slice(0, 110))}${m.preview.length > 110 ? '…' : ''}</span></div>
            ${m.aiSummary ? `<div class="meta"><span style="color:#a9cdf6">✦ ${esc(m.aiSummary)}</span></div>` : ''}
          </div>
          <div style="text-align:right;flex:none">
            <div class="small muted nowrap">${K.fmtDay(m.received)} ${K.fmtTime(m.received)}</div>
            ${m.triage ? `<span class="badge ${m.triage === 'decision' ? 'amber' : m.triage === 'reply' ? 'blue' : 'gray'}">${m.triage}</span>` : '<span class="badge gray">untriaged</span>'}
          </div>
        </div>`).join('') || '<div class="empty">Inbox zero for this view.</div>'}
      </div></div>
      <div class="small muted section-gap">Sources consolidate here: email, SMS, Slack, property systems, financial alerts, agent output (§7.1). Connect Gmail/Calendar through your n8n bridge in <a href="#/settings">Settings</a>.</div>`;
    },
  });
  V.inboxF = (f) => { inboxFilter = f; K.render(); };
  V.openMsg = (id) => {
    const m = K.S.messages.find(x => x.id === id); if (!m) return;
    K.modal(`<h2 style="font-size:15px">${esc(m.subject)}</h2>
      <div class="sub">${SRC_ICO[m.source]} ${esc(m.from)} · ${K.fmtDay(m.received)} ${K.fmtTime(m.received)}</div>
      <div style="font-size:13.5px;line-height:1.6;background:var(--raised);border-radius:8px;padding:12px">${esc(m.preview)}</div>
      ${m.aiSummary ? `<div class="callout" style="margin-top:10px">✦ ${esc(m.aiSummary)}</div>` : ''}
      <label>Triage</label>
      <select onchange="KOVA.V.setTriage('${m.id}', this.value)">
        <option value="">untriaged</option>
        ${TRIAGE.map(([tid, name]) => `<option value="${tid}" ${m.triage === tid ? 'selected' : ''}>${name}</option>`).join('')}
        <option value="archive" ${m.triage === 'archive' ? 'selected' : ''}>Archive</option>
      </select>
      <div class="modal-foot">
        <button class="btn sm ghost" onclick="KOVA.V.msgToTask('${m.id}')">＋ Extract task</button>
        <button class="btn sm ghost" onclick="KOVA.V.draftReply('${m.id}')">✦ Draft reply</button>
        <span class="spacer"></span>
        <button class="btn sm" onclick="KOVA.V.msgDone('${m.id}')">Done</button>
        <button class="btn sm" onclick="KOVA.closeModal()">Close</button></div>`, { noFocus: true });
  };
  V.setTriage = (id, t) => { const m = K.S.messages.find(x => x.id === id); if (m) m.triage = t || null; K.refresh(); };
  V.msgDone = (id) => { const m = K.S.messages.find(x => x.id === id); if (m) m.done = true; K.closeModal(); K.refresh(); K.toast('Processed'); };
  V.msgToTask = (id) => {
    const m = K.S.messages.find(x => x.id === id); if (!m) return;
    K.S.tasks.unshift({ id: K.uid(), title: 'Re: ' + m.subject, ws: 'ws_personal', projectId: null, due: K.todayISO(), status: 'open', priority: 2, energy: 'med', estimateMin: 20, source: 'inbox', nextAction: true, context: m.from });
    m.triage = 'task'; K.closeModal(); K.refresh(); K.toast('Task created from message');
  };
  V.draftReply = async (id) => {
    const m = K.S.messages.find(x => x.id === id); if (!m) return;
    K.closeModal();
    const draft = await K.Agents.draftReply(m);
    K.modal(`<h2>Draft reply</h2><div class="sub">To: ${esc(m.from)} — review before sending from your mail client. ${K.S.settings.ai.connected ? '✦ written by your local model' : 'Template draft — connect a local model for a real one'}</div>
      <textarea rows="7" id="draft-txt">${esc(draft)}</textarea>
      <div class="modal-foot">
        <button class="btn" onclick="KOVA.closeModal()">Discard</button>
        <button class="btn primary" onclick="navigator.clipboard.writeText(document.getElementById('draft-txt').value).then(()=>KOVA.toast('Copied to clipboard'));KOVA.closeModal()">Copy to clipboard</button></div>`, { noFocus: true });
  };
  V.syncInbox = async () => {
    const n8n = K.S.settings.n8n;
    if (!n8n.enabled || !n8n.baseUrl) { K.toast('Configure your n8n bridge in Settings first'); K.nav('#/settings'); return; }
    K.toast('Syncing from n8n…');
    try {
      const res = await fetch(n8n.baseUrl.replace(/\/$/, '') + n8n.inboxPath, { method: 'GET' });
      const items = await res.json();
      let added = 0;
      (Array.isArray(items) ? items : []).forEach(it => {
        if (!it.subject) return;
        K.S.messages.unshift({ id: K.uid(), source: it.source || 'gmail', from: it.from || 'unknown', subject: it.subject, preview: it.preview || it.body || '', received: it.received || new Date().toISOString(), triage: null, importance: it.importance || 2, done: false });
        added++;
      });
      K.refresh(); K.toast(added + ' new items from n8n');
    } catch (e) { K.toast('⚠ n8n bridge unreachable: ' + e.message); }
  };

  /* ═══════════════════════ CALENDAR ═══════════════════════ */
  let calMode = 'week';
  K.reg({
    id: 'calendar', title: 'Calendar', icon: '▦',
    render() {
      const S = K.S;
      return `
      <div class="chiprow">
        <div class="seg"><button class="${calMode === 'week' ? 'on' : ''}" onclick="KOVA.V.calM('week')">Week</button>
        <button class="${calMode === 'agenda' ? 'on' : ''}" onclick="KOVA.V.calM('agenda')">Agenda</button></div>
        <span class="spacer"></span>
        <button class="btn sm ghost" onclick="KOVA.V.exportICS()" title="Export upcoming events for Apple Calendar">⇩ .ics</button>
        <button class="btn sm" onclick="KOVA.V.eventModal()">＋ Event / block</button>
      </div>
      ${calMode === 'week' ? V.calWeek() : V.calAgenda()}
      <div class="small muted section-gap">One calendar across personal, family, business, sport, market and deadline events (§8.1). Conflicts are flagged; focus capacity shows per day. Live Google Calendar sync arrives via the n8n bridge.</div>`;
    },
  });
  V.calM = (m) => { calMode = m; K.render(); };
  V.calWeek = () => {
    const S = K.S;
    let html = '<div class="pipe">';
    for (let dOff = 0; dOff < 7; dOff++) {
      const dt = new Date(); dt.setDate(dt.getDate() + dOff);
      const iso = new Date(dt.getFullYear(), dt.getMonth(), dt.getDate(), 12).toISOString().slice(0, 10);
      const evs = S.events.filter(e => (e.start || '').slice(0, 10) === iso).sort((a, b) => a.start < b.start ? -1 : 1);
      const conflictIds = new Set(K.conflictsOn(iso).flat().map(e => e.id));
      html += `<div class="pipe-col" style="min-width:200px;width:200px">
        <h4>${dOff === 0 ? 'Today' : dt.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}<span class="spacer"></span><span class="num">${evs.length}</span></h4>
        ${evs.map(e => `<div class="pipe-card" style="border-left:3px solid ${K.wsColor(e.ws)};${conflictIds.has(e.id) ? 'border-color:var(--crit)' : ''}" onclick="KOVA.V.eventModal('${e.id}')">
          <div style="font-size:12.5px;font-weight:600">${esc(e.title)}${e.tentative ? ' <span class="badge gray">tentative</span>' : ''}</div>
          <div class="small muted num">${fmtRange(e)}${conflictIds.has(e.id) ? ' · <span style="color:var(--crit)">conflict</span>' : ''}</div>
        </div>`).join('') || '<div class="empty" style="padding:14px 4px">—</div>'}
      </div>`;
    }
    return html + '</div>';
  };
  V.calAgenda = () => {
    const S = K.S;
    const groups = {};
    S.events.filter(e => K.daysUntil(e.start) >= 0 && K.daysUntil(e.start) <= 14)
      .sort((a, b) => a.start < b.start ? -1 : 1)
      .forEach(e => { const k = (e.start || '').slice(0, 10); (groups[k] = groups[k] || []).push(e); });
    return `<div class="card">${Object.entries(groups).map(([iso, evs]) => `
      <div class="card-head" style="margin-top:8px"><h3>${K.fmtDay(iso)} · ${K.fmtDate(iso)}</h3></div>
      <div class="rows">${evs.map(e => `
        <div class="row clickable" onclick="KOVA.V.eventModal('${e.id}')">
          <span class="wsdot" style="background:${K.wsColor(e.ws)}"></span>
          <div class="grow"><div class="title">${esc(e.title)}</div>
          <div class="meta"><span class="num">${fmtRange(e)}</span>${e.location ? `<span>${esc(e.location)}</span>` : ''}${e.prep ? '<span>has prep</span>' : ''}</div></div>
          <span class="badge gray">${e.kind}</span></div>`).join('')}</div>`).join('') || '<div class="empty">Nothing in the next 14 days.</div>'}</div>`;
  };
  V.eventModal = (id) => {
    const e = id ? K.S.events.find(x => x.id === id) : null;
    const wsOpts = K.S.workspaces.map(w => `<option value="${w.id}" ${e && e.ws === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
    const iso = e ? e.start.slice(0, 10) : K.todayISO();
    K.modal(`<h2>${e ? 'Edit event' : 'New event / focus block'}</h2>
      <label>Title</label><input id="ev-title" value="${esc(e ? e.title : '')}" placeholder="Focus block — underwriting">
      <div class="grid cols-3">
        <div><label>Date</label><input id="ev-date" type="date" value="${iso}"></div>
        <div><label>Start</label><input id="ev-start" type="time" value="${e ? new Date(e.start).toTimeString().slice(0, 5) : '09:00'}"></div>
        <div><label>End</label><input id="ev-end" type="time" value="${e ? new Date(e.end).toTimeString().slice(0, 5) : '10:00'}"></div>
      </div>
      <div class="grid cols-2">
        <div><label>Workspace</label><select id="ev-ws">${wsOpts}</select></div>
        <div><label>Kind</label><select id="ev-kind">${['meeting', 'focus', 'family', 'school', 'sport', 'health', 'travel', 'market', 'deadline'].map(kk => `<option ${e && e.kind === kk ? 'selected' : ''}>${kk}</option>`).join('')}</select></div>
      </div>
      <label>Preparation note</label><input id="ev-prep" value="${esc(e ? e.prep || '' : '')}" placeholder="What must be ready before this?">
      <div class="modal-foot">
        ${e ? `<button class="btn danger sm" onclick="KOVA.V.eventDelete('${e.id}')">Delete</button>` : ''}
        <span class="spacer"></span>
        <button class="btn" onclick="KOVA.closeModal()">Cancel</button>
        <button class="btn primary" onclick="KOVA.V.eventSave('${e ? e.id : ''}')">Save</button></div>`);
  };
  V.eventSave = (id) => {
    const g = (s) => K.$(s).value;
    const date = g('#ev-date'), st = g('#ev-start'), en = g('#ev-end');
    const mk = (tm) => new Date(date + 'T' + tm).toISOString();
    const data = { title: g('#ev-title').trim() || 'Untitled', ws: g('#ev-ws'), kind: g('#ev-kind'), start: mk(st), end: mk(en > st ? en : st), prep: g('#ev-prep').trim() || null };
    if (id) Object.assign(K.S.events.find(x => x.id === id), data);
    else K.S.events.push(Object.assign({ id: K.uid() }, data));
    K.closeModal(); K.refresh(); K.toast('Saved');
  };
  V.eventDelete = (id) => { K.S.events = K.S.events.filter(x => x.id !== id); K.closeModal(); K.refresh(); K.toast('Event removed'); };
  // Export upcoming events as iCalendar — open on iPhone/Mac to add to Apple Calendar.
  V.exportICS = () => {
    const evs = K.S.events.filter(e => K.daysUntil(e.start) >= -1 && K.daysUntil(e.start) <= 90)
      .sort((a, b) => a.start < b.start ? -1 : 1);
    const dt = (iso) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
    const escT = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//KOVA OS//Calendar//EN', 'CALSCALE:GREGORIAN', 'X-WR-CALNAME:KOVA OS'];
    evs.forEach(e => {
      lines.push('BEGIN:VEVENT',
        'UID:' + e.id + '@kova-os',
        'DTSTAMP:' + dt(new Date().toISOString()),
        'DTSTART:' + dt(e.start),
        'DTEND:' + dt(e.end),
        'SUMMARY:' + escT(e.title + (e.tentative ? ' (tentative)' : '')));
      if (e.location) lines.push('LOCATION:' + escT(e.location));
      if (e.prep) lines.push('DESCRIPTION:' + escT('Prep: ' + e.prep));
      lines.push('END:VEVENT');
    });
    lines.push('END:VCALENDAR');
    const blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'kova-calendar.ics'; a.click();
    URL.revokeObjectURL(a.href);
    K.toast(evs.length + ' events exported — open the file to add to Apple Calendar');
  };

  /* ═══════════════════════ TASKS ═══════════════════════ */
  let taskView = 'myday', taskWs = 'all';
  const TASK_VIEWS = [
    ['myday', 'My day'], ['next', 'Next actions'], ['upcoming', 'Upcoming'],
    ['waiting', 'Waiting'], ['delegated', 'Delegated'], ['someday', 'Someday'], ['all', 'All open'],
  ];
  K.reg({
    id: 'tasks', title: 'Tasks', icon: '☑', count: () => K.tasksDueToday().length,
    render() {
      const S = K.S;
      let list = S.tasks.filter(t => t.status !== 'done');
      if (taskView === 'myday') list = list.filter(t => t.status === 'open' && t.due && K.daysUntil(t.due) <= 0);
      else if (taskView === 'next') list = list.filter(t => t.status === 'open' && (t.nextAction || !t.due));
      else if (taskView === 'upcoming') list = list.filter(t => t.status === 'open' && t.due && K.daysUntil(t.due) > 0);
      else if (taskView === 'waiting') list = list.filter(t => t.status === 'waiting');
      else if (taskView === 'delegated') list = list.filter(t => t.status === 'delegated');
      else if (taskView === 'someday') list = list.filter(t => t.status === 'someday');
      else list = list.filter(t => t.status !== 'someday');
      if (taskWs !== 'all') list = list.filter(t => t.ws === taskWs);
      list = [...list].sort((a, b) => (a.due && b.due) ? (a.due < b.due ? -1 : 1) : (a.due ? -1 : 1));
      return `
      <div class="chiprow">
        ${TASK_VIEWS.map(([id, name]) => `<button class="chip ${taskView === id ? 'on' : ''}" onclick="KOVA.V.taskV('${id}')">${name}</button>`).join('')}
        <span class="spacer"></span>
        <select style="width:auto" onchange="KOVA.V.taskW(this.value)">
          <option value="all">All workspaces</option>
          ${S.workspaces.map(w => `<option value="${w.id}" ${taskWs === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('')}
        </select>
        <button class="btn sm primary" onclick="KOVA.V.taskModal()">＋ Task</button>
      </div>
      <div class="card pad-0"><div class="rows" style="padding:4px 14px">
        ${list.map(t => V.taskRow(t, true)).join('') || '<div class="empty">Empty view — nice.</div>'}
      </div></div>`;
    },
  });
  V.taskV = (v) => { taskView = v; K.render(); };
  V.taskW = (w) => { taskWs = w; K.render(); };
  V.taskRow = (t, full) => {
    const p = t.projectId ? K.proj(t.projectId) : null;
    return `<div class="row ${t.status === 'done' ? 'done' : ''}">
      <button class="check ${t.status === 'done' ? 'on' : ''}" onclick="KOVA.V.taskToggle('${t.id}')" aria-label="toggle task">✓</button>
      <div class="grow" ${full ? `style="cursor:pointer" onclick="KOVA.V.taskModal('${t.id}')"` : ''}>
        <div class="title">${esc(t.title)}</div>
        <div class="meta">
          <span>${K.wsChip(t.ws)}</span>
          ${p ? `<span>${esc(p.title.length > 30 ? p.title.slice(0, 30) + '…' : p.title)}</span>` : ''}
          ${t.status === 'waiting' || t.status === 'delegated' ? `<span>→ ${esc(t.delegatedTo || 'someone')}</span>` : ''}
          ${t.recurring ? `<span>↻ ${t.recurring}</span>` : ''}
          ${t.priority === 1 ? '<span style="color:var(--serious)">P1</span>' : ''}
        </div></div>
      ${K.dueBadge(t.due, t.status === 'done')}
    </div>`;
  };
  V.taskToggle = (id) => {
    const t = K.S.tasks.find(x => x.id === id); if (!t) return;
    if (t.status === 'done') { t.status = 'open'; t.completedAt = null; }
    else { t.status = 'done'; t.completedAt = new Date().toISOString(); K.logActivity('task', 'Done: ' + t.title); }
    K.refresh();
  };
  V.taskModal = (id) => {
    const t = id ? K.S.tasks.find(x => x.id === id) : null;
    const wsOpts = K.S.workspaces.map(w => `<option value="${w.id}" ${t && t.ws === w.id ? 'selected' : ''}>${esc(w.name)}</option>`).join('');
    const prOpts = ['<option value="">— no project —</option>'].concat(K.S.projects.map(p => `<option value="${p.id}" ${t && t.projectId === p.id ? 'selected' : ''}>${esc(p.title)}</option>`)).join('');
    K.modal(`<h2>${t ? 'Edit task' : 'New task'}</h2>
      <label>Title</label><input id="tk-title" value="${esc(t ? t.title : '')}" placeholder="Next physical action…">
      <div class="grid cols-2">
        <div><label>Workspace</label><select id="tk-ws">${wsOpts}</select></div>
        <div><label>Project</label><select id="tk-proj">${prOpts}</select></div>
        <div><label>Due</label><input id="tk-due" type="date" value="${t && t.due ? t.due.slice(0, 10) : ''}"></div>
        <div><label>Status</label><select id="tk-status">${['open', 'waiting', 'delegated', 'someday'].map(s => `<option ${t && t.status === s ? 'selected' : ''}>${s}</option>`).join('')}</select></div>
        <div><label>Priority</label><select id="tk-pri">${[1, 2, 3].map(p => `<option value="${p}" ${(t ? t.priority : 2) === p ? 'selected' : ''}>P${p}</option>`).join('')}</select></div>
        <div><label>Energy</label><select id="tk-energy">${['low', 'med', 'high'].map(e2 => `<option ${t && t.energy === e2 ? 'selected' : ''}>${e2}</option>`).join('')}</select></div>
      </div>
      <label>Waiting on / delegated to</label><input id="tk-who" value="${esc(t ? t.delegatedTo || '' : '')}" placeholder="Person or vendor (for waiting/delegated)">
      <div class="modal-foot">
        ${t ? `<button class="btn danger sm" onclick="KOVA.V.taskDelete('${t.id}')">Delete</button>` : ''}
        <span class="spacer"></span>
        <button class="btn" onclick="KOVA.closeModal()">Cancel</button>
        <button class="btn primary" onclick="KOVA.V.taskSave('${t ? t.id : ''}')">Save</button></div>`);
  };
  V.taskSave = (id) => {
    const g = (s) => K.$(s).value;
    const data = { title: g('#tk-title').trim() || 'Untitled', ws: g('#tk-ws'), projectId: g('#tk-proj') || null, due: g('#tk-due') || null, status: g('#tk-status'), priority: +g('#tk-pri'), energy: g('#tk-energy'), delegatedTo: g('#tk-who').trim() || null };
    if (id) Object.assign(K.S.tasks.find(x => x.id === id), data);
    else K.S.tasks.unshift(Object.assign({ id: K.uid(), estimateMin: 30, source: 'manual', nextAction: true, context: '' }, data));
    K.closeModal(); K.refresh(); K.toast('Task saved');
  };
  V.taskDelete = (id) => { K.S.tasks = K.S.tasks.filter(x => x.id !== id); K.closeModal(); K.refresh(); K.toast('Task deleted'); };

  /* ═══════════════════════ PROJECTS ═══════════════════════ */
  K.reg({
    id: 'projects', title: 'Projects', icon: '▣',
    render(param) {
      if (param) return V.projectDetail(param);
      const S = K.S;
      const groups = {};
      S.projects.forEach(p => { (groups[p.program || 'Other'] = groups[p.program || 'Other'] || []).push(p); });
      return `<div class="grid cols-2">${S.projects.map(p => {
        const ms = p.milestones || []; const msDone = ms.filter(m => m.done).length;
        const open = S.tasks.filter(t => t.projectId === p.id && t.status !== 'done').length;
        return `<div class="card" style="cursor:pointer" onclick="KOVA.nav('#/projects/${p.id}')">
          <div style="display:flex;gap:8px;align-items:start">
            <div class="grow">
              <div style="font-weight:650">${esc(p.title)}</div>
              <div class="meta" style="margin-top:2px"><span>${K.wsChip(p.ws)}</span>${p.status === 'someday' ? '<span class="badge gray">someday</span>' : ''}</div>
            </div>${K.healthBadge(p.health)}</div>
          <div class="small muted" style="margin:8px 0 4px">${msDone}/${ms.length} milestones · ${open} open tasks · target ${K.fmtDate(p.target)}</div>
          <div class="bar"><i style="width:${ms.length ? Math.round(msDone / ms.length * 100) : 0}%;background:${K.wsColor(p.ws)}"></i></div>
          <div class="small" style="margin-top:8px;color:var(--ink-2)">Next: ${esc(p.nextAction || '—')}</div>
        </div>`;
      }).join('')}</div>
      <div class="small muted section-gap">Every project connects upward to a goal and downward to next actions (§1.3). Click any card for milestones, risks and linked work.</div>`;
    },
  });
  V.projectDetail = (id) => {
    const S = K.S;
    const p = K.proj(id); if (!p) return '<div class="empty">Project not found.</div>';
    const tasks = S.tasks.filter(t => t.projectId === id && t.status !== 'done');
    const done = S.tasks.filter(t => t.projectId === id && t.status === 'done');
    const goal = p.goal ? S.goals.find(g => g.id === p.goal) : null;
    const decs = S.decisions.filter(dd => dd.ws === p.ws);
    return `<button class="detail-back" onclick="KOVA.nav('#/projects')">← All projects</button>
    <div class="two-col">
      <div>
        <div class="card">
          <div style="display:flex;gap:8px;align-items:start">
            <div class="grow"><h2 style="font-size:18px">${esc(p.title)}</h2>
            <div class="meta" style="margin-top:4px"><span>${K.wsChip(p.ws)}</span><span>${esc(p.program || '')}</span><span>owner ${esc(p.owner)}</span><span>target ${K.fmtDate(p.target)}</span></div></div>
            ${K.healthBadge(p.health)}</div>
          <p style="color:var(--ink-2);font-size:13.5px">${esc(p.objective)}</p>
          ${goal ? `<div class="callout">↑ Serves goal: <b>${esc(goal.title)}</b> (${esc(goal.area)})</div>` : '<div class="callout warn">⚠ Not linked to a goal — connect strategy to execution (§19.2)</div>'}
        </div>
        <div class="card section-gap">
          <div class="card-head"><h3>Milestones</h3></div>
          <div class="rows">${(p.milestones || []).map((m, i) => `
            <div class="row ${m.done ? 'done' : ''}">
              <button class="check ${m.done ? 'on' : ''}" onclick="KOVA.V.msToggle('${p.id}',${i})">✓</button>
              <div class="grow"><div class="title">${esc(m.title)}</div></div>${K.dueBadge(m.due, m.done)}</div>`).join('')}</div>
        </div>
        <div class="card section-gap">
          <div class="card-head"><h3>Open tasks (${tasks.length})</h3><button class="link" onclick="KOVA.V.taskModal()">+ task</button></div>
          <div class="rows">${tasks.map(t => V.taskRow(t, true)).join('') || '<div class="empty">No open tasks — define the next action.</div>'}</div>
          ${done.length ? `<div class="small muted" style="margin-top:8px">${done.length} completed</div>` : ''}
        </div>
      </div>
      <div>
        <div class="card"><div class="card-head"><h3>Next action</h3></div>
          <div style="font-size:13.5px">${esc(p.nextAction || '—')}</div></div>
        <div class="card section-gap"><div class="card-head"><h3>Risks</h3></div>
          <div class="rows">${(p.risks || []).map(r => `<div class="row"><span class="dot" style="background:var(--warn)"></span><div class="grow"><div class="title" style="font-size:13px">${esc(r)}</div></div></div>`).join('') || '<div class="empty">No open risks.</div>'}</div></div>
        <div class="card section-gap"><div class="card-head"><h3>Related decisions</h3><button class="link" onclick="KOVA.nav('#/goals/decision')">+ record</button></div>
          <div class="rows">${decs.slice(0, 3).map(dd => `<div class="row"><div class="grow"><div class="title" style="font-size:13px">${esc(dd.q)}</div><div class="meta">${esc(dd.decision)} · review ${K.fmtDate(dd.reviewDate)}</div></div></div>`).join('') || '<div class="empty">None linked.</div>'}</div></div>
      </div>
    </div>`;
  };
  V.msToggle = (pid, i) => { const p = K.proj(pid); if (p && p.milestones[i]) p.milestones[i].done = !p.milestones[i].done; K.refresh(); };
})();
