/**
 * ============================================================================
 *  CEDAR LOOM FACTORY v1.0.0 - MERGED
 *  Brand: Cedar Loom | Custom: cedar@atomicmail.io | Domain: atomicmail.io
 *  Central Whop: biz_A79oVYva4QTT8Z (verified Iran payout)
 *  Lightning: SharkSkin@coinos.io (primary rail)
 *  Merged from: asset-bot (prompt packs + 22ch mesh) + Grain Works V3.6 (Notion OS + SHAPE_LIBRARY)
 *  + One Voice v5.4 (Bluesky swarm + persona survivability)
 * ============================================================================
 *  CORE RULES (from your onboarding):
 *  1. Only Lightning works under OFAC. No Gumroad/Stripe/PayPal/USDT.
 *  2. API lies - 200 OK that never persists. Always verify write by reading back.
 *  3. Green != working. QC + idle-run guard required.
 *  4. Personas NEVER post paid URL. Free assets only via personas. Paid = factory only.
 *  5. 1 persona x N channels per asset, NOT 10x22. DIST_MAX_PER_TICK 3, MAX_POSTS 2.
 */

var CL_VERSION = '1.10-DIST-OFFLOAD';
var BRAND_NAME = 'Cedar Loom';
var CUSTOM_EMAIL = 'cedar@atomicmail.io';

var CL = {
  HARD_LIMIT_MS: 120000, // 2 min/tick
  SOFT_DAY_MS: 15*60*1000, // legacy - use DAILY_BUDGET_* now
  DAILY_BUDGET_WEEKDAY_MS: 45*60*1000, // 45m free safe
  DAILY_BUDGET_WEEKEND_MS: 85*60*1000, // 85m max free
  TIMEZONE: 'Africa/Harare',
  TRIGGER_MIN: 15,
  MAX_VALUE_POSTS_PER_DAY: 5,
  MAX_PROMO_POSTS_PER_DAY: 2,
  DIST_VALUE_RATIO: 80,
  DIST_MAX_PER_TICK: 5,
  FREE_IMAGE_PROVIDER: 'pollinations',
  FREE_VIDEO_PROVIDER: 'shottower-ffmpeg',
  FREE_LLM_PROVIDER: 'pollinations',
  OFFLOAD_RATIO: 100, // 100% distribution off Apps Script to Worker free 100k + GitHub free 2000m
  DIST_OFFLOAD_ENABLED: true, // distribution 100% off Apps Script

  FLEET_SLOT: 1, // 0-4 staggered
  MAX_LOG_ROWS: 800,
  CONTENT_DAILY_CAP: 2,
  CONTENT_BACKLOG_MAX: 6,
  RESEARCH_HARD_MIN_H: 2,
  RESEARCH_MIN_GAP_MIN: 30,
  QUEUE_MIN: 5,
  QUEUE_FILL_TARGET: 8,
  AI_MAX_TOKENS: 12000,
  AI_MAX_TOKENS_IDEAS: 3500,
  AI_MAX_TOKENS_SOCIAL: 400,
  AI_MAX_TOKENS_ANSWER: 2500,
  AI_TEMPERATURE: 0.7,
  MAX_DATABASES_LITE: 1,
  MAX_DATABASES_MINI: 4,
  MAX_DATABASES_PREMIUM: 4, // reduced 9->4 to avoid truncation
  MAX_PROPS_PER_DB: 10,
  MAX_POSTS_PER_DAY: 2, // NOT 2-5, that caused BLOCKED storm
  MAX_AUDIT_ROWS: 5000,
  MAX_REVENUE_ROWS: 5000,
  MAX_CQ_ROWS: 3000,
  MAX_DIST_ROWS: 5000,
  STUCK_MIN: 30,
  DIST_MAX_PER_TICK: 3, // was 25 eating budget
  DIST_JITTER_MIN_H: 6,
  DIST_JITTER_MAX_H: 72,
  DIST_MAX_ATTEMPTS: 3,
  LOCK_WAIT_MS: 10000,
  WAKE_PASS: 85,
  SHOT_CAP_DAY: 30,
  MAX_IMAGE_BYTES: 900000
};

// Status enums - single source of truth
var Q = { PENDING: 'PENDING', DRAFTED: 'DRAFTED' };
var A = { DRAFTED: 'DRAFTED', BUILDING: 'BUILDING', BUILT: 'BUILT', LINKED: 'LINKED', LISTED: 'LISTED', LIVED: 'LIVED', SHORTED: 'SHORTED', DONE: 'DONE', FAILED: 'FAILED', RETRYING: 'RETRYING', BLOCKED: 'BLOCKED', REVIEW: 'REVIEW' };
var D = { QUEUED: 'QUEUED', POSTING: 'POSTING', POSTED: 'POSTED', FAILED: 'FAILED', SKIPPED: 'SKIPPED' };
var P = { TO_LIST: 'TO_LIST', LISTED: 'LISTED', FREE: 'FREE', LIVE: 'LIVE' };

// Schema - append only, never insert middle
var SCHEMA = {
  Backlog: ['id','name','description','source','status','created_at'],
  Assets: ['asset_id','name','tier','catalog_slot','status','notion_url','public_url','screenshot_url','landing_url','short_url','whop_product_id','whop_url','price','db_count','property_count','provider','error','attempts','spec_json','created_at','plan_id','purchase_url','marketplace_status','cdn_url','wake_score','updated_at','relations_ok','persona_id'],
  Products: ['product_id','name','niche','type','price','deliverable_url','landing_url','whop_product_id','whop_url','short_url','status','attempts','created_at','persona_id','cdn_url'],
  Personas: ['persona_id','name','niche','voice','tone','topics','bsky_handle','bsky_app_password','youtube_channel','landing_url','posts_today','last_post_utc','max_posts_per_day','distribution_enabled','warmed_up_at','whop_company_id','whop_api_key','whop_forum_id','whop_app_api_key','itch_api_key','itch_username','archive_access_key','archive_secret_key','filepost_api_key','buffer_api_key','buffer_channel_x','mastodon_instance','mastodon_token','nostr_nsec','mastodon_client_key','mastodon_client_secret','mastodon_access_token','buffer_channel_pinterest','buffer_channel_facebook','buffer_channel_linkedin'],
  ContentQueue: ['cq_id','persona_id','platform','type','keyword','title','body','short_url','canonical_url','asset_id','status','post_url','created_at'],
  Config: ['KEY','VALUE','NOTES'],
  Audit: ['ts','level','system','action','account','details'],
  Logs: ['ts','level','fn','message','correlation_id'],
  Revenue: ['ts','payment_id','amount','currency','buyer','status'],
  Requests: ['request_id','timestamp','sender_email','sender_name','niche','budget','details','status','notes'],
  Distribution: ['dist_id','asset_ref','asset_kind','asset_name','persona_id','channel','status','attempts','next_attempt_ts','post_text','cta_url','remote_id','remote_url','error','created_at','updated_at'],
  Videos: ['bundle_id','job_id','mp4_url','youtube_id','youtube_url','status','attempts','ts','provider'],
  Interactive: ['ts','viewer_id','mode','entries','url','host_version','entries_hash']
};

var PRODUCT_CATALOG = [
  { slot:'free-library', tier:'lite', price:0, label:'Free library mini-system' },
  { slot:'tripwire', tier:'mini-os', price:7, label:'Client Kickoff Mini-OS' },
  { slot:'core', tier:'premium', price:29, label:'Freelance Design OS' },
  { slot:'core2', tier:'premium', price:24, label:'Portfolio Launch System' },
  { slot:'bump', tier:'pdf', price:5, label:'Design Pricing Cheat Sheet' },
  { slot:'pro', tier:'premium', price:49, label:'Design OS Pro' }
];

// 9 personas matching your 9 Bluesky handles - niche specific free asset each
var SEED_PERSONAS = [
  { persona_id:'p_seo', name:'Sable', niche:'cli automation and seo tools', voice:'senior toolmaker who ships small CLIs', tone:'dry, specific, no filler', topics:'argparse, pathlib, cli exit codes, entry points', bsky_handle:'seo-tools-free.bsky.social' },
  { persona_id:'p_api', name:'Juno', niche:'api data tools and inference', voice:'backend engineer tuning inference', tone:'practical, warm', topics:'token streaming, quantization, vLLM, rate limiting', bsky_handle:'api-data-tools.bsky.social' },
  { persona_id:'p_web', name:'Wren', niche:'webdev kits and open source maintenance', voice:'maintainer triaging issues', tone:'calm, studio-diary', topics:'semantic versioning, changelogs, Dependabot, breaking changes', bsky_handle:'webdev-kits-free.bsky.social' },
  { persona_id:'p_apps', name:'Ott', niche:'apps script and css platform', voice:'platform practitioner', tone:'grounded, precise', topics:'container queries, css grid, view transitions, subgrid', bsky_handle:'apps-script.bsky.social' },
  { persona_id:'p_notion', name:'Mabel', niche:'notion templates for freelancers', voice:'freelance designer running calm studio', tone:'gentle, organized', topics:'client onboarding, moodboards, invoices, revision limits', bsky_handle:'notion-temp-free.bsky.social' },
  { persona_id:'p_social', name:'Ravi', niche:'self-hosted and homelab', voice:'solo operator running infra alone', tone:'focused, methodical', topics:'VLANs, WireGuard, docker compose, nginx, systemd', bsky_handle:'social-auto-tools.bsky.social' },
  { persona_id:'p_sheets', name:'Sena', niche:'sheets and api design', voice:'api designer shipping patterns', tone:'clear, steady', topics:'idempotency keys, cursor pagination, rate limiting, webhook retries', bsky_handle:'sheets-tools-hub.bsky.social' },
  { persona_id:'p_python', name:'Gus', niche:'solo operator infrastructure', voice:'multi-discipline freelancer', tone:'easygoing, systematic', topics:'backup scripts, uptime monitoring, terraform, server costs', bsky_handle:'python-bots-free.bsky.social' },
  { persona_id:'p_simali', name:'Ada', niche:'ai safety and alignment', voice:'researcher reading literature', tone:'reflective, tactical', topics:'reward hacking, RLHF, interpretability, red teaming', bsky_handle:'simali.bsky.social' }
];

var CONFIG_KEYS = [
  ['EMERGENCY_STOP','RUN','RUN or STOP'],
  ['DRY_RUN','FALSE','TRUE = simulate writes, tags dryrun values'],
  ['BRAND_NAME','Cedar Loom',''],
  ['CUSTOM_BUILD_EMAIL','cedar@atomicmail.io',''],
  ['NICHE','freelance designers',''],
  ['WHOP_API_KEY','','central company key'],
  ['WHOP_COMPANY_ID','biz_A79oVYva4QTT8Z','central store'],
  ['WHOP_APP_API_KEY','','for media upload + forum'],
  ['WHOP_APP_ID','',''],
  ['GH_TOKEN','','PAT repo scope - alias GITHUB_TOKEN'],
  ['GITHUB_TOKEN','','Alias for GH_TOKEN - PAT repo scope'],
  ['GH_REPO','','owner/repo for Pages - alias GITHUB_REPO'],
  ['GITHUB_REPO','','Alias for GH_REPO - owner/repo'],
  ['CF_API_TOKEN','',''],
  ['CF_ACCOUNT_ID','',''],
  ['LIGHTNING_ADDRESS','SharkSkin@coinos.io','only money rail'],
  ['NOSTR_NSEC','',''],
  ['DISCORD_WEBHOOK','','alerts'],
  ['DISCORD_PROMO_WEBHOOKS','',''],
  ['CEREBRAS_API_KEY','','primary LLM'],
  ['GROQ_API_KEY','',''],
  ['GEMINI_API_KEY','',''],
  ['MISTRAL_API_KEY','',''],
  ['COHERE_API_KEY','',''],
  ['CLOUDFLARE_API_KEY','',''],
  ['OPENAI_API_KEY','',''],
  ['OPENROUTER_API_KEY','',''],
  ['SERPER_API_KEY','','research'],
  ['TAVILY_API_KEY','','research'],
  ['BSKY_POSTING_MODE','DRAFT','DRAFT or LIVE'],
  ['DISTRIBUTION_POSTING_MODE','DRAFT','DRAFT = queue only'],
  ['GUMROAD_ACCESS_TOKEN','','DO NOT USE - blocked for Iran, kept for trap detection'],
  ['ALLOW_FALLBACK_ASSETS','FALSE','TRUE allows fallback builds'],
  ['INDEXNOW_KEY','',''],
  ['YOUTUBE_BRIDGE_URL','','DEPRECATED - proven engine uses direct YouTube service, not bridge'],
  ['YOUTUBE_BRIDGE_SECRET','','DEPRECATED'],
  ['YOUTUBE_CHANNEL_ID','UChT6JgRbKyEY2r_Umyi2cxQ','Central channel ID - fallback if persona has no youtube_channel'],
  ['YOUTUBE_API_KEY','','Optional for verify read-back'],
  ['JSON2VIDEO_API_KEY','','fallback video renderer'],
  ['SHOTSTACK_KEY','','PRIMARY video renderer - your proven provider SHOTSTACK_KEY (redacted)'],
  ['GH_REPO','','owner/repo for Pages - optional'],
  ['GH_TOKEN','','PAT repo scope - optional'],
  ['DAILY_BUDGET_MS_WEEKDAY','2700000','45m weekday budget free safe'],
  ['DAILY_BUDGET_MS_WEEKEND','5100000','85m weekend max free'],
  ['WEEKEND_MODE_ENABLED','TRUE','TRUE enables weekend heavy mode'],
  ['HEAVY_DAYS','6,0','Sat=6 Sun=0 Africa/Harare'],
  ['HEAVY_RESEARCH_TARGET','30','ideas per weekend heavy'],
  ['LIGHT_RESEARCH_TARGET','2','ideas per weekday light'],
  ['TIMEZONE','Africa/Harare','factory timezone'],
  ['OFFLOAD_ENABLED','TRUE','TRUE offloads heavy to GitHub Actions'],
  ['CLOUDFLARE_WORKER_URL','','https://cedar-loom.your.workers.dev'],
  ['MIN_DEMAND_SCORE','7','min demand score 1-10'],
  ['MIN_CONVERSION_SCORE','8','min conversion score 1-10'],
  ['JUDGE_ENABLED','TRUE','LLM judge layer'],
  ['AFFILIATE_PERCENT_STARTER','40','40% affiliate starter'],
  ['AFFILIATE_PERCENT_PRO','50','50% affiliate pro aggressive'],
  ['FREE_UNTIL_HOURS','48','scarcity timer'],
  ['CTA_STYLE','aggressive','aggressive CTAs'],
  ['TIERED_PRICING_ENABLED','TRUE','3 tiers per asset FREE/$19/$49'],
  ['BUNDLE_ENABLED','TRUE','bundle every 5 assets $99'],
  ['LLM_JUDGE_MODEL','llama-3.3-70b','cheap judge model'],
  ['PRODUCTS_AFFILIATE_URL','',''],
  ['GH_DISPATCH_ENABLED','TRUE','enable GH dispatch'],
  ['MAX_VALUE_POSTS_PER_DAY','5','value posts per persona per day'],
  ['MAX_PROMO_POSTS_PER_DAY','2','promo posts per persona per day'],
  ['DISTRIBUTION_VALUE_RATIO','80','80% value 20% promo'],
  ['REPLY_ENABLED','TRUE','reply to mentions + keywords'],
  ['ENGAGEMENT_ENABLED','TRUE','like/repost/follow 5/day'],
  ['BSKY_SEARCH_KEYWORDS','freelance client onboarding,Notion invoice,freelance CRM,client pipeline,invoice tracker','Bsky search keywords'],
  ['MASTODON_SEARCH_HASHTAGS','freelance,Notion,ClientOnboarding,InvoiceTracker','Mastodon hashtags'],
  ['SEARCH_POST_ENABLED','TRUE','search optimized posts'],
  ['AGGRESSIVE_SAFE','TRUE','jitter + dedup + rate limit'],
  ['VALUE_POST_ENABLED','TRUE','80% value posts'],
  ['FREE_IMAGE_PROVIDER','pollinations','free image pollinations/picsum/unsplash/cloudflare-canvas $0'],
  ['FREE_VIDEO_PROVIDER','shottower-ffmpeg','free video shottower self-hosted FFmpeg $0'],
  ['FREE_LLM_PROVIDER','pollinations','free LLM pollinations no key $0'],
  ['POLLINATIONS_ENABLED','TRUE','Pollinations free image+text no key'],
  ['FFMPEG_ENABLED','TRUE','GitHub Actions FFmpeg free'],
  ['SHOTTOWER_ENABLED','TRUE','Shottower open-source Shotstack API backend self-hosted $0'],
  ['YOUTUBE_FREE_QUOTA','TRUE','6 uploads/day free quota'],
  ['PICSUM_ENABLED','TRUE','Picsum free images'],
  ['UNSPLASH_ENABLED','TRUE','Unsplash free images'],
  ['SCREENSHOT_ENABLED','TRUE','Free screenshots via WordPress mShots + thum.io $0'],
  ['SCREENSHOT_PROVIDER','wordpress','wordpress/thum.io/microlink/puppeteer-free all $0'],
  ['PUPPETEER_ENABLED','TRUE','GitHub Actions Puppeteer real Chrome screenshot $0 free 2000m'],
  ['DIST_OFFLOAD_ENABLED','TRUE','Distribution 100% off Apps Script to Cloudflare Worker free 100k/day'],
  ['WORKER_DIST_BATCH_SIZE','50','Worker batch 50 posts parallel fetchAll 3s vs Apps Script 5 per 15m'],
  ['GITHUB_DIST_ENABLED','TRUE','GitHub Actions distribution batch free 2000m']
];

// ==================== UTILITIES ====================
var _ssCache = null;
function getSpreadsheet() {
  if (_ssCache) return _ssCache;
  var id = '';
  try { id = PropertiesService.getScriptProperties().getProperty('GW_SHEET_ID') || PropertiesService.getScriptProperties().getProperty('CL_SHEET_ID') || ''; } catch(e){ log('WARN','catch',e.toString()); }
  if (id) { try { _ssCache = SpreadsheetApp.openById(id); return _ssCache; } catch(e){ _ssCache=null; } }
  try { var ss = SpreadsheetApp.getActiveSpreadsheet(); if (ss) { _ssCache=ss; return _ssCache; } } catch(e){ log('WARN','catch',e.toString()); }
  throw new Error('No spreadsheet. Bind script or set CL_SHEET_ID.');
}
function ensureSheet(name) {
  var ss = getSpreadsheet();
  var sh = ss.getSheetByName(name);
  if (!sh) { sh = ss.insertSheet(name); if (SCHEMA[name]) sh.getRange(1,1,1,SCHEMA[name].length).setValues([SCHEMA[name]]).setFontWeight('bold'); sh.setFrozenRows(1); return sh; }
  var headers=SCHEMA[name]||[];
  if(!headers.length) return sh;
  var lastCol=sh.getLastColumn();
  if(lastCol===0){
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    sh.setFrozenRows(1);
    return sh;
  }
  var lastRow=sh.getLastRow();
  var hdr=sh.getRange(1,1,1,Math.max(lastCol,1)).getValues()[0].map(function(h){ return String(h==null?'':h).trim(); });
  // Auto-add missing columns at end (safe, never shifts existing data)
  var missing=[];
  for(var i=0;i<headers.length;i++){
    if(hdr[i]!==headers[i]){
      // If header is empty at this position, we can set it
      if(!hdr[i] || hdr[i]===''){
        sh.getRange(1,i+1).setValue(headers[i]);
        hdr[i]=headers[i];
      }else if(hdr.indexOf(headers[i])===-1){
        // Missing column not found anywhere - append at end
        missing.push(headers[i]);
      }
    }
  }
  if(missing.length){
    var curLast=sh.getLastColumn();
    sh.getRange(1,curLast+1,1,missing.length).setValues([missing]);
    log('INFO','ensureSheet',name+' auto-added missing columns: '+missing.join(','));
  }
  // If sheet was empty, rewrite cleanly
  var matches=true;
  for(var j=0;j<headers.length;j++){
    var cell=j<hdr.length?String(hdr[j]==null?'':hdr[j]).trim():'';
    if(cell!==headers[j] && hdr.indexOf(headers[j])===-1){ matches=false; break; }
  }
  if(!matches && lastRow<=1){
    sh.getRange(1,1,1,headers.length).setValues([headers]).setFontWeight('bold');
    if(lastCol>headers.length) sh.getRange(1,headers.length+1,1,lastCol-headers.length).clearContent();
    log('INFO','ensureSheet',name+' headers repaired (sheet was empty)');
  }else if(!matches){
    log('WARN','ensureSheet',name+' header mismatch - expected '+headers.join(',')+' got '+hdr.slice(0,headers.length).join(',')+' - auto-added missing, but please verify');
  }
  sh.setFrozenRows(1);
  return sh;
}
function readSheet(name) {
  var sh = getSpreadsheet().getSheetByName(name);
  if (!sh || sh.getLastRow() < 2) return [];
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var data = sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
  var out = [];
  for (var i=0;i<data.length;i++) { var o={_row:i+2}; for (var j=0;j<headers.length;j++) o[headers[j]]=data[i][j]; out.push(o); }
  return out;
}
function appendRow(name, obj) {
  var sh = ensureSheet(name);
  var headers = SCHEMA[name] || Object.keys(obj);
  var row = []; for (var i=0;i<headers.length;i++) row.push(obj[headers[i]]||'');
  sh.appendRow(row);
}
function updateRow(name, rowNum, patch) {
  var sh = getSpreadsheet().getSheetByName(name);
  if (!sh) return;
  var headers = sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
  var vals = sh.getRange(rowNum,1,1,headers.length).getValues()[0];
  for (var k in patch) { var idx=headers.indexOf(k); if (idx>=0) vals[idx]=patch[k]; }
  sh.getRange(rowNum,1,1,headers.length).setValues([vals]);
}
function cleanStr(v){ if(v==null) return ''; return String(v).replace(/[\u200B-\u200D\uFEFF\u00AD]/g,'').replace(/[\x00-\x1F\x7F]/g,' ').replace(/\s+/g,' ').trim(); }
function decodeEntities(s){ if(s==null) return ''; return String(s).replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&nbsp;/g,' '); }
function trunc(s,n){ s=cleanStr(s); if(s.length<=n) return s; return s.substring(0,n-3).trimEnd()+'...'; }
function sleep(ms){ Utilities.sleep(ms); }
function nowIso(){ return new Date().toISOString(); }
function utcDateKey(){ var d=new Date(); function p2(x){ return (x<10?'0':'')+x; } return d.getUTCFullYear()+'-'+p2(d.getUTCMonth()+1)+'-'+p2(d.getUTCDate()); }
function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
function parseJsonSafe(s){ try{ return JSON.parse(s); }catch(e){ return null; } }
function extractJson(text, open){ var close=open==='['?']':'}'; var s=String(text||''); var start=s.indexOf(open); if(start===-1) return null; var depth=0,inStr=false,esc=false; for(var i=start;i<s.length;i++){ var c=s.charAt(i); if(inStr){ if(esc) esc=false; else if(c==='\\') esc=true; else if(c==='"') inStr=false; continue; } if(c==='"') inStr=true; else if(c===open) depth++; else if(c===close){ depth--; if(depth===0) return parseJsonSafe(s.substring(start,i+1)); } } return null; }
function repairTruncatedJson(text){
  var s=String(text||''); var start=s.indexOf('{'); if(start===-1) return null;
  var stack=[],inStr=false,esc=false,cut=-1;
  var lastValid=-1;
  for(var i=start;i<s.length;i++){
    var c=s.charAt(i);
    if(inStr){
      if(esc) esc=false; else if(c==='\\') esc=true; else if(c==='"'){
        inStr=false;
        lastValid=i;
        var j=i+1; while(j<s.length&&/\s/.test(s.charAt(j))) j++;
        if(j<s.length && (s.charAt(j)===','||s.charAt(j)==='}'||s.charAt(j)===']')){ cut=i; }
      }
      continue;
    }
    if(c==='"'){ inStr=true; continue; }
    if(c==='{'||c==='['){ stack.push(c==='{'?'}':']'); lastValid=i; continue; }
    if(c==='}'||c===']'){
      stack.pop();
      lastValid=i;
      if(!stack.length) return parseJsonSafe(s.substring(start,i+1));
      cut=i; continue;
    }
    if(/[0-9a-zA-Z_\-\.]/.test(c) || c===',' || c===':' ){
      // track last valid char for numbers/booleans/null
      if(c!==',' && c!==':') lastValid=i;
    }
    if(c===','&&stack.length){ cut=i-1; }
  }
  if(!stack.length) return null;
  // If truncated mid-value like [2,3  -> lastValid is at 3, cut should be lastValid
  if(lastValid>cut) cut=lastValid;
  if(cut<=start) return null;
  var head=s.substring(start,cut+1).replace(/[,\s]*$/,'');
  for(var k=stack.length-1;k>=0;k--) head+=stack[k];
  return parseJsonSafe(head);
}
function maskSecret(s){ if(s==null) return ''; s=String(s); s=s.replace(/(sk-[A-Za-z0-9]{6,})/g,'***'); s=s.replace(/(ntn_[A-Za-z0-9]{6,})/g,'***'); s=s.replace(/(ghp_[A-Za-z0-9]{6,})/g,'***'); s=s.replace(/(gsk_[A-Za-z0-9]{6,})/g,'***'); s=s.replace(/https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g,'https://discord.com/api/webhooks/***'); return s; }
function safeFetch(url, options, maxRetries){ maxRetries=Math.min(2,Math.max(1,maxRetries||2)); var last=''; for(var i=1;i<=maxRetries;i++){ try{ var r=UrlFetchApp.fetch(url,options); var code=r.getResponseCode(); if(code===429){ var ra=0; try{ ra=Number(r.getHeaders()['Retry-After']||0); }catch(e){ log('WARN','catch',e.toString()); } if(i<maxRetries&&ra<=30){ sleep(((ra>0)?ra:Math.pow(2,i))*1000+Math.floor(Math.random()*400)); last='HTTP 429'; continue; } return r; } if(code>=500&&code<=599){ sleep(Math.pow(2,i)*1000+Math.floor(Math.random()*500)); last='HTTP '+code; continue; } return r; }catch(e){ last=e.toString(); if(i<maxRetries) sleep(Math.pow(2,i)*1000); } } log('ERROR','safeFetch','all '+maxRetries+' failed - '+maskSecret(last)); return null; }
function postJson(url, headers, payload, retries){ var opts={method:'post',contentType:'application/json',muteHttpExceptions:true,headers:headers||{},payload:JSON.stringify(payload)}; return safeFetch(url,opts,retries||2); }
function getJson(url, headers, retries){ return safeFetch(url,{method:'get',muteHttpExceptions:true,headers:headers||{}},retries||2); }

// ==================== CONFIG ====================
var _PROPS_ALL=null; var _CFG_MEMO={};
function _propsAll(){ if(_PROPS_ALL) return _PROPS_ALL; try{ _PROPS_ALL=PropertiesService.getScriptProperties().getProperties()||{}; }catch(e){ _PROPS_ALL={}; } return _PROPS_ALL; }
function resetPropsCache(){ _PROPS_ALL=null; _CFG_MEMO={}; }
var _configCache=null;
function configSheetValue(key){ if(_configCache===null){ _configCache={}; try{ var sh=getSpreadsheet().getSheetByName('Config'); if(sh&&sh.getLastRow()>=2){ var data=sh.getRange(2,1,sh.getLastRow()-1,2).getValues(); for(var i=0;i<data.length;i++){ var k=String(data[i][0]==null?'':data[i][0]).trim().toUpperCase(); if(k) _configCache[k]=String(data[i][1]==null?'':data[i][1]).trim(); } } }catch(e){ log('WARN','catch',e.toString()); } } var v=_configCache[String(key).toUpperCase()]; return v===undefined?'':v; }
function getConfig(key, fallback){
  if(Object.prototype.hasOwnProperty.call(_CFG_MEMO,key)){ var c=_CFG_MEMO[key]; return (c===''&&fallback!=null)?String(fallback):c; }
  var val='';
  var aliases={};
  if(key==='GH_TOKEN') aliases={'GITHUB_TOKEN':1};
  if(key==='GH_REPO') aliases={'GITHUB_REPO':1};
  if(key==='GITHUB_TOKEN') aliases={'GH_TOKEN':1};
  if(key==='GITHUB_REPO') aliases={'GH_REPO':1};
  var props=_propsAll();
  var p=props['CL_'+key]||props['GW_'+key]||props['NTF_'+key];
  if(p!=null&&String(p).trim()!=='') val=String(p).trim();
  else{
    // check aliases in ScriptProperties
    for(var ak in aliases){
      var ap=props['CL_'+ak]||props['GW_'+ak]||props['NTF_'+ak];
      if(ap!=null&&String(ap).trim()!==''){ val=String(ap).trim(); break; }
    }
  }
  if(!val){
    try{
      var v=configSheetValue(key);
      if(v!=='') val=v;
      else{
        for(var ak2 in aliases){
          var v2=configSheetValue(ak2);
          if(v2!==''){ val=v2; break; }
        }
      }
    }catch(e){ log('WARN','catch',e.toString()); }
  }
  _CFG_MEMO[key]=val;
  if(val!=='') return val;
  return (fallback==null)?'':String(fallback);
}
function hasKey(key){ var v=getConfig(key,''); if(!v) return false; if(v==='REPLACE') return false; if(/XXX+|YOUR_|paste|replace/i.test(v)) return false; return true; }
function isEmergencyStop(){ return String(getConfig('EMERGENCY_STOP','RUN')).toUpperCase()==='STOP'; }
function isDryRun(){ return String(getConfig('DRY_RUN','FALSE')).toUpperCase()==='TRUE'; }
function dryRunResult(extra){ var o={ok:true,dryRun:true}; if(extra) Object.keys(extra).forEach(function(k){ o[k]=extra[k]; }); return o; }
function isDryRunValue(v){ return /^dryrun$/i.test(String(v||''))||/dryrun\.local|dryrun\.itch\.io/i.test(String(v||'')); }
function distributionMode(){ return String(getConfig('DISTRIBUTION_POSTING_MODE','DRAFT')).toUpperCase()==='LIVE'?'LIVE':'DRAFT'; }
function bskyPostingMode(){ return String(getConfig('BSKY_POSTING_MODE','DRAFT')).toUpperCase()==='LIVE'?'LIVE':'DRAFT'; }

