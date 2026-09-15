// ============================================================================
// CEDAR LOOM v2.0 — GitHub Actions manufacturing job (heavy-build-v2)
// Op "build":  DRAFTED asset -> REAL Notion workspace (page+DBs+rows+dashboard)
//              -> public link -> PDF export + README zip -> Drive (via bridge)
//              -> screenshot -> Whop product (persona store) -> landing on worker
//              -> short link -> (paid) zap meta -> Assets row LISTED
// Op "video":  top-10 revenue assets -> ffmpeg slideshow (screenshots) -> Drive
//              mp4 -> Videos row -> landing re-published with embedded video
// Env: WEB_APP_URL, BRIDGE_SECRET, WORKER_URL, PAYLOAD (json asset_ids)
// ============================================================================
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const BRIDGE = process.env.WEB_APP_URL || '';
const SECRET = process.env.BRIDGE_SECRET || '';
const WORKER = (process.env.WORKER_URL || '').replace(/\/+$/, '');
const NOTION_API = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';
const WHOP_API = 'https://api.whop.com/api/v1';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const trunc = (s, n) => { s = String(s == null ? '' : s); return s.length <= n ? s : s.substring(0, n - 3) + '...'; };
const log = (...a) => console.log('[hb]', ...a);

async function bridge(op, payload = {}) {
  const r = await fetch(BRIDGE + '?s=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ op, ...payload }) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('bridge ' + op + ' http ' + r.status + ' ' + (b.error || '').slice(0, 200));
  return b;
}
async function wapi(pathname, payload) {
  const r = await fetch(WORKER + pathname + '?s=' + SECRET, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ s: SECRET, ...payload }) });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('worker ' + pathname + ' http ' + r.status + ' ' + (b.error || '').slice(0, 200));
  return b;
}
async function cfgMap() {
  const rows = await bridge('read', { sheet: 'Config' });
  const m = {}; rows.forEach((r) => { if (r.key) m[String(r.key).toUpperCase()] = String(r.value == null ? '' : r.value); });
  return m;
}
async function rowBy(sheet, col, val) {
  const rows = await bridge('read', { sheet });
  return rows.find((r) => String(r[col] == null ? '' : r[col]) === String(val)) || null;
}
const rowUpdate = (sheet, col, val, patch) => bridge('update', { sheet, col, val, patch });
const rowAppend = (sheet, row) => bridge('append', { sheet, row });

