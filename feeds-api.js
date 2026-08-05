// ── HQ market-data + bank-relay endpoints (hq Worker only) ─────────────────
//
// /api/quotes?s=NVDA,VOO&c=bitcoin[&debug=1]
//   Free public quotes with per-source fallback, because free feeds are
//   fickle about datacenter egress IPs:
//     stocks/ETFs: Yahoo Finance chart API → Stooq CSV
//     crypto:      Coinbase spot → CoinGecko simple price
//   Edge-cached 10 minutes. Returns { quotes, crypto, at, misses } and,
//   with debug=1, an `errors` map with the real upstream failure per symbol.
//
// /api/relay/mercury/accounts
//   A dumb pass-through to Mercury's read-only accounts endpoint, needed
//   only because browsers can't call api.mercury.com cross-origin. The
//   token arrives in the x-mercury-token header, is forwarded as the
//   Bearer header, and is NEVER stored or logged — it lives in the user's
//   browser (inside the E2E-encrypted app state), not on this Worker.

const QUOTE_EDGE_TTL = 600; // seconds
const UA = 'Mozilla/5.0 (compatible; hq-dashboard/1.0)';
// coingecko-style ids the client sends → ticker symbols for Coinbase
const CRYPTO_SYMBOL = { bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL', dogecoin: 'DOGE', litecoin: 'LTC' };

function feedJson(body, status = 200, cache = 'no-store') {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': cache },
  });
}

async function viaYahoo(sym) {
  const res = await fetch(`https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(sym)}?interval=1d&range=1d`,
    { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error('yahoo ' + res.status);
  const data = await res.json();
  const meta = data && data.chart && data.chart.result && data.chart.result[0] && data.chart.result[0].meta;
  const px = meta && (meta.regularMarketPrice != null ? meta.regularMarketPrice : meta.previousClose);
  if (!isFinite(px) || px <= 0) throw new Error('yahoo no price');
  return px;
}
async function viaStooq(sym) {
  const res = await fetch(`https://stooq.com/q/l/?s=${sym.toLowerCase()}.us&f=sd2t2ohlcv&h&e=csv`,
    { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error('stooq ' + res.status);
  const lines = (await res.text()).trim().split('\n');
  const px = lines.length > 1 ? parseFloat(lines[1].split(',')[6]) : NaN;
  if (!isFinite(px) || px <= 0) throw new Error('stooq no price');
  return px;
}
async function viaCoinbase(id) {
  const sym = CRYPTO_SYMBOL[id];
  if (!sym) throw new Error('no coinbase mapping');
  const res = await fetch(`https://api.coinbase.com/v2/prices/${sym}-USD/spot`,
    { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error('coinbase ' + res.status);
  const data = await res.json();
  const px = parseFloat(data && data.data && data.data.amount);
  if (!isFinite(px) || px <= 0) throw new Error('coinbase no price');
  return px;
}
async function viaCoinGecko(id) {
  const res = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${encodeURIComponent(id)}&vs_currencies=usd`,
    { headers: { 'User-Agent': UA, Accept: 'application/json' } });
  if (!res.ok) throw new Error('coingecko ' + res.status);
  const data = await res.json();
  const px = data && data[id] && data[id].usd;
  if (!isFinite(px) || px <= 0) throw new Error('coingecko no price');
  return px;
}
async function firstOf(fns) {
  const errs = [];
  for (const fn of fns) {
    try { return { px: await fn() }; }
    catch (e) { errs.push(e.message); }
  }
  return { err: errs.join(' | ') };
}

export async function handleQuotes(request, ctx) {
  const url = new URL(request.url);
  const debug = url.searchParams.get('debug') === '1';
  const syms = (url.searchParams.get('s') || '').split(',')
    .map(s => s.trim().toUpperCase()).filter(s => /^[A-Z][A-Z0-9.\-]{0,9}$/.test(s)).slice(0, 25);
  const ids = (url.searchParams.get('c') || '').split(',')
    .map(s => s.trim().toLowerCase()).filter(s => /^[a-z0-9-]{2,40}$/.test(s)).slice(0, 10);
  if (!syms.length && !ids.length) return feedJson({ error: 'no-symbols' }, 400);

  const cacheKey = new Request(new URL(
    '/api/quotes?s=' + [...syms].sort().join(',') + '&c=' + [...ids].sort().join(','),
    request.url).toString());
  const cache = caches.default;
  if (!debug) {
    const hit = await cache.match(cacheKey);
    if (hit) return hit;
  }

  const quotes = {}, crypto = {}, misses = [], errors = {};
  const jobs = [
    ...syms.map(async sym => {
      const r = await firstOf([() => viaYahoo(sym), () => viaStooq(sym)]);
      if (r.px) quotes[sym] = r.px; else { misses.push(sym); errors[sym] = r.err; }
    }),
    ...ids.map(async id => {
      const r = await firstOf([() => viaCoinbase(id), () => viaCoinGecko(id)]);
      if (r.px) crypto[id] = r.px; else { misses.push(id); errors[id] = r.err; }
    }),
  ];
  await Promise.allSettled(jobs);

  const body = { quotes, crypto, at: Date.now(), misses };
  if (debug) body.errors = errors;
  const res = feedJson(body, 200, `public, max-age=300, s-maxage=${QUOTE_EDGE_TTL}`);
  if (!debug && (Object.keys(quotes).length || Object.keys(crypto).length)) {
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
      headers: { Authorization: 'Bearer ' + token, Accept: 'application/json', 'User-Agent': UA },
    });
  } catch (e) {
    return feedJson({ error: 'mercury-unreachable' }, 502);
  }
  return new Response(await upstream.text(), {
    status: upstream.status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' },
  });
}