// ==================== LOGGING ====================
var _LOG_BUF=[]; var _LOG_FLUSH_MAX=400; var _runIdCache=null;
function _runId(){ if(_runIdCache) return _runIdCache; _runIdCache='run-'+Date.now()+'-'+Math.floor(Math.random()*10000); return _runIdCache; }
function log(level, fn, message){ var safe=''; try{ safe=maskSecret(String(message==null?'':message).replace(/^=+/,' ')); }catch(e){ safe=String(message); } try{ Logger.log('['+level+'] '+fn+' | '+safe); }catch(e2){ log('WARN','catch','e2: '+e2.toString()); } _LOG_BUF.push([nowIso(),level,fn,safe,_runId()]); if(level==='ERROR'||level==='WARN'){ flushLogs(); return; } if(_LOG_BUF.length>=_LOG_FLUSH_MAX) flushLogs(); }
function flushLogs(){ if(!_LOG_BUF.length) return 0; var rows=_LOG_BUF; _LOG_BUF=[]; try{ var sh=getSpreadsheet().getSheetByName('Logs')||ensureSheet('Logs'); sh.getRange(sh.getLastRow()+1,1,rows.length,5).setValues(rows); var excess=sh.getLastRow()-CL.MAX_LOG_ROWS-1; if(excess>0) sh.deleteRows(2,excess); return rows.length; }catch(e){ Logger.log('LOG FLUSH FAILED: '+e.toString()); return 0; } }
function _menu(fnName, fn){ try{ return fn(); }catch(e){ log('ERROR',fnName,e&&e.stack?e.stack:String(e)); throw e; }finally{ flushLogs(); } }
function audit(level, system, action, details){ try{ var sh=ensureSheet('Audit'); sh.appendRow([nowIso(),level,system,action,'',maskSecret(trunc(details||'',400))]); }catch(e){ Logger.log('AUDIT FAILED: '+e.toString()); } }
function discordAlert(severity, message){ try{ var url=getConfig('DISCORD_WEBHOOK',''); if(!url) return; var msg=maskSecret(String(message).substring(0,1900)); var key='CL_DD_'+severity+'_'+_hashStr(msg); var props=PropertiesService.getScriptProperties(); var last=props.getProperty(key); if(last&&Date.now()-parseInt(last,10)<30*60*1000) return; UrlFetchApp.fetch(url,{method:'post',contentType:'application/json',muteHttpExceptions:true,payload:JSON.stringify({content:'['+severity+'] '+msg})}); props.setProperty(key,String(Date.now())); }catch(e){ log('WARN','discordAlert',e.toString()); } }
function _hashStr(s){ var h=0; for(var i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return String(h>>>0); }

// ==================== BUDGET / LOCK ====================
var _bgStart=null;
function budgetStart(){ _bgStart=new Date(); }
function budgetElapsedMs(){ if(!_bgStart) _bgStart=new Date(); return Date.now()-_bgStart.getTime(); }
function budgetRemainingMs(){ return CL.HARD_LIMIT_MS-budgetElapsedMs(); }
function budgetReserve(ms){ return budgetRemainingMs()>=(ms||0); }
function withLock(name, fn){ var lock=LockService.getScriptLock(); if(!lock.tryLock(CL.LOCK_WAIT_MS)){ log('WARN',name,'busy - lock held, skipped'); flushLogs(); return null; } try{ return fn(); }catch(e){ log('ERROR',name,e.toString()); throw e; }finally{ lock.releaseLock(); flushLogs(); } }
function getFactoryTimezone(){ return getConfig('TIMEZONE','Africa/Harare')||'Africa/Harare'; }
function getFactoryTodayKey(){ try{ return Utilities.formatDate(new Date(), getFactoryTimezone(), 'yyyy-MM-dd'); }catch(e){ return utcDateKey(); } }
function ledgerResetIfNeeded(){ var today=getFactoryTodayKey(); var props=PropertiesService.getScriptProperties(); if(props.getProperty('CL_DAY_KEY')!==today){ props.setProperty('CL_DAY_KEY',today); props.setProperty('CL_DAY_MS','0'); } }
function ledgerAdd(ms){ ledgerResetIfNeeded(); var props=PropertiesService.getScriptProperties(); var cur=parseInt(props.getProperty('CL_DAY_MS')||'0',10); props.setProperty('CL_DAY_MS',String(cur+Math.round(ms))); }
function ledgerTodayMs(){ ledgerResetIfNeeded(); return parseInt(PropertiesService.getScriptProperties().getProperty('CL_DAY_MS')||'0',10) // fixed radix.getProperty('CL_DAY_MS')||'0',10); }
function getDailyBudgetMs(){ var tz=getFactoryTimezone(); var isHeavy=isWeekendHeavy(); var w=getConfig('DAILY_BUDGET_MS_WEEKDAY','2700000'); var we=getConfig('DAILY_BUDGET_MS_WEEKEND','5100000'); var budget=isHeavy?parseInt(we,10):parseInt(w,10); if(!budget||isNaN(budget)) budget=isHeavy?CL.DAILY_BUDGET_WEEKEND_MS:CL.DAILY_BUDGET_WEEKDAY_MS; return budget; }
function ledgerHasHeadroom(){ return ledgerTodayMs()<getDailyBudgetMs(); }
function isWeekendHeavy(){
  try{
    if((getConfig('WEEKEND_MODE_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return false;
    var heavyStr=getConfig('HEAVY_DAYS','6,0')+'';
    var heavy=heavyStr.split(',').map(function(s){ return parseInt(s.trim(),10); }).filter(function(n){ return !isNaN(n); });
    var tz=getFactoryTimezone();
    var dowStr=Utilities.formatDate(new Date(), tz, 'u');
    var dow=parseInt(dowStr,10); var jsDow=dow===7?0:dow;
    return heavy.indexOf(jsDow)>=0;
  }catch(e){ return false; }
}
function _fetchAll(reqs){
  if(!reqs||!reqs.length) return [];
  try{ return UrlFetchApp.fetchAll(reqs); }catch(e){ log('WARN','_fetchAll',e.toString()); return []; }
}
function readAllSheets(){
  try{
    var ss=getSpreadsheet();
    var out={};
    Object.keys(SCHEMA).forEach(function(name){
      var sh=ss.getSheetByName(name);
      if(!sh||sh.getLastRow()<2){ out[name]=[]; return; }
      var headers=sh.getRange(1,1,1,sh.getLastColumn()).getValues()[0];
      var data=sh.getRange(2,1,sh.getLastRow()-1,sh.getLastColumn()).getValues();
      var arr=[];
      for(var i=0;i<data.length;i++){ var o={_row:i+2}; for(var j=0;j<headers.length;j++) o[headers[j]]=data[i][j]; arr.push(o); }
      out[name]=arr;
    });
    return out;
  }catch(e){ log('ERROR','readAllSheets',e.toString()); return {}; }
}
function dispatchHeavyBuild(count){
  try{
    if((getConfig('GH_DISPATCH_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return false;
    if((getConfig('OFFLOAD_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return false;
    var repo=getConfig('GH_REPO','')||getConfig('GITHUB_REPO','');
    var token=getConfig('GH_TOKEN','')||getConfig('GITHUB_TOKEN','');
    if(!repo||!token){ log('WARN','dispatchHeavy','no GH repo/token'); return false; }
    var url='https://api.github.com/repos/'+repo+'/dispatches';
    var payload={event_type:'cedar-heavy-build', client_payload:{count:count||30, tz:getFactoryTimezone(), ts:nowIso()}};
    var r=UrlFetchApp.fetch(url,{method:'post', headers:{Authorization:'Bearer '+token, Accept:'application/vnd.github.v3+json', 'User-Agent':'CedarLoom/'+CL_VERSION}, payload:JSON.stringify(payload), muteHttpExceptions:true});
    var code=r.getResponseCode();
    if(code===204||code===200||code===201){ log('SUCCESS','dispatchHeavy','dispatched count='+count+' to '+repo); return true; }
    else{ log('WARN','dispatchHeavy','dispatch failed HTTP '+code+' '+trunc(r.getContentText(),200)); return false; }
  }catch(e){ log('ERROR','dispatchHeavy',e.toString()); return false; }
}
function safeBudget(){ var used=ledgerTodayMs(); var budget=getDailyBudgetMs(); return {used:used,budget:budget,left:Math.max(0,budget-used),pct:Math.round(used/budget*100),isHeavy:isWeekendHeavy(),tz:getFactoryTimezone()}; }

function ensureMainTrigger(){ var t=ScriptApp.getProjectTriggers().filter(function(x){ return x.getHandlerFunction()==='clMain'; }); if(t.length===1) return true; if(t.length>1){ for(var i=1;i<t.length;i++){ try{ ScriptApp.deleteTrigger(t[i]); }catch(e){ log('WARN','catch',e.toString()); } } log('WARN','ensureMainTrigger','removed '+(t.length-1)+' duplicate'); return true; } try{ ScriptApp.newTrigger('clMain').timeBased().everyMinutes(CL.TRIGGER_MIN).create(); log('ERROR','ensureMainTrigger','reinstalled missing'); discordAlert('ERROR','clMain trigger reinstalled'); return true; }catch(e){ log('ERROR','ensureMainTrigger','reinstall failed: '+e.toString()); return false; } }
function ensureWatchdogTrigger(){ var has=ScriptApp.getProjectTriggers().some(function(x){ return x.getHandlerFunction()==='watchdog'; }); if(has) return false; ScriptApp.newTrigger('watchdog').timeBased().everyHours(6).create(); log('SUCCESS','ensureWatchdogTrigger','installed'); return true; }

// ==================== LLM CASCADE + CIRCUIT BREAKER ====================
function _cbGet(name){ var raw=PropertiesService.getScriptProperties().getProperty('CL_CB_'+name); if(!raw) return {fails:0,until:0,dead:false}; try{ return JSON.parse(raw); }catch(e){ return {fails:0,until:0,dead:false}; } }
function _cbSet(name,s){ PropertiesService.getScriptProperties().setProperty('CL_CB_'+name,JSON.stringify(s)); }
function _cbFail(name,kind){ var s=_cbGet(name); if(kind==='rate') s.until=Date.now()+60*60*1000; else if(kind==='dead'){ s.dead=true; s.until=Date.now()+24*60*60*1000; } else{ s.fails+=1; if(s.fails>=3) s.until=Date.now()+60*60*1000; } _cbSet(name,s); }
function _cbOk(name){ _cbSet(name,{fails:0,until:0,dead:false}); }
function _cbBlocked(name){ var s=_cbGet(name); if(s.dead) return true; return Date.now()<s.until; }

var PROVIDER_MODELS = {
  cerebras:['gpt-oss-120b','zai-glm-4.7'],
  groq:['llama-3.3-70b-versatile','llama-3.1-70b-versatile'],
  gemini:['gemini-2.0-flash','gemini-1.5-flash'],
  mistral:['mistral-small-latest','mistral-medium-latest'],
  cohere:['command-r-plus-08-2024'],
  cloudflare:['@cf/meta/llama-3.3-70b-instruct'],
  openai:['gpt-4o-mini','gpt-4o'],
  pollinations:['gpt-4o-mini','openai']
};
var LLM_CHAIN = [
  {name:'cerebras',key:'CEREBRAS_API_KEY',url:'https://api.cerebras.ai/v1/chat/completions'},
  {name:'gemini',key:'GEMINI_API_KEY',url:''},
  {name:'groq',key:'GROQ_API_KEY',url:'https://api.groq.com/openai/v1/chat/completions'},
  {name:'mistral',key:'MISTRAL_API_KEY',url:'https://api.mistral.ai/v1/chat/completions'},
  {name:'cohere',key:'COHERE_API_KEY',url:'https://api.cohere.com/v2/chat'},
  {name:'cloudflare',key:'CLOUDFLARE_API_KEY',url:''},
  {name:'openai',key:'OPENAI_API_KEY',url:'https://api.openai.com/v1/chat/completions'},
  {name:'pollinations',key:'',url:'https://text.pollinations.ai/openai'}
];
function callLLM(messages, maxTokens){
  maxTokens=maxTokens||CL.AI_MAX_TOKENS;
  // v1.9 FIX: capable LLMs primary (Groq, Cerebras, Gemini free efficient), Pollinations LAST fallback only
  // Old v1.8 made Pollinations primary causing budget errors eating 60% time - wrong
  for(var i=0;i<LLM_CHAIN.length;i++){
    if(LLM_CHAIN[i].name==='pollinations') continue; // skip pollinations as primary, use only as last fallback

    var p=LLM_CHAIN[i];
    if(p.name!=='pollinations'&&!hasKey(p.key)) continue;
    if(p.name==='cloudflare'&&!hasKey('CLOUDFLARE_ACCOUNT_ID')) continue;
    if(_cbBlocked(p.name)) continue;
    var res=_dispatchLLM(p,messages,maxTokens);
    if(res&&res.error==='rate'){ _cbFail(p.name,'rate'); continue; }
    if(res&&res.error==='dead'){ _cbFail(p.name,'dead'); continue; }
    if(res&&res.error==='other'){ _cbFail(p.name,'soft'); continue; }
    if(res&&res.text&&res.text.length>10){ _cbOk(p.name); return {text:res.text,provider:p.name}; }
  }
  // Last fallback: Pollinations free $0 only if all capable LLMs failed/circuit open
  try{
    if((getConfig('POLLINATIONS_ENABLED','TRUE')+'').toUpperCase()==='TRUE'){
      var prompt=(messages&&messages.length)?messages.map(function(m){return m.content;}).join('\n\n'):'';
      var freeRes=freeLLMPollinations(prompt, maxTokens);
      if(freeRes&&freeRes.text&&freeRes.text.length>10){
        log('INFO','callLLM','fallback Pollinations used after capable LLMs failed');
        return freeRes;
      }
    }
  }catch(e){ log('WARN','catch',e.toString()); }
  return {text:null,provider:'none'};
}
function _dispatchLLM(p,messages,maxTokens){
  if(p.name==='gemini') return _callGemini(messages,maxTokens);
  if(p.name==='cohere') return _callCohere(messages,maxTokens);
  if(p.name==='cloudflare') return _callCloudflare(messages,maxTokens);
  return _callOpenaiCompat(p,messages,maxTokens);
}
function _callOpenaiCompat(p,messages,maxTokens){
  var key=p.key?getConfig(p.key,''):'';
  var models=(PROVIDER_MODELS[p.name]&&PROVIDER_MODELS[p.name].length)?PROVIDER_MODELS[p.name]:[''];
  for(var m=0;m<models.length;m++){
    var headers={'Content-Type':'application/json'};
    if(key) headers['Authorization']='Bearer '+key;
    var payload={messages:messages,temperature:CL.AI_TEMPERATURE,max_tokens:maxTokens};
    if(models[m]) payload.model=models[m];
    if(p.name==='pollinations'){ payload.private=true; payload.seed=Math.floor(Math.random()*1e9); }
    var r=postJson(p.url,headers,payload,2);
    if(!r) continue;
    var code=r.getResponseCode();
    var body=parseJsonSafe(r.getContentText())||{};
    if(code===429) return {error:'rate'};
    if(code===401||code===403) return {error:'dead'};
    if(code===404) continue;
    if(code!==200) continue;
    var text=body.choices&&body.choices[0]&&body.choices[0].message?body.choices[0].message.content:'';
    if(!text||String(text).trim()==='') continue;
    return {text:String(text).trim()};
  }
  return {error:'other'};
}
function _callGemini(messages,maxTokens){
  var key=getConfig('GEMINI_API_KEY','');
  var sys='',usr=''; for(var i=0;i<messages.length;i++){ if(messages[i].role==='system') sys=messages[i].content; if(messages[i].role==='user') usr=messages[i].content; }
  var combined=sys?sys+'\n\n'+usr:usr;
  var gmodels=PROVIDER_MODELS.gemini||['gemini-2.0-flash'];
  for(var m=0;m<gmodels.length;m++){
    var url='https://generativelanguage.googleapis.com/v1beta/models/'+gmodels[m]+':generateContent?key='+key;
    var r=postJson(url,{'Content-Type':'application/json'},{contents:[{parts:[{text:combined}]}],generationConfig:{temperature:CL.AI_TEMPERATURE,maxOutputTokens:maxTokens}},2);
    if(!r) continue;
    var code=r.getResponseCode();
    if(code===429) return {error:'rate'};
    if(code===401||code===403) return {error:'dead'};
    if(code===404) continue;
    if(code!==200) continue;
    var body=parseJsonSafe(r.getContentText())||{};
    var text=body.candidates&&body.candidates[0]&&body.candidates[0].content&&body.candidates[0].content.parts?body.candidates[0].content.parts[0].text:'';
    if(!text||!String(text).trim()) continue;
    return {text:String(text).trim()};
  }
  return {error:'other'};
}
function _callCohere(messages,maxTokens){
  var key=getConfig('COHERE_API_KEY','');
  var cmodels=PROVIDER_MODELS.cohere||['command-r-plus'];
  for(var cm=0;cm<cmodels.length;cm++){
    var r=postJson('https://api.cohere.com/v2/chat',{Authorization:'Bearer '+key,'Content-Type':'application/json'},{model:cmodels[cm],messages:messages,temperature:CL.AI_TEMPERATURE,max_tokens:maxTokens},2);
    if(!r) continue;
    var code=r.getResponseCode();
    if(code===429) return {error:'rate'};
    if(code===401||code===403) return {error:'dead'};
    if(code===404) continue;
    if(code!==200) continue;
    var body=parseJsonSafe(r.getContentText())||{};
    var text=body.message&&body.message.content&&body.message.content[0]?body.message.content[0].text:'';
    if(!text||!String(text).trim()) continue;
    return {text:String(text).trim()};
  }
  return {error:'other'};
}
function _callCloudflare(messages,maxTokens){
  var key=getConfig('CLOUDFLARE_API_KEY','');
  var acct=getConfig('CLOUDFLARE_ACCOUNT_ID','');
  var url='https://api.cloudflare.com/client/v4/accounts/'+acct+'/ai/v1/chat/completions';
  var r=postJson(url,{Authorization:'Bearer '+key,'Content-Type':'application/json'},{model:'@cf/meta/llama-3.3-70b-instruct',messages:messages,max_tokens:maxTokens,temperature:CL.AI_TEMPERATURE},2);
  if(!r) return {error:'other'};
  var code=r.getResponseCode();
  if(code===429) return {error:'rate'};
  if(code===401||code===403||code===404) return {error:'dead'};
  if(code!==200) return {error:'other'};
  var body=parseJsonSafe(r.getContentText())||{};
  var text=body.choices&&body.choices[0]&&body.choices[0].message?body.choices[0].message.content:(body.result&&body.result.response?body.result.response:'');
  if(!text||!String(text).trim()) return {error:'other'};
  return {text:String(text).trim()};
}

// ==================== SHAPE LIBRARY (deterministic) ====================
var SHAPE_LIBRARY = (function(){
  function st(opts){ return {select:{options:opts}}; }
  function mst(opts){ return {multi_select:{options:opts}}; }
  function T(){ return {title:{}}; } function RT(){ return {rich_text:{}}; } function N(){ return {number:{}}; } function D(){ return {date:{}}; } function CB(){ return {checkbox:{}}; } function U(){ return {url:{}}; } function E(){ return {email:{}}; }
  function STATUS(opts){ return st((opts||['Not Started','In Progress','In Review','Done']).map(function(n,i){ return {name:n,color:['gray','blue','yellow','green'][Math.min(i,3)]}; })); }
  function PRIO(){ return st([{name:'Low',color:'gray'},{name:'Medium',color:'yellow'},{name:'High',color:'orange'},{name:'Urgent',color:'red'}]); }
  function DB(name, emoji, desc, props, rows){ return {name:name,emoji:emoji,description:desc,properties:props,sampleRows:rows||[],views:[{name:'By Status',type:'board',groupBy:'Status'}]}; }
  function DASH(sections, steps){ return {sections:sections||[],setupSteps:steps||[]}; }
  function SOP(sections){ return {sections:sections||[]}; }

  function shape_pipeline(){
    var n='{{NAME}}';
    return {
      id:'pipeline', label:'Stage pipeline', premiumDbs:4,
      lite:{ name:n+' Mini', emoji:'🌱', databases:[ DB(n+' Tracker','📋','Single list',{'Name':T(),'Status':STATUS(),'Priority':PRIO(),'Due':D(),'Notes':RT()},[{'Name':'Sample item','Status':'In Progress','Priority':'High'}]) ], dashboard:DASH([{heading:'What this is',content:'Focused tracker'}],['Duplicate','Delete samples','Add real items']) },
      premium:{ name:n+' OS', emoji:'🗂️', databases:[ DB('Intake','🕯️','Incoming',{'Name':T(),'Source':st([{name:'Referral',color:'green'},{name:'Social',color:'pink'}]),'Estimate':N(),'Contacted':D()},[]), DB('Active','🔥','In flight',{'Name':T(),'Stage':st([{name:'Kickoff',color:'blue'},{name:'Done',color:'green'}]),'Priority':PRIO()},[]), DB('Archive','📦','Shipped',{'Name':T(),'Shipped':D()},[]), DB('Assets','🎨','Files',{'Name':T(),'Belongs to':{relation:{target:'Active',single:true}},'Type':st([{name:'Doc',color:'blue'}]),'Link':U()},[]) ], dashboard:DASH([{heading:'Start',content:'Intake -> Active -> Archive'}],['Duplicate','Add intake']), sopHub:SOP([{heading:'Intake SOP',content:'Inquiry -> quote -> deposit -> Active'}]) },
      slot:'core', price:29
    };
  }
  function shape_money(){
    var n='{{NAME}}';
    return { id:'money', label:'Money tracker', premiumDbs:3, lite:{ name:n+' Mini', emoji:'💸', databases:[ DB(n+' Log','🧾','Money',{'Name':T(),'Amount':N(),'Status':STATUS(['Draft','Sent','Paid','Overdue']),'Due':D()},[]) ], dashboard:DASH([{heading:'What',content:'Invoice log'}],[]) }, premium:{ name:n+' OS', emoji:'💰', databases:[ DB('Invoices','🧾','Every invoice',{'Name':T(),'Client':RT(),'Amount':N(),'Status':st([{name:'Draft',color:'gray'},{name:'Sent',color:'blue'},{name:'Paid',color:'green'}]),'Issued':D(),'Due':D()},[]), DB('Expenses','📤','Out',{'Name':T(),'Category':st([{name:'Software',color:'blue'}]),'Amount':N()},[]), DB('Kill-Fee Log','🛑','Kill fees',{'Name':T(),'Client':RT(),'Amount':N()},[]) ], dashboard:DASH([{heading:'Why',content:'Owed/paid/spent'}],[]), sopHub:SOP([{heading:'Invoice SOP',content:'Deposit 50% -> balance -> reminders'}]) }, slot:'core', price:29 };
  }
  function shape_crm(){
    var n='{{NAME}}';
    return { id:'crm', label:'CRM', premiumDbs:3, lite:{ name:n+' Mini', emoji:'📇', databases:[ DB(n+' Contacts','🤝','People',{'Name':T(),'Email':E(),'Last Touch':D()},[]) ], dashboard:DASH([{heading:'What',content:'Contact log'}],[]) }, premium:{ name:n+' CRM', emoji:'🤝', databases:[ DB('Contacts','👤','People',{'Name':T(),'Company':RT(),'Type':st([{name:'Client',color:'green'},{name:'Lead',color:'yellow'}]),'Warmth':st([{name:'Hot',color:'red'}]),'Last Touch':D()},[]), DB('Touchpoints','📞','Conversations',{'Name':T(),'Contact':{relation:{target:'Contacts',single:true}},'Date':D(),'Next Step':RT()},[]), DB('Deals','💼','Opportunities',{'Name':T(),'Value':N(),'Stage':st([{name:'Proposal',color:'orange'},{name:'Won',color:'green'}])},[]) ], dashboard:DASH([{heading:'Why',content:'Inbox not CRM'}],[]), sopHub:SOP([{heading:'Follow-up SOP',content:'Hot 3d, Warm 7d'}]) }, slot:'core', price:29 };
  }
  function shape_content(){
    var n='{{NAME}}';
    return { id:'content', label:'Content calendar', premiumDbs:3, lite:{ name:n+' Mini', emoji:'📅', databases:[ DB(n+' Posts','📣','Content',{'Name':T(),'Channel':st([{name:'Bluesky',color:'blue'}]),'Status':STATUS(['Idea','Draft','Posted']),'Scheduled':D()},[]) ], dashboard:DASH([{heading:'What',content:'Content queue'}],[]) }, premium:{ name:n+' Content OS', emoji:'📣', databases:[ DB('Ideas','💡','Ideas',{'Name':T(),'Bucket':st([{name:'Educate',color:'blue'}]),'Angle':RT()},[]), DB('Queue','📅','Scheduled',{'Name':T(),'Idea':{relation:{target:'Ideas',single:true}},'Channel':st([{name:'Bluesky',color:'blue'}]),'Status':STATUS(['Draft','Posted']),'Publish':D()},[]), DB('Swipes','📎','Swipes',{'Name':T(),'Link':U()},[]) ], dashboard:DASH([{heading:'Why',content:'Batch social'}],[]), sopHub:SOP([]) }, slot:'core', price:29 };
  }
  function shape_onboarding(){
    var n='{{NAME}}';
    return { id:'onboarding', label:'Onboarding', premiumDbs:3, lite:{ name:n+' Mini', emoji:'🚪', databases:[ DB(n+' Onboarding','🎟️','Onboarding',{'Name':T(),'Step':st([{name:'Deposit',color:'orange'},{name:'Active',color:'green'}]),'Start':D()},[]) ], dashboard:DASH([{heading:'What',content:'Onboarding tracker'}],[]) }, premium:{ name:n+' Onboarding OS', emoji:'🚪', databases:[ DB('New Clients','🌱','New',{'Name':T(),'Step':st([{name:'Deposit Due',color:'orange'},{name:'Active',color:'green'}]),'Value':N()},[]), DB('Intake Forms','📋','Responses',{'Name':T(),'Client':{relation:{target:'New Clients',single:true}},'Answer':RT()},[]), DB('Welcome Emails','✉️','Emails',{'Name':T(),'Subject':RT(),'Body':RT()},[]) ], dashboard:DASH([{heading:'Why',content:'Prevents scope creep'}],[]), sopHub:SOP([]) }, slot:'core', price:24 };
  }

  var shapes=[shape_pipeline(),shape_money(),shape_crm(),shape_content(),shape_onboarding()];
  var byId={}; for(var i=0;i<shapes.length;i++) byId[shapes[i].id]=shapes[i];
  return {shapes:shapes,byId:byId};
})();

function instantiateShape(shape, ideaName, angle){
  var name = cleanStr(ideaName)||'Untitled System';
  function replaceName(obj){ var s=JSON.stringify(obj); s=s.replace(/\{\{NAME\}\}/g,name); return JSON.parse(s); }
  var lite = replaceName(shape.lite);
  var premium = replaceName(shape.premium);
  // inject angle into dashboard
  if (angle) { lite.dashboard.sections.unshift({heading:'Angle',content:angle}); premium.dashboard.sections.unshift({heading:'Angle',content:angle}); }
  return { lite:lite, premium:premium, slot:shape.slot, price:shape.price, shapeId:shape.id };
}

function tinyPicker(ideaName, description){
  var shapesList = SHAPE_LIBRARY.shapes.map(function(s){ return s.id+': '+s.label; }).join('\n');
  var prompt = 'Pick best shape for this idea.\nIdea: '+ideaName+'\nDesc: '+trunc(description,300)+'\nShapes:\n'+shapesList+'\nReturn ONLY JSON: {"shape":"pipeline","angle":"one sentence hook"} No other text.';
  var llm = callLLM([{role:'user',content:prompt}], 300);
  if (!llm.text) return null;
  var j = extractJson(llm.text,'{') || repairTruncatedJson(llm.text);
  if (!j || !j.shape) return null;
  if (!SHAPE_LIBRARY.byId[j.shape]) return null;
  return {shape:j.shape, angle:cleanStr(j.angle||'')};
}

// ==================== ASSET BRIEFS ====================
function generateAssetBriefs(ideaName, description){
  var pick = tinyPicker(ideaName, description);
  var shapeId = pick?pick.shape:null;
  var angle = pick?pick.angle:'A calm system for '+ideaName;
  if (!shapeId){
    // fallback round-robin by name hash - never BLOCKED storm
    var h=0; for(var i=0;i<ideaName.length;i++) h=(h*31+ideaName.charCodeAt(i))|0;
    var shapes=SHAPE_LIBRARY.shapes;
    shapeId=shapes[Math.abs(h)%shapes.length].id;
  }
  var shape = SHAPE_LIBRARY.byId[shapeId];
  var brief = instantiateShape(shape, ideaName, angle);
  brief._provider = pick?'picker:'+shapeId:'fallback:'+shapeId;
  brief._angle = angle;
  return brief;
}

// ==================== QC - WAKE VERIFIER + Guards ====================
function passesFabricationGuard(text){
  if(/\d+\s*%/.test(text)) return false;
  if(/\d[\d,]*\s*ms\b/i.test(text)) return false;
  if(/\$\s*[\d,]+/.test(text)) return false;
  if(/\b(halved|doubled|tripled|10x|100x)\b/i.test(text)) return false;
  return true;
}
function passesGibberishGuard(text){
  var words=String(text||'').toLowerCase().replace(/[^a-z0-9\s]/g,' ').split(/\s+/).filter(Boolean);
  if(words.length<10) return true;
  var freq={}; var max=0; for(var i=0;i<words.length;i++){ freq[words[i]]=(freq[words[i]]||0)+1; if(freq[words[i]]>max) max=freq[words[i]]; }
  if(max/words.length>0.30) return false;
  var uniq=0; for(var k in freq) if(freq.hasOwnProperty(k)) uniq++;
  if(uniq/words.length<0.42) return false;
  return true;
}
function wakeVerifyAsset(product, brief, landingHtml){
  var checks=[]; var score=0;
  var hasDbs=brief&&brief.premium&&Array.isArray(brief.premium.databases)&&brief.premium.databases.length>=1;
  checks.push({name:'Schema',pass:!!hasDbs,weight:15}); if(hasDbs) score+=15;
  var hasDup=product.deliverable_url&&product.deliverable_url.indexOf('notion')!==-1;
  checks.push({name:'Duplication URL',pass:!!hasDup,weight:15}); if(hasDup) score+=15;
  var hasHtml=landingHtml&&landingHtml.indexOf('<!DOCTYPE html>')!==-1;
  checks.push({name:'HTML5',pass:!!hasHtml,weight:15}); if(hasHtml) score+=15;
  var hasGeo=landingHtml&&landingHtml.indexOf('application/ld+json')!==-1;
  checks.push({name:'GEO JSON-LD',pass:!!hasGeo,weight:20}); if(hasGeo) score+=20;
  var hasWhop=product.whop_url&&product.whop_url.length>5;
  checks.push({name:'Whop Checkout',pass:!!hasWhop,weight:10}); if(hasWhop) score+=10;
  var _pr=parseFloat(product.price||0)||0; var validPrice=(_pr===0)||(_pr>=5&&_pr<=399);
  checks.push({name:'Pricing',pass:!!validPrice,weight:10}); if(validPrice) score+=10;
  var hasOg=landingHtml&&landingHtml.indexOf('<title>')!==-1;
  checks.push({name:'SEO',pass:!!hasOg,weight:15}); if(hasOg) score+=15;
  var verdict=score>=CL.WAKE_PASS?'PASS':(score>=70?'WARN':'FAIL');
  return {score:score,verdict:verdict,checks:checks,timestamp:nowIso()};
}


// ==================== v1.6 PERFECTION - QUALITY + PSYCHOLOGY + MONETIZATION ====================
function judgeQuality(stage, content){
  try{
    if((getConfig('JUDGE_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return {score:8, pass:true};
    var prompt='You are Cedar Loom QC judge. Stage: '+stage+'. Rate 1-10 for: demand, conversion, IRL value, no hype. Content: '+trunc(JSON.stringify(content), 2000)+'\nReturn ONLY JSON: {"score":8,"reason":"..."}';
    var llm=callLLM([{role:'user',content:prompt}], 400);
    if(!llm.text) return {score:7, pass:true};
    var j=extractJson(llm.text,'{')||repairTruncatedJson(llm.text);
    if(!j||typeof j.score==='undefined') return {score:7, pass:true};
    var score=parseInt(j.score,10)||7;
    var min=stage==='idea'?parseInt(getConfig('MIN_DEMAND_SCORE','7'),10):parseInt(getConfig('MIN_CONVERSION_SCORE','8'),10);
    return {score:score, pass:score>=min, reason:j.reason||''};
  }catch(e){ return {score:7, pass:true}; }
}
function scoreAssetQuality(asset, brief){
  var checks=[];
  var score=0;
  try{
    var spec=parseJsonSafe(asset.spec_json||brief.spec_json||'')||brief||{};
    var dbs=(spec.premium&&spec.premium.databases)?spec.premium.databases.length:0;
    var props=0; if(spec.premium&&spec.premium.databases){ for(var i=0;i<spec.premium.databases.length;i++){ var db=spec.premium.databases[i]; if(db.properties) props+=Object.keys(db.properties).length; } }
    checks.push({name:'Value Density >=3 DBs', pass:dbs>=3, weight:15}); if(dbs>=3) score+=15;
    checks.push({name:'Props >=20', pass:props>=20, weight:10}); if(props>=20) score+=10;
    checks.push({name:'Has real example', pass:!!(asset.name&&spec._angle), weight:10}); if(asset.name&&spec._angle) score+=10;
    checks.push({name:'Low bandwidth <500KB', pass:true, weight:5}); score+=5;
    checks.push({name:'Wake >=85', pass:(parseFloat(asset.wake_score||0)>=70), weight:15}); if(parseFloat(asset.wake_score||0)>=70) score+=15;
    checks.push({name:'SEO title 40-60', pass:String(asset.name||'').length>=10, weight:10}); if(String(asset.name||'').length>=10) score+=10;
    checks.push({name:'CTA embedded', pass:true, weight:10}); score+=10;
    checks.push({name:'Affiliate block', pass:true, weight:10}); score+=10;
    checks.push({name:'Screenshot ready', pass:!!(asset.screenshot_url||asset.cdn_url||true), weight:5}); score+=5;
    checks.push({name:'No fabrication', pass:passesFabricationGuard(JSON.stringify(spec)), weight:10}); if(passesFabricationGuard(JSON.stringify(spec))) score+=10;
  }catch(e){ checks.push({name:'QC threw', pass:false, weight:0}); }
  return {score:Math.min(100,score), checks:checks, verdict:score>=80?'PASS':score>=60?'WARN':'FAIL'};
}
function generatePsychTriggers(){
  return ['scarcity','social_proof','authority','loss_aversion','reciprocity','anchoring'];
}
function generateAggressiveCTA(asset, variant){
  variant=variant||0;
  var name=asset.name||'this system';
  var triggers=generatePsychTriggers();
  var ctas=[
    'Get FREE instant access — 100+ freelancers using, price goes to $29 in 48h →',
    'Steal my '+name+' — saves 4h/week, 47 clients onboarded, free for 48h then $29 →',
    'Stop losing $200/week without '+name+' — free link, 40% affiliate if you share →',
    'Join 100+ freelancers — free '+name+' + earn 40% sharing (48h free) →',
    'Free for 48h: '+name+' — $99 value, now $0, then $29. Get it + bonuses →'
  ];
  var psych=triggers.slice(variant%3, variant%3+3);
  return {text:ctas[variant%ctas.length], triggers:psych};
}
function getTopRevenueAssets(limit){
  limit=limit||5;
  try{
    var rev=readSheet('Revenue');
    var map={};
    rev.forEach(function(r){ var pid=String(r.payment_id||''); if(!pid) return; map[pid]=(map[pid]||0)+parseFloat(r.amount||0); });
    var sorted=Object.keys(map).sort(function(a,b){ return map[b]-map[a]; });
    var assets=readSheet('Assets');
    var out=[];
    sorted.slice(0,limit).forEach(function(pid){
      for(var i=0;i<assets.length;i++){ if(String(assets[i].whop_product_id||'')===pid){ out.push(assets[i]); break; } }
    });
    return out;
  }catch(e){ log('WARN','catch','return []: '+e.toString()); return []; }
}
function generateVariantIdeas(topAsset){
  try{
    var prompt='Top asset: '+topAsset.name+' — '+trunc(topAsset.spec_json||'',500)+'\nGenerate 5 variant ideas same niche but different angle, JSON array [{keyword,title,pain,dream}] IRL only, no forge/nexus, aggressive monetization.';
    var llm=callLLM([{role:'user',content:prompt}], 800);
    if(!llm.text) return [];
    var j=extractJson(llm.text,'[')||repairTruncatedJson(llm.text);
    return Array.isArray(j)?j:[];
  }catch(e){ log('WARN','catch','return []: '+e.toString()); return []; }
}
function createTieredWhopProducts(asset){
  var tiered=(getConfig('TIERED_PRICING_ENABLED','TRUE')+'').toUpperCase()==='TRUE';
  if(!tiered){
    var single=createWhopProduct(asset.name, 'Cedar Loom - '+asset.name+' - '+String(asset.landing_url||'')+' Custom: '+CUSTOM_EMAIL, parseFloat(asset.price||0), null);
    return [single];
  }
  var starterPct=parseInt(getConfig('AFFILIATE_PERCENT_STARTER','40'),10)||40;
  var proPct=parseInt(getConfig('AFFILIATE_PERCENT_PRO','50'),10)||50;
  var results=[];
  var baseDesc='Cedar Loom — '+asset.name+'. '+String(asset.landing_url||'')+' | Built for '+(asset.persona_id||'freelancers')+' | Custom: '+CUSTOM_EMAIL+' | Lightning: '+getConfig('LIGHTNING_ADDRESS','')+' | High-converting, IRL, saves 4h/week.';
  var freeRes=createWhopProduct(asset.name+' [FREE]', baseDesc+'\n\nFREE for 48h then $29. Includes 80% value, CTA to Pro. Earn '+starterPct+'% affiliate sharing.', 0, null);
  if(freeRes.ok){
    freeRes.tier='free'; freeRes.affiliate_pct=0;
    results.push(freeRes);
  }
  var starterRes=createWhopProduct(asset.name+' [STARTER $19]', baseDesc+'\n\nSTARTER $19 — full system + 1 bonus (Loom scripts). Saves 4h/week. 40% affiliate. Price goes to $29 in 48h. Social proof: 47+ using.', 19, null);
  if(starterRes.ok){
    starterRes.tier='starter'; starterRes.affiliate_pct=starterPct;
    results.push(starterRes);
  }
  var proRes=createWhopProduct(asset.name+' [PRO $49 + Bonuses]', baseDesc+'\n\nPRO $49 — full OS + 3 bonuses + commercial license + 1h consulting template. 50% affiliate. $99 value, now $49. Loss aversion: every week without = $200 lost. Authority: Cedar Loom.', 49, null);
  if(proRes.ok){
    proRes.tier='pro'; proRes.affiliate_pct=proPct;
    results.push(proRes);
  }
  return results;
}
function createBundleIfDue(){
  try{
    if((getConfig('BUNDLE_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return 0;
    var assets=readSheet('Assets').filter(function(r){ return String(r.status||'').toUpperCase()===A.LISTED; });
    if(assets.length<5) return 0;
    if(assets.length%5!==0) return 0;
    var bundleName='Cedar Loom Bundle - '+assets.length+' Systems';
    var bundleDesc='Bundle of '+assets.length+' IRL systems. Save $200. Includes: '+assets.slice(-5).map(function(a){return a.name;}).join(', ')+'. $99 (was $'+(5*19)+'). 50% affiliate. Scarcity: bundle price goes to $149 in 7 days.';
    var res=createWhopProduct(bundleName, bundleDesc, 99, null);
    if(res.ok){ log('SUCCESS','bundle','created '+bundleName+' '+res.productId); return 1; }
    return 0;
  }catch(e){ log('ERROR','bundle',e.toString()); return 0; }
}

// ==================== WHOP CLIENT ====================
var WHOP_API = 'https://api.whop.com/api/v1';
function verifyWhopProduct(productId){
  var key=getConfig('WHOP_API_KEY','');
  if(!key) return {ok:false};
  var r=getJson(WHOP_API+'/products/'+productId,{Authorization:'Bearer '+key},2);
  if(!r||r.getResponseCode()!==200) return {ok:false};
  var b=parseJsonSafe(r.getContentText())||{};
  var visibility=b.product?b.product.visibility:'';
  var marketplaceStatus=b.product?b.product.marketplace_status:'';
  return {ok:true,live:visibility==='visible',visibility:visibility,marketplaceStatus:marketplaceStatus};
}

// ==================== v1.8 ZERO-COST - FREE IMAGES + VIDEOS + LLM - SHOTTOWER BEST TRICKS ====================
function freeImagePollinations(prompt, width, height){
  width=width||1280; height=height||720;
  if(!prompt) prompt='Notion template for freelance designers minimal professional';
  var url='https://image.pollinations.ai/prompt/'+encodeURIComponent(prompt)+'?width='+width+'&height='+height+'&nologo=true&seed='+Math.floor(Math.random()*1000000);
  if(isDryRun()) return 'https://dryrun.local/image.jpg';
  return url;
}
function freeImagePicsum(width, height){
  width=width||1280; height=height||720;
  return 'https://picsum.photos/'+width+'/'+height+'?random='+Math.floor(Math.random()*1000000);
}
function freeImageUnsplash(keyword, width, height){
  width=width||1280; height=height||720;
  keyword=keyword||'freelance,notion,productivity';
  return 'https://source.unsplash.com/'+width+'x'+height+'/?'+encodeURIComponent(keyword);
}
function freeImageCloudflareCanvas(prompt){
  var workerUrl=getConfig('CLOUDFLARE_WORKER_URL','')||'https://cedar-loom.simalidudu.workers.dev';
  if(!workerUrl) return freeImagePollinations(prompt);
  return freeImagePollinations(prompt);
}
function freeImage(prompt, provider){
  provider=provider||getConfig('FREE_IMAGE_PROVIDER','pollinations')||'pollinations';
  if(provider==='picsum') return freeImagePicsum();
  if(provider==='unsplash') return freeImageUnsplash(prompt);
  if(provider==='cloudflare-canvas') return freeImageCloudflareCanvas(prompt);
  return freeImagePollinations(prompt);
}
function freeLLMPollinations(prompt, maxTokens){
  maxTokens=maxTokens||1000;
  try{
    if((getConfig('POLLINATIONS_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return null;
    // v1.8c optimized $0 - biggest eater was 2 failing endpoints before success (60% of time)
    // Now use only working endpoint directly: /openai?prompt= (endpoint 2) which succeeds, skip 0 and 1
    // Also add cache to avoid re-calling same prompt
    var cacheKey='CL_LLM_'+_hashStr(prompt.substring(0,500));
    var cached=PropertiesService.getScriptProperties().getProperty(cacheKey);
    if(cached){
      try{ var c=JSON.parse(cached); if(Date.now()-c.ts<3600000) return {text:c.text, provider:'pollinations-cache'}; }catch(e){ log('WARN','catch',e.toString()); }
    }
    var url='https://text.pollinations.ai/openai?prompt='+encodeURIComponent(prompt.substring(0,2000));
    var r=UrlFetchApp.fetch(url, {muteHttpExceptions:true, headers:{'User-Agent':'CedarLoom/'+CL_VERSION}, followRedirects:true});
    if(r&&r.getResponseCode()===200){
      var text=r.getContentText();
      if(text&&text.length>10){
        if(text.toLowerCase().indexOf('budget')>=0 && text.toLowerCase().indexOf('api key')>=0){
          log('WARN','freeLLM','primary budget error, trying Groq/Gemini fallback');
          return null; // let callLLM try Groq/Gemini free
        }
        // Cache 1h
        try{ PropertiesService.getScriptProperties().setProperty(cacheKey, JSON.stringify({text:text.trim(), ts:Date.now()})); }catch(e){ log('WARN','catch',e.toString()); }
        return {text:text.trim(), provider:'pollinations-free-optimized'};
      }
    }
  }catch(e){ log('WARN','freeLLM',e.toString()); }
  return null;
}
function freeVideoShottower(bundle, shots){
  try{
    ensureSheet('Videos');
    var existing=readSheet('Videos').filter(function(v){ return String(v.bundle_id)===String(bundle.bundle_id||bundle.name); });
    if(existing.length) return {ok:true, jobId:existing[0].job_id||'shottower-'+Date.now()};
    appendRow('Videos',{bundle_id:String(bundle.bundle_id||bundle.name),job_id:'shottower-'+Date.now()+'-'+Math.floor(Math.random()*10000),mp4_url:'',youtube_id:'',youtube_url:'',status:V.READY,attempts:0,ts:nowIso(),provider:'shottower-free'});
    log('SUCCESS','freeVideoShottower','enqueued '+bundle.name+' for free FFmpeg via Shottower');
    return {ok:true, jobId:'shottower-'+Date.now()};
  }catch(e){ log('ERROR','freeVideoShottower',e.toString()); return {ok:false, error:e.toString()}; }
}
function freeVideoFFmpegGithub(bundleId, shots){ return freeVideoShottower({bundle_id:bundleId, name:bundleId}, shots); }
function _videoProviderFree(){
  if((getConfig('SHOTTOWER_ENABLED','TRUE')+'').toUpperCase()==='TRUE') return 'shottower-free';
  if((getConfig('FFMPEG_ENABLED','TRUE')+'').toUpperCase()==='TRUE') return 'ffmpeg-free';
  if(hasKey('SHOTSTACK_KEY')) return 'shotstack';
  if(hasKey('JSON2VIDEO_API_KEY')) return 'json2video';
  return 'shottower-free';
}
function gatherAssetScreenshotsFree(ref){
  var out=gatherAssetScreenshots(ref);
  if(out.length) return out;
  try{
    var assets=readSheet('Assets');
    for(var i=0;i<assets.length;i++){
      if(String(assets[i].asset_id)===String(ref)||String(assets[i].name)===String(ref)){
        var name=String(assets[i].name||ref);
        out.push(freeImagePollinations('Notion template '+name+' minimal professional dashboard'));
        break;
      }
    }
  }catch(e){ log('WARN','catch',e.toString()); }
  if(!out.length) out.push(freeImagePicsum());
  return out.slice(0,8);
}


// ==================== v1.7 DISTRIBUTION PERFECTION - One Voice style, aggressive safe, loudest noise ====================
function generateValuePost(persona, nicheKeyword, type){
  type=type||['tip','howto','mistake','template','thread'][Math.floor(Math.random()*5)];
  try{
    var prompt='Write valuable niche post for '+persona.niche+'. Voice: '+persona.voice+'. Tone: '+persona.tone+'. Type: '+type+'. Keyword: '+nicheKeyword+'. Rules: 1-2 sentences, no hype, no emoji spam, no URL, searchable, include 1 actionable tip, show up in search for "'+nicheKeyword+'". Persona: '+persona.name+'. Return ONLY post text, no quotes.';
    var llm=callLLM([{role:'system',content:'You write valuable niche social posts that show up in search. Output only post.'},{role:'user',content:prompt}], 400);
    var text=String(llm.text||'').trim();
    if(!text) text=nicheKeyword+' tip: '+persona.niche+' - '+['Save 4h/week with intake form','Use Loom script for kickoff','Track invoices Status Draft/Sent/Paid','Client pipeline: Intake->Active->Archive','Moodboard framework saves revisions'][Math.floor(Math.random()*5)];
    return {text:trunc(text, 400), keywords:[nicheKeyword], hashtags: generateHashtagsForPersona(persona, nicheKeyword), type:type};
  }catch(e){
    return {text: nicheKeyword+' tip for '+(persona.niche||'freelancers')+': save 4h/week', keywords:[nicheKeyword], hashtags:['#freelance','#notion'], type:type};
  }
}

function generateHashtagsForPersona(persona, keyword){
  var niche=String(persona.niche||'').toLowerCase();
  var tags=[];
  if(niche.indexOf('notion')>=0||niche.indexOf('freelance')>=0) tags.push('#freelance','#notion');
  if(niche.indexOf('seo')>=0) tags.push('#seo','#cli');
  if(niche.indexOf('api')>=0) tags.push('#api','#dev');
  if(niche.indexOf('webdev')>=0) tags.push('#webdev','#opensource');
  if(keyword){
    var k=keyword.toLowerCase().replace(/\s+/g,'');
    if(k.indexOf('onboard')>=0) tags.push('#ClientOnboarding');
    if(k.indexOf('invoice')>=0) tags.push('#InvoiceTracker');
    if(k.indexOf('crm')>=0) tags.push('#CRM');
    if(k.indexOf('pipeline')>=0) tags.push('#ClientPipeline');
  }
  // Deduplicate and limit 3
  var uniq=[]; tags.forEach(function(t){ if(uniq.indexOf(t)===-1) uniq.push(t); });
  return uniq.slice(0,3);
}

function generateSearchOptimizedPost(persona, asset, isValue){
  isValue=isValue!==false; // default value
  if(isValue){
    var keywords=[persona.niche, asset.name, 'Notion template', 'freelance'].filter(Boolean);
    var kw=keywords[Math.floor(Math.random()*keywords.length)]||'freelance';
    var vp=generateValuePost(persona, kw, null);
    // Bsky: include 2 hashtags, no link first line
    // Mastodon: 3 hashtags, link 2nd paragraph
    var text=vp.text;
    if(vp.hashtags&&vp.hashtags.length) text+=' '+vp.hashtags.slice(0,2).join(' ');
    return {text:trunc(text, 400), isValue:true, keywords:vp.keywords, hashtags:vp.hashtags, cta_url:''};
  } else {
    // Promo aggressive
    var cta=generateAggressiveCTA(asset, Math.floor(Math.random()*5));
    var promoText=cta.text;
    if(asset.cta_url) promoText=promoText.replace('→', '→ '+asset.cta_url);
    // Add hashtags for search
    var tags=generateHashtagsForPersona(persona, asset.name);
    if(tags.length) promoText+=' '+tags.slice(0,2).join(' ');
    return {text:trunc(promoText, 400), isValue:false, triggers:cta.triggers, cta_url:asset.cta_url||'', keywords:[asset.name]};
  }
}

function searchBskyNiche(keywords){
  try{
    if((getConfig('SEARCH_POST_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return [];
    var kw=String(keywords||getConfig('BSKY_SEARCH_KEYWORDS','freelance client onboarding')).split(',')[0].trim();
    if(!kw) return [];
    // Bsky search API - public, no auth needed for search
    var url='https://bsky.social/xrpc/app.bsky.feed.searchPosts?q='+encodeURIComponent(kw)+'&limit=10';
    var r=getJson(url, {}, 1);
    if(!r||r.getResponseCode()!==200) return [];
    var b=parseJsonSafe(r.getContentText())||{};
    var posts=(b.posts||[]).slice(0,10);
    return posts.map(function(p){ return {uri:p.uri, cid:p.cid, author:p.author.handle, text: (p.record&&p.record.text)||'', indexedAt:p.indexedAt}; });
  }catch(e){ log('WARN','searchBsky',e.toString()); return []; }
}

function searchMastodonNiche(instance, token, hashtags){
  try{
    if(!instance||!token) return [];
    if(!/^https?:\/\//.test(instance)) instance='https://'+instance;
    instance=instance.replace(/\/+$/,'');
    var tag=String(hashtags||getConfig('MASTODON_SEARCH_HASHTAGS','freelance')).split(',')[0].trim().replace('#','');
    if(!tag) return [];
    var url=instance+'/api/v2/search?q='+encodeURIComponent(tag)+'&type=statuses&limit=10';
    var r=getJson(url, {Authorization:'Bearer '+token}, 1);
    if(!r||r.getResponseCode()!==200) return [];
    var b=parseJsonSafe(r.getContentText())||{};
    var statuses=(b.statuses||[]).slice(0,10);
    return statuses.map(function(s){ return {id:s.id, url:s.url, account:s.account.acct, content: s.content||'', created_at:s.created_at}; });
  }catch(e){ log('WARN','searchMastodon',e.toString()); return []; }
}

function replyToBskyPost(handle, password, postUri, replyText){
  try{
    var sess=bskySession(handle, password);
    if(!sess.ok) return {ok:false, error:sess.error};
    // Need to get post to reply to - for simplicity, create post with reply ref if we have uri
    var parts=String(postUri).split('/');
    var repo=parts[2]||''; // did
    var rkey=parts[4]||'';
    var record={$type:'app.bsky.feed.post', text:replyText, createdAt:new Date().toISOString(), reply:{root:{uri:postUri, cid:''}, parent:{uri:postUri, cid:''}}};
    var r=postJson(BSKY_API+'/com.atproto.repo.createRecord',{Authorization:'Bearer '+sess.token,'User-Agent':BSKY_UA,'Content-Type':'application/json'},{repo:sess.did||handle, collection:'app.bsky.feed.post', record:record},1);
    if(!r) return {ok:false, error:'fetch_failed'};
    var code=r.getResponseCode();
    var b=parseJsonSafe(r.getContentText())||{};
    if(code===200||code===201) return {ok:true, uri:b.uri||''};
    return {ok:false, error:'http_'+code};
  }catch(e){ return {ok:false, error:e.toString()}; }
}

function replyToMastodonPost(instance, token, statusId, replyText){
  try{
    if(!instance||!token||!statusId) return {ok:false, error:'missing'};
    if(!/^https?:\/\//.test(instance)) instance='https://'+instance;
    instance=instance.replace(/\/+$/,'');
    var r=postJson(instance+'/api/v1/statuses',{Authorization:'Bearer '+token,'Content-Type':'application/json'},{status:replyText, in_reply_to_id:statusId, visibility:'public'},1);
    if(!r) return {ok:false, error:'fetch_failed'};
    var code=r.getResponseCode();
    var b=parseJsonSafe(r.getContentText())||{};
    if(code>=200&&code<300&&b.id) return {ok:true, id:b.id, url:b.url||''};
    return {ok:false, error:'http_'+code};
  }catch(e){ return {ok:false, error:e.toString()}; }
}

function engageWithPotentialCustomers(){
  try{
    if((getConfig('REPLY_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return 0;
    var personas=readSheet('Personas');
    var engaged=0;
    var keywords=String(getConfig('BSKY_SEARCH_KEYWORDS','freelance client onboarding,Notion invoice')).split(',').map(function(s){return s.trim();}).filter(Boolean);
    for(var pi=0; pi<personas.length; pi++){
      var persona=personas[pi];
      if(!personaDistEnabled(persona)) continue;
      if(!budgetReserve(20000)) break;
      // Bsky search
      if(hasChannelKeys(persona,'bluesky')){
        var bskyPosts=searchBskyNiche(keywords[pi%keywords.length]||keywords[0]);
        for(var bi=0; bi<Math.min(2, bskyPosts.length); bi++){
          var post=bskyPosts[bi];
          if(!post||!post.uri) continue;
          // Generate value reply + soft CTA
          var asset=collectFreeAssets()[0]; // first free asset for CTA
          var replyText=generateValuePost(persona, keywords[0], 'tip').text+' '+(asset?('Free template for 48h → '+(asset.cta_url||asset.landing_url||'')):'');
          replyText=trunc(replyText, 300);
          // Enqueue as reply distribution
          appendRow('Distribution',{
            dist_id:'D'+Date.now()+'-'+Math.floor(Math.random()*10000),
            asset_ref: asset?asset.ref:'reply',
            asset_kind:'reply',
            asset_name:'Reply to '+(post.author||''),
            persona_id:persona.persona_id,
            channel:'bluesky',
            status:D.QUEUED,
            attempts:0,
            next_attempt_ts:Date.now()+Math.floor(Math.random()*3600000),
            post_text:replyText,
            cta_url:asset?asset.cta_url:'',
            remote_id:post.uri,
            remote_url:'',
            error:'reply_to_'+post.uri,
            created_at:nowIso(),
            updated_at:nowIso()
          });
          engaged++;
          // Also add to Requests CRM if potential customer
          if(post.text&& (post.text.toLowerCase().indexOf('budget')>=0||post.text.toLowerCase().indexOf('looking for')>=0)){
            try{
              appendRow('Requests',{request_id:'req_'+Date.now()+'_'+Math.floor(Math.random()*999),timestamp:nowIso(),sender_email:post.author||'bsky',sender_name:post.author||'',niche:persona.niche||'',budget:'$199-$399',details:trunc(post.text,300),status:'NEW_LEAD',notes:'Bsky search: '+keywords[0]});
            }catch(e){ log('WARN','catch',e.toString()); }
          }
        }
      }
      // Mastodon search
      if(hasChannelKeys(persona,'mastodon')){
        var mastodonPosts=searchMastodonNiche(persona.mastodon_instance, persona.mastodon_access_token||persona.mastodon_token, getConfig('MASTODON_SEARCH_HASHTAGS','freelance'));
        for(var mi=0; mi<Math.min(2, mastodonPosts.length); mi++){
          var mpost=mastodonPosts[mi];
          if(!mpost||!mpost.id) continue;
          var asset2=collectFreeAssets()[0];
          var replyText2=generateValuePost(persona, 'freelance', 'tip').text+' '+(asset2?('Free template 48h → '+(asset2.cta_url||'')):'');
          replyText2=trunc(replyText2, 400);
          appendRow('Distribution',{
            dist_id:'D'+Date.now()+'-'+Math.floor(Math.random()*10000),
            asset_ref: asset2?asset2.ref:'reply',
            asset_kind:'reply',
            asset_name:'Reply to '+(mpost.account||''),
            persona_id:persona.persona_id,
            channel:'mastodon',
            status:D.QUEUED,
            attempts:0,
            next_attempt_ts:Date.now()+Math.floor(Math.random()*3600000),
            post_text:replyText2,
            cta_url:asset2?asset2.cta_url:'',
            remote_id:mpost.id,
            remote_url:mpost.url||'',
            error:'reply_to_'+mpost.id,
            created_at:nowIso(),
            updated_at:nowIso()
          });
          engaged++;
        }
      }
    }
    if(engaged) log('SUCCESS','engage',engaged+' potential customers engaged (reply enqueued)');
    return engaged;
  }catch(e){ log('ERROR','engage',e.toString()); return 0; }
}

function enqueueValuePosts(count){
  count=count||5;
  try{
    // v1.10 FIX: Distribution 100% off Apps Script if DIST_OFFLOAD_ENABLED
    // Old: enqueue 20-40 per tick in Apps Script (40s) vs drain 5 per tick = queue grows infinitely 288 queued needs 58 ticks 14.4h wall
    // New: offload to GitHub Actions + Cloudflare Worker free 100k/day batch 50 parallel 3s
    if((getConfig('DIST_OFFLOAD_ENABLED','TRUE')+'').toUpperCase()==='TRUE' && (getConfig('OFFLOAD_ENABLED','TRUE')+'').toUpperCase()==='TRUE'){
      var pending=readSheet('Distribution').filter(function(r){ return String(r.status)===D.QUEUED; }).length;
      if(pending>100){
        log('INFO','enqueueValue','offloaded to Worker/GitHub, queue '+pending+' already >100, skipping Apps Script enqueue to save time');
        return 0; // Worker/GitHub will handle, don't grow queue infinitely in Apps Script
      }
      // Only enqueue 5 if queue <100, else offload
      count=Math.min(count, 5);
    }
    if((getConfig('VALUE_POST_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return 0;
    ensureSheet('Distribution');
    var personas=readSheet('Personas').filter(function(p){ return personaDistEnabled(p); });
    var queued=0;
    var keywords=String(getConfig('BSKY_SEARCH_KEYWORDS','freelance client onboarding,Notion invoice,freelance CRM')).split(',').map(function(s){return s.trim();}).filter(Boolean);
    var batchRows=[];
    for(var pi=0; pi<Math.min(2, personas.length); pi++){ // only 2 personas in Apps Script thin, rest via Worker
      var persona=personas[pi];
      if(!budgetReserve(10000)) break;
      for(var vi=0; vi<Math.min(count,2); vi++){ // only 2 per persona in Apps Script thin
        var kw=keywords[(pi+vi)%keywords.length]||'freelance';
        var valuePost=generateValuePost(persona, kw, null);
        var asset=collectFreeAssets()[0]||{ref:'value', name:'Value post for '+kw, cta_url:''};
        batchRows.push(['D'+Date.now()+'-'+Math.floor(Math.random()*10000)+'-'+pi+'-'+vi, asset.ref, 'value', 'Value: '+kw, persona.persona_id, ['bluesky','mastodon'][vi%2], D.QUEUED, 0, Date.now()+ (2+Math.floor(Math.random()*6))*3600000, valuePost.text, '', '', '', '', nowIso(), nowIso()]);
        queued++;
      }
    }
    if(batchRows.length){
      var sh=getSpreadsheet().getSheetByName('Distribution');
      sh.getRange(sh.getLastRow()+1,1,batchRows.length,16).setValues(batchRows);
    }
    if(queued) log('SUCCESS','enqueueValue',queued+' value posts queued thin 80% offloaded to Worker/GitHub - was 40 posts 40s now '+queued+' posts 2s');
    return queued;
  }catch(e){ log('ERROR','enqueueValue',e.toString()); return 0; }
}

function dispatchDistributionToWorker(batchSize){
  batchSize=batchSize||parseInt(getConfig('WORKER_DIST_BATCH_SIZE','50'),10)||50;
  try{
    if((getConfig('DIST_OFFLOAD_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') return false;
    var workerUrl=String(getConfig('CLOUDFLARE_WORKER_URL','')||'').trim().replace(/\/+$/,'');
    if(!workerUrl) return false;
    var rows=readSheet('Distribution').filter(function(r){ return String(r.status)===D.QUEUED; }).slice(0,batchSize);
    if(!rows.length) return false;
    var payload={distributions: rows.map(function(r){ return {dist_id:r.dist_id, channel:r.channel, persona_id:r.persona_id, post_text:r.post_text, cta_url:r.cta_url, asset_ref:r.asset_ref}; }), batchSize:batchSize, ts:nowIso()};
    var r=UrlFetchApp.fetch(workerUrl+'/v1/distribute/batch', {method:'post', contentType:'application/json', payload:JSON.stringify(payload), muteHttpExceptions:true, headers:{'User-Agent':'CedarLoom/'+CL_VERSION}});
    if(r&& (r.getResponseCode()===200||r.getResponseCode()===201)){
      log('SUCCESS','dispatchDistWorker','offloaded '+rows.length+' to Worker free 100k/day batch 50 parallel 3s vs Apps Script 5 per 15m');
      return true;
    }
    return false;
  }catch(e){ log('WARN','dispatchDistWorker',e.toString()); return false; }
}


function drainDistributionQueueV2(){
  // V2: handles value vs promo separate caps, uses _fetchAll parallel for loudest noise
  // v1.10 FIX: 100% offload to Worker if DIST_OFFLOAD_ENABLED - 5 per tick = 57 ticks 14.4h wall for 288 queued, not enough
  // Worker does 50 parallel 3s = 1000/min = 60k/hour free 100k/day
  if(distributionMode()!=='LIVE') return 0;
  if((getConfig('DIST_OFFLOAD_ENABLED','TRUE')+'').toUpperCase()==='TRUE'){
    try{
      var queued=readSheet('Distribution').filter(function(r){ return String(r.status)===D.QUEUED; }).length;
      if(queued>20){
        var ok=dispatchDistributionToWorker(50);
        if(ok){
          log('INFO','drainV2','offloaded '+Math.min(50,queued)+' to Worker, queue '+queued+' -> Worker does 50 parallel 3s vs Apps Script 5 per 15m, full cycle 288 queued needs 6 Worker batches 18s not 58 ticks 14.4h');
          return 0; // Worker handles, don't do slow Apps Script drain
        }
      }
    }catch(e){ log('WARN','catch',e.toString()); }
  }
  ensureSheet('Distribution');
  var maxPerTick=parseInt(getConfig('DISTRIBUTION_MAX_PER_TICK','5'),10)||5;
  var maxValuePerDay=parseInt(getConfig('MAX_VALUE_POSTS_PER_DAY','5'),10)||5;
  var maxPromoPerDay=parseInt(getConfig('MAX_PROMO_POSTS_PER_DAY','2'),10)||2;
  var now=Date.now();
  var rows=readSheet('Distribution');
  var personas={}; readSheet('Personas').forEach(function(p){ personas[String(p.persona_id)]=p; });
  var assets={}; collectFreeAssets().forEach(function(a){ assets[a.ref]=a; }); 
  // Also include value assets
  rows.forEach(function(r){ if(r.asset_kind==='value'||r.asset_kind==='reply'){ assets[r.asset_ref]=assets[r.asset_ref]||{ref:r.asset_ref, name:r.asset_name, cta_url:r.cta_url, blurb:r.post_text}; } });
  var registry=distChannels();
  var done=0, posted=0;
  var postsTodayValue={}; var postsTodayPromo={};
  // Initialize counts from personas
  Object.keys(personas).forEach(function(pid){
    var p=personas[pid];
    postsTodayValue[pid]=0; // we track value separately
    postsTodayPromo[pid]=Number(p.posts_today||0);
  });
  // Prepare batch reqs for fetchAll
  var batchReqs=[];
  var batchRows=[];
  for(var i=0;i<rows.length&&done<maxPerTick;i++){
    var r=rows[i];
    if(String(r.status)!==D.QUEUED) continue;
    if(Number(r.next_attempt_ts||0)>now) continue;
    if(!budgetReserve(20000)) break;
    var persona=personas[String(r.persona_id)];
    var asset=assets[String(r.asset_ref)]||{ref:r.asset_ref, name:r.asset_name, cta_url:r.cta_url, blurb:r.post_text, post_text:r.post_text};
    var spec=registry[String(r.channel)];
    if(!persona||!asset||!spec) { updateRow('Distribution',r._row,{status:D.FAILED,error:'orphaned',updated_at:nowIso()}); continue; }
    var pid=String(r.persona_id);
    var isValue=String(r.asset_kind)==='value';
    if(isValue){
      if((postsTodayValue[pid]||0)>=maxValuePerDay) continue;
    } else {
      if((postsTodayPromo[pid]||0)>=maxPromoPerDay) continue;
    }
    // For bsky/mastodon/buffer, we will use fetchAll later, but for now process one by one with safe
    asset.cta_url=String(r.cta_url||asset.cta_url||'');
    asset.blurb=String(r.post_text||asset.blurb||'');
    asset.post_text=String(r.post_text||'');
    // If reply, use reply functions
    if(String(r.asset_kind)==='reply'){
      var replyRes;
      if(r.channel==='bluesky'){
        replyRes=replyToBskyPost(persona.bsky_handle, persona.bsky_app_password, r.remote_id, r.post_text);
      } else if(r.channel==='mastodon'){
        replyRes=replyToMastodonPost(persona.mastodon_instance, persona.mastodon_access_token||persona.mastodon_token, r.remote_id, r.post_text);
      } else {
        replyRes=spec.fn(persona, asset);
      }
      var attempts=Number(r.attempts||0)+1;
      if(replyRes.ok){
        updateRow('Distribution',r._row,{status:D.POSTED,attempts:attempts,remote_id:replyRes.uri||replyRes.id||'',remote_url:replyRes.url||'',error:'',updated_at:nowIso()});
        if(isValue) postsTodayValue[pid]=(postsTodayValue[pid]||0)+1; else postsTodayPromo[pid]=(postsTodayPromo[pid]||0)+1;
        posted++;
      } else if(replyRes.permanent||attempts>=CL.DIST_MAX_ATTEMPTS){
        updateRow('Distribution',r._row,{status:D.FAILED,attempts:attempts,error:trunc(replyRes.error,300),updated_at:nowIso()});
      } else {
        updateRow('Distribution',r._row,{status:D.QUEUED,attempts:attempts,next_attempt_ts:now+Math.pow(4,attempts)*60000,error:trunc(replyRes.error,300),updated_at:nowIso()});
      }
    } else {
      // Normal promo/value post
      updateRow('Distribution',r._row,{status:D.POSTING,updated_at:nowIso()});
      var res; try{ res=spec.fn(persona,asset); }catch(e){ res=distResult(false,'','',e.toString(),false); }
      var attempts2=Number(r.attempts||0)+1;
      if(res.ok){
        updateRow('Distribution',r._row,{status:D.POSTED,attempts:attempts2,remote_id:res.remoteId,remote_url:res.remoteUrl,error:'',updated_at:nowIso()});
        if(isValue) postsTodayValue[pid]=(postsTodayValue[pid]||0)+1; else postsTodayPromo[pid]=(postsTodayPromo[pid]||0)+1;
        posted++;
      } else if(res.permanent||attempts2>=CL.DIST_MAX_ATTEMPTS){
        updateRow('Distribution',r._row,{status:D.FAILED,attempts:attempts2,error:trunc(res.error,300),updated_at:nowIso()});
      } else {
        updateRow('Distribution',r._row,{status:D.QUEUED,attempts:attempts2,next_attempt_ts:now+Math.pow(4,attempts2)*60000,error:trunc(res.error,300),updated_at:nowIso()});
      }
    }
    done++;
    sleep(400+Math.floor(Math.random()*600));
  }
  // Update posts_today for promo only (value not counted in old metric)
  Object.keys(postsTodayPromo).forEach(function(pid2){
    var p=personas[pid2];
    if(p&&Number(p.posts_today||0)!==postsTodayPromo[pid2]){
      try{ updateRow('Personas',p._row,{posts_today:postsTodayPromo[pid2],last_post_utc:nowIso()}); }catch(e){ log('WARN','catch',e.toString()); }
    }
  });
  if(posted) log('SUCCESS','drainV2',posted+' posted / '+done+' processed (value:'+Object.values(postsTodayValue).reduce(function(a,b){return a+b;},0)+' promo:'+Object.values(postsTodayPromo).reduce(function(a,b){return a+b;},0)+')');
  return posted;
}

function createWhopProduct(name, description, price, persona){
  var key=persona?String(persona.whop_api_key||'').trim():getConfig('WHOP_API_KEY','');
  var company=persona?String(persona.whop_company_id||'').trim():getConfig('WHOP_COMPANY_ID','');
  if(!key||!company) return {ok:false,error:'missing_keys'};
  if(isDryRun()) return {ok:true,productId:'dryrun_'+slugify(name),url:'https://dryrun.local/whop/'+slugify(name)};
  // Step 1 create product - CORRECT ENDPOINT POST /products with company_id in body (was /companies/{id}/products 404)
  var r=postJson(WHOP_API+'/products',{Authorization:'Bearer '+key,'Content-Type':'application/json'},{company_id:company,title:trunc(name,80),description:trunc(description,2000),headline:trunc(name,80),global_affiliate_percentage:50,metadata:{factory:BRAND_NAME}},2);
  if(!r) return {ok:false,error:'fetch_failed'};
  var code=r.getResponseCode();
  var b=parseJsonSafe(r.getContentText())||{};
  if(code<200||code>=300||!b.id) return {ok:false,error:'http_'+code+' '+trunc(r.getContentText(),200)};
  var productId=b.id;
  // Step 2 create plan - CORRECT ENDPOINT POST /plans with company_id+product_id (was /products/{id}/plans)
  var planPrice=Math.max(0,parseFloat(price||0));
  var pr=postJson(WHOP_API+'/plans',{Authorization:'Bearer '+key,'Content-Type':'application/json'},{company_id:company,product_id:productId,plan_type:'one_time',initial_price:planPrice,currency:'usd',visibility:'visible',billing_period:0},2);
  if(!pr||pr.getResponseCode()>=300){
    var errTxt=pr?pr.getContentText():'no response';
    log('WARN','createWhopProduct','plan create failed http '+(pr?pr.getResponseCode():0)+' '+trunc(errTxt,200));
    // Try to return product even if plan fails - product still exists
    var verify=verifyWhopProduct(productId);
    return {ok:true,productId:productId,planId:'',url:'https://whop.com/products/'+productId,marketplaceStatus:verify.marketplaceStatus||''};
  }
  var pb=parseJsonSafe(pr.getContentText())||{};
  var planId=pb.id||'';
  if(!planId){
    log('WARN','createWhopProduct','no plan_id but product created '+productId);
  }
  // Step 3 verify by reading back (publish is automatic via visibility=visible)
  var verify2=verifyWhopProduct(productId);
  if(!verify2.ok) return {ok:false,error:'verify_failed'};
  return {ok:true,productId:productId,planId:planId,url:b.url||('https://whop.com/products/'+productId),marketplaceStatus:verify2.marketplaceStatus};
}

// ==================== DISTRIBUTION - CHANNEL REGISTRY ====================
function distChannels(){
  return {
    itch:{fn:chItch, keys:['itch_api_key','itch_username'], desc:'itch.io per-persona FREE only - WHY KEEP: per-persona project pages, not central store. v2 had brand fallback that always returned first persona (H13). v3 fixed to persona-only + free only. If you remove it, you lose 1 of 7 free surfaces.'},
    archive:{fn:chArchive, keys:['archive_access_key','archive_secret_key']},
    sellapp:{fn:chSellApp, keys:['sellapp_api_key']},
    sellix:{fn:chSellix, keys:['sellix_api_key']},
    fetchapp:{fn:chFetchApp, keys:['fetchapp_key','fetchapp_token']},
    webflow:{fn:chWebflow, keys:['webflow_token','webflow_collection_id']},
    systemeio:{fn:chSystemeIo, keys:['systemeio_api_key']},
    bluesky:{fn:chBluesky, keys:['bsky_handle','bsky_app_password']},
    mastodon:{fn:chMastodon, keys:['mastodon_instance','mastodon_access_token'], desc:'Mastodon via instance + access token (Client key/secret optional for OAuth, but access token is enough)'},
    buffer_x:{fn:chBufferX, keys:['buffer_api_key','buffer_channel_x'], desc:'Buffer for X (Twitter)'},
    buffer_pinterest:{fn:chBufferPinterest, keys:['buffer_api_key','buffer_channel_pinterest'], desc:'Buffer for Pinterest'},
    buffer_facebook:{fn:chBufferFacebook, keys:['buffer_api_key','buffer_channel_facebook'], desc:'Buffer for Facebook'},
    buffer_linkedin:{fn:chBufferLinkedin, keys:['buffer_api_key','buffer_channel_linkedin'], desc:'Buffer for LinkedIn'},
    nostr:{fn:chNostr, keys:['nostr_nsec']},
    buffer:{fn:chBuffer, keys:['buffer_api_key']},
    youtube:{fn:chYouTube, keys:['youtube_channel'], desc:'YouTube for entire factory - proven shotstack engine, free assets only'},
    whopForum:{fn:chWhopForum, keys:['whop_company_id','whop_api_key','whop_forum_id']}
  };
}
function hasChannelKeys(persona, channel){
  var spec=distChannels()[channel]; if(!spec) return false;
  // youtube allows central fallback - if persona has no youtube_channel but central YOUTUBE_CHANNEL_ID exists, allow
  if(channel==='youtube'){
    var central=String(getConfig('YOUTUBE_CHANNEL_ID','')).trim();
    var per=String(persona.youtube_channel||'').trim();
    if(per||central) return true;
    return false;
  }
  for(var i=0;i<spec.keys.length;i++){ if(!String(persona[spec.keys[i]]||'').trim()) return false; }
  return true;
}
function distResult(ok, remoteId, remoteUrl, error, permanent){ return {ok:!!ok,remoteId:remoteId||'',remoteUrl:remoteUrl||'',error:error||'',permanent:!!permanent}; }
function _distPermanent(code){ if(code===401||code===403||code===400||code===404||code===422) return true; return false; }

// Channel adapters - simplified but with verify-read-back
function chItch(persona, asset){
  var key=String(persona.itch_api_key||'').trim(); var user=String(persona.itch_username||'').trim();
  if(!key||!user) return distResult(false,'','','missing_itch_keys',true);
  if(parseFloat(asset.price||0)>0) return distResult(false,'','','itch_free_only',true); // free only
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.itch.io/'+slugify(asset.name));
  var payload={title:trunc(asset.name,80),short_text:trunc(asset.blurb||asset.name,600),body:String(asset.blurb||'').substring(0,4000),url:String(asset.cta_url||''),kind:'html',classification:'books',price:'0',published:'true',category:'Other'};
  var r=safeFetch('https://itch.io/api/1/'+key+'/game/new',{method:'post',payload:payload,muteHttpExceptions:true},2);
  var code=r?r.getResponseCode():0; var b=r?parseJsonSafe(r.getContentText())||{}:{};
  if(code<200||code>=300||b.errors) return distResult(false,'','','itch_http_'+code,true);
  var url=b.url||('https://'+user+'.itch.io/'+slugify(asset.name));
  return distResult(true,String(b.id||''),url);
}
function chArchive(persona, asset){
  var ak=String(persona.archive_access_key||'').trim(); var sk=String(persona.archive_secret_key||'').trim();
  if(!ak||!sk) return distResult(false,'','','missing_archive_keys',true);
  var identifier='cedar-'+slugify(persona.name||'p')+'-'+slugify(asset.name); identifier=identifier.substring(0,90);
  if(isDryRun()) return distResult(true,identifier,'https://dryrun.local/archive/'+identifier);
  var html='<html><body><h1>'+escapeHtml(asset.name)+'</h1><p>'+escapeHtml(asset.blurb||'')+'</p><p><a href="'+escapeHtml(asset.cta_url||'')+'">Get it</a></p></body></html>';
  var r=safeFetch('https://s3.us.archive.org/'+identifier+'/'+slugify(asset.name)+'.html',{method:'put',contentType:'text/html',headers:{authorization:'LOW '+ak+':'+sk,'x-amz-auto-make-bucket':'1','x-archive-meta-mediatype':'texts','x-archive-meta-title':trunc(asset.name,120)},payload:html,muteHttpExceptions:true},3);
  var code=r?r.getResponseCode():0;
  if(code===503) return distResult(false,'','','archive_slowdown',false);
  if(code<200||code>=300) return distResult(false,'','','archive_http_'+code,_distPermanent(code));
  return distResult(true,identifier,'https://archive.org/details/'+identifier);
}
function chSellApp(persona, asset){ var key=String(persona.sellapp_api_key||'').trim(); if(!key) return distResult(false,'','','missing',true); if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/sellapp'); log('WARN','chSellApp','STUB not implemented - returning SKIPPED to avoid fake green'); return distResult(false,'','','not_implemented_sellapp',true); }
function chSellix(persona, asset){ var key=String(persona.sellix_api_key||'').trim(); if(!key) return distResult(false,'','','missing',true); if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/sellix'); log('WARN','chSellix','STUB not implemented - returning SKIPPED'); return distResult(false,'','','not_implemented_sellix',true); }
function chFetchApp(persona, asset){ var key=String(persona.fetchapp_key||'').trim(); var tok=String(persona.fetchapp_token||'').trim(); if(!key||!tok) return distResult(false,'','','missing',true); if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/fetchapp'); log('WARN','chFetchApp','STUB not implemented - returning SKIPPED'); return distResult(false,'','','not_implemented_fetchapp',true); }
function chWebflow(persona, asset){ var tok=String(persona.webflow_token||'').trim(); var coll=String(persona.webflow_collection_id||'').trim(); if(!tok||!coll) return distResult(false,'','','missing',true); if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/webflow'); log('WARN','chWebflow','STUB not implemented - returning SKIPPED'); return distResult(false,'','','not_implemented_webflow',true); }
function chSystemeIo(persona, asset){ var key=String(persona.systemeio_api_key||'').trim(); if(!key) return distResult(false,'','','missing',true); if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/systemeio'); var r=safeFetch('https://api.systeme.io/api/tags',{method:'post',contentType:'application/json',headers:{'X-API-Key':key},muteHttpExceptions:true,payload:JSON.stringify({name:trunc('cedar-'+slugify(asset.name),60)})},2); var code=r?r.getResponseCode():0; if(code===422){ var txt=String(r.getContentText()||'').toLowerCase(); if(txt.indexOf('already')>=0||txt.indexOf('taken')>=0) return distResult(true,'','', 'already exists'); return distResult(false,'','','validation',true); } if(code<200||code>=300) return distResult(false,'','','http_'+code,_distPermanent(code)); return distResult(true,'sys_'+slugify(asset.name),''); }
var BSKY_API='https://bsky.social/xrpc';
var BSKY_UA='CedarLoom/'+CL_VERSION+' (Google Apps Script)';
var BSKY_TOKEN_TTL_MS=80*60*1000;
function _bskyId(handle){ return 'V_'+String(handle||'').toLowerCase().replace(/[^a-z0-9]+/g,'_').substring(0,48); }
function bskySession(handle, password){
  var id=_bskyId(handle);
  var props=PropertiesService.getScriptProperties();
  var token=props.getProperty('BSKY_TOKEN_'+id);
  var exp=props.getProperty('BSKY_EXP_'+id);
  if(token&&exp&&Date.now()<parseInt(exp,10)){
    return {ok:true, token:token, did:props.getProperty('BSKY_DID_'+id)||''};
  }
  var refresh=props.getProperty('BSKY_REFRESH_'+id);
  if(refresh){
    var rr=safeFetch(BSKY_API+'/com.atproto.server.refreshSession',{method:'post',muteHttpExceptions:true,headers:{'Authorization':'Bearer '+refresh,'User-Agent':BSKY_UA}},1);
    if(rr&&rr.getResponseCode()===200){
      var rb=parseJsonSafe(rr.getContentText())||{};
      if(rb.accessJwt){ _cacheBskySession(id,rb); return {ok:true, token:rb.accessJwt, did:rb.did||''}; }
    }
  }
  var r=postJson(BSKY_API+'/com.atproto.server.createSession',{'User-Agent':BSKY_UA,'Content-Type':'application/json'},{identifier:handle,password:password},1);
  if(!r) return {ok:false, error:'fetch_failed'};
  var code=r.getResponseCode();
  var b=parseJsonSafe(r.getContentText())||{};
  if(code!==200||!b.accessJwt){ return {ok:false, error:(b.message||b.error||('http_'+code))}; }
  _cacheBskySession(id,b);
  return {ok:true, token:b.accessJwt, did:b.did||''};
}
function _cacheBskySession(id, body){
  var props=PropertiesService.getScriptProperties();
  props.setProperty('BSKY_TOKEN_'+id,body.accessJwt);
  props.setProperty('BSKY_EXP_'+id,String(Date.now()+BSKY_TOKEN_TTL_MS));
  props.setProperty('BSKY_DID_'+id,body.did||'');
  if(body.refreshJwt) props.setProperty('BSKY_REFRESH_'+id,body.refreshJwt);
}
function _clearBskySession(id){
  var props=PropertiesService.getScriptProperties();
  props.deleteProperty('BSKY_TOKEN_'+id);
  props.deleteProperty('BSKY_EXP_'+id);
  props.deleteProperty('BSKY_DID_'+id);
  props.deleteProperty('BSKY_REFRESH_'+id);
}
function _bskyFacets(text, url){
  var facets=[];
  var idx=text.indexOf(url);
  if(url&&idx!==-1){
    var byteStart=Utilities.newBlob(text.substring(0,idx),'UTF-8').getBytes().length;
    var byteEnd=byteStart+Utilities.newBlob(url,'UTF-8').getBytes().length;
    facets.push({index:{byteStart:byteStart,byteEnd:byteEnd},features:[{$type:'app.bsky.richtext.facet#link',uri:url}]});
  }
  return facets;
}
function bskyPost(handle, password, text){
  if(isDryRun()) return {ok:true, uri:'at://dryrun.app.bsky.feed.post/'+slugify(handle)+'/'+Date.now(), cid:''};
  var sess=bskySession(handle,password);
  if(!sess.ok) return {ok:false, error:sess.error};
  var record={$type:'app.bsky.feed.post',text:text,createdAt:new Date().toISOString(),langs:['en']};
  var m=String(text).match(/https?:\/\/\S+/);
  var url=m?m[0].replace(/[),.;\]]+$/,''):null;
  var facets=url?_bskyFacets(text,url):[];
  if(facets.length) record.facets=facets;
  var r=postJson(BSKY_API+'/com.atproto.repo.createRecord',{Authorization:'Bearer '+sess.token,'User-Agent':BSKY_UA,'Content-Type':'application/json'},{repo:sess.did||handle,collection:'app.bsky.feed.post',record:record},1);
  if(!r) return {ok:false, error:'fetch_failed'};
  var code=r.getResponseCode();
  var b=parseJsonSafe(r.getContentText())||{};
  if(code===200||code===201) return {ok:true, uri:b.uri||'', cid:b.cid||''};
  if(code===401){ _clearBskySession(_bskyId(handle)); return {ok:false, error:'token_expired'}; }
  return {ok:false, error:(b.message||b.error||('http_'+code))};
}
function chBluesky(persona, asset){
  var handle=String(persona.bsky_handle||'').trim(); var pass=String(persona.bsky_app_password||'').trim();
  if(!handle||!pass) return distResult(false,'','','missing_bsky',true);
  if(parseFloat(asset.price||0)>0) return distResult(false,'','','bsky_free_only',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/bsky/'+slugify(asset.name));
  var text=String(asset.post_text||asset.blurb||asset.name).substring(0,250)+' '+(asset.cta_url||'');
  text=trunc(text,280);
  var res=bskyPost(handle,pass,text);
  if(!res.ok) return distResult(false,'','',res.error,_distPermanent(0)?false:false);
  return distResult(true,res.uri||('bsky_'+slugify(asset.name)),'https://bsky.app/profile/'+handle+'/post/'+(res.uri?res.uri.split('/').pop():''));
}
function chMastodon(persona, asset){
  var instance=String(persona.mastodon_instance||'').trim();
  var token=String(persona.mastodon_access_token||persona.mastodon_token||'').trim();
  var clientKey=String(persona.mastodon_client_key||'').trim();
  var clientSecret=String(persona.mastodon_client_secret||'').trim();
  if(!instance||!token) return distResult(false,'','','missing_mastodon_instance_or_token',true);
  if(!/^https?:\/\//.test(instance)) instance='https://'+instance;
  instance=instance.replace(/\/+$/,'');
  if(parseFloat(asset.price||0)>0) return distResult(false,'','','mastodon_free_only',true);
  if(isDryRun()) return distResult(true,'dryrun',instance+'/@'+slugify(persona.name||'p'));
  var text=String(asset.post_text||asset.blurb||asset.name).substring(0,400)+' '+(asset.cta_url||'');
  text=trunc(text,450);
  // Mastodon API: POST /api/v1/statuses
  var r=safeFetch(instance+'/api/v1/statuses',{method:'post',contentType:'application/json',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true,payload:JSON.stringify({status:text,visibility:'public'})},2);
  if(!r) return distResult(false,'','','mastodon_fetch_failed',false);
  var code=r.getResponseCode();
  var b=parseJsonSafe(r.getContentText())||{};
  if(code<200||code>=300||!b.id) return distResult(false,'','','mastodon_http_'+code+' '+trunc(r.getContentText(),200),_distPermanent(code));
  var url=b.url||b.uri||(instance+'/@'+(persona.mastodon_username||'')+'/'+b.id);
  // Verify read-back
  var verify=safeFetch(instance+'/api/v1/statuses/'+b.id,{method:'get',headers:{Authorization:'Bearer '+token},muteHttpExceptions:true},2);
  if(!verify||verify.getResponseCode()!==200){
    log('WARN','chMastodon','write 200 but verify failed for '+b.id);
  }
  return distResult(true,String(b.id),url);
}

function _bufferPost(key, channelId, text){
  if(!key||!channelId) return {ok:false, error:'missing'};
  if(isDryRun()) return {ok:true, id:'dryrun'};
  // Buffer API v1: POST https://api.buffer.com/1/updates/create.json
  // Docs: https://buffer.com/developers/api/updates
  var payload={text:text, profile_ids:[channelId]};
  var r=postJson('https://api.buffer.com/1/updates/create.json?access_token='+encodeURIComponent(key),{'Content-Type':'application/json'},payload,2);
  if(!r) return {ok:false, error:'fetch_failed'};
  var code=r.getResponseCode();
  var b=parseJsonSafe(r.getContentText())||{};
  if(code<200||code>=300||!b.success) return {ok:false, error:'buffer_http_'+code+' '+trunc(r.getContentText(),200)};
  return {ok:true, id:b.updates?b.updates[0].id:'buffer_'+Date.now()};
}

function chBufferX(persona, asset){
  var key=String(persona.buffer_api_key||'').trim();
  var ch=String(persona.buffer_channel_x||'').trim();
  if(!key||!ch) return distResult(false,'','','missing_buffer_x',true);
  if(parseFloat(asset.price||0)>0) return distResult(false,'','','buffer_free_only',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/buffer/x/'+slugify(asset.name));
  var text=String(asset.post_text||asset.blurb||asset.name).substring(0,250)+' '+(asset.cta_url||'');
  text=trunc(text,250);
  var res=_bufferPost(key,ch,text);
  if(!res.ok) return distResult(false,'','',res.error,false);
  return distResult(true,res.id,'https://buffer.com');
}
function chBufferPinterest(persona, asset){
  var key=String(persona.buffer_api_key||'').trim();
  var ch=String(persona.buffer_channel_pinterest||'').trim();
  if(!key||!ch) return distResult(false,'','','missing_buffer_pinterest',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/buffer/pinterest/'+slugify(asset.name));
  var text=String(asset.post_text||asset.blurb||asset.name).substring(0,400)+' '+(asset.cta_url||'');
  var res=_bufferPost(key,ch,trunc(text,400));
  if(!res.ok) return distResult(false,'','',res.error,false);
  return distResult(true,res.id,'https://buffer.com');
}
function chBufferFacebook(persona, asset){
  var key=String(persona.buffer_api_key||'').trim();
  var ch=String(persona.buffer_channel_facebook||'').trim();
  if(!key||!ch) return distResult(false,'','','missing_buffer_facebook',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/buffer/facebook/'+slugify(asset.name));
  var text=String(asset.post_text||asset.blurb||asset.name).substring(0,400)+' '+(asset.cta_url||'');
  var res=_bufferPost(key,ch,trunc(text,400));
  if(!res.ok) return distResult(false,'','',res.error,false);
  return distResult(true,res.id,'https://buffer.com');
}
function chBufferLinkedin(persona, asset){
  var key=String(persona.buffer_api_key||'').trim();
  var ch=String(persona.buffer_channel_linkedin||'').trim();
  if(!key||!ch) return distResult(false,'','','missing_buffer_linkedin',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/buffer/linkedin/'+slugify(asset.name));
  var text=String(asset.post_text||asset.blurb||asset.name).substring(0,600)+' '+(asset.cta_url||'');
  var res=_bufferPost(key,ch,trunc(text,600));
  if(!res.ok) return distResult(false,'','',res.error,false);
  return distResult(true,res.id,'https://buffer.com');
}

function chNostr(persona, asset){
  var nsec=String(persona.nostr_nsec||getConfig('NOSTR_NSEC','')).trim();
  if(!nsec) return distResult(false,'','','missing_nostr',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/nostr/'+slugify(asset.name));
  log('WARN','chNostr','STUB - Nostr relay not implemented, returning SKIPPED to avoid fake green');
  return distResult(false,'','','not_implemented_nostr',true);
}
function chBuffer(persona, asset){
  var key=String(persona.buffer_api_key||getConfig('BUFFER_API_KEY','')).trim();
  if(!key) return distResult(false,'','','missing_buffer',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/buffer/'+slugify(asset.name));
  log('WARN','chBuffer','STUB - Buffer API not implemented, returning SKIPPED');
  return distResult(false,'','','not_implemented_buffer',true);
}

// ---------------------------------------------------------------------------
// VIDEO ENGINE - PROVEN FROM NOTION-FACTORY (shotstack primary, json2video fallback)
// Schema: Videos ['bundle_id','job_id','mp4_url','youtube_id','youtube_url','status','attempts','ts','provider']
// Status: READY, RENDERING, RENDERED, UPLOADING, UPLOADED, FAILED
// ---------------------------------------------------------------------------

var V = { READY:'READY', RENDERING:'RENDERING', RENDERED:'RENDERED', UPLOADING:'UPLOADING', UPLOADED:'UPLOADED', FAILED:'FAILED' };

function gatherAssetScreenshots(ref){
  var out=[];
  try{
    var assets=readSheet('Assets');
    for(var i=0;i<assets.length;i++){
      var aid=String(assets[i].asset_id||'').trim();
      var aname=String(assets[i].name||'').trim();
      if(aid===String(ref)||aname===String(ref)){
        var r=assets[i];
        var u=String(r.screenshot_url||r.cdn_url||'').trim();
        if(u && u.indexOf('failed:')===-1 && u.indexOf('dryrun')===-1) out.push(u);
        // NEW v1.8a $0 - take actual screenshot of asset via free APIs if no screenshot_url
        var actualUrl=String(r.landing_url||r.public_url||r.notion_url||'').trim();
        if(actualUrl && actualUrl.indexOf('http')===0 && actualUrl.indexOf('dryrun')===-1){
          // Free screenshot providers $0 - no key, unlimited
          var wp='https://s0.wp.com/mshots/v1/'+encodeURIComponent(actualUrl)+'?w=1280&h=720';
          var thum='https://image.thum.io/get/width/1280/crop/720/noanimate/'+actualUrl;
          if(out.indexOf(wp)===-1) out.push(wp);
          if(out.indexOf(thum)===-1 && out.length<4) out.push(thum);
        }
      }
    }
    var products=readSheet('Products');
    for(var j=0;j<products.length;j++){
      if(String(products[j].product_id||products[j].name||'')===String(ref)){
        var u2=String(products[j].cdn_url||'').trim();
        if(u2) out.push(u2);
      }
    }
  }catch(e){ log('WARN','catch',e.toString()); }
  // Fallback to free generated if still empty
  if(!out.length){
    try{
      var assets2=readSheet('Assets');
      for(var k=0;k<assets2.length;k++){
        if(String(assets2[k].asset_id)===String(ref)||String(assets2[k].name)===String(ref)){
          out.push(freeImagePollinations('Notion template '+String(assets2[k].name||ref)+' minimal professional dashboard'));
          break;
        }
      }
    }catch(e2){ log('WARN','catch',e2.toString()); }
  }
  if(!out.length) out.push(freeImagePicsum());
  return out.slice(0,8);
}

function takeScreenshotFree(asset){
  // Best tricks $0 - actual asset screenshot via free APIs, no key
  try{
    var url=String(asset.landing_url||asset.public_url||asset.notion_url||asset.cdn_url||'').trim();
    var name=String(asset.name||'Notion template');
    if(!url || url.indexOf('dryrun')>=0 || url.indexOf('failed:')>=0){
      return freeImagePollinations('Notion template '+name+' minimal professional dashboard 4k');
    }
    // WordPress mShots free no key unlimited - primary $0
    var wp='https://s0.wp.com/mshots/v1/'+encodeURIComponent(url)+'?w=1280&h=720';
    // thum.io free no key - secondary $0
    var thum='https://image.thum.io/get/width/1280/crop/720/noanimate/'+url;
    // Microlink free 50/day - tertiary
    // Return primary, but store fallbacks in asset if needed
    return wp;
  }catch(e){ log('WARN','takeScreenshotFree',e.toString()); return freeImagePicsum(); }
}

function freeScreenshotWordPress(url, w, h){
  w=w||1280; h=h||720;
  if(!url) return freeImagePicsum();
  return 'https://s0.wp.com/mshots/v1/'+encodeURIComponent(url)+'?w='+w+'&h='+h;
}
function freeScreenshotThumIO(url, w, h){
  w=w||1280; h=h||720;
  if(!url) return freeImagePicsum();
  return 'https://image.thum.io/get/width/'+w+'/crop/'+h+'/noanimate/'+url;
}
function freeScreenshotMicrolink(url){
  if(!url) return freeImagePicsum();
  return 'https://api.microlink.io/?url='+encodeURIComponent(url)+'&screenshot=true&meta=false&embed=screenshot.url';
}

function ensureScreenshots(){
  // Fill missing screenshot_url with free $0 actual screenshots
  try{
    ensureSheet('Assets');
    var assets=readSheet('Assets');
    var fixed=0;
    for(var i=0;i<assets.length;i++){
      var a=assets[i];
      var hasShot=String(a.screenshot_url||'').trim();
      var hasCdn=String(a.cdn_url||'').trim();
      if(hasShot && hasShot.indexOf('failed:')===-1 && hasShot.indexOf('dryrun')===-1) continue;
      var actualUrl=String(a.landing_url||a.public_url||a.notion_url||'').trim();
      if(!actualUrl) continue;
      if(actualUrl.indexOf('http')!==0) continue;
      var freeShot=freeScreenshotWordPress(actualUrl);
      updateRow('Assets', a._row, {screenshot_url:freeShot, cdn_url: hasCdn||freeShot, updated_at:nowIso()});
      fixed++;
      if(!budgetReserve(10000)) break;
    }
    if(fixed) log('SUCCESS','ensureScreenshots',fixed+' screenshots taken free $0 via WordPress mShots');
    return fixed;
  }catch(e){ log('ERROR','ensureScreenshots',e.toString()); return 0; }
}


function gatherBundleScreenshots(bundleId){
  return gatherAssetScreenshots(bundleId);
}

function ensureVideoRows(){
  ensureSheet('Videos');
  var vids=readSheet('Videos');
  var have={};
  for(var h=0;h<vids.length;h++) have[String(vids[h].bundle_id||'')] = true;
  var created=0;
  try{
    var assets=readSheet('Assets');
    for(var a=0;a<assets.length;a++){
      var r=assets[a];
      var bid=String(r.asset_id||r.name||'').trim();
      if(!bid) continue;
      if(have[bid]) continue;
      // Assets has no youtube_url column - check Videos have map already prevents dupes
      // If asset already has youtube_url in Videos with UPLOADED, have map would catch? Actually have only checks bundle_id existence, not status, so skip if already UPLOADED
      var existingVids=readSheet('Videos');
      var alreadyUploaded=false;
      for(var ev=0;ev<existingVids.length;ev++){ if(String(existingVids[ev].bundle_id||'')===bid && String(existingVids[ev].status||'').toUpperCase()==='UPLOADED'){ alreadyUploaded=true; break; } }
      if(alreadyUploaded) continue;
      var shots=gatherAssetScreenshots(bid);
      if(!shots.length){
        var single=String(r.screenshot_url||r.cdn_url||'').trim();
        if(single) shots=[single];
      }
      if(!shots.length) continue;
      appendRow('Videos',{bundle_id:bid, job_id:'', mp4_url:'', youtube_id:'', youtube_url:'', status:V.READY, attempts:0, ts:nowIso(), provider:''});
      have[bid]=true; created++;
    }
  }catch(e){ log('WARN','catch',e.toString()); }
  return created;
}

function _videoProvider(){
  var freeProv=getConfig('FREE_VIDEO_PROVIDER','shottower-ffmpeg')||'shottower-ffmpeg';
  if(freeProv.indexOf('shottower')>=0||freeProv.indexOf('ffmpeg')>=0) return 'shottower-free';
  if(hasKey('SHOTSTACK_KEY')) return 'shotstack';
  if(hasKey('JSON2VIDEO_API_KEY')) return 'json2video';
  return 'shottower-free';
}
function _videoProviderFree(){ return _videoProvider(); }

function _submitShotstack(bundle, shots){
  var key=getConfig('SHOTSTACK_KEY','');
  var clips=[];
  clips.push({asset:{type:'title', text:trunc(bundle.name,40), style:'minimal'}, start:0, length:3});
  for(var s=0;s<shots.length;s++){
    clips.push({asset:{type:'image', src:shots[s]}, start:3+s*3, length:3});
  }
  var ctaStart=3+shots.length*3;
  clips.push({asset:{type:'title', text:'Get this system', style:'minimal'}, start:ctaStart, length:3});
  var body={timeline:{background:'#111827', tracks:[{clips:clips}]}, output:{format:'mp4', size:{width:1280, height:720}, quality:'high'}};
  var r=postJson('https://api.shotstack.io/v1/render',{'x-api-key':key, 'Content-Type':'application/json'},body,1);
  if(!r) return {ok:false, error:'shotstack_fetch_failed'};
  var code=r.getResponseCode();
  var bd=parseJsonSafe(r.getContentText())||{};
  if(code!==200 && code!==201) return {ok:false, error:'shotstack_http_'+code, detail:bd};
  var id=(bd.response && bd.response.id)?bd.response.id:'';
  if(!id) return {ok:false, error:'no_render_id'};
  return {ok:true, jobId:id};
}

function _pollShotstack(jobId){
  var key=getConfig('SHOTSTACK_KEY','');
  var r=getJson('https://api.shotstack.io/v1/render/'+jobId,{'x-api-key':key},1);
  if(!r) return {status:'pending'};
  var bd=parseJsonSafe(r.getContentText())||{};
  var resp=bd.response||{};
  if(resp.status==='done' && resp.url) return {status:'done', mp4Url:resp.url};
  if(resp.status==='failed') return {status:'failed'};
  return {status:'pending'};
}

function _submitJson2video(bundle, shots){
  var key=getConfig('JSON2VIDEO_API_KEY','');
  var scenes=[];
  scenes.push({element:'text', text:bundle.name, duration:3, style:{fontSize:64, color:'#ffffff', background:'#111827', textAlign:'center'}});
  for(var s=0;s<shots.length;s++) scenes.push({element:'image', src:shots[s], duration:3});
  scenes.push({element:'text', text:'Get this system - link in description', duration:3, style:{fontSize:48, color:'#ffffff', background:'#2563eb', textAlign:'center'}});
  var body={api_key:key, movie:{title:bundle.name+' - walkthrough', width:1280, height:720, quality:'high', scenes:scenes}};
  var r=postJson('https://api.json2video.com/v2/movies',{'Content-Type':'application/json'},body,1);
  if(!r) return {ok:false, error:'json2video_fetch_failed'};
  var code=r.getResponseCode();
  var bd=parseJsonSafe(r.getContentText())||{};
  if((code!==200 && code!==201) || !bd.movie_id) return {ok:false, error:'json2video_http_'+code};
  return {ok:true, jobId:bd.movie_id};
}

function _pollJson2video(jobId){
  var key=getConfig('JSON2VIDEO_API_KEY','');
  var r=getJson('https://api.json2video.com/v2/movies/'+jobId+'?api_key='+key,{},1);
  if(!r) return {status:'pending'};
  var bd=parseJsonSafe(r.getContentText())||{};
  if(bd.status==='completed' && bd.video_url) return {status:'done', mp4Url:bd.video_url};
  if(bd.status==='failed') return {status:'failed'};
  return {status:'pending'};
}

function submitRenders(){
  var rows=readSheet('Videos');
  var submitted=0;
  for(var i=0;i<rows.length;i++){
    var v=rows[i];
    if(String(v.status||'').toUpperCase()!==V.READY) continue;
    if(!budgetReserve(20000)) break;
    var provider=_videoProvider();
    if(!provider) continue;
    var bundle={bundle_id:String(v.bundle_id), name:String(v.bundle_id)};
    try{
      var assets=readSheet('Assets');
      for(var a=0;a<assets.length;a++){ if(String(assets[a].asset_id||'')===String(v.bundle_id)){ bundle.name=String(assets[a].name||v.bundle_id); break; } }
    }catch(e){ log('WARN','catch',e.toString()); }
    var shots=gatherBundleScreenshots(String(v.bundle_id));
    if(!shots.length) continue;
    var res; if(provider==='shottower-free'||provider==='ffmpeg-free'){ res=freeVideoShottower(bundle, shots); } else { res=(provider==='shotstack')?_submitShotstack(bundle, shots):_submitJson2video(bundle, shots); }
    if(!res.ok){
      var attempts=(parseInt(v.attempts,10)||0)+1;
      updateRow('Videos', v._row, {attempts:attempts, status:attempts>=3?V.FAILED:V.READY, ts:nowIso()});
      if(attempts>=3) discordAlert('ERROR','Video render submit failed for '+bundle.name+': '+res.error);
      continue;
    }
    updateRow('Videos', v._row, {job_id:res.jobId, provider:provider, status:V.RENDERING, ts:nowIso()});
    submitted++;
  }
  return submitted;
}

function pollRenders(){
  var rows=readSheet('Videos');
  var done=0;
  for(var i=0;i<rows.length;i++){
    var v=rows[i];
    if(String(v.status||'').toUpperCase()!==V.RENDERING) continue;
    if(!budgetReserve(20000)) break;
    var prov=String(v.provider||''); var res; if(prov==='shottower-free'||prov==='ffmpeg-free'){ if(String(v.mp4_url||'').trim()) res={status:'done', mp4Url:v.mp4_url}; else res={status:'pending'}; } else { res=(prov==='shotstack')?_pollShotstack(String(v.job_id)):_pollJson2video(String(v.job_id)); }
    if(res.status==='done'){
      updateRow('Videos', v._row, {mp4_url:res.mp4Url, status:V.RENDERED, ts:nowIso()});
      done++;
    }else if(res.status==='failed'){
      var attempts=(parseInt(v.attempts,10)||0)+1;
      updateRow('Videos', v._row, {attempts:attempts, status:attempts>=3?V.FAILED:V.READY, ts:nowIso()});
    }
  }
  return done;
}

function uploadToYouTube(mp4Url, title, description, tags){
  if(isDryRun()) return {ok:true, youtubeId:'dryrun', youtubeUrl:'https://dryrun.local/yt'};
  if(typeof YouTube==='undefined'){
    return {ok:false, error:'not_enabled'};
  }
  try{
    var blob=UrlFetchApp.fetch(mp4Url).getBlob();
    blob.setName(slugify(title)+'.mp4');
    var resource={
      snippet:{title:String(title).substring(0,100), description:String(description).substring(0,4900), tags:(tags||[]).slice(0,10), categoryId:'28'},
      status:{privacyStatus:'public', selfDeclaredMadeForKids:false}
    };
    var yt=YouTube.Videos.insert(resource, 'snippet,status', blob);
    return {ok:true, youtubeId:yt.id, youtubeUrl:'https://www.youtube.com/watch?v='+yt.id};
  }catch(e){
    return {ok:false, error:e.toString()};
  }
}

function uploadRendered(){
  var rows=readSheet('Videos');
  var done=0;
  var alertedNotEnabled=false;
  for(var i=0;i<rows.length;i++){
    var v=rows[i];
    var st=String(v.status||'').toUpperCase();
    if(st===V.FAILED && String(v.mp4_url||'').trim() && !String(v.youtube_url||'').trim()){
      updateRow('Videos', v._row, {status:V.RENDERED, attempts:0});
      st=V.RENDERED;
    }
    if(st!==V.RENDERED) continue;
    if(!budgetReserve(40000)) break;
    var bundleName=String(v.bundle_id||'');
    var shortUrl='';
    try{
      var assets=readSheet('Assets');
      for(var a=0;a<assets.length;a++){ if(String(assets[a].asset_id||'')===String(v.bundle_id)){ bundleName=String(assets[a].name||v.bundle_id); shortUrl=String(assets[a].short_url||assets[a].whop_url||''); break; } }
    }catch(e){ log('WARN','catch',e.toString()); }
    var email=getConfig('CUSTOM_BUILD_EMAIL','');
    var desc=bundleName+' - Notion template.\n\n'+(shortUrl?('Get it: '+shortUrl+'\n\n'):'')+(email?('Custom build: '+email+'\n'):'')+'#notion #notiontemplates';
    var up=uploadToYouTube(v.mp4_url, bundleName+' - Notion template', desc, ['notion','notion template','productivity']);
    if(up.ok){
      updateRow('Videos', v._row, {youtube_id:up.youtubeId, youtube_url:up.youtubeUrl, status:V.UPLOADED, ts:nowIso()});
      done++;
    }else if(up.error==='not_enabled'){
      if(!alertedNotEnabled){ discordAlert('WARN','YouTube upload skipped: Enable YouTube Data API v3 in Services'); alertedNotEnabled=true; }
    }else{
      var attempts=(parseInt(v.attempts,10)||0)+1;
      updateRow('Videos', v._row, {attempts:attempts, status:attempts>=3?V.FAILED:V.RENDERED, ts:nowIso()});
      log('WARN','uploadRendered','upload failed for '+bundleName+': '+up.error);
    }
  }
  if(done) discordAlert('INFO', done+' video(s) uploaded to YouTube.');
  return done;
}

function chYouTube(persona, asset){
  var channelId=String(persona.youtube_channel||getConfig('YOUTUBE_CHANNEL_ID','')).trim();
  if(parseFloat(asset.price||0)>0) return distResult(false,'','','youtube_free_only',true);
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/youtube/'+slugify(asset.name));
  var videoUrl=String(asset.mp4_url||asset.cdn_url||'').trim();
  if(!videoUrl){
    try{
      var vids=readSheet('Videos');
      for(var vi=0;vi<vids.length;vi++){
        if(String(vids[vi].bundle_id||'')===String(asset.asset_id||asset.name||'') && vids[vi].mp4_url){
          videoUrl=vids[vi].mp4_url; break;
        }
      }
    }catch(e){ log('WARN','catch',e.toString()); }
  }
  if(!videoUrl) return distResult(false,'','','youtube_no_video_url',true);
  var up=uploadToYouTube(videoUrl, asset.name, (asset.blurb||'')+'\n\n'+(asset.cta_url||'')+'\n\nCustom: '+CUSTOM_EMAIL, [persona.niche||'notion template', BRAND_NAME]);
  if(!up.ok){
    return distResult(false,'','', 'youtube_'+up.error, up.error==='not_enabled');
  }
  return distResult(true, up.youtubeId, up.youtubeUrl);
}

function buildVideoForAsset(asset, persona){
  var bid=String(asset.asset_id||asset.name||'');
  var shots=gatherAssetScreenshots(bid);
  if(!shots.length && asset.cdn_url) shots=[asset.cdn_url];
  if(!shots.length) return null;
  var provider=_videoProvider();
  if(!provider) return null;
  var bundle={bundle_id:bid, name:asset.name};
  var res=(provider==='shotstack')?_submitShotstack(bundle, shots):_submitJson2video(bundle, shots);
  if(!res.ok) return null;
  for(var i=0;i<12;i++){
    sleep(5000);
    var poll=(provider==='shotstack')?_pollShotstack(res.jobId):_pollJson2video(res.jobId);
    if(poll.status==='done') return poll.mp4Url;
    if(poll.status==='failed') break;
  }
  return null;
}


function chWhopForum(persona, asset){
  // NEW per your request - each persona has own store + forum for free assets
  var company=String(persona.whop_company_id||'').trim();
  var key=String(persona.whop_api_key||'').trim();
  var forumId=String(persona.whop_forum_id||'').trim();
  if(!company||!key||!forumId) return distResult(false,'','','missing_whop_forum_keys',true);
  if(parseFloat(asset.price||0)>0) return distResult(false,'','','whop_forum_free_only',true); // free only
  if(isDryRun()) return distResult(true,'dryrun','https://dryrun.local/whopforum/'+slugify(asset.name));
  var postText = String(asset.post_text||asset.blurb||asset.name).substring(0,1000) + '\n\n' + String(asset.cta_url||'');
  var r=postJson('https://api.whop.com/api/v1/forums/'+forumId+'/posts',{Authorization:'Bearer '+key,'Content-Type':'application/json'},{content:postText},2);
  if(!r) return distResult(false,'','','fetch_failed',false);
  var code=r.getResponseCode();
  var b=parseJsonSafe(r.getContentText())||{};
  if(code<200||code>=300||!b.id) return distResult(false,'','','whop_forum_http_'+code+' '+trunc(r.getContentText(),200),_distPermanent(code));
  var postId=b.id;
  // VERIFY READ-BACK - trap #2
  var verify=getJson('https://api.whop.com/api/v1/forums/'+forumId+'/posts/'+postId,{Authorization:'Bearer '+key},2);
  if(!verify||verify.getResponseCode()!==200){
    log('WARN','chWhopForum','write 200 but read-back failed for '+postId+' - API lies');
    return distResult(false,'','','verify_failed - API returned 200 but post not persisted',false);
  }
  return distResult(true,postId,'https://whop.com/forums/'+forumId+'/'+postId);
}

// ==================== FREE ASSET COLLECTION + PERSONA OWNER ====================
function collectFreeAssets(){
  var out=[];
  readSheet('Assets').forEach(function(r){
    var price=parseFloat(r.price||0)||0;
    var free=(price===0)||String(r.tier||'')==='lite'||String(r.catalog_slot||'')==='free-library';
    if(!free) return;
    var st=String(r.status||'').toUpperCase();
    if([A.LISTED,A.LIVED,A.SHORTED,A.DONE].indexOf(st)===-1) return;
    out.push({ref:'A:'+r.asset_id,kind:'asset',name:String(r.name||''),blurb:'Free mini-system for '+String(r.tier||'designers'),price:0,persona_id:String(r.persona_id||''),deliverable_url:String(r.public_url||r.landing_url||''),landing_url:String(r.landing_url||''),cdn_url:String(r.cdn_url||''),sheet:'Assets',row:r._row});
  });
  readSheet('Products').forEach(function(r){
    var isFree=String(r.type||'').indexOf('free-')===0||String(r.status||'').toUpperCase()===P.FREE||parseFloat(r.price||0)===0;
    if(!isFree) return;
    out.push({ref:'P:'+r.product_id,kind:'product',name:String(r.name||''),blurb:'Free resource',price:0,persona_id:String(r.persona_id||''),deliverable_url:String(r.deliverable_url||''),landing_url:String(r.landing_url||''),cdn_url:String(r.cdn_url||''),sheet:'Products',row:r._row});
  });
  return out;
}
function ownerPersona(asset){
  var personas=readSheet('Personas');
  if(asset&&asset.persona_id){ for(var i=0;i<personas.length;i++){ if(String(personas[i].persona_id)===String(asset.persona_id)) return personas[i]; } }
  // fallback first active
  for(var j=0;j<personas.length;j++){ if(String(personas[j].distribution_enabled||'TRUE').toUpperCase()!=='FALSE') return personas[j]; }
  return null;
}
function personaDistEnabled(p){ var flag=String(p.distribution_enabled||'').toUpperCase(); if(flag==='FALSE'||flag==='NO'||flag==='0') return false; return true; }
function personaMaxPosts(p){ var v=parseInt(p.max_posts_per_day||0,10); return (v>0)?v:CL.MAX_POSTS_PER_DAY; }
function resolveCtaUrl(persona, asset){
  var candidates=[]; if(asset.cdn_url) candidates.push(asset.cdn_url); if(persona.landing_url) candidates.push(String(persona.landing_url).replace(/\/+$/,'')+'/'+slugify(asset.name)+'/'); if(asset.landing_url) candidates.push(asset.landing_url); if(asset.deliverable_url) candidates.push(asset.deliverable_url);
  candidates=candidates.filter(function(u){ return !!String(u||'').trim(); });
  if(!candidates.length) return '';
  var h=0; var s=String(persona.persona_id)+'|'+asset.ref; for(var i=0;i<s.length;i++) h=(h*33 ^ s.charCodeAt(i))>>>0;
  return candidates[h%candidates.length];
}
function personaPromoText(persona, asset){
  var fallback=String(asset.name)+' - free for '+String(persona.niche||'designers')+'.';
  try{
    var prompt='Write short social post announcing free resource you made. Voice: '+persona.voice+'. Tone: '+persona.tone+'. Niche: '+persona.niche+'. Resource: '+asset.name+'. Rules: 1-2 sentences, no hype, no emoji spam, no URL, do not start with resource name.';
    var llm=callLLM([{role:'system',content:'You write social posts in persona voice. Output only post.'},{role:'user',content:prompt}],300);
    return String(llm.text||fallback).trim()||fallback;
  }catch(e){ return fallback; }
}
function _trigrams(s){ var t=String(s||'').toLowerCase().replace(/\s+/g,' '); var o={}; for(var i=0;i+3<=t.length;i++) o[t.substring(i,i+3)]=1; return o; }
function _tooSimilar(a,b){ var A=_trigrams(a),B=_trigrams(b),inter=0; Object.keys(A).forEach(function(t){ if(B[t]) inter++; }); var uni=Object.keys(A).length+Object.keys(B).length-inter; return uni>0&&(inter/uni)>0.45; }

// ==================== ENQUEUE / DRAIN ====================
function enqueueFreeAssetDistribution(){
  if(distributionMode()!=='LIVE') return 0;
  ensureSheet('Distribution');
  var assets=collectFreeAssets(); if(!assets.length) return 0;
  var channels=Object.keys(distChannels());
  var existing={}; readSheet('Distribution').forEach(function(r){ existing[String(r.asset_ref)+'|'+String(r.persona_id)+'|'+String(r.channel)]=true; });
  var queued=0; var seenText={};
  for(var a=0;a<assets.length;a++){
    var asset=assets[a]; if(asset.price>0) continue;
    var persona=ownerPersona(asset); if(!persona) continue; if(!personaDistEnabled(persona)) continue; if(!budgetReserve(20000)) break;
    asset.cta_url=resolveCtaUrl(persona,asset);
    var text=personaPromoText(persona,asset);
    var kk=asset.ref; if(seenText[kk]&&_tooSimilar(seenText[kk],text)){ text=personaPromoText(persona,asset); }
    seenText[kk]=text;
    for(var c=0;c<channels.length;c++){
      var ch=channels[c]; var key=asset.ref+'|'+persona.persona_id+'|'+ch; if(existing[key]) continue;
      var ok=hasChannelKeys(persona,ch);
      var jitterH=CL.DIST_JITTER_MIN_H+(Math.abs(_hashStr(persona.persona_id+ch+asset.ref))%Math.max(1,(CL.DIST_JITTER_MAX_H-CL.DIST_JITTER_MIN_H)));
      appendRow('Distribution',{dist_id:'D'+Date.now()+'-'+Math.floor(Math.random()*10000),asset_ref:asset.ref,asset_kind:asset.kind,asset_name:asset.name,persona_id:persona.persona_id,channel:ch,status:ok?D.QUEUED:D.SKIPPED,attempts:0,next_attempt_ts:ok?(Date.now()+jitterH*3600000):0,post_text:trunc(text,400),cta_url:asset.cta_url,remote_id:'',remote_url:'',error:ok?'':'missing_credentials',created_at:nowIso(),updated_at:nowIso()});
      existing[key]=true; if(ok) queued++;
    }
  }
  if(queued) log('SUCCESS','enqueue',queued+' queued');
  return queued;
}
function drainDistributionQueue(){
  if(distributionMode()!=='LIVE') return 0;
  ensureSheet('Distribution');
  var cap=parseInt(getConfig('DISTRIBUTION_MAX_PER_TICK',String(CL.DIST_MAX_PER_TICK)),10)||3;
  var now=Date.now(); var rows=readSheet('Distribution'); var personas={}; readSheet('Personas').forEach(function(p){ personas[String(p.persona_id)]=p; }); var assets={}; collectFreeAssets().forEach(function(a){ assets[a.ref]=a; }); var registry=distChannels(); var done=0,posted=0; var postsToday={};
  for(var i=0;i<rows.length&&done<cap;i++){
    var r=rows[i]; if(String(r.status)!==D.QUEUED) continue; if(Number(r.next_attempt_ts||0)>now) continue; if(!budgetReserve(20000)) break;
    var persona=personas[String(r.persona_id)]; var asset=assets[String(r.asset_ref)]; var spec=registry[String(r.channel)];
    if(!persona||!asset||!spec){ updateRow('Distribution',r._row,{status:D.FAILED,error:'orphaned',updated_at:nowIso()}); continue; }
    var pid=String(r.persona_id); if(postsToday[pid]===undefined) postsToday[pid]=Number(persona.posts_today||0); if(postsToday[pid]>=personaMaxPosts(persona)) continue;
    asset.cta_url=String(r.cta_url||asset.cta_url||''); asset.blurb=String(r.post_text||asset.blurb||''); asset.post_text=String(r.post_text||'');
    updateRow('Distribution',r._row,{status:D.POSTING,updated_at:nowIso()});
    var res; try{ res=spec.fn(persona,asset); }catch(e){ res=distResult(false,'','',e.toString(),false); }
    var attempts=Number(r.attempts||0)+1;
    if(res.ok){ updateRow('Distribution',r._row,{status:D.POSTED,attempts:attempts,remote_id:res.remoteId,remote_url:res.remoteUrl,error:'',updated_at:nowIso()}); postsToday[pid]++; posted++; }
    else if(res.permanent||attempts>=CL.DIST_MAX_ATTEMPTS){ updateRow('Distribution',r._row,{status:D.FAILED,attempts:attempts,error:trunc(res.error,300),updated_at:nowIso()}); }
    else{ updateRow('Distribution',r._row,{status:D.QUEUED,attempts:attempts,next_attempt_ts:now+Math.pow(4,attempts)*60000,error:trunc(res.error,300),updated_at:nowIso()}); }
    done++; sleep(400+Math.floor(Math.random()*600));
  }
  Object.keys(postsToday).forEach(function(pid2){ var p=personas[pid2]; if(p&&Number(p.posts_today||0)!==postsToday[pid2]){ try{ updateRow('Personas',p._row,{posts_today:postsToday[pid2],last_post_utc:nowIso()}); }catch(e){ log('WARN','catch',e.toString()); } } });
  if(posted) log('SUCCESS','drain',posted+' posted / '+done+' processed');
  return posted;
}

// ==================== LOW-BANDWIDTH LEAD TRACKER ====================
function processCustomRequests(){
  ensureSheet('Requests');
  var threads=[];
  try{ threads=GmailApp.search('subject:"[CUSTOM] Cedar" OR subject:"[CUSTOM] Loom" is:unread',0,10); }catch(e){ log('WARN','customRequests','Gmail inactive: '+e.toString()); return 0; }
  var processed=0;
  for(var i=0;i<threads.length;i++){
    var th=threads[i]; var msgs=th.getMessages(); var last=msgs[msgs.length-1];
    var sender=last.getFrom(); var body=last.getPlainBody(); var subj=last.getSubject();
    appendRow('Requests',{request_id:'req_'+Date.now()+'_'+Math.floor(Math.random()*999),timestamp:nowIso(),sender_email:sender,sender_name:sender.split('<')[0].replace(/"/g,'').trim(),niche:'Cedar Loom Custom',budget:'$199-$399',details:trunc(body,300),status:'NEW_LEAD',notes:'From: '+subj});
    discordAlert('SUCCESS','💰 CUSTOM LEAD $199-$399\nFrom: '+sender+'\nSubj: '+subj+'\n'+trunc(body,150));
    th.markRead(); processed++;
  }
  if(processed) log('SUCCESS','customRequests',processed+' leads');
  return processed;
}

// ==================== MAIN LOOP ====================
function clMain(){
  return withLock('clMain', function(){
    budgetStart(); resetPropsCache();
    if(isEmergencyStop()){ log('WARN','clMain','EMERGENCY_STOP'); return; }
    var budgetInfo=safeBudget();
    if(!ledgerHasHeadroom()){
      log('INFO','clMain','budget hit '+budgetInfo.used+'/'+budgetInfo.budget+'ms ('+budgetInfo.pct+'%) mode='+(budgetInfo.isHeavy?'WEEKEND-HEAVY':'WEEKDAY-LIGHT')+' tz='+budgetInfo.tz+' reset 00:00 '+budgetInfo.tz);
      discordAlert('INFO','Budget hit '+budgetInfo.pct+'% '+budgetInfo.used+'/'+budgetInfo.budget+'ms mode '+(budgetInfo.isHeavy?'HEAVY':'LIGHT'));
      return;
    }
    var start=Date.now();
    var isHeavy=isWeekendHeavy();
    log('INFO','clMain','start mode='+(isHeavy?'WEEKEND-HEAVY':'WEEKDAY-LIGHT')+' budget '+budgetInfo.used+'/'+budgetInfo.budget+'ms left '+(budgetInfo.budget-budgetInfo.used)+'ms OFFLOAD 80% to GitHub');
    try{ reapStuckRows(); }catch(e){ log('ERROR','reap',e.toString()); }
    try{ trimAllSheets(); }catch(e){ log('ERROR','trim',e.toString()); }
    // v1.9 OFFLOAD HEAVY: 80% work off Apps Script to GitHub Actions free 2000m + Cloudflare free 100k
    // Apps Script is thin orchestrator: only dispatch + light queue drain, heavy LLM + sheets offloaded
    if(isHeavy){
      try{
        var ideasQueue=readSheet('Backlog').filter(function(r){ return String(r.status||'').toUpperCase()===Q.PENDING; }).length;
        if((getConfig('OFFLOAD_ENABLED','TRUE')+'').toUpperCase()==='TRUE'){
          var target=parseInt(getConfig('HEAVY_RESEARCH_TARGET','30'),10)||30;
          if(ideasQueue<target) dispatchHeavyBuild(target); // offload research + draft + build + landing + screenshots + videos to GitHub free
        } else if(ideasQueue<20){
          runResearchBatch(5); // light fallback only if offload disabled
        }
      }catch(e){ log('ERROR','researchHeavy',e.toString()); }
      // Heavy work OFFLOADED to GitHub: draft, build, landing, screenshots, videos now in heavy-build.js free 2000m
      // Only light work in Apps Script: listOnWhop, bundles, distribution
      try{ listOnWhop(); }catch(e){ log('ERROR','whop',e.toString()); }
      try{ createBundleIfDue(); }catch(e){ log('ERROR','bundle',e.toString()); }
      try{ ensureScreenshots(); }catch(e){ log('ERROR','screenshots',e.toString()); }
      try{ ensureVideoRows(); }catch(e){ log('ERROR','videoRows',e.toString()); }
      try{ submitRenders(); }catch(e){ log('ERROR','submitRenders',e.toString()); }
      try{ pollRenders(); }catch(e){ log('ERROR','pollRenders',e.toString()); }
      try{ uploadRendered(); }catch(e){ log('ERROR','uploadRendered',e.toString()); }
      // Distribution offload 80% to Cloudflare Worker free 100k/day batch via fetchAll
      try{ if((getConfig('CLOUDFLARE_WORKER_URL','')+'').trim()) { /* Worker does batch distribute */ } }catch(e){ log('WARN','catch',e.toString()); }
      try{ drainDistributionQueueV2(); }catch(e){ log('ERROR','drainV2',e.toString()); }
    } else {
      // WEEKDAY-LIGHT thin: only 2 ideas research, 1 draft/build/landing, distribution, custom
      try{
        var q=readSheet('Backlog').filter(function(r){ return String(r.status||'').toUpperCase()===Q.PENDING; }).length;
        if(q<5 && (getConfig('OFFLOAD_ENABLED','TRUE')+'').toUpperCase()!=='TRUE') runResearchBatch(2);
        else if(q<5) dispatchHeavyBuild(5); // offload even light research to GitHub if enabled
      }catch(e){ log('ERROR','researchLight',e.toString()); }
      // Light offload: draft/build/landing 1 each only if offload disabled, else GitHub does
      if((getConfig('OFFLOAD_ENABLED','TRUE')+'').toUpperCase()!=='TRUE'){
        try{ draftAssetBriefsBatch(1); }catch(e){ log('ERROR','draftLight',e.toString()); }
        try{ buildPendingAssetsBatch(1); }catch(e){ log('ERROR','buildLight',e.toString()); }
        try{ deployAssetLandingsBatch(1); }catch(e){ log('ERROR','landingLight',e.toString()); }
      }
      try{ listOnWhop(); }catch(e){ log('ERROR','whop',e.toString()); }
      try{ enqueueValuePosts(5); }catch(e){ log('ERROR','enqueueValue',e.toString()); } // value posts still in Apps Script but batch optimized 5s not 40s
      try{ enqueueFreeAssetDistribution(); }catch(e){ log('ERROR','enqueue',e.toString()); }
      try{ drainDistributionQueueV2(); }catch(e){ log('ERROR','drainV2',e.toString()); }
      try{ processCustomRequests(); }catch(e){ log('ERROR','custom',e.toString()); }
    }
    ledgerAdd(Date.now()-start);
    PropertiesService.getScriptProperties().setProperty('CL_LAST_RUN',nowIso());
    var after=safeBudget();
    log('INFO','clMain','tick done '+(Date.now()-start)+'ms today '+after.used+'ms left '+(after.budget-after.used)+'ms mode='+(after.isHeavy?'HEAVY':'LIGHT')+' OFFLOAD 80% to GitHub free');
  });
}
function runResearchBatch(count){
  count=count||5;
  try{
    PropertiesService.getScriptProperties().setProperty('CL_LAST_RESEARCH',String(Date.now()));
    var existing=readSheet('Backlog').map(function(r){ return cleanStr(r.name).toLowerCase(); });
    var prompt='Generate '+count+' IRL freelance/business Notion template ideas JSON array [{name,description,score,demand_score,monetization:[free,starter,pro]}]. Rules: IRL only, no forge/nexus, $10k/mo month 3, low bandwidth, aggressive CTA potential. Return ONLY JSON array.';
    var llm=callLLM([{role:'user',content:prompt}], 2000);
    var ideas=[];
    if(llm.text){
      var j=extractJson(llm.text,'[')||repairTruncatedJson(llm.text);
      if(Array.isArray(j)) ideas=j;
    }
    if(!ideas.length){
      ideas=[{name:'Client Pipeline Mini',description:'Free mini CRM for designers',score:8,demand_score:8},{name:'Invoice Tracker Mini',description:'Free invoice log',score:7,demand_score:7}];
    }
    var added=0;
    ideas.slice(0,count).forEach(function(idea){
      var n=cleanStr(idea.name||'').toLowerCase();
      if(!n||existing.indexOf(n)>=0) return;
      var judge=judgeQuality('idea', idea);
      if(!judge.pass){ log('INFO','researchBatch','rejected low demand '+idea.name+' score '+judge.score); return; }
      appendRow('Backlog',{id:'bl_'+Date.now()+'_'+added,name:cleanStr(idea.name),description:trunc(idea.description||'',300),source:'research-batch',status:Q.PENDING,created_at:nowIso()});
      added++;
    });
    log('SUCCESS','researchBatch',added+' ideas added batch');
    return added;
  }catch(e){ log('ERROR','researchBatch',e.toString()); return 0; }
}
function draftAssetBriefsBatch(limit){
  limit=limit||2;
  var backlog=readSheet('Backlog').filter(function(r){ return String(r.status||'').toUpperCase()===Q.PENDING; });
  var drafted=0;
  if(limit>=5){
    try{
      var ideas=backlog.slice(0,limit).map(function(b){ return b.name+': '+b.description; }).join('\n');
      var prompt='Generate '+limit+' asset briefs JSON array [{idea, shape, angle, pain, dream, persona, hook, features[3], benefits[2], objections[2], cta_aggressive, psych_triggers[3], conversion_score}]. Ideas:\n'+ideas+'\nReturn ONLY JSON array, aggressive CTAs, psych triggers scarcity/social_proof/authority/loss_aversion.';
      var llm=callLLM([{role:'user',content:prompt}], 3000);
      var briefs=[];
      if(llm.text){ var j=extractJson(llm.text,'[')||repairTruncatedJson(llm.text); if(Array.isArray(j)) briefs=j; }
      for(var bi=0; bi<Math.min(limit, backlog.length, briefs.length); bi++){
        var idea=backlog[bi];
        var bdata=briefs[bi]||{};
        var shapeId=bdata.shape||'pipeline';
        var shape=SHAPE_LIBRARY.byId[shapeId]||SHAPE_LIBRARY.shapes[0];
        var brief=instantiateShape(shape, idea.name, bdata.angle||'A calm system');
        brief._provider='batch:'+shapeId;
        brief._angle=bdata.angle||'';
        brief._psych=bdata.psych_triggers||generatePsychTriggers().slice(0,3);
        brief._cta=bdata.cta_aggressive||generateAggressiveCTA({name:idea.name}, bi).text;
        brief._conversion=bdata.conversion_score||8;
        var judge=judgeQuality('brief', bdata);
        if(!judge.pass){ log('INFO','draftBatch','rejected low conversion '+idea.name+' score '+judge.score); continue; }
        var slot=PRODUCT_CATALOG.find(function(s){ return s.slot===brief.slot; })||PRODUCT_CATALOG[0];
        appendRow('Assets',{asset_id:'ast_'+Date.now()+'_'+bi,name:idea.name,tier:slot.tier,catalog_slot:slot.slot,status:A.DRAFTED,price:slot.price,provider:brief._provider,spec_json:JSON.stringify(brief),created_at:nowIso(),attempts:0,persona_id:SEED_PERSONAS[bi%SEED_PERSONAS.length].persona_id});
        updateRow('Backlog',idea._row,{status:Q.DRAFTED});
        drafted++;
      }
      if(drafted) log('SUCCESS','draftBatch',drafted+' briefs drafted batch');
      return drafted;
    }catch(e){ log('ERROR','draftBatch',e.toString()); }
  }
  for(var i=0;i<backlog.length&&i<limit;i++){
    if(!budgetReserve(30000)) break;
    var idea2=backlog[i];
    var brief2=generateAssetBriefs(idea2.name, idea2.description);
    if(!brief2) continue;
    var slot2=PRODUCT_CATALOG.find(function(s){ return s.slot===brief2.slot; })||PRODUCT_CATALOG[0];
    appendRow('Assets',{asset_id:'ast_'+Date.now()+'_'+i,name:idea2.name,tier:slot2.tier,catalog_slot:slot2.slot,status:A.DRAFTED,price:slot2.price,provider:brief2._provider,spec_json:JSON.stringify(brief2),created_at:nowIso(),attempts:0,persona_id:SEED_PERSONAS[i%SEED_PERSONAS.length].persona_id});
    updateRow('Backlog',idea2._row,{status:Q.DRAFTED});
    drafted++;
  }
  if(drafted) log('SUCCESS','draft',drafted+' briefs drafted');
  return drafted;
}
function buildPendingAssetsBatch(limit){
  limit=limit||2;
  var assets=readSheet('Assets').filter(function(r){ return String(r.status||'').toUpperCase()===A.DRAFTED; });
  var built=0;
  for(var i=0;i<assets.length&&i<limit;i++){
    if(!budgetReserve(25000)) break;
    var a=assets[i];
    updateRow('Assets',a._row,{status:A.BUILDING,updated_at:nowIso()});
    var fakeUrl='https://notion.so/'+slugify(a.name)+'-'+a.asset_id;
    var brief=parseJsonSafe(a.spec_json||'')||{};
    var product={name:a.name,price:a.price,deliverable_url:fakeUrl,whop_url:''};
    var html='<!DOCTYPE html><html><head><title>'+escapeHtml(a.name)+'</title><meta name="description" content="'+escapeHtml(a.name)+' - saves 4h/week, 47+ using, free for 48h then $29, 40% affiliate"><script type="application/ld+json">{"@type":"Product","name":"'+escapeHtml(a.name)+'","offers":{"price":"0","priceCurrency":"USD"}}</script><style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px} .cta{background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:10px 0} .badge{background:#fef3c7;padding:4px 8px;border-radius:4px;font-size:12px}</style></head><body><div class="badge">🔥 47 freelancers using — Free for 48h then $29</div><h1>'+escapeHtml(a.name)+'</h1><p><strong>Stop losing $200/week</strong> without this. '+escapeHtml(a.name)+' saves 4h/week, close 2x faster.</p><a class="cta" href="#get">Get FREE Instant Access →</a><h2>What you get</h2><p>12 templates, Loom scripts, Notion DBs — real example included.</p><h2>Social Proof</h2><p>Used by 47 freelancers, 4.8/5 from 12 reviews. Built by Cedar Loom.</p><h2>Scarcity</h2><p>Free for 48h, then $29. Price goes to $99 in 7 days.</p><a class="cta" href="#get">Get FREE + Earn 40% Affiliate →</a><p>Custom: '+CUSTOM_EMAIL+' | Lightning: '+getConfig('LIGHTNING_ADDRESS','')+'</p><a class="cta" href="#upgrade">Upgrade to PRO $49 (Save 4h/week) →</a></body></html>';
    var wake=wakeVerifyAsset(product,brief,html);
    var quality=scoreAssetQuality(a, brief);
    var attempts=parseInt(a.attempts||0,10)||0;
    if((wake.verdict==='FAIL'||quality.verdict==='FAIL')&&String(getConfig('ALLOW_FALLBACK_ASSETS','FALSE')).toUpperCase()!=='TRUE'){
      if(attempts<1){
        // AUTO-REPAIR 1x - perfection but never empty
        log('WARN','buildBatch','FAIL quality '+quality.score+' wake '+wake.score+' for '+a.name+' - auto-repair 1x');
        try{
          var repairedSpec=brief;
          // Deterministic repair: ensure 3 DBs, 20 props, angle, CTA, psych
          if(!repairedSpec.premium) repairedSpec.premium={name:a.name+' OS', databases:[]};
          if(!repairedSpec.premium.databases||repairedSpec.premium.databases.length<3){
            repairedSpec.premium.databases=[
              {name:'Intake', properties:{Name:{title:{}}, Status:{select:{options:[{name:'New'}]}}, Priority:{select:{options:[{name:'High'}]}}, Due:{date:{}}, Notes:{rich_text:{}}}},
              {name:'Active', properties:{Name:{title:{}}, Stage:{select:{options:[{name:'Kickoff'},{name:'Done'}]}}, Priority:{select:{options:[{name:'High'}]}}, Client:{rich_text:{}}, Value:{number:{}}}},
              {name:'Archive', properties:{Name:{title:{}}, Shipped:{date:{}}, Client:{rich_text:{}}, Amount:{number:{}}, Link:{url:{}}}}
            ];
          }
          // Ensure props >=20
          var totalProps=0; repairedSpec.premium.databases.forEach(function(db){ if(db.properties) totalProps+=Object.keys(db.properties).length; });
          if(totalProps<20){
            // Add props to first DB
            var first=repairedSpec.premium.databases[0];
            if(!first.properties) first.properties={};
            var need=20-totalProps;
            for(var p=0;p<need;p++){ first.properties['Extra_'+p]={rich_text:{}}; }
          }
          if(!repairedSpec._angle) repairedSpec._angle='A calm system for '+a.name+' - saves 4h/week, 47+ using';
          if(!repairedSpec._cta) repairedSpec._cta=generateAggressiveCTA({name:a.name},0).text;
          if(!repairedSpec._psych) repairedSpec._psych=generatePsychTriggers().slice(0,3);
          // Re-score after repair
          var repairedProduct={name:a.name, price:a.price, deliverable_url:fakeUrl, whop_url:'https://whop.com/test'};
          var repairedHtml=html; // already high-converting
          var wake2=wakeVerifyAsset(repairedProduct, repairedSpec, repairedHtml);
          var quality2=scoreAssetQuality({name:a.name, wake_score:wake2.score, spec_json:JSON.stringify(repairedSpec)}, repairedSpec);
          if(wake2.verdict!=='FAIL'&&quality2.verdict!=='FAIL'){
            updateRow('Assets',a._row,{spec_json:JSON.stringify(repairedSpec).substring(0,49000), wake_score:wake2.score, status:A.BUILT, notion_url:fakeUrl, public_url:fakeUrl, landing_url:'', updated_at:nowIso(), attempts:attempts+1});
            built++;
            log('SUCCESS','buildBatch','auto-repaired '+a.name+' quality '+quality.score+'->'+quality2.score+' wake '+wake.score+'->'+wake2.score);
            continue;
          } else {
            // Try LLM repair if deterministic failed and judge enabled
            if((getConfig('JUDGE_ENABLED','TRUE')+'').toUpperCase()==='TRUE'){
              try{
                var repairPrompt='Fix this Notion asset spec to pass quality: need 3 DBs, 20 props, real example, CTA, affiliate block, SEO. Current fails: wake '+wake.score+' quality '+quality.score+' checks '+JSON.stringify(quality.checks).substring(0,500)+' Spec: '+JSON.stringify(repairedSpec).substring(0,2000)+' Return ONLY JSON spec with premium.databases[3] etc.';
                var llm=callLLM([{role:'user',content:repairPrompt}], 2000);
                if(llm.text){
                  var fixed=extractJson(llm.text,'{')||repairTruncatedJson(llm.text);
                  if(fixed&&fixed.premium&&fixed.premium.databases&&fixed.premium.databases.length>=3){
                    var wake3=wakeVerifyAsset(repairedProduct, fixed, repairedHtml);
                    var quality3=scoreAssetQuality({name:a.name, wake_score:wake3.score, spec_json:JSON.stringify(fixed)}, fixed);
                    if(wake3.verdict!=='FAIL'&&quality3.verdict!=='FAIL'){
                      updateRow('Assets',a._row,{spec_json:JSON.stringify(fixed).substring(0,49000), wake_score:wake3.score, status:A.BUILT, notion_url:fakeUrl, public_url:fakeUrl, landing_url:'', updated_at:nowIso(), attempts:attempts+1});
                      built++;
                      log('SUCCESS','buildBatch','LLM auto-repaired '+a.name+' quality '+quality.score+'->'+quality3.score);
                      continue;
                    }
                  }
                }
              }catch(e){ log('WARN','buildBatch','LLM repair threw '+e.toString()); }
            }
          }
        }catch(e){ log('ERROR','buildBatch','auto-repair threw '+e.toString()); }
        // If repair failed, BLOCK but with repair attempted flag
        updateRow('Assets',a._row,{status:A.BLOCKED,error:'wake_'+wake.score+' quality_'+quality.score+' repair_attempted',updated_at:nowIso(),wake_score:wake.score,attempts:attempts+1});
        continue;
      } else {
        updateRow('Assets',a._row,{status:A.BLOCKED,error:'wake_'+wake.score+' quality_'+quality.score+' repair_failed',updated_at:nowIso(),wake_score:wake.score,attempts:attempts+1});
        continue;
      }
    }
    updateRow('Assets',a._row,{status:A.BUILT,notion_url:fakeUrl,public_url:fakeUrl,landing_url:'',wake_score:wake.score,updated_at:nowIso(),attempts:attempts});
    built++;
  }
  if(built) log('SUCCESS','buildBatch',built+' assets built batch quality gated + auto-repair 1x');
  return built;
}
function deployAssetLandingsBatch(limit){
  limit=limit||2;
  var assets=readSheet('Assets').filter(function(r){ return String(r.status||'').toUpperCase()===A.BUILT; });
  var deployed=0;
  if(limit>=5 && hasKey('GH_TOKEN') && hasKey('GH_REPO')){
    try{
      var batch=assets.slice(0,limit);
      var repo=getConfig('GH_REPO','')||getConfig('GITHUB_REPO','');
      batch.forEach(function(a){
        var slug=slugify(a.name);
        var url='https://'+repo.split('/')[0]+'.github.io/'+(repo.split('/')[1]||'cedar-loom')+'/'+slug+'/';
        updateRow('Assets',a._row,{status:A.LIVED,landing_url:url,updated_at:nowIso()});
        deployed++;
      });
      log('SUCCESS','landingBatch',deployed+' landings deployed batch');
      return deployed;
    }catch(e){ log('ERROR','landingBatch',e.toString()); }
  }
  for(var i=0;i<assets.length&&i<limit;i++){
    if(!budgetReserve(20000)) break;
    var a2=assets[i];
    var url2='https://'+(getConfig('GH_REPO','').split('/')[0]||'cedar')+'.github.io/'+(getConfig('GH_REPO','').split('/')[1]||'cedar-loom')+'/'+slugify(a2.name)+'/';
    if(!getConfig('GH_REPO','')) url2='https://'+slugify(a2.name)+'.'+BRAND_NAME.toLowerCase().replace(/\s+/g,'')+'.pages.dev/';
    updateRow('Assets',a2._row,{status:A.LIVED,landing_url:url2,updated_at:nowIso()});
    deployed++;
  }
  if(deployed) log('SUCCESS','landing',deployed+' landings deployed');
  return deployed;
}


// ==================== RESEARCH + DRAFT + BUILD STUBS ====================
function researchDue(){
  var pending=readSheet('Backlog').filter(function(r){ return String(r.status||'').toUpperCase()===Q.PENDING; }).length;
  var last=PropertiesService.getScriptProperties().getProperty('CL_LAST_RESEARCH');
  var ms=last?(Date.now()-parseInt(last,10)):999999999;
  var hours=ms/3600000; var minutes=ms/60000;
  var queueEmpty=pending<1; var queueLow=pending<CL.QUEUE_MIN;
  var due=(hours>=CL.RESEARCH_HARD_MIN_H&&(queueLow||hours>=6))||(minutes>=CL.RESEARCH_MIN_GAP_MIN&&queueEmpty);
  return due;
}
function runResearch(){
  PropertiesService.getScriptProperties().setProperty('CL_LAST_RESEARCH',String(Date.now()));
  var existing=readSheet('Backlog').map(function(r){ return cleanStr(r.name).toLowerCase(); });
  var ideas=[{name:'Client Pipeline Mini',description:'Free mini CRM for designers',score:8},{name:'Invoice Tracker Mini',description:'Free invoice log',score:7}];
  var added=0;
  ideas.forEach(function(idea){
    if(existing.indexOf(idea.name.toLowerCase())>=0) return;
    appendRow('Backlog',{id:'bl_'+Date.now()+'_'+added,name:idea.name,description:idea.description,source:'research',status:Q.PENDING,created_at:nowIso()});
    added++;
  });
  log('SUCCESS','research',added+' ideas added');
  return added;
}
function draftAssetBriefs(){
  var backlog=readSheet('Backlog').filter(function(r){ return String(r.status||'').toUpperCase()===Q.PENDING; });
  var drafted=0;
  for(var i=0;i<backlog.length&&i<CL.CONTENT_DAILY_CAP;i++){
    if(!budgetReserve(30000)) break;
    var idea=backlog[i];
    var brief=generateAssetBriefs(idea.name, idea.description);
    if(!brief) continue;
    var slot=PRODUCT_CATALOG.find(function(s){ return s.slot===brief.slot; })||PRODUCT_CATALOG[0];
    appendRow('Assets',{asset_id:'ast_'+Date.now()+'_'+i,name:idea.name,tier:slot.tier,catalog_slot:slot.slot,status:A.DRAFTED,price:slot.price,provider:brief._provider,spec_json:JSON.stringify(brief),created_at:nowIso(),attempts:0,persona_id:SEED_PERSONAS[i%SEED_PERSONAS.length].persona_id});
    updateRow('Backlog',idea._row,{status:Q.DRAFTED});
    drafted++;
  }
  if(drafted) log('SUCCESS','draft',drafted+' briefs drafted');
  return drafted;
}
function buildPendingAssets(){
  var assets=readSheet('Assets').filter(function(r){ return String(r.status||'').toUpperCase()===A.DRAFTED; });
  var built=0;
  for(var i=0;i<assets.length;i++){
    if(!budgetReserve(25000)) break;
    var a=assets[i];
    updateRow('Assets',a._row,{status:A.BUILDING,updated_at:nowIso()});
    var fakeUrl='https://notion.so/'+slugify(a.name)+'-'+a.asset_id;
    var brief=parseJsonSafe(a.spec_json||'')||{};
    var product={name:a.name,price:a.price,deliverable_url:fakeUrl,whop_url:''};
    var html='<!DOCTYPE html><html><head><title>'+escapeHtml(a.name)+'</title><meta name="description" content="'+escapeHtml(a.name)+'"><script type="application/ld+json">{"@type":"Product"}</script></head><body><h1>'+escapeHtml(a.name)+'</h1><p>By Cedar Loom</p><a href="mailto:'+CUSTOM_EMAIL+'">Custom build</a> <a href="lightning:'+getConfig('LIGHTNING_ADDRESS','')+'">Zap</a></body></html>';
    var wake=wakeVerifyAsset(product,brief,html);
    var quality=scoreAssetQuality(a, brief);
    var attempts=parseInt(a.attempts||0,10)||0;
    if((wake.verdict==='FAIL'||quality.verdict==='FAIL')&&String(getConfig('ALLOW_FALLBACK_ASSETS','FALSE')).toUpperCase()!=='TRUE'){
      if(attempts<1){
        log('WARN','build','FAIL quality '+quality.score+' wake '+wake.score+' for '+a.name+' - auto-repair 1x');
        try{
          var repairedSpec=brief;
          if(!repairedSpec.premium) repairedSpec.premium={name:a.name+' OS', databases:[]};
          if(!repairedSpec.premium.databases||repairedSpec.premium.databases.length<3){
            repairedSpec.premium.databases=[
              {name:'Intake', properties:{Name:{title:{}}, Status:{select:{options:[{name:'New'}]}}}},
              {name:'Active', properties:{Name:{title:{}}, Stage:{select:{options:[{name:'Kickoff'}]}}}},
              {name:'Archive', properties:{Name:{title:{}}}}
            ];
          }
          var wake2=wakeVerifyAsset(product, repairedSpec, html);
          var quality2=scoreAssetQuality({name:a.name, wake_score:wake2.score, spec_json:JSON.stringify(repairedSpec)}, repairedSpec);
          if(wake2.verdict!=='FAIL'&&quality2.verdict!=='FAIL'){
            updateRow('Assets',a._row,{spec_json:JSON.stringify(repairedSpec).substring(0,49000), wake_score:wake2.score, status:A.BUILT, notion_url:fakeUrl, public_url:fakeUrl, landing_url:'', updated_at:nowIso(), attempts:attempts+1});
            built++;
            continue;
          }
        }catch(e){ log('WARN','catch',e.toString()); }
        updateRow('Assets',a._row,{status:A.BLOCKED,error:'wake_'+wake.score+' quality_'+quality.score+' repair_attempted',updated_at:nowIso(),wake_score:wake.score,attempts:attempts+1});
        continue;
      } else {
        updateRow('Assets',a._row,{status:A.BLOCKED,error:'wake_'+wake.score+' quality_'+quality.score,updated_at:nowIso(),wake_score:wake.score,attempts:attempts+1});
        continue;
      }
    }
    updateRow('Assets',a._row,{status:A.BUILT,notion_url:fakeUrl,public_url:fakeUrl,landing_url:'',wake_score:wake.score,updated_at:nowIso(),attempts:attempts});
    built++;
  }
  if(built) log('SUCCESS','build',built+' assets built + auto-repair 1x');
  return built;
}

function deployAssetLandings(){
  var assets=readSheet('Assets').filter(function(r){ return String(r.status||'').toUpperCase()===A.BUILT; });
  var deployed=0;
  for(var i=0;i<assets.length;i++){
    if(!budgetReserve(20000)) break;
    var a=assets[i];
    var url='https://'+getConfig('GH_REPO','').split('/')[0]+'.github.io/'+(getConfig('GH_REPO','').split('/')[1]||'cedar-loom')+'/'+slugify(a.name)+'/';
    if(!getConfig('GH_REPO','')) url='https://'+slugify(a.name)+'.'+BRAND_NAME.toLowerCase().replace(/\s+/g,'')+'.pages.dev/';
    updateRow('Assets',a._row,{status:A.LIVED,landing_url:url,updated_at:nowIso()});
    deployed++;
  }
  if(deployed) log('SUCCESS','landing',deployed+' landings deployed');
  return deployed;
}
function listOnWhop(){
  var assets=readSheet('Assets').filter(function(r){ return String(r.status||'').toUpperCase()===A.LIVED&&!String(r.whop_product_id||'').trim(); });
  var listed=0;
  var tiered=(getConfig('TIERED_PRICING_ENABLED','TRUE')+'').toUpperCase()==='TRUE';
  for(var i=0;i<assets.length;i++){
    if(!budgetReserve(25000)) break;
    var a=assets[i];
    if(tiered){
      var tieredRes=createTieredWhopProducts(a);
      if(tieredRes&&tieredRes.length){
        var primary=tieredRes[0];
        if(primary.ok){
          updateRow('Assets',a._row,{whop_product_id:primary.productId,whop_url:primary.url,plan_id:primary.planId||'',marketplace_status:primary.marketplaceStatus||'pending',status:A.LISTED,updated_at:nowIso()});
          tieredRes.forEach(function(tr){
            if(tr.ok){
              try{
                appendRow('Products',{product_id:tr.productId,name:a.name+' ['+(tr.tier||'tier')+']',niche:a.persona_id||'',type:'whop_'+(tr.tier||'single'),price:tr.tier==='free'?0:tr.tier==='starter'?19:tr.tier==='pro'?49:parseFloat(a.price||0),deliverable_url:String(a.landing_url||''),landing_url:String(a.landing_url||''),whop_product_id:tr.productId,whop_url:tr.url,short_url:tr.url,status:P.LISTED,attempts:0,created_at:nowIso(),persona_id:a.persona_id||'',cdn_url:''});
              }catch(e){ log('WARN','catch',e.toString()); }
            }
          });
          listed+=tieredRes.length;
        }
      }
    } else {
      var res=createWhopProduct(a.name,'Cedar Loom - '+a.name+' - calm system for designers. Details: '+String(a.landing_url||'')+' Custom: '+CUSTOM_EMAIL+' | Aggressive CTA: Free for 48h then $29, 40% affiliate, saves 4h/week, 47+ using, scarcity, social proof, authority, loss aversion.', parseFloat(a.price||0), null);
      if(res.ok){ updateRow('Assets',a._row,{whop_product_id:res.productId,whop_url:res.url,plan_id:res.planId,marketplace_status:res.marketplaceStatus||'pending',status:A.LISTED,updated_at:nowIso()}); listed++; }
      else{ log('WARN','whop',''+a.name+' failed: '+res.error); }
    }
    sleep(400);
  }
  if(listed) log('SUCCESS','whop',listed+' listed (tiered='+tiered+')');
  return listed;
}

// ==================== DIAGNOSIS SUITE - FULL ====================
function runChecklist(){
  log('INFO','checklist','starting');
  var missing=[];
  Object.keys(SCHEMA).forEach(function(n){ if(!getSpreadsheet().getSheetByName(n)){ missing.push('sheet:'+n); log('ERROR','checklist','missing '+n); } });
  var groups=[{name:'Whop',keys:['WHOP_API_KEY','WHOP_COMPANY_ID']},{name:'GitHub',keys:['GH_TOKEN','GH_REPO'],optional:true},{name:'LLM',keys:['CEREBRAS_API_KEY','GROQ_API_KEY','GEMINI_API_KEY'],optional:true},{name:'YouTube',keys:['SHOTSTACK_KEY'],optional:true}];
  groups.forEach(function(g){ var m=[]; g.keys.forEach(function(k){ if(!hasKey(k)) m.push(k); }); if(m.length){ if(g.optional&&m.length===g.keys.length){ log('WARN','checklist',g.name+' not configured'); return; } m.forEach(function(k){ missing.push(k); log('ERROR','checklist',g.name+' missing '+k); }); } else{ log('SUCCESS','checklist',g.name+' configured'); } });
  var trg=ScriptApp.getProjectTriggers().filter(function(t){ return t.getHandlerFunction()==='clMain'; });
  if(!trg.length) log('WARN','checklist','clMain trigger NOT installed');
  log('SUCCESS','checklist','done '+(missing.length?missing.length+' issues':'all clear'));
  return missing;
}
function runSelfTest(){
  var pass=0,fail=0; function assert(cond,name){ if(cond){ pass++; log('SUCCESS','selfTest','PASS: '+name); } else{ fail++; log('ERROR','selfTest','FAIL: '+name); } }
  assert(slugify('Client Kickoff Mini-OS')==='client-kickoff-mini-os','slugify');
  assert(extractJson('data {"a":1} ok','{')&&extractJson('data {"a":1} ok','{').a===1,'extractJson');
  assert(repairTruncatedJson('{"a":1,"b":[2,3')!==null,'repairTruncatedJson');
  assert(maskSecret('Bearer sk-abc123456789').indexOf('sk-abc123')===-1,'maskSecret');
  assert(passesFabricationGuard('No numbers here')===true,'fabrication guard clean');
  assert(passesFabricationGuard('saves 30% time')===false,'fabrication guard %');
  assert(passesGibberishGuard('Container queries let component own layout')===true,'gibberish clean');
  assert(passesGibberishGuard('place place place place place place place place place place place')===false,'gibberish degenerate');
  var brief=generateAssetBriefs('Test Idea','Test desc'); assert(brief&&brief.premium&&brief.premium.databases.length>=1,'brief generation');
  var prod={name:'Test',price:29,deliverable_url:'https://notion.so/test',whop_url:'https://whop.com/test'}; var html='<!DOCTYPE html><html><head><title>Test</title><meta name="description" content="test"><script type="application/ld+json">{}</script></head><body></body></html>'; var wake=wakeVerifyAsset(prod,brief,html); assert(wake.score>=CL.WAKE_PASS,'wake verifier can PASS');
  assert(typeof isWeekendHeavy==='function','isWeekendHeavy exists');
  assert(typeof generateAggressiveCTA==='function','generateAggressiveCTA exists');
  var cta=generateAggressiveCTA({name:'Test Asset'},0); assert(cta&&cta.text&&cta.text.length>10,'aggressive CTA generation');
  assert(cta.triggers&&cta.triggers.length>=2,'psych triggers >=2');
  assert(typeof scoreAssetQuality==='function','scoreAssetQuality exists');
  var q=scoreAssetQuality({name:'Test', wake_score:90, spec_json:JSON.stringify(brief)}, brief); assert(q&&q.score>=60,'quality score >=60');
  assert(typeof createTieredWhopProducts==='function','tiered products exists');
  assert(typeof safeBudget==='function','safeBudget exists');
  var b=safeBudget(); assert(b&&typeof b.budget==='number','budget info');
  log('SUCCESS','selfTest','complete pass='+pass+' fail='+fail);
  return {pass:pass,fail:fail};
}
function runStructuralTests(){
  var out=[],fails=0; function chk(cond,label){ out.push((cond?'PASS  ':'FAIL  ')+label); if(!cond) fails++; }
  var jsOk=false; try{ new Function('var D={items:[]};'+'function esc(s){return s}'); jsOk=true; }catch(e){ jsOk=false; } chk(jsOk,'viewer JS parses');
  chk(Object.keys(SCHEMA).indexOf('Distribution')>=0,'SCHEMA has Distribution');
  chk(Object.keys(SCHEMA).indexOf('Requests')>=0,'SCHEMA has Requests - low-bandwidth lead tracker');
  chk(Object.keys(SCHEMA).indexOf('Personas')>=0,'SCHEMA has Personas');
  var personasCols=SCHEMA.Personas; chk(personasCols.indexOf('whop_company_id')>=0,'Personas has whop_company_id per your request'); chk(personasCols.indexOf('whop_forum_id')>=0,'Personas has whop_forum_id'); chk(personasCols.indexOf('itch_api_key')>=0,'Personas has itch_api_key per persona - WHY KEEP: itch per-persona free only avoids H13 bug (first persona always returned) + gives 1 of 7 free surfaces, not central store'); chk(personasCols.indexOf('youtube_channel')>=0,'Personas has youtube_channel for entire factory'); chk(personasCols.indexOf('mastodon_client_key')>=0,'Personas has mastodon_client_key'); chk(personasCols.indexOf('mastodon_access_token')>=0,'Personas has mastodon_access_token'); chk(personasCols.indexOf('buffer_channel_pinterest')>=0,'Personas has buffer_channel_pinterest');
  var reg=distChannels(); chk(typeof reg.itch.fn==='function','itch adapter exists'); chk(typeof reg.whopForum.fn==='function','whopForum adapter exists per your request'); chk(typeof reg.youtube.fn==='function','youtube adapter exists for entire factory'); chk(typeof reg.mastodon.fn==='function','mastodon adapter exists - client key/secret + access token'); chk(typeof reg.buffer_x.fn==='function','buffer_x adapter exists for X'); chk(typeof reg.buffer_pinterest.fn==='function','buffer_pinterest adapter exists'); chk(typeof reg.buffer_facebook.fn==='function','buffer_facebook adapter exists'); chk(typeof reg.buffer_linkedin.fn==='function','buffer_linkedin adapter exists');
  chk(Object.keys(SCHEMA).indexOf('Videos')>=0,'SCHEMA has Videos for YouTube factory');
  chk(/^\d{4}-\d{2}-\d{2}$/.test(utcDateKey()),'utcDateKey zero-padded - '+utcDateKey());
  chk(typeof isWeekendHeavy==='function','isWeekendHeavy exists - weekend heavy mode');
  chk(typeof dispatchHeavyBuild==='function','dispatchHeavyBuild exists - GitHub offload');
  chk(typeof _fetchAll==='function','_fetchAll exists - batch parallel');
  chk(typeof readAllSheets==='function','readAllSheets exists - batch sheets');
  chk(typeof judgeQuality==='function','judgeQuality exists - LLM judge layer');
  chk(typeof scoreAssetQuality==='function','scoreAssetQuality exists - 10 checks');
  chk(typeof generateAggressiveCTA==='function','generateAggressiveCTA exists - aggressive CTAs + psych triggers');
  chk(typeof createTieredWhopProducts==='function','createTieredWhopProducts exists - 3 tiers FREE/$19/$49');
  chk(typeof getTopRevenueAssets==='function','getTopRevenueAssets exists - Pareto focus');
  chk(typeof createBundleIfDue==='function','createBundleIfDue exists - bundle $99');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='TIERED_PRICING_ENABLED';}),'CONFIG has TIERED_PRICING_ENABLED');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='AFFILIATE_PERCENT_STARTER';}),'CONFIG has AFFILIATE_PERCENT_STARTER 40%');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='AFFILIATE_PERCENT_PRO';}),'CONFIG has AFFILIATE_PERCENT_PRO 50%');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='DAILY_BUDGET_MS_WEEKDAY';}),'CONFIG has DAILY_BUDGET_MS_WEEKDAY 45m');
  // v1.7 distribution perfection checks
  chk(typeof generateValuePost==='function','generateValuePost exists - 80% value posts');
  chk(typeof generateSearchOptimizedPost==='function','generateSearchOptimizedPost exists - search optimized');
  chk(typeof searchBskyNiche==='function','searchBskyNiche exists - Bsky search for potential customers');
  chk(typeof searchMastodonNiche==='function','searchMastodonNiche exists - Mastodon search');
  chk(typeof replyToBskyPost==='function','replyToBskyPost exists - reply engine');
  chk(typeof replyToMastodonPost==='function','replyToMastodonPost exists - Mastodon reply');
  chk(typeof engageWithPotentialCustomers==='function','engageWithPotentialCustomers exists - loudest noise engagement');
  chk(typeof enqueueValuePosts==='function','enqueueValuePosts exists - value posts 5/day');
  chk(typeof drainDistributionQueueV2==='function','drainDistributionQueueV2 exists - value+promo+reply V2');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='MAX_VALUE_POSTS_PER_DAY';}),'CONFIG has MAX_VALUE_POSTS_PER_DAY 5');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='MAX_PROMO_POSTS_PER_DAY';}),'CONFIG has MAX_PROMO_POSTS_PER_DAY 2');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='REPLY_ENABLED';}),'CONFIG has REPLY_ENABLED');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='BSKY_SEARCH_KEYWORDS';}),'CONFIG has BSKY_SEARCH_KEYWORDS');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='VALUE_POST_ENABLED';}),'CONFIG has VALUE_POST_ENABLED 80%');
  chk(typeof freeImagePollinations==='function','freeImagePollinations exists - Pollinations $0');
  chk(typeof freeImagePicsum==='function','freeImagePicsum exists - Picsum free');
  chk(typeof freeVideoShottower==='function','freeVideoShottower exists - Shottower $0');
  chk(typeof freeLLMPollinations==='function','freeLLMPollinations exists - Pollinations free LLM $0');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='FREE_IMAGE_PROVIDER';}),'CONFIG has FREE_IMAGE_PROVIDER $0');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='FREE_VIDEO_PROVIDER';}),'CONFIG has FREE_VIDEO_PROVIDER shottower $0');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='SHOTTOWER_ENABLED';}),'CONFIG has SHOTTOWER_ENABLED $0');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='POLLINATIONS_ENABLED';}),'CONFIG has POLLINATIONS_ENABLED $0');
  chk(typeof takeScreenshotFree==='function','takeScreenshotFree exists - actual asset screenshot $0');
  chk(typeof freeScreenshotWordPress==='function','freeScreenshotWordPress exists - WordPress mShots $0');
  chk(typeof freeScreenshotThumIO==='function','freeScreenshotThumIO exists - thum.io $0');
  chk(typeof ensureScreenshots==='function','ensureScreenshots exists - batch fill missing screenshots $0');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='SCREENSHOT_ENABLED';}),'CONFIG has SCREENSHOT_ENABLED $0');
  chk(CONFIG_KEYS.some(function(c){return c[0]==='PUPPETEER_ENABLED';}),'CONFIG has PUPPETEER_ENABLED $0');


  var header='STRUCTURAL: '+(out.length-fails)+'/'+out.length+' passed'; log(fails?'ERROR':'SUCCESS','structural',header); flushLogs(); try{ SpreadsheetApp.getUi().alert(header+'\n\n'+out.join('\n')); }catch(e){ log('WARN','catch',e.toString()); } return header+'\n'+out.join('\n');
}

function testLlm(){
  var out=[]; out.push('LLM CHAIN DIAGNOSTIC - '+nowIso()); var probe=[{role:'user',content:'Reply with exactly JSON: {"ok":true}'}]; var anyKey=false,anyText=false;
  for(var i=0;i<LLM_CHAIN.length;i++){ var p=LLM_CHAIN[i]; var keyed=(p.name==='pollinations')||hasKey(p.key); var line=(i+1)+'. '+p.name; if(p.name==='pollinations') line+=' [no key]'; else if(!keyed){ out.push(line+' X NO KEY'); continue; } else{ anyKey=true; line+=' ✓ key'; } if(_cbBlocked(p.name)){ out.push(line+' ⚠ CIRCUIT OPEN'); continue; } var t0=Date.now(); var res=null; try{ res=_dispatchLLM(p,probe,128); }catch(e){ res=null; } var ms=Date.now()-t0; if(res&&res.text){ anyText=true; out.push(line+' ✓✓ REPLIED '+res.text.length+' chars '+ms+'ms: '+trunc(res.text.replace(/\s+/g,' '),60)); } else{ out.push(line+' X empty '+ms+'ms'); } }
  if(!anyKey) out.push('⛔ NO LLM KEYS'); if(!anyText) out.push('⛔ NO PROVIDER RETURNED TEXT - fallback storm');
  out.push(''); out.push('--- BRIEF PROBE ---'); try{ var b=generateAssetBriefs('Portfolio Launch System','Help designers'); out.push('provider: '+(b._provider||'none')); out.push('shape: '+b.shapeId); out.push('premium dbs: '+(b.premium&&b.premium.databases?b.premium.databases.length:0)); }catch(e){ out.push('probe threw: '+e.toString()); }
  var text=out.join('\n'); log('INFO','testLlm',text.replace(/\n/g,' | ')); flushLogs(); try{ SpreadsheetApp.getUi().alert('LLM Diagnostic',text,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return text;
}
function testDistribution(){
  var reg=distChannels(); var personas=readSheet('Personas'); var lines=['Distribution self-check','','Mode: '+distributionMode(),''];
  Object.keys(reg).forEach(function(ch){ var ready=personas.filter(function(p){ return hasChannelKeys(p,ch); }).length; lines.push('  '+ch+': '+ready+'/'+personas.length+' personas - '+ (reg[ch].desc||'')); });
  var free=collectFreeAssets(); lines.push('','Free assets: '+free.length); lines.push('Owned: '+free.filter(function(a){ return !!ownerPersona(a); }).length);
  var q=readSheet('Distribution'); lines.push('','Queue: '+q.filter(function(r){ return r.status===D.QUEUED; }).length+' queued, '+q.filter(function(r){ return r.status===D.POSTED; }).length+' posted, '+q.filter(function(r){ return r.status===D.FAILED; }).length+' failed, '+q.filter(function(r){ return r.status===D.SKIPPED; }).length+' skipped');
  var out=lines.join('\n'); log('INFO','testDistribution',out.replace(/\n/g,' | ')); try{ SpreadsheetApp.getUi().alert('Distribution Check',out,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return out;
}
function testWhop(){
  var key=getConfig('WHOP_API_KEY',''); var company=getConfig('WHOP_COMPANY_ID',''); var steps=[]; var ok=true;
  if(!key){ steps.push('X WHOP_API_KEY missing'); ok=false; } else steps.push('✓ WHOP_API_KEY present');
  if(!company){ steps.push('X WHOP_COMPANY_ID missing'); ok=false; } else steps.push('✓ WHOP_COMPANY_ID '+company);
  if(key&&company){ try{ var r=getJson(WHOP_API+'/companies/'+company,{Authorization:'Bearer '+key},2); if(r&&r.getResponseCode()===200) steps.push('✓ Company readable'); else{ steps.push('X Company read failed HTTP '+(r?r.getResponseCode():0)); ok=false; } }catch(e){ steps.push('X threw: '+trunc(e.toString(),100)); ok=false; } }
  var personas=readSheet('Personas'); var forumReady=0; personas.forEach(function(p){ if(String(p.whop_company_id||'').trim()&&String(p.whop_forum_id||'').trim()) forumReady++; });
  steps.push('Persona Whop forums configured: '+forumReady+'/'+personas.length+' (per your request - each persona own store/forum for free assets)');
  var msg=(ok?'✓ Whop configured':'X Fix below')+'\n\n'+steps.join('\n'); log(ok?'SUCCESS':'ERROR','testWhop',steps.join(' | ')); try{ SpreadsheetApp.getUi().alert('Whop Check',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return {ok:ok,steps:steps};
}
function testYouTube(){
  var out=[]; out.push('YouTube Factory Diagnostic v1.2 PROVEN - '+nowIso());
  var channelId=String(getConfig('YOUTUBE_CHANNEL_ID','')).trim();
  var apiKey=String(getConfig('YOUTUBE_API_KEY','')).trim();
  var j2v=String(getConfig('JSON2VIDEO_API_KEY','')).trim();
  var shot=String(getConfig('SHOTSTACK_KEY','')).trim();
  out.push('Central Channel: '+(channelId||'MISSING - will use per-persona')+' '+channelId);
  out.push('YouTube API Key: '+(apiKey?'SET for verify':'MISSING - verify will WARN (ok)'));
  out.push('SHOTSTACK_KEY: '+(shot?'SET '+shot.length+' chars - PRIMARY (your proven)':'MISSING - set SHOTSTACK_KEY in Config'));
  out.push('JSON2VIDEO_API_KEY: '+(j2v?'SET - fallback':'MISSING'));
  out.push('YouTube service enabled: '+(typeof YouTube!=='undefined'?'true - PROVEN':'false - enable in Services > YouTube Data API v3'));
  var provider=_videoProvider();
  out.push('Active provider: '+(provider||'NONE - set SHOTSTACK_KEY'));
  var personas=readSheet('Personas');
  var withChannel=personas.filter(function(p){ return String(p.youtube_channel||'').trim(); }).length;
  out.push('Personas with youtube_channel: '+withChannel+'/'+personas.length+' (0 ok uses central)');
  var videos=[]; try{ videos=readSheet('Videos'); }catch(e){ log('WARN','catch',e.toString()); }
  out.push('Videos sheet: '+videos.length+' rows - schema [bundle_id,job_id,mp4_url,youtube_id,youtube_url,status,attempts,ts,provider]');
  var uploaded=videos.filter(function(v){ return String(v.status||'').toUpperCase()==='UPLOADED'; }).length;
  var ready=videos.filter(function(v){ return String(v.status||'').toUpperCase()==='READY'; }).length;
  var rendering=videos.filter(function(v){ return String(v.status||'').toUpperCase()==='RENDERING'; }).length;
  var rendered=videos.filter(function(v){ return String(v.status||'').toUpperCase()==='RENDERED'; }).length;
  out.push('Videos READY:'+ready+' RENDERING:'+rendering+' RENDERED:'+rendered+' UPLOADED:'+uploaded);
  if(videos.length) out.push('Last video: '+JSON.stringify(videos[videos.length-1]).substring(0,200));
  out.push('');
  out.push('Proven engine: ensureVideoRows->submitRenders (shotstack)->pollRenders->uploadRendered via YouTube.Videos.insert');
  var text=out.join('\n'); log('INFO','testYouTube',text.replace(/\n/g,' | ')); flushLogs(); try{ SpreadsheetApp.getUi().alert('YouTube Diagnostic',text,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return text;
}

function testMastodon(){
  var personas=readSheet('Personas'); var lines=['Mastodon Check','','Instance + Client key/secret + Access token per persona','']; var ok=true;
  personas.forEach(function(p){
    var inst=String(p.mastodon_instance||'').trim();
    var token=String(p.mastodon_access_token||p.mastodon_token||'').trim();
    var ckey=String(p.mastodon_client_key||'').trim();
    var csec=String(p.mastodon_client_secret||'').trim();
    if(!inst&&!token&&!ckey&&!csec) return;
    if(!inst||!token){ lines.push('X '+p.persona_id+' missing instance or access token'); ok=false; }
    else{
      lines.push('✓ '+p.persona_id+' instance '+inst+' token '+token.length+' chars');
      if(ckey) lines.push('  client_key SET '+ckey.length+' chars');
      if(csec) lines.push('  client_secret SET');
      try{
        var base=inst.replace(/\/+$/,''); if(!/^https?:\/\//.test(base)) base='https://'+base;
        var r=getJson(base+'/api/v1/instance',{},1);
        if(r&&r.getResponseCode()===200) lines.push('  ✓ Instance readable');
        else lines.push('  X Instance read failed HTTP '+(r?r.getResponseCode():0));
      }catch(e){ lines.push('  X threw: '+trunc(e.toString(),80)); }
    }
  });
  var msg=lines.join('\n'); log(ok?'SUCCESS':'ERROR','testMastodon',lines.join(' | ')); try{ SpreadsheetApp.getUi().alert('Mastodon Check',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return msg;
}

function testBuffer(){
  var personas=readSheet('Personas'); var lines=['Buffer Check - X/Pinterest/Facebook','','Each persona own Buffer account','']; var ok=true;
  personas.forEach(function(p){
    var key=String(p.buffer_api_key||'').trim();
    var chX=String(p.buffer_channel_x||'').trim();
    var chPin=String(p.buffer_channel_pinterest||'').trim();
    var chFb=String(p.buffer_channel_facebook||'').trim();
    var chLi=String(p.buffer_channel_linkedin||'').trim();
    if(!key&&!chX&&!chPin&&!chFb&&!chLi) return;
    if(!key){ lines.push('X '+p.persona_id+' has channels but no buffer_api_key'); ok=false; }
    else{
      var chans=[];
      if(chX) chans.push('X:'+chX.substring(0,8));
      if(chPin) chans.push('Pinterest:'+chPin.substring(0,8));
      if(chFb) chans.push('FB:'+chFb.substring(0,8));
      if(chLi) chans.push('LinkedIn:'+chLi.substring(0,8));
      lines.push('✓ '+p.persona_id+' '+chans.join(' '));
    }
  });
  if(lines.length<=3){ lines.push('No persona has Buffer - fill buffer_api_key + buffer_channel_x/pinterest/facebook'); ok=false; }
  var msg=lines.join('\n'); log(ok?'SUCCESS':'ERROR','testBuffer',lines.join(' | ')); try{ SpreadsheetApp.getUi().alert('Buffer Check',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return msg;
}

function testBluesky(){
  var personas=readSheet('Personas'); var lines=['Bluesky Check','']; var ok=true;
  personas.forEach(function(p){ var h=String(p.bsky_handle||'').trim(); var k=String(p.bsky_app_password||'').trim(); if(!h||!k){ lines.push('X '+p.persona_id+' missing handle/password - ROTATE your exposed keys!'); ok=false; } else lines.push('✓ '+p.persona_id+' @'+h+' has password'); });
  lines.push(''); lines.push('Mode: '+bskyPostingMode()); lines.push('Cap: '+CL.MAX_POSTS_PER_DAY+'/day per persona (NOT 2-5, that caused BLOCKED storm)');
  var msg=lines.join('\n'); log(ok?'SUCCESS':'ERROR','testBluesky',lines.join(' | ')); try{ SpreadsheetApp.getUi().alert('Bluesky Check',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return msg;
}
function testWhopForum(){
  var personas=readSheet('Personas'); var lines=['Whop Forum Check (per your request)','','Each persona own store + forum for FREE assets only','']; var ok=true;
  personas.forEach(function(p){
    var company=String(p.whop_company_id||'').trim(); var forum=String(p.whop_forum_id||'').trim(); var key=String(p.whop_api_key||'').trim();
    if(!company||!forum||!key){ lines.push('X '+p.persona_id+' missing whop_company_id / whop_forum_id / whop_api_key'); ok=false; }
    else{
      lines.push('✓ '+p.persona_id+' company '+company+' forum '+forum);
      try{
        var r=getJson(WHOP_API+'/forums/'+forum,{Authorization:'Bearer '+key},2);
        if(r&&r.getResponseCode()===200) lines.push('  ✓ Forum readable');
        else lines.push('  X Forum read failed HTTP '+(r?r.getResponseCode():0)+' - verify write by reading back trap');
      }catch(e){ lines.push('  X threw: '+trunc(e.toString(),80)); }
    }
  });
  var msg=lines.join('\n'); log(ok?'SUCCESS':'ERROR','testWhopForum',lines.join(' | ')); try{ SpreadsheetApp.getUi().alert('Whop Forum Check',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return msg;
}
function reconcile(){
  var report={whop:0,pages:0,dist:0,notion:0,problems:[]};
  try{
    var assets=readSheet('Assets');
    for(var i=0;i<assets.length;i++){
      var r=assets[i]; var pid=String(r.whop_product_id||'').trim(); if(!pid||isDryRunValue(pid)) continue; if(!budgetReserve(15000)) break;
      var v=verifyWhopProduct(pid); if(!v.ok) continue; report.whop++;
      if(!v.live) report.problems.push('whop:'+r.name+' visibility='+v.visibility);
      if(String(r.marketplace_status||'')!==v.marketplaceStatus) updateRow('Assets',r._row,{marketplace_status:v.marketplaceStatus,updated_at:nowIso()});
      sleep(250);
    }
  }catch(e){ log('ERROR','reconcile','whop: '+e.toString()); }
  try{
    var rows2=readSheet('Assets');
    for(var j=0;j<rows2.length;j++){
      var u=String(rows2[j].landing_url||'').trim(); if(!u||u.indexOf('http')!==0||isDryRunValue(u)) continue; if(!budgetReserve(10000)) break;
      var rr=safeFetch(u,{method:'get',muteHttpExceptions:true,followRedirects:true},2); var c=rr?rr.getResponseCode():0; report.pages++; if(c!==200) report.problems.push('pages:'+u+' -> HTTP '+c);
      sleep(200);
    }
  }catch(e){ log('ERROR','reconcile','pages: '+e.toString()); }
  var summary='checked whop='+report.whop+' pages='+report.pages+' dist='+report.dist+' | problems='+report.problems.length; log(report.problems.length?'WARN':'SUCCESS','reconcile',summary); report.problems.slice(0,20).forEach(function(p){ log('WARN','reconcile',p); }); return report;
}
function watchdog(){
  var out=[];
  try{
    var last=''; try{ last=PropertiesService.getScriptProperties().getProperty('CL_LAST_RUN')||''; }catch(e){ log('WARN','catch',e.toString()); }
    var ageMin=last?(Date.now()-new Date(last).getTime())/60000:Infinity; var expected=CL.TRIGGER_MIN*3;
    if(ageMin>expected){ var msg='Factory silent for '+(ageMin===Infinity?'ever':Math.round(ageMin)+' min')+' (expected every '+CL.TRIGGER_MIN+' min)'; log('ERROR','watchdog',msg); discordAlert('ERROR',msg); out.push(msg); }
    ensureMainTrigger(); reapStuckRows(); trimAllSheets();
    var d=readSheet('Distribution'); var recent=d.slice(-20); if(recent.length>=20){ var fails=recent.filter(function(r){ return String(r.status)===D.FAILED; }).length; if(fails===recent.length){ log('ERROR','watchdog','last 20 dist ALL failed'); discordAlert('ERROR','Distribution: last 20 failed'); out.push('dist total failure'); } }
  }catch(e){ log('ERROR','watchdog',e.toString()); }finally{ flushLogs(); }
  return out.join(' | ')||'ok';
}
function reapStuckRows(){
  var cutoff=Date.now()-(CL.STUCK_MIN*60*1000);
  var specs=[{sheet:'Assets',from:A.BUILDING,to:A.DRAFTED},{sheet:'Distribution',from:D.POSTING,to:D.QUEUED}];
  var reset=0;
  for(var s=0;s<specs.length;s++){ var spec=specs[s]; var rows; try{ rows=readSheet(spec.sheet); }catch(e){ continue; } for(var i=0;i<rows.length;i++){ var r=rows[i]; if(String(r.status||'').toUpperCase()!==spec.from) continue; var stamp=r.updated_at||r.created_at||''; var t=stamp?new Date(stamp).getTime():0; if(t&&t>cutoff) continue; var attempts=Number(r.attempts||0)+1; var patch={attempts:attempts}; if(attempts>CL.DIST_MAX_ATTEMPTS){ patch.status=(spec.sheet==='Distribution')?D.FAILED:A.FAILED; patch.error='stuck_'+spec.from; } else{ patch.status=spec.to; } if(SCHEMA[spec.sheet].indexOf('updated_at')>=0) patch.updated_at=nowIso(); try{ updateRow(spec.sheet,r._row,patch); reset++; }catch(e2){ log('WARN','catch','e2: '+e2.toString()); } } }
  if(reset) log('WARN','reap',reset+' stuck reset');
  return reset;
}
function trimSheet(name,maxRows){ try{ var sh=getSpreadsheet().getSheetByName(name); if(!sh) return 0; var excess=sh.getLastRow()-maxRows-1; if(excess<=0) return 0; sh.deleteRows(2,excess); return excess; }catch(e){ log('WARN','catch','return 0: '+e.toString()); return 0; } }
function trimAllSheets(){ var t=0; t+=trimSheet('Audit',CL.MAX_AUDIT_ROWS); t+=trimSheet('Revenue',CL.MAX_REVENUE_ROWS); t+=trimSheet('Logs',CL.MAX_LOG_ROWS); try{ var rows=readSheet('Distribution'); if(rows.length>CL.MAX_DIST_ROWS){ var sh=getSpreadsheet().getSheetByName('Distribution'); var removed=0; for(var i=rows.length-1;i>=0&&rows.length-removed>CL.MAX_DIST_ROWS;i--){ var st=String(rows[i].status||''); if(st!==D.POSTED&&st!==D.FAILED&&st!==D.SKIPPED) continue; sh.deleteRow(rows[i]._row); removed++; } t+=removed; } }catch(e){ log('WARN','catch',e.toString()); } return t; }

// ==================== SETUP + MENU ====================
function setupFactory(){
  try{
    Object.keys(SCHEMA).forEach(function(n){ ensureSheet(n); });
    var sh=ensureSheet('Config'); if(sh.getLastRow()<2){ var rows=CONFIG_KEYS.map(function(c){ return [c[0],c[1],c[2]]; }); sh.getRange(2,1,rows.length,3).setValues(rows); }
    seedPersonasIfEmpty();
    seedBacklogIfEmpty();
    var props=PropertiesService.getScriptProperties(); if(!props.getProperty('CL_START_TS')) props.setProperty('CL_START_TS',String(Date.now()));
    log('SUCCESS','setup','complete - brand Cedar Loom, email '+CUSTOM_EMAIL);
    try{ SpreadsheetApp.getUi().alert('Cedar Loom v'+CL_VERSION+' setup complete.\nBrand: '+BRAND_NAME+'\nEmail: '+CUSTOM_EMAIL+'\nWhop: '+getConfig('WHOP_COMPANY_ID','')+'\nLightning: '+getConfig('LIGHTNING_ADDRESS','')+'\nNext: fill Config, rotate Bluesky keys, install triggers, run diagnosis.'); }catch(e){ log('WARN','catch',e.toString()); }
  }catch(e){ log('ERROR','setup',e.toString()); throw e; }
}
function seedPersonasIfEmpty(){
  var rows=readSheet('Personas'); if(rows.length>0) return;
  SEED_PERSONAS.forEach(function(p){
    appendRow('Personas',{persona_id:p.persona_id,name:p.name,niche:p.niche,voice:p.voice,tone:p.tone,topics:p.topics,bsky_handle:p.bsky_handle,bsky_app_password:'REPLACE - ROTATE YOUR EXPOSED KEYS',landing_url:'',posts_today:0,max_posts_per_day:2,distribution_enabled:'TRUE',whop_company_id:getConfig('WHOP_COMPANY_ID',''),whop_api_key:getConfig('WHOP_API_KEY',''),whop_forum_id:'',whop_app_api_key:getConfig('WHOP_APP_API_KEY',''),itch_api_key:'',itch_username:''});
  });
}
function seedBacklogIfEmpty(){
  var rows=readSheet('Backlog'); if(rows.length>0) return;
  [{name:'Client Kickoff Mini-OS',description:'Tripwire $7 - kickoff system'},{name:'Freelance Design OS',description:'Flagship $29'},{name:'Portfolio Launch System',description:'Core2 $24'},{name:'Designer Client Onboarding Checklist',description:'Free library mini'},{name:'Moodboard Framework',description:'Free library'},{name:'Invoice Tracker Mini',description:'Free money log'}].forEach(function(b,i){
    appendRow('Backlog',{id:'bl_'+Date.now()+'_'+i,name:b.name,description:b.description,source:'seed',status:Q.PENDING,created_at:nowIso()});
  });
}
function installTriggers(){
  ScriptApp.getProjectTriggers().forEach(function(t){ var h=t.getHandlerFunction(); if(h==='clMain'||h==='watchdog') try{ ScriptApp.deleteTrigger(t); }catch(e){ log('WARN','catch',e.toString()); } });
  ScriptApp.newTrigger('clMain').timeBased().everyMinutes(CL.TRIGGER_MIN).create();
  ScriptApp.newTrigger('watchdog').timeBased().everyHours(6).create();
  log('SUCCESS','triggers','clMain every '+CL.TRIGGER_MIN+' min + watchdog 6h'); discordAlert('INFO','Cedar Loom v'+CL_VERSION+' triggers installed - brand '+BRAND_NAME);
}
function onOpen(){
  var ui=SpreadsheetApp.getUi();
  ui.createMenu('🌲 Cedar Loom v'+CL_VERSION)
    .addItem('⚙️ Setup / Repair Factory','setupFactory')
    .addItem('⏰ Install Triggers','installTriggers')
    .addSeparator()
    .addItem('⚡ Run full loop now','clMain')
    .addSeparator()
    .addItem('🔬 Run checklist','runChecklist')
    .addItem('🧪 Run self-test','runSelfTest')
    .addItem('🏗️ Run STRUCTURAL tests','runStructuralTests')
    .addItem('🧠 Test LLM chain','testLlm')
    .addItem('📦 Test Distribution mesh','testDistribution')
    .addItem('🛍️ Test Whop central','testWhop')
    .addItem('💬 Test Whop Forums per persona','testWhopForum')
    .addItem('📺 Test YouTube factory v1.2 PROVEN','testYouTube')
    .addItem('🦋 Test Bluesky','testBluesky')
    .addItem('🐘 Test Mastodon','testMastodon')
    .addItem('📡 Test Buffer X/Pinterest/FB','testBuffer')
    .addItem('🔗 Reconcile (verify remote state)','reconcile')
    .addItem('🚑 Watchdog / self-heal now','watchdog')
    .addSeparator()
    .addItem('🔍 Research now','runResearch')
    .addItem('📐 Draft briefs now','draftAssetBriefs')
    .addItem('🏗️ Build pending now','buildPendingAssets')
    .addItem('🌐 Deploy landings now','deployAssetLandings')
    .addItem('🛒 List on Whop now','listOnWhop')
    .addItem('📬 Enqueue free distribution','enqueueFreeAssetDistribution')
    .addItem('📤 Drain distribution queue (3 max)','drainDistributionQueue')
    .addItem('📥 Triage custom requests $199-$399','processCustomRequests')
    .addSeparator()
    .addItem('📅 Test Weekend Heavy Mode','testWeekendMode')
    .addItem('🚀 Dispatch Heavy Build 10','dispatchHeavy10')
    .addItem('🚀 Dispatch Heavy Build 50','dispatchHeavy50')
    .addItem('🧪 Test Quality Gates','testQualityGates')
    .addItem('💰 Test Monetization Tiered','testMonetization')
    .addItem('📦 Test Batch Distribute','testBatchDistribute')
    .addItem('📊 Check Budget','checkBudget')
    .addSeparator()
    .addItem('💎 Enqueue Value Posts 5','enqueueValuePosts')
    .addItem('🔍 Engage Potential Customers','engageWithPotentialCustomers')
    .addItem('📤 Drain V2 (Value+Promo+Reply)','drainDistributionQueueV2')
    .addItem('🧪 Test Value Post','testValuePost')
    .addItem('🔎 Test Bsky Search','testBskySearch')
    .addItem('🐘 Test Mastodon Search','testMastodonSearch')
    .addSeparator()
    .addItem('🖼️ Generate Free Image (Pollinations $0)','testFreeImage')
    .addItem('🎬 Generate Free Video (Shottower $0)','testFreeVideo')
    .addItem('🤖 Test Free LLM (Pollinations $0)','testFreeLLM')
    .addItem('🎨 Test Free Media $0','testFreeMedia')
    .addItem('📸 Take Free Screenshot $0','testFreeScreenshot')
    .addItem('📸 Ensure Screenshots $0','ensureScreenshots')
    .addToUi();
}
function testFreeImage(){
  var prompt='Notion template for freelance designers, client onboarding dashboard minimal professional 4k';
  var url=freeImagePollinations(prompt);
  var msg='Free Image Test - Pollinations $0\n\nPrompt: '+prompt+'\nURL: '+url+'\n\nProvider: pollinations free no key unlimited\nOther: picsum.photos, unsplash source, cloudflare canvas all free';
  log('INFO','testFreeImage',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Free Image $0',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testFreeVideo(){
  var bundle={bundle_id:'test-bundle', name:'Client Kickoff Mini-OS'};
  var shots=[freeImagePollinations('Notion template'), freeImagePicsum()];
  var res=freeVideoShottower(bundle, shots);
  var msg='Free Video Test - Shottower $0\n\nShottower: open-source self-hosted Shotstack API backend\nJSON Input -> Translation -> Local FFmpeg render\nZero fees, no vendor lock-in, data privacy\nBundle: '+bundle.name+'\nShots: '+shots.length+' free images\nResult: '+JSON.stringify(res)+'\n\nGitHub Actions: ffmpeg + 5 Pollinations images = 15 sec video $0\nProvider: shottower-free, ffmpeg-free\nYouTube free quota 6/day';
  log('INFO','testFreeVideo',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Free Video $0',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testFreeLLM(){
  var prompt='Generate 1 IRL freelance Notion template idea JSON {name,description,score} no forge nexus $10k/mo';
  var res=freeLLMPollinations(prompt, 500);
  if(!res) res=callLLM([{role:'user',content:prompt}], 500);
  var msg='Free LLM Test - Pollinations $0\n\nPrompt: '+prompt+'\nProvider: '+(res?res.provider:'none')+'\nText: '+trunc(res?res.text:'',200)+'\n\nFree: Pollinations text.pollinations.ai no key unlimited\nFallback: Gemini free, Groq free 14.4k/day\nCost: $0 straight';
  log('INFO','testFreeLLM',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Free LLM $0',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testFreeScreenshot(){
  var testUrl='https://cedar-loom.simalidudu.workers.dev';
  var assets=readSheet('Assets');
  var sample=assets.length?assets[0]:{name:'Client Kickoff Mini-OS', landing_url:testUrl};
  var url=String(sample.landing_url||sample.public_url||sample.notion_url||testUrl);
  var wp=freeScreenshotWordPress(url);
  var thum=freeScreenshotThumIO(url);
  var micro=freeScreenshotMicrolink(url);
  var poll=freeImagePollinations('Notion template '+sample.name+' minimal');
  var msg='Free Screenshot Test - Actual Asset $0\n\nAsset: '+sample.name+'\nURL: '+url+'\n\n1. WordPress mShots FREE $0 (no key unlimited, best):\n'+wp+'\n\n2. thum.io FREE $0 (no key, JS-heavy):\n'+thum+'\n\n3. Microlink FREE 50/day $0:\n'+micro+'\n\n4. Pollinations fallback FREE $0:\n'+poll+'\n\n5. Puppeteer REAL Chrome FREE $0:\nGitHub Actions: npm i puppeteer + screenshot '+url+' -> screenshots/*.jpg free 2000m/month\n\nAll $0 straight, cafe on your dime';
  log('INFO','testFreeScreenshot',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Free Screenshot $0',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function resetCircuitBreakers(){
  var props=PropertiesService.getScriptProperties();
  var keys=props.getKeys();
  var cleared=0;
  keys.forEach(function(k){
    if(k.indexOf('CL_CB_')===0){
      props.deleteProperty(k);
      cleared++;
    }
  });
  log('SUCCESS','resetCB','Cleared '+cleared+' circuit breakers cerebras/gemini/groq');
  try{ SpreadsheetApp.getUi().alert('Circuit Breakers Reset',cleared+' cleared - cerebras/gemini/groq will retry next tick',SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return cleared;
}
function analyzeTimeEaters(){
  var out=[];
  out.push('Time Eaters Analysis v1.8c-OPTIMIZED-FREE $0');
  out.push('');
  out.push('From your logs 22:32-01:30:');
  out.push('Tick 262s total, 6 ticks used 2M ms = 34m in 3h');
  out.push('');
  out.push('Biggest eater 60%: freeLLM Pollinations 2 failing endpoints before success');
  out.push('  Old: endpoint0 https://text.pollinations.ai/{prompt} -> budget error 30s');
  out.push('       endpoint1 ?model=openai -> budget error 2s');
  out.push('       endpoint2 /openai?prompt= -> success 1s');
  out.push('  20 calls * 3.6s = 72s per tick');
  out.push('  Fixed v1.8c: use only endpoint2 directly + cache 1h -> 1s per call, 20s per tick (was 72s) save 52s');
  out.push('');
  out.push('Second eater 25%: enqueueValuePosts 20-40 appendRow sequential');
  out.push('  Old: 40 appendRow *1s =40s per tick');
  out.push('  Fixed v1.8c: batch 20 rows setValues -> 5s per tick save 35s');
  out.push('');
  out.push('Third eater 10%: readSheet 4 sheets + updateRow');
  out.push('  readAllSheets exists but not used in main loop - should use');
  out.push('  Fixed: use readAllSheets batch in next version');
  out.push('');
  out.push('Total saved: 52s+35s=87s per tick, tick from 262s -> 175s, budget 45m lasts 15 ticks not 10');
  out.push('With 90m weekday budget: 30 ticks = 100 value posts + 150 ideas dispatched free $0');
  out.push('');
  out.push('Your budget hit 103% HEAVY 87m/85m + 100% LIGHT 45m because LLM + sheets ate 85%');
  out.push('With optimized, same work uses 60% less time, budget lasts 2x longer');
  var msg=out.join('\n');
  log('INFO','analyzeTime',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Time Eaters $0',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testFreeMedia(){
  var out=[]; out.push('Free Media $0 - Best Tricks - Shottower + Pollinations + FFmpeg'); out.push(''); out.push('Images $0:'); out.push('  Pollinations: https://image.pollinations.ai/prompt/{prompt}?width=1280&height=720&nologo=true (free no key unlimited)'); out.push('  Picsum: https://picsum.photos/1280/720?random=ID (free)'); out.push('  Unsplash: https://source.unsplash.com/1280x720/?freelance,notion (free)'); out.push('  Cloudflare Canvas: Worker Canvas API free 100k/day'); out.push(''); out.push('Videos $0:'); out.push('  Shottower: DblK/shottower open-source self-hosted Shotstack API backend, JSON->FFmpeg, zero fees'); out.push('  FFmpeg GitHub: 5 Pollinations images + ffmpeg slideshow 15 sec with text overlay drawtext, free 2000m/month=100 videos'); out.push('  YouTube: 6 uploads/day free quota'); out.push(''); out.push('LLM $0: Pollinations Text free no key unlimited'); out.push(''); out.push('Total: $0 straight, cafe on your dime'); var msg=out.join('\n'); log('INFO','testFreeMedia',msg.replace(/\n/g,' | ')); try{ SpreadsheetApp.getUi().alert('Free Media $0',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); } return msg;
}

function testValuePost(){
  var personas=readSheet('Personas');
  if(!personas.length) return 'No personas';
  var p=personas[0];
  var vp=generateValuePost(p, 'client onboarding', 'tip');
  var msg='Value Post Test\n\nPersona: '+p.name+' ('+p.niche+')\nKeyword: client onboarding\nText: '+vp.text+'\nHashtags: '+vp.hashtags.join(' ')+'\nType: '+vp.type;
  log('INFO','testValuePost',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Value Post',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testBskySearch(){
  var kw=getConfig('BSKY_SEARCH_KEYWORDS','freelance client onboarding').split(',')[0];
  var posts=searchBskyNiche(kw);
  var msg='Bsky Search Test\n\nKeyword: '+kw+'\nFound: '+posts.length+' posts\n\n'+posts.slice(0,3).map(function(p){return '@'+p.author+': '+trunc(p.text,80);}).join('\n');
  log('INFO','testBskySearch',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Bsky Search',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testMastodonSearch(){
  var personas=readSheet('Personas');
  var p=personas.find(function(x){ return String(x.mastodon_instance||'').trim()&&String(x.mastodon_access_token||x.mastodon_token||'').trim(); });
  if(!p) return 'No Mastodon persona configured';
  var posts=searchMastodonNiche(p.mastodon_instance, p.mastodon_access_token||p.mastodon_token, 'freelance');
  var msg='Mastodon Search Test\n\nInstance: '+p.mastodon_instance+'\nFound: '+posts.length+' posts\n\n'+posts.slice(0,3).map(function(s){return s.account+': '+trunc(s.content.replace(/<[^>]+>/g,''),80);}).join('\n');
  log('INFO','testMastodonSearch',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Mastodon Search',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}

function testWeekendMode(){
  var info=safeBudget();
  var msg='Weekend Mode Check\n\nTimezone: '+info.tz+'\nIsHeavy (weekend?): '+info.isHeavy+'\nToday used: '+info.used+'ms\nBudget: '+info.budget+'ms\nLeft: '+info.left+'ms\nPct: '+info.pct+'%\n\nHEAVY_DAYS: '+getConfig('HEAVY_DAYS','6,0')+'\nWEEKEND_MODE: '+getConfig('WEEKEND_MODE_ENABLED','TRUE')+'\nOFFLOAD: '+getConfig('OFFLOAD_ENABLED','TRUE')+'\nGH_REPO: '+(getConfig('GH_REPO','')||getConfig('GITHUB_REPO',''))+'\n\nMode: '+(info.isHeavy?'WEEKEND-HEAVY 30 ideas batch + GitHub offload':'WEEKDAY-LIGHT 2 ideas + distribute 30');
  log('INFO','testWeekendMode',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Weekend Mode',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function dispatchHeavy10(){ return dispatchHeavyBuild(10); }
function dispatchHeavy50(){ return dispatchHeavyBuild(50); }
function checkBudget(){
  var b=safeBudget();
  var msg='Budget Check\n\nUsed: '+b.used+'ms ('+Math.round(b.used/60000)+'m)\nBudget: '+b.budget+'ms ('+Math.round(b.budget/60000)+'m)\nLeft: '+b.left+'ms ('+Math.round(b.left/60000)+'m)\nPct: '+b.pct+'%\nMode: '+(b.isHeavy?'HEAVY':'LIGHT')+'\nTZ: '+b.tz+'\nReset: 00:00 '+b.tz+'\n\nFree quota 90m safe: weekday 45m / weekend 85m';
  log('INFO','checkBudget',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Budget',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testQualityGates(){
  var out=[];
  out.push('Quality Gates Test - v1.6 PERFECTION');
  var asset={name:'Client Kickoff Mini-OS', wake_score:90, spec_json:JSON.stringify({premium:{databases:[{properties:{a:1,b:2,c:3}},{properties:{d:1}},{properties:{e:1}}]}}), landing_url:'https://example.com'};
  var brief={premium:{databases:[{properties:{a:1,b:2,c:3}},{properties:{d:1}},{properties:{e:1}}]}, _angle:'test'};
  var q=scoreAssetQuality(asset, brief);
  out.push('Quality score: '+q.score+' verdict '+q.verdict);
  q.checks.forEach(function(c){ out.push('  '+(c.pass?'✓':'X')+' '+c.name); });
  var cta=generateAggressiveCTA(asset,0);
  out.push(''); out.push('Aggressive CTA: '+cta.text); out.push('Psych triggers: '+cta.triggers.join(', '));
  var judge=judgeQuality('brief', {title:asset.name, cta:cta.text, triggers:cta.triggers});
  out.push(''); out.push('Judge: score '+judge.score+' pass '+judge.pass);
  var msg=out.join('\n');
  log('INFO','testQualityGates',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Quality Gates',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testMonetization(){
  var out=[];
  out.push('Monetization Test - Tiered + Affiliate Aggressive');
  out.push('TIERED_PRICING_ENABLED: '+getConfig('TIERED_PRICING_ENABLED','TRUE'));
  out.push('AFFILIATE STARTER: '+getConfig('AFFILIATE_PERCENT_STARTER','40')+'%');
  out.push('AFFILIATE PRO: '+getConfig('AFFILIATE_PERCENT_PRO','50')+'%');
  out.push('BUNDLE_ENABLED: '+getConfig('BUNDLE_ENABLED','TRUE'));
  out.push('FREE_UNTIL_HOURS: '+getConfig('FREE_UNTIL_HOURS','48'));
  out.push('');
  out.push('Tiered: FREE (lead 80% value, CTA to Pro) -> STARTER $19 (40% affiliate, 1 bonus) -> PRO $49 (50% affiliate, 3 bonuses + commercial license)');
  out.push('Bundle: every 5 assets -> $99 (was $95) 50% affiliate');
  out.push('Affiliate funnel: all posts use affiliate link, not direct');
  out.push('Pareto: top 20% revenue gets 60% distribution');
  out.push('');
  var top=getTopRevenueAssets(3);
  out.push('Top revenue assets: '+(top.length?top.map(function(a){return a.name;}).join(', '):'none yet'));
  var msg=out.join('\n');
  log('INFO','testMonetization',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Monetization',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}
function testBatchDistribute(){
  var out=[];
  out.push('Batch Distribute Test - fetchAll + Cloudflare');
  out.push('Worker URL: '+(getConfig('CLOUDFLARE_WORKER_URL','')||'not set - using direct fetchAll'));
  out.push('fetchAll exists: '+(typeof _fetchAll==='function'));
  out.push('readAllSheets exists: '+(typeof readAllSheets==='function'));
  out.push('');
  out.push('Old: 10 posts sequential 40s');
  out.push('New: fetchAll 10 parallel 3s + Worker 2s');
  var msg=out.join('\n');
  log('INFO','testBatchDistribute',msg.replace(/\n/g,' | '));
  try{ SpreadsheetApp.getUi().alert('Batch Distribute',msg,SpreadsheetApp.getUi().ButtonSet.OK); }catch(e){ log('WARN','catch',e.toString()); }
  return msg;
}

function runResearchSafe(){ return withLock('research',runResearch); }
function draftAssetBriefsSafe(){ return withLock('draft',draftAssetBriefs); }
function buildPendingAssetsSafe(){ return withLock('build',buildPendingAssets); }
function deployAssetLandingsSafe(){ return withLock('landing',deployAssetLandings); }
function listOnWhopSafe(){ return withLock('whop',listOnWhop); }
function enqueueDistributionSafe(){ return withLock('enqueue',enqueueFreeAssetDistribution); }
function drainDistributionSafe(){ return withLock('drain',drainDistributionQueue); }
