#!/usr/bin/env node
// scripts/serve.mjs
// Minimal static file server that always serves from the project root
// Usage: npm run serve [-- --port 8000]

import http from 'node:http';
import net from 'node:net';
import { promises as fsp } from 'node:fs';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');

// parse args
const args = process.argv.slice(2);
function getArg(flag, fallback) {
  const i = args.indexOf(flag);
  if (i >= 0 && args[i + 1]) return args[i + 1];
  return fallback;
}
let PORT = Number(process.env.PORT || getArg('--port', 8000));
const HOST = getArg('--host', '127.0.0.1');

const MIME = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.mjs', 'application/javascript; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.svg', 'image/svg+xml'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
  ['.ico', 'image/x-icon'],
  ['.webmanifest', 'application/manifest+json'],
  ['.woff2', 'font/woff2'],
]);

function isPathInside(parent, child) {
  const rel = path.relative(parent, child);
  return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

async function sendFile(res, filePath) {
  try {
    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME.get(ext) || 'application/octet-stream';
    res.writeHead(200, {
      'Content-Type': mime,
      'Cache-Control': 'no-cache',
    });
    fs.createReadStream(filePath).pipe(res);
  } catch (e) {
    send404(res);
  }
}

function send404(res) {
  res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end('<h1>404 Not Found</h1>');
}

function redirect(res, location) {
  res.writeHead(301, { Location: location });
  res.end();
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    // default route
    if (pathname === '/') {
      return sendFile(res, path.join(PROJECT_ROOT, 'index.html'));
    }

    // map to filesystem path
    const fsPath = path.join(PROJECT_ROOT, pathname);
    const normalized = path.normalize(fsPath);
    if (!isPathInside(PROJECT_ROOT, normalized)) {
      return send404(res);
    }

    try {
      const st = await fsp.stat(normalized);
      if (st.isDirectory()) {
        // ensure trailing slash for directories
        if (!pathname.endsWith('/')) {
          return redirect(res, pathname + '/');
        }
        // try index.html
        const indexPath = path.join(normalized, 'index.html');
        try {
          await fsp.access(indexPath);
          return sendFile(res, indexPath);
        } catch {
          return send404(res);
        }
      } else {
        return sendFile(res, normalized);
      }
    } catch {
      // fallback: /path -> /path/index.html if exists
      const alt = path.join(normalized, 'index.html');
      try {
        await fsp.access(alt);
        return sendFile(res, alt);
      } catch {
        return send404(res);
      }
    }
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Internal Server Error');
  }
});

function checkPort(port, host) {
  return new Promise((resolve) => {
    const tester = net.createServer()
      .once('error', () => resolve(false))
      .once('listening', () => tester.once('close', () => resolve(true)).close())
      .listen(port, host);
  });
}

async function pickPort(start, host, maxTries = 20) {
  let p = start;
  for (let i = 0; i < maxTries; i++) {
    // eslint-disable-next-line no-await-in-loop
    const free = await checkPort(p, host);
    if (free) return p;
    p++;
  }
  return start;
}

async function openBrowser(url) {
  const { spawn } = await import('node:child_process');
  const platform = process.platform;
  try {
    if (platform === 'win32') {
      spawn('cmd', ['/c', 'start', '', url], { stdio: 'ignore', detached: true });
    } else if (platform === 'darwin') {
      spawn('open', [url], { stdio: 'ignore', detached: true });
    } else {
      spawn('xdg-open', [url], { stdio: 'ignore', detached: true });
    }
  } catch {
    // ignore
  }
}

(async () => {
  PORT = await pickPort(PORT, HOST);
  server.listen(PORT, HOST, () => {
    const url = `http://${HOST}:${PORT}/`;
    console.log(`Serving Polytrack at ${url}`);
    console.log(`Root: ${PROJECT_ROOT}`);
    console.log('Examples:');
    console.log(`  • /`);
    console.log(`  • /blog/`);
    console.log(`  • /assets/styles.css`);
    if (!process.env.CI) {
      // try to open browser once
      try { openBrowser(url); } catch {}
    }
  });
})();
