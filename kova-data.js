/* ============================================================================
   HQ — seed / demo data
   ----------------------------------------------------------------------------
   Everything in this file is REPRESENTATIVE DEMO DATA. No live accounts are
   connected. Real data lives only in your browser's localStorage once you
   start editing — nothing is sent to a server.

   KOVA_SEED() returns a complete app state (fn name is a historic internal). All dates are generated relative
   to "now" so the demo always looks current. Replace or edit objects freely —
   the app treats this only as the first-run template (Settings → Data →
   "Reset to demo data" re-applies it).

   Schema overview (collections on the state object):
     settings      app + AI gateway + integration configuration
     workspaces    the 9 workspaces from the framework §36.1
     goals         life-area goals (§19)
     projects      projects incl. the initial programs (§36.2)
     tasks         next actions across workspaces (§9)
     events        unified calendar (§8)
     messages      universal inbox items (§7)
     entities      business portfolio: Holdings / Living / Stays / TRIBE (§10)
     properties    owned real estate w/ operations (§11.5)
     opportunities acquisition pipeline w/ buy-box + underwriting (§11.1-11.3)
     accounts      financial accounts (§12)
     nwHistory     12-month net-worth trend
     positions     investment positions + option overlays (§13)
     obligations   bills, renewals, compliance (§12.4)
     agents        AI agent registry (§14)
     agentRuns     run log
     approvals     approval queue (§22.3)
     notifications exception-driven alerts (§22)
     contacts      relationship management (§20)
     documents     document hub (§18)
     decisions     decision journal (§19.4)
     health        daily log + training plan (§16)
     trips         travel pipeline (§17)
     reviews       dated review records (§19.3)
     knowledge     SOPs / notes (§18.3)
     today         today's outcomes + shutdown state (§6)
   ========================================================================== */
'use strict';

