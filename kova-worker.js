// Cloudflare Worker for HQ, the personal dashboard (its own Worker, "hq",
// so the app lives at its own URL with the dashboard at the root path).
//
// Responsibilities:
//   1. /api/sync/* → end-to-end encrypted device sync (see sync-api.js).
//   2. Everything else → static assets staged into dist-kova/ by
//      build-kova.js (kova.html is renamed to index.html there).
//
// The KOVA_SYNC KV binding (historic internal name) is added to
// wrangler.kova.jsonc by the "HQ sync setup (one-time)" workflow;
// until then sync answers 501.

import { handleSync } from './sync-api.js';

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/sync')) {
      return handleSync(request, env);
    }
    return env.ASSETS.fetch(request);
  },
};
