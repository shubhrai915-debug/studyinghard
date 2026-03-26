#!/usr/bin/env node
// scripts/sanitize-files.mjs
// 清理 HTML 文件中的不可见字符：
// - 移除文件开头 BOM (U+FEFF)
// - 移除零宽字符：U+FEFF, U+200B, U+200C, U+200D, U+2060
// 默认 dry-run，传入 --write/-w 才会写入

import { promises as fs } from 'node:fs';
import { globby } from 'globby';

const args = process.argv.slice(2);
const WRITE = args.includes('--write') || args.includes('-w');
const FAIL_ON_CHANGE = args.includes('--fail-on-change');
const patterns = ['*.html', 'blog/*.html'];

function sanitize(text) {
  let out = text;
  // 去除开头 BOM
  if (out.charCodeAt(0) === 0xFEFF) out = out.slice(1);
  // 去除常见零宽字符
  out = out.replace(/[\uFEFF\u200B\u200C\u200D\u2060]/g, '');
  return out;
}

async function main() {
  const files = await globby(patterns, { gitignore: true, expandDirectories: false });
  let changed = 0;
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const out = sanitize(raw);
    if (out !== raw) {
      changed++;
      if (WRITE) {
        await fs.writeFile(file, out, 'utf8');
        console.log('Sanitized:', file);
      } else {
        console.log('Would sanitize:', file);
      }
    }
  }
  const mode = WRITE ? 'Sanitized' : 'To sanitize';
  console.log(`Done. ${mode} files: ${changed}`);
  if (!WRITE && FAIL_ON_CHANGE && changed > 0) {
    console.error('[sanitize-files] Found files needing sanitation. Run: npm run sanitize:files:write');
    process.exit(2);
  }
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