// ------------------------------- Notion client ------------------------------
function nHeaders(token) { return { Authorization: 'Bearer ' + token, 'Notion-Version': NOTION_VERSION, 'content-type': 'application/json' }; }
async function nFetch(url, token, method, body, tries = 2) {
  for (let i = 1; i <= tries; i++) {
    const r = await fetch(url, { method, headers: nHeaders(token), body: body ? JSON.stringify(body) : undefined });
    const txt = await r.text().catch(() => '');
    if (r.status === 429) { await sleep(1200 * i); continue; }
    if (r.status >= 500) { await sleep(900 * i); continue; }
    let b = {}; try { b = JSON.parse(txt); } catch (e) {}
    return { code: r.status, body: b, txt };
  }
  throw new Error('notion fetch exhausted: ' + url);
}
const PALETTE = ['gray', 'blue', 'green', 'yellow', 'orange', 'purple', 'pink', 'red'];
function convertProps(defs) {
  const out = {};
  const opt = (list) => (Array.isArray(list) ? list : []).map((n, i) => ({ name: String(n).slice(0, 50), color: PALETTE[i % PALETTE.length] }));
  for (const [name, d] of Object.entries(defs || {})) {
    const type = (d && d.type) || 'rich_text';
    if (type === 'title') out[name] = { title: {} };
    else if (type === 'rich_text') out[name] = { rich_text: {} };
    else if (type === 'number') out[name] = { number: { format: d.format === 'dollar' ? 'dollar' : 'number' } };
    else if (type === 'checkbox') out[name] = { checkbox: {} };
    else if (type === 'date') out[name] = { date: {} };
    else if (type === 'url') out[name] = { url: {} };
    else if (type === 'email') out[name] = { email: {} };
    else if (type === 'select') out[name] = { select: { options: opt(d.options) } };
    else if (type === 'multi_select') out[name] = { multi_select: { options: opt(d.options) } };
    else out[name] = { rich_text: {} };
  }
  return out;
}
async function nCreatePage(token, parentId, title) {
  const r = await nFetch(NOTION_API + '/pages', token, 'POST', {
    parent: { page_id: parentId },
    properties: { title: { title: [{ type: 'text', text: { content: trunc(title, 200) } }] } },
    icon: { type: 'emoji', emoji: '📋' }
  });
  if (r.code < 200 || r.code >= 300) throw new Error('notion page: http ' + r.code + ' ' + trunc(r.body.message || r.txt, 160));
  return r.body;
}
async function nCreateDb(token, parentId, name, emoji, props) {
  const r = await nFetch(NOTION_API + '/databases', token, 'POST', {
    parent: { type: 'page_id', page_id: parentId },
    icon: { type: 'emoji', emoji: emoji || '📋' },
    title: [{ type: 'text', text: { content: trunc(name, 100) } }],
    is_inline: false,
    properties: props
  });
  if (r.code < 200 || r.code >= 300) throw new Error('notion db "' + name + '": http ' + r.code + ' ' + trunc(r.body.message || r.txt, 160));
  return r.body;
}
function normDate(v) {
  if (typeof v === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v)) return v.slice(0, 10);
  if (v && typeof v === 'object' && typeof v.start === 'string' && /^\d{4}-\d{2}-\d{2}/.test(v.start)) return v.start.slice(0, 10);
  return null;
}
async function nAddRows(token, dbId, rows, notionProps) {
  let inserted = 0;
  for (const row of rows || []) {
    const props = {};
    for (const [pn, value] of Object.entries(row || {})) {
      const def = notionProps[pn]; if (!def) continue;
      const type = Object.keys(def)[0];
      if (type === 'title') props[pn] = { title: [{ type: 'text', text: { content: trunc(value, 200) } }] };
      else if (type === 'rich_text') props[pn] = { rich_text: [{ type: 'text', text: { content: trunc(value, 1500) } }] };
      else if (type === 'number') { const n = parseFloat(value); if (!isNaN(n)) props[pn] = { number: n }; }
      else if (type === 'checkbox') props[pn] = { checkbox: value === true || value === 'true' || value === 1 };
      else if (type === 'date') { const d = normDate(value); if (d) props[pn] = { date: { start: d } }; }
      else if (type === 'url') if (value) props[pn] = { url: String(value) };
      else if (type === 'email') if (value) props[pn] = { email: String(value) };
      else if (type === 'select') if (value) props[pn] = { select: { name: trunc(String(value), 50) } };
      else if (type === 'multi_select') { const v = Array.isArray(value) ? value : [value]; if (v.length) props[pn] = { multi_select: v.map((x) => ({ name: trunc(String(x), 50) })) }; }
    }
    const r = await nFetch(NOTION_API + '/pages', token, 'POST', { parent: { database_id: dbId }, properties: props }, 1);
    if (r.code >= 200 && r.code < 300) inserted++;
    await sleep(350);
  }
  return inserted;
}
function b(text) { return { object: 'block', type: 'paragraph', paragraph: { rich_text: [{ type: 'text', text: { content: trunc(text, 1500) } }] } }; }
function h2(text) { return { object: 'block', type: 'heading_2', heading_2: { rich_text: [{ type: 'text', text: { content: trunc(text, 200) } }] } }; }
function todo(text) { return { object: 'block', type: 'to_do', to_do: { rich_text: [{ type: 'text', text: { content: trunc(text, 300) } }], checked: false } }; }
function callout(rich, emoji, color) { return { object: 'block', type: 'callout', callout: { rich_text: rich, icon: { type: 'emoji', emoji }, color } }; }
function linkBlock(prefix, text, url, emoji, color) {
  return callout([{ type: 'text', text: { content: prefix } }, { type: 'text', text: { content: text, link: { url } } }], emoji, color);
}
function dashboardBlocks(dash, dbs, ctx) {
  const B = [];
  B.push(callout([{ type: 'text', text: { content: 'Welcome — your databases are live and ready to use.' } }], '🚀', 'blue_background'));
  B.push({ object: 'block', type: 'divider', divider: {} });
  B.push(h2('🗄️ Your databases'));
  B.push(b('Open any database below. Use the view switcher for Table, Board, Calendar, and Gallery.'));
  dbs.forEach((d) => B.push(linkBlock(d.name + '  ', '→ open ' + d.name, d.url, d.emoji || '📋', 'gray_background')));
  B.push({ object: 'block', type: 'divider', divider: {} });
  (dash && Array.isArray(dash.sections) ? dash.sections : []).forEach((s) => {
    if (s && s.heading) B.push(h2(s.heading));
    if (s && s.content) B.push(b(s.content));
  });
  B.push({ object: 'block', type: 'divider', divider: {} });
  B.push(h2('⚙️ Setup checklist'));
  const steps = (dash && Array.isArray(dash.setupSteps) && dash.setupSteps.length) ? dash.setupSteps
    : ['Duplicate this page into your own Notion workspace', 'Rename properties to match your workflow', 'Delete the sample rows and add your real data', 'Set filters and views you actually use'];
  steps.forEach((s) => B.push(todo(s)));
  B.push({ object: 'block', type: 'divider', divider: {} });
  B.push(h2('🧰 Tools & next steps'));
  if (ctx.toolUrl) B.push(linkBlock('Free tool — ', 'try the ' + ctx.toolName + ' → ', ctx.toolUrl, '🧰', 'green_background'));
  if (ctx.paidUrl) B.push(linkBlock('Full paid system — ', 'see the paid version → ', ctx.paidUrl, '🚀', 'purple_background'));
  if (ctx.email) B.push(callout([{ type: 'text', text: { content: 'Need this built around your exact workflow? ' + ctx.email } }], '⚡', 'orange_background'));
  if (ctx.zap) B.push(callout([{ type: 'text', text: { content: 'Enjoyed it? Support the build → ' + ctx.zap } }], '☕', 'pink_background'));
  B.push({ object: 'block', type: 'divider', divider: {} });
  B.push(callout([{ type: 'text', text: { content: 'To duplicate this workspace: ⋯ menu (top right) → Duplicate.' } }], '💡', 'yellow_background'));
  return B;
}
async function nAppend(token, pageId, blocks) {
  for (let i = 0; i < blocks.length; i += 100) {
    const batch = blocks.slice(i, i + 100);
    const r = await nFetch(NOTION_API + '/blocks/' + pageId + '/children', token, 'PATCH', { children: batch });
    if (r.code < 200 || r.code >= 300) log('append batch failed http ' + r.code + ' ' + trunc(r.body.message || '', 120));
    await sleep(300);
  }
}
async function nArchive(token, id) { try { await nFetch(NOTION_API + '/pages/' + id, token, 'PATCH', { archived: true }, 1); } catch (e) {} }
async function nEnablePublic(token, pageId) {
  for (const source of ['social', 'public']) {
    const r = await nFetch(NOTION_API + '/pages/' + pageId, token, 'PATCH', { public: { page: { source, embed: true } } }, 1);
    if (r.code >= 200 && r.code < 300) return source;
  }
  return null;
}
async function nFindOrMakeFolder(token, parentId, name) {
  const r = await nFetch(NOTION_API + '/blocks/' + parentId + '/children', token, 'GET', null, 1);
  if (r.code === 200 && Array.isArray(r.body.results)) {
    for (const blk of r.body.results) {
      if (blk.type === 'child_page' && blk.child_page && blk.child_page.title === name) return blk.id;
    }
  }
  const p = await nCreatePage(token, parentId, name);
  return p.id;
}
async function nExportPdf(token, pageId) {
  const r = await nFetch(NOTION_API + '/export', token, 'POST', { page_id: pageId, export_format: 'pdf', layout: 'single_page' });
  if (r.code < 200 || r.code >= 300 || !r.body.id) throw new Error('export start: http ' + r.code + ' ' + trunc(r.body.message || r.txt, 160));
  for (let i = 0; i < 30; i++) {
    await sleep(3000);
    const st = await nFetch(NOTION_API + '/jobs/' + r.body.id, token, 'GET', null, 1);
    if (st.code === 200 && st.body.status === 'succeeded' && st.body.result) {
      const dl = await fetch(st.body.result);
      return Buffer.from(await dl.arrayBuffer());
    }
    if (st.body.status === 'failed') throw new Error('export job failed');
  }
  throw new Error('export job timeout');
}

