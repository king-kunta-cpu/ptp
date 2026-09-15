# Cedar Loom v2.0 — FACTORY

New canvas: new Apps Script + new spreadsheet + real manufacturing + honest claims.

```
v2/
  factory/cedar-loom-v2.gs     the brain (Apps Script): research → briefs → dispatch builds →
                               distribution (7-9 posts/persona/day) → replies → zap fulfillment →
                               Whop revenue polling (central + 9 persona stores)
  worker/worker.js             Cloudflare Worker: persona landings, 9 free tools, short links,
                               Lightning zap hub (claim page, invoice, webhook)
  worker/wrangler.toml         worker config (KV + vars; secrets via wrangler secret put)
  actions/heavy-build-v2.js    GitHub Actions: REAL Notion manufacturing (page+DBs+rows+dashboard),
                               public link, PDF+README zip → Drive, screenshot, Whop product,
                               landing on worker, short link, zap meta; weekend ffmpeg videos
  .github/workflows/v2-factory.yml   v2-build (dispatch), v2-video (Sat/Sun 20:00 UTC), v2-noop
  tools/{9 personas}.html      the 9 free client-side tools (replace CONTACT with each mailbox)
  docs/SETUP-v2.md             the 2-hour setup (read this first)
  docs/PERSONAS-v2.md          the 9 personas, niches, keywords, daily plan
```

## Hard rules baked into the code

1. **No fake URLs.** A promo post can only link an asset whose Notion page exists and was read back. Shortfalls roll to a backfill queue; a persona never posts a phantom asset.
2. **No fabricated claims.** A claim scanner bans invented ratings/review counts/user counts/fake deadlines in every LLM output, Whop description, and landing. Landings carry real spec facts (real DB/property/row counts) + custom-work CTA + zap tip.
3. **Whop stays the primary paid rail** (card + native crypto, 1.5%). Lightning is the extra route (coinos invoice → webhook → auto email delivery) + tip jar everywhere.
4. **Personas are transparent Cedar Loom sub-brands** — own niche, own store, own channels, own domain surface (blogspot identity + worker product surface). No cross-links between personas, no shared contact, no fake personas.
5. **Quota-safe:** heavy manufacturing runs on GitHub Actions (free, public repo), distribution in the factory (light fetches), hosting on the Worker free tier. Apps Script budget 45m/85m stays with headroom.

## Pipeline

research (batch LLM, per niche, judge ≥7) → briefs (full spec: free + premium schema, judge ≥8)
→ GitHub Actions: real Notion workspace → public link → PDF zip → Drive → Whop (persona store)
→ landing on worker + short link + zap meta → LISTED (only after read-back verify)
→ daily plan per persona (2 free + 1 paid + 1 tool + 3 value + ≤5 replies, randomized 08:00–21:15 Harare)
→ drain to channels (Bsky / Mastodon / Buffer X-Pinterest-FB-LI / dev.to / Hashnode)
→ coinos zap webhooks → email delivery + Revenue
→ Whop revenue polling (hourly, central + 9 stores) → Discord digest 21:00
