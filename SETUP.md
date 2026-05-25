# Step-by-step setup guide

Follow these steps in order. Each one is required for the full experience (live scores + iCloud calendar sync).

-----

## Step 1 — Create a GitHub repository

1. Go to **github.com** → sign in (or create a free account)
1. Click the **+** in the top-right corner → **New repository**
1. Name it `wc2026-tracker` (or anything you like)
1. Set it to **Public** (required for free Cloudflare Pages)
1. Click **Create repository**
1. On the next screen, click **uploading an existing file**
1. Drag and drop ALL files from this folder:
- `index.html`
- `schedule.ics`
- `generate_ics.js`
- `_headers`
- `README.md`
- `SETUP.md`
- `.gitignore`
- The `.github/` folder (contains `workflows/deploy.yml`)
1. Click **Commit changes**

> **Tip:** If you see `.github/` not appearing in the file picker, you may need to use the GitHub Desktop app or the `git` command line to push the hidden folder. See Step 1b below.

### Step 1b — Push via command line (if needed for .github/ folder)

If you have Git installed:

```bash
cd /path/to/this/folder
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/wc2026-tracker.git
git push -u origin main
```

-----

## Step 2 — Deploy to Cloudflare Pages

1. Go to **pages.cloudflare.com** → sign in (free account)
1. Click **Create a project** → **Connect to Git**
1. Authorize Cloudflare to access your GitHub account
1. Select your `wc2026-tracker` repository → click **Begin setup**
1. Fill in the build settings:
   
   |Setting               |Value                         |
   |----------------------|------------------------------|
   |Project name          |`wc2026-tracker` (or any name)|
   |Production branch     |`main`                        |
   |Framework preset      |**None**                      |
   |Build command         |`node generate_ics.js`        |
   |Build output directory|`/` (just a forward slash)    |
1. Click **Save and Deploy**
1. Wait ~30 seconds — you’ll get a URL like `https://wc2026-tracker.pages.dev`
1. **Copy that URL** — you’ll need it in Step 3

-----

## Step 3 — Add your site URL to index.html

1. Open `index.html` in any text editor (TextEdit on Mac, Notepad on Windows)
1. Find this line near the top of the `<script>` section:
   
   ```javascript
   const SITE_URL = '';   // ← paste your Cloudflare Pages URL here
   ```
1. Paste your URL between the quotes:
   
   ```javascript
   const SITE_URL = 'https://wc2026-tracker.pages.dev';
   ```
1. Save the file
1. Go back to GitHub → your repo → click `index.html` → click the pencil ✏️ icon → paste the same change → click **Commit changes**

Cloudflare will auto-redeploy in about 30 seconds.

-----

## Step 4 — Set up GitHub Actions for automatic daily updates

This makes the ICS file refresh every day at 4am UTC so your calendar stays current.

### 4a — Get your Cloudflare API token

1. Go to **dash.cloudflare.com** → top-right profile icon → **My Profile**
1. Click **API Tokens** → **Create Token**
1. Use the template **Edit Cloudflare Workers** OR click **Create Custom Token** with:
- Permissions: `Account → Cloudflare Pages → Edit`
1. Click **Continue to summary** → **Create Token**
1. **Copy the token** — you only see it once

### 4b — Get your Cloudflare Account ID

1. In the Cloudflare dashboard, look at the URL: `dash.cloudflare.com/XXXXXXXXXXXXXXXX`
1. That long string is your Account ID. Copy it.

### 4c — Add secrets to GitHub

1. Go to your GitHub repo → **Settings** → **Secrets and variables** → **Actions**
1. Click **New repository secret** — add these two:
   
   |Name                   |Value                 |
   |-----------------------|----------------------|
   |`CLOUDFLARE_API_TOKEN` |the token from step 4a|
   |`CLOUDFLARE_ACCOUNT_ID`|the ID from step 4b   |
1. That’s it. GitHub Actions will now auto-deploy every day and on every push.

-----

## Step 5 — Subscribe to the calendar in iCloud

Your live feed URL is:

```
webcal://wc2026-tracker.pages.dev/schedule.ics
```

(replace `wc2026-tracker` with your actual project name)

### On iPhone / iPad:

1. Open the **📅 CALENDAR** tab in the tracker
1. Tap **Subscribe in Apple Calendar**
1. Tap **Subscribe** → optionally rename it **“⚽ World Cup 2026”**
1. Under **Account**, choose **iCloud** → tap **Done**

All 74 matches now appear in your Calendar app. Apple checks for updates every few hours automatically.

### On Mac:

1. In the tracker, click **Subscribe in Apple Calendar**  
   *Or* open Calendar app → **File** → **New Calendar Subscription**
1. Paste: `webcal://wc2026-tracker.pages.dev/schedule.ics`
1. Click **Subscribe** → set **Account** to **iCloud**
1. Click **OK**

### Manual URL entry (any device):

Settings → Calendar → Accounts → Add Account → Other → Add Subscribed Calendar → paste the `webcal://` URL

-----

## Step 6 — (Optional) Add your odds API key

1. Go to **the-odds-api.com** → sign up free → copy your key (500 requests/month free)
1. In `index.html`, find:
   
   ```javascript
   const ODDS_API_KEY = '4530bc39f97fdab8f270cfbd16770c58';
   ```
1. Replace the placeholder key with yours → commit → Cloudflare auto-deploys

-----

## Troubleshooting

**Calendar not updating?**
Apple Calendar can take up to 24 hours to poll. To force a refresh: iOS → Calendar → pull down to refresh. Mac → Calendar → View → Refresh Calendars.

**Subscribe buttons greyed out?**
You haven’t set `SITE_URL` in `index.html` yet (Step 3).

**GitHub Actions failing?**
Check that both secrets (`CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`) are set correctly in GitHub Settings → Secrets.

**scores not loading?**
worldcup26.ir is a community server. If it’s down, the site falls back gracefully to the static schedule. Try refreshing later.