// --------------------------------- Whop client ------------------------------
async function whopCreate(token, companyId, title, desc, headline, price, affiliate) {
  if (!/^biz_/i.test(companyId)) throw new Error('bad whop company id: ' + companyId);
  const p = await fetch(WHOP_API + '/products', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ company_id: companyId, title: trunc(title, 120), description: trunc(desc, 3000), headline: trunc(headline, 80), global_affiliate_percentage: affiliate || 0, metadata: { v2: true } })
  });
  const pb = await p.json().catch(() => ({}));
  if ((p.status !== 200 && p.status !== 201) || !pb.id) throw new Error('whop product: http ' + p.status + ' ' + trunc(JSON.stringify(pb), 160));
  const plan = await fetch(WHOP_API + '/plans', {
    method: 'POST', headers: { Authorization: 'Bearer ' + token, 'content-type': 'application/json' },
    body: JSON.stringify({ product_id: pb.id, plan_type: 'one_time', initial_price: price, visibility: 'visible', billing_period: 0 })
  });
  const planB = await plan.json().catch(() => ({}));
  const vr = await fetch(WHOP_API + '/products/' + pb.id, { headers: { Authorization: 'Bearer ' + token } });
  const vb = await vr.json().catch(() => ({}));
  const whopUrl = vb.url || pb.url || (vb.route ? 'https://whop.com/' + vb.route : 'https://whop.com/products/' + pb.id);
  return { productId: pb.id, planId: planB.id || '', whopUrl: whopUrl };
}

