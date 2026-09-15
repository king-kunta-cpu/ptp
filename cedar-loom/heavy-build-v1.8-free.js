/**
 * Cedar Loom Heavy Build v1.8-ZERO-COST - Free $0 Pipeline
 * Shottower + Pollinations + FFmpeg + GitHub Actions = $0 straight
 * 
 * Env: SHEETS_ID, SHEETS_SERVICE_JSON, GROQ_API_KEY (optional, uses Pollinations free if missing)
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { renderFromBundle } = require('./shottower');

const COUNT = parseInt(process.argv.find(a=>a.startsWith('--count'))?.split('=')[1] || process.env.COUNT || '30', 10);
const SHEETS_ID = process.env.SHEETS_ID;
const SERVICE_JSON = process.env.SHEETS_SERVICE_JSON;
const GROQ_KEY = process.env.GROQ_API_KEY;

if(!SHEETS_ID) console.warn('Missing SHEETS_ID, using mock');
if(!SERVICE_JSON) console.warn('Missing SHEETS_SERVICE_JSON, using mock');

async function getSheets() {
  if(!SERVICE_JSON) return null;
  try {
    const creds = JSON.parse(SERVICE_JSON);
    const auth = new google.auth.GoogleAuth({
      credentials: creds,
      scopes: ['https://www.googleapis.com/auth/spreadsheets']
    });
    const client = await auth.getClient();
    return google.sheets({version:'v4', auth:client});
  } catch(e) {
    console.warn('Sheets auth failed, mock mode', e.message);
    return null;
  }
}

async function batchGet(sheets, ranges) {
  if(!sheets) return ranges.map(()=>({values:[]}));
  const res = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: SHEETS_ID,
    ranges
  });
  return res.data.valueRanges;
}

async function batchUpdate(sheets, data) {
  if(!sheets) {
    console.log('Mock batchUpdate', data.length, 'ranges');
    return {};
  }
  const res = await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEETS_ID,
    resource: { valueInputOption: 'RAW', data }
  });
  return res.data;
}

async function callFreeLLM(prompt, maxTokens=3000) {
  // Try Pollinations free first (no key, $0)
  try {
    const url = `https://text.pollinations.ai/${encodeURIComponent(prompt.substring(0,2000))}`;
    const res = await fetch(url, {headers:{'User-Agent':'CedarLoom-v1.8'}});
    if(res.ok) {
      const text = await res.text();
      if(text && text.length>10) {
        console.log('✅ Free LLM Pollinations used');
        return text;
      }
    }
  } catch(e) {
    console.warn('Pollinations LLM failed', e.message);
  }
  
  // Fallback Groq free tier
  if(GROQ_KEY) {
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
      console.warn('Groq failed', e.message);
    }
  }
  
  return null;
}

function extractJsonArray(text) {
  if(!text) return null;
  const start = text.indexOf('[');
  const end = text.lastIndexOf(']');
  if(start===-1 || end===-1) return null;
  try {
    return JSON.parse(text.substring(start, end+1));
  } catch(e) {
    let head = text.substring(start, end+1).replace(/,\s*$/, '');
    const open = (head.match(/\[/g)||[]).length;
    const close = (head.match(/\]/g)||[]).length;
    for(let i=0;i<open-close;i++) head+=']';
    try { return JSON.parse(head); } catch(e2){ return null; }
  }
}

function slugify(s){ return String(s||'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,''); }

async function main(){
  console.log(`🌲 Cedar Loom Heavy Build v1.8-ZERO-COST count=${COUNT} $0 straight`);
  console.log(`Shottower + Pollinations + FFmpeg + GitHub Actions = $0`);
  
  const sheets = await getSheets();
  
  // 1. Read Backlog
  const ranges = ['Backlog!A1:F1000', 'Config!A1:C200', 'Assets!A1:AB1000', 'Videos!A1:I1000'];
  const [backlogRange, configRange, assetsRange, videosRange] = await batchGet(sheets, ranges);
  const backlogRows = backlogRange.values || [];
  const assetsRows = assetsRange.values || [];
  const videosRows = videosRange.values || [];
  
  const pendingCount = backlogRows.slice(1).filter(r=> (r[4]||'').toUpperCase()==='PENDING').length;
  console.log(`Backlog pending: ${pendingCount}`);
  
  // 2. Generate ideas free via Pollinations
  let newIdeas = [];
  if(pendingCount < 20) {
    const need = Math.min(COUNT, 30);
    const prompt = `Generate ${need} IRL freelance/business Notion template ideas JSON array [{name,description,score,demand_score,monetization:{free,starter,pro},pain,dream,hook,features:[3],benefits:[2],cta_aggressive,psych_triggers:[3]}]. Rules: IRL only, no forge/nexus, $10k/mo month 3, low bandwidth, aggressive CTA, psych triggers scarcity/social_proof/authority/loss_aversion. Return ONLY JSON array.`;
    let text = await callFreeLLM(prompt, 4000);
    let ideas = extractJsonArray(text);
    if(!ideas || !ideas.length) {
      console.log('LLM fallback ideas');
      ideas = [
        {name:'Client Pipeline Mini', description:'Free mini CRM for designers', score:8, demand_score:8, pain:'Losing leads in DMs', dream:'Close 3x faster', hook:'Steal my 10-min pipeline', features:['Lead DB','Proposal tracker','Invoice log'], benefits:['Save 4h/week','Close 2x faster'], cta_aggressive:'Free for 48h then $29 →', psych_triggers:['scarcity','social_proof','authority']},
        {name:'Invoice Tracker Mini', description:'Free invoice log', score:7, demand_score:7, pain:'Chasing invoices 2h/week', dream:'Get paid in 24h', hook:'Stop losing $200/week', features:['Invoice DB','Status tracker','Reminder scripts'], benefits:['Get paid faster','Never lose invoice'], cta_aggressive:'Free for 48h, 100+ using →', psych_triggers:['loss_aversion','social_proof','scarcity']},
      ];
    }
    newIdeas = ideas.slice(0, need);
    console.log(`Generated ${newIdeas.length} ideas via free LLM $0`);
    
    // Append to Backlog
    const existingNames = new Set(backlogRows.slice(1).map(r=> (r[1]||'').toLowerCase()));
    const toAdd = newIdeas.filter(i=> !existingNames.has((i.name||'').toLowerCase()));
    if(toAdd.length && sheets) {
      const values = toAdd.map((idea, idx)=> [
        `bl_${Date.now()}_${idx}`,
        idea.name,
        (idea.description||'').substring(0,300),
        'heavy-build-v1.8-free',
        'PENDING',
        new Date().toISOString()
      ]);
      await batchUpdate(sheets, [{range:`Backlog!A${backlogRows.length+1}:F${backlogRows.length+values.length}`, values}]);
      console.log(`Added ${values.length} to Backlog`);
    }
  }
  
  // 3. Generate free images via Pollinations + free videos via Shottower FFmpeg
  console.log(`\n🎨 Generating free images via Pollinations $0...`);
  const assetsForMedia = assetsRows.slice(1).filter(r=> (r[4]||'').toUpperCase()==='BUILT').slice(0,5);
  
  for(let asset of assetsForMedia) {
    const assetId = asset[0];
    const assetName = asset[1];
    console.log(`\n--- ${assetName} (${assetId}) ---`);
    
    // Free images: 3 via Pollinations
    const prompts = [
      `Notion template ${assetName} minimal professional dashboard for freelance designers 4k`,
      `Freelance designer workspace clean productivity`,
      `Client onboarding system kanban board`
    ];
    const shots = prompts.map(p => `https://image.pollinations.ai/prompt/${encodeURIComponent(p)}?width=1280&height=720&nologo=true&seed=${Math.floor(Math.random()*1000000)}`);
    console.log(`  Images: ${shots.length} via Pollinations $0`);
    
    // Free video via Shottower FFmpeg $0
    const outputPath = path.join(__dirname, `video-${slugify(assetName)}.mp4`);
    try {
      // Ensure ffmpeg exists
      execSync('ffmpeg -version', {stdio:'ignore'});
      const result = await renderFromBundle({bundle_id:assetId, name:assetName}, shots, outputPath);
      if(result.ok) {
        console.log(`  Video: ${outputPath} ${result.duration}s via Shottower FFmpeg $0`);
        
        // Update Videos sheet with mp4_url (local path, or upload to R2/GitHub)
        if(sheets) {
          const videoRow = videosRows.findIndex(r=> r[0]===assetId);
          if(videoRow !== -1) {
            await batchUpdate(sheets, [{range:`Videos!C${videoRow+1}`, values:[[outputPath]]}]);
          } else {
            await batchUpdate(sheets, [{range:`Videos!A${videosRows.length+1}:I${videosRows.length+1}`, values:[[assetId, `shottower-${Date.now()}`, outputPath, '', '', 'RENDERED', 0, new Date().toISOString(), 'shottower-free']]}]);
          }
        }
      }
    } catch(e) {
      console.warn(`  FFmpeg not available or failed: ${e.message}, skipping video, using images only`);
      // Still update with images as cdn_url
    }
  }
  
  console.log(`\n✅ Heavy Build v1.8-ZERO-COST done $0 straight`);
  console.log(`- Ideas: ${newIdeas.length} via Pollinations free LLM $0`);
  console.log(`- Images: ${assetsForMedia.length*3} via Pollinations free image $0`);
  console.log(`- Videos: ${assetsForMedia.length} via Shottower FFmpeg self-hosted $0 (GitHub Actions free 2000m/month)`);
  console.log(`- Cost: $0 straight, cafe time on your dime`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
