#!/usr/bin/env node
// check-sitemap-urls.mjs
// 解析 sitemap.xml 并对每个 URL 做一次 HEAD（失败则 GET）以输出 TSV: url\tstatus\tfinalUrl

import fs from 'node:fs/promises';
import http from 'node:http';
import https from 'node:https';
import path from 'node:path';

function httpGet(u, method = 'HEAD') {
  return new Promise((resolve, reject) => {
    const m = u.startsWith('https:') ? https : http;
    const url = new URL(u);
    const req = m.request(url, { method }, (res) => {
      const chunks = [];
      res.on('data', (d) => chunks.push(d));
      res.on('end', () => resolve({ status: res.statusCode || 0, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.end();
  });
}

async function followOnce(u) {
  try {
    const h = await httpGet(u, 'HEAD');
    if (h.status >= 300 && h.status < 400 && h.headers.location) {
      const next = new URL(h.headers.location, u).toString();
      const g = await httpGet(next, 'HEAD');
      return { url: u, finalUrl: next, finalStatus: g.status, redirected: true };
    }
    return { url: u, finalUrl: u, finalStatus: h.status, redirected: false };
  } catch (e) {
    // 退回到 GET
    try {
      const g = await httpGet(u, 'GET');
      return { url: u, finalUrl: u, finalStatus: g.status, redirected: false };
    } catch (e2) {
      return { url: u, finalUrl: u, finalStatus: 0, redirected: false, error: e2.message || e.message };
    }
  }
}

async function main() {
  const xml = await fs.readFile(path.resolve(process.cwd(), 'sitemap.xml'), 'utf8');
  const locs = Array.from(xml.matchAll(/<loc>\s*([^<]+)\s*<\/loc>/g)).map((m) => m[1].trim());
  const urls = Array.from(new Set(locs));
  for (const u of urls) {
    const r = await followOnce(u);
    console.log(`${r.url}\t${r.finalStatus}\t${r.finalUrl}`);
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });

