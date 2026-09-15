/**
 * Cedar Loom Screenshot Free $0 - Actual Asset Screenshots
 * Best tricks for $0 straight, no paid APIs
 * 
 * Free providers:
 * 1. WordPress mShots: https://s0.wp.com/mshots/v1/{url}?w=1280&h=720 - free, no key, unlimited, used by WordPress.com
 * 2. thum.io: https://image.thum.io/get/width/1280/crop/720/noanimate/{url} - free, no key
 * 3. Microlink: https://api.microlink.io/?url={url}&screenshot=true - free 50/day no key
 * 4. GitHub Actions Puppeteer: free 2000m/month, real Chrome screenshot
 * 5. Pollinations fallback: generate image from prompt if URL screenshot fails
 */

const fs = require('fs');
const path = require('path');

function freeScreenshotWordPress(url, width=1280, height=720) {
  if(!url) return null;
  // WordPress mShots free, no key, unlimited - best trick #1
  return `https://s0.wp.com/mshots/v1/${encodeURIComponent(url)}?w=${width}&h=${height}`;
}

function freeScreenshotThumIO(url, width=1280, height=720) {
  if(!url) return null;
  // thum.io free, no key - best trick #2, more reliable than mShots for JS-heavy
  return `https://image.thum.io/get/width/${width}/crop/${height}/noanimate/${url}`;
}

function freeScreenshotMicrolink(url) {
  if(!url) return null;
  // Microlink free 50/day no key - best trick #3, returns high quality
  return `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&meta=false&embed=screenshot.url`;
}

async function freeScreenshotPuppeteer(url, outputPath) {
  // GitHub Actions Puppeteer free 2000m/month - best trick #4, real Chrome, handles Notion JS
  // Requires: npm install puppeteer
  try {
    const puppeteer = require('puppeteer');
    const browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    const page = await browser.newPage();
    await page.setViewport({width: 1280, height: 720});
    await page.goto(url, {waitUntil: 'networkidle2', timeout: 30000});
    // Wait for Notion to load
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({path: outputPath, fullPage: false});
    await browser.close();
    console.log(`✅ Puppeteer screenshot ${url} -> ${outputPath} $0`);
    return outputPath;
  } catch(e) {
    console.warn(`Puppeteer failed ${url}: ${e.message}, install with npm i puppeteer`);
    return null;
  }
}

function freeImagePollinations(prompt, width=1280, height=720) {
  return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=${width}&height=${height}&nologo=true&seed=${Math.floor(Math.random()*1000000)}`;
}

// Main: take screenshot of actual asset with fallbacks $0
function takeScreenshotFree(asset) {
  // asset: {notion_url, public_url, landing_url, cdn_url, screenshot_url, name}
  const url = asset.landing_url || asset.public_url || asset.notion_url || asset.cdn_url || '';
  const name = asset.name || 'Notion template';
  
  if(!url || url.includes('dryrun') || url.includes('failed:')) {
    // No real URL, fallback to Pollinations generated image $0
    return freeImagePollinations(`Notion template ${name} minimal professional dashboard for freelance designers 4k`);
  }
  
  // Try free screenshot APIs in order, all $0
  const providers = [
    freeScreenshotWordPress(url), // $0, no key, unlimited - primary
    freeScreenshotThumIO(url), // $0, no key - secondary
    freeImagePollinations(`Screenshot of ${name} Notion template dashboard minimal`) // fallback
  ];
  
  // Return primary, but store all as options
  return {
    primary: providers[0],
    fallback: providers[1],
    generated: providers[2],
    url: url,
    method: 'wordpress-mshots-free',
    all: providers
  };
}

// For heavy-build.js: batch screenshot assets via Puppeteer if available, else via free APIs
async function batchScreenshotAssets(assets, outputDir='screenshots') {
  if(!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, {recursive:true});
  
  const results = [];
  for(let asset of assets) {
    const slug = (asset.name||'asset').toLowerCase().replace(/[^a-z0-9]+/g,'-');
    const outputPath = path.join(outputDir, `${slug}.jpg`);
    
    // Try Puppeteer first for real screenshot if URL exists
    const url = asset.landing_url || asset.public_url || asset.notion_url;
    if(url && !url.includes('dryrun')) {
      const puppeteerResult = await freeScreenshotPuppeteer(url, outputPath);
      if(puppeteerResult) {
        results.push({asset_id: asset.asset_id, path: outputPath, url: url, provider: 'puppeteer-free', method: 'real-chrome'});
        continue;
      }
    }
    
    // Fallback to free API URLs $0
    const freeResult = takeScreenshotFree(asset);
    results.push({
      asset_id: asset.asset_id,
      url: freeResult.primary || freeResult,
      fallback: freeResult.fallback,
      generated: freeResult.generated,
      provider: 'wordpress-mshots-free',
      method: 'free-api'
    });
  }
  
  return results;
}

module.exports = {
  freeScreenshotWordPress,
  freeScreenshotThumIO,
  freeScreenshotMicrolink,
  freeScreenshotPuppeteer,
  freeImagePollinations,
  takeScreenshotFree,
  batchScreenshotAssets
};

// CLI test
if(require.main === module) {
  const testUrl = process.argv[2] || 'https://cedar-loom.simalidudu.workers.dev';
  console.log('=== Cedar Loom Screenshot Free $0 Test ===\n');
  console.log('Test URL:', testUrl);
  console.log('\n1. WordPress mShots free $0 (no key, unlimited):');
  console.log('   ', freeScreenshotWordPress(testUrl));
  console.log('\n2. thum.io free $0 (no key):');
  console.log('   ', freeScreenshotThumIO(testUrl));
  console.log('\n3. Microlink free 50/day $0:');
  console.log('   ', freeScreenshotMicrolink(testUrl));
  console.log('\n4. Pollinations fallback $0:');
  console.log('   ', freeImagePollinations('Notion template Client Pipeline minimal'));
  console.log('\n5. takeScreenshotFree asset:');
  console.log('   ', takeScreenshotFree({name:'Client Pipeline Mini', landing_url:testUrl}));
  console.log('\n✅ All $0, no paid APIs, cafe on your dime');
}
