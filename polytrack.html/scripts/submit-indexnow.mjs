/*
  IndexNow submission script (manual run)
  Usage:
    INDEXNOW_KEY="<your-key>" node scripts/submit-indexnow.mjs

  Notes:
  - Generate a key and upload a key verification file named exactly <KEY>.txt at site root
    containing the key string. Example: https://polytrack.best/<KEY>.txt
  - Default endpoint: https://api.indexnow.org/indexnow
*/

import https from 'node:https';

const SITE = 'https://polytrack.best';
const HOST = 'polytrack.best';
const ENDPOINT = process.env.INDEXNOW_ENDPOINT || 'https://api.indexnow.org/indexnow';
const KEY = process.env.INDEXNOW_KEY;

if (!KEY) {
  console.error('Missing INDEXNOW_KEY env. Example: INDEXNOW_KEY="your-key" node scripts/submit-indexnow.mjs');
  process.exit(1);
}

const payload = {
  host: HOST,
  key: KEY,
  keyLocation: `${SITE}/${KEY}.txt`,
  urlList: [
    `${SITE}/`,
    `${SITE}/about-us.html`,
    `${SITE}/legal-documents.html`,
    `${SITE}/privacy-policy.html`,
    `${SITE}/terms-of-service.html`,
  ],
};

function postJson(url, json) {
  return new Promise((resolve, reject) => {
    const { hostname, pathname, search } = new URL(url);
    const data = Buffer.from(JSON.stringify(json));
    const req = https.request(
      {
        hostname,
        path: pathname + (search || ''),
        method: 'POST',
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Length': data.length,
        },
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body }));
      }
    );
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

(async () => {
  try {
    const res = await postJson(ENDPOINT, payload);
    console.log('IndexNow response:', res.status, res.body?.slice(0, 500) || '');
    if (res.status >= 200 && res.status < 300) {
      console.log('IndexNow submission OK');
    } else {
      console.error('IndexNow submission failed');
      process.exitCode = 2;
    }
  } catch (err) {
    console.error('IndexNow request error:', err.message);
    process.exit(2);
  }
})();

