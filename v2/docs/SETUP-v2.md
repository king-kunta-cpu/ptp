# Cedar Loom v2.0 — Setup Guide (new canvas)

New Apps Script project + new spreadsheet + the worker that's already deployed. ~2 hours, one sitting.

## 0. Rotate the keys that were pasted into chat (do this FIRST)

All of these were exposed in conversation — treat as compromised:

1. **Nostr nsec** — this is a PRIVATE KEY, highest priority: rotate that identity, don't use the old nsec again.
2. **GitHub PAT** (`ghp_…`) — GitHub → Settings → Developer settings → Tokens → revoke; mint a new `repo`-scope PAT.
3. **Cloudflare API token** (`cfat_…` + old `cfut_…`) — Dash → Profile → API Tokens → revoke both; mint one new.
4. **Whop** — central `apik_` + app key: Whop → company settings → API keys → regenerate. (Regenerate the 9 persona store keys when you create the stores.)
5. **LLM keys** (Cerebras, Groq, Gemini, Mistral, Cohere), Serper, Tavily, Shotstack, JSON2Video — revoke + reissue at each provider.
6. **Discord webhooks** — regenerate both (they were pasted twice).
7. **IndexNow key** — regenerate.

Reuse the same key NAMES below; only the values change.

## 1. Create the new spreadsheet + Apps Script

1. sheets.google.com → New → give it a name → File → Apps Script (bound).
2. Delete the starter code, paste **all** of `v2/factory/cedar-loom-v2.gs`.
3. Run `setupFactory()` from the dropdown. This creates every sheet, seeds the 9 personas (from `docs/PERSONAS-v2.md`) and the Config key list (values empty).
4. Authorize the script when prompted (Sheets, Drive, Gmail, UrlFetch).

## 2. Fill the Config sheet

| key | value |
|---|---|
| NOTION_TOKEN | new integration token (step 5) |
| NOTION_PARENT_ID | the parent page you shared with the integration (step 5) |
| COINOS_API_BASE / COINOS_API_KEY / COINOS_WEBHOOK_SECRET | your coinos API (step 9) |
| CL_BRIDGE_SECRET | the 48-hex secret handed to you in chat |
| WEB_APP_URL | from step 4 below |
| CLOUDFLARE_WORKER_URL | `https://cedar-loom.simalidudu.workers.dev` |
| GH_TOKEN / GH_REPO | new PAT / `king-kunta-cpu/ptp` |
| WHOP_API_KEY / WHOP_COMPANY_ID / WHOP_APP_API_KEY / WHOP_APP_ID | rotated central keys |
| CEREBRAS / GROQ / GEMINI / MISTRAL / COHERE / CLOUDFLARE_API_KEY + CLOUDFLARE_ACCOUNT_ID | rotated LLM keys |
| SERPER / TAVILY (optional research) | rotated |
| CUSTOM_BUILD_EMAIL | cedar@atomicmail.io |
| DISCORD_WEBHOOK | new webhook |
| PERSONA_PAID_PRICE | 19 |
| PERSONA_AFFILIATE_PCT | 40 |
| DRY_RUN | FALSE (start TRUE while testing, then FALSE) |
| DISTRIBUTION_POSTING_MODE / BSKY_POSTING_MODE | DRAFT → flip to LIVE after tests pass |

## 3. Notion (one workspace, all 9 personas)

1. notion.so/profile/integrations → New integration (internal, all permissions editable).
2. In your workspace: create a page called `Cedar Loom factory` → ⋯ → Connections → add the integration.
3. Copy the token → `NOTION_TOKEN`. Copy the page ID from the URL (32 hex chars) → `NOTION_PARENT_ID`.
4. The factory auto-creates one folder per persona under it.

## 4. Deploy the web-app bridge (the sheet API for GitHub Actions)

1. Apps Script → Deploy → New deployment → **Web app**.
2. Execute as: **me** · Who has access: **Anyone**.
3. Copy the `/exec` URL → Config `WEB_APP_URL` → **and** into the GitHub Actions secret (step 7).
4. Never redeploy with "Anyone" removed — the Actions job needs it.

