# Cedar Loom v1.7-DISTRIBUTION-PERFECTION — User Manual

## Quick Start (5 min)

1. **Open Sheet:** Your Cedar Loom spreadsheet (contains Backlog, Assets, Personas, etc)
2. **Apps Script:** Extensions > Apps Script > Delete old Code.gs > Paste `cedar-loom-factory-v1.7-DISTRIBUTION-PERFECTION.gs` (177K) > Save (Ctrl+S)
3. **Reload Sheet:** You should see menu `🌲 Cedar Loom v1.7-DISTRIBUTION-PERFECTION`
4. **Setup:** Menu > `⚙️ Setup / Repair Factory` → Wait for alert "Cedar Loom v1.7 setup complete. Brand: Cedar Loom Email: cedar@atomicmail.io Whop: biz_A79oVYva4QTT8Z Lightning: SharkSkin@coinos.io"
5. **Config:** Check Config sheet, fill missing keys (see §2)
6. **Triggers:** Menu > `⏰ Install Triggers` → clMain every 15 min + watchdog 6h
7. **Diagnosis:** Menu > `🔬 Run checklist` → should be all clear Whop/GitHub/LLM/YouTube, `🧪 Run self-test` → 19/19 PASS, `🏗️ Run STRUCTURAL tests` → 35/35 PASS (40+ in v1.7)

## 2. Config Sheet — Fill These

**Required:**
- `WHOP_API_KEY` = your central Whop API key (company biz_A79oVYva4QTT8Z)
- `WHOP_COMPANY_ID=biz_A79oVYva4QTT8Z`
- `GH_TOKEN` or `GITHUB_TOKEN=ghp_***MASKED***` (PAT repo scope)
- `GH_REPO` or `GITHUB_REPO=king-kunta-cpu/ptp` (owner/repo for Pages)
- `LIGHTNING_ADDRESS=SharkSkin@coinos.io`
- `SHOTSTACK_KEY=s1ee***MASKED***...` (40 chars, primary video renderer, your proven)
- `GROQ_API_KEY` or `CEREBRAS_API_KEY` or `GEMINI_API_KEY` (at least one LLM)
- `TIMEZONE=Africa/Harare`

**For Bsky + Mastodon + Buffer (per your request):**
- In **Personas** sheet, per persona fill:
  - `bsky_handle` = e.g. `notion-temp-free.bsky.social`, `bsky_app_password` = app password (rotate exposed keys!)
  - `mastodon_instance` = `https://mastodon.social`, `mastodon_access_token` = Your access token (required), `mastodon_client_key` = Client key (optional), `mastodon_client_secret` = Client secret (optional), `mastodon_token` = alias for access_token
  - `buffer_api_key` = Buffer API key, `buffer_channel_x` = channel ID for X, `buffer_channel_pinterest`, `buffer_channel_facebook`, `buffer_channel_linkedin`
  - `whop_company_id`, `whop_api_key`, `whop_forum_id` per persona (each persona own store/forum for free assets only)
  - `itch_api_key`, `itch_username` per persona (free-only, per-persona project pages, not central)
  - `youtube_channel` per persona or central `YOUTUBE_CHANNEL_ID=UChT6JgRbKyEY2r_Umyi2cxQ`

**Budgets (free 90m safe):**
- `DAILY_BUDGET_MS_WEEKDAY=2700000` (45m)
- `DAILY_BUDGET_MS_WEEKEND=5100000` (85m max free)
- `WEEKEND_MODE_ENABLED=TRUE`, `HEAVY_DAYS=6,0` (Sat,Sun Harare)
- `OFFLOAD_ENABLED=TRUE`, `GH_DISPATCH_ENABLED=TRUE`, `CLOUDFLARE_WORKER_URL=https://cedar-loom.simalidudu.workers.dev`

**Monetization aggressive:**
- `TIERED_PRICING_ENABLED=TRUE` (3 tiers FREE/$19/$49)
- `AFFILIATE_PERCENT_STARTER=40`, `AFFILIATE_PERCENT_PRO=50` (40/50% affiliate)
- `BUNDLE_ENABLED=TRUE`, `FREE_UNTIL_HOURS=48`, `CTA_STYLE=aggressive`
- `ALLOW_FALLBACK_ASSETS=FALSE` (perfection + auto-repair 1x, not fallback)

