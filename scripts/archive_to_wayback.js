const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE_URL = 'https://prohealthledger.org';
const PROFILES_DIR = path.join(process.cwd(), 'data', 'profiles');

async function submitToWayback(url) {
  return new Promise((resolve, reject) => {
    const saveUrl = `https://web.archive.org/save/${url}`;
    
    // We send a simple GET request to the Wayback Machine save endpoint
    https.get(saveUrl, (res) => {
      // Wayback Machine usually responds with a 200 OK or a 302 Redirect when successful
      if (res.statusCode === 200 || res.statusCode === 302 || res.statusCode === 429) {
        console.log(`[SUCCESS/RATE-LIMIT] Archived: ${url} (Status: ${res.statusCode})`);
        resolve(res.statusCode);
      } else {
        console.error(`[ERROR] Failed to archive: ${url} (Status: ${res.statusCode})`);
        resolve(res.statusCode);
      }
    }).on('error', (err) => {
      console.error(`[REQUEST ERROR] Failed to hit archive for: ${url}`, err.message);
      resolve(null);
    });
  });
}

async function runArchival() {
  console.log('Starting daily archival to the Wayback Machine...');
  
  let profiles = [];
  try {
    const indexPath = path.join(PROFILES_DIR, '_index.json');
    if (fs.existsSync(indexPath)) {
      const rawData = fs.readFileSync(indexPath, 'utf-8');
      profiles = JSON.parse(rawData);
    }
  } catch (err) {
    console.error('Failed to read profiles index.', err);
    process.exit(1);
  }

  // Add the core platform pages to the archive list
  const urlsToArchive = [
    `${SITE_URL}/`,
    `${SITE_URL}/directory`,
    `${SITE_URL}/reports/tech-leadership-conduct-2026`,
    `${SITE_URL}/transparency`
  ];

  // Add all profile pages to the archive list
  for (const profile of profiles) {
    const rawUrl = typeof profile.linkedin_url === "string" ? profile.linkedin_url : "";
    const urlSlug = rawUrl.match(/linkedin\.com\/in\/([a-zA-Z0-9_-]+)/)?.[1] || profile.slug || profile.public_name;
    
    if (urlSlug) {
      urlsToArchive.push(`${SITE_URL}/p/directory/directory/${encodeURIComponent(urlSlug)}`);
    }
  }

  console.log(`Found ${urlsToArchive.length} URLs to archive.`);

  // Process sequentially to avoid aggressive rate-limiting from the Internet Archive
  for (let i = 0; i < urlsToArchive.length; i++) {
    const url = urlsToArchive[i];
    console.log(`Archiving (${i + 1}/${urlsToArchive.length}): ${url}`);
    
    await submitToWayback(url);
    
    // Wait 5 seconds between requests to respect Wayback Machine's rate limits
    await new Promise(r => setTimeout(r, 5000));
  }

  console.log('✅ Archival process complete!');
}

runArchival();
