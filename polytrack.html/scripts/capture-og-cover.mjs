#!/usr/bin/env node
// capture-og-cover.mjs
// 使用 Puppeteer 截图 assets/og-cover-generator.html 并输出 1200x630 尺寸的 JPEG

import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';

async function main() {
  let puppeteer;
  try {
    puppeteer = (await import('puppeteer')).default;
  } catch (e) {
    console.error('[capture-og-cover] 需要依赖 puppeteer，请先安装：npm i -D puppeteer');
    process.exit(1);
  }

  const root = process.cwd();
  const htmlPath = path.resolve(root, 'assets/og-cover-generator.html');
  const outPath = path.resolve(root, 'assets/og-cover.jpg');

  const browser = await puppeteer.launch({ headless: 'new' });
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
    await page.goto(pathToFileURL(htmlPath).toString(), { waitUntil: 'networkidle0' });
    const el = await page.$('#og-cover');
    if (!el) {
      throw new Error('#og-cover not found in assets/og-cover-generator.html');
    }
    const clip = await el.boundingBox();
    if (!clip) {
      throw new Error('Failed to determine #og-cover bounding box');
    }
    // 截图，尝试压缩到 <=100KB（简单两档质量尝试）
    await page.screenshot({ path: outPath, type: 'jpeg', quality: 80, clip });
    const stat = await fs.stat(outPath);
    if (stat.size > 100 * 1024) {
      await page.screenshot({ path: outPath, type: 'jpeg', quality: 60, clip });
    }
    console.log('✅ og-cover.jpg 已生成:', outPath);
  } finally {
    await browser.close();
  }
}

main().catch((e) => { console.error(e.stack || e.message); process.exit(1); });