**Distribution perfection:**
- `MAX_VALUE_POSTS_PER_DAY=5`, `MAX_PROMO_POSTS_PER_DAY=2`, `DISTRIBUTION_VALUE_RATIO=80`, `VALUE_POST_ENABLED=TRUE`
- `REPLY_ENABLED=TRUE`, `ENGAGEMENT_ENABLED=TRUE`, `SEARCH_POST_ENABLED=TRUE`, `AGGRESSIVE_SAFE=TRUE`
- `BSKY_SEARCH_KEYWORDS=freelance client onboarding,Notion invoice,freelance CRM,client pipeline,invoice tracker`
- `MASTODON_SEARCH_HASHTAGS=freelance,Notion,ClientOnboarding,InvoiceTracker`

## 3. Personas — 9 Seed Personas

Seed personas match your 9 Bluesky handles:
- p_seo Sable cli automation seo tools
- p_api Juno api data tools
- p_web Wren webdev kits
- p_apps Ott apps script css
- p_notion Mabel notion templates freelancers
- p_social Ravi self-hosted homelab
- p_sheets Sena sheets api design
- p_python Gus solo operator infra
- p_simali Ada ai safety

Each persona: niche, voice (e.g. "freelance designer running calm studio"), tone (gentle, organized), topics, bsky_handle, max_posts_per_day 2 (promo) + 5 value =7 total, distribution_enabled TRUE, warmed_up_at.

To add new persona: add row to Personas sheet with persona_id, name, niche, voice, tone, topics, bsky_handle, bsky_app_password, mastodon_instance, mastodon_access_token, buffer_api_key, buffer_channel_x, etc.

**Important:** If Personas header mismatch (expected 35 cols got old), delete Personas tab → Setup/Repair auto-creates 35 cols: ...mastodon_instance,mastodon_token,nostr_nsec,mastodon_client_key,mastodon_client_secret,mastodon_access_token,buffer_channel_pinterest,buffer_channel_facebook,buffer_channel_linkedin

## 4. Daily Operations

**Weekend Heavy (Sat,Sun Africa/Harare) — Factory makes as many assets as possible:**
- Trigger runs every 15 min, detects isWeekendHeavy()=TRUE
- If Backlog PENDING <20 and OFFLOAD_ENABLED=TRUE → dispatchHeavyBuild(30) → GitHub Actions heavy-build.yml runs 20-40 min, batch LLM 1 call →30 ideas, 1 call →15 briefs, build 30 assets, 1 commit →30 landings, batchUpdate Sheets
- In Apps Script: draftAssetBriefsBatch(10), buildPendingAssetsBatch(10) with auto-repair 1x, deployAssetLandingsBatch(10), listOnWhop() tiered FREE/$19/$49, createBundleIfDue(), enqueueValuePosts(20), enqueueFreeAssetDistribution(), drainDistributionQueueV2(), engageWithPotentialCustomers()
- Result: 50-100 assets/weekend, 0m Apps Script quota used for heavy

**Weekday Light (Mon-Fri) — Distribution, replying, posting:**
- researchDue() only if queue <5 → runResearchBatch(2)
- draft 1, build 1, landing 2, listOnWhop()
- enqueueValuePosts(5) (80% value searchable), enqueueFreeAssetDistribution() (20% promo aggressive CTA), drainDistributionQueueV2() (value+promo+reply V2, 5 per tick, fetchAll parallel), engageWithPotentialCustomers() (search Bsky/Mastodon for keywords, reply value + soft CTA, build Requests CRM), processCustomRequests() Gmail [CUSTOM]
- Result: 9 personas ×7 posts/day=63/day=1890/month +300 replies/month = loudest noise, puts stuff in front of max eyes

