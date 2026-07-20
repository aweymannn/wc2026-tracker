# ◉ HQ — Personal Command Center

**Live app:** https://hq.aarondweymann.workers.dev
*(open on your phone → Share → Add to Home Screen to install)*

HQ deploys as its own Cloudflare Worker (`wrangler.kova.jsonc`, staged by
`build-kova.js`, dashboard at the root path; the `kova-*` file names are
historic internals from the framework document's working title). The same app
also remains reachable at `…/kova.html` on the tracker's URL — browser data is
**per-origin**, so if you entered anything at the old URL, use
Settings → Export backup there and Import at the new one (or enable
device sync on both).

HQ is a personal operating system built from the Product Framework (whose
working title was "KOVA OS" — renamed so the personal dashboard doesn't carry
the Kova business brand): one prioritized view across your day, companies,
real estate, finances, investments, family, health, documents, goals and AI
agents.
This repo also hosts the [World Cup 2026 Tracker](#-world-cup-2026-tracker)
and the [Forager's Atlas](#-foragers-atlas) further down.

**Screens (the framework's 15-screen MVP):** Command Center · Today (with morning
brief + evening shutdown) · Universal Inbox · Calendar · Tasks · Projects ·
Business Portfolio (Kova Holdings / Living / Stays / TRIBE) · Real Estate
(pipeline, buy-box scoring, **live underwriting calculator**, owned-asset ops) ·
Finance & Net Worth (balance sheet, 90-day cash forecast, scenario modeling) ·
Investments (positions, covered-call/CSP tracking, concentration alerts) ·
**AI Agent Control Center** · Family & Health · Documents & Knowledge ·
Goals & Reviews (weekly review flow + decision journal) · Settings & Integrations.

**Global controls:** `⌘K` command palette & universal search · `c` quick capture
(with voice, on supported browsers) · approval queue · notification center ·
privacy mode (blurs all money values) · installable as a phone app (PWA manifest).

### Local-first by design

All data lives in **your browser's localStorage** — nothing readable is sent to any
server. The deployed page ships representative demo data; your edits stay on your
device. Export/import JSON backups from Settings → Data.

### Device sync (end-to-end encrypted)

Optional sync between phone and desktop runs through this repo's own Cloudflare
Worker (`/api/sync`). The app derives both the record id and an AES-256-GCM key
from your passphrase (PBKDF2, 310k iterations) and **encrypts state in the browser
before upload** — the Worker and KV store only ciphertext, and a lost passphrase
is unrecoverable by design. Conflicts are last-writer-wins with an explicit
"take cloud copy / overwrite" prompt.

One-time setup: GitHub → Actions → **"HQ sync setup (one-time)"** → Run
workflow. It creates the `KOVA_SYNC` KV namespace with the existing Cloudflare
secrets, inserts the binding into `wrangler.jsonc`, redeploys, and smoke-tests
the endpoint. (If it fails on authorization, add **Workers KV Storage: Edit** to
the `CLOUDFLARE_API_TOKEN` and re-run.) Then on each device: HQ →
Settings → **Device sync** → same passphrase everywhere.

### Connecting your local AI model

The **AI Agents** screen supervises 12 agents (daily brief, comms triage, calendar
prep, RE sourcing, underwriting, market/options monitor, TRIBE content, document
filing, bill monitor, travel, health summary, weekly review compiler). Until a
model is connected they run in clearly-labeled **simulation** using your live data.
To make them real:

1. On your AI machine: `OLLAMA_ORIGINS="*" ollama serve` (or LM Studio with CORS
   enabled — anything with an OpenAI-compatible `/v1` endpoint works).
2. `ollama pull llama3.1:8b` (or your model of choice).
3. In HQ: **Settings → AI Gateway** → pick preset → **Test & save connection**.

Every run is logged; agents *propose*, you *approve* (approval levels L0–L4 per
the framework §14.3). The **Copilot** chat (✦ button) answers across a live
snapshot of your system — entirely on your hardware.

Communications (Gmail, Google Calendar, Shopify, Apple Health) bridge in through
**n8n** running on the same machine — configure the webhook under Settings, and
the Inbox "Sync" button pulls from it. The expected payload is documented in-app.

### Calendar export

The Calendar screen can export your upcoming HQ events as an `.ics` file —
open it on iPhone/Mac to drop the events into Apple Calendar.

-----

# ⚽ World Cup 2026 Tracker

Live scores · Group standings · Knockout bracket · Stats · Venues · iCloud calendar sync

**Live site:** https://wc2026-tracker.aarondweymann.workers.dev

-----

## 🌿 Forager's Atlas

This repo also hosts a standalone **Forager's Atlas** at [`/foraging.html`](foraging.html) — a safety-first, region-based reference to wild **edible & medicinal plants**.

- **Pick a region/territory** (21 regions across 6 continents) and see every plant that grows there
- **Search by name, use, or ailment** (e.g. "cough", "sore throat", "blood pressure")
- Filter by **use** (food / medicine) and **season**
- Each plant has a **procedurally-drawn botanical illustration** (self-contained SVG — always loads, no external images), plus **identification notes, colour-coded toxic look-alike warnings, benefits, and recipes** to make food and medicine, with dosage cautions and sustainable-harvest notes
- Deep **United States** coverage across all eight sub-regions (Eastern Woodlands, Southeast, Midwest & Plains, Pacific Northwest, California, Southwest, Rockies, Boreal)
- **Installable offline PWA** (`manifest.json` + `sw.js`) — works in the field with no signal
- **Seasonal tools:** "in season now", a month-by-month foraging calendar, and geolocation "Near me" region detection
- **Discovery:** shareable deep-link URLs per plant/region, filters by plant part & conservation status (invasive vs. at-risk), and an ailment quick-select row
- **Safety mode:** a deadly/toxic look-alike comparison guide, one-tap poison-control, and a "before you eat" checklist
- **Favourites** (saved locally) and optional **reference photos** fetched on demand from Wikipedia (with the illustration as a guaranteed fallback)
- **Field journal** (log your finds with date/place/notes, saved locally), a **preparation-methods glossary** (tincture, decoction, infusion, salve, poultice, syrup, oxymel), and a **printable field guide** of the current filtered list
- 120+ plants · 145+ recipes & remedies · zero dependencies, pure HTML/CSS/JS

Data lives in [`forage-data.js`](forage-data.js) — add plants by appending to the `FORAGE_DATA` array (schema documented at the top of the file). Illustrations are generated by [`forage-art.js`](forage-art.js); a plant can set an `img` URL to override the drawing with a real photo (falls back to the drawing if the photo fails to load).

> ⚠️ **Educational use only.** Never eat or medicate with a wild plant without in-person expert confirmation — several listed species have deadly look-alikes. Not medical advice.

-----

## Features

|Feature          |Details                                              |
|-----------------|-----------------------------------------------------|
|🔴 Live scores    |Auto-refreshes every 60s during active matches       |
|📊 Group standings|Live P/W/D/L/GF/GA/GD/Pts for all 12 groups          |
|🏆 Bracket        |Fills in as teams advance through the knockout rounds|
|📈 Stats          |Goals, wins, defence leaderboards + bar charts       |
|🏟️ Venues         |All 16 stadiums with capacity and match counts       |
|⏳ Countdown      |Live ticking countdown to opening match              |
|⭐ Favourite team |Persists in localStorage, shows next fixture         |
|📅 Calendar sync  |**Live iCloud subscription feed** at `/schedule.ics` |
|📡 Free data      |worldcup26.ir — no API key required                  |

-----

## Quick start (local)

```bash
# No build step needed — just open the file
open index.html
```

-----

## Deploy to Cloudflare Pages

See <SETUP.md> for the full step-by-step guide.

**Short version:**

1. Push this repo to GitHub
1. Connect to Cloudflare Pages (free)
1. Framework: None · Build command: `node generate_ics.js` · Output: `/`
1. Add two GitHub Actions secrets: `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
1. Paste your `*.pages.dev` URL into `SITE_URL` in `index.html` and push

-----

## Calendar subscription

Once deployed, the live feed is at:

```
https://your-project.pages.dev/schedule.ics
webcal://your-project.pages.dev/schedule.ics
```

Subscribe in Apple Calendar → the feed updates automatically in iCloud across all your devices.

The GitHub Actions workflow regenerates `schedule.ics` daily at 04:00 UTC and on every push.

-----

## Data sources

|Source                                      |Data                  |Key needed     |
|--------------------------------------------|----------------------|---------------|
|[worldcup26.ir](https://worldcup26.ir)      |Live scores, standings|❌ None         |
|[the-odds-api.com](https://the-odds-api.com)|Betting odds          |✅ Free (500/mo)|

-----

## Stack

Pure HTML/CSS/JS · Zero dependencies · Zero build tools for the site itself  
Node.js used only to regenerate `schedule.ics` (runs in GitHub Actions)