// ------------------------------- screenshots --------------------------------
async function screenshotPage(url, outFile) {
  try {
    const puppeteer = require('puppeteer-core');
    const browser = await puppeteer.launch({ channel: 'chrome', headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 1600 });
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise((r) => setTimeout(r, 2500));
    await page.screenshot({ path: outFile, fullPage: false });
    await browser.close();
    return true;
  } catch (e) {
    log('puppeteer failed: ' + trunc(e.toString(), 160));
    return false;
  }
}
async function fallbackScreenshot(name, outFile) {
  try {
    const r = await fetch('https://image.pollinations.ai/prompt/' + encodeURIComponent('minimal professional dashboard template ' + name) + '?width=1280&height=720&nologo=true');
    if (!r.ok) return false;
    fs.writeFileSync(outFile, Buffer.from(await r.arrayBuffer()));
    return true;
  } catch (e) { return false; }
}

// ------------------------------- landing html -------------------------------
function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
function landingHtml(o) {
  const dbs = (o.dbs || []).map((d) => '<li>' + esc(d.name) + ' — ' + d.props + ' columns' + (d.rows ? ', ' + d.rows + ' real example rows' : '') + '</li>').join('');
  const video = o.videoUrl
    ? '<div style="margin:24px 0"><iframe src="' + o.videoUrl + '" width="100%" height="360" style="border:0;border-radius:12px" allowfullscreen></iframe></div>'
    : '';
  const ctas = o.tier === 'free'
    ? '<a class="cta" href="' + esc(o.whopFreeUrl) + '">Get the free system on Whop →</a>' +
      (o.paidUrl ? '<p style="margin-top:14px"><a class="cta2" href="' + esc(o.paidUrl) + '">Full paid version — $' + esc(o.paidPrice) + ' →</a></p>' : '')
    : '<a class="cta" href="' + esc(o.whopPaidUrl) + '">Get the full system — $' + esc(o.paidPrice) + ' →</a>' +
      (o.zapCode ? '<p style="margin-top:14px"><a class="cta2" href="/zap/' + esc(o.zapCode) + '">Prefer Lightning? Pay with ⚡</a></p>' : '');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(o.name) + ' — ' + esc(o.personaName) + '</title>' +
    '<meta name="description" content="' + esc(o.desc).slice(0, 155) + '">' +
    '<meta property="og:title" content="' + esc(o.name) + '"><meta property="og:description" content="' + esc(o.desc).slice(0, 155) + '">' +
    '<script type="application/ld+json">' + JSON.stringify({
      '@context': 'https://schema.org', '@type': 'Product', name: o.name, description: o.desc,
      brand: { '@type': 'Brand', name: o.personaName },
      offers: { '@type': 'Offer', price: String(o.price || 0), priceCurrency: 'USD', availability: 'https://schema.org/InStock', url: o.whopFreeUrl || o.whopPaidUrl || '' }
    }) + '</script>' +
    '<style>body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;color:#0f172a;background:#f8fafc;line-height:1.65}' +
    'main{max-width:880px;margin:0 auto;padding:24px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:28px;box-shadow:0 2px 10px rgba(15,23,42,.05);margin-bottom:20px}' +
    'h1{font-size:34px;line-height:1.15;margin:8px 0}h2{font-size:20px;margin:0 0 10px}.muted{color:#64748b;font-size:14px}' +
    '.cta{display:inline-block;background:#2563eb;color:#fff;font-weight:700;text-decoration:none;padding:14px 26px;border-radius:10px;font-size:16px}' +
    '.cta2{display:inline-block;background:#fff;color:#2563eb;border:2px solid #2563eb;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px}' +
    'ul li{margin:6px 0}img.shot{width:100%;border-radius:12px;border:1px solid #e2e8f0}footer{font-size:13px;color:#64748b;text-align:center;padding:8px 0 32px}a{color:#2563eb}</style></head><body><main>' +
    '<div class="card"><p class="muted">by ' + esc(o.personaName) + ' · ' + esc(o.niche) + '</p><h1>' + esc(o.name) + '</h1>' +
    '<p style="font-size:18px">' + esc(o.desc) + '</p>' + ctas +
    '<p class="muted" style="margin-top:14px">Delivered instantly on Whop after checkout (free tier needs no payment) · card or crypto accepted.</p></div>' +
    (o.screenshot ? '<div class="card"><img class="shot" src="' + esc(o.screenshot) + '" alt="screenshot of ' + esc(o.name) + '"></div>' : '') +
    video +
    '<div class="card"><h2>What’s inside</h2><ul>' + dbs + '</ul><p class="muted">Real example rows are included so you can see the system working, then clear them for your own data.</p></div>' +
    '<div class="card"><h2>How it works</h2><ul><li>Click a button above and complete checkout on Whop (free tier is $0).</li><li>You get the template link in your Whop purchase + your email.</li><li>Open it in Notion → ⋯ → Duplicate into your workspace.</li><li>Follow the built-in setup checklist inside the template.</li></ul></div>' +
    '<div class="card"><h2>Free tool</h2><p>The <a href="/' + esc(o.personaId) + '/tool">' + esc(o.toolName) + '</a> is free and lives here — no signup.</p></div>' +
    '<div class="card"><h2>Custom work</h2><p>Need this built around your exact workflow? <a href="mailto:' + esc(o.email) + '">' + esc(o.email) + '</a></p>' +
    '<p style="margin-top:10px">Enjoyed the build? <a href="lightning:SharkSkin@coinos.io">Buy me a coffee ⚡</a></p></div>' +
    '<footer>Built by ' + esc(o.personaName) + ' · part of Cedar Loom</footer></main></body></html>';
}
function homeHtml(o) {
  const cards = (o.assets || []).map((a) =>
    '<a class="card" href="/' + esc(o.personaId) + '/a/' + esc(a.slug) + '"><h3>' + esc(a.name) + '</h3><p class="muted">' + (a.tier === 'free' ? 'Free' : '$' + esc(a.price)) + ' · ' + esc(a.line) + '</p></a>').join('');
  return '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>' + esc(o.personaName) + ' — ' + esc(o.niche) + '</title><meta name="description" content="' + esc(o.tagline).slice(0, 155) + '">' +
    '<style>body{font-family:system-ui;background:#f8fafc;margin:0;color:#0f172a}main{max-width:900px;margin:0 auto;padding:24px}h1{font-size:30px}.muted{color:#64748b}' +
    '.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:14px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:14px;padding:18px;text-decoration:none;color:inherit;display:block}' +
    '.card h3{margin:0 0 6px;font-size:16px}a.cta{display:inline-block;background:#2563eb;color:#fff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:700}</style></head><body><main>' +
    '<h1>' + esc(o.personaName) + '</h1><p class="muted">' + esc(o.niche) + ' · ' + esc(o.tagline) + '</p>' +
    '<p><a class="cta" href="/' + esc(o.personaId) + '/tool">Try the free ' + esc(o.toolName) + ' →</a></p>' +
    '<h2>Systems</h2><div class="grid">' + cards + '</div>' +
    '<p class="muted" style="margin-top:24px">Custom work: ' + esc(o.email) + ' · <a href="lightning:SharkSkin@coinos.io">Buy me a coffee ⚡</a><br>' + esc(o.personaName) + ' · part of Cedar Loom</p>' +
    '</main></body></html>';
}

