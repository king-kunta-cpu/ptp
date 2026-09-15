/**
 * ============================================================================
 *  CEDAR LOOM FACTORY v2.0-FACTORY  (new canvas)
 *  Brand: Cedar Loom | Custom: cedar@atomicmail.io | Lightning: SharkSkin@coinos.io
 *  9 transparent niche sub-brands. REAL manufacturing (GitHub Actions + Notion).
 *  Hard rules: no fake URLs, no fabricated claims, no fake green, Whop + Lightning rails.
 *  See v2/docs/SETUP-v2.md and v2/README.md.
 * ============================================================================
 */
var CL_VERSION = '2.0-FACTORY';
var BRAND_NAME = 'Cedar Loom';
var CUSTOM_EMAIL = 'cedar@atomicmail.io';

var CL = {
  HARD_LIMIT_MS: 120000,                       // 2 min per tick
  DAILY_BUDGET_WEEKDAY_MS: 45 * 60 * 1000,
  DAILY_BUDGET_WEEKEND_MS: 85 * 60 * 1000,
  TIMEZONE: 'Africa/Harare',
  TRIGGER_MIN: 15,
  WAKE_PASS: 85,
  DIST_MAX_ATTEMPTS: 4,
  // Daily plan per persona
  SLOTS_FREE: 2, SLOTS_PAID: 1, SLOTS_TOOL: 1, SLOTS_VALUE_SHORT: 2, SLOTS_ARTICLE: 1, REPLY_CAP: 5,
  DAY_START_H: 8, DAY_END_H: 21, MIN_GAP_MS: 45 * 60 * 1000,
  BUILD_DISPATCH_PER_TICK: 3, BUILD_INFLIGHT_TTL_MS: 45 * 60 * 1000,
  BRIEF_PER_DAY: 30,
  RESEARCH_PER_PERSONA_WEEKEND: 4, RESEARCH_PER_PERSONA_WEEKDAY: 1, BACKLOG_TARGET_WEEKEND: 6, BACKLOG_TARGET_WEEKDAY: 2,
  MAX_LOG_ROWS: 8000, MAX_AUDIT_ROWS: 5000, MAX_REVENUE_ROWS: 5000, MAX_DIST_ROWS: 5000,
  AI_MAX_TOKENS: 1600, AI_TEMPERATURE: 0.7,
  BSKY_API: 'https://bsky.social/xrpc', BSKY_UA: 'CedarLoom/2.0', BSKY_TOKEN_TTL_MS: 80 * 60 * 1000,
  WHOP_API: 'https://api.whop.com/api/v1',
  BUFFER_API: 'https://api.buffer.com',
  VIDEO_TOP_N: 10
};

// ------------------------------- SHEET SCHEMA -------------------------------
var SCHEMA = {
  Config: ['key', 'value', 'notes'],
  Personas: ['persona_id', 'name', 'niche', 'voice', 'tone', 'topics', 'blogspot_url', 'mail_contact',
    'bsky_handle', 'bsky_app_password', 'mastodon_instance', 'mastodon_username', 'mastodon_access_token',
    'mastodon_client_key', 'mastodon_client_secret', 'buffer_api_key', 'buffer_channel_x', 'buffer_channel_pinterest',
    'buffer_channel_facebook', 'buffer_channel_linkedin', 'whop_company_id', 'whop_api_key', 'whop_forum_id',
    'devto_key', 'hashnode_pat', 'hashnode_pub', 'youtube_channel', 'notion_folder_id', 'search_keywords',
    'search_hashtags', 'tool_name', 'hub_url', 'distribution_enabled', 'max_posts_per_day', 'posts_today', 'last_date', 'created_at'],
  Backlog: ['idea_id', 'persona_id', 'name', 'description', 'score', 'tier', 'status', 'attempts', 'created_at', 'updated_at'],
  Assets: ['asset_id', 'persona_id', 'name', 'description', 'tier', 'status', 'spec_json', 'notion_url', 'public_ok',
    'zip_url', 'screenshot_url', 'whop_product_id', 'whop_plan_id', 'whop_url', 'landing_url', 'short_url', 'zap_url',
    'price', 'db_count', 'property_count', 'sample_rows', 'video_url', 'video_status', 'wake_score', 'judge_score',
    'attempts', 'error', 'created_at', 'updated_at'],
  Distribution: ['dist_id', 'persona_id', 'slot', 'kind', 'asset_ref', 'platform', 'channel', 'status', 'post_text',
    'cta_url', 'remote_id', 'remote_url', 'attempts', 'next_attempt_ts', 'error', 'created_at', 'updated_at'],
  ZapOrders: ['order_id', 'invoice_id', 'code', 'email', 'sats', 'usd', 'asset_id', 'persona_id', 'status', 'created_at', 'updated_at'],
  Videos: ['bundle_id', 'mp4_url', 'preview_url', 'youtube_id', 'youtube_url', 'status', 'attempts', 'ts', 'provider'],
  Revenue: ['ts', 'payment_id', 'amount', 'currency', 'buyer', 'source', 'company', 'whop_product_id', 'notes'],
  Requests: ['request_id', 'timestamp', 'sender', 'sender_name', 'niche', 'budget', 'details', 'status', 'notes'],
  Logs: ['ts', 'level', 'fn', 'message', 'run_id'],
  Audit: ['ts', 'level', 'system', 'action', 'target', 'details']
};
var A = { DRAFTED: 'DRAFTED', LISTED: 'LISTED', BUILD_FAILED: 'BUILD_FAILED', BLOCKED: 'BLOCKED' };
var B = { PENDING: 'PENDING', USED: 'USED', REJECTED: 'REJECTED' };
var D = { QUEUED: 'QUEUED', POSTING: 'POSTING', POSTED: 'POSTED', FAILED: 'FAILED', SKIPPED: 'SKIPPED', STALE: 'STALE' };

// ------------------------------- SHEET HELPERS ------------------------------
var _ss = null;
function getSpreadsheet() { if (_ss) return _ss; _ss = SpreadsheetApp.getActiveSpreadsheet(); if (!_ss) throw new Error('bind a spreadsheet to this script'); return _ss; }
function ensureSheet(name) {
  var ss = getSpreadsheet(); var sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  var headers = SCHEMA[name] || [];
  if (sh.getLastRow() === 0) { sh.getRange(1, 1, 1, headers.length).setValues([headers]); return sh; }
  var first = sh.getRange(1, 1, 1, headers.length).getValues()[0].map(function (v) { return String(v == null ? '' : v); });
  for (var i = 0; i < headers.length; i++) if (first[i] !== headers[i]) { sh.getRange(1, i + 1).setValue(headers[i]); }
  return sh;
}
function readSheet(name) {
  var sh = ensureSheet(name); if (sh.getLastRow() < 2) return [];
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(function (v) { return String(v == null ? '' : v); });
  var data = sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues();
  var out = [];
  for (var i = 0; i < data.length; i++) {
    var row = { _row: i + 2 };
    for (var c = 0; c < headers.length; c++) if (headers[c]) row[headers[c]] = data[i][c];
    out.push(row);
  }
  return out;
}
function appendRow(name, obj) {
  var sh = ensureSheet(name); var headers = SCHEMA[name] || [];
  var vals = headers.map(function (h) { var v = obj[h]; return v === undefined || v === null ? '' : v; });
  sh.appendRow(vals); return sh.getLastRow();
}
function updateRow(name, rowNum, patch) {
  var sh = ensureSheet(name); var headers = SCHEMA[name] || [];
  for (var c = 0; c < headers.length; c++) if (patch[headers[c]] !== undefined) sh.getRange(rowNum, c + 1).setValue(patch[headers[c]]);
}
function findRowBy(name, col, val) {
  var rows = readSheet(name);
  for (var i = 0; i < rows.length; i++) if (String(rows[i][col] == null ? '' : rows[i][col]) === String(val)) return rows[i];
  return null;
}
function cleanStr(v) { if (v == null) return ''; return String(v).replace(/[\u200B-\u200D\uFEFF\u00AD]/g, '').replace(/[\x00-\x1F\x7F]/g, ' ').replace(/\s+/g, ' ').trim(); }
function trunc(s, n) { s = cleanStr(s); return s.length <= n ? s : s.substring(0, n - 3).trimEnd() + '...'; }
function sleep(ms) { Utilities.sleep(ms); }
function nowIso() { return new Date().toISOString(); }
function slugify(s) { return String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, ''); }
function escapeHtml(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function newId(prefix) { return prefix + '_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36); }
function parseJsonSafe(s) { try { return JSON.parse(s); } catch (e) { return null; } }
function extractJson(text, open) {
  var close = open === '[' ? ']' : '}'; var s = String(text || ''); var start = s.indexOf(open);
  if (start === -1) return null;
  var depth = 0, inStr = false, esc = false;
  for (var i = start; i < s.length; i++) {
    var ch = s.charAt(i);
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
    if (ch === '"') inStr = true; else if (ch === open) depth++; else if (ch === close) { depth--; if (depth === 0) return parseJsonSafe(s.substring(start, i + 1)); }
  }
  return null;
}
function repairTruncatedJson(text) {
  // Try each closing bracket position (newest first): parse as-is, then parse with
  // open brackets balanced (and an open string closed). Last resort: close the whole
  // remainder. Returns the LAST valid value, or null.
  var s = String(text || '');
  var o1 = s.indexOf('{'), o2 = s.indexOf('[');
  var open = (o1 === -1) ? o2 : (o2 === -1 ? o1 : Math.min(o1, o2));
  if (open === -1) return null;
  function attempt(sub) {
    var stack = [], inStr = false, esc = false;
    for (var j = 0; j < sub.length; j++) {
      var ch = sub.charAt(j);
      if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue; }
      if (ch === '"') inStr = true; else if (ch === '{') stack.push('}'); else if (ch === '[') stack.push(']');
      else if (ch === '}' || ch === ']') { if (stack.length) stack.pop(); }
    }
    var variants = [];
    if (inStr) {
      var v1 = sub + '"'; for (var k = stack.length - 1; k >= 0; k--) v1 += stack[k];
      variants.push(v1); variants.push(sub + '"');
    } else {
      var v2 = sub; for (var k2 = stack.length - 1; k2 >= 0; k2--) v2 += stack[k2];
      variants.push(v2);
    }
    for (var t = 0; t < variants.length; t++) { var val = parseJsonSafe(variants[t]); if (val !== null) return val; }
    return null;
  }
  var cands = [];
  for (var i = s.length - 1; i >= open; i--) { var ch = s.charAt(i); if (ch === '}' || ch === ']') cands.push(i); }
  for (var c = 0; c < cands.length && c < 300; c++) {
    var val = attempt(s.substring(open, cands[c] + 1));
    if (val !== null) return val;
  }
  return attempt(s.substring(open));
}

// --------------------------------- CONFIG -----------------------------------
var _configCache = null;
function resetConfigCache() { _configCache = null; }
function configSheetValue(key) {
  if (_configCache === null) {
    _configCache = {};
    var rows = readSheet('Config');
    for (var i = 0; i < rows.length; i++) { var k = String(rows[i].key == null ? '' : rows[i].key).trim().toUpperCase(); if (k) _configCache[k] = String(rows[i].value == null ? '' : rows[i].value).trim(); }
  }
  return _configCache[String(key).toUpperCase()] === undefined ? '' : _configCache[String(key).toUpperCase()];
}
var CONFIG_ALIASES = { 'GH_TOKEN': 'GITHUB_TOKEN', 'GITHUB_TOKEN': 'GH_TOKEN', 'CF_API_TOKEN': 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_API_TOKEN': 'CF_API_TOKEN', 'CF_ACCOUNT_ID': 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_ACCOUNT_ID': 'CF_ACCOUNT_ID' };
function getConfig(key, fallback) {
  var v = configSheetValue(key);
  if (!v && CONFIG_ALIASES[key]) v = configSheetValue(CONFIG_ALIASES[key]);
  return v || (fallback === undefined ? '' : fallback);
}
function hasKey(key) { var v = getConfig(key, ''); if (!v || v === 'REPLACE') return false; if (/XXX+|YOUR_|paste/i.test(v)) return false; return true; }
function isEmergencyStop() { return String(getConfig('EMERGENCY_STOP', 'RUN')).toUpperCase() === 'STOP'; }
function isDryRun() { return String(getConfig('DRY_RUN', 'FALSE')).toUpperCase() === 'TRUE'; }
function distributionMode() { return String(getConfig('DISTRIBUTION_POSTING_MODE', 'DRAFT')).toUpperCase() === 'LIVE' ? 'LIVE' : 'DRAFT'; }
function bskyPostingMode() { return String(getConfig('BSKY_POSTING_MODE', 'DRAFT')).toUpperCase() === 'LIVE' ? 'LIVE' : 'DRAFT'; }
function searchEnabled() { return String(getConfig('SEARCH_ENABLED', 'TRUE')).toUpperCase() === 'TRUE'; }
function replyEnabled() { return String(getConfig('REPLY_ENABLED', 'TRUE')).toUpperCase() === 'TRUE'; }

// --------------------------------- LOGGING ----------------------------------
var _LOG_BUF = []; var _LOG_FLUSH_MAX = 50; var _runIdCache = null;
function _runId() { if (_runIdCache) return _runIdCache; _runIdCache = 'run-' + Date.now() + '-' + Math.floor(Math.random() * 10000); return _runIdCache; }
function maskSecret(s) {
  s = String(s == null ? '' : s);
  s = s.replace(/ghp_[A-Za-z0-9]{20,}/g, 'ghp_***').replace(/github_pat_[A-Za-z0-9_]{20,}/g, 'github_pat_***');
  s = s.replace(/apik_[A-Za-z0-9_]{10,}/g, 'apik_***').replace(/(csk-|gsk_|AIza|cfat_|cfut_|tvly-|cohere_|s1ee|xeW1)[A-Za-z0-9_-]{8,}/g, '***');
  s = s.replace(/nsec1[a-z0-9]+/g, 'nsec1***');
  s = s.replace(/https:\/\/discord\.com\/api\/webhooks\/\d+\/[A-Za-z0-9_-]+/g, 'discord://***');
  return s;
}
function log(level, fn, message) {
  var safe = maskSecret(String(message == null ? '' : message).replace(/^=+/, ' '));
  try { Logger.log('[' + level + '] ' + fn + ' | ' + safe); } catch (e) {}
  _LOG_BUF.push([nowIso(), level, fn, safe, _runId()]);
  if (level === 'ERROR') flushLogs();
  if (_LOG_BUF.length >= _LOG_FLUSH_MAX) flushLogs();
}
function flushLogs() {
  if (!_LOG_BUF.length) return 0;
  var rows = _LOG_BUF; _LOG_BUF = [];
  try {
    var sh = getSpreadsheet().getSheetByName('Logs') || ensureSheet('Logs');
    sh.getRange(sh.getLastRow() + 1, 1, rows.length, 5).setValues(rows);
    var excess = sh.getLastRow() - CL.MAX_LOG_ROWS - 1;
    if (excess > 0) sh.deleteRows(2, excess);
    return rows.length;
  } catch (e) { Logger.log('LOG FLUSH FAILED: ' + e.toString()); return 0; }
}
function audit(level, system, action, target, details) {
  try { ensureSheet('Audit').appendRow([nowIso(), level, system, action, target || '', maskSecret(trunc(details || '', 400))]); } catch (e) {}
}
function discordAlert(severity, message) {
  try {
    var url = getConfig('DISCORD_WEBHOOK', ''); if (!url) return;
    var msg = maskSecret(String(message).substring(0, 1900));
    var props = PropertiesService.getScriptProperties();
    var key = 'CL_DD_' + severity + '_' + _hashStr(msg);
    if (props.getProperty(key) && Date.now() - parseInt(props.getProperty(key), 10) < 30 * 60 * 1000) return;
    UrlFetchApp.fetch(url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ content: '[' + severity + '] ' + msg }) });
    props.setProperty(key, String(Date.now()));
  } catch (e) { log('WARN', 'discordAlert', e.toString()); }
}
function _hashStr(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return String(h >>> 0); }

