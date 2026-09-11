import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';

export async function previewServer(root = 'dist', prefix = (process.env.PATH_PREFIX || '').replace(/\/$/, '')) {
  const directory = path.resolve(root);
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.avif': 'image/avif', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.woff': 'font/woff', '.woff2': 'font/woff2', '.mp4': 'video/mp4', '.webm': 'video/webm', '.ico': 'image/x-icon' };
  Object.assign(types, { '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg', '.wav': 'audio/wav' });
  const server = createServer((request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname); }
    catch { response.writeHead(400).end(); return; }
    if (prefix) {
      if (pathname !== prefix && !pathname.startsWith(prefix + '/')) { response.writeHead(404).end(); return; }
      pathname = pathname.slice(prefix.length) || '/';
    }
    let filename = path.resolve(directory, `.${pathname}`);
    if (!filename.startsWith(directory + path.sep) && filename !== directory) { response.writeHead(403).end(); return; }
    if (existsSync(filename) && statSync(filename).isDirectory()) filename = path.join(filename, 'index.html');
    if (!existsSync(filename)) { response.writeHead(404).end('Not found'); return; }
    const size = statSync(filename).size;
    const headers = { 'Content-Type': types[path.extname(filename)] || 'application/octet-stream', 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' };
    const range = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range || '');
    if (range) {
      const start = Number(range[1]), end = Math.min(Number(range[2] || size - 1), size - 1);
      if (start > end) { response.writeHead(416).end(); return; }
      response.writeHead(206, { ...headers, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Content-Length': end - start + 1 });
      createReadStream(filename, { start, end }).pipe(response);
    } else {
      response.writeHead(200, { ...headers, 'Content-Length': size });
      if (request.method === 'HEAD') response.end();
      else createReadStream(filename).pipe(response);
    }
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  return { url: `http://127.0.0.1:${server.address().port}${prefix}`, close: () => new Promise(resolve => { server.close(resolve); server.closeAllConnections(); }) };
}
