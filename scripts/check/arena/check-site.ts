/* Holds the published site to what it claims. The load-bearing assertion is that every href, src,
 * markdown link and imported module of everything emitted resolves inside the output: a broken path
 * fails silently in both directions, and an unstyled page that fits its box passes outright. The
 * module half is that assertion one notation further in, since a `src` resolving says nothing about
 * what the entry imports and an ES import that 404s throws before it runs, which is how every React
 * playground went out answering 200 at every href with an empty root. The markdown half is the one
 * an agent reads, since a corpus is followed by its links and nothing renders them, which is how
 * the style plugins went unreachable from the page calling them its hardest instruction. The rest
 * keeps the set honest both ways. It reads the output, writes nothing, and skips rather than passes
 * without dist/site, since a walk of nothing reports everything fine. */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix, isInside } from '../../utils/posix-path.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import {
  DOMAIN, SITE_DIR, LAYERS, pages, indexedDirectories, missingPlaygrounds, missingModules,
  modules, url, directoryUrl,
} from '../../lib/arena/site-pages.ts';
import { LLMS_INDEX, ROUTER, layerFile, prompts, summary } from '../../lib/arena/llms-index.ts';

export const node = {
  name: 'check:site',
  reads: [`${SITE_DIR}/**`],
  writes: [],
  feeds: [],
};

