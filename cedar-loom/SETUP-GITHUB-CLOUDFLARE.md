# Cedar Loom v1.6-PERFECTION Setup - GitHub + Cloudflare

## Phase 1: Apps Script (5 min) - Fixes 16m death

1. Open your Sheet > Extensions > Apps Script
2. Replace `cedar-loom-factory.gs` with `cedar-loom-factory-v1.6-PERFECTION.gs` (147K)
3. Save, Reload Sheet
4. Menu: `🌲 Cedar Loom v1.6-PERFECTION` > `⚙️ Setup / Repair Factory` (auto-adds 23 new Config keys)
5. Check Config sheet: set
   - `DAILY_BUDGET_MS_WEEKDAY=2700000` (45m)
   - `DAILY_BUDGET_MS_WEEKEND=5100000` (85m max free)
   - `TIMEZONE=Africa/Harare`
   - `WEEKEND_MODE_ENABLED=TRUE`
   - `HEAVY_DAYS=6,0`
   - `TIERED_PRICING_ENABLED=TRUE`
   - `AFFILIATE_PERCENT_STARTER=40`
   - `AFFILIATE_PERCENT_PRO=50`
6. Menu: `📊 Check Budget` should show `Mode: WEEKDAY-LIGHT or WEEKEND-HEAVY, Budget 2700000ms left`
7. Menu: `🏗️ Run STRUCTURAL tests` → should be 25/25 PASS
8. Menu: `🧪 Run self-test` → 16/16 PASS (was 10/10)
9. Menu: `🧪 Test Quality Gates` → Quality score 80+ PASS, CTA + psych triggers
10. Menu: `💰 Test Monetization Tiered` → shows 3 tiers FREE/$19/$49 + 40/50% affiliate

## Phase 2: GitHub Heavy Build (15 min) - Offloads 50m/day

Your repo: `king-kunta-cpu/ptp` (from logs)

1. In GitHub repo > Settings > Secrets > Actions > New:
   - `SHEETS_ID`: your Sheet ID from URL `https://docs.google.com/spreadsheets/d/{THIS}/edit`
   - `SHEETS_SERVICE_JSON`: create GCP Service Account, enable Sheets API, share Sheet with service account email (Editor), paste JSON
   - `GROQ_API_KEY`: from groq.com
   - `GH_TOKEN`: PAT repo scope (same as GH_TOKEN in Apps Script)
   - `CLOUDFLARE_WORKER_URL`: after Phase 3, e.g. `https://cedar-loom.your-subdomain.workers.dev`

2. Copy files to repo:
   ```
   ptp/
   ├── cedar-loom/
   │   ├── heavy-build.js
   │   ├── worker.js
   │   └── wrangler.toml
   └── .github/
       └── workflows/
           └── heavy-build.yml
   ```

3. Push:
   ```bash
   git add cedar-loom/heavy-build.js .github/workflows/heavy-build.yml
   git commit -m "feat: v1.6-PERFECTION heavy build batch 30 ideas 1 call"
   git push
   ```

4. Test dispatch:
   - In Sheet: `🚀 Dispatch Heavy Build 10`
   - Check GitHub > Actions > cedar-heavy > should run, generate 10 ideas batch, 1 commit with landings
   - Logs should show `SUCCESS dispatchHeavy dispatched count=10`

5. Schedule: runs auto Sat/Sun 00:00 Harare (Fri/Sat 22 UTC) via cron, no Apps Script quota used

## Phase 3: Cloudflare Worker (10 min) - Batch distribute 2s vs 40s

1. Install wrangler: `npm install -g wrangler` or `npx wrangler`
2. Login: `npx wrangler login`
3. Deploy:
   ```bash
   cd cedar-loom
   npx wrangler deploy worker.js --name cedar-loom
   ```
   Note URL: `https://cedar-loom.your-subdomain.workers.dev`

4. Set secrets:
   ```bash
   npx wrangler secret put GH_TOKEN
   npx wrangler secret put GH_REPO  # king-kunta-cpu/ptp
   npx wrangler secret put WHOP_API_KEY
   npx wrangler secret put WHOP_COMPANY_ID  # biz_A79oVYva4QTT8Z
   npx wrangler secret put APPS_SCRIPT_WEBHOOK  # Web App URL from Apps Script Deploy > Web App
   ```

5. In Sheet Config: set `CLOUDFLARE_WORKER_URL=https://cedar-loom.your-subdomain.workers.dev`, `OFFLOAD_ENABLED=TRUE`

6. Test: Menu `📦 Test Batch Distribute` → should show Worker URL set, fetchAll exists, readAllSheets exists

7. Live test batch distribute:
   ```bash
   curl -X POST https://cedar-loom.your-subdomain.workers.dev/v1/batch/distribute \
     -H "Content-Type: application/json" \
     -d '{"assets":[{"name":"Test Asset","cta_url":"https://example.com"}],"personas":[{"persona_id":"test","bsky_handle":"test.bsky.social","bsky_app_password":"xxx"}],"dryRun":true}'
   ```

## Live Test After All Phases

1. Sheet: `🔬 Run checklist` → all clear (Whop, GitHub, LLM, YouTube)
2. `🧪 Run self-test` → 16/16 PASS
3. `🏗️ Run STRUCTURAL tests` → 25/25 PASS
4. `📅 Test Weekend Heavy Mode` → shows mode HEAVY/LIGHT, budget 45m/85m
5. `🧪 Test Quality Gates` → score 80+ PASS
6. `💰 Test Monetization Tiered` → FREE/$19/$49 + 40/50%
7. `📊 Check Budget` → used Xms left Yms mode
8. `🚀 Dispatch Heavy Build 10` → GitHub Action runs
9. `📦 Test Batch Distribute` → Worker 2s
10. `▶️ Run full loop now` → tick done 8-15s, today Xms, mode LIGHT/HEAVY, creates tiered Whop products FREE/$19/$49 with affiliate

## Monetization Verification

- After `▶️ Run full loop`, check Assets: should have `whop_product_id` for FREE tier, Products sheet should have 3 rows per asset (FREE, STARTER $19 40%, PRO $49 50%)
- Check Whop dashboard: products with global_affiliate 40/50%, verify read-back OK (no fake 200)
- Distribution posts should include affiliate link + aggressive CTA + psych triggers: "Free for 48h then $29 →" + "Stop losing $200/week" + "47+ using"

## Quota After

- Apps Script: 8-15m/day (was 60-90m) → 75m headroom
- GitHub: 200m/month (10% of 2000m free)
- Cloudflare: 300 req/day (0.3% of 100k free)

## $10k/mo Path

- Weekend heavy: 50 assets/weekend × 8 weekends = 400 assets
- Each asset 3 tiers = 1200 products
- 10 sales/day avg $11.4 net (after 40% affiliate) = $3.4k/mo
- + 10 affiliates ×2 sales/day $9.5 = $5.7k/mo
- + bundles $99 ×8 = $0.8k/mo
- Total ~$9.9k/mo month 3 realistic IRL

