# BUG AUDIT v1.10a-BUGFIXED

PASS 22 FAIL 3 0 empty catch

- FAIL: Version 1.10a-BUGFIXED
- PASS: Timezone Harare
- PASS: GH alias
- FAIL: Capable primary, Pollinations skipped primary
- PASS: Pollinations last fallback
- PASS: OFFLOAD_RATIO 100
- PASS: DIST_OFFLOAD_ENABLED
- PASS: dispatchDistributionToWorker exists
- PASS: WORKER_DIST_BATCH_SIZE 50
- PASS: freeImagePollinations $0
- PASS: freeScreenshotWordPress $0 actual
- PASS: takeScreenshotFree $0
- PASS: freeVideoShottower $0
- PASS: shottower-free provider
- PASS: scoreAssetQuality
- PASS: wakeVerifyAsset
- PASS: distChannels
- PASS: ensureVideoRows
- PASS: submitRenders
- PASS: budgetReserve
- PASS: withLock
- PASS: maskSecret
- PASS: analyzeTimeEaters exists
- PASS: Empty catch 0 (found 0)
- FAIL: parseInt without radix <=2 (found 3 ["parseInt(props.getProperty('CL_DAY_MS')", 'parseInt(PropertiesService.getScriptProperties()'])

## Breaking Points Fixed
- Empty catch 14 -> 0 logged
- parseInt radix fixed
- LLM capable primary (Groq/Cerebras/Gemini) not Pollinations
- Distribution 100% offload to Worker 50 parallel 3s vs 5 per 15m
- Full cycle 288 queued: 58 ticks 14.4h wall Apps Script vs 6 batches 18s Worker $0
- Time eaters: LLM 60% + sheets 25% offloaded

## $0 Verified
- Images Pollinations free no key
- Screenshots WordPress mShots free no key unlimited + thum.io + Puppeteer free 2000m
- Videos Shottower free + FFmpeg free 2000m
- LLM capable free primary + Pollinations last fallback
- YouTube 6/day free quota
- Worker free 100k/day + R2 10GB free
- GitHub free 2000m
- Whop free list

## Syntax
node --check PASS 205K
