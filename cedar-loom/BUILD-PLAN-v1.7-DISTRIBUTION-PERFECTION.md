# Cedar Loom v1.7-DISTRIBUTION-PERFECTION — Bsky + Mastodon One Voice style, aggressive yet safe, loudest noise

## Problem Now

Current distribution:
- `enqueueFreeAssetDistribution()` → 1 promo post per asset per persona per channel, jitter 6-72h, `MAX_POSTS_PER_DAY=2`, `DIST_MAX_PER_TICK=3`
- `personaPromoText()` → 1-2 sentences, no URL, no search optimization, no value
- `drainDistributionQueue()` → posts asset promo only, no replies, no value content, no engagement
- Result: Quiet, only promo, no search visibility, no replies, no potential customer engagement → low money

One Voice v5.4 did: persona survivability, valuable niche content, replying, search presence, aggressive yet safe (no BLOCKED storm).

You need: **Loudest noise, put stuff in front of as many eyes as possible, determines money.**

## Goal v1.7

- **80% value, 20% promo** — Bsky/Mastodon love value, promo alone = shadowban
- **Search-optimized** — posts show up when freelancers search "client onboarding", "invoice tracker", "Notion CRM"
- **Replying + engaging** — monitor mentions, keywords, reply with value + soft CTA, build Requests CRM
- **Aggressive yet safe** — 5 value + 2 promo per day per persona (not 2 total), jitter, trigram dedup, rate limit respect, no duplicate
- **Loudest noise** — 9 personas × 7 posts/day = 63 posts/day across Bsky/Mastodon/Buffer X/Pinterest/Facebook = 1890 posts/month, all with affiliate CTA

## Architecture — 3 Content Types

### 1. Value Posts (80% — search, no CTA or soft CTA)
- **What:** Niche tips, how-tos, templates, threads that show up in search
- **Example for p_notion (freelance designer):**
  - "Client onboarding takes 5h/week? I cut it to 10 min with 3 steps: 1) Intake form (Notion) 2) Loom script 3) Auto-reminder. Template free for 48h → link"
  - "Invoice tracker that saved me $2k: Status: Draft/Sent/Paid/Overdue, Due date, Kill-fee log. Free mini → link"
  - Thread: "5 client onboarding mistakes I made (cost me $5k): 1) No deposit 2) No scope 3) No timeline..."