function KOVA_SEED() {
  const now = new Date();
  // d(dayOffset, hour, minute) → ISO string relative to today, local time.
  const d = (days, h = 9, m = 0) => {
    const t = new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);
    return t.toISOString();
  };
  const day = (days) => d(days, 12, 0).slice(0, 10); // date-only (noon avoids TZ edges)

  /* ---- workspaces (§36.1) — color = categorical slot index 0..7 ---------- */
  const workspaces = [
    { id: 'ws_personal', name: 'Personal',        color: 0, icon: '◇' },
    { id: 'ws_family',   name: 'Family',          color: 2, icon: '⌂' },
    { id: 'ws_holdings', name: 'Kova Holdings',   color: 6, icon: '◈' },
    { id: 'ws_living',   name: 'Kova Living',     color: 4, icon: '▤' },
    { id: 'ws_stays',    name: 'Kova Stays',      color: 5, icon: '⌘' },
    { id: 'ws_tribe',    name: 'TRIBE',           color: 3, icon: '▲' },
    { id: 'ws_re',       name: 'Real Estate',     color: 1, icon: '⌗' },
    { id: 'ws_invest',   name: 'Investments',     color: 7, icon: '∿' },
    { id: 'ws_special',  name: 'Special Projects',color: 0, icon: '✦' },
  ];

  /* ---- goals (§19.1) ------------------------------------------------------ */
  const goals = [
    { id: 'g_re',      area: 'Wealth & Investments', title: 'Build a durable real-estate portfolio', metric: 'Doors owned', baseline: 5, target: 20, current: 5, horizon: '2028', status: 'on_track', confidence: 0.7, ws: 'ws_re' },
    { id: 'g_multi',   area: 'Wealth & Investments', title: 'Acquire first scalable multifamily asset', metric: 'Assets closed', baseline: 0, target: 1, current: 0, horizon: 'Q4 ' + now.getFullYear(), status: 'at_risk', confidence: 0.55, ws: 'ws_re' },
    { id: 'g_kova',    area: 'Business & Creation',  title: 'Launch the Kova Group operating platform', metric: 'Core systems live', baseline: 0, target: 6, current: 3, horizon: 'Q1 ' + (now.getFullYear() + 1), status: 'on_track', confidence: 0.75, ws: 'ws_holdings' },
    { id: 'g_tribe',   area: 'Business & Creation',  title: 'Take TRIBE to first $50k revenue month', metric: 'Monthly revenue', baseline: 0, target: 50000, current: 18400, horizon: 'Q2 ' + (now.getFullYear() + 1), status: 'on_track', confidence: 0.6, ws: 'ws_tribe' },
    { id: 'g_kylen',   area: 'Family & Relationships', title: "Support Kylen's soccer development", metric: 'Pathway decision made', baseline: 0, target: 1, current: 0, horizon: 'Aug ' + now.getFullYear(), status: 'needs_decision', confidence: 0.8, ws: 'ws_family' },
    { id: 'g_family',  area: 'Family & Relationships', title: 'Protect 2 family evenings + 1 full family day weekly', metric: 'Weeks hit', baseline: 0, target: 52, current: 21, horizon: 'Ongoing', status: 'on_track', confidence: 0.85, ws: 'ws_family' },
    { id: 'g_health',  area: 'Health & Energy',      title: 'Longevity base: 4 training sessions + 7h sleep avg', metric: 'Weeks compliant', baseline: 0, target: 40, current: 17, horizon: now.getFullYear(), status: 'on_track', confidence: 0.7, ws: 'ws_personal' },
    { id: 'g_german',  area: 'Adventure & Experiences', title: 'Complete German citizenship process', metric: 'Stages complete', baseline: 0, target: 7, current: 3, horizon: (now.getFullYear() + 1), status: 'on_track', confidence: 0.65, ws: 'ws_special' },
    { id: 'g_ai',      area: 'Learning & Growth',    title: 'Stand up local AI infrastructure for private workflows', metric: 'Agents in production', baseline: 0, target: 6, current: 0, horizon: 'Q4 ' + now.getFullYear(), status: 'on_track', confidence: 0.7, ws: 'ws_special' },
    { id: 'g_legacy',  area: 'Contribution & Legacy', title: 'Document family knowledge + estate basics', metric: 'Core docs complete', baseline: 0, target: 10, current: 2, horizon: (now.getFullYear() + 1), status: 'no_activity', confidence: 0.5, ws: 'ws_family' },
  ];

  /* ---- projects incl. initial programs (§36.2) --------------------------- */
  const projects = [
    { id: 'p_kovaops', ws: 'ws_holdings', program: 'Kova Group launch', title: 'Kova Group operating platform', objective: 'Entity structure, banking, PM software, and reporting spine for all Kova companies.', owner: 'Aaron', status: 'active', priority: 1, health: 'amber', target: day(75), goal: 'g_kova',
      milestones: [
        { title: 'Entity + banking structure finalized', due: day(-20), done: true },
        { title: 'Property-management software selected', due: day(10), done: false },
        { title: 'Chart of accounts + monthly close process', due: day(40), done: false },
        { title: 'Consolidated reporting live', due: day(70), done: false }],
      risks: ['PM software decision slipping — blocks Living onboarding'], nextAction: 'Score Buildium vs AppFolio demo notes and decide', },
    { id: 'p_azpipe', ws: 'ws_re', program: 'Real estate acquisition platform', title: 'Arizona acquisition pipeline (Sedona / Mesa / Gilbert)', objective: 'Systematic sourcing and underwriting to close the first scalable multifamily asset.', owner: 'Aaron', status: 'active', priority: 1, health: 'green', target: day(120), goal: 'g_multi',
      milestones: [
        { title: 'Buy-box criteria locked', due: day(-35), done: true },
        { title: '10 opportunities underwritten', due: day(15), done: false },
        { title: 'First offer submitted', due: day(-4), done: true },
        { title: 'Asset under contract', due: day(60), done: false }],
      risks: ['Insurance quotes running 20% above underwriting assumption'], nextAction: 'Review Mesa 8-plex inspection report', },
    { id: 'p_tribe', ws: 'ws_tribe', program: 'TRIBE brand launch', title: 'TRIBE product & launch program', objective: 'First collection produced, Shopify live, launch campaign executed.', owner: 'Aaron', status: 'active', priority: 2, health: 'amber', target: day(55), goal: 'g_tribe',
      milestones: [
        { title: 'Brand system + asset library', due: day(-50), done: true },
        { title: 'Sample round 2 approved', due: day(5), done: false },
        { title: 'Production PO placed', due: day(20), done: false },
        { title: 'Launch campaign live', due: day(50), done: false }],
      risks: ['Supplier lead time quoted 45d vs 30d planned', 'Content calendar unstaffed'], nextAction: 'Approve or reject sample round 2 fit changes', },
    { id: 'p_gilbert', ws: 'ws_re', program: 'Gilbert property strategy', title: 'Gilbert property strategy', objective: 'Decide hold / develop / sell for the Gilbert parcel; model seller-financing scenarios.', owner: 'Aaron', status: 'active', priority: 2, health: 'green', target: day(30), goal: 'g_re',
      milestones: [
        { title: 'Comp + zoning review', due: day(-10), done: true },
        { title: 'Scenario model (hold/develop/sell)', due: day(12), done: false },
        { title: 'Decision recorded', due: day(25), done: false }],
      risks: [], nextAction: 'Build seller-financing scenario in Finance → Scenarios', },
    { id: 'p_localai', ws: 'ws_special', program: 'Local AI infrastructure', title: 'Local AI infrastructure', objective: 'Private local model serving HQ agents: hardware, Ollama, n8n bridge, agent rollout.', owner: 'Aaron', status: 'active', priority: 2, health: 'green', target: day(45), goal: 'g_ai',
      milestones: [
        { title: 'Hardware spec + order', due: day(-8), done: true },
        { title: 'Ollama serving on local network', due: day(14), done: false },
        { title: 'HQ connected (Settings → AI Gateway)', due: day(16), done: false },
        { title: 'First 3 agents live with approval gates', due: day(35), done: false }],
      risks: [], nextAction: 'Install Ollama + pull llama3.1:8b when the machine arrives', },
    { id: 'p_german', ws: 'ws_special', program: 'German citizenship', title: 'German citizenship program', objective: 'Documentation, application, and appointments through to naturalization certificate.', owner: 'Aaron', status: 'active', priority: 3, health: 'amber', target: day(300), goal: 'g_german',
      milestones: [
        { title: 'Eligibility path confirmed with attorney', due: day(-60), done: true },
        { title: 'Document collection (birth/marriage/records)', due: day(20), done: false },
        { title: 'Application submitted', due: day(90), done: false }],
      risks: ['Apostilled records request pending 3+ weeks'], nextAction: 'Chase apostille service for AZ records', },
    { id: 'p_nz', ws: 'ws_special', program: 'New Zealand optionality', title: 'New Zealand optionality research', objective: 'Understand visa pathways, cost, schooling; keep the option warm without commitment.', owner: 'Aaron', status: 'someday', priority: 4, health: 'gray', target: day(180), goal: null,
      milestones: [{ title: 'Visa pathway memo', due: day(120), done: false }], risks: [], nextAction: 'Read investor-visa policy update', },
    { id: 'p_kylen', ws: 'ws_family', program: 'Kylen soccer development', title: 'Kylen development pathway (MLS Next vs ECNL)', objective: 'Choose the best development pathway and club for next season.', owner: 'Aaron', status: 'active', priority: 1, health: 'amber', target: day(21), goal: 'g_kylen',
      milestones: [
        { title: 'Shortlist clubs + costs', due: day(-14), done: true },
        { title: 'Tryouts / club conversations', due: day(10), done: false },
        { title: 'Family decision recorded', due: day(18), done: false }],
      risks: ['Tryout dates conflict with Sedona trip'], nextAction: 'Confirm Phoenix Rising tryout slot', },
    { id: 'p_travel', ws: 'ws_family', program: 'Family travel & experiences', title: 'Family travel & experiences ' + now.getFullYear(), objective: 'Two meaningful family trips planned and booked; traditions calendar maintained.', owner: 'Aaron', status: 'active', priority: 3, health: 'green', target: day(90), goal: 'g_family',
      milestones: [{ title: 'Summer trip booked', due: day(30), done: false }], risks: [], nextAction: 'Pick dates for the coast trip', },
    { id: 'p_health', ws: 'ws_personal', program: 'Personal longevity & performance', title: 'Longevity & performance system', objective: 'Consistent training base, sleep ≥7h, labs + preventative care current.', owner: 'Aaron', status: 'active', priority: 2, health: 'green', target: day(160), goal: 'g_health',
      milestones: [
        { title: 'Annual labs + physical booked', due: day(9), done: false },
        { title: '12-week strength block complete', due: day(56), done: false }],
      risks: [], nextAction: 'Book annual physical', },
  ];

  /* ---- tasks (§9) --------------------------------------------------------- */
  let tn = 0; const T = (o) => Object.assign({ id: 't' + (++tn), status: 'open', priority: 2, energy: 'med', estimateMin: 30, nextAction: false, source: 'seed', context: '' }, o);
  const tasks = [
    // today / overdue
    T({ title: 'Score PM software demos and decide (Buildium vs AppFolio)', ws: 'ws_holdings', projectId: 'p_kovaops', due: day(0), priority: 1, energy: 'high', estimateMin: 60, nextAction: true }),
    T({ title: 'Review Mesa 8-plex inspection report', ws: 'ws_re', projectId: 'p_azpipe', due: day(0), priority: 1, energy: 'high', estimateMin: 45, nextAction: true }),
    T({ title: 'Approve TRIBE sample round 2 fit changes', ws: 'ws_tribe', projectId: 'p_tribe', due: day(0), priority: 1, estimateMin: 30, nextAction: true }),
    T({ title: 'Confirm Phoenix Rising tryout slot for Kylen', ws: 'ws_family', projectId: 'p_kylen', due: day(-1), priority: 1, estimateMin: 10, nextAction: true }),
    T({ title: 'Wire earnest money — Mesa 8-plex ($15k)', ws: 'ws_re', projectId: 'p_azpipe', due: day(1), priority: 1, estimateMin: 15 }),
    T({ title: 'Chase apostille service for AZ records', ws: 'ws_special', projectId: 'p_german', due: day(-3), priority: 2, estimateMin: 15 }),
    T({ title: 'Book annual physical + labs', ws: 'ws_personal', projectId: 'p_health', due: day(2), priority: 2, estimateMin: 10 }),
    T({ title: 'Renew umbrella insurance policy', ws: 'ws_personal', due: day(4), priority: 2, estimateMin: 20 }),
    T({ title: 'Reply to Sedona STR permit renewal notice', ws: 'ws_stays', due: day(1), priority: 1, estimateMin: 20 }),
    // upcoming
    T({ title: 'Draft TRIBE launch content calendar (weeks 1–4)', ws: 'ws_tribe', projectId: 'p_tribe', due: day(6), estimateMin: 90, energy: 'high' }),
    T({ title: 'Interview second property manager candidate', ws: 'ws_living', due: day(7), estimateMin: 45 }),
    T({ title: 'Build Gilbert hold/develop/sell scenario model', ws: 'ws_re', projectId: 'p_gilbert', due: day(9), estimateMin: 120, energy: 'high' }),
    T({ title: 'Quarterly estimated tax payment', ws: 'ws_personal', due: day(26), priority: 1, estimateMin: 30 }),
    T({ title: 'Set up Ollama + pull llama3.1:8b on AI machine', ws: 'ws_special', projectId: 'p_localai', due: day(14), estimateMin: 90, energy: 'high' }),
    T({ title: 'Connect HQ to local model (Settings → AI Gateway)', ws: 'ws_special', projectId: 'p_localai', due: day(16), estimateMin: 20 }),
    T({ title: 'Collect 3 insurance quotes for Mesa 8-plex', ws: 'ws_re', projectId: 'p_azpipe', due: day(5), priority: 1, estimateMin: 45 }),
    T({ title: 'Review Kova Living June owner statements', ws: 'ws_living', due: day(8), estimateMin: 30 }),
    T({ title: 'Plan family coast trip — pick dates', ws: 'ws_family', projectId: 'p_travel', due: day(12), estimateMin: 30, energy: 'low' }),
    // waiting / delegated
    T({ title: 'Lender term sheet for Mesa 8-plex', ws: 'ws_re', projectId: 'p_azpipe', due: day(3), status: 'waiting', delegatedTo: 'Dana Ruiz (Summit Capital)' }),
    T({ title: 'Sample round 2 shipment from supplier', ws: 'ws_tribe', projectId: 'p_tribe', due: day(2), status: 'waiting', delegatedTo: 'Avero Apparel Co.' }),
    T({ title: 'Sedona hot-tub repair', ws: 'ws_stays', due: day(2), status: 'delegated', delegatedTo: 'Red Rock Spa Services' }),
    T({ title: 'Apostilled birth records', ws: 'ws_special', projectId: 'p_german', due: day(10), status: 'waiting', delegatedTo: 'Apostille service' }),
    // recurring / someday
    T({ title: 'Weekly review', ws: 'ws_personal', due: day((7 - now.getDay()) % 7 || 7), recurring: 'weekly', estimateMin: 45 }),
    T({ title: 'Reconcile business credit cards', ws: 'ws_holdings', due: day(11), recurring: 'monthly', estimateMin: 30 }),
    T({ title: 'Research NZ investor-visa policy update', ws: 'ws_special', projectId: 'p_nz', status: 'someday', energy: 'low' }),
    T({ title: 'Estate: draft letter of instruction', ws: 'ws_family', status: 'someday', energy: 'high' }),
    // done today (for shutdown/receipts)
    T({ title: 'Send updated rent roll to lender', ws: 'ws_re', projectId: 'p_azpipe', due: day(0), status: 'done', completedAt: d(0, 8, 40) }),
    T({ title: 'Morning training — Zone 2 (45 min)', ws: 'ws_personal', projectId: 'p_health', due: day(0), status: 'done', completedAt: d(0, 6, 45), recurring: 'weekly' }),
  ];

  /* ---- events (§8) — includes one deliberate conflict --------------------- */
  let en = 0; const E = (o) => Object.assign({ id: 'e' + (++en), kind: 'meeting', ws: 'ws_personal' }, o);
  const events = [
    E({ title: 'Lender call — Mesa 8-plex terms', ws: 'ws_re', kind: 'meeting', start: d(0, 10, 0), end: d(0, 10, 45), prep: 'Review term sheet vs underwriting: rate, IO period, recourse.', contact: 'c_dana', projectId: 'p_azpipe' }),
    E({ title: 'Focus block — PM software decision', ws: 'ws_holdings', kind: 'focus', start: d(0, 11, 0), end: d(0, 12, 30), projectId: 'p_kovaops' }),
    E({ title: 'TRIBE supplier sync (sample round 2)', ws: 'ws_tribe', kind: 'meeting', start: d(0, 13, 0), end: d(0, 13, 30), prep: 'Fit notes from round 1; decide collar change.', projectId: 'p_tribe' }),
    E({ title: 'Kylen soccer practice (drop-off)', ws: 'ws_family', kind: 'sport', start: d(0, 16, 30), end: d(0, 18, 0), location: 'Reach 11 Sports Complex' }),
    E({ title: 'Broker call — Sedona duplex', ws: 'ws_re', kind: 'meeting', start: d(0, 16, 45), end: d(0, 17, 15), prep: 'Ask: seller motivation, STR permit transferability.', contact: 'c_marcus' }), // conflicts with practice
    E({ title: 'Family dinner (protected)', ws: 'ws_family', kind: 'family', start: d(0, 18, 30), end: d(0, 19, 30) }),
    E({ title: 'Strength — lower body', ws: 'ws_personal', kind: 'health', start: d(1, 6, 15), end: d(1, 7, 15) }),
    E({ title: 'Mesa 8-plex — inspection walkthrough', ws: 'ws_re', kind: 'meeting', start: d(1, 9, 30), end: d(1, 11, 0), location: 'Mesa, AZ', projectId: 'p_azpipe' }),
    E({ title: 'School early release — pickup', ws: 'ws_family', kind: 'school', start: d(1, 13, 45), end: d(1, 14, 15) }),
    E({ title: 'Options expiry — NVDA covered calls', ws: 'ws_invest', kind: 'market', start: d(4, 13, 0), end: d(4, 13, 5) }),
    E({ title: 'Kylen — Phoenix Rising tryout (tentative)', ws: 'ws_family', kind: 'sport', start: d(6, 17, 0), end: d(6, 19, 0), location: 'Phoenix' }),
    E({ title: 'Weekly review', ws: 'ws_personal', kind: 'focus', start: d(((7 - now.getDay()) % 7 || 7), 16, 0), end: d(((7 - now.getDay()) % 7 || 7), 17, 0) }),
    E({ title: 'Sedona STR permit renewal deadline', ws: 'ws_stays', kind: 'deadline', start: d(8, 17, 0), end: d(8, 17, 5) }),
    E({ title: 'Annual physical (to book)', ws: 'ws_personal', kind: 'health', start: d(9, 8, 0), end: d(9, 9, 0), tentative: true }),
  ];

  /* ---- universal inbox (§7) ----------------------------------------------- */
  let mn = 0; const M = (o) => Object.assign({ id: 'm' + (++mn), done: false, triage: null, importance: 2 }, o);
  const messages = [
    M({ source: 'gmail', from: 'Dana Ruiz — Summit Capital', subject: 'Mesa 8-plex — revised term sheet attached', preview: '6.85% fixed 5yr, 30am, 70% LTV, 1.25 DSCR floor. IO year possible if…', received: d(0, 7, 58), importance: 1, triage: 'decision', aiSummary: 'Revised terms: 6.85%/5yr/70LTV. Needs decision before wiring earnest money.' }),
    M({ source: 'gmail', from: 'Marcus Hale — Red Rock Realty', subject: 'Off-market Sedona duplex — STR permitted', preview: 'Seller open to 5.5% seller carry. $819k. Both units turnkey, permits transfer…', received: d(0, 6, 40), importance: 1, triage: 'reply' }),
    M({ source: 'pm', from: 'Kova Stays — Casa Sedona', subject: 'Guest issue: hot tub not heating (5-night stay)', preview: 'Guest reports hot tub at 82°F. Vendor dispatched, ETA tomorrow 10am. Comp suggested…', received: d(0, 6, 5), importance: 1, triage: 'decision' }),
    M({ source: 'gmail', from: 'Avero Apparel Co.', subject: 'Sample round 2 shipped — tracking inside', preview: 'DHL 4629…, arriving in 2 days. Note: collar spec change adds $0.42/unit at volume…', received: d(-1, 18, 20), triage: 'read' }),
    M({ source: 'sms', from: 'Coach Rivera', subject: 'Tryout slot Thursday 5pm — confirm by tomorrow', preview: 'We can hold a spot for Kylen at Thursday 5pm. Need confirmation by EOD tomorrow.', received: d(0, 8, 12), importance: 1, triage: 'reply' }),
    M({ source: 'finance', from: 'Brokerage alerts', subject: 'NVDA within 3% of $142 covered-call strike', preview: 'NVDA 138.20 (+2.1%). 4 contracts expire Friday. Assignment would free $56,800…', received: d(0, 7, 30), importance: 1, triage: 'decision' }),
    M({ source: 'gmail', from: 'City of Sedona — Licensing', subject: 'STR permit renewal due', preview: 'Permit #ST-2214 renewal window closes in 8 days. Renew online or by mail…', received: d(-2, 9, 0), importance: 1, triage: 'task' }),
    M({ source: 'slack', from: '#kova-living · Priya', subject: 'Owner statement question — unit 3 charge', preview: 'Owner at 4th St fourplex asking about the $840 plumbing line item on June statement…', received: d(0, 8, 45), triage: 'reply' }),
    M({ source: 'gmail', from: 'Apostille Services LLC', subject: 'Order update: records in state review', preview: 'Your AZ records order is at the Secretary of State step, est. 7–10 business days…', received: d(-1, 15, 0), triage: 'waiting' }),
    M({ source: 'gmail', from: 'Shopify', subject: 'TRIBE store: payout + weekend summary', preview: 'Payout $2,412 scheduled. 61 orders this weekend, conversion 2.8%…', received: d(0, 5, 30), triage: 'read' }),
    M({ source: 'agent', from: 'Agent — Bill & renewal monitor', subject: 'Umbrella policy renews in 4 days (+12% premium)', preview: 'Premium increased $214 → $239/mo. Two comparable quotes prepared for review…', received: d(0, 5, 0), triage: 'decision' }),
    M({ source: 'gmail', from: 'School office', subject: 'Early release Thursday — pickup at 1:45', preview: 'Reminder: early release this Thursday. Pickup begins 1:45pm at the north loop…', received: d(-1, 12, 0), triage: 'task' }),
    M({ source: 'gmail', from: 'Newsletter — AZ Multifamily Digest', subject: 'East Valley cap rates ticked up 20bps', preview: 'Q2 survey shows East Valley small multifamily trading at 5.9% average cap…', received: d(-2, 7, 0), importance: 3, triage: 'read' }),
  ];

  /* ---- business portfolio (§10) ------------------------------------------- */
  const entities = [
    { id: 'ent_holdings', ws: 'ws_holdings', name: 'Kova Holdings', type: 'Holding company', stage: 'Operating', ownership: '100%', purpose: 'Parent entity: treasury, capital allocation, shared services, compliance.',
      cash: 148200, revenueMTD: 0, revTrend: [0,0,0,0,0,0], health: 'green',
      metrics: [ ['Cash', '$148.2k'], ['Reserves target', '$120k'], ['Entities current', '4 / 4'], ['Insurance policies', '6 active'] ],
      priorities: ['Finish operating platform (PM software, reporting)', 'Capital plan for Mesa 8-plex close'],
      risks: ['Consolidated reporting still manual'],
      compliance: [ { item: 'AZ annual report — Kova Holdings LLC', due: day(41) }, { item: 'Registered agent renewal', due: day(75) } ] },
    { id: 'ent_living', ws: 'ws_living', name: 'Kova Living', type: 'Long-term rental management', stage: 'Early operating', ownership: '100%', purpose: 'LTR property management: leasing, maintenance, owner reporting.',
      cash: 22600, revenueMTD: 7400, revTrend: [4.1, 4.8, 5.2, 6.1, 6.8, 7.4], health: 'green',
      metrics: [ ['Units under mgmt', '11'], ['Occupancy', '92%'], ['Open work orders', '3'], ['Avg days-to-lease', '16'] ],
      priorities: ['Onboard PM software', 'Hire second property manager'],
      risks: ['Key-person dependency on Priya'],
      compliance: [ { item: 'AZ broker license renewal', due: day(112) } ] },
    { id: 'ent_stays', ws: 'ws_stays', name: 'Kova Stays', type: 'Short-term rentals', stage: 'Operating', ownership: '100%', purpose: 'STR portfolio operations: pricing, guest experience, permits.',
      cash: 31900, revenueMTD: 12800, revTrend: [9.2, 11.5, 14.1, 13.2, 11.9, 12.8], health: 'amber',
      metrics: [ ['Active listings', '3'], ['Occupancy (30d)', '81%'], ['ADR', '$342'], ['Guest rating', '4.91'] ],
      priorities: ['Renew Sedona permit', 'Resolve hot-tub incident + comp decision'],
      risks: ['Sedona regulatory tightening — monitor council agenda'],
      compliance: [ { item: 'Sedona STR permit #ST-2214', due: day(8) }, { item: 'TPT filing (AZ)', due: day(17) } ] },
    { id: 'ent_tribe', ws: 'ws_tribe', name: 'TRIBE', type: 'Consumer brand (apparel)', stage: 'Pre-launch', ownership: '100%', purpose: 'Apparel brand: first collection, Shopify channel, community launch.',
      cash: 18400, revenueMTD: 2400, revTrend: [0, 0, 0.4, 1.1, 1.8, 2.4], health: 'amber',
      metrics: [ ['Launch runway', '~5 months'], ['SKUs in dev', '8'], ['Email list', '2,340'], ['Pre-orders', '$2.4k MTD'] ],
      priorities: ['Approve sample round 2', 'Lock production PO', 'Staff content calendar'],
      risks: ['Supplier lead time 45d vs 30d planned', 'Single-supplier dependency'],
      compliance: [ { item: 'Trademark office action response', due: day(33) } ] },
  ];

  /* ---- owned properties (§11.5) ------------------------------------------- */
  const properties = [
    { id: 'prop_sedona', name: 'Casa Sedona (STR)', address: '48 Juniper Trail, Sedona AZ', entity: 'ent_stays', ws: 'ws_stays', strategy: 'Short-term rental', units: 1, acquired: '2024-05-10', basis: 742000, valuation: 815000, debt: 512000, rate: 6.375, occupancy: 0.81, rentMo: 11200, expensesMo: 4300, dscr: 1.71,
      workOrders: [ { title: 'Hot tub heater — guest impacted', status: 'vendor dispatched', vendor: 'Red Rock Spa Services', ageDays: 1, priority: 'high' }, { title: 'Patio lights replacement', status: 'scheduled', vendor: 'Handy AZ', ageDays: 6, priority: 'low' } ],
      renewals: [ { item: 'STR permit #ST-2214', due: day(8) }, { item: 'Property insurance', due: day(64) } ],
      alerts: ['Permit renewal inside 10 days', 'Guest comp decision pending'] },
    { id: 'prop_mesa4', name: '4th St Fourplex (LTR)', address: '212 E 4th St, Mesa AZ', entity: 'ent_living', ws: 'ws_living', strategy: 'Long-term rental', units: 4, acquired: '2023-11-01', basis: 968000, valuation: 1040000, debt: 676000, rate: 7.125, occupancy: 1.0, rentMo: 7480, expensesMo: 2810, dscr: 1.29,
      workOrders: [ { title: 'Unit 3 — plumbing follow-up', status: 'completed, owner Q pending', vendor: 'BlueLine Plumbing', ageDays: 4, priority: 'med' } ],
      renewals: [ { item: 'Landlord policy', due: day(122) }, { item: 'Unit 2 lease renewal', due: day(37) } ],
      alerts: [] },
  ];

  /* ---- acquisition pipeline (§11.1–11.3) ----------------------------------
     uw fields feed the live underwriting calculator in the Real Estate screen. */
  const opportunities = [
    { id: 'opp_mesa8', name: 'Mesa 8-plex — Country Club Dr', market: 'Mesa, AZ', stage: 'Diligence', source: 'Broker (Dana intro)', asking: 1450000, units: 8, strategy: 'LTR value-add', prob: 0.65, deadline: day(12), nextAction: 'Review inspection report; insurance quotes ×3',
      uw: { price: 1450000, downPct: 30, ratePct: 6.85, termYrs: 30, closingPct: 2.0, rehab: 60000, rentMo: 12400, otherIncMo: 350, vacancyPct: 7, opexPct: 12, taxesYr: 9800, insYr: 8400, mgmtPct: 8, exitCapPct: 6.0, rentGrowthPct: 3.0 },
      score: { yieldOnCost: 7, irr: 7, dscr: 6, fit: 9, submarket: 8, revenue: 7, regulatory: 9, insurance: 5, complexity: 7, exit: 8 },
      risks: ['Insurance quotes 20% over assumption', 'Two units on month-to-month'], notes: 'Seller retiring; below-market rents ~9%.' },
    { id: 'opp_sedona2', name: 'Sedona duplex — off-market', market: 'Sedona, AZ', stage: 'Underwriting', source: 'Marcus Hale (off-market)', asking: 819000, units: 2, strategy: 'STR', prob: 0.35, deadline: day(6), nextAction: 'Model with seller carry 5.5%; verify permit transfer',
      uw: { price: 819000, downPct: 25, ratePct: 5.5, termYrs: 30, closingPct: 1.8, rehab: 15000, rentMo: 9800, otherIncMo: 0, vacancyPct: 22, opexPct: 18, taxesYr: 4300, insYr: 4100, mgmtPct: 12, exitCapPct: 6.5, rentGrowthPct: 2.0 },
      score: { yieldOnCost: 8, irr: 8, dscr: 7, fit: 8, submarket: 9, revenue: 6, regulatory: 4, insurance: 6, complexity: 6, exit: 7 },
      risks: ['Sedona STR regulatory direction', 'Seasonality on revenue'], notes: 'Seller carry changes the math materially — model both.' },
    { id: 'opp_gilbert6', name: 'Gilbert 6-unit — Val Vista', market: 'Gilbert, AZ', stage: 'Initial screen', source: 'LoopNet', asking: 1620000, units: 6, strategy: 'LTR', prob: 0.15, deadline: null, nextAction: 'Request T12 + rent roll',
      uw: { price: 1620000, downPct: 30, ratePct: 6.9, termYrs: 30, closingPct: 2.0, rehab: 20000, rentMo: 11100, otherIncMo: 200, vacancyPct: 6, opexPct: 12, taxesYr: 10400, insYr: 6900, mgmtPct: 8, exitCapPct: 5.9, rentGrowthPct: 3.0 },
      score: { yieldOnCost: 5, irr: 5, dscr: 5, fit: 8, submarket: 9, revenue: 7, regulatory: 9, insurance: 7, complexity: 8, exit: 9 },
      risks: ['Priced rich vs current cap rates'], notes: 'Great submarket; needs price movement.' },
    { id: 'opp_tempe12', name: 'Tempe 12-unit — College corridor', market: 'Tempe, AZ', stage: 'Offer submitted', source: 'Broker blast', asking: 2380000, units: 12, strategy: 'LTR (student-adjacent)', prob: 0.4, deadline: day(4), nextAction: 'Counter expected — hold at $2.29M max',
      uw: { price: 2290000, downPct: 32, ratePct: 6.75, termYrs: 30, closingPct: 2.2, rehab: 95000, rentMo: 18900, otherIncMo: 600, vacancyPct: 8, opexPct: 14, taxesYr: 15800, insYr: 11900, mgmtPct: 7, exitCapPct: 6.1, rentGrowthPct: 3.0 },
      score: { yieldOnCost: 7, irr: 8, dscr: 6, fit: 7, submarket: 7, revenue: 8, regulatory: 8, insurance: 6, complexity: 5, exit: 8 },
      risks: ['Turn cost uncertainty', 'Summer vacancy pattern'], notes: 'Offer in at $2.24M; seller countered informally.' },
    { id: 'opp_chandler', name: 'Chandler 4-plex — declined', market: 'Chandler, AZ', stage: 'Declined', source: 'Broker', asking: 1180000, units: 4, strategy: 'LTR', prob: 0, deadline: null, nextAction: '—',
      uw: { price: 1180000, downPct: 30, ratePct: 6.9, termYrs: 30, closingPct: 2.0, rehab: 45000, rentMo: 7200, otherIncMo: 0, vacancyPct: 6, opexPct: 12, taxesYr: 7200, insYr: 5200, mgmtPct: 8, exitCapPct: 6.0, rentGrowthPct: 2.5 },
      score: { yieldOnCost: 4, irr: 4, dscr: 4, fit: 6, submarket: 7, revenue: 6, regulatory: 9, insurance: 7, complexity: 8, exit: 7 },
      risks: [], notes: 'Declined ' + day(-9) + ': DSCR under 1.1 at realistic rents.' },
  ];

  /* ---- finance (§12) ------------------------------------------------------- */
  const accounts = [
    { id: 'a1', name: 'Personal checking', institution: 'Chase', type: 'checking', owner: 'Personal', balance: 24800, liquidity: 'liquid' },
    { id: 'a2', name: 'Personal savings / reserve', institution: 'Marcus', type: 'savings', owner: 'Personal', balance: 96500, liquidity: 'liquid' },
    { id: 'a3', name: 'Kova Holdings operating', institution: 'Mercury', type: 'checking', owner: 'Kova Holdings', balance: 148200, liquidity: 'liquid' },
    { id: 'a4', name: 'Kova Stays operating', institution: 'Mercury', type: 'checking', owner: 'Kova Stays', balance: 31900, liquidity: 'liquid' },
    { id: 'a5', name: 'Kova Living operating', institution: 'Mercury', type: 'checking', owner: 'Kova Living', balance: 22600, liquidity: 'liquid' },
    { id: 'a6', name: 'TRIBE operating', institution: 'Mercury', type: 'checking', owner: 'TRIBE', balance: 18400, liquidity: 'liquid' },
    { id: 'a7', name: 'Brokerage (taxable)', institution: 'Fidelity', type: 'brokerage', owner: 'Personal', balance: 612000, liquidity: 'semiliquid' },
    { id: 'a8', name: 'Retirement (Solo 401k + IRA)', institution: 'Fidelity', type: 'retirement', owner: 'Personal', balance: 348000, liquidity: 'illiquid' },
    { id: 'a9', name: 'Gilbert land (parcel, est.)', institution: '—', type: 'asset', owner: 'Personal', balance: 410000, liquidity: 'illiquid' },
    { id: 'a10', name: 'Casa Sedona mortgage', institution: 'Summit Capital', type: 'mortgage', owner: 'Kova Stays', balance: -512000, liquidity: 'illiquid' },
    { id: 'a11', name: '4th St fourplex mortgage', institution: 'WaFd', type: 'mortgage', owner: 'Kova Living', balance: -676000, liquidity: 'illiquid' },
    { id: 'a12', name: 'HELOC (available $150k)', institution: 'Chase', type: 'heloc', owner: 'Personal', balance: -20000, liquidity: 'liquid_credit' },
  ];
  // 12-month net-worth history → trend chart. Ends at current computed values.
  const nwHistory = (() => {
    const months = []; const base = 2250; // ends ≈ current computed net worth (~$2.51M)
    for (let i = 11; i >= 0; i--) {
      const t = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const wobble = i === 0 ? 0 : Math.sin(i * 1.7) * 38;
      months.push({ m: t.toISOString().slice(0, 7), total: Math.round((base + (11 - i) * 24 + wobble) * 1000), liquid: Math.round((265 + (11 - i) * 7 + wobble / 3) * 1000) });
    }
    return months;
  })();

  const obligations = [
    { id: 'o1', name: 'Umbrella insurance renewal', amount: 2868, due: day(4), recur: 'annual', category: 'Insurance', ws: 'ws_personal', autopay: false },
    { id: 'o2', name: 'Sedona STR permit renewal', amount: 250, due: day(8), recur: 'annual', category: 'Compliance', ws: 'ws_stays', autopay: false },
    { id: 'o3', name: 'Quarterly estimated taxes', amount: 38500, due: day(26), recur: 'quarterly', category: 'Taxes', ws: 'ws_personal', autopay: false },
    { id: 'o4', name: 'AZ TPT filing — Kova Stays', amount: 1840, due: day(17), recur: 'monthly', category: 'Taxes', ws: 'ws_stays', autopay: true },
    { id: 'o5', name: 'Casa Sedona mortgage', amount: 3195, due: day(13), recur: 'monthly', category: 'Debt service', ws: 'ws_stays', autopay: true },
    { id: 'o6', name: '4th St fourplex mortgage', amount: 4554, due: day(13), recur: 'monthly', category: 'Debt service', ws: 'ws_living', autopay: true },
    { id: 'o7', name: 'Mesa 8-plex earnest money', amount: 15000, due: day(1), recur: 'once', category: 'Acquisition', ws: 'ws_re', autopay: false },
    { id: 'o8', name: 'Kylen club fees (season)', amount: 3200, due: day(24), recur: 'annual', category: 'Family', ws: 'ws_family', autopay: false },
    { id: 'o9', name: 'AZ annual report — Kova Holdings', amount: 45, due: day(41), recur: 'annual', category: 'Compliance', ws: 'ws_holdings', autopay: false },
    { id: 'o10', name: 'Health insurance premium', amount: 1620, due: day(10), recur: 'monthly', category: 'Insurance', ws: 'ws_personal', autopay: true },
    { id: 'o11', name: 'Software stack (PM, Shopify, tools)', amount: 486, due: day(6), recur: 'monthly', category: 'Subscriptions', ws: 'ws_holdings', autopay: true },
    { id: 'o12', name: 'Property tax — Mesa fourplex (2nd half)', amount: 4980, due: day(58), recur: 'semiannual', category: 'Taxes', ws: 'ws_living', autopay: false },
  ];

  /* ---- investments (§13) --------------------------------------------------- */
  const positions = [
    { id: 'pos_nvda', ticker: 'NVDA', name: 'NVIDIA', account: 'Brokerage', qty: 400, basis: 61.4, price: 138.2, thesis: 'AI infrastructure supercycle; datacenter capex through 2027.', invalidation: 'Hyperscaler capex guidance cut 2 quarters in a row.', review: day(30),
      options: [ { type: 'cc', strike: 142, expiry: day(4), contracts: 4, premium: 1240, opened: day(-17) } ] },
    { id: 'pos_voo', ticker: 'VOO', name: 'S&P 500 ETF', broad: true, account: 'Brokerage', qty: 310, basis: 385.1, price: 512.4, thesis: 'Core index exposure.', invalidation: '—', review: day(90), options: [] },
    { id: 'pos_qqq', ticker: 'QQQ', name: 'Nasdaq 100 ETF', broad: true, account: 'Retirement', qty: 180, basis: 348.6, price: 478.1, thesis: 'Growth tilt in tax-advantaged.', invalidation: '—', review: day(90), options: [] },
    { id: 'pos_tsla', ticker: 'TSLA', name: 'Tesla (CSP)', account: 'Brokerage', qty: 0, basis: 0, price: 244.6, thesis: 'Happy to own at $220 net; selling puts for income meanwhile.', invalidation: 'FSD/robotaxi thesis stalls + energy margin compression.', review: day(21),
      options: [ { type: 'csp', strike: 225, expiry: day(11), contracts: 2, premium: 980, opened: day(-10) } ] },
    { id: 'pos_btc', ticker: 'BTC', name: 'Bitcoin (cold storage)', account: 'Self-custody', qty: 1.6, basis: 41800, price: 96400, thesis: 'Asymmetric monetary hedge, 5-10yr horizon.', invalidation: 'Protocol-level failure or US hostile ban.', review: day(60), options: [] },
    { id: 'pos_schd', ticker: 'SCHD', name: 'Dividend ETF', broad: true, account: 'Brokerage', qty: 520, basis: 71.2, price: 84.9, thesis: 'Income sleeve, funds option-income drawdowns.', invalidation: '—', review: day(120), options: [] },
  ];
  const investMeta = { pricesAsOf: d(0, 6, 30), premiumYtd: 14680, targetMaxSinglePos: 0.25 };

  /* ---- AI agents (§14.2) ---------------------------------------------------
     level: 0 observe · 1 propose · 2 limited execute · 3 managed autonomy · 4 restricted
     builder: which context pack kova-agents.js assembles for a real run. */
  const agents = [
    { id: 'ag_brief', name: 'Daily executive brief', purpose: 'Compile the morning operating brief: outcomes, risks, decisions, schedule.', level: 1, schedule: 'Daily 5:30am', status: 'scheduled', lastRun: d(0, 5, 30), nextRun: d(1, 5, 30), runs: 41, errors: 1, corrections: 3, timeSavedMin: 20, costMo: 0, trust: 4, builder: 'brief', dataAccess: ['tasks', 'events', 'messages', 'alerts', 'health'] },
    { id: 'ag_triage', name: 'Email & comms triage', purpose: 'Classify inbox items, extract commitments and dates, draft replies for approval.', level: 1, schedule: 'Hourly 7am–7pm', status: 'scheduled', lastRun: d(0, 8, 0), nextRun: d(0, 9, 0), runs: 212, errors: 6, corrections: 18, timeSavedMin: 35, costMo: 0, trust: 4, builder: 'triage', dataAccess: ['messages', 'contacts', 'projects'] },
    { id: 'ag_calprep', name: 'Calendar preparation', purpose: 'Assemble prep packs: attendee history, open commitments, docs, suggested agenda.', level: 0, schedule: 'Daily 6am + 30min pre-meeting', status: 'scheduled', lastRun: d(0, 6, 0), nextRun: d(0, 9, 30), runs: 64, errors: 0, corrections: 2, timeSavedMin: 15, costMo: 0, trust: 5, builder: 'calprep', dataAccess: ['events', 'contacts', 'documents', 'projects'] },
    { id: 'ag_sourcing', name: 'Real-estate sourcing', purpose: 'Scan listings/broker mail against the buy-box; create opportunity records.', level: 1, schedule: 'Daily 7am', status: 'scheduled', lastRun: d(0, 7, 0), nextRun: d(1, 7, 0), runs: 38, errors: 2, corrections: 5, timeSavedMin: 25, costMo: 0, trust: 3, builder: 'sourcing', dataAccess: ['opportunities', 'messages'] },
    { id: 'ag_underwrite', name: 'Property underwriting', purpose: 'Run scenarios on new opportunities; flag where DSCR or CoC misses the floor.', level: 1, schedule: 'On new opportunity', status: 'idle', lastRun: d(-1, 14, 10), nextRun: null, runs: 12, errors: 1, corrections: 2, timeSavedMin: 45, costMo: 0, trust: 4, builder: 'underwrite', dataAccess: ['opportunities'] },
    { id: 'ag_market', name: 'Market & options monitor', purpose: 'Watch strikes, expirations, concentration and drawdown thresholds; explain moves.', level: 0, schedule: 'Market hours, hourly', status: 'scheduled', lastRun: d(0, 7, 30), nextRun: d(0, 8, 30), runs: 388, errors: 4, corrections: 1, timeSavedMin: 10, costMo: 0, trust: 5, builder: 'market', dataAccess: ['positions'] },
    { id: 'ag_tribe', name: 'TRIBE content & competitor', purpose: 'Draft content calendar entries; track competitor drops and pricing.', level: 1, schedule: 'Mon/Thu 8am', status: 'paused', lastRun: d(-4, 8, 0), nextRun: null, runs: 9, errors: 0, corrections: 4, timeSavedMin: 30, costMo: 0, trust: 3, builder: 'tribe', dataAccess: ['entities', 'projects'] },
    { id: 'ag_docs', name: 'Document filing & knowledge', purpose: 'File inbound docs with metadata; extract expirations; update knowledge base.', level: 2, schedule: 'On new document', status: 'idle', lastRun: d(-1, 16, 0), nextRun: null, runs: 57, errors: 3, corrections: 6, timeSavedMin: 12, costMo: 0, trust: 4, builder: 'docs', dataAccess: ['documents'] },
    { id: 'ag_bills', name: 'Bill & renewal monitor', purpose: 'Track obligations; surface renewals with price changes and better quotes.', level: 1, schedule: 'Daily 5am', status: 'scheduled', lastRun: d(0, 5, 0), nextRun: d(1, 5, 0), runs: 88, errors: 0, corrections: 1, timeSavedMin: 8, costMo: 0, trust: 5, builder: 'bills', dataAccess: ['obligations', 'accounts'] },
    { id: 'ag_travel', name: 'Travel planning', purpose: 'Research routes/lodging for pipeline trips; build draft itineraries.', level: 1, schedule: 'On request', status: 'idle', lastRun: d(-12, 10, 0), nextRun: null, runs: 4, errors: 0, corrections: 1, timeSavedMin: 60, costMo: 0, trust: 3, builder: 'travel', dataAccess: ['trips', 'events'] },
    { id: 'ag_health', name: 'Health & training summary', purpose: 'Weekly consistency report: sleep, sessions, readiness; suggest adjustments.', level: 0, schedule: 'Sun 6pm', status: 'scheduled', lastRun: d(-2, 18, 0), nextRun: d(5, 18, 0), runs: 22, errors: 0, corrections: 0, timeSavedMin: 10, costMo: 0, trust: 5, builder: 'health', dataAccess: ['health'] },
    { id: 'ag_review', name: 'Weekly review compiler', purpose: 'Pre-fill the weekly review: wins, misses, project health, next-week outcomes.', level: 1, schedule: 'Fri 3pm', status: 'scheduled', lastRun: d(-2, 15, 0), nextRun: d(5, 15, 0), runs: 21, errors: 1, corrections: 2, timeSavedMin: 30, costMo: 0, trust: 4, builder: 'review', dataAccess: ['tasks', 'projects', 'events', 'reviews'] },
  ];
  const agentRuns = [
    { id: 'r1', agentId: 'ag_brief', at: d(0, 5, 30), status: 'ok', mode: 'simulated', durMs: 4200, summary: 'Morning brief compiled: 3 outcomes, 2 conflicts, 4 decisions pending.', output: 'Top outcomes: (1) Decide PM software. (2) Clear Mesa 8-plex diligence blockers. (3) Confirm Kylen tryout.\nConflicts: broker call overlaps practice drop-off 4:45–5:15pm.\nDecisions waiting: lender terms, NVDA calls, guest comp, umbrella renewal.' },
    { id: 'r2', agentId: 'ag_bills', at: d(0, 5, 0), status: 'ok', mode: 'simulated', durMs: 2100, summary: 'Umbrella renewal +12% flagged; two comparable quotes prepared.', output: 'Umbrella: $214→$239/mo at renewal (4 days). Quote A $221/mo (same limits), Quote B $198/mo (higher retention). Recommend Quote A.' },
    { id: 'r3', agentId: 'ag_triage', at: d(0, 8, 0), status: 'ok', mode: 'simulated', durMs: 3600, summary: '13 items triaged: 3 replies drafted, 2 tasks extracted, 1 escalated.', output: 'Escalated: lender term sheet (decision). Drafted replies: Marcus (duplex), Coach Rivera (tryout), Priya (owner statement).' },
    { id: 'r4', agentId: 'ag_market', at: d(0, 7, 30), status: 'ok', mode: 'simulated', durMs: 1500, summary: 'NVDA within 3% of $142 strike into Friday expiry.', output: 'NVDA 138.20 (+2.1%). 4×142C expire ' + day(4) + '. Assignment frees ~$56.8k; roll to 150C/+30d collects ~$1,180 net.' },
    { id: 'r5', agentId: 'ag_sourcing', at: d(-1, 7, 0), status: 'error', mode: 'simulated', durMs: 800, summary: 'Listing feed unreachable (timeout). Retry succeeded at 7:20.', output: 'ERR_TIMEOUT fetching feed. Retried OK — 2 candidates, 0 passed initial screen.' },
  ];

  /* ---- approvals (§22.3) ---------------------------------------------------- */
  const approvals = [
    { id: 'ap1', agentId: 'ag_triage', at: d(0, 8, 1), kind: 'reply_draft', title: 'Reply to Coach Rivera — confirm Thursday 5pm tryout', detail: 'Draft: "Confirmed — Kylen will be at the Thursday 5pm slot. Anything he should bring beyond the standard kit?"', payload: { taskDone: null }, status: 'pending' },
    { id: 'ap2', agentId: 'ag_bills', at: d(0, 5, 1), kind: 'action', title: 'Switch umbrella policy to Quote A ($221/mo, same limits)', detail: 'Renewal in 4 days at $239/mo. Quote A saves $216/yr with identical limits and carrier rating A+.', payload: null, status: 'pending' },
    { id: 'ap3', agentId: 'ag_triage', at: d(0, 8, 2), kind: 'task_create', title: 'Create task: “Send owner June statement note re: unit 3 plumbing ($840)”', detail: 'From Priya\'s Slack message. Suggested due: tomorrow. Workspace: Kova Living.', payload: { task: { title: 'Send owner note re: unit 3 plumbing charge ($840)', ws: 'ws_living', due: day(1) } }, status: 'pending' },
  ];

  /* ---- notifications (§22) --------------------------------------------------- */
  const notifications = [
    { id: 'n1', at: d(0, 7, 30), pri: 'high', what: 'NVDA within 3% of covered-call strike', why: '4 contracts expire Friday — assignment frees $56.8k', action: 'Decide: let assign / roll to 150C', due: day(4), read: false, link: '#/investments' },
    { id: 'n2', at: d(0, 6, 5), pri: 'high', what: 'Casa Sedona: guest-impacting work order', why: '5-night stay, hot tub down; comp decision pending', action: 'Approve comp or alternative', due: day(0), read: false, link: '#/realestate' },
    { id: 'n3', at: d(0, 5, 0), pri: 'normal', what: 'Umbrella policy renews in 4 days (+12%)', why: 'Two comparable quotes prepared', action: 'Review approval queue', due: day(4), read: false, link: '#/agents' },
    { id: 'n4', at: d(-1, 9, 0), pri: 'high', what: 'Sedona STR permit renewal window: 8 days', why: 'Missing renewal suspends listing', action: 'Renew online', due: day(8), read: false, link: '#/realestate' },
    { id: 'n5', at: d(0, 4, 45), pri: 'critical', what: 'Earnest money wire due tomorrow — Mesa 8-plex', why: '$15,000 due to escrow to stay in contract', action: 'Wire from Holdings operating', due: day(1), read: false, link: '#/finance' },
    { id: 'n6', at: d(-1, 12, 0), pri: 'digest', what: 'School early release Thursday', why: 'Pickup 1:45pm', action: 'Already on calendar', due: day(1), read: true, link: '#/calendar' },
  ];

  /* ---- contacts (§20) --------------------------------------------------------- */
  const contacts = [
    { id: 'c_dana', name: 'Dana Ruiz', kind: 'lender', org: 'Summit Capital', role: 'Commercial lender', channel: 'email', lastTouch: day(0), cadenceDays: 14, open: 'Mesa 8-plex term sheet', ws: 'ws_re' },
    { id: 'c_marcus', name: 'Marcus Hale', kind: 'broker', org: 'Red Rock Realty', role: 'Broker — Sedona/Verde Valley', channel: 'email', lastTouch: day(0), cadenceDays: 14, open: 'Off-market duplex', ws: 'ws_re' },
    { id: 'c_priya', name: 'Priya Natarajan', kind: 'partner', org: 'Kova Living', role: 'Property manager', channel: 'slack', lastTouch: day(0), cadenceDays: 3, open: 'Owner statement Q; PM software input', ws: 'ws_living' },
    { id: 'c_rivera', name: 'Coach Rivera', kind: 'coach', org: 'Phoenix Rising Youth', role: 'Academy coach', channel: 'sms', lastTouch: day(0), cadenceDays: 30, open: 'Tryout confirmation', ws: 'ws_family' },
    { id: 'c_lena', name: 'Lena Fischer', kind: 'advisor', org: 'Fischer Immigration Law', role: 'German citizenship attorney', channel: 'email', lastTouch: day(-18), cadenceDays: 21, open: 'Awaiting apostilled records', ws: 'ws_special' },
    { id: 'c_cpa', name: 'Tom Askew', kind: 'advisor', org: 'Askew & Co CPAs', role: 'CPA', channel: 'email', lastTouch: day(-24), cadenceDays: 30, open: 'Q estimates; entity elections', ws: 'ws_holdings' },
    { id: 'c_avero', name: 'Sam Chen', kind: 'vendor', org: 'Avero Apparel Co.', role: 'Production manager', channel: 'email', lastTouch: day(-1), cadenceDays: 7, open: 'Sample round 2', ws: 'ws_tribe' },
    { id: 'c_ins', name: 'Rachel Odom', kind: 'vendor', org: 'Odom Insurance Group', role: 'Insurance broker', channel: 'email', lastTouch: day(-6), cadenceDays: 60, open: 'Mesa 8-plex quotes ×3', ws: 'ws_re' },
    { id: 'c_grandma', name: 'Mom', kind: 'family', org: '', role: '', channel: 'phone', lastTouch: day(-11), cadenceDays: 7, open: '', ws: 'ws_family' },
    { id: 'c_jd', name: 'J.D. Whitfield', kind: 'inner', org: 'Whitfield Ventures', role: 'Friend / sounding board', channel: 'sms', lastTouch: day(-19), cadenceDays: 21, open: 'Owes intro to Tempe GC', ws: 'ws_personal' },
  ];

  /* ---- documents (§18) --------------------------------------------------------- */
  const documents = [
    { id: 'doc1', title: 'Mesa 8-plex — inspection report', type: 'Inspection', ws: 'ws_re', rel: 'opp_mesa8', effective: day(-1), expires: null, confidential: false, source: 'email' },
    { id: 'doc2', title: 'Mesa 8-plex — revised term sheet (Summit)', type: 'Financing', ws: 'ws_re', rel: 'opp_mesa8', effective: day(0), expires: day(14), confidential: true, source: 'email' },
    { id: 'doc3', title: 'Casa Sedona — STR permit #ST-2214', type: 'Permit', ws: 'ws_stays', rel: 'prop_sedona', effective: day(-357), expires: day(8), confidential: false, source: 'drive' },
    { id: 'doc4', title: 'Umbrella policy — current + quotes A/B', type: 'Insurance', ws: 'ws_personal', rel: null, effective: day(-361), expires: day(4), confidential: true, source: 'drive' },
    { id: 'doc5', title: 'Kova Holdings — operating agreement', type: 'Legal', ws: 'ws_holdings', rel: 'ent_holdings', effective: day(-400), expires: null, confidential: true, source: 'drive' },
    { id: 'doc6', title: 'TRIBE — brand book v2', type: 'Brand', ws: 'ws_tribe', rel: 'ent_tribe', effective: day(-50), expires: null, confidential: false, source: 'drive' },
    { id: 'doc7', title: 'TRIBE — sample round 2 spec sheet', type: 'Product', ws: 'ws_tribe', rel: 'p_tribe', effective: day(-3), expires: null, confidential: false, source: 'email' },
    { id: 'doc8', title: 'German citizenship — document checklist', type: 'Program', ws: 'ws_special', rel: 'p_german', effective: day(-60), expires: null, confidential: true, source: 'drive' },
    { id: 'doc9', title: '4th St fourplex — unit 2 lease', type: 'Lease', ws: 'ws_living', rel: 'prop_mesa4', effective: day(-328), expires: day(37), confidential: true, source: 'drive' },
    { id: 'doc10', title: 'Buy-box criteria — AZ multifamily v3', type: 'SOP', ws: 'ws_re', rel: 'p_azpipe', effective: day(-35), expires: null, confidential: false, source: 'drive' },
    { id: 'doc11', title: 'Family emergency info sheet', type: 'Household', ws: 'ws_family', rel: null, effective: day(-90), expires: null, confidential: true, source: 'drive' },
    { id: 'doc12', title: 'Trademark office action — TRIBE', type: 'Legal', ws: 'ws_tribe', rel: 'ent_tribe', effective: day(-27), expires: day(33), confidential: true, source: 'email' },
  ];

  /* ---- decision journal (§19.4) -------------------------------------------- */
  const decisions = [
    { id: 'dec1', q: 'Offer $2.24M on Tempe 12-unit?', context: 'Priced at $2.38M ask; comps support ~$2.25–2.32M. Turn costs uncertain.', options: 'Offer 2.24 / wait / pass', decision: 'Offered $2.24M with 21-day diligence', date: day(-4), confidence: 0.6, expected: 'Counter near $2.30M; walk above $2.29M.', reviewDate: day(10), actual: null, ws: 'ws_re' },
    { id: 'dec2', q: 'Sell covered calls on full NVDA position?', context: 'Concentration 22% of liquid portfolio; premium rich into earnings.', options: 'Full / half / none', decision: 'Sold 4×142C (covers 400 sh) ' + day(-17), confidence: 0.7, expected: 'Collect premium; accept assignment above 142 as planned trim.', reviewDate: day(4), actual: null, ws: 'ws_invest' },
    { id: 'dec3', q: 'Hire second PM now or after software migration?', context: 'Priya at capacity; migration adds temporary load.', options: 'Now / after / contractor bridge', decision: 'Interview now, start after migration kickoff', date: day(-12), confidence: 0.65, expected: 'Offer out within 3 weeks; no service-level slip.', reviewDate: day(16), actual: null, ws: 'ws_living' },
  ];

  /* ---- health (§16) ----------------------------------------------------------- */
  const health = {
    log: (() => { // last 28 days
      const rows = [];
      for (let i = 27; i >= 0; i--) {
        const sleep = +(6.4 + Math.sin(i * 0.9) * 0.7 + (i % 5 === 0 ? -0.5 : 0.2)).toFixed(1);
        const readiness = Math.max(48, Math.min(96, Math.round(70 + Math.sin(i * 0.7) * 14 + (sleep - 7) * 8)));
        rows.push({ date: day(-i), sleepHrs: sleep, readiness, trained: (i % 7) % 2 === 0 && i % 7 !== 6, weight: +(184.6 - (27 - i) * 0.045 + Math.sin(i) * 0.4).toFixed(1) });
      }
      return rows;
    })(),
    plan: [
      { day: 'Mon', session: 'Strength — lower' }, { day: 'Tue', session: 'Zone 2 — 45min' },
      { day: 'Wed', session: 'Strength — upper' }, { day: 'Thu', session: 'Sprints + mobility' },
      { day: 'Fri', session: 'Strength — full' }, { day: 'Sat', session: 'Long hike / family active' }, { day: 'Sun', session: 'Rest + sauna' }],
    appointments: [ { what: 'Annual physical + labs', when: null, status: 'to book' }, { what: 'Dental cleaning', when: day(19), status: 'booked' } ],
  };

  /* ---- family (§15) ------------------------------------------------------------ */
  const family = {
    members: [ { name: 'Kylen', role: 'son', profile: { activity: 'Soccer — club + academy pathway', school: 'Gilbert Public Schools', goals: 'Decide MLS Next vs ECNL pathway for next season', contacts: ['c_rivera'] } } ],
    household: [
      { id: 'h1', title: 'HVAC seasonal service', due: day(15), status: 'open', vendor: 'Desert Air' },
      { id: 'h2', title: 'Replace water filter (fridge)', due: day(3), status: 'open', vendor: null },
      { id: 'h3', title: 'Vehicle registration — truck', due: day(29), status: 'open', vendor: 'AZ MVD' } ],
    traditions: ['Friday pizza + movie night', 'Fall Sedona weekend', 'New Year goal wall'],
    wishlist: ['Kart racing day', 'Baja spring trip', 'Backyard pizza oven'],
  };

  /* ---- travel (§17) ------------------------------------------------------------- */
  const trips = [
    { id: 'trip1', name: 'Family coast trip (San Diego)', stage: 'planning', dates: 'Target: 4 weeks out', travelers: 'Family', budget: 3800, notes: 'Beach house near Moonlight Beach; check tide calendar.', checklist: [ { item: 'Pick dates', done: false }, { item: 'Book house', done: false }, { item: 'Kylen training schedule around trip', done: false } ] },
    { id: 'trip2', name: 'Germany — records + family visit', stage: 'research', dates: 'Tied to citizenship milestones', travelers: 'Aaron (+family option)', budget: 6500, notes: 'Combine consulate appointment with family visit if timing aligns.', checklist: [ { item: 'Consulate appointment availability', done: false } ] },
    { id: 'trip3', name: 'New Zealand scouting trip', stage: 'idea', dates: 'Next year, southern summer', travelers: 'Aaron', budget: 9000, notes: 'Only if NZ optionality advances past memo stage.', checklist: [] },
  ];

  /* ---- reviews (§19.3) ----------------------------------------------------------- */
  const reviews = [
    { id: 'rev1', kind: 'weekly', date: day(-2), wins: 'Offer submitted on Tempe 12-unit; TRIBE brand book shipped; 4 training sessions.', missed: 'PM software decision slipped again (3rd week) — root cause: no dedicated focus block.', decisions: 'Committed to decision-by-Friday on PM software.', outcomes: 'Decide PM software · Clear Mesa diligence blockers · Kylen pathway shortlist · TRIBE sample decision · Book physical', notes: 'Energy good; too many broker calls midday shredding focus.' },
  ];

  /* ---- knowledge (§18.3) ----------------------------------------------------------- */
  const knowledge = [
    { id: 'k1', title: 'SOP — Underwriting a small multifamily deal', kind: 'sop', ws: 'ws_re', updated: day(-35), body: '1) Rent roll + T12 → normalize. 2) Taxes at reassessed value, not seller\'s. 3) Insurance: quote, never trust pro-forma. 4) DSCR floor 1.25 at real rates. 5) CoC floor 6% year-1. 6) Walk if it needs rent growth to work.' },
    { id: 'k2', title: 'SOP — STR guest incident response', kind: 'sop', ws: 'ws_stays', updated: day(-80), body: 'Acknowledge <1h. Vendor dispatch same day. Comp matrix: minor 10%, major amenity 20%/night affected, uninhabitable = full refund + rebook. Log in PM system; review at weekly.' },
    { id: 'k3', title: 'Buy-box — AZ multifamily v3', kind: 'note', ws: 'ws_re', updated: day(-35), body: '4–20 units · Mesa/Gilbert/Tempe/Chandler (+Sedona STR exception) · DSCR ≥1.25 · CoC ≥6% · yield-on-cost ≥6.5% · no flood zone A · built ≥1980 unless full systems redo priced in.' },
    { id: 'k4', title: 'Decision rules — options income', kind: 'note', ws: 'ws_invest', updated: day(-21), body: 'CC only above cost basis +15%. CSP only at prices happy to own. Max 25% of liquid in any single name. Roll, don\'t panic-close, when thesis intact.' },
    { id: 'k5', title: 'Local AI setup — target architecture', kind: 'research', ws: 'ws_special', updated: day(-8), body: 'Ollama on the workstation serving llama3.1:8b (fast) + llama3.1:70b-q4 (deep). HQ talks to it via the OpenAI-compatible endpoint (Settings → AI Gateway). n8n on the same box bridges Gmail/Calendar → HQ inbox webhook. Nothing leaves the LAN.' },
  ];

  /* ---- today (§6) ------------------------------------------------------------------ */
  const today = {
    date: day(0),
    outcomes: [
      { id: 'out1', title: 'Decide PM software (Buildium vs AppFolio)', done: false, focusMin: 90, link: 'p_kovaops' },
      { id: 'out2', title: 'Clear Mesa 8-plex diligence blockers (inspection + insurance)', done: false, focusMin: 75, link: 'p_azpipe' },
      { id: 'out3', title: 'Confirm Kylen tryout + reply to coach', done: false, focusMin: 15, link: 'p_kylen' },
    ],
    shutdownDone: false, briefDismissed: false,
  };

  /* ---- settings ---------------------------------------------------------------------- */
  const settings = {
    name: 'Aaron', version: 1, privacy: false, workspace: 'all',
    ai: { provider: 'none', baseUrl: 'http://localhost:11434', model: '', apiKey: '', connected: false, lastCheck: null, models: [] },
    n8n: { baseUrl: '', inboxPath: '/webhook/kova-inbox', enabled: false },
    connectors: [
      { id: 'gcal', name: 'Google Calendar', status: 'planned', note: 'Bridge via n8n: Calendar trigger → HQ inbox webhook' },
      { id: 'gmail', name: 'Gmail', status: 'planned', note: 'Bridge via n8n: Gmail trigger → HQ inbox webhook' },
      { id: 'drive', name: 'Google Drive', status: 'planned', note: 'Document links open in Drive; indexing via n8n' },
      { id: 'plaid', name: 'Bank aggregation (Plaid)', status: 'planned', note: 'Requires a backend — see roadmap in README' },
      { id: 'broker', name: 'Brokerage (read-only)', status: 'planned', note: 'Manual price refresh for now; SnapTrade/Plaid later' },
      { id: 'shopify', name: 'Shopify (TRIBE)', status: 'planned', note: 'n8n Shopify node → revenue + order metrics' },
      { id: 'health', name: 'Apple Health', status: 'planned', note: 'Health Auto Export app → n8n webhook' },
    ],
  };

  return {
    settings, workspaces, goals, projects, tasks, events, messages, entities,
    properties, opportunities, accounts, nwHistory, positions, investMeta,
    obligations, agents, agentRuns, approvals, notifications, contacts,
    documents, decisions, health, family, trips, reviews, knowledge, today,
    captures: [], activity: [], copilotThread: [],
  };
}