export const REFERENCE = /(?:href|src)="([^"]+)"/g;
export const MARKDOWN_LINK = /\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
export const OFF_SITE = /^(?:https?:|mailto:|data:|#|\/\/)/;
export const AUTHORED = ['index.html', '404.html', 'og.html'];
export const FORBIDDEN = ['file://', 'localhost', '127.0.0.1'];
export const VAR_USED = /var\((--[a-z0-9-]+)/g;
export const VAR_DEFINED = /(--[a-z0-9-]+)\s*:/g;

export function definedTokens(out: string) {
  const names = new Set<string>();
  if (!existsSync(out)) return names;
  for (const path of walkFiles(out)) {
    if (!path.endsWith('.css')) continue;
    for (const match of readFileSync(path, 'utf8').matchAll(VAR_DEFINED)) names.add(match[1] ?? '');
  }
  return names;
}

export function tokenProblems(out: string, files = htmlFiles(out), defined = definedTokens(out)) {
  const problems = [];
  for (const page of files) {
    const rel = relPosix(out, page);
    if (!AUTHORED.includes(rel) && !rel.endsWith('/index.html')) continue;
    for (const match of readFileSync(page, 'utf8').matchAll(VAR_USED)) {
      const name = match[1] ?? '';
      if (!defined.has(name)) {
        problems.push(
          `${rel} reads ${name}, and no stylesheet in the output defines it. A custom property `
          + 'nothing declares resolves to nothing at all, so the page renders unstyled and every '
          + 'link on it still answers 200',
        );
      }
    }
  }
  return problems;
}

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

export function markdownFiles(out: string) {
  if (!existsSync(out)) return [];
  return walkFiles(out).filter((path) => path.endsWith('.md'));
}

export function markdownLinks(text: string) {
  return [...text.matchAll(MARKDOWN_LINK)]
    .map((match) => match[1] ?? '')
    .filter((target) => target && !OFF_SITE.test(target));
}

export function markdownLinkProblems(out: string, files = markdownFiles(out)) {
  const problems = [];
  for (const page of files) {
    for (const target of markdownLinks(readFileSync(page, 'utf8'))) {
      if (!resolves(out, page, target)) {
        problems.push(
          `${relPosix(out, page)} links ${target}, and the output carries nothing there. A `
          + 'document served to an agent is read through its links, so one that resolves in a '
          + 'clone and not here sends the reader to a 404 at exactly the point the prose says to '
          + 'go and read something. Publish what it names, or name it by a URL that answers '
          + 'from everywhere the document is read',
        );
      }
    }
  }
  return problems;
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

export function missingModuleProblems(out: string, base = root) {
  return modules(base)
    .filter((rel) => !existsSync(join(out, rel)))
    .map((rel) => `${rel} is a module a published page imports and the output does not carry. An `
      + 'ES import that 404s throws before the entry runs, so the page keeps every href it had, '
      + 'answers 200 at all of them, and renders nothing at all');
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

export function located(base = root) {
  return [...indexedDirectories(base).map(directoryUrl), ...pages(base).map(url)];
}

export function sitemapProblems(out: string, base = root) {
  const path = join(out, 'sitemap.xml');
  if (!existsSync(path)) return ['the output carries no sitemap.xml, which is the one thing a search engine is handed'];
  const xml = readFileSync(path, 'utf8');
  return located(base)
    .filter((loc) => !xml.includes(`<loc>${loc}</loc>`))
    .map((loc) => `sitemap.xml names no entry for ${loc}, so a published page is one nothing points at`);
}

export const CANONICAL = /<link rel="canonical" href="([^"]*)">/;

export function ownUrl(rel: string) {
  if (rel === 'index.html') return directoryUrl('');
  if (rel.endsWith('/index.html')) return directoryUrl(rel.slice(0, -'/index.html'.length));
  return url(rel);
}

export function canonicalProblems(out: string, files = htmlFiles(out)) {
  const problems = [];
  for (const page of files) {
    const rel = relPosix(out, page);
    const declared = CANONICAL.exec(readFileSync(page, 'utf8'))?.[1];
    if (declared === undefined) continue;
    if (declared === ownUrl(rel)) continue;
    problems.push(
      `${rel} declares ${declared} as its canonical, and that is not its own address. A page `
      + 'handing a search engine another page as the one to keep is a page asking not to be found, '
      + `and this one is at ${ownUrl(rel)}`,
    );
  }
  return problems;
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

export const LLMS_LINK = /\]\((https:\/\/[^)]+)\)/g;

export function llmsProblems(out: string, base = root) {
  const path = join(out, LLMS_INDEX);
  if (!existsSync(path)) return [`the output carries no ${LLMS_INDEX}, which is what an agent reads before it fetches anything`];
  const text = readFileSync(path, 'utf8');
  const problems = [];

  const site = `https://${DOMAIN}/`;
  for (const match of text.matchAll(LLMS_LINK)) {
    const target = match[1] ?? '';
    if (!target.startsWith(site)) continue;
    const rel = decodeURIComponent(target.slice(site.length));
    if (!existsSync(join(out, rel))) {
      problems.push(`${LLMS_INDEX} names ${target}, and the output carries no ${rel}. An agent follows that link and is handed a 404 by a file written to stop exactly that`);
    }
  }

  const stated = /^> (.+)$/m.exec(text)?.[1]?.trim();
  if (stated !== summary(base)) {
    problems.push(`${LLMS_INDEX} summarises Arena as something ${ROUTER}'s own frontmatter does not say, so the two describe different projects`);
  }

  for (const layer of LAYERS) {
    const file = join(out, layerFile(layer));
    if (!existsSync(file)) {
      problems.push(`the output carries no ${layerFile(layer)}, and ${LLMS_INDEX} names it`);
      continue;
    }
    const body = readFileSync(file, 'utf8');
    for (const rel of prompts(layer, base)) {
      const marker = `<!-- ${rel} -->`;
      const at = body.split(marker).length - 1;
      if (at !== 1) problems.push(`${layerFile(layer)} carries ${rel} ${at} time(s), and a corpus is every document of its layer exactly once`);
    }
    const other = LAYERS.find((name) => name !== layer);
    if (other && body.includes(`frameworks/${other}/components/`)) {
      problems.push(`${layerFile(layer)} carries a document from ${other}. A component ships under both names and the two are not interchangeable, so one corpus holding both hands an agent the idiom it was told not to read`);
    }
  }
  return problems;
}

export function zeroDocProblems(docs: unknown[]) {
  return docs.length === 0
    ? ['found 0 served markdown documents; an empty walk reports every link in them resolved, '
       + 'which is a clean-looking pass over a corpus it never opened']
    : [];
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
  const docs = markdownFiles(out);
  const problems = [
    ...zeroScanProblems(files),
    ...zeroDocProblems(docs),
    ...brokenLinkProblems(out, files),
    ...markdownLinkProblems(out, docs),
    ...missingPageProblems(out),
    ...missingModuleProblems(out),
    ...orphanProblems(out, root, files),
    ...missingPlaygrounds(),
    ...missingModules(),
    ...domainProblems(out),
    ...sitemapProblems(out),
    ...canonicalProblems(out, files),
    ...localhostProblems(out, files),
    ...tokenProblems(out, files),
    ...llmsProblems(out),
  ];
  if (problems.length > 0) {
    console.error(`check-site: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(
    `check-site: ${files.length} page(s) and ${docs.length} document(s) published for ${DOMAIN}, `
    + `every href, src and markdown link resolving inside the output, all ${modules().length} `
    + `module(s) the pages import present with them, every declared page present and none `
    + `unnamed, every canonical its own page's address, and the sitemap naming all `
    + `${located().length} of them`,
  );
}

if (isMainModule(import.meta.url)) main();
