// Cloudflare Worker for the WC2026 tracker.
//
// Responsibilities:
//   1. /api/odds  → proxy the-odds-api, injecting the API key from a
//      server-side secret (env.ODDS_API_KEY) so it is never exposed in
//      the page source, and caching the response at the edge so the shared
//      500-requests/month free quota is protected no matter how many
//      visitors open or refresh the site.
//   2. /api/wcdata → proxy the public-domain openfootball dataset (match
//      results + goal scorers), cached at the edge. Powers player stats.
//   3. Everything else → served from the static assets (index.html,
//      schedule.ics, _headers, …) via the ASSETS binding.
//
// The odds key is set with:  npx wrangler secret put ODDS_API_KEY
// (or in the Cloudflare dashboard → Worker → Settings → Variables & Secrets).

import { handleSync } from './sync-api.js';

const ODDS_URL =
  'https://api.the-odds-api.com/v4/sports/soccer_fifa_world_cup/odds/' +
  '?regions=us&markets=h2h&oddsFormat=american';

// Public-domain match data incl. goal scorers (no key, CORS-enabled).
const WCDATA_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// How long the edge keeps one upstream response before calling the API again.
// 30 min shared cache → at most ~48 upstream calls/day regardless of traffic.
const EDGE_TTL = 1800;   // seconds (s-maxage)
const BROWSER_TTL = 900; // seconds (max-age) — browsers reuse for 15 min

function jsonResponse(body, { sMaxAge = EDGE_TTL, maxAge = BROWSER_TTL, status = 'ok' } = {}) {
  return new Response(typeof body === 'string' ? body : JSON.stringify(body), {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
      'Access-Control-Allow-Origin': '*',
      // Tells the client whether live odds are actually available, so it can
      // show an "odds unavailable" note when the quota is spent / key missing.
      'X-Odds-Status': status,
    },
  });
}

async function handleOdds(request, env, ctx) {
  const cache = caches.default;
  // Stable cache key (ignores query strings / cache-busters from clients).
  const cacheKey = new Request(new URL('/api/odds', request.url).toString(), {
    method: 'GET',
  });

  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  // No key configured → behave gracefully: empty odds, short cache so it
  // starts working as soon as the secret is added.
  if (!env.ODDS_API_KEY) {
    return jsonResponse('[]', { sMaxAge: 60, maxAge: 60, status: 'unavailable' });
  }

  let upstream;
  try {
    upstream = await fetch(`${ODDS_URL}&apiKey=${env.ODDS_API_KEY}`);
  } catch {
    return jsonResponse('[]', { sMaxAge: 120, maxAge: 60, status: 'unavailable' });
  }

  // Upstream error (e.g. quota exhausted / bad key) → empty odds, retry soon.
  if (!upstream.ok) {
    return jsonResponse('[]', { sMaxAge: 300, maxAge: 60, status: 'unavailable' });
  }

  const body = await upstream.text();
  const response = jsonResponse(body, { status: 'ok' });
  // Store at the edge for EDGE_TTL; don't block the response on the write.
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

async function handleWcData(request, env, ctx) {
  const cache = caches.default;
  const cacheKey = new Request(new URL('/api/wcdata', request.url).toString(), {
    method: 'GET',
  });
  const cached = await cache.match(cacheKey);
  if (cached) return cached;

  let upstream;
  try {
    upstream = await fetch(WCDATA_URL);
  } catch {
    return new Response('{"matches":[]}', {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=60', 'Access-Control-Allow-Origin': '*' },
    });
  }
  if (!upstream.ok) {
    return new Response('{"matches":[]}', {
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=120', 'Access-Control-Allow-Origin': '*' },
    });
  }
  const body = await upstream.text();
  const response = new Response(body, {
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': `public, max-age=${BROWSER_TTL}, s-maxage=${EDGE_TTL}`,
      'Access-Control-Allow-Origin': '*',
    },
  });
  ctx.waitUntil(cache.put(cacheKey, response.clone()));
  return response;
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/api/odds') {
      return handleOdds(request, env, ctx);
    }
    if (url.pathname === '/api/wcdata') {
      return handleWcData(request, env, ctx);
    }
    if (url.pathname.startsWith('/api/sync')) {
      return handleSync(request, env);
    }
    // Everything else is a static asset.
    return env.ASSETS.fetch(request);
  },
};
