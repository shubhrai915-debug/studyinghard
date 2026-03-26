#!/usr/bin/env node
// scripts/gen-cache-manifest.mjs
// 生成用于 Service Worker 预缓存的资源清单
// 输出: assets/cache-manifest.json

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

const PROJECT_ROOT = process.cwd();
const OUT_PATH = path.join(PROJECT_ROOT, 'assets', 'cache-manifest.json');

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function toPublicPath(absPath) {
  const rel = path.relative(PROJECT_ROOT, absPath);
  // 统一使用 POSIX 分隔符，前置 '/'
  return '/' + rel.split(path.sep).join('/');
}

async function main() {
  // 需要缓存的模式：根目录 HTML、blog 下 HTML、关键文本文件、assets 静态资源
  const patterns = [
    '*.html',
    'blog/**/*.html',
    'manifest.json',
    'robots.txt',
    'sitemap.xml',
    'ads.txt',
    'sw.js',
    'assets/**/*.{css,js,svg,png,jpg,jpeg,webmanifest,woff2,ico}',
  ];

  const files = await globby(patterns, { gitignore: true, expandDirectories: false, absolute: true });
  const skip = new Set([
    'header.html',
    'footer.html',
    'index_html_lines.txt',
  ]);

  let staticFiles = Array.from(
    new Set(
      files
        .filter((f) => !skip.has(path.basename(f)))
        .map((f) => toPublicPath(f))
        // 确保首页与离线页优先保留
        .sort((a, b) => a.localeCompare(b))
    )
  );

  // 强制确保常用样式存在于清单（避免被 .gitignore 影响的遗漏）
  const ensureList = ['/assets/styles.css'];
  for (const p of ensureList) {
    try {
      await fs.access(path.join(PROJECT_ROOT, p));
      if (!staticFiles.includes(p)) staticFiles.push(p);
    } catch {}
  }

  // 将根路径 '/' 放在首位，确保导航可用
  if (!staticFiles.includes('/')) staticFiles.unshift('/');
  if (!staticFiles.includes('/index.html')) staticFiles.unshift('/index.html');

  const manifest = {
    version: ts(),
    staticFiles,
  };

  // 写入输出
  await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
  await fs.writeFile(OUT_PATH, JSON.stringify(manifest, null, 2), 'utf8');
  console.log(`[gen-cache-manifest] Wrote ${OUT_PATH}`);
  console.log(`[gen-cache-manifest] version=${manifest.version}, files=${manifest.staticFiles.length}`);
}

main().catch((e) => {
  console.error('[gen-cache-manifest] Failed:', e && e.stack ? e.stack : e);
  process.exit(1);
});