**Budget:**
- Check menu `📊 Check Budget` → shows Used Xms / Budget Yms Left Zms Pct% Mode HEAVY/LIGHT TZ Africa/Harare Reset 00:00 Harare
- If budget hit → INFO budget hit 85% mode LIGHT, sleeps till midnight Harare, no WARN death like old 15m cap

## 5. Menus — What to Click

- `⚙️ Setup / Repair Factory` — creates sheets, Config, seed personas/backlog, auto-adds missing columns (e.g. mastodon_client_key)
- `⏰ Install Triggers` — clMain every 15 min + watchdog 6h, needed for autonomous
- `⚡ Run full loop now` — forces tick immediately, useful for testing, not needed if triggers installed (will run next tick ≤15 min)
- `🔬 Run checklist` — Whop/GitHub/LLM/YouTube configured, trigger installed, all clear
- `🧪 Run self-test` — 19/19 PASS: slugify, extractJson, repairTruncatedJson, maskSecret, fabrication guard, gibberish, brief generation, wake verifier, isWeekendHeavy, generateAggressiveCTA, psych triggers, scoreAssetQuality, tiered products, safeBudget
- `🏗️ Run STRUCTURAL tests` — 35/35 PASS (40+ in v1.7): SCHEMA Distribution/Requests/Personas/Videos, Personas cols whop_company_id/forum_id/itch_api_key/youtube_channel/mastodon_client_key/access_token/buffer_channel_pinterest, adapters itch/whopForum/youtube/mastodon/buffer_x/pinterest/facebook/linkedin, Videos schema, utcDateKey zero-padded, isWeekendHeavy, dispatchHeavyBuild, fetchAll, readAllSheets, judgeQuality, scoreAssetQuality, generateAggressiveCTA, createTieredWhopProducts, getTopRevenueAssets, createBundleIfDue, CONFIG TIERED_PRICING_ENABLED, AFFILIATE 40/50%, DAILY_BUDGET 45m, plus v1.7 generateValuePost, searchBskyNiche, searchMastodonNiche, reply, enqueueValuePosts, drainV2, MAX_VALUE 5, REPLY_ENABLED, etc.
- `🧠 Test LLM chain` — tests Cerebras, Groq, Gemini, etc cascade, circuit breaker
- `📦 Test Distribution mesh` — shows mode LIVE/DRAFT, personas per channel ready, free assets, queue queued/posted/failed/skipped
- `🛍️ Test Whop central` — checks WHOP_API_KEY, WHOP_COMPANY_ID, company readable, persona forums configured
- `💬 Test Whop Forums per persona` — checks whop_company_id/forum_id/api_key per persona, forum readable, verify read-back trap
- `📺 Test YouTube factory v1.2 PROVEN` — central channel UChT6JgRbKyEY2r_Umyi2cxQ, SHOTSTACK_KEY primary SHOTSTACK (redacted), JSON2VIDEO fallback, YouTube service enabled, active provider, personas with youtube_channel, Videos sheet rows READY/RENDERING/RENDERED/UPLOADED, last video
- `🦋 Test Bluesky` — checks bsky_handle/password per persona, mode LIVE/DRAFT, cap 2/day promo +5 value, ROTATE exposed keys warning
- `🐘 Test Mastodon` — checks instance + client key/secret + access token per persona, instance readable
- `📡 Test Buffer X/Pinterest/FB` — checks buffer_api_key + channel_x/pinterest/facebook/linkedin per persona
- `🔗 Reconcile` — verifies Whop products live visibility, marketplace_status, Pages 200, problems list
- `🚑 Watchdog` — checks last run age, trigger missing reinstall, last 20 dist all failed alert
- `🔍 Research now`, `📐 Draft briefs now`, `🏗️ Build pending now`, `🌐 Deploy landings now`, `🛒 List on Whop now`, `📬 Enqueue free distribution`, `📤 Drain distribution queue (3 max)`, `📥 Triage custom requests $199-$399` — manual stage runs
- `📅 Test Weekend Heavy Mode` — shows timezone, isHeavy, used/budget/left/pct, HEAVY_DAYS, WEEKEND_MODE, OFFLOAD, GH_REPO, mode description
- `🚀 Dispatch Heavy Build 10/50` — dispatches GitHub Actions heavy-build count 10/50
- `🧪 Test Quality Gates` — quality score 85 PASS, checks value density, props, real example, wake, CTA, affiliate, screenshot, fabrication, aggressive CTA + psych triggers, judge score
- `💰 Test Monetization Tiered` — TIERED_PRICING_ENABLED, AFFILIATE STARTER 40% PRO 50%, BUNDLE, FREE_UNTIL 48h, tiered FREE lead 80% value CTA to Pro → STARTER $19 40% 1 bonus → PRO $49 50% 3 bonuses + commercial license, bundle every 5 $99, affiliate funnel, Pareto top 20%
- `📦 Test Batch Distribute` — Worker URL, fetchAll exists, readAllSheets exists, old 40s vs new 3s
- `📊 Check Budget` — used/budget/left/pct/mode/tz/reset
- `💎 Enqueue Value Posts 5`, `🔍 Engage Potential Customers`, `📤 Drain V2`, `🧪 Test Value Post`, `🔎 Test Bsky Search`, `🐘 Test Mastodon Search` — v1.7 distribution perfection