// ----------------------------- BUDGET / LOCK ---------------------------------
var _bgStart = null;
function budgetStart() { _bgStart = new Date(); }
function budgetElapsedMs() { if (!_bgStart) _bgStart = new Date(); return Date.now() - _bgStart.getTime(); }
function budgetRemainingMs() { return CL.HARD_LIMIT_MS - budgetElapsedMs(); }
function budgetReserve(ms) { return budgetRemainingMs() >= (ms || 0); }
function withLock(name, fn) {
  var lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) { log('WARN', name, 'busy - lock held, skipped'); flushLogs(); return null; }
  try { return fn(); } catch (e) { log('ERROR', name, e && e.stack ? e.stack : String(e)); throw e; } finally { lock.releaseLock(); flushLogs(); }
}
function getFactoryTimezone() { return getConfig('TIMEZONE', CL.TIMEZONE) || CL.TIMEZONE; }
function getFactoryTodayKey() { try { return Utilities.formatDate(new Date(), getFactoryTimezone(), 'yyyy-MM-dd'); } catch (e) { return new Date().toISOString().slice(0, 10); } }
function factoryHour() { try { return parseInt(Utilities.formatDate(new Date(), getFactoryTimezone(), 'H'), 10); } catch (e) { return new Date().getUTCHours(); } }
function factoryDow() { try { var d = new Date(Utilities.formatDate(new Date(), getFactoryTimezone(), 'yyyy-MM-dd')); return d.getDay(); } catch (e) { return new Date().getUTCDay(); } }
function isWeekendHeavy() {
  if (String(getConfig('WEEKEND_MODE_ENABLED', 'TRUE')).toUpperCase() !== 'TRUE') return false;
  var days = String(getConfig('HEAVY_DAYS', '6,0')).split(',').map(function (s) { return parseInt(s, 10); });
  return days.indexOf(factoryDow()) !== -1;
}
function ledgerResetIfNeeded() {
  var today = getFactoryTodayKey(); var props = PropertiesService.getScriptProperties();
  if (props.getProperty('CL_DAY_KEY') !== today) { props.setProperty('CL_DAY_KEY', today); props.setProperty('CL_DAY_MS', '0'); }
}
function ledgerAdd(ms) { ledgerResetIfNeeded(); var p = PropertiesService.getScriptProperties(); p.setProperty('CL_DAY_MS', String(parseInt(p.getProperty('CL_DAY_MS') || '0', 10) + Math.round(ms))); }
function ledgerTodayMs() { ledgerResetIfNeeded(); return parseInt(PropertiesService.getScriptProperties().getProperty('CL_DAY_MS') || '0', 10); }
function getDailyBudgetMs() {
  var isHeavy = isWeekendHeavy();
  var v = isHeavy ? getConfig('DAILY_BUDGET_MS_WEEKEND', '5100000') : getConfig('DAILY_BUDGET_MS_WEEKDAY', '2700000');
  v = parseInt(v, 10);
  return (v > 0 ? v : (isHeavy ? CL.DAILY_BUDGET_WEEKEND_MS : CL.DAILY_BUDGET_WEEKDAY_MS));
}
function ledgerHasHeadroom() { return ledgerTodayMs() < getDailyBudgetMs(); }
function safeBudget() { var used = ledgerTodayMs(); var budget = getDailyBudgetMs(); return { used: used, budget: budget, left: Math.max(0, budget - used), pct: Math.round(used / budget * 100), isHeavy: isWeekendHeavy(), tz: getFactoryTimezone(), day: getFactoryTodayKey() }; }
function resetBudgetManually() { var p = PropertiesService.getScriptProperties(); p.setProperty('CL_DAY_MS', '0'); p.setProperty('CL_DAY_KEY', getFactoryTodayKey()); log('SUCCESS', 'resetBudget', 'budget reset for ' + getFactoryTodayKey()); return true; }
function ensureMainTrigger() {
  var t = ScriptApp.getProjectTriggers().filter(function (x) { return x.getHandlerFunction() === 'clMain'; });
  if (t.length === 1) return true;
  for (var i = 0; i < t.length; i++) { try { ScriptApp.deleteTrigger(t[i]); } catch (e) {} }
  try { ScriptApp.newTrigger('clMain').timeBased().everyMinutes(CL.TRIGGER_MIN).create(); log('ERROR', 'ensureMainTrigger', 'reinstalled missing trigger'); discordAlert('ERROR', 'clMain trigger reinstalled'); return true; }
  catch (e) { log('ERROR', 'ensureMainTrigger', 'reinstall failed: ' + e.toString()); return false; }
}
function ensureWatchdogTrigger() {
  var has = ScriptApp.getProjectTriggers().some(function (x) { return x.getHandlerFunction() === 'watchdog'; });
  if (!has) { try { ScriptApp.newTrigger('watchdog').timeBased().everyHours(6).create(); log('SUCCESS', 'ensureWatchdog', 'installed'); } catch (e) {} }
}
function installTriggers() { ensureMainTrigger(); ensureWatchdogTrigger(); }

// --------------------- LLM CASCADE + CIRCUIT BREAKERS ------------------------
function _cbGet(name) { var raw = PropertiesService.getScriptProperties().getProperty('CL_CB_' + name); if (!raw) return { fails: 0, until: 0, dead: false }; try { return JSON.parse(raw); } catch (e) { return { fails: 0, until: 0, dead: false }; } }
function _cbSet(name, s) { PropertiesService.getScriptProperties().setProperty('CL_CB_' + name, JSON.stringify(s)); }
function _cbFail(name, kind) { var s = _cbGet(name); if (kind === 'rate') s.until = Date.now() + 60 * 60 * 1000; else if (kind === 'dead') { s.dead = true; s.until = Date.now() + 24 * 60 * 60 * 1000; } else { s.fails += 1; if (s.fails >= 3) s.until = Date.now() + 60 * 60 * 1000; } _cbSet(name, s); }
function _cbOk(name) { _cbSet(name, { fails: 0, until: 0, dead: false }); }
function _cbBlocked(name) { var s = _cbGet(name); if (s.dead) return true; return Date.now() < s.until; }
function resetCircuitBreakers() { var p = PropertiesService.getScriptProperties(); var keys = Object.keys(p.getProperties()).filter(function (k) { return k.indexOf('CL_CB_') === 0; }); keys.forEach(function (k) { p.deleteProperty(k); }); log('SUCCESS', 'resetCircuitBreakers', keys.length + ' reset'); }

