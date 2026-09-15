/**
 * Cedar Loom Heavy Build v1.8a-SCREENSHOT-FREE - Actual Asset Screenshots $0
 * Free screenshot via WordPress mShots + thum.io + Puppeteer + Pollinations
 */

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const COUNT = parseInt(process.argv.find(a=>a.startsWith('--count'))?.split('=')[1] || process.env.COUNT || '30', 10);
const SHEETS_ID = process.env.SHEETS_ID;
const SERVICE_JSON = process.env.SHEETS_SERVICE_JSON;

async function getSheets() {
  if(!SERVICE_JSON) return null;
  try {
    const creds = JSON.parse(SERVICE_JSON);
    const auth = new google.auth.GoogleAuth({ credentials: creds, scopes: ['https://www.googleapis.com/auth/spreadsheets'] });
    const client = await auth.getClient();
    return google.sheets({version:'v4', auth:client});
  } catch(e) { console.warn('Sheets auth failed mock', e.message); return null; }
}

function freeScreenshotWordPress(url, w=1280, h=720) {
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${w}&h=${h}`;
}
function freeScreenshotThumIO(url, w=1280, h=720) {
  return `https://image.thum.io/get/width/${w}/crop/${h}/noanimate/${url}`;
}
function freeImagePollinations(prompt, w=1280, h=720) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${w}&height=${h}&nologo=true&seed=${Math.floor(Math.random()*1000000)}`;
}

async function screenshotWithPuppeteer(url, outputPath) {
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();
    await page.setViewport({width:1280, height:720});
    await page.goto(url, {waitUntil:'networkidle2', timeout:30000});
    await new Promise(r=>setTimeout(r,3000));
    await page.screenshot({path:outputPath});
    await browser.close();
    console.log(`✅ Puppeteer screenshot ${url} -> ${outputPath} $0`);
    return outputPath;
  } catch(e) {
    console.warn(`Puppeteer failed ${url}: ${e.message}`);
    return null;
  }
}

async function main(){
  console.log(`🌲 Cedar Loom Heavy Build v1.8a-SCREENSHOT-FREE $0`);
  console.log(`Actual asset screenshots via free APIs + Puppeteer`);
  
  const sheets = await getSheets();
  let assets = [];
  
  if(sheets) {
    const res = await sheets.spreadsheets.values.get({ spreadsheetId: SHEETS_ID, range: 'Assets!A1:AB1000' });
    const rows = res.data.values || [];
    const headers = rows[0] || [];
    assets = rows.slice(1).map((r,i)=> {
      const o={_row:i+2};
      headers.forEach((h,idx)=> o[h]=r[idx]);
      return o;
    }).filter(a=> String(a.status||'').toUpperCase()==='BUILT' || String(a.status||'').toUpperCase()==='LIVED');
  } else {
    assets = [{asset_id:'test', name:'Client Kickoff Mini-OS', landing_url:'https://cedar-loom.simalidudu.workers.dev', status:'BUILT'}];
  }
  
  console.log(`Found ${assets.length} assets to screenshot`);
  
  const screenshotsDir = path.join(__dirname, 'screenshots');
  if(!fs.existsSync(screenshotsDir)) fs.mkdirSync(screenshotsDir, {recursive:true});
  
  for(let asset of assets.slice(0,10)) {
    const url = asset.landing_url || asset.public_url || asset.notion_url;
    const name = asset.name || asset.asset_id;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g,'-');
    
    console.log(`\n--- ${name} ---`);
    console.log(`URL: ${url}`);
    
    if(!url || url.includes('dryrun')) {
      const poll = freeImagePollinations(`Notion template ${name} minimal professional dashboard 4k`);
      console.log(`No URL, fallback Pollinations $0: ${poll.substring(0,80)}...`);
      continue;
    }
    
    // Try Puppeteer real screenshot $0 (GitHub Actions free)
    const outputPath = path.join(screenshotsDir, `${slug}.jpg`);
    let screenshotPath = null;
    try { execSync('which chromium || which google-chrome || echo no-chrome', {stdio:'ignore'}); } catch(e){}
    
    // Check if puppeteer available
    try {
      require.resolve('puppeteer');
      screenshotPath = await screenshotWithPuppeteer(url, outputPath);
    } catch(e) {
      console.log(`Puppeteer not installed, using free API URLs $0`);
    }
    
    // Free API URLs $0 - always work, no key, unlimited
    const wp = freeScreenshotWordPress(url);
    const thum = freeScreenshotThumIO(url);
    const poll = freeImagePollinations(`Screenshot of ${name} Notion template`);
    
    console.log(`WordPress mShots $0: ${wp.substring(0,100)}...`);
    console.log(`thum.io $0: ${thum.substring(0,100)}...`);
    console.log(`Pollinations fallback $0: ${poll.substring(0,80)}...`);
    if(screenshotPath) console.log(`Puppeteer REAL $0: ${screenshotPath}`);
    
    // Update sheet with screenshot_url if missing
    if(sheets && !asset.screenshot_url) {
      const screenshotUrl = screenshotPath ? `https://raw.githubusercontent.com/${process.env.GH_REPO||'owner/repo'}/main/screenshots/${slug}.jpg` : wp;
      try {
        const headersRes = await sheets.spreadsheets.values.get({ spreadsheetId: SHEETS_ID, range: 'Assets!A1:AB1' });
        const headers = headersRes.data.values[0];
        const shotIdx = headers.indexOf('screenshot_url');
        const cdnIdx = headers.indexOf('cdn_url');
        if(shotIdx>=0) {
          await sheets.spreadsheets.values.update({
            spreadsheetId: SHEETS_ID,
            range: `Assets!${String.fromCharCode(65+shotIdx)}${asset._row}`,
            valueInputOption:'RAW',
            resource:{values:[[screenshotUrl]]}
          });
          console.log(`Updated sheet screenshot_url $0`);
        }
      } catch(e) { console.warn(`Sheet update failed: ${e.message}`); }
    }
  }
  
  console.log(`\n✅ Screenshot Free $0 done`);
  console.log(`- WordPress mShots: https://s0.wp.com/mshots/v1/{url}?w=1280&h=720 free no key unlimited`);
  console.log(`- thum.io: https://image.thum.io/get/width/1280/crop/720/noanimate/{url} free no key`);
  console.log(`- Microlink: https://api.microlink.io/?url={url}&screenshot=true free 50/day`);
  console.log(`- Puppeteer: GitHub Actions free 2000m/month real Chrome screenshot`);
  console.log(`- Pollinations: fallback generated image free no key`);
  console.log(`- Total: $0 straight, actual asset screenshots, cafe on your dime`);
}

main().catch(e=>{ console.error(e); process.exit(1); });
