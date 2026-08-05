// Cloudflare Worker for HQ, the personal dashboard (its own Worker, "hq",
// so the app lives at its own URL with the dashboard at the root path).
//
// Responsibilities:
//   1. /api/sync/* → end-to-end encrypted device sync (see sync-api.js).
//   2. Everything else → static assets staged into dist-kova/ by
//      build-kova.js (kova.html is renamed to index.html there).
//
// Sync storage is a Durable Object (SyncStore) that deploys with this
// Worker — no external namespaces or setup steps.

import { handleSync, SyncStore } from './sync-api.js';
import { handleQuotes, handleMercuryRelay } from './feeds-api.js';
export { SyncStore };

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/sync')) {
      return handleSync(request, env);
    }
    if (url.pathname === '/api/quotes') {
      return handleQuotes(request, ctx);
    }
    if (url.pathname.startsWith('/api/relay/mercury')) {
      return handleMercuryRelay(request);
    }
    return env.ASSETS.fetch(request);
  },
};
