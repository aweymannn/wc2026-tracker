// ── HQ device sync — shared Worker module ──────────────────────────────────
// End-to-end encrypted state sync for HQ. The client derives BOTH the record
// id and an AES-GCM key from the user's passphrase (PBKDF2) and encrypts
// before upload — the Worker only ever sees ciphertext, so nothing readable
// exists server-side even with full Cloudflare access.
//
// Storage: a Durable Object (SyncStore), one instance per record id. DOs
// deploy as part of the Worker itself — no extra namespaces, tokens, or
// setup workflows required. A Worker without the SYNC_DO binding (e.g. the
// wc2026-tracker Worker, where the legacy /kova.html copy lives) answers
// 501 {enabled:false} and the app shows a "use the hq URL" note.
//
// Concurrency: optimistic. The record stores {rev, at, blob}. PUT must echo
// the rev it last saw (baseRev); a mismatch returns 409 with the server's
// rev so the client can offer "take cloud copy" vs "overwrite". DO input
// gates serialize requests per record, so checks are race-free.
//
// DO key-value storage caps values at 128 KiB, so the base64 ciphertext is
// stored in chunks: meta {rev, at, n} + c0..c(n-1).

const SYNC_MAX_BLOB = 8 * 1024 * 1024; // 8 MB of base64 ciphertext
const CHUNK = 100000;                  // chars per stored chunk (< 128 KiB)

function syncJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export class SyncStore {
  constructor(ctx) { this.ctx = ctx; }

  async fetch(request) {
    const storage = this.ctx.storage;

    if (request.method === 'GET') {
      const meta = await storage.get('meta');
      if (!meta) return syncJson({ enabled: true, exists: false }, 404);
      const keys = Array.from({ length: meta.n }, (_, i) => 'c' + i);
      const chunks = await storage.get(keys); // Map<key, value>
      let blob = '';
      for (let i = 0; i < meta.n; i++) blob += chunks.get('c' + i) || '';
      return syncJson({ enabled: true, exists: true, rev: meta.rev, at: meta.at, blob });
    }

    if (request.method === 'PUT') {
      let body;
      try { body = await request.json(); } catch { return syncJson({ error: 'bad-json' }, 400); }
      if (typeof body.blob !== 'string' || !body.blob.length) return syncJson({ error: 'bad-blob' }, 400);
      if (body.blob.length > SYNC_MAX_BLOB) return syncJson({ error: 'blob-too-large' }, 413);
      if (typeof body.rev !== 'string' || !body.rev || body.rev.length > 64) return syncJson({ error: 'bad-rev' }, 400);
      const cur = await storage.get('meta');
      const baseRev = body.baseRev || null;
      if (cur && cur.rev !== baseRev) return syncJson({ error: 'conflict', rev: cur.rev, at: cur.at }, 409);

      const n = Math.ceil(body.blob.length / CHUNK);
      const entries = { meta: { rev: body.rev, at: Date.now(), n } };
      for (let i = 0; i < n; i++) entries['c' + i] = body.blob.slice(i * CHUNK, (i + 1) * CHUNK);
      await storage.put(entries);
      // drop stale chunks left over from a previously-larger blob
      if (cur && cur.n > n) await storage.delete(Array.from({ length: cur.n - n }, (_, i) => 'c' + (n + i)));
      return syncJson({ ok: true, rev: body.rev, at: entries.meta.at });
    }

    if (request.method === 'DELETE') {
      await storage.deleteAll();
      return syncJson({ ok: true });
    }

    return syncJson({ error: 'method-not-allowed' }, 405);
  }
}

export async function handleSync(request, env) {
  if (!env.SYNC_DO) return syncJson({ enabled: false, error: 'not-configured' }, 501);
  const url = new URL(request.url);
  const id = url.pathname.split('/')[3] || ''; // /api/sync/<id>
  if (id === '' || id === 'ping') return syncJson({ enabled: true });
  if (!/^[a-f0-9]{40,64}$/.test(id)) return syncJson({ error: 'bad-id' }, 400);
  if (!['GET', 'PUT', 'DELETE'].includes(request.method)) return syncJson({ error: 'method-not-allowed' }, 405);
  const stub = env.SYNC_DO.get(env.SYNC_DO.idFromName(id));
  return stub.fetch(request);
}