## 5. The 9 personas (you said EOD today — checklist per persona)

Per persona (×9):

- **Google account** → Blogger blog (suggested handles in PERSONAS-v2.md) → paste blogspot URL into the sheet.
- **Free mailbox** (Proton/Tuta, e.g. `hello@sablecli.proton.me`) → `mail_contact`.
- **Whop store** → `whop_company_id` + `whop_api_key` (scope: products, plans, **payments read**).
- **Bluesky** account + **app password** → `bsky_handle` / `bsky_app_password` (rotate the old exposed ones).
- **Mastodon** account (mastodon.social or the niche-appropriate instance) → create an app, note the access token → `mastodon_instance` / `mastodon_access_token`.
- **Buffer** account (free tier) → connect X + Pinterest (+FB/LinkedIn) → API key + channel ids.
- Optional: **dev.to** API key (`devto_key`), **Hashnode** publication + PAT (`hashnode_pat` / `hashnode_pub`), **YouTube** channel id.
- `search_keywords` / `search_hashtags` are pre-seeded from PERSONAS-v2.md — review and tweak.

Then in each tool file `v2/tools/{persona}.html`, replace the string `CONTACT` (top of the `<script>` block) with that persona's mailbox and push (one commit).

## 6. GitHub

1. `king-kunta-cpu/ptp` → Settings → **make public** (code holds no secrets — scanned before push; keep it that way: never commit keys).
2. Settings → Secrets and variables → Actions → add:
   - `WEB_APP_URL` (step 4)
   - `BRIDGE_SECRET` (the 48-hex secret)
   - `WORKER_URL` (the worker URL)
3. Check Actions → the `v2-factory` workflow is visible.

## 7. Worker (already deployed — verify)

- `https://cedar-loom.simalidudu.workers.dev/health` → `{"ok":true,"version":"2.0.0"}`
- If a re-deploy is ever needed: `wrangler deploy` in `v2/worker`, then
  `wrangler secret put BRIDGE_SECRET / COINOS_API_BASE / COINOS_API_KEY / COINOS_WEBHOOK_SECRET / WEB_APP_URL`.

## 8. Coinos (Lightning)

- Set the payment **webhook** on your coinos instance to: `https://cedar-loom.simalidudu.workers.dev/zap/webhook?s=<COINOS_WEBHOOK_SECRET>`
- Put `COINOS_API_BASE` + `COINOS_API_KEY` in Config **and** as worker secrets (same values).
- If the invoice endpoint path differs on your instance, set `COINOS_INVOICE_PATH` (worker secret) accordingly — `testCoinos()` tells you.

## 9. Verify (run each from the Apps Script dropdown)

`runChecklist` → all keys present · `selfTest` → pure-function tests · `testBridge` → web app round-trip · `testNotion` → real page create + public link · `testWhop` → central + first persona store · `testCoinos` → API ping · `testBluesky` / `testMastodon` / `testBuffer` → credentials per persona.

## 10. Go full tilt

1. `DRY_RUN=FALSE`, `DISTRIBUTION_POSTING_MODE=LIVE`, `BSKY_POSTING_MODE=LIVE`.
2. That's it. `clMain` runs every 15 min: research → briefs → dispatch 3 builds/tick to Actions (≈27 assets/day) → 7–9 posts/persona/day → replies → revenue digest 21:00 Harare.
3. Watch: Logs sheet (`tick done … mode HEAVY/LIGHT`), Discord alerts, Revenue sheet.
4. `EMERGENCY_STOP=STOP` halts everything instantly; `resetBudgetManually()` clears the day's quota.

## YouTube (optional upgrade, later)

Videos are rendered (ffmpeg, $0) and embedded on landings via Drive preview. To also push to YouTube: create a Google OAuth desktop client (youtube.upload scope), run the auth once, store the refresh token as an Actions secret `YOUTUBE_REFRESH_TOKEN` — the video job will pick it up. Not needed for the core loop.