// --------------------------------- build op ---------------------------------
async function buildAsset(assetId, cfg, personas) {
  const asset = await rowBy('Assets', 'asset_id', assetId);
  if (!asset) throw new Error('asset not found: ' + assetId);
  const persona = personas[String(asset.persona_id)];
  if (!persona) throw new Error('persona not found: ' + asset.persona_id);
  const token = cfg.NOTION_TOKEN, parentId = cfg.NOTION_PARENT_ID;
  if (!token || !parentId) throw new Error('NOTION_TOKEN / NOTION_PARENT_ID missing in Config');
  const spec = JSON.parse(asset.spec_json || '{}');
  const tier = String(asset.tier || 'free');
  const schema = tier === 'paid' ? (spec.premium || spec.free || {}) : (spec.free || spec.premium || {});
  const dbs = Array.isArray(schema.databases) ? schema.databases.slice(0, 3) : [];
  if (!dbs.length) throw new Error('spec has no databases');
  const personaFolder = persona.notion_folder_id || await nFindOrMakeFolder(token, parentId, '[' + persona.name + '] ' + persona.persona_id);
  const artifacts = [];
  let ok = false;
  try {
    const page = await nCreatePage(token, personaFolder, asset.name + (tier === 'paid' ? ' — Full' : ' — Free'));
    artifacts.push(page.id);
    await sleep(500);
    const created = [];
    let propsTotal = 0, rowsTotal = 0;
    for (const db of dbs) {
      try {
        const props = convertProps(db.properties || {});
        const made = await nCreateDb(token, page.id, db.name || 'Database', db.emoji, props);
        artifacts.push(made.id);
        propsTotal += Object.keys(props).length;
        const inserted = await nAddRows(token, made.id, (db.sampleRows || []).slice(0, 6), props);
        rowsTotal += inserted;
        created.push({ name: db.name, emoji: db.emoji, url: made.url, props: Object.keys(props).length, rows: inserted });
        await sleep(500);
      } catch (e) { log('db failed: ' + trunc(e.toString(), 140)); }
    }
    if (!created.length) throw new Error('all databases failed');
    const ctx = {
      toolUrl: (WORKER + '/' + persona.persona_id + '/tool'), toolName: persona.tool_name || 'free tool',
      email: persona.mail_contact || cfg.CUSTOM_BUILD_EMAIL || '',
      zap: 'lightning:SharkSkin@coinos.io',
      paidUrl: tier === 'free' ? '' : ''
    };
    await nAppend(token, page.id, dashboardBlocks(schema.dashboard || {}, created.map((d) => ({ name: d.name, url: d.url, emoji: d.emoji })), ctx));
    const pub = await nEnablePublic(token, page.id);
    if (!pub) log('warning: public link enable returned non-2xx (link may still work if parent is shared)');
    const notionUrl = page.url;
    // export + zip
    const pdf = await nExportPdf(token, page.id);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cl-'));
    fs.writeFileSync(path.join(dir, 'template.pdf'), pdf);
    const readme = '# ' + asset.name + '\n\n' + (spec.hook || '') + '\n\n## What you got\n- Live template: ' + notionUrl + '\n- PDF copy of the workspace (this zip)\n\n## Use it\n1. Open ' + notionUrl + ' in Notion\n2. ⋯ (top right) → Duplicate → into your own workspace\n3. Follow the Setup Checklist inside the template\n4. Delete sample rows, add your data\n\nCustom work: ' + (persona.mail_contact || '—') + '\nSupport the build: lightning:SharkSkin@coinos.io\n';
    fs.writeFileSync(path.join(dir, 'README.md'), readme);
    const zipName = (persona.persona_id + '-' + String(assetId).replace(/[^a-z0-9]/gi, '').slice(-8) + '.zip');
    try { execSync('cd ' + dir + ' && zip -j ' + zipName + ' template.pdf README.md'); }
    catch (e) { execSync('cd ' + dir + ' && tar -czf ' + zipName.replace('.zip', '.tar.gz') + ' template.pdf README.md'); }
    const zipBuf = fs.readFileSync(path.join(dir, fs.readdirSync(dir).find((f) => f.startsWith(persona.persona_id)) || zipName));
    const driveZip = await bridge('driveUpload', { b64: zipBuf.toString('base64'), name: zipName, mime: 'application/zip' });
    // screenshot
    const shotFile = path.join(dir, 'shot.png');
    let shotOk = await screenshotPage(notionUrl, shotFile);
    if (!shotOk) shotOk = await fallbackScreenshot(asset.name, shotFile);
    let shotDrive = null;
    if (shotOk && fs.existsSync(shotFile)) shotDrive = await bridge('driveUpload', { b64: fs.readFileSync(shotFile).toString('base64'), name: 'shot.png', mime: 'image/png' });
    // whop
    const price = tier === 'paid' ? (parseInt(cfg.PERSONA_PAID_PRICE, 10) || 19) : 0;
    const desc = o2d(tier, asset, spec, persona, cfg, created);
    const wh = await whopCreate(persona.whop_api_key, persona.whop_company_id,
      asset.name + (tier === 'paid' ? ' (Full)' : ' (Free)'), desc,
      (asset.name + ' — ' + persona.name).slice(0, 80), price,
      tier === 'paid' ? (parseInt(cfg.PERSONA_AFFILIATE_PCT, 10) || 40) : 0);
    // landing + home
    const slug = 'a-' + String(assetId).replace(/[^a-z0-9]/gi, '').slice(-10);
    const personaAssets = (await bridge('read', { sheet: 'Assets' })).filter((r) => String(r.persona_id) === persona.persona_id && String(r.status) === 'LISTED').slice(0, 6);
    const landing = landingHtml({
      name: asset.name, desc: (spec.hook || asset.description || '').slice(0, 220), personaId: persona.persona_id,
      personaName: persona.name, niche: persona.niche, tier: tier,
      whopFreeUrl: tier === 'free' ? wh.whopUrl : (findUrl(personaAssets, 'free') || wh.whopUrl),
      whopPaidUrl: tier === 'paid' ? wh.whopUrl : (findUrl(personaAssets, 'paid') || ''),
      paidPrice: price || (parseInt(cfg.PERSONA_PAID_PRICE, 10) || 19),
      zapCode: tier === 'paid' ? 'z' + String(assetId).replace(/[^a-z0-9]/gi, '').slice(-6) : '',
      dbs: created, screenshot: shotDrive ? shotDrive.thumbUrl : '',
      videoUrl: '', toolName: persona.tool_name || 'free tool', email: persona.mail_contact || cfg.CUSTOM_BUILD_EMAIL || ''
    });
    const home = homeHtml({
      personaId: persona.persona_id, personaName: persona.name, niche: persona.niche,
      tagline: persona.voice || persona.tone || '', email: persona.mail_contact || cfg.CUSTOM_BUILD_EMAIL || '',
      toolName: persona.tool_name || 'free tool',
      assets: personaAssets.map((r) => ({ name: r.name, tier: r.tier, slug: 'a-' + String(r.asset_id).replace(/[^a-z0-9]/gi, '').slice(-10), price: r.price, line: trunc(r.description || '', 90) }))
    });
    await wapi('/api/landing', { persona: persona.persona_id, slug: slug, html: landing, home: home });
    const short = await wapi('/api/shortlink', { url: WORKER + '/' + persona.persona_id + '/a/' + slug });
    let zapPage = '';
    if (tier === 'paid') {
      const zc = 'z' + String(assetId).replace(/[^a-z0-9]/gi, '').slice(-6);
      await wapi('/api/zap/asset', { code: zc, meta: { asset_id: assetId, name: asset.name, price_usd: price, persona_id: persona.persona_id, notion_url: notionUrl, zip_url: driveZip.fileUrl, email: persona.mail_contact || '' } });
      zapPage = WORKER + '/zap/' + zc;
    }
    await rowUpdate('Assets', 'asset_id', assetId, {
      status: 'LISTED', notion_url: notionUrl, public_ok: pub || 'unknown',
      zip_url: driveZip.fileUrl, screenshot_url: shotDrive ? shotDrive.thumbUrl : '',
      whop_product_id: wh.productId, whop_plan_id: wh.planId, whop_url: wh.whopUrl,
      landing_url: WORKER + '/' + persona.persona_id + '/a/' + slug, short_url: short.url,
      zap_url: zapPage, price: String(price), db_count: String(created.length),
      property_count: String(propsTotal), sample_rows: String(rowsTotal),
      attempts: String(parseInt(asset.attempts || 0, 10) + 1), error: '', updated_at: new Date().toISOString()
    });
    ok = true;
    log('LISTED ' + assetId + ' (' + tier + ') ' + trunc(asset.name, 50) + ' dbs=' + created.length + ' props=' + propsTotal + ' rows=' + rowsTotal);
  } catch (e) {
    for (const id of artifacts) await nArchive(token, id);
    await rowUpdate('Assets', 'asset_id', assetId, {
      status: 'BUILD_FAILED', error: trunc(e.toString(), 400),
      attempts: String(parseInt(asset.attempts || 0, 10) + 1), updated_at: new Date().toISOString()
    });
    log('BUILD_FAILED ' + assetId + ': ' + trunc(e.toString(), 200));
  }
  return ok;
}
function findUrl(rows, tier) { for (const r of rows) if (String(r.tier) === tier && r.whop_url) return String(r.whop_url); return ''; }
function o2d(tier, asset, spec, persona, cfg, created) {
  const inside = created.map((d) => '• ' + d.name + ' — ' + d.props + ' columns' + (d.rows ? ', ' + d.rows + ' real example rows' : '')).join('\n');
  const base = asset.name + (tier === 'paid' ? ' — full system' : ' — free system') + ' by ' + persona.name + ' (' + persona.niche + ').\n\nWhat’s inside:\n' + inside +
    '\n\nIncluded:\n• Real example rows (clear them for your data)\n• Built-in setup checklist\n• Free tool: ' + (WORKER + '/' + persona.persona_id + '/tool') +
    '\n• Delivery: template link by email + in your Whop purchase';
  if (tier === 'free') base += '\n\nThe full paid version adds the remaining databases, extra views and the bonus templates — see the paid listing.';
  else base += '\n\nLicense: personal use. Commercial license available on request.';
  base += '\n\nCustom work (built around your workflow): ' + (persona.mail_contact || cfg.CUSTOM_BUILD_EMAIL || '');
  base += '\nSupport the build (tip): lightning:SharkSkin@coinos.io';
  return base;
}

