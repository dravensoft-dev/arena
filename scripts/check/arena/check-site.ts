/* Holds the published site to what it claims. The load-bearing assertion is that every href and
 * every src of every emitted page resolves to a file inside the output: intro/AGENTS.md already
 * says a broken path fails silently in both directions and an unstyled page that happens to fit
 * its box passes outright, and until this ran nothing in the repository held it for any page. The
 * rest keeps the set honest in both directions, so a playground the build dropped is missing
 * rather than absent and a page nobody meant to publish is named. It reads the output and writes
 * nothing, because check:graph refuses a gate that writes, and it skips rather than passing when
 * dist/site is not there, since a walk of nothing reports everything resolved. */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix, isInside } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import {
  DOMAIN, SITE_DIR, pages, indexedDirectories, missingPlaygrounds, url,
} from '../../lib/arena/site-pages.ts';

export const node = {
  name: 'check:site',
  reads: [`${SITE_DIR}/**`],
  writes: [],
  feeds: [],
};

export const REFERENCE = /(?:href|src)="([^"]+)"/g;
export const OFF_SITE = /^(?:https?:|mailto:|data:|#|\/\/)/;
export const AUTHORED = ['index.html', '404.html', 'og.html'];
export const FORBIDDEN = ['file://', 'localhost', '127.0.0.1'];

export function htmlFiles(out: string) {
  if (!existsSync(out)) return [];
  return walkFiles(out).filter((path) => path.endsWith('.html'));
}

export function referenced(html: string) {
  return [...html.matchAll(REFERENCE)]
    .map((match) => match[1] ?? '')
    .filter((target) => target && !OFF_SITE.test(target));
}

export function resolves(out: string, page: string, target: string) {
  const clean = decodeURIComponent(target.split('#')[0]?.split('?')[0] ?? '');
  if (clean === '') return true;
  const from = clean.startsWith('/') ? join(out, clean) : resolve(dirname(page), clean);
  if (!isInside(out, from)) return false;
  if (!existsSync(from)) return false;
  return statSync(from).isDirectory() ? existsSync(join(from, 'index.html')) : true;
}

export function brokenLinkProblems(out: string, files = htmlFiles(out)) {
  const problems = [];
  for (const page of files) {
    for (const target of referenced(readFileSync(page, 'utf8'))) {
      if (!resolves(out, page, target)) {
        problems.push(
          `${relPosix(out, page)} points at ${target}, and nothing is there. A broken path fails `
          + 'silently in both directions: the page still renders, and an unstyled one that happens '
          + 'to fit its box passes a look',
        );
      }
    }
  }
  return problems;
}

export function missingPageProblems(out: string, base = root) {
  return pages(base)
    .filter((rel) => !existsSync(join(out, rel)))
    .map((rel) => `${rel} is a page the site declares and the output does not carry`);
}

export function orphanProblems(out: string, base = root, files = htmlFiles(out)) {
  const declared = new Set(pages(base).map((rel) => rel.split('/').join('/')));
  const indexes = new Set(indexedDirectories(base)
    .map((directory) => (directory === '' ? 'index.html' : `${directory}/index.html`)));
  return files
    .map((path) => relPosix(out, path))
    .filter((rel) => !declared.has(rel) && !indexes.has(rel) && !AUTHORED.includes(rel))
    .map((rel) => `${rel} is published and nothing declares it, so it is a page nobody meant to serve`);
}

export function domainProblems(out: string) {
  const cname = join(out, 'CNAME');
  if (!existsSync(cname)) return [`the output carries no CNAME, so ${DOMAIN} resolves to nothing this build named`];
  const named = readFileSync(cname, 'utf8').trim();
  return named === DOMAIN ? [] : [`CNAME names ${named} and the site is built for ${DOMAIN}`];
}

export function sitemapProblems(out: string, base = root) {
  const path = join(out, 'sitemap.xml');
  if (!existsSync(path)) return ['the output carries no sitemap.xml, which is the one thing a search engine is handed'];
  const xml = readFileSync(path, 'utf8');
  return pages(base)
    .filter((rel) => !xml.includes(url(rel)))
    .map((rel) => `sitemap.xml names no entry for ${rel}, so a published page is one nothing points at`);
}

export function localhostProblems(out: string, files = htmlFiles(out)) {
  const problems = [];
  for (const page of files) {
    const text = readFileSync(page, 'utf8');
    for (const forbidden of FORBIDDEN) {
      if (text.includes(forbidden)) {
        problems.push(
          `${relPosix(out, page)} carries "${forbidden}", which resolves on the machine that built `
          + 'it and nowhere a reader is',
        );
      }
    }
  }
  return problems;
}

export function zeroScanProblems(files: unknown[]) {
  return files.length === 0
    ? ['found 0 pages; an empty walk reports every link resolved and every page present, which is '
       + 'a clean-looking pass over an output it never opened']
    : [];
}

function main() {
  const out = join(root, SITE_DIR);
  if (!existsSync(out)) {
    cannotRun('check-site', `${SITE_DIR} is not there; run bun run build:site, which is what this reads`);
  }
  const files = htmlFiles(out);
  const problems = [
    ...zeroScanProblems(files),
    ...brokenLinkProblems(out, files),
    ...missingPageProblems(out),
    ...orphanProblems(out, root, files),
    ...missingPlaygrounds(),
    ...domainProblems(out),
    ...sitemapProblems(out),
    ...localhostProblems(out, files),
  ];
  if (problems.length > 0) {
    console.error(`check-site: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-site: ${files.length} page(s) published for ${DOMAIN}, every href and src resolving `
    + `inside the output, every declared page present and none unnamed, and the sitemap naming all `
    + `${pages().length} of them`,
  );
}

if (isMainModule(import.meta.url)) main();
