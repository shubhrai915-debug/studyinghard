#!/usr/bin/env node
// scripts/apply-layout.mjs
// 使用 jsdom 以 DOM 方式安全替换 header/footer 片段
// 特性：
// - 默认 dry-run 预览变更；传入 --write/-w 才会实际写入
// - 支持 --glob 自定义匹配（默认 ['*.html','blog/*.html']）
// - 自动跳过 header.html / footer.html 自身
// - 可选 --backup 对写入文件生成 .bak 时间戳备份

import { promises as fs } from 'node:fs';
import path from 'node:path';
import { globby } from 'globby';
import { JSDOM } from 'jsdom';

const args = process.argv.slice(2);
const WRITE = args.includes('--write') || args.includes('-w');
const BACKUP = args.includes('--backup');
const FAIL_ON_CHANGE = args.includes('--fail-on-change');

function getArgAfter(flag, fallback) {
  const i = args.indexOf(flag);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
}

const globArg = getArgAfter('--glob', null);
const patterns = globArg ? [globArg] : ['*.html', 'blog/*.html'];

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

async function backupFile(p) {
  if (!WRITE || !BACKUP) return null;
  const dir = path.dirname(p);
  const base = path.basename(p);
  const bak = path.join(dir, `${base}.bak.${ts()}`);
  const buf = await fs.readFile(p);
  await fs.writeFile(bak, buf);
  return bak;
}

async function loadFragment(html) {
  return JSDOM.fragment(html);
}

function selectOnly(elFrag, selector) {
  // 从片段中选取第一个匹配节点并深拷贝；忽略其他兄弟
  const found = elFrag.querySelector(selector);
  return found ? found.cloneNode(true) : null;
}

function collectResourceNodes(elFrag) {
  // 收集片段中除 header/footer 外的 link/script 节点（保持顺序）
  const nodes = [];
  elFrag.childNodes.forEach((n) => {
    if (n.nodeType === 1) {
      const tag = n.tagName.toLowerCase();
      if (tag === 'script' || tag === 'link') {
        nodes.push(n.cloneNode(true));
      }
    }
  });
  return nodes;
}

function removeExistingResources(doc, resNodes) {
  const keys = resNodes.map((n) => {
    const tag = n.tagName.toLowerCase();
    if (tag === 'script') return `script::${n.getAttribute('src') || ''}`;
    if (tag === 'link') return `link::${n.getAttribute('href') || ''}`;
    return '';
  }).filter(Boolean);
  const selector = keys.map((k) => {
    const [tag, attr] = k.split('::');
    if (tag === 'script') return `script[src='${attr}']`;
    if (tag === 'link') return `link[href='${attr}']`;
  }).filter(Boolean).join(',');
  if (!selector) return;
  doc.querySelectorAll(selector).forEach((el) => el.remove());
}

function insertAfter(node, newNodes) {
  let ref = node;
  newNodes.forEach((n) => {
    ref.parentNode.insertBefore(n, ref.nextSibling);
    ref = n;
  });
}

function replaceFirstHeader(doc, headerFrag) {
  const desiredHeader = selectOnly(headerFrag, 'header');
  if (!desiredHeader) return;
  // 移除页面内所有 header，统一插入一处
  Array.from(doc.querySelectorAll('header')).forEach((el) => el.remove());
  const body = doc.body || doc.documentElement;
  if (body) body.insertBefore(desiredHeader, body.firstChild);
  // 处理 header 片段中附带的资源节点：去重后插入 header 之后
  const resNodes = collectResourceNodes(headerFrag);
  if (resNodes.length) {
    removeExistingResources(doc, resNodes);
    const headerNow = doc.querySelector('header');
    if (headerNow) insertAfter(headerNow, resNodes.map((n) => n.cloneNode(true)));
  }
}

function replaceLastFooter(doc, footerFrag) {
  const desiredFooter = selectOnly(footerFrag, 'footer');
  if (!desiredFooter) return;
  // 统一仅保留一处 footer：删除全部后插入
  Array.from(doc.querySelectorAll('footer')).forEach((el) => el.remove());
  const body = doc.body || doc.documentElement;
  if (body) body.appendChild(desiredFooter);
  // 处理 footer 片段中附带的资源节点（如年份脚本）：去重后插入 footer 之后
  const resNodes = collectResourceNodes(footerFrag);
  if (resNodes.length) {
    removeExistingResources(doc, resNodes);
    const footerNow = doc.querySelector('footer');
    if (footerNow) insertAfter(footerNow, resNodes.map((n) => n.cloneNode(true)));
  }
}

// 删除页面内所有“设置年份”相关的内联脚本，交由 footer 片段统一注入
function removeYearScripts(doc) {
  const scripts = Array.from(doc.querySelectorAll('script'));
  scripts.forEach((s) => {
    // 仅处理内联脚本
    if (s.src) return;
    const code = (s.textContent || '').replace(/\s+/g, ' ').toLowerCase();
    if (
      code.includes("getelementbyid('y')") ||
      code.includes('getelementbyid("y")')
    ) {
      // 常见实现均包含 getFullYear 或 new Date()
      if (code.includes('getfullyear') || code.includes('new date()')) {
        s.remove();
      }
    }
  });
}