- **Search optimization:**
  - Bsky: include keywords in text, 2 hashtags max (#freelance #notion), facets for links, alt text for images
  - Mastodon: 3 hashtags (#freelance #Notion #ClientOnboarding), no link in first line (algo), link in 2nd paragraph
  - Include pain keywords: "client onboarding", "invoice tracker", "freelance CRM", "Notion template"
- **CTA soft:** "Free template for 48h → link" or no CTA, just value, profile has link

### 2. Promo Posts (20% — aggressive CTA, affiliate)
- **What:** Asset promo with aggressive CTA + psych triggers + affiliate link
- **Formula:** Pain + Dream + Social Proof + Scarcity + CTA
  - "Spending 5h/week onboarding? I cut to 10 min with Client Kickoff Mini-OS — 47 freelancers using, free for 48h then $29, 40% affiliate if you share → link"
- **Use:** `generateAggressiveCTA()` + `generatePsychTriggers()` already built
- **Limit:** 2/day per persona (safe, not spam)

### 3. Reply + Engagement (ongoing — potential customers)
- **What:** Monitor Bsky/Mastodon for mentions, keywords, reply with value + soft CTA, build Requests CRM $199-$399
- **Bsky search:** `searchPosts` API with keywords: "freelance client onboarding", "Notion invoice", "freelance CRM"
- **Mastodon search:** `/api/v2/search?q=freelance+onboarding&type=statuses`
- **Reply logic:**
  - If someone asks "How do you onboard clients?" → reply with value + "I made free template for 48h → link"
  - If someone complains "Chasing invoices sucks" → reply "I built free tracker, saves 4h/week → link"
  - Always value first, soft CTA second, never hard sell in reply
- **Engagement:** Like, repost, follow 5 relevant accounts/day per persona (growth)

## Technical Implementation — v1.7

### Config Additions
- `DISTRIBUTION_VALUE_RATIO=80` (80% value, 20% promo)
- `MAX_VALUE_POSTS_PER_DAY=5` (value posts per persona per day)
- `MAX_PROMO_POSTS_PER_DAY=2` (promo, existing MAX_POSTS_PER_DAY)
- `REPLY_ENABLED=TRUE`
- `ENGAGEMENT_ENABLED=TRUE`
- `BSKY_SEARCH_KEYWORDS=freelance client onboarding,Notion invoice,freelance CRM,client pipeline`
- `MASTODON_SEARCH_HASHTAGS=freelance,Notion,ClientOnboarding,InvoiceTracker`
- `SEARCH_POST_ENABLED=TRUE`
- `AGGRESSIVE_SAFE=TRUE` (jitter, dedup, rate limit)

### New Functions

```js
function generateValuePost(persona, nicheKeyword, type){
  // type: tip, howto, mistake, template, thread
  // Prompt: "Write valuable niche post for freelance designer, voice dry specific, no filler, include keyword client onboarding, 1-2 sentences, no URL, searchable"
  // Returns {text, keywords, hashtags}
}

function generateSearchOptimizedPost(persona, asset, isValue){
  // Value: 80% no CTA, include 2 hashtags, keywords
  // Promo: 20% aggressive CTA + affiliate link + psych triggers
}

function searchBskyNiche(keywords){
  // Use Bsky API: https://bsky.social/xrpc/app.bsky.feed.searchPosts?q=...
  // Returns posts with potential customers
}

function searchMastodonNiche(instance, token, hashtags){
  // GET /api/v2/search?q=...&type=statuses
}

function replyToBskyPost(handle, password, postUri, replyText){
  // POST with reply ref
}

function replyToMastodonPost(instance, token, statusId, replyText){
  // POST /api/v1/statuses with in_reply_to_id
}

function engageWithPotentialCustomers(){
  // 1. Search Bsky/Mastodon for keywords
  // 2. For each found post, generate value reply + soft CTA
  // 3. Enqueue as Distribution with channel=bsky_reply or mastodon_reply
  // 4. Also like/repost via API (optional)
  // 5. Add to Requests CRM if budget mentioned
}

function enqueueValuePosts(){
  // Similar to enqueueFreeAssetDistribution but for value posts
  // 9 personas × 5 value/day = 45 value posts/day
  // Use readAllSheets batch, generate via LLM batch 1 call → 15 value posts
}

function drainDistributionQueueV2(){
  // Old drain + new: handles value, promo, reply
  // Respects MAX_VALUE_POSTS_PER_DAY and MAX_PROMO_POSTS_PER_DAY separate
  // Uses _fetchAll parallel for 10 posts
  // Tracks postsTodayValue and postsTodayPromo separately
}
```

### Updated clMain Logic

```js
if(isHeavy){
  // Weekend heavy: research 30, draft 10, build 10, landing 10, value posts 20
  enqueueValuePosts(20);
  engageWithPotentialCustomers();
} else {
  // Weekday light: distribute 30 (20 value + 10 promo), reply 10, engagement 5
  enqueueValuePosts(5);
  enqueueFreeAssetDistribution(); // promo 2 per persona
  drainDistributionQueueV2(); // handles value + promo + reply, uses fetchAll
  engageWithPotentialCustomers(); // reply to 10 potential customers
}
```

### Aggressive Yet Safe — Anti-Spam

- **Rate limits:** Bsky 5 posts/hour per handle (we do 5 value + 2 promo = 7/day = safe), Mastodon 300 posts/day per instance (we do 7/day = safe)
- **Jitter:** 6-72h already, keep for promo, value uses 2-8h jitter
- **Dedup:** `_tooSimilar` trigram >0.45 → skip, already built
- **Vary text:** Generate 3 variants per asset, A/B test hook A/B/C
- **No duplicate CTA:** Rotate CTA variants via `generateAggressiveCTA(asset, variant%5)`
- **Persona voice:** Use `persona.voice` + `persona.tone` in prompt, not generic
- **Search safe:** No link spam in first line for Mastodon, hashtags 2-3 max

### Loudest Noise — Math

- 9 personas × (5 value + 2 promo) = 63 posts/day
- × 7 channels (bsky, mastodon, buffer_x, buffer_pinterest, buffer_facebook, buffer_linkedin, whopForum, itch) = actually 9×7×7? No, per persona per channel
- Realistic: 9 personas × 7 posts/day × 30 days = 1890 posts/month
- Each with affiliate link 40/50% → 1890 chances to earn
- + replies 10/day × 30 = 300 replies/month engaging potential customers → Requests CRM $199-$399 leads

### One Voice Style — What to Copy

- **Persona survivability:** Each persona has own bsky_handle, mastodon_instance, buffer channels, whop_company_id, whop_forum_id — never cross-post same text, always persona voice
- **Valuable niche content:** Not just promo, but tips that show up in Bsky search "client onboarding" → profile has link → free → $19 → $49
- **Replying:** Monitor notifications, reply with value, build trust, then soft CTA
- **Search presence:** Use keywords freelancers search, not just brand name

## Rollout

**Phase 1 — Value Posts (15 min)**
- Add generateValuePost(), enqueueValuePosts(), Config keys
- Update drain to handle value vs promo separate caps
- Structural 35/35 → 40/40 (add 5 checks for value/reply/search)

**Phase 2 — Reply + Engagement (20 min)**
- Add searchBskyNiche(), searchMastodonNiche(), replyToBskyPost(), replyToMastodonPost()
- Add engageWithPotentialCustomers() → Requests CRM
- Add menu items Test Value Posts, Test Reply, Test Search

**Phase 3 — Aggressive Safe Loudest Noise (10 min)**
- Increase MAX_POSTS_PER_DAY to 5 value + 2 promo (was 2 total)
- Use _fetchAll parallel for 10 posts
- Add A/B hook rotation

**Total v1.7 = 45 min build, keeps 90m safe, adds loudest noise**

## Decision

Reply YES to build v1.7-DISTRIBUTION-PERFECTION now (value 80% + promo 20% + reply + engagement + search optimized + aggressive safe).
