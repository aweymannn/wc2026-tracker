// ── KOVA OS device sync — shared Worker module ─────────────────────────────
// End-to-end encrypted state sync for KOVA OS. The client derives BOTH the
// record id and an AES-GCM key from the user's passphrase (PBKDF2) and
// encrypts before upload — the Worker and KV only ever see ciphertext, so
// nothing readable exists server-side even with full Cloudflare access.
//
// Storage: env.KOVA_SYNC (Workers KV). The binding is created by the one-time
// ".github/workflows/kova-sync-setup.yml" workflow; until then every sync
// route answers 501 {enabled:false} and the app shows setup instructions.
//
// Concurrency: optimistic. Each record stores {rev, at, blob}. PUT must echo
// the rev it last saw (baseRev); a mismatch returns 409 with the server's
// rev so the client can offer "take cloud copy" vs "overwrite".
//
// Imported by both worker.js (wc2026-tracker) and kova-worker.js (kova-os),
// so a synced record is reachable from either origin.

const SYNC_MAX_BLOB = 4 * 1024 * 1024; // 4 MB of base64 ciphertext is plenty

function syncJson(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

export async function handleSync(request, env) {
  if (!env.KOVA_SYNC) return syncJson({ enabled: false, error: 'not-configured' }, 501);
  const url = new URL(request.url);
  const id = url.pathname.split('/')[3] || ''; // /api/sync/<id>
  if (id === '' || id === 'ping') return syncJson({ enabled: true });
  if (!/^[a-f0-9]{40,64}$/.test(id)) return syncJson({ error: 'bad-id' }, 400);
  const key = 'state:' + id;

  if (request.method === 'GET') {
    const cur = await env.KOVA_SYNC.get(key, 'json');
    if (!cur) return syncJson({ enabled: true, exists: false }, 404);
    return syncJson({ enabled: true, exists: true, rev: cur.rev, at: cur.at, blob: cur.blob });
  }

  if (request.method === 'PUT') {
    let body;
    try { body = await request.json(); } catch { return syncJson({ error: 'bad-json' }, 400); }
    if (typeof body.blob !== 'string' || !body.blob.length) return syncJson({ error: 'bad-blob' }, 400);
    if (body.blob.length > SYNC_MAX_BLOB) return syncJson({ error: 'blob-too-large' }, 413);
    if (typeof body.rev !== 'string' || !body.rev || body.rev.length > 64) return syncJson({ error: 'bad-rev' }, 400);
    const cur = await env.KOVA_SYNC.get(key, 'json');
    const baseRev = body.baseRev || null;
    if (cur && cur.rev !== baseRev) return syncJson({ error: 'conflict', rev: cur.rev, at: cur.at }, 409);
    const rec = { rev: body.rev, at: Date.now(), blob: body.blob };
    await env.KOVA_SYNC.put(key, JSON.stringify(rec));
    return syncJson({ ok: true, rev: rec.rev, at: rec.at });
  }

  if (request.method === 'DELETE') {
    await env.KOVA_SYNC.delete(key);
    return syncJson({ ok: true });
  }

  return syncJson({ error: 'method-not-allowed' }, 405);
}
