#!/usr/bin/env node
// normalize-site-urls.mjs
// 仅规范化 sitemap.xml 中的 URL：
// - 强制 https
// - 去掉末尾的 /index.html（保留根路径 /）
// - 支持 dry-run（默认）与 --write 应用变更
// - 在写入前自动备份 sitemap.xml 为 sitemap.xml.bak.YYYYMMDDHHmmss

import fs from 'node:fs/promises';
import path from 'node:path';

const args = process.argv.slice(2);
const WRITE = args.includes('--write') || args.includes('-w');
const SITEMAP = args.includes('--sitemap')
  ? args[args.indexOf('--sitemap') + 1]
  : 'sitemap.xml';

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() +
    pad(d.getMonth() + 1) +
    pad(d.getDate()) +
    pad(d.getHours()) +
    pad(d.getMinutes()) +
    pad(d.getSeconds())
  );
}

function forceHttps(u) {
  try {
    const x = new URL(u);
    if (x.protocol !== 'https:') x.protocol = 'https:';
    return x.toString();
  } catch {
    // 非法/相对 URL，按原值返回
    return u;
  }
}

function stripIndexHtml(u) {
  try {
    const x = new URL(u);
    if (x.pathname.endsWith('/index.html')) {
      x.pathname = x.pathname.replace(/\/index\.html$/, '/');
    }
    return x.toString();
  } catch {
    return u;
  }
}

function normalizeUrl(u) {
  let v = String(u).trim();
  v = forceHttps(v);
  v = stripIndexHtml(v);
  return v;
}

async function backupFile(p) {
  const dir = path.dirname(p);
  const base = path.basename(p);
  const bak = path.join(dir, `${base}.bak.${ts()}`);
  const buf = await fs.readFile(p);
  await fs.writeFile(bak, buf);
  return bak;
}

async function main() {
  let xml;
  try {
    xml = await fs.readFile(SITEMAP, 'utf8');
  } catch (e) {
    console.error(`[normalize-site-urls] 读取失败: ${SITEMAP} - ${e.message}`);
    process.exit(1);
  }

  // 匹配 <loc> 与 <image:loc>
  const patterns = [
    { tag: 'loc', re: /<loc>\s*([^<]+)\s*<\/loc>/g },
    { tag: 'image:loc', re: /<image:loc>\s*([^<]+)\s*<\/image:loc>/g },
  ];

  const changes = [];
  let out = xml;

  for (const { tag, re } of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(xml)) !== null) {
      const full = m[0];
      const url = m[1];
      const norm = normalizeUrl(url);
      if (norm !== url) {
        const newFrag = full.replace(url, norm);
        out = out.replace(full, newFrag);
        changes.push({ tag, from: url, to: norm });
      }
    }
  }

  if (changes.length === 0) {
    console.log('[normalize-site-urls] 未发现需规范化的 URL。');
    return;
  }

  console.log(`[normalize-site-urls] 发现 ${changes.length} 处规范化：`);
  for (const c of changes) {
    console.log(`- [${c.tag}] ${c.from}  =>  ${c.to}`);
  }

  if (!WRITE) {
    console.log('\n提示：当前为 dry-run 预览。加入 --write 才会实际写入，并自动备份 sitemap。');
    return;
  }

  const bak = await backupFile(SITEMAP);
  await fs.writeFile(SITEMAP, out, 'utf8');
  console.log(`[normalize-site-urls] 已写入：${SITEMAP}（备份：${bak}）`);
}

main().catch((e) => {
  console.error(e.stack || e.message);
  process.exit(1);
});