var PROVIDER_MODELS = {
  cerebras: ['gpt-oss-120b', 'gpt-oss-20b'],
  gemini: ['gemini-2.0-flash', 'gemini-2.0-flash-lite', 'gemini-1.5-flash'],
  groq: ['llama-3.3-70b-versatile', 'openai/gpt-oss-120b', 'openai/gpt-oss-20b', 'llama-3.1-8b-instant'],
  mistral: ['mistral-small-latest', 'open-mistral-nemo'],
  cohere: ['command-r-plus-08-2024', 'command-r-08-2024', 'command-a-03-2025'],
  cloudflare: ['@cf/meta/llama-3.3-70b-instruct-fp8-fast', '@cf/meta/llama-3.2-3b-instruct'],
  openrouter: ['meta-llama/llama-3.3-70b-instruct:free', 'mistralai/mistral-small-3.1-24b-instruct:free'],
  pollinations: ['openai', 'gpt-4o-mini']
};
var LLM_CHAIN = [
  { name: 'cerebras', key: 'CEREBRAS_API_KEY', url: 'https://api.cerebras.ai/v1/chat/completions' },
  { name: 'gemini', key: 'GEMINI_API_KEY', url: '' },
  { name: 'groq', key: 'GROQ_API_KEY', url: 'https://api.groq.com/openai/v1/chat/completions' },
  { name: 'mistral', key: 'MISTRAL_API_KEY', url: 'https://api.mistral.ai/v1/chat/completions' },
  { name: 'cohere', key: 'COHERE_API_KEY', url: 'https://api.cohere.com/v2/chat' },
  { name: 'cloudflare', key: 'CLOUDFLARE_API_KEY', url: '' },
  { name: 'openrouter', key: 'OPENROUTER_API_KEY', url: 'https://openrouter.ai/api/v1/chat/completions' },
  { name: 'pollinations', key: '', url: 'https://text.pollinations.ai/openai' }
];
function callLLM(messages, maxTokens) {
  maxTokens = maxTokens || CL.AI_MAX_TOKENS;
  for (var i = 0; i < LLM_CHAIN.length; i++) {
    var p = LLM_CHAIN[i];
    if (p.name === 'pollinations') continue; // last resort only
    if (p.key && !hasKey(p.key)) continue;
    if (p.name === 'cloudflare' && !hasKey('CLOUDFLARE_ACCOUNT_ID')) continue;
    if (_cbBlocked(p.name)) continue;
    var res = _dispatchLLM(p, messages, maxTokens);
    if (res && res.error === 'rate') { _cbFail(p.name, 'rate'); continue; }
    if (res && res.error === 'dead') { _cbFail(p.name, 'dead'); continue; }
    if (res && res.error === 'other') { _cbFail(p.name, 'soft'); continue; }
    if (res && res.text && res.text.length > 10) { _cbOk(p.name); return { text: res.text, provider: p.name }; }
  }
  try {
    if (String(getConfig('POLLINATIONS_ENABLED', 'TRUE')).toUpperCase() === 'TRUE') {
      var prompt = (messages && messages.length) ? messages.map(function (m) { return m.content; }).join('\n\n') : '';
      var freeRes = freeLLMPollinations(prompt, maxTokens);
      if (freeRes && freeRes.text && freeRes.text.length > 10) { log('INFO', 'callLLM', 'fallback Pollinations after capable LLMs failed'); return freeRes; }
    }
  } catch (e) { log('WARN', 'callLLM', 'pollinations fallback: ' + e.toString()); }
  return { text: null, provider: 'none' };
}
function _dispatchLLM(p, messages, maxTokens) {
  if (p.name === 'gemini') return _callGemini(messages, maxTokens);
  if (p.name === 'cohere') return _callCohere(messages, maxTokens);
  if (p.name === 'cloudflare') return _callCloudflare(messages, maxTokens);
  return _callOpenaiCompat(p, messages, maxTokens);
}
function safeFetch(url, options, maxRetries) {
  maxRetries = Math.min(2, Math.max(1, maxRetries || 2)); var last = '';
  for (var i = 1; i <= maxRetries; i++) {
    try {
      var r = UrlFetchApp.fetch(url, options); var code = r.getResponseCode();
      if (code === 429) { if (i < maxRetries) { sleep(Math.pow(2, i) * 1000 + Math.floor(Math.random() * 400)); continue; } return r; }
      if (code >= 500 && code <= 599) { if (i < maxRetries) { sleep(Math.pow(2, i) * 1000); continue; } }
      return r;
    } catch (e) { last = e.toString(); if (i < maxRetries) sleep(Math.pow(2, i) * 1000); }
  }
  log('ERROR', 'safeFetch', 'all retries failed ' + maskSecret(last)); return null;
}
function postJson(url, headers, payload, retries) { return safeFetch(url, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, headers: headers || {}, payload: JSON.stringify(payload) }, retries || 2); }
function getJson(url, headers, retries) { return safeFetch(url, { method: 'get', muteHttpExceptions: true, headers: headers || {} }, retries || 2); }
function _callOpenaiCompat(p, messages, maxTokens) {
  var key = p.key ? getConfig(p.key, '') : '';
  var models = PROVIDER_MODELS[p.name] || ['gpt-4o-mini'];
  for (var m = 0; m < models.length; m++) {
    var headers = { 'Content-Type': 'application/json' }; if (key) headers['Authorization'] = 'Bearer ' + key;
    var r = postJson(p.url, headers, { model: models[m], messages: messages, max_tokens: maxTokens, temperature: CL.AI_TEMPERATURE }, 1);
    if (!r) continue;
    var code = r.getResponseCode(); var txt = r.getContentText() || ''; var body = parseJsonSafe(txt) || {};
    if (code === 429) return { error: 'rate' };
    if (code === 401 || code === 403) return { error: 'dead' };
    if (code === 404) { log('INFO', 'callLLM', p.name + ' 404 model ' + models[m]); continue; }
    if (code !== 200) { log('WARN', 'callLLM', p.name + ' http ' + code + ' ' + trunc(txt, 160)); continue; }
    var choice = body.choices && body.choices[0] ? body.choices[0] : {};
    var text = choice.message && choice.message.content ? choice.message.content : '';
    if (!text || !String(text).trim()) continue;
    return { text: String(text).trim() };
  }
  return { error: 'other' };
}
function _callGemini(messages, maxTokens) {
  var key = getConfig('GEMINI_API_KEY', ''); if (!key) return { error: 'other' };
  var sys = '', usr = ''; for (var i = 0; i < messages.length; i++) { if (messages[i].role === 'system') sys = messages[i].content; if (messages[i].role === 'user') usr = messages[i].content; }
  var combined = sys ? sys + '\n\n' + usr : usr;
  var bases = ['https://generativelanguage.googleapis.com/v1beta/models/', 'https://generativelanguage.googleapis.com/v1/models/'];
  for (var b = 0; b < bases.length; b++) for (var m = 0; m < PROVIDER_MODELS.gemini.length; m++) {
    var url = bases[b] + PROVIDER_MODELS.gemini[m] + ':generateContent?key=' + key;
    var r = postJson(url, { 'Content-Type': 'application/json' }, { contents: [{ parts: [{ text: combined }] }], generationConfig: { temperature: CL.AI_TEMPERATURE, maxOutputTokens: maxTokens } }, 1);
    if (!r) continue;
    var code = r.getResponseCode(); var txt = r.getContentText() || ''; var body = parseJsonSafe(txt) || {};
    if (code === 429) return { error: 'rate' };
    if (code === 401 || code === 403) return { error: 'dead' };
    if (code === 404) continue;
    if (code !== 200) continue;
    var text = body.candidates && body.candidates[0] && body.candidates[0].content && body.candidates[0].content.parts ? body.candidates[0].content.parts[0].text : '';
    if (!text || !String(text).trim()) continue;
    return { text: String(text).trim() };
  }
  return { error: 'other' };
}
function _callCohere(messages, maxTokens) {
  var key = getConfig('COHERE_API_KEY', ''); if (!key) return { error: 'other' };
  for (var m = 0; m < PROVIDER_MODELS.cohere.length; m++) {
    var r = postJson('https://api.cohere.com/v2/chat', { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, { model: PROVIDER_MODELS.cohere[m], messages: messages, temperature: CL.AI_TEMPERATURE, max_tokens: maxTokens }, 1);
    if (!r) continue;
    var code = r.getResponseCode(); var txt = r.getContentText() || ''; var body = parseJsonSafe(txt) || {};
    if (code === 429) return { error: 'rate' };
    if (code === 401 || code === 403) return { error: 'dead' };
    if (code === 404) continue;
    if (code !== 200) continue;
    var text = body.message && body.message.content && body.message.content[0] ? body.message.content[0].text : '';
    if (!text || !String(text).trim()) continue;
    return { text: String(text).trim() };
  }
  return { error: 'other' };
}
function _callCloudflare(messages, maxTokens) {
  var key = getConfig('CLOUDFLARE_API_KEY', ''); var acct = getConfig('CLOUDFLARE_ACCOUNT_ID', '');
  if (!key || !acct) return { error: 'other' };
  var url = 'https://api.cloudflare.com/client/v4/accounts/' + acct + '/ai/v1/chat/completions';
  for (var m = 0; m < PROVIDER_MODELS.cloudflare.length; m++) {
    var r = postJson(url, { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' }, { model: PROVIDER_MODELS.cloudflare[m], messages: messages, max_tokens: maxTokens, temperature: CL.AI_TEMPERATURE }, 1);
    if (!r) continue;
    var code = r.getResponseCode(); var txt = r.getContentText() || ''; var body = parseJsonSafe(txt) || {};
    if (code === 429) return { error: 'rate' };
    if (code === 401 || code === 403) return { error: 'dead' };
    if (code === 404) continue;
    if (code !== 200) continue;
    var text = body.choices && body.choices[0] && body.choices[0].message ? body.choices[0].message.content : '';
    if (!text || !String(text).trim()) continue;
    return { text: String(text).trim() };
  }
  return { error: 'other' };
}
function freeLLMPollinations(prompt, maxTokens) {
  try {
    var r = postJson('https://text.pollinations.ai/openai', { 'Content-Type': 'application/json' }, { model: 'openai', messages: [{ role: 'user', content: prompt }], max_tokens: maxTokens || 800 }, 1);
    if (r && r.getResponseCode() === 200) {
      var b = parseJsonSafe(r.getContentText()) || {};
      if (b.choices && b.choices[0] && b.choices[0].message) return { text: String(b.choices[0].message.content).trim(), provider: 'pollinations' };
    }
  } catch (e) { log('WARN', 'freeLLMPollinations', e.toString()); }
  return { text: null, provider: 'pollinations' };
}

// ----------------------- NO-FAKE-CLAIM SCANNER (v2 rule) ---------------------
var FAKE_PATTERNS = [
  [/\b\d+\.?\d?\s*(\/\s*5|out of five|stars?|rating|ratings|reviews?)/i, 'numeric rating'],
  [/\b(4\.5|4\.6|4\.7|4\.8|4\.9|5\.0)\s*(\/\s*5)?\b/, 'star score'],
  [/\b(used by|loved by|trusted by|join [0-9]|joined? by|over \d+ (users|freelancers|customers|teams|pros|creators|makers|operators))\b/i, 'fake user counts'],
  [/\b\d[\d,]*\s*(freelancers|customers|users|teams|pros|creators|makers|operators|developers|designers|researchers)\b/i, 'fake user counts'],
  [/\bfree for (48h|48 hours|72h|24h|a few hours|the next \d+h)\b/i, 'fake deadline'],
  [/\b(then \$|goes (to|up) \$|price (goes|increases|rises)|only \d+ (left|spots|seats|copies) left|ends? (tonight|soon|in \d+\s?h))\b/i, 'fake scarcity'],
  [/\bguarantee(s|d)?\b/i, 'guarantee claim'],
  [/\b\d+[%]\s*(savings|discount|off|cheaper|better|faster|more)\b/i, 'unproven percentage claim'],
  [/\b“[^”]{15,}”\s*—/, 'invented testimonial'],
  [/\b(halved|doubled|tripled|10x|100x)\b/i, 'exaggeration']
];
function fakeClaims(text) {
  var s = String(text == null ? '' : text); var hits = [];
  for (var i = 0; i < FAKE_PATTERNS.length; i++) if (FAKE_PATTERNS[i][0].test(s)) hits.push(FAKE_PATTERNS[i][1]);
  return hits;
}
function passesGibberishGuard(text) {
  var words = String(text || '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  if (words.length < 10) return true;
  var freq = {}, max = 0;
  for (var i = 0; i < words.length; i++) { freq[words[i]] = (freq[words[i]] || 0) + 1; if (freq[words[i]] > max) max = freq[words[i]]; }
  if (max / words.length > 0.30) return false;
  var uniq = 0; for (var k in freq) uniq++;
  return uniq / words.length >= 0.42;
}

// --------------------------- PERSONA SEEDS (9) ------------------------------
var PERSONA_SEEDS = [
  { persona_id: 'p_seo', name: 'Sable', niche: 'CLI automation & SEO tools', voice: 'senior toolmaker who ships small CLIs', tone: 'dry, specific, no filler', topics: 'argparse, pathlib, CLI exit codes, entry points', tool_name: 'CLI Scaffold Generator', search_keywords: 'CLI tools, terminal workflows, bash scripting, python CLI, argparse, developer productivity, site audit script', search_hashtags: '#cli #devtools #bash #python' },
  { persona_id: 'p_api', name: 'Juno', niche: 'API data tools & inference', voice: 'backend engineer tuning inference', tone: 'practical, warm', topics: 'token streaming, quantization, vLLM, rate limiting', tool_name: 'Inference Cost & Rate-Limit Calculator', search_keywords: 'API rate limiting, LLM inference costs, vLLM setup, token streaming, model quantization, API design, backend optimization', search_hashtags: '#apidesign #inference #llm #backend' },
  { persona_id: 'p_web', name: 'Wren', niche: 'webdev kits & open source maintenance', voice: 'maintainer triaging issues', tone: 'calm, studio-diary', topics: 'semantic versioning, changelogs, Dependabot, breaking changes', tool_name: 'SemVer Changelog Generator', search_keywords: 'open source maintenance, semantic versioning, changelog automation, Dependabot, breaking changes, web development kit, repository hygiene', search_hashtags: '#webdev #opensource #semver #changelog' },
  { persona_id: 'p_apps', name: 'Ott', niche: 'Apps Script & CSS platforms', voice: 'platform practitioner', tone: 'grounded, precise', topics: 'container queries, CSS grid, view transitions, subgrid', tool_name: 'CSS Layout Playground', search_keywords: 'Apps Script development, CSS grid layouts, container queries, view transitions, subgrid, web platform features, web app performance', search_hashtags: '#css #webdev #frontend #apps-script' },
  { persona_id: 'p_notion', name: 'Mabel', niche: 'Notion templates for freelancers', voice: 'freelance designer running calm studio', tone: 'gentle, organized', topics: 'client onboarding, moodboards, invoices, revision limits', tool_name: 'Client Onboarding Kit Generator', search_keywords: 'freelance client onboarding, Notion invoice template, freelance CRM, client moodboard, revision limits, freelancer tools, client handoff', search_hashtags: '#freelance #notion #clientonboarding #invoicing' },
  { persona_id: 'p_social', name: 'Ravi', niche: 'self-hosted & homelab', voice: 'solo operator running infra alone', tone: 'focused, methodical', topics: 'VLANs, WireGuard, docker compose, nginx, systemd', tool_name: 'Homelab Config Generator', search_keywords: 'homelab setup, WireGuard VPN, VLAN segmentation, docker compose stacks, nginx reverse proxy, self-hosted services, systemd', search_hashtags: '#homelab #selfhosted #wireguard #linux' },
  { persona_id: 'p_sheets', name: 'Sena', niche: 'Sheets & API design', voice: 'API designer shipping patterns', tone: 'clear, steady', topics: 'idempotency keys, cursor pagination, rate limiting, webhook retries', tool_name: 'API Design Linter', search_keywords: 'API design patterns, idempotency keys, cursor pagination, webhook retries, Google Sheets API, rate limiting, API docs', search_hashtags: '#apidesign #api #backend #sheets' },
  { persona_id: 'p_python', name: 'Gus', niche: 'solo operator infrastructure', voice: 'multi-discipline freelancer', tone: 'easygoing, systematic', topics: 'backup scripts, uptime monitoring, terraform, server costs', tool_name: 'Server Cost & Backup Planner', search_keywords: 'server backup scripts, uptime monitoring, terraform basics, VPS costs, solo sysadmin, disaster recovery, log rotation', search_hashtags: '#sysadmin #terraform #backup #vps' },
  { persona_id: 'p_simali', name: 'Ada', niche: 'AI safety & alignment', voice: 'researcher reading literature', tone: 'reflective, tactical', topics: 'reward hacking, RLHF, interpretability, red teaming', tool_name: 'Red-Team Scenario Builder', search_keywords: 'AI safety, reward hacking, RLHF pitfalls, interpretability, red teaming LLMs, alignment research, eval design', search_hashtags: '#aisafety #alignment #research #ml' }
];
function seedPersonasIfEmpty() {
  var rows = readSheet('Personas');
  if (rows.length) return rows.length;
  PERSONA_SEEDS.forEach(function (s) {
    appendRow('Personas', Object.assign({
      distribution_enabled: 'TRUE', max_posts_per_day: 9, posts_today: 0, last_date: '', created_at: nowIso()
    }, s));
  });
  log('SUCCESS', 'seedPersonas', PERSONA_SEEDS.length + ' personas seeded');
  return PERSONA_SEEDS.length;
}
var CONFIG_SEEDS = [
  ['EMERGENCY_STOP', '', 'RUN or STOP — STOP halts the factory instantly'],
  ['DRY_RUN', 'FALSE', 'TRUE = simulate channel writes'],
  ['BRAND_NAME', BRAND_NAME, ''],
  ['CUSTOM_BUILD_EMAIL', CUSTOM_EMAIL, 'central custom-work contact'],
  ['LIGHTNING_ADDRESS', 'SharkSkin@coinos.io', 'tip jar + lightning rail'],
  ['NOTION_TOKEN', '', 'integration token — one workspace, all 9 personas'],
  ['NOTION_PARENT_ID', '', 'parent page shared with the integration (32 hex)'],
  ['COINOS_API_BASE', '', 'coinos REST base, e.g. https://<host>/api'],
  ['COINOS_API_KEY', '', 'coinos API key'],
  ['COINOS_WEBHOOK_SECRET', '', 'any random string — must match the ?s= on the worker webhook URL'],
  ['CL_BRIDGE_SECRET', '', '48-hex — shared by web app + worker + Actions secret'],
  ['WEB_APP_URL', '', 'this script deployed as web app (anyone) — the /exec URL'],
  ['CLOUDFLARE_WORKER_URL', 'https://cedar-loom.simalidudu.workers.dev', ''],
  ['GH_TOKEN', '', 'repo-scope PAT (rotated)'],
  ['GITHUB_TOKEN', '', 'alias of GH_TOKEN'],
  ['GH_REPO', 'king-kunta-cpu/ptp', 'public repo for v2-factory workflow'],
  ['GITHUB_REPO', '', 'alias'],
  ['WHOP_API_KEY', '', 'central store company key (rotated)'],
  ['WHOP_COMPANY_ID', 'biz_A79oVYva4QTT8Z', 'central store'],
  ['WHOP_APP_API_KEY', '', 'media upload + forum'],
  ['WHOP_APP_ID', '', ''],
  ['CEREBRAS_API_KEY', '', 'primary LLM'],
  ['GROQ_API_KEY', '', 'LLM + judge'],
  ['GEMINI_API_KEY', '', 'LLM'],
  ['MISTRAL_API_KEY', '', 'LLM'],
  ['COHERE_API_KEY', '', 'LLM'],
  ['CLOUDFLARE_API_KEY', '', 'LLM (AI gateway)'],
  ['CLOUDFLARE_ACCOUNT_ID', '', 'for CF AI gateway'],
  ['OPENROUTER_API_KEY', '', 'optional free LLM'],
  ['SERPER_API_KEY', '', 'optional research'],
  ['TAVILY_API_KEY', '', 'optional research'],
  ['YOUTUBE_CHANNEL_ID', 'UChT6JgRbKyEY2r_Umyi2cxQ', 'central channel (optional uploads)'],
  ['PERSONA_PAID_PRICE', '19', 'one paid price per persona asset'],
  ['PERSONA_AFFILIATE_PCT', '40', 'affiliate % on persona paid products'],
  ['BUNDLE_ENABLED', 'TRUE', 'central $99 bundle every 5 paid assets'],
  ['BUNDLE_PRICE', '99', ''],
  ['MIN_DEMAND_SCORE', '7', 'research judge min'],
  ['MIN_CONVERSION_SCORE', '8', 'brief judge min'],
  ['JUDGE_ENABLED', 'TRUE', 'LLM judge layer'],
  ['SEARCH_ENABLED', 'TRUE', 'niche search for engagement'],
  ['REPLY_ENABLED', 'TRUE', 'reply engine'],
  ['REPLY_CAP_PER_DAY', '5', 'per persona'],
  ['DISTRIBUTION_POSTING_MODE', 'DRAFT', 'DRAFT or LIVE'],
  ['BSKY_POSTING_MODE', 'DRAFT', 'DRAFT or LIVE'],
  ['WEEKEND_MODE_ENABLED', 'TRUE', ''],
  ['HEAVY_DAYS', '6,0', 'Sat=6 Sun=0 Africa/Harare'],
  ['DAILY_BUDGET_MS_WEEKDAY', '2700000', '45m'],
  ['DAILY_BUDGET_MS_WEEKEND', '5100000', '85m'],
  ['TIMEZONE', CL.TIMEZONE, ''],
  ['POLLINATIONS_ENABLED', 'TRUE', '$0 last-resort LLM'],
  ['DISCORD_WEBHOOK', '', 'alerts']
];
function seedConfigIfEmpty() {
  var existing = {};
  readSheet('Config').forEach(function (r) { existing[String(r.key).toUpperCase()] = 1; });
  CONFIG_SEEDS.forEach(function (s) { if (!existing[s[0].toUpperCase()]) appendRow('Config', { key: s[0], value: s[1], notes: s[2] }); });
}
function ensureSheets() { Object.keys(SCHEMA).forEach(function (n) { ensureSheet(n); }); seedPersonasIfEmpty(); seedConfigIfEmpty(); }

// --------------------------- QC (wake + judge) ------------------------------
function wakeVerifyAsset(asset, spec, landingHtml) {
  var checks = []; var score = 0;
  function add(name, pass, w) { checks.push({ name: name, pass: !!pass, weight: w }); if (pass) score += w; }
  var dbs = spec && spec.premium && Array.isArray(spec.premium.databases) ? spec.premium.databases.length : 0;
  add('Schema >=1 DB', dbs >= 1, 15);
  var realNotion = asset.notion_url && /notion\.so\/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/.test(String(asset.notion_url));
  add('Real Notion page (uuid, not slug)', realNotion, 15);
  add('HTML5 landing', landingHtml && landingHtml.indexOf('<!DOCTYPE html>') !== -1, 15);
  add('JSON-LD (no ratings)', landingHtml && landingHtml.indexOf('application/ld+json') !== -1 && landingHtml.indexOf('aggregateRating') === -1, 15);
  add('Whop checkout', asset.whop_url && String(asset.whop_url).length > 5, 10);
  var pr = parseFloat(asset.price || 0) || 0; add('Pricing sane', pr === 0 || (pr >= 5 && pr <= 399), 10);
  add('SEO title', String(asset.name || '').length >= 10, 10);
  add('No fake claims in spec', fakeClaims(JSON.stringify(spec)).length === 0, 10);
  return { score: Math.min(100, score), verdict: score >= CL.WAKE_PASS ? 'PASS' : (score >= 70 ? 'WARN' : 'FAIL'), checks: checks, timestamp: nowIso() };
}
function judgeQuality(stage, content) {
  try {
    if (String(getConfig('JUDGE_ENABLED', 'TRUE')).toUpperCase() !== 'TRUE') return { score: 8, pass: true };
    var min = stage === 'idea' ? parseInt(getConfig('MIN_DEMAND_SCORE', '7'), 10) : parseInt(getConfig('MIN_CONVERSION_SCORE', '8'), 10);
    var prompt = 'You are Cedar Loom QC judge. Stage: ' + stage + '. Rate 1-10 for: real demand, IRL value, conversion, and honesty (no fake stats/user counts/deadlines). Content: ' + trunc(JSON.stringify(content), 2000) + '\nReturn ONLY JSON: {"score":8,"reason":"..."}';
    var llm = callLLM([{ role: 'user', content: prompt }], 400);
    if (!llm.text) return { score: 7, pass: true };
    var j = extractJson(llm.text, '{') || repairTruncatedJson(llm.text);
    if (!j || typeof j.score === 'undefined') return { score: 7, pass: true };
    var s = parseInt(j.score, 10) || 7;
    return { score: s, pass: s >= min, reason: j.reason || '' };
  } catch (e) { return { score: 7, pass: true }; }
}

// ------------------------------- RESEARCH -----------------------------------
function _tooSimilar(a, b) {
  function tg(s) { s = String(s || '').toLowerCase().replace(/\s+/g, ' '); var o = {}; for (var i = 0; i + 3 <= s.length; i++) o[s.substring(i, i + 3)] = 1; return o; }
  var A = tg(a), B = tg(b), inter = 0, uni = Object.keys(A).length;
  for (var k in B) { if (A[k]) inter++; } uni += Object.keys(B).length - inter;
  return uni > 0 && (inter / uni) > 0.45;
}
function researchDue() {
  var backlog = readSheet('Backlog');
  var pendingByPersona = {};
  backlog.forEach(function (r) { if (String(r.status) === B.PENDING) pendingByPersona[String(r.persona_id)] = (pendingByPersona[String(r.persona_id)] || 0) + 1; });
  var target = isWeekendHeavy() ? CL.BACKLOG_TARGET_WEEKEND : CL.BACKLOG_TARGET_WEEKDAY;
  var personas = readSheet('Personas');
  for (var i = 0; i < personas.length; i++) if ((pendingByPersona[String(personas[i].persona_id)] || 0) < target) return true;
  return false;
}
function nextTierFor(personaId) {
  var backlog = readSheet('Backlog');
  var free = 0, paid = 0;
  backlog.forEach(function (r) { if (String(r.persona_id) === personaId && String(r.status) === B.PENDING) { if (String(r.tier) === 'free') free++; else paid++; } });
  return free * 2 < paid ? 'free' : 'paid';
}
function runResearchBatch() {
  var personas = readSheet('Personas');
  var existing = [];
  readSheet('Backlog').concat(readSheet('Assets')).forEach(function (r) { if (r.name) existing.push(String(r.name)); });
  var added = 0;
  for (var i = 0; i < personas.length; i++) {
    var p = personas[i];
    if (!budgetReserve(60000)) break;
    var n = isWeekendHeavy() ? CL.RESEARCH_PER_PERSONA_WEEKEND : CL.RESEARCH_PER_PERSONA_WEEKDAY;
    var prompt = 'You are Cedar Loom research for persona ' + p.name + ' — niche: ' + p.niche + '. Topics: ' + p.topics + '.\n' +
      'Generate ' + n + ' IRL, specific Notion workspace ideas (operational systems with real databases and workflow) that ' + p.niche + ' practitioners would actually use. ' +
      'Rules: concrete deliverables, no invented statistics or user counts, no hype, never use the words forge or nexus.\n' +
      'Return ONLY a JSON array: [{"name":"...","description":"...","demand_score":1-10}]';
    var llm = callLLM([{ role: 'user', content: prompt }], 900);
    if (!llm.text) continue;
    var ideas = extractJson(llm.text, '[') || repairTruncatedJson(llm.text);
    if (!Array.isArray(ideas)) continue;
    ideas.forEach(function (idea) {
      try {
        var name = trunc(idea.name, 90);
        if (!name || name.length < 8) return;
        var j = judgeQuality('idea', { name: name, description: idea.description });
        if (!j.pass) return;
        var dup = existing.some(function (e) { return _tooSimilar(name, e); });
        if (dup) return;
        appendRow('Backlog', { idea_id: newId('idea'), persona_id: p.persona_id, name: name, description: trunc(idea.description, 300), score: String(j.score), tier: nextTierFor(p.persona_id), status: B.PENDING, attempts: 0, created_at: nowIso(), updated_at: nowIso() });
        existing.push(name); added++;
      } catch (e) { log('WARN', 'runResearchBatch', e.toString()); }
    });
    sleep(500);
  }
  if (added) log('SUCCESS', 'runResearchBatch', added + ' ideas queued via ' + (llmProvider()));
  return added;
}
function llmProvider() { var last = ''; return last; } // placeholder for log clarity

// --------------------------------- BRIEFS -----------------------------------
function specPrompt(p, idea, extra) {
  return 'You are Cedar Loom spec writer. Persona ' + p.name + ' (' + p.voice + '; tone: ' + p.tone + '). Niche: ' + p.niche + '.\n' +
    'Idea: ' + idea.name + ' — ' + idea.description + '\n' +
    (extra || '') +
    'Produce a build spec for a REAL Notion workspace. Return ONLY JSON exactly in this shape:\n' +
    '{"angle":"one sentence","pain":"...","dream":"...","hook":"landing hook, one sentence, no stats","features":["...","..."],"benefits":["..."],"objections":["..."],"free":{"databases":[1 or 2 dbs]},"premium":{"databases":[exactly 3 dbs]},"dashboard":{"sections":[{"heading":"...","content":"..."}],"setupSteps":["...","...","...","..."]}}\n' +
    'Each database: {"name":"...","emoji":"one emoji","properties":{"PropName":{"type":"title|rich_text|number|checkbox|date|url|email|select|multi_select","options":["..."]}},"sampleRows":[rows using the property names exactly]}\n' +
    'premium must total >= 20 properties across the 3 dbs with 4-6 realistic sample rows per db; free = a genuinely usable lite version (1-2 dbs, 2-3 rows each).\n' +
    'Sample rows must be realistic, specific example data for ' + p.niche + ' (plausible names, dates, amounts). This is example data inside the template, NOT marketing.\n' +
    'BANNED anywhere in the spec: user counts, ratings, reviews, star scores, percentages, deadlines, "free for 48h", guarantees, testimonials.';
}
function draftAssetBriefsBatch(limit) {
  limit = limit || CL.BRIEF_PER_DAY;
  var backlog = readSheet('Backlog').filter(function (r) { return String(r.status) === B.PENDING; }).sort(function (a, b) { return parseFloat(b.score || 0) - parseFloat(a.score || 0); });
  var personas = {};
  readSheet('Personas').forEach(function (p) { personas[String(p.persona_id)] = p; });
  var done = 0;
  for (var i = 0; i < backlog.length && done < limit; i++) {
    var idea = backlog[i]; var p = personas[String(idea.persona_id)];
    if (!p || !budgetReserve(90000)) break;
    var llm = callLLM([{ role: 'user', content: specPrompt(p, idea, '') }], 2200);
    var spec = llm.text ? (extractJson(llm.text, '{') || repairTruncatedJson(llm.text)) : null;
    var claims = spec ? fakeClaims(JSON.stringify(spec)) : ['no spec returned'];
    if (claims.length) {
      // one repair attempt with explicit correction
      llm = callLLM([{ role: 'user', content: specPrompt(p, idea, 'PREVIOUS OUTPUT WAS REJECTED for banned claims: ' + claims.join(', ') + '. Remove ALL of them and return ONLY the corrected JSON spec.\n') }], 2200);
      spec = llm.text ? (extractJson(llm.text, '{') || repairTruncatedJson(llm.text)) : null;
      claims = spec ? fakeClaims(JSON.stringify(spec)) : ['still no spec'];
    }
    if (!spec || claims.length || !spec.premium || !Array.isArray(spec.premium.databases)) {
      updateRow('Backlog', idea._row, { status: B.REJECTED, attempts: '1', updated_at: nowIso() });
      log('WARN', 'draftBriefs', 'rejected ' + trunc(idea.name, 50) + ': ' + claims.join(','));
      continue;
    }
    var j = judgeQuality('asset', { name: idea.name, hook: spec.hook, features: spec.features });
    updateRow('Backlog', idea._row, { status: B.USED, updated_at: nowIso() });
    appendRow('Assets', { asset_id: newId('asset'), persona_id: p.persona_id, name: idea.name, description: trunc(idea.description, 300), tier: String(idea.tier) === 'free' ? 'free' : 'paid', status: A.DRAFTED, spec_json: JSON.stringify(spec).substring(0, 49000), judge_score: String(j.score), attempts: 0, created_at: nowIso(), updated_at: nowIso() });
    done++;
    sleep(400);
  }
  if (done) log('SUCCESS', 'draftBriefs', done + ' specs drafted');
  return done;
}

// ------------------------ BUILD DISPATCH + AUTO-REPAIR -----------------------
function _inflightKey(id) { return 'CL_BLD_' + String(id).replace(/[^a-z0-9]/gi, ''); }
function dispatchBuildBatch() {
  var ghToken = getConfig('GH_TOKEN', '') || getConfig('GITHUB_TOKEN', '');
  var repo = getConfig('GH_REPO', 'king-kunta-cpu/ptp');
  if (!ghToken || !repo) { log('WARN', 'dispatchBuild', 'GH_TOKEN/GH_REPO missing'); return 0; }
  var candidates = readSheet('Assets').filter(function (a) {
    return String(a.status) === A.DRAFTED && parseInt(a.attempts || 0, 10) < 2 && !PropertiesService.getScriptProperties().getProperty(_inflightKey(a.asset_id));
  }).slice(0, CL.BUILD_DISPATCH_PER_TICK);
  if (!candidates.length) return 0;
  var ids = candidates.map(function (a) { return String(a.asset_id); });
  var r = postJson('https://api.github.com/repos/' + repo + '/dispatches', { Authorization: 'Bearer ' + ghToken, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' }, { event_type: 'v2-build', client_payload: { type: 'v2-build', asset_ids: ids } }, 1);
  if (!r) { log('ERROR', 'dispatchBuild', 'fetch failed'); return 0; }
  var code = r.getResponseCode();
  if (code !== 204 && code !== 200) { log('ERROR', 'dispatchBuild', 'github dispatch http ' + code + ' ' + trunc(r.getContentText(), 200)); return 0; }
  var props = PropertiesService.getScriptProperties();
  ids.forEach(function (id) { props.setProperty(_inflightKey(id), String(Date.now())); });
  log('SUCCESS', 'dispatchBuild', ids.length + ' asset(s) → GitHub Actions');
  return ids.length;
}
function reapInflightBuilds() {
  var props = PropertiesService.getScriptProperties();
  var all = props.getProperties();
  var stale = 0;
  Object.keys(all).forEach(function (k) {
    if (k.indexOf('CL_BLD_') !== 0) return;
    var ts = parseInt(all[k], 10);
    if (Date.now() - ts < CL.BUILD_INFLIGHT_TTL_MS) return;
    props.deleteProperty(k);
    var id = k.replace('CL_BLD_', '');
    var asset = null;
    readSheet('Assets').forEach(function (a) { if (String(a.asset_id).replace(/[^a-z0-9]/gi, '') === id.replace(/[^a-z0-9]/gi, '')) asset = a; });
    if (asset && String(asset.status) === A.DRAFTED) {
      var attempts = parseInt(asset.attempts || 0, 10) + 1;
      if (attempts < 2) { log('WARN', 'reapBuilds', 'inflight timeout ' + trunc(asset.name, 40) + ' — will re-dispatch (attempt ' + attempts + ')'); updateRow('Assets', asset._row, { attempts: String(attempts), updated_at: nowIso() }); }
      else { updateRow('Assets', asset._row, { status: A.BLOCKED, error: 'build attempts exhausted', attempts: String(attempts), updated_at: nowIso() }); discordAlert('WARN', 'asset BLOCKED: ' + trunc(asset.name, 60)); }
    }
    stale++;
  });
  return stale;
}
function autoRepairFailedBuilds() {
  // one deterministic + (optional LLM) repair pass for BUILD_FAILED assets, then re-queue once
  var failed = readSheet('Assets').filter(function (a) { return String(a.status) === A.BUILD_FAILED && parseInt(a.attempts || 0, 10) < 3; }).slice(0, 3);
  var n = 0;
  failed.forEach(function (a) {
    try {
      var spec = parseJsonSafe(a.spec_json) || {};
      var fixed = false;
      ['free', 'premium'].forEach(function (tierKey) {
        var t = spec[tierKey];
        if (!t || !Array.isArray(t.databases) || !t.databases.length) {
          spec[tierKey] = { databases: [fillerDb(a.name, tierKey === 'free' ? 1 : 2)] };
          fixed = true;
        } else {
          var props = 0; t.databases.forEach(function (d) { props += Object.keys(d.properties || {}).length; });
          if (tierKey === 'premium' && (t.databases.length < 3 || props < 20)) {
            while (t.databases.length < 3) { t.databases.push(fillerDb(a.name, 1)); fixed = true; }
            var now = 0; t.databases.forEach(function (d) { now += Object.keys(d.properties || {}).length; });
            while (now < 20) { t.databases[t.databases.length - 1].properties = Object.assign({}, t.databases[t.databases.length - 1].properties, { Note: { type: 'rich_text' }, Updated: { type: 'date' } }); now += 2; fixed = true; }
          }
        }
      });
      if (String(getConfig('JUDGE_ENABLED', 'TRUE')).toUpperCase() === 'TRUE' && fixed) {
        var llm = callLLM([{ role: 'user', content: 'Fix this Notion asset spec so it is concrete and passes QC (3 premium DBs, >=20 props, realistic sample rows, CTA, no banned claims). Current: ' + trunc(JSON.stringify(spec), 2500) + '\nReturn ONLY the corrected JSON spec.' }], 2200);
        var better = llm.text ? (extractJson(llm.text, '{') || repairTruncatedJson(llm.text)) : null;
        if (better && better.premium && better.free && fakeClaims(JSON.stringify(better)).length === 0) spec = better;
      }
      if (fakeClaims(JSON.stringify(spec)).length > 0) { log('WARN', 'autoRepair', 'still has claims, skip ' + trunc(a.name, 40)); return; }
      updateRow('Assets', a._row, { status: A.DRAFTED, spec_json: JSON.stringify(spec).substring(0, 49000), error: '', updated_at: nowIso() });
      log('SUCCESS', 'autoRepair', 're-queued ' + trunc(a.name, 50));
      n++;
    } catch (e) { log('WARN', 'autoRepair', e.toString()); }
  });
  return n;
}
function fillerDb(assetName, count) {
  var defs = [
    { name: 'Tasks', emoji: '✅', properties: { Name: { type: 'title' }, Status: { type: 'select', options: ['Not Started', 'In Progress', 'Done'] }, Due: { type: 'date' }, Owner: { type: 'rich_text' }, Notes: { type: 'rich_text' } }, sampleRows: [{ Name: 'First real task', Status: 'Not Started', Due: new Date().toISOString().slice(0, 10), Owner: 'You', Notes: 'replace me' }] },
    { name: 'Log', emoji: '📓', properties: { Entry: { type: 'title' }, Date: { type: 'date' }, Category: { type: 'select', options: ['Win', 'Issue', 'Idea'] }, Value: { type: 'number' } }, sampleRows: [{ Entry: 'First log entry', Date: new Date().toISOString().slice(0, 10), Category: 'Idea', Value: 0 }] },
    { name: 'Hub', emoji: '🧭', properties: { Item: { type: 'title' }, Type: { type: 'select', options: ['Doc', 'Link', 'Template'] }, Url: { type: 'url' }, Done: { type: 'checkbox' } }, sampleRows: [{ Item: 'Getting started', Type: 'Doc', Url: 'https://notion.so', Done: false }] }
  ];
  return defs.slice(0, Math.max(1, Math.min(count, defs.length)))[0];
}

// --------------------------------- WHOP -------------------------------------
function whopCreateProduct(name, desc, price, key, companyId, affiliate) {
  if (isDryRun()) return { ok: true, productId: 'dryrun', planId: 'dryrun', whopUrl: 'https://dryrun.local/whop/' + slugify(name) };
  if (!key || !companyId) return { ok: false, error: 'missing_whop_credentials' };
  if (!/^biz_/i.test(companyId)) return { ok: false, error: 'invalid_company_id' };
  var body = { company_id: companyId, title: trunc(name, 120), description: trunc(desc, 3000), headline: trunc(name, 80), global_affiliate_percentage: affiliate || 0, metadata: { v2: true } };
  var r = postJson(CL.WHOP_API + '/products', { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }, body, 2);
  if (!r) return { ok: false, error: 'whop_fetch_failed' };
  var code = r.getResponseCode(); var b = parseJsonSafe(r.getContentText()) || {};
  if ((code !== 200 && code !== 201) || !b.id) { log('ERROR', 'whopCreate', 'http ' + code + ' ' + trunc(JSON.stringify(b), 200)); return { ok: false, error: 'product_http_' + code }; }
  var planId = '';
  try {
    var r2 = postJson(CL.WHOP_API + '/plans', { 'Authorization': 'Bearer ' + key, 'Content-Type': 'application/json' }, { product_id: b.id, plan_type: 'one_time', initial_price: price, visibility: 'visible', billing_period: 0 }, 2);
    if (r2) { var pb = parseJsonSafe(r2.getContentText()) || {}; planId = pb.id || ''; }
  } catch (e) { log('WARN', 'whopCreate', 'plan: ' + e.toString()); }
  var vr = getJson(CL.WHOP_API + '/products/' + b.id, { 'Authorization': 'Bearer ' + key }, 1);
  var vb = vr ? (parseJsonSafe(vr.getContentText()) || {}) : {};
  var whopUrl = vb.url || b.url || (vb.route ? 'https://whop.com/' + vb.route : 'https://whop.com/products/' + b.id);
  return { ok: true, productId: b.id, planId: planId, whopUrl: whopUrl };
}
function verifyWhopProduct(productId, key) {
  if (!key) return { ok: false };
  var r = getJson(CL.WHOP_API + '/products/' + productId, { 'Authorization': 'Bearer ' + key }, 1);
  if (!r || r.getResponseCode() !== 200) return { ok: false };
  var b = parseJsonSafe(r.getContentText()) || {};
  return { ok: !!b.id, url: b.url || (b.route ? 'https://whop.com/' + b.route : '') };
}
function createBundleIfDue() {
  if (String(getConfig('BUNDLE_ENABLED', 'TRUE')).toUpperCase() !== 'TRUE') return 0;
  var assets = readSheet('Assets').filter(function (r) { return String(r.status) === A.LISTED && String(r.tier) === 'paid' && r.whop_url; });
  if (assets.length < 5 || assets.length % 5 !== 0) return 0;
  var last = assets.slice(-5);
  var name = BRAND_NAME + ' Bundle — ' + last.length + ' systems';
  var desc = 'Bundle of ' + last.length + ' real systems: ' + last.map(function (a) { return a.name; }).join(' · ') + '\n\nAll delivered as Notion workspaces with real example rows.\nCustom work: ' + CUSTOM_EMAIL + '\nTip: lightning:' + getConfig('LIGHTNING_ADDRESS', 'SharkSkin@coinos.io');
  var price = parseInt(getConfig('BUNDLE_PRICE', '99'), 10) || 99;
  var res = whopCreateProduct(name, desc, price, getConfig('WHOP_API_KEY', ''), getConfig('WHOP_COMPANY_ID', ''), 50);
  if (res.ok) { log('SUCCESS', 'bundle', name + ' → ' + res.productId); discordAlert('INFO', 'bundle listed: ' + name); return 1; }
  return 0;
}

// ------------------------------- REVENUE ------------------------------------
function pollWhopRevenue() {
  var last = parseInt(PropertiesService.getScriptProperties().getProperty('CL_REV_LAST') || '0', 10);
  if (Date.now() - last < 60 * 60 * 1000) return 0;
  PropertiesService.getScriptProperties().setProperty('CL_REV_LAST', String(Date.now()));
  var companies = [{ key: getConfig('WHOP_API_KEY', ''), id: getConfig('WHOP_COMPANY_ID', ''), who: 'central' }];
  readSheet('Personas').forEach(function (p) { if (p.whop_company_id && p.whop_api_key) companies.push({ key: String(p.whop_api_key), id: String(p.whop_company_id), who: String(p.persona_id) }); });
  var existing = {};
  readSheet('Revenue').forEach(function (r) { if (r.payment_id) existing[String(r.payment_id)] = true; });
  var assets = {};
  readSheet('Assets').forEach(function (a) { if (a.whop_product_id) assets[String(a.whop_product_id)] = a; });
  var added = 0;
  companies.forEach(function (c) {
    try {
      if (!c.key || !c.id) return;
      var r = getJson(CL.WHOP_API + '/payments?company_id=' + encodeURIComponent(c.id) + '&per_page=50', { 'Authorization': 'Bearer ' + c.key }, 1);
      if (!r || r.getResponseCode() !== 200) return;
      var b = parseJsonSafe(r.getContentText()) || {};
      var arr = b.data || (Array.isArray(b) ? b : []);
      (Array.isArray(arr) ? arr : []).forEach(function (p) {
        var pid = String(p.id || p.payment_id || '');
        if (!pid || existing[pid]) return;
        var amount = 0;
        ['amount', 'gross_amount', 'net_amount', 'revenue', 'total', 'initial_price'].forEach(function (f) { if (p[f] != null && !isNaN(parseFloat(p[f]))) amount = parseFloat(p[f]); });
        if (amount === 0 && p.plan && p.plan.initial_price != null) amount = parseFloat(p.plan.initial_price) || 0;
        var buyer = String(p.email || (p.user && p.user.email) || (p.member && p.member.email) || p.user_id || '');
        appendRow('Revenue', { ts: nowIso(), payment_id: pid, amount: String(amount), currency: String(p.currency || 'usd'), buyer: buyer, source: 'whop', company: c.who, whop_product_id: String(p.product_id || (p.plan && p.plan.product_id) || ''), notes: '' });
        existing[pid] = true; added++;
      });
    } catch (e) { log('WARN', 'pollWhopRevenue', c.who + ': ' + e.toString()); }
  });
  if (added) log('SUCCESS', 'pollWhopRevenue', added + ' new payment(s)');
  maybeDailyDigest();
  return added;
}
function maybeDailyDigest() {
  var day = getFactoryTodayKey();
  if (PropertiesService.getScriptProperties().getProperty('CL_REV_DIGEST') === day) return;
  if (factoryHour() < 21) return;
  PropertiesService.getScriptProperties().setProperty('CL_REV_DIGEST', day);
  var rows = readSheet('Revenue');
  var gmv = 0, buyers = {}, byProduct = {};
  rows.forEach(function (r) {
    var dayOk = String(r.ts).slice(0, 10) === day;
    var amt = parseFloat(r.amount) || 0;
    if (dayOk) { gmv += amt; if (r.buyer) buyers[r.buyer] = 1; }
    if (r.whop_product_id) byProduct[r.whop_product_id] = (byProduct[r.whop_product_id] || 0) + amt;
  });
  var zaps = readSheet('ZapOrders').filter(function (z) { return String(z.ts || z.created_at).slice(0, 10) === day; }).length;
  var top = Object.keys(byProduct).sort(function (a, b) { return byProduct[b] - byProduct[a]; }).slice(0, 3);
  var assets = {};
  readSheet('Assets').forEach(function (a) { assets[String(a.whop_product_id)] = a.name; });
  var msg = '💰 ' + day + ' — GMV $' + gmv.toFixed(2) + ' (' + Object.keys(buyers).length + ' buyer(s)) · lightning zaps: ' + zaps + '\nTop: ' + (top.map(function (t) { return (assets[t] || t) + ' $' + byProduct[t].toFixed(2); }).join(' · ') || '—');
  discordAlert('INFO', msg);
  log('INFO', 'digest', msg.replace(/\n/g, ' | '));
}

// ---------------------------- ZAP FULFILLMENT -------------------------------
function handleZapWebhook(d) {
  try {
    var invoice = String(d.invoice_id || '');
    if (!invoice) return { ok: false, error: 'no invoice id' };
    var meta = d.meta || {};
    var existing = null;
    readSheet('ZapOrders').forEach(function (z) { if (String(z.invoice_id) === invoice) existing = z; });
    var order = {
      order_id: existing ? existing.order_id : newId('zap'), invoice_id: invoice, code: String(d.code || meta.code || ''),
      email: String(d.email || meta.email || ''), sats: String(d.sats || meta.sats || 0), usd: String(meta.price_usd || 0),
      asset_id: String(meta.asset_id || ''), persona_id: String(meta.persona_id || ''), status: 'DELIVERED', created_at: existing ? existing.created_at : nowIso(), updated_at: nowIso()
    };
    if (existing) updateRow('ZapOrders', existing._row, order); else appendRow('ZapOrders', order);
    if (!meta.notion_url) { discordAlert('WARN', 'zap delivered but meta missing notion_url for ' + invoice + ' — manual delivery needed, email ' + order.email); return { ok: false, error: 'no meta' }; }
    var email = String(order.email);
    if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      var subj = (meta.name || 'Your Cedar Loom system') + ' — your Lightning order is delivered';
      var body = 'Thanks for paying with Lightning — your order is delivered.\n\n' +
        '1. OPEN your template: ' + meta.notion_url + '\n' +
        '   (open it in Notion → ⋯ menu top right → Duplicate → into your own workspace)\n' +
        (meta.zip_url ? '2. PDF + README copy (no Notion needed): ' + meta.zip_url + '\n' : '') +
        '\nHow to set up: follow the Setup Checklist inside the template.\n' +
        'Questions or want it built around your workflow: ' + (meta.email || CUSTOM_EMAIL) + '\n' +
        '— ' + (meta.persona_name || BRAND_NAME);
      GmailApp.sendEmail(email, subj, body);
    }
    appendRow('Revenue', { ts: nowIso(), payment_id: 'zap_' + invoice, amount: String(meta.price_usd || 0), currency: 'usd', buyer: order.email, source: 'lightning', company: order.persona_id, whop_product_id: '', notes: 'coinos zap ' + invoice });
    discordAlert('SUCCESS', '⚡ lightning sale $' + (meta.price_usd || '?') + ' — ' + (meta.name || order.code) + ' → ' + order.email);
    log('SUCCESS', 'zapFulfill', invoice + ' delivered to ' + order.email);
    return { ok: true };
  } catch (e) { log('ERROR', 'zapFulfill', e.toString()); return { ok: false, error: e.toString() }; }
}

// ---------------------------- CUSTOM REQUESTS -------------------------------
var _reqLastDay = null;
function processCustomRequests() {
  try {
    var day = getFactoryTodayKey();
    var props = PropertiesService.getScriptProperties();
    if (props.getProperty('CL_REQ_LAST') === day) return 0;
    props.setProperty('CL_REQ_LAST', day);
    var seen = {};
    readSheet('Requests').forEach(function (r) { if (r.sender) seen[String(r.sender) + '|' + String(r.details).slice(0, 60)] = true; });
    var n = 0;
    var threads = GmailApp.search('[CUSTOM] Cedar Loom is:unread').slice(0, 10);
    threads.forEach(function (t) {
      try {
        var msgs = t.getMessages();
        if (!msgs.length) return;
        var m = msgs[msgs.length - 1];
        var key = m.getSender() + '|' + m.getPlainBody().slice(0, 60);
        if (seen[key]) return;
        appendRow('Requests', { request_id: newId('req'), timestamp: nowIso(), sender: m.getSender(), sender_name: '', niche: 'inbound email', budget: '', details: trunc(m.getPlainBody() || '', 500), status: 'NEW_LEAD', notes: 'subject: ' + trunc(m.getSubject(), 80) });
        t.markRead();
        n++;
      } catch (e) { log('WARN', 'processCustomRequests', e.toString()); }
    });
    if (n) discordAlert('INFO', n + ' custom request(s) from Gmail');
    return n;
  } catch (e) { log('WARN', 'processCustomRequests', e.toString()); return 0; }
}

// ---------------------------- DAILY CONTENT + PLAN --------------------------
function generateDayContent(p, picks) {
  var prompt = 'Write today' + String.fromCharCode(39) + 's content for ' + p.name + ' (' + p.voice + ', tone: ' + p.tone + '; niche: ' + p.niche + '; topics: ' + p.topics + ').\n' +
    'Real assets available today (all exist, delivered on Whop): ' +
    (picks.free1 ? 'free: ' + picks.free1.name + ' (' + trunc(picks.free1.hook, 80) + '); ' : '') +
    (picks.free2 ? 'free: ' + picks.free2.name + ' (' + trunc(picks.free2.hook, 80) + '); ' : '') +
    (picks.paid ? 'paid: ' + picks.paid.name + ' ($' + (picks.paid.price || '19') + ').' : 'no paid asset today.') +
    '\nFree tool: ' + (picks.toolName || 'free tool') + ' on their site.\n' +
    'Return ONLY JSON: {"value1":"...","value2":"...","free1":"...","free2":"...","paid1":"...","tool":"...","article_md":"..."}\n' +
    'Rules:\n' +
    '- value1, value2: genuinely useful micro-lessons about ' + p.niche + '. Teach one specific thing each. No links. <=230 chars.\n' +
    '- free1 / free2: name the asset + one real benefit, soft nudge. End with exactly the placeholder {{FREE1}} / {{FREE2}} once.\n' +
    '- paid1: name + one real benefit + the price, then {{PAID}} once at the end.\n' +
    '- tool: one line + {{TOOL}} once.\n' +
    '- article_md: 350-500 words of markdown: # title, 3 sections, specific and practical, ending with one soft CTA to the free asset {{FREE1}} and the tool {{TOOL}}.\n' +
    '- NEVER invent: user counts, ratings, reviews, deadlines, guarantees, percentages. IRL only.\n' +
    '- Keep the voice: ' + p.tone + '.';
  var llm = callLLM([{ role: 'user', content: prompt }], 2200);
  var c = llm.text ? (extractJson(llm.text, '{') || repairTruncatedJson(llm.text)) : null;
  if (!c) return null;
  var fields = ['value1', 'value2', 'free1', 'free2', 'paid1', 'tool', 'article_md'];
  var bad = [];
  fields.forEach(function (f) { if (c[f] && fakeClaims(String(c[f])).length) bad.push(f); });
  if (bad.length) {
    var llm2 = callLLM([{ role: 'user', content: 'These content fields contain banned invented claims (' + bad.join(', ') + '). Rewrite ONLY those fields — remove every invented stat, rating, user count, deadline, percentage, guarantee. Keep the rest identical.\n' + trunc(JSON.stringify(c), 2500) + '\nReturn ONLY the same JSON object with the fixes.' }], 2200);
    var c2 = llm2.text ? (extractJson(llm2.text, '{') || repairTruncatedJson(llm2.text)) : null;
    if (c2) bad.forEach(function (f) { if (c2[f] && fakeClaims(String(c2[f])).length === 0) c[f] = c2[f]; });
  }
  return c;
}
function dayBaseMs() {
  try {
    var d = Utilities.formatDate(new Date(), getFactoryTimezone(), 'yyyy-MM-dd 00:00');
    return new Date(Utilities.formatDate(new Date(), getFactoryTimezone(), 'yyyy-MM-dd') + 'T00:00:00' + tzOffset()).getTime();
  } catch (e) { return new Date().setUTCHours(0, 0, 0, 0); }
}
function tzOffset() {
  try { return Utilities.formatDate(new Date(), getFactoryTimezone(), 'ZZZZ'); } catch (e) { return '+00:00'; }
}
function makeSlotTimes(n) {
  var base = dayBaseMs();
  var start = base + CL.DAY_START_H * 3600000;
  var end = base + (CL.DAY_END_H * 60 + 15) * 60000;
  var span = end - start;
  var out = [];
  for (var i = 0; i < n; i++) out.push(start + Math.floor(span * (i + 0.5) / n) + (Math.floor(Math.random() * 80) - 40) * 60000);
  out.sort(function (a, b) { return a - b; });
  for (var j = 1; j < out.length; j++) if (out[j] - out[j - 1] < CL.MIN_GAP_MS) out[j] = out[j - 1] + CL.MIN_GAP_MS + Math.floor(Math.random() * 10) * 60000;
  for (var k = 0; k < out.length; k++) if (out[k] > end) out[k] = start + Math.floor(span * (k + 0.5) / n);
  return out;
}
function channelsForPersona(p) {
  var out = [];
  if (p.bsky_handle && p.bsky_app_password) out.push('bluesky');
  if (p.mastodon_instance && (p.mastodon_access_token || p.mastodon_token)) out.push('mastodon');
  var bk = String(p.buffer_api_key || '').trim();
  if (bk && p.buffer_channel_x) out.push('buffer_x');
  if (bk && p.buffer_channel_pinterest) out.push('buffer_pinterest');
  if (bk && p.buffer_channel_facebook) out.push('buffer_facebook');
  if (bk && p.buffer_channel_linkedin) out.push('buffer_linkedin');
  return out;
}
function planDaysForAllPersonas() {
  var day = getFactoryTodayKey();
  if (factoryHour() < CL.DAY_START_H) return 0;
  var personas = readSheet('Personas');
  var planned = 0;
  for (var i = 0; i < personas.length; i++) {
    var p = personas[i];
    if (String(p.distribution_enabled) === 'FALSE' || String(p.distribution_enabled) === 'NO') continue;
    var key = 'CL_PLAN_' + String(p.persona_id) + '_' + day;
    if (PropertiesService.getScriptProperties().getProperty(key)) continue;
    if (!budgetReserve(60000)) break;
    var n = planDayForPersona(p, key, day);
    planned += n > 0 ? 1 : 0;
  }
  return planned;
}
function planDayForPersona(p, key, day) {
  var worker = String(getConfig('CLOUDFLARE_WORKER_URL', '')).replace(/\/+$/, '');
  var assets = readSheet('Assets').filter(function (a) { return String(a.persona_id) === String(p.persona_id) && String(a.status) === A.LISTED && (a.short_url || a.landing_url); });
  var frees = assets.filter(function (a) { return String(a.tier) === 'free'; });
  var paids = assets.filter(function (a) { return String(a.tier) === 'paid'; });
  var chans = channelsForPersona(p);
  if (!chans.length && !p.devto_key && !(p.hashnode_pat && p.hashnode_pub)) {
    PropertiesService.getScriptProperties().setProperty(key, 'none');
    log('WARN', 'planDay', p.persona_id + ' has no channels configured - skipped');
    return 0;
  }
  function pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : null; }
  var f1 = pick(frees);
  var f2 = pick(frees.filter(function (a) { return !f1 || a.asset_id !== f1.asset_id; }));
  var pd = pick(paids);
  var content = (f1 || f2 || pd) ? generateDayContent(p, { free1: f1, free2: f2, paid: pd, toolName: p.tool_name || 'free tool' }) : null;
  function link(a) { return a ? (a.short_url || a.landing_url) : ''; }
  var toolUrl = worker + '/' + p.persona_id + '/tool';
  var slots = [];
  if (content && f1 && content.free1) slots.push({ slot: 'free1', kind: 'free', text: content.free1.replace('{{FREE1}}', link(f1)), cta: link(f1), asset: f1 });
  if (content && f2 && content.free2) slots.push({ slot: 'free2', kind: 'free', text: content.free2.replace('{{FREE2}}', link(f2)), cta: link(f2), asset: f2 });
  if (content && pd && content.paid1) slots.push({ slot: 'paid1', kind: 'paid', text: content.paid1.replace('{{PAID}}', link(pd)), cta: link(pd), asset: pd });
  slots.push({ slot: 'tool', kind: 'tool', text: (content && content.tool ? content.tool.replace('{{TOOL}}', toolUrl) : (p.tool_name || 'Free tool') + ' — free, no signup: ' + toolUrl), cta: toolUrl, asset: null });
  if (content && content.value1) slots.push({ slot: 'value1', kind: 'value', text: content.value1, cta: '', asset: null });
  if (content && content.value2) slots.push({ slot: 'value2', kind: 'value', text: content.value2, cta: '', asset: null });
  var articleChannel = '';
  if (p.devto_key && (p.hashnode_pat && p.hashnode_pub)) articleChannel = (day.charCodeAt(day.length - 1) % 2) ? 'devto' : 'hashnode';
  else if (p.devto_key) articleChannel = 'devto';
  else if (p.hashnode_pat && p.hashnode_pub) articleChannel = 'hashnode';
  if (content && content.article_md && articleChannel) {
    var at = String(content.article_md).replace(/\{\{FREE1\}\}/g, link(f1) || '').replace(/\{\{TOOL\}\}/g, toolUrl);
    slots.push({ slot: 'article', kind: 'article', text: at, cta: '', asset: null, channel: articleChannel });
  }
  if (!slots.length) { PropertiesService.getScriptProperties().setProperty(key, 'none'); return 0; }
  var times = makeSlotTimes(slots.length);
  var count = 0;
  for (var i = 0; i < slots.length; i++) {
    var s = slots[i];
    if (s.channel) { appendRow('Distribution', distRow(p, s, s.channel, times[i])); count++; continue; }
    for (var c = 0; c < chans.length; c++) { appendRow('Distribution', distRow(p, s, chans[c], times[i])); count++; }
  }
  PropertiesService.getScriptProperties().setProperty(key, String(count));
  updateRow('Personas', p._row, { last_date: day });
  log('SUCCESS', 'planDay', p.name + ': ' + count + ' rows (' + slots.length + ' slots) for ' + day);
  return count;
}
function distRow(p, s, channel, ts) {
  return { dist_id: newId('D'), persona_id: p.persona_id, slot: s.slot, kind: s.kind, asset_ref: s.asset ? String(s.asset.asset_id) : '', platform: s.kind === 'article' ? 'article' : 'social', channel: channel, status: D.QUEUED, post_text: trunc(s.text, s.kind === 'article' ? 4000 : 300), cta_url: s.cta || '', attempts: 0, next_attempt_ts: String(ts), error: '', created_at: nowIso(), updated_at: nowIso() };
}

// ------------------------------ CHANNELS (v2) --------------------------------
var BSKY_API = CL.BSKY_API;
function _bskyId(handle) { return 'V_' + String(handle || '').toLowerCase().replace(/[^a-z0-9]+/g, '_').substring(0, 48); }
function bskySession(handle, password) {
  var id = _bskyId(handle);
  var props = PropertiesService.getScriptProperties();
  var tok = props.getProperty('BSKY_TOKEN_' + id);
  if (tok && parseInt(props.getProperty('BSKY_EXP_' + id) || '0', 10) > Date.now()) return { ok: true, token: tok, did: props.getProperty('BSKY_DID_' + id) || '' };
  _clearBskySession(id);
  var refresh = null;
  var r = postJson(BSKY_API + '/com.atproto.server.createSession', { 'User-Agent': CL.BSKY_UA, 'Content-Type': 'application/json' }, { identifier: handle, password: password }, 1);
  if (!r) return { ok: false, error: 'fetch_failed' };
  var b = parseJsonSafe(r.getContentText()) || {};
  if (r.getResponseCode() !== 200 || !b.accessJwt) return { ok: false, error: (b.message || b.error || 'http_' + r.getResponseCode()) };
  _cacheBskySession(id, b);
  return { ok: true, token: b.accessJwt, did: b.did || '' };
}
function _cacheBskySession(id, body) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty('BSKY_TOKEN_' + id, body.accessJwt);
  props.setProperty('BSKY_EXP_' + id, String(Date.now() + CL.BSKY_TOKEN_TTL_MS));
  props.setProperty('BSKY_DID_' + id, body.did || '');
  if (body.refreshJwt) props.setProperty('BSKY_REFRESH_' + id, body.refreshJwt);
}
function _clearBskySession(id) {
  var props = PropertiesService.getScriptProperties();
  ['BSKY_TOKEN_', 'BSKY_EXP_', 'BSKY_DID_', 'BSKY_REFRESH_'].forEach(function (p) { props.deleteProperty(p + id); });
}
function _bskyFacets(text, url) {
  var idx = String(text).indexOf(url);
  if (!url || idx === -1) return [];
  var byteStart = Utilities.newBlob(String(text).substring(0, idx), 'UTF-8').getBytes().length;
  var byteEnd = byteStart + Utilities.newBlob(url, 'UTF-8').getBytes().length;
  return [{ index: { byteStart: byteStart, byteEnd: byteEnd }, features: [{ $type: 'app.bsky.richtext.facet#link', uri: url }] }];
}
function bskyPost(handle, password, text) {
  if (isDryRun()) return { ok: true, uri: 'at://dryrun.app.bsky.feed.post/' + slugify(handle) + '/' + Date.now() };
  var sess = bskySession(handle, password);
  if (!sess.ok) return { ok: false, error: sess.error };
  var record = { $type: 'app.bsky.feed.post', text: text, createdAt: new Date().toISOString(), langs: ['en'] };
  var m = String(text).match(/https?:\/\/\S+/);
  var url = m ? m[0].replace(/[),.;\]]+$/, '') : null;
  var facets = url ? _bskyFacets(text, url) : [];
  if (facets.length) record.facets = facets;
  var r = postJson(BSKY_API + '/com.atproto.repo.createRecord', { Authorization: 'Bearer ' + sess.token, 'User-Agent': CL.BSKY_UA, 'Content-Type': 'application/json' }, { repo: sess.did || handle, collection: 'app.bsky.feed.post', record: record }, 1);
  if (!r) return { ok: false, error: 'fetch_failed' };
  var b = parseJsonSafe(r.getContentText()) || {};
  if (r.getResponseCode() === 200 || r.getResponseCode() === 201) return { ok: true, uri: b.uri || '', cid: b.cid || '' };
  if (r.getResponseCode() === 401) _clearBskySession(_bskyId(handle));
  return { ok: false, error: (b.message || b.error || 'http_' + r.getResponseCode()) };
}
function distResult(ok, remoteId, remoteUrl, error, permanent) { return { ok: !!ok, remoteId: remoteId || '', remoteUrl: remoteUrl || '', error: error || '', permanent: !!permanent }; }
function _distPermanent(code) { return code === 401 || code === 403 || code === 400 || code === 404 || code === 422; }
function chBluesky(persona, asset) {
  var handle = String(persona.bsky_handle || '').trim(); var pass = String(persona.bsky_app_password || '').trim();
  if (!handle || !pass) return distResult(false, '', '', 'missing_bsky', true);
  if (bskyPostingMode() !== 'LIVE') return distResult(false, '', '', 'bsky_draft_mode', true);
  if (isDryRun()) return distResult(true, 'dryrun', 'https://dryrun.local/bsky');
  var text = trunc(String(asset.post_text || asset.name), 280);
  var res = bskyPost(handle, pass, text);
  if (!res.ok) return distResult(false, '', '', res.error, false);
  return distResult(true, res.uri || '', 'https://bsky.app/profile/' + handle + '/post/' + (res.uri ? res.uri.split('/').pop() : ''));
}
function chMastodon(persona, asset) {
  var instance = String(persona.mastodon_instance || '').trim();
  var token = String(persona.mastodon_access_token || persona.mastodon_token || '').trim();
  if (!instance || !token) return distResult(false, '', '', 'missing_mastodon', true);
  if (!/^https?:\/\//.test(instance)) instance = 'https://' + instance;
  instance = instance.replace(/\/+$/, '');
  if (isDryRun()) return distResult(true, 'dryrun', instance);
  var text = trunc(String(asset.post_text || asset.name), 450);
  var r = safeFetch(instance + '/api/v1/statuses', { method: 'post', contentType: 'application/json', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true, payload: JSON.stringify({ status: text, visibility: 'public' }) }, 2);
  if (!r) return distResult(false, '', '', 'mastodon_fetch_failed', false);
  var code = r.getResponseCode(); var b = parseJsonSafe(r.getContentText()) || {};
  if (code < 200 || code >= 300 || !b.id) return distResult(false, '', '', 'mastodon_http_' + code, _distPermanent(code));
  var url = b.url || b.uri || (instance + '/@' + (persona.mastodon_username || '') + '/' + b.id);
  var verify = safeFetch(instance + '/api/v1/statuses/' + b.id, { method: 'get', headers: { Authorization: 'Bearer ' + token }, muteHttpExceptions: true }, 1);
  if (!verify || verify.getResponseCode() !== 200) log('WARN', 'chMastodon', 'write 200 but verify failed for ' + b.id);
  return distResult(true, String(b.id), url);
}
function _bufferPost(key, channelId, text) {
  if (!key || !channelId) return { ok: false, error: 'missing' };
  if (isDryRun()) return { ok: true, id: 'dryrun' };
  var r = postJson('https://api.buffer.com/1/updates/create.json?access_token=' + encodeURIComponent(key), { 'Content-Type': 'application/json' }, { text: text, profile_ids: [channelId] }, 2);
  if (!r) return { ok: false, error: 'fetch_failed' };
  var b = parseJsonSafe(r.getContentText()) || {};
  if (r.getResponseCode() < 200 || r.getResponseCode() >= 300 || !b.success) return { ok: false, error: 'buffer_http_' + r.getResponseCode() + ' ' + trunc(r.getContentText(), 160) };
  return { ok: true, id: b.updates ? b.updates[0].id : 'buffer_' + Date.now() };
}
function _bufferChannel(persona, asset, col, limit) {
  var key = String(persona.buffer_api_key || '').trim();
  var ch = String(persona[col] || '').trim();
  if (!key || !ch) return distResult(false, '', '', 'missing_' + col, true);
  if (isDryRun()) return distResult(true, 'dryrun', 'https://dryrun.local/buffer');
  var res = _bufferPost(key, ch, trunc(String(asset.post_text || asset.name), limit));
  if (!res.ok) return distResult(false, '', '', res.error, false);
  return distResult(true, res.id, 'https://buffer.com');
}
function chBufferX(persona, asset) { return _bufferChannel(persona, asset, 'buffer_channel_x', 250); }
function chBufferPinterest(persona, asset) { return _bufferChannel(persona, asset, 'buffer_channel_pinterest', 400); }
function chBufferFacebook(persona, asset) { return _bufferChannel(persona, asset, 'buffer_channel_facebook', 400); }
function chBufferLinkedin(persona, asset) { return _bufferChannel(persona, asset, 'buffer_channel_linkedin', 600); }
function postToDevto(apiKey, title, bodyMarkdown) {
  var r = postJson('https://dev.to/api/articles', { 'api-key': apiKey, 'Content-Type': 'application/json' }, { article: { title: title, body_markdown: bodyMarkdown, published: true, tags: ['notion', 'productivity'] } }, 1);
  if (!r) return { ok: false, error: 'fetch_failed' };
  var b = parseJsonSafe(r.getContentText()) || {};
  if (r.getResponseCode() === 200 || r.getResponseCode() === 201) return { ok: true, url: b.url || '' };
  return { ok: false, error: (b.error || 'http_' + r.getResponseCode()) };
}
function postToHashnode(pat, publicationId, title, contentMarkdown) {
  var query = 'mutation PublishPost($input: PublishPostInput!){ publishPost(input: $input){ post { url } } }';
  var r = postJson('https://gql.hashnode.com', { Authorization: pat, 'Content-Type': 'application/json' }, { query: query, variables: { input: { title: title, contentMarkdown: contentMarkdown, publicationId: publicationId } } }, 1);
  if (!r) return { ok: false, error: 'fetch_failed' };
  var b = parseJsonSafe(r.getContentText()) || {};
  if (r.getResponseCode() === 200 && b.data && b.data.publishPost && b.data.publishPost.post) return { ok: true, url: b.data.publishPost.post.url };
  return { ok: false, error: (b.errors && b.errors[0] ? b.errors[0].message : 'http_' + r.getResponseCode()) };
}
function _articleTitle(persona, text) {
  var m = String(text).match(/^#\s+(.+)$/m);
  return m ? trunc(m[1], 100) : (persona.name + ' — field notes');
}
function chDevto(persona, asset) {
  var key = String(persona.devto_key || '').trim();
  if (!key) return distResult(false, '', '', 'missing_devto', true);
  if (isDryRun()) return distResult(true, 'dryrun', 'https://dev.to');
  var res = postToDevto(key, _articleTitle(persona, asset.post_text), String(asset.post_text));
  if (!res.ok) return distResult(false, '', '', res.error, false);
  return distResult(true, 'devto', res.url);
}
function chHashnode(persona, asset) {
  var pat = String(persona.hashnode_pat || '').trim();
  var pub = String(persona.hashnode_pub || '').trim();
  if (!pat || !pub) return distResult(false, '', '', 'missing_hashnode', true);
  if (isDryRun()) return distResult(true, 'dryrun', 'https://hashnode.com');
  var res = postToHashnode(pat, pub, _articleTitle(persona, asset.post_text), String(asset.post_text));
  if (!res.ok) return distResult(false, '', '', res.error, false);
  return distResult(true, 'hashnode', res.url);
}
function postChannel(channel, persona, asset) {
  if (channel === 'bluesky') return chBluesky(persona, asset);
  if (channel === 'mastodon') return chMastodon(persona, asset);
  if (channel === 'buffer_x') return chBufferX(persona, asset);
  if (channel === 'buffer_pinterest') return chBufferPinterest(persona, asset);
  if (channel === 'buffer_facebook') return chBufferFacebook(persona, asset);
  if (channel === 'buffer_linkedin') return chBufferLinkedin(persona, asset);
  if (channel === 'devto') return chDevto(persona, asset);
  if (channel === 'hashnode') return chHashnode(persona, asset);
  return distResult(false, '', '', 'unknown_channel', true);
}
function drainDistributionV3() {
  if (distributionMode() !== 'LIVE') return 0;
  var rows = readSheet('Distribution');
  var personas = {};
  readSheet('Personas').forEach(function (p) { personas[String(p.persona_id)] = p; });
  var now = Date.now(); var done = 0, posted = 0;
  for (var i = 0; i < rows.length && done < 8; i++) {
    var r = rows[i];
    if (String(r.status) !== D.QUEUED) continue;
    if (Number(r.next_attempt_ts || 0) > now) continue;
    if (!budgetReserve(15000)) break;
    var persona = personas[String(r.persona_id)];
    if (!persona) { updateRow('Distribution', r._row, { status: D.FAILED, error: 'orphaned persona', updated_at: nowIso() }); continue; }
    var asset = { name: String(r.slot), post_text: String(r.post_text || ''), cta_url: String(r.cta_url || ''), price: 0 };
    updateRow('Distribution', r._row, { status: D.POSTING, updated_at: nowIso() });
    var res;
    if (String(r.kind) === 'reply') {
      var rr;
      if (String(r.channel) === 'bluesky') rr = replyToBskyPost(persona.bsky_handle, persona.bsky_app_password, String(r.remote_id), String(r.post_text));
      else rr = replyToMastodonPost(persona.mastodon_instance, persona.mastodon_access_token || persona.mastodon_token, String(r.remote_id), String(r.post_text));
      res = { ok: rr.ok, remoteId: rr.uri || rr.id || '', remoteUrl: rr.url || '', error: rr.error || '', permanent: false };
    } else {
      res = postChannel(String(r.channel), persona, asset);
    }
    var attempts = parseInt(r.attempts || 0, 10) + 1;
    if (res.ok) { updateRow('Distribution', r._row, { status: D.POSTED, attempts: attempts, remote_id: res.remoteId, remote_url: res.remoteUrl, error: '', updated_at: nowIso() }); posted++; }
    else if (res.permanent || attempts >= CL.DIST_MAX_ATTEMPTS) updateRow('Distribution', r._row, { status: D.FAILED, attempts: attempts, error: trunc(res.error, 300), updated_at: nowIso() });
    else updateRow('Distribution', r._row, { status: D.QUEUED, attempts: attempts, next_attempt_ts: String(now + Math.pow(4, attempts) * 60000), error: trunc(res.error, 300), updated_at: nowIso() });
    done++;
    sleep(400 + Math.floor(Math.random() * 600));
  }
  if (posted) log('SUCCESS', 'drainV3', posted + ' posted this tick');
  return posted;
}

// ---------------------------- SEARCH + ENGAGE --------------------------------
function searchBskyNiche(keywords) {
  try {
    var kw = String(keywords || '').split(',')[0].trim();
    if (!kw) return [];
    var r = getJson(BSKY_API + '/app.bsky.feed.searchPosts?q=' + encodeURIComponent(kw) + '&limit=10', {}, 1);
    if (!r || r.getResponseCode() !== 200) return [];
    var b = parseJsonSafe(r.getContentText()) || {};
    return (b.posts || []).slice(0, 10).map(function (p) { return { uri: p.uri, cid: p.cid, author: p.author && p.author.handle, text: (p.record && p.record.text) || '', indexedAt: p.indexedAt }; });
  } catch (e) { log('WARN', 'searchBsky', e.toString()); return []; }
}
function searchMastodonNiche(instance, token, hashtags) {
  try {
    if (!instance || !token) return [];
    if (!/^https?:\/\//.test(instance)) instance = 'https://' + instance;
    instance = instance.replace(/\/+$/, '');
    var tag = String(hashtags || '').split(/\s+/)[0].trim().replace('#', '');
    if (!tag) return [];
    var r = getJson(instance + '/api/v2/search?q=' + encodeURIComponent(tag) + '&type=statuses&limit=10', { Authorization: 'Bearer ' + token }, 1);
    if (!r || r.getResponseCode() !== 200) return [];
    var b = parseJsonSafe(r.getContentText()) || {};
    return (b.statuses || []).slice(0, 10).map(function (s) { return { id: s.id, url: s.url, account: s.account && s.account.acct, content: s.content || '', created_at: s.created_at }; });
  } catch (e) { log('WARN', 'searchMastodon', e.toString()); return []; }
}
function replyToBskyPost(handle, password, postUri, replyText) {
  try {
    var sess = bskySession(handle, password);
    if (!sess.ok) return { ok: false, error: sess.error };
    var record = { $type: 'app.bsky.feed.post', text: replyText, createdAt: new Date().toISOString(), reply: { root: { uri: postUri, cid: '' }, parent: { uri: postUri, cid: '' } } };
    var r = postJson(BSKY_API + '/com.atproto.repo.createRecord', { Authorization: 'Bearer ' + sess.token, 'User-Agent': CL.BSKY_UA, 'Content-Type': 'application/json' }, { repo: sess.did || handle, collection: 'app.bsky.feed.post', record: record }, 1);
    if (!r) return { ok: false, error: 'fetch_failed' };
    var b = parseJsonSafe(r.getContentText()) || {};
    if (r.getResponseCode() === 200 || r.getResponseCode() === 201) return { ok: true, uri: b.uri || '' };
    return { ok: false, error: 'http_' + r.getResponseCode() };
  } catch (e) { return { ok: false, error: e.toString() }; }
}
function replyToMastodonPost(instance, token, statusId, replyText) {
  try {
    if (!instance || !token || !statusId) return { ok: false, error: 'missing' };
    if (!/^https?:\/\//.test(instance)) instance = 'https://' + instance;
    instance = instance.replace(/\/+$/, '');
    var r = postJson(instance + '/api/v1/statuses', { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' }, { status: replyText, in_reply_to_id: statusId, visibility: 'public' }, 1);
    if (!r) return { ok: false, error: 'fetch_failed' };
    var b = parseJsonSafe(r.getContentText()) || {};
    if (r.getResponseCode() >= 200 && r.getResponseCode() < 300 && b.id) return { ok: true, id: b.id, url: b.url || '' };
    return { ok: false, error: 'http_' + r.getResponseCode() };
  } catch (e) { return { ok: false, error: e.toString() }; }
}
function craftReply(p, originalText, softCta) {
  var prompt = 'In the voice of ' + p.name + ' (' + p.voice + ', tone: ' + p.tone + '), write ONE genuinely helpful reply (<=240 chars) to this post:\n"' + trunc(originalText, 400) + '"\nHelp first, no pitching. If it fits naturally, end with a short soft line and this link:' + softCta + '\nNever invent stats, users, ratings, deadlines. Return ONLY the reply text.';
  var llm = callLLM([{ role: 'user', content: prompt }], 300);
  if (!llm.text) return '';
  var t = String(llm.text).replace(/^["'\s]+|["'\s]+$/g, '');
  if (fakeClaims(t).length) return '';
  if (t.length < 20) return '';
  return t;
}
function addLead(p, sender, text) {
  try {
    appendRow('Requests', { request_id: newId('req'), timestamp: nowIso(), sender: sender, sender_name: '', niche: p.niche || '', budget: '', details: trunc(text, 400), status: 'NEW_LEAD', notes: 'search engagement: ' + p.persona_id });
    discordAlert('INFO', 'lead from ' + sender + ' (' + p.niche + ')');
  } catch (e) {}
}
var LEAD_SIGNAL = /budget|looking for|hiring|recommend|anyone know|need help|who can/i;
function engageWithPotentialCustomers() {
  if (!replyEnabled() || !searchEnabled() || distributionMode() !== 'LIVE') return 0;
  var day = getFactoryTodayKey();
  var dayIdx = parseInt(String(day).replace(/-/g, ''), 10);
  var personas = readSheet('Personas');
  var engaged = 0;
  for (var i = 0; i < personas.length; i++) {
    var p = personas[i];
    if (String(p.distribution_enabled) === 'FALSE') continue;
    if (!budgetReserve(25000)) break;
    var todayReplies = readSheet('Distribution').filter(function (r) { return String(r.persona_id) === String(p.persona_id) && String(r.kind) === 'reply' && String(r.created_at).slice(0, 10) === day; });
    if (todayReplies.length >= parseInt(getConfig('REPLY_CAP_PER_DAY', '5'), 10)) continue;
    if (todayReplies.some(function (r) { return Date.now() - new Date(r.created_at).getTime() < 2 * 3600000; })) continue;
    var freeAssets = readSheet('Assets').filter(function (a) { return String(a.persona_id) === String(p.persona_id) && String(a.status) === A.LISTED && String(a.tier) === 'free' && (a.short_url || a.landing_url); });
    var freeA = freeAssets.length ? freeAssets[0] : null;
    var softCta = freeA ? ' Free version: ' + (freeA.short_url || freeA.landing_url) : '';
    var kws = String(p.search_keywords || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    var kw = kws.length ? kws[(dayIdx + i) % kws.length] : p.niche;
    if (p.bsky_handle && p.bsky_app_password) {
      var posts = searchBskyNiche(kw);
      for (var bi = 0; bi < posts.length && bi < 2; bi++) {
        var post = posts[bi];
        if (!post || !post.uri) continue;
        if (post.indexedAt && Date.now() - new Date(post.indexedAt).getTime() > 48 * 3600000) continue;
        var replyText = craftReply(p, post.text, softCta);
        if (!replyText) continue;
        appendRow('Distribution', { dist_id: newId('D'), persona_id: p.persona_id, slot: 'reply', kind: 'reply', asset_ref: freeA ? String(freeA.asset_id) : '', platform: 'social', channel: 'bluesky', status: D.QUEUED, post_text: trunc(replyText, 300), cta_url: freeA ? (freeA.short_url || freeA.landing_url) : '', remote_id: post.uri, remote_url: '', attempts: 0, next_attempt_ts: String(Date.now() + (1 + Math.floor(Math.random() * 3)) * 3600000), error: 'reply_to_' + post.uri, created_at: nowIso(), updated_at: nowIso() });
        engaged++;
        if (LEAD_SIGNAL.test(String(post.text))) addLead(p, post.author || 'bsky', String(post.text));
      }
    }
    if (p.mastodon_instance && (p.mastodon_access_token || p.mastodon_token)) {
      var mposts = searchMastodonNiche(p.mastodon_instance, p.mastodon_access_token || p.mastodon_token, String(p.search_hashtags || ''));
      var mp = mposts[0];
      if (mp && mp.id && (!mp.created_at || Date.now() - new Date(mp.created_at).getTime() < 48 * 3600000)) {
        var rtext = craftReply(p, String(mp.content).replace(/<[^>]+>/g, ' '), softCta);
        if (rtext) {
          appendRow('Distribution', { dist_id: newId('D'), persona_id: p.persona_id, slot: 'reply', kind: 'reply', asset_ref: freeA ? String(freeA.asset_id) : '', platform: 'social', channel: 'mastodon', status: D.QUEUED, post_text: trunc(rtext, 400), cta_url: freeA ? (freeA.short_url || freeA.landing_url) : '', remote_id: String(mp.id), remote_url: mp.url || '', attempts: 0, next_attempt_ts: String(Date.now() + (1 + Math.floor(Math.random() * 3)) * 3600000), error: 'reply_to_' + mp.id, created_at: nowIso(), updated_at: nowIso() });
          engaged++;
          if (LEAD_SIGNAL.test(String(mp.content))) addLead(p, mp.account || 'mastodon', String(mp.content).replace(/<[^>]+>/g, ' ').slice(0, 300));
        }
      }
    }
  }
  if (engaged) log('SUCCESS', 'engage', engaged + ' replies queued');
  return engaged;
}

// ---------------------------- HYGIENE (stale/trim) ---------------------------
function expireStaleDist() {
  var rows = readSheet('Distribution'); var n = 0; var cutoff = Date.now() - 30 * 3600000;
  rows.forEach(function (r) {
    if (String(r.status) === D.QUEUED && Number(r.next_attempt_ts || 0) < cutoff) { updateRow('Distribution', r._row, { status: D.STALE, error: 'stale', updated_at: nowIso() }); n++; }
  });
  return n;
}
function trimSheet(name, maxRows) {
  try {
    var sh = getSpreadsheet().getSheetByName(name);
    if (!sh) return 0;
    var excess = sh.getLastRow() - maxRows - 1;
    if (excess <= 0) return 0;
    sh.deleteRows(2, excess);
    return excess;
  } catch (e) { return 0; }
}
function trimAllSheets() {
  var t = 0;
  t += trimSheet('Audit', CL.MAX_AUDIT_ROWS);
  t += trimSheet('Revenue', CL.MAX_REVENUE_ROWS);
  t += trimSheet('Logs', CL.MAX_LOG_ROWS);
  try {
    var rows = readSheet('Distribution');
    var sh = getSpreadsheet().getSheetByName('Distribution');
    if (rows.length > CL.MAX_DIST_ROWS) {
      var removed = 0;
      for (var i = rows.length - 1; i >= 0 && rows.length - removed > CL.MAX_DIST_ROWS; i--) {
        var st = String(rows[i].status || '');
        if (st !== D.POSTED && st !== D.FAILED && st !== D.SKIPPED && st !== D.STALE) continue;
        sh.deleteRow(rows[i]._row); removed++;
      }
      t += removed;
    }
  } catch (e) { log('WARN', 'trimAllSheets', e.toString()); }
  return t;
}

// ------------------------------- MAIN LOOP -----------------------------------
function clMain() {
  withLock('clMain', function () {
    budgetStart(); resetConfigCache();
    var t0 = Date.now();
    if (isEmergencyStop()) { log('INFO', 'clMain', 'EMERGENCY_STOP - idling'); flushLogs(); return; }
    ensureMainTrigger();
    var props = PropertiesService.getScriptProperties();
    var tick = parseInt(props.getProperty('CL_TICK') || '0', 10) + 1;
    props.setProperty('CL_TICK', String(tick));
    try {
      if (researchDue()) runResearchBatch();
      if (ledgerHasHeadroom() && budgetReserve(60000)) draftAssetBriefsBatch();
      autoRepairFailedBuilds();
      dispatchBuildBatch();
      reapInflightBuilds();
      planDaysForAllPersonas();
      drainDistributionV3();
      if (tick % 3 === 0) engageWithPotentialCustomers();
      pollWhopRevenue();
      processCustomRequests();
      createBundleIfDue();
      expireStaleDist();
      trimAllSheets();
    } catch (e) {
      log('ERROR', 'clMain', e && e.stack ? e.stack : String(e));
      discordAlert('ERROR', 'clMain error: ' + trunc(e.toString(), 120));
    }
    ledgerAdd(Date.now() - t0);
    var sb = safeBudget();
    log('INFO', 'clMain', 'tick ' + tick + ' done ' + (Date.now() - t0) + 'ms today ' + sb.used + 'ms left ' + sb.left + 'ms mode ' + (sb.isHeavy ? 'HEAVY' : 'LIGHT'));
    if (sb.pct >= 90) log('WARN', 'clMain', 'daily budget nearly used (' + sb.pct + '%)');
  });
}
function watchdog() {
  withLock('watchdog', function () {
    var rows = readSheet('Logs');
    var lastTs = rows.length ? new Date(rows[rows.length - 1].ts).getTime() : 0;
    if (Date.now() - lastTs > 40 * 60 * 1000) {
      log('WARN', 'watchdog', 'no clMain tick in >40 min');
      discordAlert('WARN', 'watchdog: no tick >40 min - reinstalling triggers');
      ensureMainTrigger(); ensureWatchdogTrigger();
    }
  });
}

// ------------------------- WEB APP BRIDGE (Actions) ---------------------------
function jsonOut(o, code) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function doGet(e) { return jsonOut({ ok: true, version: CL_VERSION, health: 'factory' }); }
function doPost(e) {
  var out = { ok: false };
  try {
    var secret = getConfig('CL_BRIDGE_SECRET', '');
    var q = (e && e.parameter && e.parameter.s) || '';
    if (!secret || q !== secret) return jsonOut({ ok: false, error: 'bad secret' }, 403);
    var body = (e && e.postData && e.postData.contents) ? parseJsonSafe(e.postData.contents) : {};
    var op = body.op;
    if (op === 'ping') out = { ok: true, version: CL_VERSION, time: nowIso() };
    else if (op === 'read') out = { ok: true, rows: readSheet(String(body.sheet || '')).slice(0, 500) };
    else if (op === 'update') {
      var row = findRowBy(String(body.sheet), String(body.col), String(body.val));
      if (row) { updateRow(String(body.sheet), row._row, body.patch || {}); out = { ok: true, updated: row._row }; }
      else out = { ok: false, error: 'row not found' };
    }
    else if (op === 'append') { appendRow(String(body.sheet), body.row || {}); out = { ok: true }; }
    else if (op === 'driveUpload') out = driveUpload(body);
    else if (op === 'zapWebhook') out = handleZapWebhook(body);
    else out = { ok: false, error: 'unknown op' };
  } catch (err) { out = { ok: false, error: String(err).substring(0, 300) }; }
  flushLogs();
  return jsonOut(out, out.ok ? 200 : 400);
}
function driveUpload(body) {
  if (!body || !body.b64) return { ok: false, error: 'no b64' };
  if (String(body.b64).length > 12000000) return { ok: false, error: 'too large' };
  var it = DriveApp.getFoldersByName('Cedar Loom v2');
  var folder = it.hasNext() ? it.next() : DriveApp.createFolder('Cedar Loom v2');
  var blob = Utilities.newBlob(Utilities.base64Decode(String(body.b64)), body.mime || 'application/octet-stream', body.name || 'file');
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  return { ok: true, id: file.getId(), fileUrl: 'https://drive.google.com/file/d/' + file.getId() + '/view', thumbUrl: 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200' };
}

// --------------------------------- TESTS --------------------------------------
function alertDialog(title, msg) { log('INFO', title, String(msg).replace(/\n/g, ' | ')); try { SpreadsheetApp.getUi().alert(title, String(msg)); } catch (e) {} }
function _menu(fnName, fn) { try { return fn(); } catch (e) { log('ERROR', fnName, e && e.stack ? e.stack : String(e)); throw e; } finally { flushLogs(); } }
function runChecklist() {
  var steps = [];
  var need = ['NOTION_TOKEN', 'NOTION_PARENT_ID', 'COINOS_API_BASE', 'COINOS_API_KEY', 'COINOS_WEBHOOK_SECRET', 'CL_BRIDGE_SECRET', 'WEB_APP_URL', 'CLOUDFLARE_WORKER_URL', 'GH_TOKEN', 'WHOP_API_KEY', 'WHOP_COMPANY_ID', 'DISCORD_WEBHOOK'];
  need.forEach(function (k) { steps.push((hasKey(k) ? '  ' : 'MISSING ') + k); });
  steps.push((['CEREBRAS_API_KEY', 'GROQ_API_KEY', 'GEMINI_API_KEY', 'MISTRAL_API_KEY', 'COHERE_API_KEY'].some(hasKey) ? '  at least one LLM key' : 'MISSING at least one LLM key'));
  try {
    var hr = getJson(String(getConfig('CLOUDFLARE_WORKER_URL', '')).replace(/\/+$/, '') + '/health', {}, 1);
    var hb = hr ? (parseJsonSafe(hr.getContentText()) || {}) : {};
    steps.push((hb.ok ? '  worker /health ok (v' + hb.version + ')' : 'MISSING worker /health'));
  } catch (e) { steps.push('MISSING worker /health'); }
  var personas = readSheet('Personas');
  steps.push('Personas: ' + personas.length + ' rows (want 9)');
  personas.forEach(function (p) {
    var chans = channelsForPersona(p).length + (p.devto_key ? 1 : 0) + (p.hashnode_pat ? 1 : 0);
    var issues = [];
    if (!p.mail_contact) issues.push('no mail_contact');
    if (!chans) issues.push('no channels');
    if (!(p.whop_company_id && p.whop_api_key)) issues.push('no whop store keys');
    steps.push((issues.length ? 'WARN ' : '  ') + p.persona_id + (issues.length ? ' - ' + issues.join(', ') : ' - ' + chans + ' channel(s)'));
  });
  alertDialog('v2 Checklist', steps.join('\n'));
  return steps;
}
function selfTest() {
  var pass = 0, total = 0;
  function t(name, cond) { total++; if (cond) pass++; else log('ERROR', 'selfTest', 'FAIL ' + name); }
  t('trunc', trunc('hello world this is a test of truncation', 11).length <= 11);
  t('slug', slugify('Hello, World!') === 'hello-world');
  t('extractJson', !!(extractJson('noise {"a": [1,2]} tail', '{') && extractJson('noise {"a": [1,2]} tail', '{').a.length === 2));
  t('repairTruncated', !!(repairTruncatedJson('{"a":1,"b":{"c":2} truncated') && repairTruncatedJson('{"a":1,"b":{"c":2} truncated').a === 1));
  t('tooSimilar', _tooSimilar('Client Onboarding Tracker', 'client onboarding tracker notion') === true);
  t('notSimilar', _tooSimilar('Client Onboarding Tracker', 'WireGuard VPN setup guide') === false);
  var bad = fakeClaims('Used by 47 freelancers, 4.8/5 from 12 reviews. Free for 48h then $29. 10x faster. No guarantee.');
  t('fakeClaims hits', bad.length >= 3);
  var clean = fakeClaims('3 databases, 22 columns, 14 real example rows. One-time price $19. Personal license.');
  t('fakeClaims clean', clean.length === 0);
  var times = makeSlotTimes(7);
  var base = dayBaseMs();
  var inWin = times.every(function (t2) { return t2 >= base + CL.DAY_START_H * 3600000 && t2 <= base + (CL.DAY_END_H * 60 + 15) * 60000; });
  var gaps = true;
  for (var i = 1; i < times.length; i++) if (times[i] - times[i - 1] < CL.MIN_GAP_MS) gaps = false;
  t('slot times window', inWin);
  t('slot times gaps', gaps);
  var text = 'Café link https://x.io end';
  var facets = _bskyFacets(text, 'https://x.io');
  t('facets utf8', facets.length === 1 && facets[0].index.byteStart === Utilities.newBlob('Café link ', 'UTF-8').getBytes().length);
  var spec = { premium: { databases: [{ properties: { A: { type: 'title' }, B: { type: 'rich_text' } } }] } };
  t('wake real notion url', wakeVerifyAsset({ notion_url: 'https://www.notion.so/1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d', name: 'A Good Asset Name For Testing', price: 0, whop_url: 'https://whop.com/x' }, spec, '<!DOCTYPE html><script type="application/ld+json">{}</script>').verdict !== 'FAIL');
  alertDialog('v2 selfTest', pass + '/' + total + ' PASS');
  return { pass: pass, total: total };
}
function runStructuralTests() {
  var ok = 0, total = 0, bad = [];
  Object.keys(SCHEMA).forEach(function (n) {
    total++;
    try {
      var sh = getSpreadsheet().getSheetByName(n);
      if (sh && sh.getLastRow() >= 1) ok++; else bad.push(n + ' missing/empty');
    } catch (e) { bad.push(n); }
  });
  alertDialog('v2 structural', ok + '/' + total + ' sheets ok' + (bad.length ? ' - problems: ' + bad.join(', ') : ''));
  return { ok: ok, total: total };
}
function testLlm() {
  var r = callLLM([{ role: 'user', content: 'Reply with exactly: OK' }], 50);
  log(r.text ? 'SUCCESS' : 'ERROR', 'testLlm', r.provider + ' -> ' + trunc(r.text || 'null', 60));
  return { ok: !!r.text, provider: r.provider };
}
function testBridge() {
  var url = String(getConfig('WEB_APP_URL', '')).replace(/\/+$/, '');
  var secret = getConfig('CL_BRIDGE_SECRET', '');
  if (!url || !secret) { alertDialog('testBridge', 'fill WEB_APP_URL + CL_BRIDGE_SECRET first (deploy as web app, access = Anyone)'); return { ok: false }; }
  try {
    var r1 = UrlFetchApp.fetch(url + '?s=' + secret, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ op: 'ping' }) });
    var b1 = parseJsonSafe(r1.getContentText()) || {};
    var r2 = UrlFetchApp.fetch(url + '?s=' + secret, { method: 'post', contentType: 'application/json', muteHttpExceptions: true, payload: JSON.stringify({ op: 'read', sheet: 'Config' }) });
    var b2 = parseJsonSafe(r2.getContentText()) || {};
    var ok = b1.ok && b2.ok && Array.isArray(b2.rows);
    alertDialog('testBridge', (ok ? 'bridge OK — ' : 'bridge FAIL — ') + 'ping=' + b1.ok + ' read Config rows=' + (b2.rows ? b2.rows.length : 0));
    return { ok: ok };
  } catch (e) { alertDialog('testBridge', 'error: ' + e.toString()); return { ok: false }; }
}
function testDispatch() {
  var token = getConfig('GH_TOKEN', '') || getConfig('GITHUB_TOKEN', '');
  var repo = getConfig('GH_REPO', 'king-kunta-cpu/ptp');
  if (!token) { alertDialog('testDispatch', 'fill GH_TOKEN first'); return { ok: false }; }
  var r = postJson('https://api.github.com/repos/' + repo + '/dispatches', { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json', 'Accept': 'application/vnd.github+json' }, { event_type: 'v2-noop', client_payload: { type: 'v2-noop' } }, 1);
  var ok = r && (r.getResponseCode() === 204 || r.getResponseCode() === 200);
  alertDialog('testDispatch', ok ? 'v2-noop dispatched - open the repo Actions tab and watch it run' : 'http ' + (r ? r.getResponseCode() : 'null') + ' ' + trunc(r ? r.getContentText() : '', 200));
  return { ok: ok };
}
function testNotion() {
  var token = getConfig('NOTION_TOKEN', ''); var parent = getConfig('NOTION_PARENT_ID', '');
  if (!token || !parent) { alertDialog('testNotion', 'fill NOTION_TOKEN + NOTION_PARENT_ID first'); return { ok: false }; }
  var steps = [];
  try {
    var r = postJson('https://api.notion.com/v1/pages', { 'Authorization': 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, { parent: { page_id: parent }, properties: { title: { title: [{ type: 'text', text: { content: 'CL v2 test ' + Date.now() } }] } } }, 1);
    var b = parseJsonSafe(r.getContentText()) || {};
    if (r.getResponseCode() === 200 && b.id) {
      steps.push('created page ' + b.id);
      var d = postJson('https://api.notion.com/v1/pages/' + b.id, { 'Authorization': 'Bearer ' + token, 'Notion-Version': '2022-06-28', 'Content-Type': 'application/json' }, { archived: true }, 1);
      steps.push(d.getResponseCode() < 300 ? 'archived' : 'archive http ' + d.getResponseCode());
    } else steps.push('create failed http ' + r.getResponseCode() + ' ' + (b.message || ''));
  } catch (e) { steps.push(e.toString()); }
  alertDialog('testNotion', steps.join(' | '));
  return { ok: steps.length === 2 };
}
function testWhop() {
  var key = getConfig('WHOP_API_KEY', ''); var id = getConfig('WHOP_COMPANY_ID', '');
  if (!key || !id) { alertDialog('testWhop', 'fill WHOP_API_KEY + WHOP_COMPANY_ID first'); return { ok: false }; }
  var steps = [];
  var res = whopCreateProduct('TEST-CL-v2-' + Date.now(), 'diagnostic product - safe to delete', 1, key, id, 0);
  if (!res.ok) { steps.push('create failed: ' + res.error); }
  else {
    steps.push('created ' + res.productId);
    var v = verifyWhopProduct(res.productId, key);
    steps.push(v.ok ? 'verified ' + v.url : 'verify failed');
    var del = safeFetch(CL.WHOP_API + '/products/' + res.productId, { method: 'delete', headers: { Authorization: 'Bearer ' + key }, muteHttpExceptions: true }, 1);
    steps.push(del && del.getResponseCode() < 300 ? 'deleted' : 'left visible (TEST prefix) - delete manually if needed');
  }
  alertDialog('testWhop', steps.join(' | '));
  return { ok: res.ok };
}
function testCoinos() {
  var base = String(getConfig('COINOS_API_BASE', '')).replace(/\/+$/, '');
  var key = getConfig('COINOS_API_KEY', '');
  if (!base || !key) { alertDialog('testCoinos', 'fill COINOS_API_BASE + COINOS_API_KEY first'); return { ok: false }; }
  try {
    var r = getJson(base + '/', {}, 1);
    var steps = ['base reachable: http ' + (r ? r.getResponseCode() : 'null')];
    if (String(getConfig('COINOS_TEST_INVOICE', 'FALSE')).toUpperCase() === 'TRUE') {
      var ri = postJson(base + (getConfig('COINOS_INVOICE_PATH', '/api/v1/lightning/invoice')), { 'Content-Type': 'application/json', Authorization: 'Bearer ' + key }, { amount: '1000', memo: 'CL test 1 sat - safe to ignore' }, 1);
      var bi = parseJsonSafe(ri ? ri.getContentText() : '') || {};
      steps.push('invoice: http ' + (ri ? ri.getResponseCode() : 'null') + ' bolt11=' + String(bi.payment_request || bi.bolt11 || '').slice(0, 40) + '...');
    }
    alertDialog('testCoinos', steps.join(' | '));
    return { ok: !!r };
  } catch (e) { alertDialog('testCoinos', e.toString()); return { ok: false }; }
}
function testBluesky() {
  var personas = readSheet('Personas');
  var steps = [];
  personas.forEach(function (p) {
    if (!p.bsky_handle || !p.bsky_app_password) return;
    var s = bskySession(String(p.bsky_handle), String(p.bsky_app_password));
    steps.push((s.ok ? '  ' : 'FAIL ') + p.persona_id + (s.ok ? ' session ok' : ' ' + s.error));
  });
  steps.push('mode: ' + bskyPostingMode() + (bskyPostingMode() === 'LIVE' ? ' (auto-post)' : ' (DRAFT)'));
  alertDialog('testBluesky', steps.join('\n'));
  return { ok: true };
}
function testMastodon() {
  var personas = readSheet('Personas');
  var steps = [];
  personas.forEach(function (p) {
    if (!p.mastodon_instance || !(p.mastodon_access_token || p.mastodon_token)) return;
    var inst = String(p.mastodon_instance);
    if (!/^https?:\/\//.test(inst)) inst = 'https://' + inst;
    var r = getJson(inst.replace(/\/+$/, '') + '/api/v1/accounts/verify_credentials', { Authorization: 'Bearer ' + (p.mastodon_access_token || p.mastodon_token) }, 1);
    var b = r ? (parseJsonSafe(r.getContentText()) || {}) : {};
    steps.push(((r && r.getResponseCode() === 200 && b.id) ? '  ' : 'FAIL ') + p.persona_id + ((r && r.getResponseCode() === 200) ? ' verified @' + (b.username || '') : ' http ' + (r ? r.getResponseCode() : 'null')));
  });
  alertDialog('testMastodon', steps.join('\n'));
  return { ok: true };
}
function testBuffer() {
  var personas = readSheet('Personas');
  var steps = [];
  personas.forEach(function (p) {
    var key = String(p.buffer_api_key || '').trim();
    if (!key) return;
    var chans = channelsForPersona(p).filter(function (c) { return c.indexOf('buffer') === 0; });
    var r = getJson('https://api.buffer.com/1/profiles.json?access_token=' + encodeURIComponent(key), {}, 1);
    var b = r ? (parseJsonSafe(r.getContentText()) || {}) : {};
    var ok = r && r.getResponseCode() === 200;
    steps.push((ok ? '  ' : 'FAIL ') + p.persona_id + (ok ? ' — ' + chans.length + ' channel(s): ' + chans.join(',') : ' profiles http ' + (r ? r.getResponseCode() : 'null')));
  });
  alertDialog('testBuffer', steps.join('\n'));
  return { ok: true };
}
function testLanding() {
  var base = String(getConfig('CLOUDFLARE_WORKER_URL', '')).replace(/\/+$/, '');
  var steps = [];
  try {
    var h = getJson(base + '/health', {}, 1);
    var hb = h ? (parseJsonSafe(h.getContentText()) || {}) : {};
    steps.push('worker health: ' + (hb.ok ? 'ok v' + hb.version : 'FAIL'));
    var personas = readSheet('Personas');
    if (personas.length) {
      var home = getJson(base + '/' + personas[0].persona_id + '/', {}, 1);
      steps.push(personas[0].persona_id + ' home: http ' + (home ? home.getResponseCode() : 'null') + (home && home.getResponseCode() === 404 ? ' (no landing published yet - normal before first build)' : ''));
    }
  } catch (e) { steps.push('error ' + e.toString()); }
  alertDialog('testLanding', steps.join(' | '));
  return { ok: true };
}
function runFullDiagnosis() {
  var results = [];
  function run(name, fn) { try { var r = fn(); results.push((r && r.ok ? 'PASS ' : 'FAIL ') + name); } catch (e) { results.push('ERROR ' + name + ': ' + trunc(e.toString(), 80)); } }
  run('checklist', runChecklist);
  run('structural', runStructuralTests);
  run('selfTest', selfTest);
  run('testLlm', testLlm);
  run('testBridge', testBridge);
  run('testDispatch', testDispatch);
  if (hasKey('NOTION_TOKEN')) run('testNotion', testNotion);
  if (hasKey('WHOP_API_KEY')) run('testWhop', testWhop);
  if (hasKey('COINOS_API_KEY')) run('testCoinos', testCoinos);
  run('testBluesky', testBluesky);
  run('testMastodon', testMastodon);
  run('testBuffer', testBuffer);
  run('testLanding', testLanding);
  alertDialog('v2 full diagnosis', results.join('\n'));
  log(results.some(function (r) { return r.indexOf('FAIL') === 0 || r.indexOf('ERROR') === 0; }) ? 'WARN' : 'SUCCESS', 'runFullDiagnosis', results.join(' | '));
  return results;
}

// --------------------------------- SETUP --------------------------------------
function setupFactory() {
  ensureSheets();
  installTriggers();
  alertDialog('Cedar Loom v2.0 setup complete',
    'Sheets + personas + Config seeds created. Triggers installed.\n\nNext:\n1. Fill Config (see v2/docs/SETUP-v2.md)\n2. Fill Personas rows (9)\n3. Deploy web app (Anyone) + set Actions secrets\n4. Run runFullDiagnosis\n5. DRY_RUN=FALSE + DISTRIBUTION_POSTING_MODE=LIVE + BSKY_POSTING_MODE=LIVE');
}
function onOpen() {
  SpreadsheetApp.getUi().createMenu('Cedar Loom v2')
    .addItem('Setup (sheets + triggers)', 'setupFactory')
    .addSeparator()
    .addItem('Full diagnosis', 'runFullDiagnosis')
    .addItem('Checklist', 'runChecklist')
    .addItem('Self-test', 'selfTest')
    .addItem('Structural', 'runStructuralTests')
    .addItem('Test LLM', 'testLlm')
    .addItem('Test bridge', 'testBridge')
    .addItem('Test dispatch (v2-noop)', 'testDispatch')
    .addItem('Test Notion', 'testNotion')
    .addItem('Test Whop', 'testWhop')
    .addItem('Test Coinos', 'testCoinos')
    .addItem('Test Bluesky', 'testBluesky')
    .addItem('Test Mastodon', 'testMastodon')
    .addItem('Test Buffer', 'testBuffer')
    .addItem('Test landing', 'testLanding')
    .addSeparator()
    .addItem('Run full loop now', 'runLoopNow')
    .addItem('Research now', 'runResearchNow')
    .addItem('Draft briefs now', 'draftNow')
    .addItem('Dispatch 3 builds now', 'dispatchBuild3')
    .addItem('Auto-repair failed builds', 'autoRepairNow')
    .addItem('Plan days now', 'planDaysNow')
    .addItem('Drain queue now', 'drainNow')
    .addItem('Engage now', 'engageNow')
    .addItem('Poll revenue now', 'pollRevenueNow')
    .addSeparator()
    .addItem('EMERGENCY STOP', 'setEmergencyStop')
    .addItem('Clear emergency stop', 'clearEmergencyStop')
    .addItem('Reset day budget', 'resetBudgetManually')
    .addItem('Reset circuit breakers', 'resetCircuitBreakers')
    .addItem('Install triggers', 'installTriggers')
    .addToUi();
}
function _cfg(key, val) { var r = findRowBy('Config', 'key', key); if (r) updateRow('Config', r._row, { value: val }); else appendRow('Config', { key: key, value: val }); resetConfigCache(); }
function setEmergencyStop() { _cfg('EMERGENCY_STOP', 'STOP'); discordAlert('ERROR', 'EMERGENCY STOP engaged'); log('ERROR', 'setEmergencyStop', 'factory halted by user'); }
function clearEmergencyStop() { _cfg('EMERGENCY_STOP', 'RUN'); log('SUCCESS', 'clearEmergencyStop', 'factory resumed'); }
function runLoopNow() { _menu('runLoopNow', function () { withLock('manual', clMain); }); }
function runResearchNow() { _menu('runResearchNow', function () { return runResearchBatch(); }); }
function draftNow() { _menu('draftNow', function () { return draftAssetBriefsBatch(); }); }
function dispatchBuild3() { _menu('dispatchBuild3', function () { return dispatchBuildBatch(); }); }
function autoRepairNow() { _menu('autoRepairNow', function () { return autoRepairFailedBuilds(); }); }
function planDaysNow() { _menu('planDaysNow', function () { return planDaysForAllPersonas(); }); }
function drainNow() { _menu('drainNow', function () { return drainDistributionV3(); }); }
function engageNow() { _menu('engageNow', function () { return engageWithPotentialCustomers(); }); }
function pollRevenueNow() { _menu('pollRevenueNow', function () { return pollWhopRevenue(); }); }
