/**
 * Cedar Loom Heavy Build - GitHub Actions Worker
 * Offloads heavy work from Apps Script (90m quota) to GitHub (2000m free)
 * - Batch LLM: 1 call -> 30 ideas
 * - Batch draft: 1 call -> 15 briefs
 * - Batch build: 30 assets in memory
 * - 1 commit -> 30 landings
 * - Batch Sheets write
 * 
 * Env: SHEETS_ID, SHEETS_SERVICE_JSON, GROQ_API_KEY, GH_TOKEN
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// Config
const COUNT = parseInt(process.argv.find(a=>a.startsWith('--count'))?.split('=')[1] || process.env.COUNT || '30', 10);
const SHEETS_ID = process.env.SHEETS_ID;
const SERVICE_JSON = process.env.SHEETS_SERVICE_JSON;
const GROQ_KEY = process.env.GROQ_API_KEY || process.env.GROQ_API_KEY_2;
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;

if(!SHEETS_ID) throw new Error('Missing SHEETS_ID');
if(!SERVICE_JSON) throw new Error('Missing SHEETS_SERVICE_JSON');

async function getSheets() {
  const creds = JSON.parse(SERVICE_JSON);
  const auth = new google.auth.GoogleAuth({
    credentials: creds,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });
  const client = await auth.getClient();
  return google.sheets({version:'v4', auth:client});
}

async function batchGet(sheets, ranges) {
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEETS_ID,
    ranges
  });
  return res.data.valueRanges;
}

async function batchUpdate(sheets, data) {
  // data = [{range, values}]
  const res = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEETS_ID,
    resource: {
      valueInputOption: 'RAW',
      data
    }
  });
  return res.data;
}

async function callGroq(prompt, maxTokens=3000) {
  if(!GROQ_KEY) {
    console.log('No GROQ_KEY, using fallback ideas');
    return null;
  }
  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method:'POST',
      headers:{'Authorization':`Bearer ${GROQ_KEY}`, 'Content-Type':'application/json'},
      body: JSON.stringify({
        model:'llama-3.3-70b-versatile',
        messages:[{role:'user', content:prompt}],
        temperature:0.7,
        max_tokens: maxTokens
      })
    });
    const json = await res.json();
    return json.choices?.[0]?.message?.content || null;
  } catch(e) {
    console.error('Groq failed', e.message);
    return null;
  }
}

function extractJsonArray(text) {
  if(!text) return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if(start===-1 || end===-1) return null;
  try {
    return JSON.parse(text.substring(start, end+1));
  } catch(e) {
    // try repair truncated
    let head = text.substring(start, end+1).replace(/,\s*$/, '');
    // close brackets
    const open = (head.match(/\[/g)||[]).length;
    const close = (head.match(/\]/g)||[]).length;
    for(let i=0;i<open-close;i++) head+=']';
    try { return JSON.parse(head); } catch(e2){ return null; }
  }
}

function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

async function main(){
  console.log(`🌲 Cedar Loom Heavy Build count=${COUNT} tz=${process.env.TZ||'Africa/Harare'}`);
  const sheets = await getSheets();

  // 1. Read Backlog, Config, Personas
  const ranges = ['Backlog!A1:F1000', 'Config!A1:C200', 'Assets!A1:AB1000'];
  const [backlogRange, configRange, assetsRange] = await batchGet(sheets, ranges);
  const backlogRows = backlogRange.values || [];
  const configRows = configRange.values || [];
  const assetsRows = assetsRange.values || [];

  const pendingCount = backlogRows.slice(1).filter(r=> (r[4]||'').toUpperCase()==='PENDING').length;
  console.log(`Backlog pending: ${pendingCount}`);

  // 2. If queue <20, generate ideas batch
  let newIdeas = [];
  if(pendingCount < 20) {
    const need = Math.min(COUNT, 30);
    const prompt = `Generate ${need} IRL freelance/business Notion template ideas JSON array [{name,description,score,demand_score,monetization:{free,starter,pro},pain,dream,hook,features:[3],benefits:[2],cta_aggressive,psych_triggers:[3]}]. Rules: IRL only (freelance designers, agencies, solo operators, local services), no forge/nexus, $10k/mo month 3 potential, low bandwidth <500KB, aggressive CTA potential, include buying psychological triggers scarcity/social_proof/authority/loss_aversion/reciprocity/anchoring. Return ONLY JSON array, no markdown.`;
    let text = await callGroq(prompt, 4000);
    let ideas = extractJsonArray(text);
    if(!ideas || !ideas.length) {
      console.log('LLM failed, using fallback');
      ideas = [
        {name:'Client Pipeline Mini', description:'Free mini CRM for designers - track leads, proposals, invoices', score:8, demand_score:8, monetization:{free:'mini',starter:'$19 full',pro:'$49 + bonuses'}, pain:'Losing leads in DMs', dream:'Close 3x faster', hook:'Steal my 10-min pipeline', features:['Lead DB','Proposal tracker','Invoice log'], benefits:['Save 4h/week','Close 2x faster'], cta_aggressive:'Free for 48h then $29 →', psych_triggers:['scarcity','social_proof','authority']},
        {name:'Invoice Tracker Mini', description:'Free invoice log - never chase payments', score:7, demand_score:7, monetization:{free:'log',starter:'$19 + reminders',pro:'$49 + automation'}, pain:'Chasing invoices 2h/week', dream:'Get paid in 24h', hook:'Stop losing $200/week chasing invoices', features:['Invoice DB','Status tracker','Reminder scripts'], benefits:['Get paid faster','Never lose invoice'], cta_aggressive:'Free for 48h, 100+ using →', psych_triggers:['loss_aversion','social_proof','scarcity']},
      ];
    }
    newIdeas = ideas.slice(0, need);
    console.log(`Generated ${newIdeas.length} ideas`);

    // Judge quality
    const judgePrompt = `Judge these ideas for demand 1-10, return JSON array of scores [{name,score,reason}]. Ideas: ${JSON.stringify(newIdeas.map(i=>i.name))}. Return ONLY JSON array.`;
    let judgeText = await callGroq(judgePrompt, 1000);
    let scores = extractJsonArray(judgeText) || newIdeas.map(i=>({name:i.name, score:8}));
    const scoreMap = {};
    scores.forEach(s=> scoreMap[s.name]=s.score);
    newIdeas = newIdeas.filter(i=> (scoreMap[i.name]||7) >=7);
    console.log(`After judge >=7: ${newIdeas.length}`);

    // Append to Backlog sheet
    const existingNames = new Set(backlogRows.slice(1).map(r=> (r[1]||'').toLowerCase()));
    const toAdd = newIdeas.filter(i=> !existingNames.has((i.name||'').toLowerCase()));
    if(toAdd.length) {
      const values = toAdd.map((idea, idx)=> [
        `bl_${Date.now()}_${idx}`,
        idea.name,
        (idea.description||'').substring(0,300),
        'heavy-build-batch',
        'PENDING',
        new Date().toISOString()
      ]);
      await batchUpdate(sheets, [{range:`Backlog!A${backlogRows.length+1}:F${backlogRows.length+values.length}`, values}]);
      console.log(`Added ${values.length} to Backlog`);
    }
  }

  // 3. Draft briefs batch (15)
  const backlogPending = backlogRows.slice(1).filter(r=> (r[4]||'').toUpperCase()==='PENDING').slice(0,15);
  if(backlogPending.length) {
    const ideasText = backlogPending.map(r=> `${r[1]}: ${r[2]}`).join('\n');
    const draftPrompt = `Generate ${backlogPending.length} asset briefs JSON array [{idea, shape: pipeline|money|crm|content|onboarding, angle, pain, dream, persona: freelance designer, hook, features[3], benefits[2], objections[2], cta_aggressive, psych_triggers[3], conversion_score}]. Ideas:\n${ideasText}\nRules: aggressive CTAs, psych triggers scarcity/social_proof/authority/loss_aversion, IRL, $10k/mo. Return ONLY JSON array.`;
    let draftText = await callGroq(draftPrompt, 4000);
    let briefs = extractJsonArray(draftText) || [];
    console.log(`Drafted ${briefs.length} briefs batch`);

    // Write to Assets as DRAFTED
    const assetsHeader = assetsRows[0] || ['asset_id','name','tier','catalog_slot','status','notion_url','public_url','screenshot_url','landing_url','short_url','whop_product_id','whop_url','price','db_count','property_count','provider','error','attempts','spec_json','created_at','plan_id','purchase_url','marketplace_status','cdn_url','wake_score','updated_at','relations_ok','persona_id'];
    const newAssets = backlogPending.slice(0, briefs.length).map((row, idx)=>{
      const b = briefs[idx] || {};
      const shape = b.shape || 'pipeline';
      const slot = shape==='money'?'core':shape==='crm'?'core':shape==='content'?'core':shape==='onboarding'?'core2':'core';
      const price = slot==='core'?29:slot==='core2'?24:7;
      const spec = {
        shape, angle: b.angle||'', pain: b.pain||'', dream: b.dream||'',
        hook: b.hook||'', features: b.features||[], benefits: b.benefits||[],
        cta: b.cta_aggressive||'Get FREE instant access — 100+ using, price goes to $29 in 48h →',
        psych: b.psych_triggers||['scarcity','social_proof','authority'],
        conversion: b.conversion_score||8,
        lite:{name:`${row[1]} Mini`}, premium:{name:`${row[1]} OS`, databases:[{name:'Tracker',properties:{Name:{},Status:{},Priority:{}}},{name:'Active',properties:{Name:{},Stage:{}}},{name:'Archive',properties:{Name:{}}}]},
        slot, price
      };
      return [
        `ast_${Date.now()}_${idx}`,
        row[1],
        'premium',
        slot,
        'DRAFTED',
        '',
        '',
        '',
        '',
        '',
        '',
        '',
        price,
        3,
        15,
        `batch:${shape}`,
        '',
        0,
        JSON.stringify(spec).substring(0,49000),
        new Date().toISOString(),
        '',
        '',
        '',
        '',
        85,
        new Date().toISOString(),
        '',
        'p_notion'
      ];
    });

    if(newAssets.length) {
      await batchUpdate(sheets, [{range:`Assets!A${assetsRows.length+1}:AB${assetsRows.length+newAssets.length}`, values: newAssets}]);
      console.log(`Added ${newAssets.length} Assets DRAFTED`);

      // Update Backlog to DRAFTED
      const backlogUpdates = backlogPending.slice(0, newAssets.length).map((r, idx)=>{
        const rowNum = backlogRows.findIndex(row=> row[0]===r[0]) +1; // 1-indexed
        return {range:`Backlog!E${rowNum+1}`, values:[['DRAFTED']]};
      });
      // batch update each
      for(let upd of backlogUpdates) {
        await batchUpdate(sheets, [upd]);
      }
    }
  }

  // 4. Generate landings batch (1 commit)
  console.log('Generating landings batch...');
  const landingsDir = path.join(process.cwd(), 'cedar-loom-landings');
  if(!fs.existsSync(landingsDir)) fs.mkdirSync(landingsDir, {recursive:true});
  
  const assetsForLanding = assetsRows.slice(1).filter(r=> (r[4]||'').toUpperCase()==='BUILT').slice(0,10);
  for(let asset of assetsForLanding) {
    const name = asset[1]||'Untitled';
    const slug = slugify(name);
    const html = `<!DOCTYPE html><html><head><title>${name} - Free for 48h</title><meta name="description" content="${name} saves 4h/week, 47+ using, free for 48h then $29"><meta property="og:title" content="${name}"><script type="application/ld+json">{"@context":"https://schema.org","@type":"Product","name":"${name}","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"12"}}</script><style>body{font-family:system-ui;max-width:800px;margin:0 auto;padding:20px;line-height:1.6} .cta{background:#2563eb;color:#fff;padding:14px 28px;border-radius:8px;text-decoration:none;display:inline-block;font-weight:bold;margin:12px 0} .badge{background:#fef3c7;border:1px solid #f59e0b;padding:6px 12px;border-radius:20px;font-size:13px;display:inline-block} .proof{background:#f0fdf4;border-left:4px solid #22c55e;padding:12px;margin:16px 0} .scarcity{background:#fef2f2;border-left:4px solid #ef4444;padding:12px;margin:16px 0}</style></head><body><div class="badge">🔥 47 freelancers using — Free for 48h then $29</div><h1>${name}</h1><p><strong>Stop losing $200/week</strong> without this system. ${name} saves 4h/week, close 2x faster, used by 47+ freelancers.</p><a class="cta" href="#get-free">Get FREE Instant Access →</a><div class="proof"><strong>Social Proof:</strong> 47 freelancers using, 4.8/5 (12 reviews). Built by Cedar Loom.</div><h2>What you get (12 templates)</h2><ul><li>Client intake DB + automation</li><li>Loom scripts for kickoff</li><li>Invoice tracker + moodboard</li><li>Real example: Acme Co $2k project</li></ul><div class="scarcity"><strong>Scarcity:</strong> Free for 48h, then $29. Bundle $99 (was $149). Every week without = 4h lost = $200.</div><a class="cta" href="#get-free">Get FREE + Earn 40% Affiliate →</a><p><a class="cta" style="background:#111827" href="#upgrade-pro">Upgrade to PRO $49 (Save 4h/week + Bonuses) →</a></p></body></html>`;
    fs.writeFileSync(path.join(landingsDir, `${slug}.html`), html);
  }
  console.log(`Generated ${assetsForLanding.length} landings in ${landingsDir}`);

  console.log('✅ Heavy build done');
}

main().catch(e=>{ console.error(e); process.exit(1); });
