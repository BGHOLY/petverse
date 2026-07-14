import { createReadStream, existsSync, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize, resolve } from 'node:path';

const root = resolve(process.argv[2] || '.');
const port = Number(process.argv[3] || 5177);
const contentTypes = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.wasm': 'application/wasm',
};

createServer((request, response) => {
    const pathname = decodeURIComponent(new URL(request.url || '/', 'http://localhost').pathname);
    const relativePath = normalize(pathname).replace(/^([/\\])+/, '');
    let filePath = join(root, relativePath || 'index.html');
    if (!filePath.startsWith(root) || !existsSync(filePath)) filePath = join(root, 'index.html');
    if (statSync(filePath).isDirectory()) filePath = join(filePath, 'index.html');
    response.setHeader('Content-Type', contentTypes[extname(filePath)] || 'application/octet-stream');
    createReadStream(filePath).pipe(response);
}).listen(port, '127.0.0.1');
