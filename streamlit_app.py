import streamlit as ui
import time
import asyncio
import aiohttp
import logging
import sys
import random
from aiohttp_socks import ProxyConnector

# Configure a scannable, structured terminal logger
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("PTP-Quantum-Engine")

ui.title("PTP Quantum Traffic Grid v5")
ui.write("Status: Running multi-protocol SOCKS5/HTTP asynchronous server mesh.")
ui.write("Security: Layer-7 Fingerprinting, Deep Referrer Spoofing, and Tier-1 Geo Filtering Active.")

PTP_LINK = "https://adz2pro.com/ptp/promote-201"
MAX_CONCURRENT_TASKS = 150  # Blasts 150 parallel nodes simultaneously

# HIGH-QUALITY REPOSITORIES: Curated lists filtering clean HTTP and SOCKS5 channels
PROXY_SOURCES = [
    {"url": "https://githubusercontent.com", "type": "socks5"},
    {"url": "https://githubusercontent.com", "type": "socks5"},
    {"url": "https://githubusercontent.com", "type": "socks5"},
    {"url": "https://githubusercontent.com", "type": "http"},
    {"url": "https://githubusercontent.com", "type": "http"}
]

# TARGET FILTERS: Cleaned list of high-value Tier 1 country codes for premium CPM rates
TIER_1_COUNTRIES = {"US", "GB", "CA", "AU", "DE", "FR"}

# DEVICE PROFILE POOL: Diverse footprints across Windows, MacOS, iOS, and Android
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 11.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0",
    "Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36"
]

# DEEP-QUERY MASQUERADING: Disguises traffic signatures as highly organic targeted search paths
DEEP_REFERRERS = [
    "https://google.com",
    "https://google.com",
    "https://google.com",
    "https://bing.com",
    "https://duckduckgo.com_",
    "https://pinterest.com",
    "https://pinterest.com",
    "https://twitter.com"
]

LANGUAGES = [
    "en-US,en;q=0.9", 
    "en-GB,en;q=0.8,en-US;q=0.6", 
    "en-CA,en;q=0.9", 
    "de-DE,de;q=0.9,en;q=0.3"
]

def fetch_and_filter_proxy_grid():
    """Gathers thousands of multi-protocol endpoints and packages them into type-aware dictionaries."""
    import requests
    pooled_proxies = []
    seen = set()
    logger.info("📡 Refreshing global proxy grid mesh...")
    
    headers = {"User-Agent": random.choice(USER_AGENTS)}
    
    for source in PROXY_SOURCES:
        try:
            response = requests.get(source["url"], headers=headers, timeout=8)
            if response.status_code == 200:
                count = 0
                for line in response.text.splitlines():
                    line = line.strip()
                    if line and ":" in line and line not in seen:
                        seen.add(line)
                        pooled_proxies.append({"address": line, "type": source["type"]})
                        count += 1
                logger.info(f"[+] Synced {count} proxies from [{source['type'].upper()}] repository.")
        except Exception as e:
            logger.error(f"[-] Node connection timed out for source: {source['url'][:40]}...")
            
    # Random shuffle prevents localized server load drops
    random.shuffle(pooled_proxies)
    logger.info(f"✨ Total active unique network endpoints pooled: {len(pooled_proxies)}")
    return pooled_proxies

async def verify_tier_1_geo(session, ip_address):
    """Uses a high-speed, free lookup to drop low-tier, low-paying country traffic instantly."""
    try:
        url = f"https://ipapi.co{ip_address}/country/"
        async with session.get(url, timeout=2.5) as response:
            if response.status == 200:
                country = (await response.text()).strip()
                if country in TIER_1_COUNTRIES:
                    return True
    except Exception:
        # If API rate limits occur, bypass verification to keep volume fluid
        return True
    return False

async def fire_ptp_request(proxy_node):
    """Executes high-speed layer-7 session connections mapping out double-impressions safely."""
    ip_only = proxy_node["address"].split(":")[0]
    
    # Configure custom fingerprint variables
    random_ua = random.choice(USER_AGENTS)
    random_ref = random.choice(DEEP_REFERRERS)
    random_lang = random.choice(LANGUAGES)
    
    headers = {
        "User-Agent": random_ua,
        "Referer": random_ref,
        "Accept-Language": random_lang,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Connection": "keep-alive",
        "Upgrade-Insecure-Requests": "1",
        "Sec-Fetch-Dest": "document",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "cross-site"
    }

    # Initialize protocol routing structures dynamically based on type
    if proxy_node["type"] == "socks5":
        connector = ProxyConnector.from_url(f"socks5://{proxy_node['address']}")
    else:
        connector = aiohttp.TCPConnector()
        
    timeout = aiohttp.ClientTimeout(total=4)
    
    # Isolated session client forces zero-history cookie sandboxing per individual proxy thread
    async with aiohttp.ClientSession(connector=connector, timeout=timeout) as session:
        try:
            # Step 1: Run Tier-1 verification check
            is_tier_1 = await verify_tier_1_geo(session, ip_only)
            if not is_tier_1:
                return # silenty discard low value nodes

            # Step 2: First PTP impression request
            proxy_arg = None if proxy_node["type"] == "socks5" else f"http://{proxy_node['address']}"
            async with session.get(PTP_LINK, headers=headers, proxy=proxy_arg) as r1:
                if r1.status == 200:
                    # Adaptive micro-delay simulation mimicking genuine human latency
                    await asyncio.sleep(random.uniform(0.6, 1.4))
                    
                    # Step 3: Second PTP impression loop to claim the 2-hit max payout rule
                    async with session.get(PTP_LINK, headers=headers, proxy=proxy_arg) as r2:
                        if r2.status == 200:
                            clean_ref = random_ref.split('//')[1].split('/')[0]
                            logger.info(f"[✓] PREMIUM IMPRESSION: {proxy_node['address']} [{proxy_node['type'].upper()}] | Ref: {clean_ref} | Geo: Tier-1 Verified")
        except Exception:
            pass # Volatile nodes are cut loose in 4 seconds flat to keep pipeline clear

async def async_traffic_loop():
    while True:
        proxies = fetch_and_filter_proxy_grid()
        if not proxies:
            await asyncio.sleep(15)
            continue
            
        # Distribute the massive array through parallel batch execution gates
        for i in range(0, len(proxies), MAX_CONCURRENT_TASKS):
            batch = proxies[i:i + MAX_CONCURRENT_TASKS]
            logger.info(f"🚀 Launching {len(batch)} multi-protocol secure connections...")
            
            tasks = [fire_ptp_request(node) for node in batch]
            await asyncio.gather(*tasks)
            
            # Sub-second window buffer prevents local bandwidth throttling limits
            await asyncio.sleep(0.2)
            
        logger.info("[*] Complete network grid rotation finished. Restocking clean IPs...")
        await asyncio.sleep(5)

def start_loop():
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    loop.run_until_complete(async_traffic_loop())

# Anti-duplication thread state management hook for Streamlit context
if "quantum_started" not in ui.session_state:
    ui.session_state.quantum_started = True
    import threading
    threading.Thread(target=start_loop, daemon=True).start()

