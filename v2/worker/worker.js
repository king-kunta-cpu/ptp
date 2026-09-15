/* ============================================================================
 * CEDAR LOOM v2.0 — Cloudflare Worker
 * Hosting (persona landings, tools, short links) + Lightning zap hub.
 * Bindings:  CL (KV namespace)
 * Secrets:   BRIDGE_SECRET, COINOS_API_BASE, COINOS_API_KEY,
 *            COINOS_INVOICE_PATH, COINOS_WEBHOOK_SECRET, WEB_APP_URL
 * Vars:      GH_REPO (default king-kunta-cpu/ptp)
 * ==========================================================================*/
const VERSION = '2.0.0';

const H = { 'content-type': 'application/json', 'access-control-allow-origin': '*', 'access-control-allow-headers': 'content-type' };
function j(o, code = 200) { return new Response(JSON.stringify(o), { status: code, headers: H }); }
function page(s, code = 200) { return new Response(s, { status: code, headers: { 'content-type': 'text/html; charset=utf-8', 'access-control-allow-origin': '*' } }); }
function personaOk(p) { return typeof p === 'string' && /^[a-z0-9_]{2,24}$/.test(p); }
function slugOk(s) { return typeof s === 'string' && /^[a-z0-9_-]{2,80}$/.test(s); }

async function toolHtml(env, persona) {
  const hit = await env.CL.get('tool:' + persona, 'text');
  if (hit) return hit;
  const repo = env.GH_REPO || 'king-kunta-cpu/ptp';
  try {
    const r = await fetch('https://raw.githubusercontent.com/' + repo + '/main/v2/tools/' + persona + '.html');
    if (r.ok) { const t = await r.text(); env.CL.put('tool:' + persona, t, { expirationTtl: 6 * 3600 }); return t; }
  } catch (e) { /* fall through */ }
  return null;
}

async function satPerUsd() {
  try {
    const r = await fetch('https://mempool.space/api/v1/prices/usd/1');
    const b = await r.json();
    if (b && b.satPerUsd) return Number(b.satPerUsd);
  } catch (e) { /* fallback below */ }
  return 1000; // ~BTC $100k fallback
}

function centralPage() {
  return page('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cedar Loom</title>' +
    '<style>body{font-family:system-ui;background:#0d1117;color:#e6edf3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}' +
    'main{text-align:center;padding:24px}h1{font-size:28px}.muted{color:#8b949e;font-size:14px}a{color:#58a6ff}</style></head><body><main>' +
    '<h1>Cedar Loom</h1><p class="muted">Independent niche studios. Systems, tools, and templates built in the open.</p>' +
    '<p><a href="mailto:cedar@atomicmail.io">cedar@atomicmail.io</a> · <a href="lightning:SharkSkin@coinos.io">Buy me a coffee ⚡</a></p></main></body></html>');
}

function zapClaimPage(meta, code, workerBase) {
  return page('<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
    '<title>Pay with Lightning — ' + meta.name + '</title>' +
    '<style>body{font-family:system-ui;background:#0d1117;color:#e6edf3;display:flex;min-height:100vh;align-items:center;justify-content:center;margin:0}' +
    'main{background:#161b22;border:1px solid #30363d;border-radius:16px;padding:32px;max-width:460px;width:92%}' +
    'h1{font-size:20px}input,button{width:100%;box-sizing:border-box;padding:12px;border-radius:8px;font:inherit}' +
    'input{background:#0d1117;border:1px solid #30363d;color:#e6edf3;margin:10px 0}button{background:#238636;border:0;color:#fff;cursor:pointer}' +
    'pre{white-space:pre-wrap;word-break:break-all;font-size:11px;background:#0d1117;padding:10px;border-radius:8px}' +
    'img{width:220px;height:220px;margin:12px auto;display:block;background:#fff}a{color:#58a6ff}.muted{color:#8b949e;font-size:13px}' +
    '.ok{color:#3fb950;font-weight:700}</style></head><body><main>' +
    '<h1>' + meta.name + '</h1><p class="muted">One-time · $' + meta.price_usd + ' · instant delivery to your email</p>' +
    '<input id="em" type="email" placeholder="you@example.com" value=""><button id="go">Create Lightning invoice</button>' +
    '<div id="pay" style="display:none"><img id="qr" alt="QR"><p class="muted">Pay with any Lightning wallet, then wait — this page updates automatically.</p>' +
    '<a id="lnk" href="#">lightning: link (copy in wallet)</a><pre id="bolt"></pre><p id="stat" class="muted">Waiting for payment…</p></div>' +
    '<div id="err" class="muted" style="display:none"></div>' +
    '<p class="muted" style="margin-top:16px">Or buy by card/crypto on Whop — this page is the Lightning route. Custom work: see the asset page.</p>' +
    '<script>' +
    'var CODE="' + code + '";var base="' + workerBase + '";var invId="";' +
    'document.getElementById("go").onclick=async function(){' +
    ' var em=document.getElementById("em").value.trim(); if(!em)return;' +
    ' document.getElementById("err").style.display="none";' +
    ' try{ var r=await fetch(base+"/api/zap/invoice",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({code:CODE,email:em})});' +
    '  var b=await r.json(); if(!r.ok){var e=document.getElementById("err");e.textContent=b.error||("http "+r.status);e.style.display="block";return;}' +
    '  invId=b.invoice_id; document.getElementById("pay").style.display="block";' +
    '  document.getElementById("qr").src="https://api.qrserver.com/v1/create-qr-code/?size=220x220&data="+encodeURIComponent("lightning:"+b.bolt11);' +
    '  document.getElementById("bolt").textContent=b.bolt11;' +
    '  var l=document.getElementById("lnk");l.href="lightning:"+b.bolt11;l.textContent="lightning: (tap to open in wallet)";' +
    '  poll();' +
    ' }catch(e2){var e2x=document.getElementById("err");e2x.textContent=String(e2);e2x.style.display="block";} };' +
    'function poll(){ if(!invId)return; fetch(base+"/api/zap/status/"+invId).then(r=>r.json()).then(function(b){' +
    '  var s=document.getElementById("stat");' +
    '  if(b.status==="PAID"){s.textContent="Payment received — your delivery email is on its way. Thanks!";s.className="ok";return;}' +
    '  if(b.status==="DELIVERED"){s.textContent="Delivered — check your inbox (and spam).";s.className="ok";return;}' +
    '  setTimeout(poll,5000); }); }' +
    '<\/script></main></body></html>');
}

