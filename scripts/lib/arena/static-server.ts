/* The static file server behind `bun run demos`, and the fixture three gates load pages from.
 * `resolveInRoot` is the containment rule both servers ask, rather than each spelling it: a
 * pathname a client sent is untrusted, and the two spellings that preceded this were each wrong
 * in their own direction. It answers a path or nothing, so a caller decides what a refusal costs
 * and neither of them has to remember to compare. A pathname that does not decode is a refusal
 * too, since throwing out of a request handler is a crash rather than a 403. */

import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import nodePath, { extname } from 'node:path';
import { isInside, type PathModule } from '../../utils/posix-path.ts';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.jsx': 'text/javascript; charset=utf-8',
  '.tsx': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
};

export function contentType(path: string) {
  return (TYPES as Record<string, string>)[extname(path).toLowerCase()] ?? 'application/octet-stream';
}

export function resolveInRoot(root: string, pathname: string, on: PathModule = nodePath) {
  let rel;
  try {
    rel = decodeURIComponent(pathname);
  } catch {
    return null;
  }

  const path = on.resolve(root, rel.replace(/^[/\\]+/, ''));
  return isInside(root, path, on) ? path : null;
}

export function startStaticServer(root: string): Promise<{ port: number; close: () => Promise<void> }> {
  const server = createServer(async (req, res) => {
    const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
    const path = resolveInRoot(root, pathname);
    if (!path) {
      res.writeHead(403).end('Forbidden');
      return;
    }
    try {
      const body = await readFile(path);
      res.writeHead(200, { 'content-type': contentType(path) }).end(body);
    } catch {
      res.writeHead(404).end('Not found');
    }
  });

  return new Promise((listening, reject) => {
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      listening({
        port: (server.address() as { port: number }).port,
        close: () => new Promise<void>((done) => server.close(() => done())),
      });
    });
  });
}
