const https = require('https');

const OWNER = process.env.GITHUB_OWNER || "muglikar";
const REPO = process.env.GITHUB_REPO || "ProHealthLedger";
const PAT = process.env.GITHUB_PAT || process.env.GITHUB_TOKEN;

function headers() {
  const h = { 
    "Content-Type": "application/json", 
    "User-Agent": "PHL-Logger" 
  };
  if (PAT) {
    h.Authorization = `Bearer ${PAT}`;
  }
  return h;
}

function getArgs() {
  const args = {};
  process.argv.slice(2).forEach(arg => {
    if (arg.startsWith('--')) {
      const [rawKey, ...valueParts] = arg.split('=');
      const key = rawKey.slice(2);
      const value = valueParts.join('=');
      args[key] = value;
    }
  });
  return args;
}

function makeRequest(url, method, payload = null) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: headers()
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        resolve({ status: res.statusCode, body: data });
      });
    });

    req.on('error', reject);
    if (payload) {
      req.write(JSON.stringify(payload));
    }
    req.end();
  });
}

async function run() {
  const args = getArgs();
  const activity = args.activity;
  const status = args.status;
  const details = args.details;

  if (!activity || !status) {
    console.error("Missing --activity or --status argument");
    process.exit(1);
  }

  const filePath = "data/system_logs.json";
  const url = `https://api.github.com/repos/${OWNER}/${REPO}/contents/${filePath}`;

  let logs = [];
  let sha = null;

  try {
    const getRes = await makeRequest(url, 'GET');
    if (getRes.status === 200) {
      const json = JSON.parse(getRes.body);
      sha = json.sha;
      if (json.content) {
        const decoded = Buffer.from(json.content, 'base64').toString('utf-8');
        logs = JSON.parse(decoded);
      }
    } else {
      console.log(`Failed to fetch existing logs (Status: ${getRes.status}), starting fresh.`);
    }
  } catch (err) {
    console.log("No existing logs or failed to parse, starting fresh.", err.message);
  }

  if (!Array.isArray(logs)) {
    logs = [];
  }

  const entry = {
    activity: activity,
    timestamp: new Date().toISOString(),
    status: status,
    details: details || ""
  };

  logs.unshift(entry); // Newest first

  // Keep last 50 entries
  if (logs.length > 50) {
    logs = logs.slice(0, 50);
  }

  const encoded = Buffer.from(JSON.stringify(logs, null, 2) + "\n").toString('base64');
  const payload = {
    message: `chore: update system logs for ${activity} [${status}]`,
    content: encoded
  };
  if (sha) {
    payload.sha = sha;
  }

  try {
    const putRes = await makeRequest(url, 'PUT', payload);
    if (putRes.status === 200 || putRes.status === 201) {
      console.log(`Successfully logged activity: ${activity} (${status})`);
    } else {
      console.error(`Failed to write logs to GitHub API: ${putRes.status} - ${putRes.body}`);
      process.exit(1);
    }
  } catch (err) {
    console.error("Failed to make PUT request to GitHub", err);
    process.exit(1);
  }
}

run();
