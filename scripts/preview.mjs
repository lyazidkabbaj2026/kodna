// Serves dist/ like Vercel does (clean URLs, 404.html, X-Robots-Tag, byte ranges for video).
// Usage: npm run preview [-- --port 4321]
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { ROOT } from './lib/clients.mjs';

const DIST = path.join(ROOT, 'dist');
const port = Number(process.argv[process.argv.indexOf('--port') + 1]) || 4321;
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

http
  .createServer((req, res) => {
    const url = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = path.join(DIST, url);
    if (!file.startsWith(DIST)) return res.writeHead(400).end();
    if (fs.existsSync(path.join(file, 'index.html')) && url !== '/') file = path.join(file, 'index.html');
    let status = 200;
    if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
      file = path.join(DIST, '404.html');
      status = 404;
    }
    const size = fs.statSync(file).size;
    const headers = { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'X-Robots-Tag': 'noindex, nofollow', 'Accept-Ranges': 'bytes' };
    const range = req.headers.range?.match(/bytes=(\d*)-(\d*)/);
    if (range && status === 200) {
      const start = range[1] ? Number(range[1]) : 0;
      const end = range[2] ? Number(range[2]) : size - 1;
      res.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      return fs.createReadStream(file, { start, end }).pipe(res);
    }
    res.writeHead(status, { ...headers, 'Content-Length': size });
    fs.createReadStream(file).pipe(res);
  })
  .listen(port, () => console.log(`http://localhost:${port}`));