async function zapInvoice(env, code, email, workerBase) {
  if (!/^[a-z0-9_-]{2,40}$/i.test(code || '')) return { error: 'bad code' };
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email || '')) return { error: 'bad email' };
  const meta = await env.CL.get('zapmeta:' + code, 'json');
  if (!meta) return { error: 'unknown asset code' };
  const rlK = 'zaprl:' + code;
  const n = Number(await env.CL.get(rlK) || 0);
  if (n >= 10) return { error: 'too many invoices for this asset in the last hour — try later' };
  env.CL.put(rlK, String(n + 1), { expirationTtl: 3600 });
  if (!env.CHOINOS_API_KEY) return { error: 'lightning not configured yet (set COINOS_API_KEY)' };
  const sp = await satPerUsd();
  const sats = Math.max(1000, Math.ceil((Number(meta.price_usd) * sp) / 1000) * 1000);
  const base = String(env.CHOINOS_API_BASE || '').replace(/\/+$/, '');
  const path = env.CHOINOS_INVOICE_PATH || '/api/v1/lightning/invoice';
  const r = await fetch(base + path, {
    method: 'POST', headers: { 'content-type': 'application/json', Authorization: 'Bearer ' + env.CHOINOS_API_KEY },
    body: JSON.stringify({ amount: String(sats), memo: 'CL ' + code + ' ' + String(meta.name || '').slice(0, 40) })
  });
  const b = await r.json().catch(() => ({}));
  if (!r.ok) return { error: 'coinos http ' + r.status + ' ' + (b.message || b.error || '').slice(0, 160) };
  const bolt11 = b.payment_request || b.bolt11 || b.invoice || '';
  const id = String(b.id || b.invoice_id || 'bolt11_' + Date.now());
  if (!bolt11) return { error: 'coinos returned no invoice' };
  env.CL.put('zinv:' + id, JSON.stringify({ code: code, email: email, sats: sats, status: 'PENDING', ts: Date.now() }), { expirationTtl: 7 * 86400 });
  return { invoice_id: id, bolt11: bolt11, sats: sats, status_url: workerBase + '/api/zap/status/' + id };
}

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    const path = url.pathname.replace(/\/+$/, '') || '/';
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: H });

    if (req.method === 'GET') {
      if (path === '/health' || path === '/v1/health') return j({ ok: true, version: VERSION, rails: ['hosting', 'zap', 'shortlink'] });
      if (path === '/v1/distribute/batch') return j({ ok: true, retired: true, note: 'v2: distribution runs in the factory (Apps Script)' });
      if (path === '/') return centralPage();
      const mA = path.match(/^\/a\/([A-Za-z0-9_-]{4,12})$/);
      if (mA) { const t = await env.CL.get('sl:' + mA[1]); if (!t) return j({ error: 'not found' }, 404); return Response.redirect(t, 302); }
      const mZ = path.match(/^\/zap\/([a-z0-9_-]{2,40})$/i);
      if (mZ) { const meta = await env.CL.get('zapmeta:' + mZ[1], 'json'); if (!meta) return j({ error: 'not found' }, 404); return page(zapClaimPage(meta, mZ[1], url.origin)); }
      const mS = path.match(/^\/api\/zap\/status\/(.+)$/);
      if (mS) { const st = await env.CL.get('zinv:' + decodeURIComponent(mS[1]), 'json'); return j(st || { status: 'UNKNOWN' }); }
      const mTool = path.match(/^\/([a-z0-9_]{2,24})\/tool$/);
      if (mTool) { const t = await toolHtml(env, mTool[1]); if (!t) return j({ error: 'tool not found' }, 404); return page(t); }
      const mLand = path.match(/^\/([a-z0-9_]{2,24})\/a\/([a-z0-9_-]{2,80})$/);
      if (mLand) { if (!personaOk(mLand[1]) || !slugOk(mLand[2])) return j({ error: 'bad path' }, 400); const t = await env.CL.get('land:' + mLand[1] + ':' + mLand[2]); if (!t) return j({ error: 'not found' }, 404); return page(t); }
      const mHome = path.match(/^\/([a-z0-9_]{2,24})$/);
      if (mHome) { const t = await env.CL.get('home:' + mHome[1]); if (!t) return j({ error: 'persona hub not live yet' }, 404); return page(t); }
      return j({ error: 'not found' }, 404);
    }

    if (req.method === 'POST') {
      const body = await req.json().catch(() => ({}));
      if (path === '/zap/webhook') {
        const s = url.searchParams.get('s') || '';
        if (env.CHOINOS_WEBHOOK_SECRET && s !== env.CHOINOS_WEBHOOK_SECRET) return j({ error: 'bad secret' }, 403);
        const raw = JSON.stringify(body).slice(0, 4000);
        const id = String(body.id || body.invoice_id || body.invoice || (body.payment_request ? 'bolt11_unknown' : '') || '');
        let st = null;
        if (id && id !== 'bolt11_unknown') { st = await env.CL.get('zinv:' + id, 'json'); if (st) { st.status = 'PAID'; st.at = Date.now(); env.CL.put('zinv:' + id, JSON.stringify(st), { expirationTtl: 7 * 86400 }); } }
        const meta = st ? await env.CL.get('zapmeta:' + st.code, 'json') : null;
        if (env.WEB_APP_URL && st) {
          try {
            await fetch(env.WEB_APP_URL + '?s=' + (env.BRIDGE_SECRET || ''), {
              method: 'POST', headers: { 'content-type': 'application/json' },
              body: JSON.stringify({ op: 'zapWebhook', invoice_id: id, code: st.code, email: st.email, sats: st.sats, meta: meta, raw: raw })
            });
            st.status = 'DELIVERED'; env.CL.put('zinv:' + id, JSON.stringify(st), { expirationTtl: 7 * 86400 });
          } catch (e) { /* web app down; status stays PAID, factory can re-fulfill from ZapOrders later */ }
        }
        return j({ ok: true });
      }
      if (path === '/api/zap/invoice') {
        const res = await zapInvoice(env, String(body.code || ''), String(body.email || ''), url.origin);
        return j(res, res.error && /not configured/.test(res.error) ? 503 : (res.error ? 400 : 200));
      }
      if (path === '/api/landing') {
        if (body.s !== (env.BRIDGE_SECRET || '') && url.searchParams.get('s') !== (env.BRIDGE_SECRET || '')) return j({ error: 'bad secret' }, 403);
        if (!personaOk(body.persona) || !slugOk(body.slug)) return j({ error: 'bad persona/slug' }, 400);
        env.CL.put('land:' + body.persona + ':' + body.slug, String(body.html || ''));
        if (body.home) env.CL.put('home:' + body.persona, String(body.home));
        return j({ ok: true, persona: body.persona, slug: body.slug });
      }
      if (path === '/api/persona') {
        if (body.s !== (env.BRIDGE_SECRET || '') && url.searchParams.get('s') !== (env.BRIDGE_SECRET || '')) return j({ error: 'bad secret' }, 403);
        if (!personaOk(body.persona)) return j({ error: 'bad persona' }, 400);
        if (body.home) env.CL.put('home:' + body.persona, String(body.home));
        return j({ ok: true });
      }
      if (path === '/api/shortlink') {
        if (body.s !== (env.BRIDGE_SECRET || '') && url.searchParams.get('s') !== (env.BRIDGE_SECRET || '')) return j({ error: 'bad secret' }, 403);
        if (!/^https?:\/\//.test(String(body.url || ''))) return j({ error: 'bad url' }, 400);
        let code = String(body.code || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 10);
        if (code.length < 4) { const abc = 'abcdefghjkmnpqrstuvwxyz23456789'; for (let i = 0; i < 8; i++) code += abc[Math.floor(Math.random() * abc.length)]; }
        env.CL.put('sl:' + code, String(body.url));
        return j({ ok: true, code: code, url: url.origin + '/a/' + code });
      }
      if (path === '/api/zap/asset') {
        if (body.s !== (env.BRIDGE_SECRET || '') && url.searchParams.get('s') !== (env.BRIDGE_SECRET || '')) return j({ error: 'bad secret' }, 403);
        const code = String(body.code || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 40);
        if (!code || !body.meta) return j({ error: 'bad code/meta' }, 400);
        env.CL.put('zapmeta:' + code, JSON.stringify(body.meta));
        return j({ ok: true, code: code, page: url.origin + '/zap/' + code });
      }
      return j({ error: 'unknown route' }, 404);
    }
    return j({ error: 'method not allowed' }, 405);
  }
};