// 若 <head> 为空但相关标签误入 <body>，尝试回填到 <head>
function repairHeadIfNeeded(doc) {
  const head = doc.head || doc.querySelector('head');
  const body = doc.body || doc.querySelector('body');
  if (!head || !body) return;
  const headHasContent = head.children && head.children.length > 0;
  if (headHasContent) return;
  const selectors = ['meta', 'title', 'link[rel]', 'style'];
  const nodes = Array.from(body.querySelectorAll(selectors.join(',')));
  if (nodes.length === 0) return;
  nodes.forEach((n) => head.appendChild(n));
}

// 强制实施 SEO 规范化 URL (Canonical)
// 规则: 始终为 self-referencing, absolute https URL, 移除 index.html
function enforceCanonical(doc, filepath) {
  const head = doc.head || doc.querySelector('head');
  if (!head) return;

  // 1. 移除旧的 canonical
  const oldLinks = head.querySelectorAll('link[rel="canonical"]');
  oldLinks.forEach(el => el.remove());

  // 2. 计算新的 canonical URL
  // 假设文件路径相对于根目录，例如 "blog/my-post.html" -> "https://polytrack.best/blog/my-post"
  // root "index.html" -> "https://polytrack.best/"
  let relPath = filepath;
  // 如果路径以 .html 结尾，去掉它 (除非是 index.html 特殊处理)
  if (relPath.endsWith('index.html')) {
    relPath = relPath.slice(0, -10); // remove "index.html"
  } else if (relPath.endsWith('.html')) {
    relPath = relPath.slice(0, -5); // remove ".html"
  }

  // 确保路径以 / 开头如果不为空
  if (relPath && !relPath.startsWith('/')) {
    relPath = '/' + relPath;
  }
  // 根目录如果是空字符串或仅有/，标准化为 /
  if (!relPath) relPath = '/';

  const canonicalUrl = `https://polytrack.best${relPath}`;

  // 3. 插入新标签
  const link = doc.createElement('link');
  link.setAttribute('rel', 'canonical');
  link.setAttribute('href', canonicalUrl);
  head.appendChild(link);
}

// 移除 Git 合并冲突标记与被转义的 footer 文本块
function stripMarkersAndEscapedFooter(htmlText) {
  let out = htmlText;
  // 移除冲突标记行
  out = out.replace(/^<<<<<<<.*$/gm, '');
  out = out.replace(/^=======$/gm, '');
  out = out.replace(/^>>>>>>>.*$/gm, '');
  // 移除被 HTML 转义的 footer 片段（&lt;footer ... &lt;/footer&gt;）
  out = out.replace(/&lt;footer[\s\S]*?&lt;\/footer&gt;/gi, '');
  // 移除被 HTML 转义的合并冲突块（从 &lt;&lt;&lt;&lt;&lt;&lt;&lt; HEAD 到 &gt;&gt;&gt;&gt;&gt;&gt;&gt; 行）
  out = out.replace(/(?:&lt;){7}\s*HEAD[\s\S]*?(?:&gt;){7}[^\n]*\n?/gi, '');
  // 补充：移除孤立的被转义标记行
  out = out.replace(/^(?:&lt;){7}.*$/gmi, '');
  out = out.replace(/^(?:&gt;){7}.*$/gmi, '');
  // 清理被转义的内联年份脚本片段
  out = out.replace(/&lt;script[\s\S]*?getelementbyid\(['\"]y['\"][\s\S]*?&lt;\/script&gt;/gi, '');
  return out;
}

async function main() {
  const headerHTML = await fs.readFile('header.html', 'utf8');
  const footerHTML = await fs.readFile('footer.html', 'utf8');
  const headerFrag = await loadFragment(headerHTML);
  const footerFrag = await loadFragment(footerHTML);

  const files = await globby(patterns, { gitignore: true, expandDirectories: false });
  const targets = files.filter((f) => !/\b(header|footer)\.html$/i.test(f));

  let changed = 0;
  for (const file of targets) {
    const html = await fs.readFile(file, 'utf8');
    const dom = new JSDOM(html);
    const { document } = dom.window;

    // 先移除页面内所有年份脚本，由 footer 统一注入
    removeYearScripts(document);
    replaceFirstHeader(document, headerFrag);
    replaceLastFooter(document, footerFrag);
    repairHeadIfNeeded(document);
    enforceCanonical(document, file);

    let out = dom.serialize();
    out = stripMarkersAndEscapedFooter(out);
    // 确保 DOCTYPE 存在
    if (!/^<!DOCTYPE html>/i.test(out.trimStart())) {
      out = '<!DOCTYPE html>' + out;
    }
    if (out !== html) {
      changed++;
      if (WRITE) {
        await backupFile(file);
        await fs.writeFile(file, out, 'utf8');
        console.log('Applied:', file);
      } else {
        console.log('Will apply:', file);
      }
    } else {
      console.log('No change:', file);
    }
  }
  const mode = WRITE ? 'Applied' : 'Planned';
  console.log(`Done. ${mode} changes: ${changed}`);
  if (!WRITE && FAIL_ON_CHANGE && changed > 0) {
    console.error('[apply-layout] Found files needing layout application. Run: npm run apply:layout:write');
    process.exit(2);
  }
}

main().catch((e) => {
  console.error(e && e.stack ? e.stack : e);
  process.exit(1);
});