## 6. How to Add Bsky Credentials (per your report)

1. Go to Bluesky > Settings > App Passwords > Add App Password > name Cedar Loom > copy
2. In Personas sheet, find persona e.g. p_notion, set bsky_handle=notion-temp-free.bsky.social, bsky_app_password=xxxx-xxxx-xxxx-xxxx
3. Config: BSKY_POSTING_MODE=LIVE, DISTRIBUTION_POSTING_MODE=LIVE
4. Menu: 🦋 Test Bluesky → should show ✓ p_notion @notion-temp-free.bsky.social has password
5. Drain distribution will now post real via com.atproto.repo.createRecord with facets, not fake POSTED

## 7. How to Add Mastodon (Client key, Client secret, Your access token)

1. Mastodon instance > Preferences > Development > New Application > name Cedar Loom, scopes read+write > Submit
2. Copy Client key, Client secret, Your access token
3. Personas sheet: mastodon_instance=https://mastodon.social, mastodon_client_key=xxx, mastodon_client_secret=xxx, mastodon_access_token=xxx (or mastodon_token alias)
4. Menu: 🐘 Test Mastodon → ✓ instance readable
5. chMastodon does POST {instance}/api/v1/statuses Bearer token visibility public + verify GET /statuses/{id}

## 8. How to Add Buffer for X/Pinterest/Facebook

1. Buffer > Manage Channels > Connect X/Pinterest/Facebook/LinkedIn > copy channel IDs
2. Buffer > Settings > API > Access Token
3. Personas: buffer_api_key=xxx, buffer_channel_x=xxx, buffer_channel_pinterest=xxx, buffer_channel_facebook=xxx, buffer_channel_linkedin=xxx
4. Menu: 📡 Test Buffer → ✓ channels
5. _bufferPost via https://api.buffer.com/1/updates/create.json?access_token={key} payload {text, profile_ids:[channelId]}

## 9. How to Check Money

- **Assets sheet:** whop_product_id, whop_url, status LISTED, wake_score, landing_url
- **Products sheet:** 3 rows per asset FREE $0, STARTER $19 40%, PRO $49 50%, bundle $99, whop_product_id, whop_url, short_url, status LISTED
- **Revenue sheet:** ts,payment_id,amount,currency,buyer,status — Whop webhooks, Pareto top 20% → 5 variants next weekend
- **Whop dashboard:** biz_A79oVYva4QTT8Z > Products > check global_affiliate_percentage 40/50%, marketplace_status listed, verify read-back
- **Distribution sheet:** dist_id,asset_ref,persona_id,channel,status POSTED, remote_id, remote_url, post_text with aggressive CTA + psych triggers + affiliate link
- **Requests sheet:** potential customers from Bsky/Mastodon search + Gmail [CUSTOM], budget $199-$399, status NEW_LEAD
- **Videos sheet:** bundle_id,mp4_url,youtube_id,youtube_url,status UPLOADED, provider shotstack

