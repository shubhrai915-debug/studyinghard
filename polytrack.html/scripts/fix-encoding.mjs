#!/usr/bin/env node
// scripts/fix-encoding.mjs
// 目的：识别并修复常见错码与可疑片段（保守映射），支持 dry-run 与备份
// 使用：
//   node scripts/fix-encoding.mjs               # 仅预览（dry-run）
//   node scripts/fix-encoding.mjs --write       # 实际写入
//   node scripts/fix-encoding.mjs --write --backup
//   node scripts/fix-encoding.mjs --glob "blog/*.html"  # 限定范围

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';

const args = process.argv.slice(2);
const WRITE = args.includes('--write') || args.includes('-w');
const BACKUP = args.includes('--backup');

function getArgAfter(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const globArg = getArgAfter('--glob', null);
const mapArg = getArgAfter('--map', 'scripts/.encoding-map.json');
const patterns = globArg ? [globArg] : ['*.html', 'blog/*.html', 'assets/*.html'];

function ts() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return (
    d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
    pad(d.getHours()) + pad(d.getMinutes()) + pad(d.getSeconds())
  );
}

async function backupFile(p) {
  if (!WRITE || !BACKUP) return null;
  const dir = path.dirname(p);
  const base = path.basename(p);
  const bak = path.join(dir, `${base}.bak.${ts()}`);
  const buf = await fs.readFile(p);
  await fs.writeFile(bak, buf);
  return bak;
}

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// 保守映射：
// - "鈥?" 经常是 EN DASH（–）的错码，如 "8鈥?0" => "8–10"
// - "锟?" 在本仓库中亦多用于破折/短横错码，统一替换为 EN DASH（–）
// - U+FE0F 表情变体选择符（有时显示为奇怪符号），可直接移除
const baseMappings = [
  { from: '鈥?', to: '–', note: 'fix en-dash (common garble)' },
  { from: '锟?', to: '–', note: 'fix en-dash (common garble)' },
  { fromRe: /\uFE0F/g, to: '', note: 'remove VS16 (emoji variation selector)' },
  { from: '锔?', to: '', note: 'strip residual emoji garble' },
  { from: '/div&gt;', to: '', note: 'remove stray escaped closing tag text' },
];

async function loadExternalMappings(filePath) {
  try {
    const text = await fs.readFile(filePath, 'utf8');
    const obj = JSON.parse(text);
    const pairs = Object.entries(obj)
      .filter(([k, v]) => typeof k === 'string' && typeof v === 'string')
      .map(([from, to]) => ({ from, to, note: 'external-map' }));
    return pairs;
  } catch (e) {
    return [];
  }
}

const suspiciousPatterns = [
  /[鈥锟馃锔]/,            // 常见错码字符
  /div&gt;/i,               // 可能的转义闭合标签残留
  /&lt;\/?(div|script|footer)[^&]*&gt;/i, // 可能的被转义标签块
];

function applyMappings(text, mappings) {
  let out = text;
  let count = 0;
  for (const m of mappings) {
    if (m.fromRe) {
      const before = out;
      out = out.replace(m.fromRe, m.to);
      if (out !== before) count++;
    } else if (m.from) {
      const re = new RegExp(escapeRegExp(m.from), 'g');
      if (re.test(out)) {
        out = out.replace(re, m.to);
        count++;
      }
    }
  }
  // 结构修复：给缺失闭合的图标块补 </div>
  const beforeFix1 = out;
  out = out.replace(/(<div class="text-3xl mb-4">[^<\n]+)\n\s*<h3/g, '$1</div>\n          <h3');
  if (out !== beforeFix1) count++;
  const beforeFix2 = out;
  out = out.replace(/(<div class="text-2xl mb-2">[^<\n]+)\n\s*<h3/g, '$1</div>\n          <h3');
  if (out !== beforeFix2) count++;
  return { out, count };
}

function hasSuspicious(text) {
  return suspiciousPatterns.some((re) => re.test(text));
}

async function main() {
  const files = await globby(patterns, { gitignore: true, expandDirectories: false });
  const report = [];
  let changed = 0;
  const external = await loadExternalMappings(mapArg);
  const mappings = [...baseMappings, ...external];
  for (const file of files) {
    const raw = await fs.readFile(file, 'utf8');
    const { out, count } = applyMappings(raw, mappings);
    const suspicious = hasSuspicious(out);
    if (count > 0 || suspicious) {
      report.push({ file, mapped: count, suspicious });
      if (WRITE && count > 0) {
        await backupFile(file);
        await fs.writeFile(file, out, 'utf8');
        changed++;
        console.log(`Fixed: ${file} (rules: ${count})`);
      } else {
        const tag = count > 0 ? `Would fix (rules: ${count})` : 'Suspicious only';
        console.log(`${tag}: ${file}`);
      }
    }
  }
  const mode = WRITE ? 'Applied' : 'Planned';
  console.log(`Done. ${mode} encoding fixes: ${changed}`);
}

main().catch((e) => { console.error(e && e.stack ? e.stack : e); process.exit(1); });
