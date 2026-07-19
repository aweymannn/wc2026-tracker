// Stage the KOVA OS static bundle into dist-kova/ for the "kova-os" Worker.
// kova.html becomes index.html so the dashboard serves at the root path;
// the PWA manifest is rewritten to match. Run before deploying with
// wrangler.kova.jsonc (the deploy workflow does this automatically).
'use strict';
const fs = require('fs');
const path = require('path');

const OUT = 'dist-kova';
const FILES = [
  'kova-data.js', 'kova-app.js', 'kova-views.js', 'kova-views2.js',
  'kova-agents.js', 'kova-sync.js', 'kova-icon.svg',
];

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT);
for (const f of FILES) fs.copyFileSync(f, path.join(OUT, f));
fs.copyFileSync('kova.html', path.join(OUT, 'index.html'));

const manifest = JSON.parse(fs.readFileSync('kova-manifest.json', 'utf8'));
manifest.start_url = './';
manifest.scope = './';
fs.writeFileSync(path.join(OUT, 'kova-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');

fs.writeFileSync(path.join(OUT, '_headers'), [
  '/*',
  '  X-Frame-Options: DENY',
  '  X-Content-Type-Options: nosniff',
  '  Referrer-Policy: strict-origin-when-cross-origin',
  '  Cache-Control: public, max-age=300, stale-while-revalidate=60',
  '',
].join('\n'));

console.log('dist-kova staged: ' + fs.readdirSync(OUT).sort().join(', '));
