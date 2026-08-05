// ── HQ market-data + bank-relay endpoints (hq Worker only) ─────────────────
//
// /api/quotes?s=NVDA,VOO&c=bitcoin
//   Free public quotes: stocks/ETFs from Stooq (delayed EOD/intraday CSV,
//   no key), crypto from CoinGecko (no key). Edge-cached 10 minutes so any
//   number of opens cost at most ~6 upstream calls/hour. Returns
//   { quotes: {NVDA: 138.2, …}, crypto: {bitcoin: 96400}, at, misses: [] }.
//
// /api/relay/mercury/accounts
//   A dumb pass-through to Mercury's read-only accounts endpoint, needed
//   only because browsers can't call api.mercury.com cross-origin. The
//   token arrives in the x-mercury-token header, is forwarded as the
//   Bearer header, and is NEVER stored or logged — it lives in the user's
//   browser (inside the E2E-encrypted app state), not on this Worker.

const QUOTE_EDGE_TTL = 600; // seconds

function feedJson(body, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

async function fetchStooq(sym) {
  // CSV: Symbol,Date,Time,Open,High,Low,Close,Volume
  const res = await fetch(`https://stooq.com/q/l/?s=${sym.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`,
    { headers: { 'User-Agent': 'hq-dashboard/1.0' } });
  if (!res.ok) throw new Error('stooq ' + res.status);
  const lines = (await res.text()).trim().split('\n');
  if (lines.length < 2) throw new Error('empty');
  const close = lines[1].split(',')[6];
  const px = parseFloat(close);
  if (!isFinite(px) || px <= 0) throw new Error('no quote');
  return px;
}

export async function handleQuotes(request, ctx) {
  const url = new URL(request.url);
  const syms = (url.searchParams.get('s') || '').split(',')
    .map(s => s.trim().toUpperCase()).filter(s => /^[A-Z][A-Z0-9.]{0,9}$/.test(s)).slice(0, 25);
  const ids = (url.searchParams.get('c') || '').split(',')
    .map(s => s.trim().toLowerCase()).filter(s => /^[a-z0-9-]{2,40}$/.test(s)).slice(0, 10);
  if (!syms.length && !ids.length) return feedJson({ error: 'no-symbols' }, 400);

  // stable edge-cache key (sorted params)
  const cacheKey = new Request(new URL(
    '/api/quotes?s=' + [...syms].sort().join(',') + '&c=' + [...ids].sort().join(','),
    request.url).toString());
  const cache = caches.default;
  const hit = await cache.match(cacheKey);
  if (hit) return hit;

  const quotes = {}, crypto = {}, misses = [];
  const jobs = syms.map(sym =>
    fetchStooq(sym).then(px => { quotes[sym] = px; }).catch(() => misses.push(sym)));
  if (ids.length) jobs.push(
    fetch('https://api.coingecko.com/api/v3/simple/price?ids=' + ids.join(',') + '&vs_currencies=usd',
      { headers: { Accept: 'application/json' } })
      .then(r => r.ok ? r.json() : Promise.reject(new Error('cg ' + r.status)))
      .then(data => { for (const id of ids) { if (data[id] && data[id].usd) crypto[id] = data[id].usd; else misses.push(id); } })
      .catch(() => misses.push(...ids)));
  await Promise.allSettled(jobs);

  const res = feedJson({ quotes, crypto, at: Date.now(), misses },
    200, `public, max-age=300, s-maxage=${QUOTE_EDGE_TTL}`);
  if (Object.keys(quotes).length || Object.keys(crypto).length) {
    ctx && ctx.waitUntil && ctx.waitUntil(cache.put(cacheKey, res.clone()));
  }
  return res;
}

export async function handleMercuryRelay(request) {
  const url = new URL(request.url);
  if (url.pathname !== '/api/relay/mercury/accounts') return feedJson({ error: 'not-found' }, 404);
  if (request.method !== 'GET') return feedJson({ error: 'method-not-allowed' }, 405);
  const token = request.headers.get('x-mercury-token') || '';
  if (!/^[\w.\-:]{10,300}$/.test(token)) return feedJson({ error: 'bad-token' }, 400);
  let upstream;
  try {
    upstream = await fetch('https://api.mercury.com/api/v1/accounts', {
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json' },
    });
  } catch (e) {
    return feedJson({ error: 'mercury-unreachable' }, 502);
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
