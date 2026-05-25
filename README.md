# ⚽ World Cup 2026 Tracker

Live scores · Group standings · Knockout bracket · Stats · Venues · iCloud calendar sync

**Live site:** *(paste your Cloudflare Pages URL here after first deploy)*

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