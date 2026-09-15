/**
 * Cedar Loom Cloudflare Worker v1.6-PERFECTION - Full with safe KV
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if(request.method === 'OPTIONS') {
      return new Response(null, {headers: corsHeaders()});
    }
    try {
      if(url.pathname === '/v1/health') {
        return jsonResponse({ok:true, version:'1.6-PERFECTION', time: new Date().toISOString(), worker:'https://cedar-loom.simalidudu.workers.dev'});
      }
      if(url.pathname === '/v1/batch/distribute' && request.method === 'POST') {
        const {assets, personas, dryRun} = await request.json();
        const results = await batchDistribute(assets||[], personas||[], env, dryRun||false);
        return jsonResponse({ok:true, results, count: results.length});
      }
      if(url.pathname === '/v1/cache/whop') {
        try {
          if(env.KV) {
            const cached = await env.KV.get('whop:products', 'json');
            if(cached) return jsonResponse({ok:true, cached:true, data:cached});
          }
        } catch(e) {}
        const fresh = await fetchWhopProducts(env);
        try { if(env.KV) await env.KV.put('whop:products', JSON.stringify(fresh), {expirationTtl:300}); } catch(e) {}
        return jsonResponse({ok:true, cached:false, data:fresh});
      }
      if(url.pathname === '/v1/hook/github' && request.method === 'POST') {
        const body = await request.text();
        if(env.APPS_SCRIPT_WEBHOOK) {
          await fetch(env.APPS_SCRIPT_WEBHOOK, {method:'POST', headers:{'Content-Type':'application/json'}, body}).catch(()=>{});
        }
        return new Response('ok', {headers: corsHeaders()});
      }
      if(url.pathname === '/v1/judge' && request.method === 'POST') {
        const {stage, content} = await request.json();
        const score = judgeLocal(stage, content);
        return jsonResponse({ok:true, score, pass: score>= (stage==='idea'?7:8)});
      }
      return new Response('Cedar Loom Worker v1.6-PERFECTION - OK - /v1/health, /v1/batch/distribute, /v1/cache/whop, /v1/hook/github, /v1/judge', {headers: corsHeaders()});
    } catch(e) {
      return jsonResponse({ok:false, error:e.message, stack:e.stack?.substring(0,500)}, 500);
    }
  },
  async scheduled(event, env, ctx) {
    if(env.GH_REPO && env.GH_TOKEN) {
      await fetch(`https://api.github.com/repos/${env.GH_REPO}/dispatches`, {
        method:'POST',
        headers:{Authorization:`Bearer ${env.GH_TOKEN}`, Accept:'application/vnd.github.v3+json', 'User-Agent':'CedarLoom-Worker'},
        body: JSON.stringify({event_type:'cedar-heavy-build', client_payload:{count:50, tz:'Africa/Harare', source:'cloudflare-cron', cron:event.cron}})
      }).catch(()=>{});
    }
  }
};

async function batchDistribute(assets, personas, env, dryRun=false) {
  const tasks = [];
  for(let asset of assets.slice(0,20)) {
    for(let persona of personas.slice(0,10)) {
      if(persona.bsky_handle && persona.bsky_app_password) {
        tasks.push(postBsky(persona, asset, env, dryRun).then(r=>({channel:'bluesky', persona:persona.persona_id, asset:asset.name, ...r})));
      }
      if(persona.mastodon_instance && (persona.mastodon_access_token||persona.mastodon_token)) {
        tasks.push(postMastodon(persona, asset, env, dryRun).then(r=>({channel:'mastodon', persona:persona.persona_id, asset:asset.name, ...r})));
      }
      if(persona.buffer_api_key && persona.buffer_channel_x) {
        tasks.push(postBuffer(persona, asset, persona.buffer_channel_x, env, dryRun).then(r=>({channel:'buffer_x', ...r})));
      }
    }
  }
  const results = [];
  const chunks = chunkArray(tasks, 10);
  for(let chunk of chunks) {
    const res = await Promise.allSettled(chunk);
    results.push(...res.map(r=> r.status==='fulfilled'?r.value:{ok:false, error:r.reason?.message||'failed'}));
  }
  return results;
}

async function postBsky(persona, asset, env, dryRun) {
  if(dryRun) return {ok:true, dryRun:true, url:'https://bsky.app/dryrun'};
  try {
    const sessionRes = await fetch('https://bsky.social/xrpc/com.atproto.server.createSession', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({identifier:persona.bsky_handle, password:persona.bsky_app_password})
    });
    if(!sessionRes.ok) return {ok:false, error:`bsky session ${sessionRes.status}`};
    const session = await sessionRes.json();
    const text = `${asset.name} - free for ${persona.niche||'freelancers'}. Free for 48h then $29, 40% affiliate → ${asset.cta_url||asset.landing_url||''}`.substring(0,280);
    const postRes = await fetch('https://bsky.social/xrpc/com.atproto.repo.createRecord', {
      method:'POST',
      headers:{Authorization:`Bearer ${session.accessJwt}`, 'Content-Type':'application/json'},
      body: JSON.stringify({repo: session.did, collection:'app.bsky.feed.post', record:{$type:'app.bsky.feed.post', text, createdAt: new Date().toISOString()}})
    });
    const postJson = await postRes.json();
    if(postRes.ok) return {ok:true, id:postJson.uri, url:`https://bsky.app/profile/${persona.bsky_handle}/post/${postJson.uri?.split('/').pop()}`};
    return {ok:false, error:postJson.message||`http ${postRes.status}`};
  } catch(e) { return {ok:false, error:e.message}; }
}

async function postMastodon(persona, asset, env, dryRun) {
  if(dryRun) return {ok:true, dryRun:true};
  try {
    let instance = persona.mastodon_instance.trim();
    if(!/^https?:\/\//.test(instance)) instance = 'https://'+instance;
    instance = instance.replace(/\/+$/,'');
    const token = (persona.mastodon_access_token||persona.mastodon_token||'').trim();
    const text = `${asset.name} - free for ${persona.niche||'freelancers'}. Free for 48h then $29, 40% affiliate → ${asset.cta_url||''}`.substring(0,450);
    const res = await fetch(`${instance}/api/v1/statuses`, {
      method:'POST',
      headers:{Authorization:`Bearer ${token}`, 'Content-Type':'application/json'},
      body: JSON.stringify({status:text, visibility:'public'})
    });
    const json = await res.json();
    if(res.ok && json.id) return {ok:true, id:json.id, url:json.url||json.uri};
    return {ok:false, error:`mastodon ${res.status} ${JSON.stringify(json).substring(0,200)}`};
  } catch(e) { return {ok:false, error:e.message}; }
}

async function postBuffer(persona, asset, channelId, env, dryRun) {
  if(dryRun) return {ok:true, dryRun:true};
  try {
    const key = persona.buffer_api_key;
    const text = `${asset.name} - free for 48h then $29, 40% affiliate → ${asset.cta_url||''}`.substring(0,400);
    const res = await fetch(`https://api.buffer.com/1/updates/create.json?access_token=${encodeURIComponent(key)}`, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify({text, profile_ids:[channelId]})
    });
    const json = await res.json();
    if(res.ok && json.success) return {ok:true, id:json.updates?.[0]?.id};
    return {ok:false, error:`buffer ${res.status} ${JSON.stringify(json).substring(0,200)}`};
  } catch(e) { return {ok:false, error:e.message}; }
}

async function fetchWhopProducts(env) {
  if(!env.WHOP_API_KEY || !env.WHOP_COMPANY_ID) return {error:'no whop keys'};
  const res = await fetch(`https://api.whop.com/api/v1/companies/${env.WHOP_COMPANY_ID}/products`, {
    headers:{Authorization:`Bearer ${env.WHOP_API_KEY}`}
  });
  return await res.json().catch(()=>({error:'fetch failed'}));
}

function judgeLocal(stage, content) {
  let score = 5;
  const str = JSON.stringify(content).toLowerCase();
  if(str.length>100) score+=1;
  if(str.includes('free for 48h')||str.includes('scarcity')) score+=1;
  if(str.includes('47')||str.includes('100+')||str.includes('social proof')) score+=1;
  if(str.includes('stop losing')||str.includes('loss')) score+=1;
  if(str.includes('40%')||str.includes('affiliate')) score+=1;
  return Math.min(10, score);
}

function chunkArray(arr, size) {
  const chunks=[];
  for(let i=0;i<arr.length;i+=size) chunks.push(arr.slice(i,i+size));
  return chunks;
}

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin':'*',
    'Access-Control-Allow-Methods':'GET,POST,OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type,Authorization',
    'Content-Type':'application/json'
  };
}

function jsonResponse(data, status=200) {
  return new Response(JSON.stringify(data), {status, headers:corsHeaders()});
}