## 10. Troubleshooting

- **Syntax error Unexpected token 'export' line 4:** You pasted worker.js (Cloudflare) into Code.gs. Paste factory .gs (147K-177K, var CL_VERSION) into Code.gs, worker.js only for Cloudflare wrangler deploy.

- **File not found in workspace:** Use cedar-loom-factory-v1.7-DISTRIBUTION-PERFECTION.gs (177K) from GitHub king-kunta-cpu/ptp/cedar-loom/

- **WARN GitHub not configured:** You set GITHUB_TOKEN/GITHUB_REPO but code expected GH_TOKEN/GH_REPO. Fixed via alias in getConfig, now both work. Check Config has GH_TOKEN or GITHUB_TOKEN.

- **WARN Whop 404 Unrecognized URL POST /companies/.../products:** Fixed to POST /products with company_id + POST /plans. If still 404, update factory to v1.7.

- **WARN clMain soft day cap reached 959820ms (16 min):** Old 15m cap too low. Fixed to 45m weekday / 85m weekend Africa/Harare + GitHub offload + fetchAll batch. Check Budget menu shows 69m left.

- **Assets header mismatch / Personas header mismatch:** Old sheets have 22 cols vs new 35 cols. Setup/Repair auto-adds missing columns at end, but if sheet empty it repairs. Best: delete Personas tab → Setup/Repair recreates 35 cols.

- **Videos 2 rows corrupt youtube_id=READY:** Old schema video_id vs new bundle_id. Delete Videos tab → Setup/Repair creates clean schema [bundle_id,job_id,mp4_url,youtube_id,youtube_url,status,attempts,ts,provider]

- **Distribution 0/3 assets, QC + alerting required:** Green != working. Fixed stubs sellapp/sellix/fetchapp/webflow/nostr/buffer generic to return SKIPPED not_implemented permanent to avoid fake green. Real adapters bsky, mastodon, buffer_x/pinterest/facebook/linkedin, whopForum, itch, youtube, archive, systemeio return real POSTED with verify.

- **Bluesky new app passwords, stubs fake green:** Fixed bskySession with token cache 80min + refresh + createSession, bskyPost via createRecord with facets byte offsets, chBluesky real POST.

- **Mastodon Client key/secret/access token errors:** Ensure mastodon_instance https://..., mastodon_access_token set, test via 🐘 Test Mastodon.

- **Buffer X/Pinterest/Facebook not posting:** Ensure buffer_api_key + buffer_channel_x/pinterest/facebook set per persona, test via 📡 Test Buffer.

- **No ideas added, research 0:** Queue full (5+ pending), not bug. Wait for draft/build to consume.

- **Trigger NOT installed:** Run ⏰ Install Triggers.

- **YouTube not uploading:** Enable YouTube Data API v3 in Services, set SHOTSTACK_KEY, check testYouTube diagnostic.

- **Need $10k/mo realistic:** Base $300-1.2k/mo autonomous, $2k-4k with 1h/day custom outreach via Requests CRM. With 100 assets ×3 tiers=300 products, 10 sales/day $11.4 net = $3.4k + 10 affiliates ×2 sales $9.5 = $5.7k + bundles $0.8k = ~$9.9k month 3.

## 11. Cafe Internet Expensive — Autonomous/Cloud

- Factory runs cloud via triggers every 15 min, no need to keep Sheet open
- Heavy work offloaded to GitHub Actions (0m quota, 2000m free) + Cloudflare Worker (100k req free)
- Apps Script daily usage 8-15m (was 60-90m) → 75m headroom
- GitHub heavy-build 50 assets/weekend ×8 weeks=400 assets, no cafe bandwidth
- Cloudflare batch distribute 10 posts 2s vs 40s sequential
- Low-bandwidth tracker: Assets <500KB, landing <100KB, video <10MB, inline SVGs, no external fonts

## 12. Brand

- Cedar Loom, cedar@atomicmail.io, atomicmail.io domain, new no forge nexus in name
- Whop forum per persona free-only, itch per persona free-only, low-bandwidth tracker, diagnosis suite