// --------------------------------- video op ---------------------------------
async function videoJob(cfg) {
  const assets = (await bridge('read', { sheet: 'Assets' })).filter((r) => String(r.status) === 'LISTED' && r.whop_product_id && r.landing_url);
  const rev = await bridge('read', { sheet: 'Revenue' });
  const totals = {};
  rev.forEach((r) => { const k = String(r.whop_product_id || r.payment_id || ''); if (k) totals[k] = (totals[k] || 0) + (parseFloat(r.amount) || 0); });
  const ranked = assets.sort((a, b) => (totals[String(b.whop_product_id)] || 0) - (totals[String(a.whop_product_id)] || 0)).slice(0, 10);
  let done = 0;
  for (const a of ranked) {
    try {
      if (String(a.video_status || '') === 'RENDERED') continue;
      const personas = {}; (await bridge('read', { sheet: 'Personas' })).forEach((p) => { personas[p.persona_id] = p; });
      const persona = personas[String(a.persona_id)];
      const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clv-'));
      const files = [];
      const t1 = path.join(dir, 't1.png');
      if (await cardImage(t1, 'FREE TOOL + SYSTEMS', persona.name + ' · ' + persona.niche)) files.push(t1);
      const s1 = path.join(dir, 's1.png');
      if (await screenshotPage(String(a.landing_url), s1)) files.push(s1);
      if (a.screenshot_url) { try { const r = await fetch(String(a.screenshot_url)); if (r.ok) { fs.writeFileSync(s1 + 'b.png', Buffer.from(await r.arrayBuffer())); files.push(s1 + 'b.png'); } } catch (e) {} }
      const t2 = path.join(dir, 't2.png');
      if (await cardImage(t2, 'GET IT →', trunc(String(a.landing_url), 60) + '  ·  ' + (persona.mail_contact || ''))) files.push(t2);
      if (files.length < 2) { log('video skip (no frames): ' + a.asset_id); continue; }
      const clips = [];
      for (let i = 0; i < files.length; i++) {
        const c = path.join(dir, 'c' + i + '.mp4');
        execSync('ffmpeg -y -loglevel error -loop 1 -i ' + files[i] + ' -t 3 -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" -c:v libx264 -pix_fmt yuv420p -r 25 ' + c);
        clips.push(c);
      }
      const list = path.join(dir, 'list.txt');
      fs.writeFileSync(list, clips.map((c) => 'file ' + c).join('\n'));
      const mp4 = path.join(dir, 'out.mp4');
      execSync('ffmpeg -y -loglevel error -f concat -safe 0 -i ' + list + ' -c:v libx264 -crf 32 -preset veryfast -pix_fmt yuv420p -an ' + mp4);
      const buf = fs.readFileSync(mp4);
      const drive = await bridge('driveUpload', { b64: buf.toString('base64'), name: a.asset_id + '.mp4', mime: 'video/mp4' });
      await rowAppend('Videos', { bundle_id: a.asset_id, mp4_url: drive.fileUrl, preview_url: 'https://drive.google.com/file/d/' + drive.id + '/preview', youtube_id: '', youtube_url: '', status: 'RENDERED', attempts: '1', ts: new Date().toISOString(), provider: 'ffmpeg' });
      // re-publish landing with video
      const spec = JSON.parse(a.spec_json || '{}');
      const landed = landingHtml({
        name: a.name, desc: (spec.hook || a.description || '').slice(0, 220), personaId: a.persona_id, personaName: persona.name,
        niche: persona.niche, tier: a.tier, whopFreeUrl: a.whop_url, whopPaidUrl: a.whop_url, paidPrice: a.price || '19', zapCode: a.zap_url ? a.zap_url.split('/').pop() : '',
        dbs: [{ name: 'See the system', props: a.property_count, rows: a.sample_rows }], screenshot: a.screenshot_url || '',
        videoUrl: 'https://drive.google.com/file/d/' + drive.id + '/preview', toolName: persona.tool_name || 'free tool', email: persona.mail_contact || ''
      });
      const slug = 'a-' + String(a.asset_id).replace(/[^a-z0-9]/gi, '').slice(-10);
      await wapi('/api/landing', { persona: a.persona_id, slug: slug, html: landed });
      await rowUpdate('Assets', 'asset_id', a.asset_id, { video_status: 'RENDERED', video_url: drive.fileUrl, updated_at: new Date().toISOString() });
      done++;
      log('video rendered ' + a.asset_id + ' ' + (buf.length / 1e6).toFixed(1) + 'MB');
    } catch (e) { log('video failed ' + a.asset_id + ': ' + trunc(e.toString(), 160)); }
  }
  return done;
}
async function cardImage(file, line1, line2) {
  try {
    execSync('ffmpeg -y -loglevel error -f lavfi -i color=c=0x0d1117:s=1280x720:d=1 ' +
      '-vf "drawtext=text=\'' + esc(line1).replace(/'/g, '') + '\':fontcolor=white:fontsize=64:x=(w-text_w)/2:y=(h/2)-70,' +
      'drawtext=text=\'' + esc(line2).replace(/'/g, '').slice(0, 60) + '\':fontcolor=0x8b949e:fontsize=32:x=(w-text_w)/2:y=(h/2)+40" -frames:v 1 ' + file);
    return fs.existsSync(file);
  } catch (e) { return false; }
}

// ------------------------------------ main ----------------------------------
(async () => {
  const op = (process.argv[2] || '--op') === '--op' ? (process.argv[3] || 'build') : process.argv[2];
  if (!BRIDGE || !SECRET || !WORKER) { console.error('missing WEB_APP_URL / BRIDGE_SECRET / WORKER_URL env'); process.exit(2); }
  if (op === 'build') {
    const ids = JSON.parse(process.env.PAYLOAD || '[]');
    log('build op, ' + ids.length + ' asset(s)');
    const cfg = await cfgMap();
    const personas = {}; (await bridge('read', { sheet: 'Personas' })).forEach((p) => { personas[p.persona_id] = p; });
    for (const id of ids) { try { await buildAsset(String(id), cfg, personas); } catch (e) { log('asset ' + id + ' error: ' + e.toString()); } await sleep(2000); }
  } else if (op === 'video') {
    const cfg = await cfgMap();
    const n = await videoJob(cfg);
    log('video op done: ' + n);
  } else {
    log('unknown op ' + op);
  }
})().catch((e) => { console.error('FATAL ' + e.toString()); process.exit(1); });
