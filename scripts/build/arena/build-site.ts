/* Assembles the published site out of the built tree. It copies rather than rewrites: a page names
 * its assets with a relative href that counts directories, so the output holds the same shape under
 * the same names and a page served from the domain is the page a clone serves. node_modules is on
 * that path, because a playground links the Phosphor sheets there, and only the sheet and the font
 * binaries of each weight travel. copyAll rather than package-assembly's copyTree, whose exclusions
 * keep a demo entry and a vendor directory out of an npm package and are exactly what a playground
 * loads. What it authors is what serve.ts answers at request time and a static host cannot: an index
 * at every directory a visitor lands on, the landing page, the sitemap, robots.txt, a 404 and the
 * card a link preview reads. No count is typed on any of them; a number nothing holds is the defect
 * this repository is about, so each is derived from the same map the packages ship. */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { reset, write, copy } from '../../lib/arena/package-assembly.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import {
  DOMAIN, SITE_DIR, LAYERS, COPIED, SINK_PAGE, PLAYGROUND_SUFFIX,
  entryPoints, extensions, components, pages, indexedDirectories, phosphorFiles,
  playgroundsOnDisk, titleOf, url,
} from '../../lib/arena/site-pages.ts';
import { renderOgImage, OG_WIDTH, OG_HEIGHT } from '../../lib/arena/og-image.ts';
import { LLMS_INDEX, layerFile, index, corpus, servedDocs } from '../../lib/arena/llms-index.ts';

export const node = {
  name: 'build:site',
  reads: [
    'SKILL.md', 'frameworks/**/SKILL.md', 'frameworks/**/*.prompt.md', 'frameworks/*/PACKAGE.md',
    '!frameworks/*/build/package/**', '!frameworks/*/dist/**',
    'intro/**', 'contracts/design/**', 'contracts/design-generated/**', 'assets/**',
    'frameworks/tailwind/consume/**', 'frameworks/react/vendor/**',
    'frameworks/*/kitchen-sink/**', 'frameworks/*/components/**',
    'frameworks/angular/build/demo/**',
  ],
  writes: [`${SITE_DIR}/**`],
  feeds: ['check:site'],
};

export const OG_FILE = 'og.png';
export const OG_SOURCE = 'og.html';

export const NEVER_COPIED = new Set(['node_modules', '.git']);

export function copyAll(from: string, out: string, rel: string) {
  const written = [];
  for (const file of walkFiles(from, { skip: (name) => NEVER_COPIED.has(name) })) {
    written.push(copy(file, out, `${rel}/${relPosix(from, file)}`));
  }
  return written;
}

export const BODY = 'body{margin:0;background:var(--bg);color:var(--text-strong);'
  + 'font-family:var(--font-body);line-height:1.55}'
  + 'a{color:var(--crimson)}code,pre{font-family:var(--font-mono)}';

const escape = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const head = (title: string, description: string, canonical: string, depth: number) => {
  const up = '../'.repeat(depth);
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:image" content="https://${DOMAIN}/${OG_FILE}">
<meta property="og:image:width" content="${OG_WIDTH}">
<meta property="og:image:height" content="${OG_HEIGHT}">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="${up}assets/app-icon.svg">
<link rel="stylesheet" href="${up}intro/styles.css">
<link rel="stylesheet" href="${up}intro/toggle.css">
<style>${BODY}</style>
</head><body>`;
};

export function indexPage(title: string, links: { href: string; label: string }[], depth: number) {
  const items = links
    .map(({ href, label }) => `  <li><a href="${href}">${escape(label)}</a></li>`)
    .join('\n');
  return `${head(title, title, `https://${DOMAIN}/`, depth)}
<main style="max-width:60rem;margin:0 auto;padding:var(--sp-6)">
<h1 style="font-family:var(--font-display)">${escape(title)}</h1>
<ul style="line-height:2">
${items}
</ul>
</main>
</body></html>
`;
}

export const TAGLINE = 'One design system, in React and in Angular, built to be operated by an AI agent.';

export function landingPage(base = repoRoot) {
  const drawn = components('react', base).length;
  const voices = extensions(base).length;
  const links = entryPoints(base).filter((entry) => entry.public);
  const cards = links
    .map((entry) => `  <li><a href=".${entry.path}">${escape(entry.label)}</a></li>`)
    .join('\n');
  return `${head('Arena by Dravensoft', TAGLINE, `https://${DOMAIN}/`, 0)}
<main style="max-width:64rem;margin:0 auto;padding:var(--sp-8) var(--sp-6)">
<h1 style="font-family:var(--font-display);font-size:var(--fs-hero);margin:0">Arena by Dravensoft</h1>
<p style="font-size:var(--fs-lg);color:var(--mute);max-width:44rem">${escape(TAGLINE)}</p>

<p style="max-width:44rem">Every value traces to a design token, every component's API and every
accessibility pattern it binds is a contract file rather than a paragraph, and a gate holds the
code, the documentation and the published packages to those contracts. An agent handed this
system does not guess at it: it reads the contract that governs what it is about to write, and
the gate tells it when it got it wrong.</p>

<p style="max-width:44rem"><strong>Arena carries the language and not the skin.</strong> The same
${drawn} components ship under both framework names, rendering the same pixels, and your palettes
and fonts arrive in an <code>arena.config.json</code> your project writes.</p>

<pre style="background:var(--surface-card);padding:var(--sp-4);border-radius:var(--r-lg);overflow-x:auto"><code>bun add @dravensoft/arena-react     # or @dravensoft/arena-angular
bun add @phosphor-icons/web</code></pre>

<h2 style="font-family:var(--font-display)">See it</h2>
<ul style="line-height:2">
${cards}
</ul>
<p style="color:var(--mute)">Each kitchen sink is drawn once per voice, and this build ships
${voices} of them.</p>

<h2 style="font-family:var(--font-display)">Take it</h2>
<ul style="line-height:2">
  <li><a href="https://www.npmjs.com/package/@dravensoft/arena-react">@dravensoft/arena-react</a></li>
  <li><a href="https://www.npmjs.com/package/@dravensoft/arena-angular">@dravensoft/arena-angular</a></li>
  <li><a href="https://github.com/dravensoft-dev/arena">The repository, MIT</a></li>
</ul>
</main>
</body></html>
`;
}

export function ogPage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<link rel="stylesheet" href="intro/styles.css">
<style>
html,body{margin:0;padding:0}
body{width:${OG_WIDTH}px;height:${OG_HEIGHT}px;display:flex;flex-direction:column;justify-content:center;
padding:0 96px;box-sizing:border-box;background:var(--bg)}
h1{font-family:var(--font-display);font-size:96px;margin:0 0 24px;color:var(--text-strong);letter-spacing:-0.02em}
h1 span{font-size:44px;color:var(--mute);letter-spacing:0;margin-left:20px;font-weight:500}
p{font-family:var(--font-body);font-size:34px;margin:0;color:var(--mute);max-width:900px;line-height:1.35}
.rule{width:180px;height:10px;background:var(--crimson);border-radius:999px;margin-bottom:40px}
</style></head><body>
<div class="rule"></div>
<h1>Arena<span>by Dravensoft</span></h1>
<p>${escape(TAGLINE)}</p>
</body></html>
`;
}

export function notFoundPage() {
  return `${head('Not found, Arena by Dravensoft', 'That page is not here.', `https://${DOMAIN}/`, 0)}
<main style="max-width:40rem;margin:0 auto;padding:var(--sp-8) var(--sp-6)">
<h1 style="font-family:var(--font-display)">That page is not here</h1>
<p><a href="/">Back to the start</a></p>
</main>
</body></html>
`;
}

export function robots() {
  return `User-agent: *\nAllow: /\n\nSitemap: https://${DOMAIN}/sitemap.xml\n`;
}

export function sitemap(base = repoRoot) {
  const entries = ['', ...pages(base)]
    .map((rel) => `  <url><loc>${rel ? url(rel) : `https://${DOMAIN}/`}</loc></url>`)
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function linksFor(directory: string, base: string) {
  if (directory === '') {
    return entryPoints(base).filter((e) => e.public).map((e) => ({ href: `.${e.path}`, label: e.label }));
  }
  if (directory === 'intro/guidelines') {
    return guidelineLinks(base);
  }
  const sink = /^frameworks\/([a-z]+)\/kitchen-sink$/.exec(directory);
  if (sink) {
    return extensions(base).map((e) => ({ href: `${e}/`, label: `${e} voice` }));
  }
  const one = /^frameworks\/([a-z]+)\/kitchen-sink\/([a-z]+)$/.exec(directory);
  if (one) return [{ href: SINK_PAGE, label: titleOf(`${directory}/${SINK_PAGE}`, base) }];
  return [];
}

function guidelineLinks(base: string) {
  const dir = join(base, 'intro', 'guidelines');
  if (!existsSync(dir)) return [];
  return pages(base)
    .filter((rel) => rel.startsWith('intro/guidelines/'))
    .map((rel) => ({ href: rel.slice('intro/guidelines/'.length), label: titleOf(rel, base) }));
}

export async function buildSite(base = repoRoot, out = join(base, SITE_DIR)) {
  reset(out);
  const written: string[] = [];

  for (const tree of COPIED) {
    if (existsSync(join(base, tree))) written.push(...copyAll(join(base, tree), out, tree));
  }

  for (const layer of LAYERS) {
    const sinks = join(base, 'frameworks', layer, 'kitchen-sink');
    if (existsSync(sinks)) {
      written.push(...copyAll(sinks, out, `frameworks/${layer}/kitchen-sink`));
    }
    for (const rel of playgroundsOnDisk(layer, base).values()) {
      written.push(copy(join(base, rel), out, rel));
      const entry = rel.replace(PLAYGROUND_SUFFIX, '.demo.entry.generated.js');
      if (existsSync(join(base, entry))) written.push(copy(join(base, entry), out, entry));
    }
  }

  for (const rel of phosphorFiles(base)) written.push(copy(join(base, rel), out, rel));

  for (const directory of indexedDirectories(base)) {
    const depth = directory === '' ? 0 : directory.split('/').length;
    const rel = directory === '' ? 'index.html' : `${directory}/index.html`;
    const page = directory === ''
      ? landingPage(base)
      : indexPage(titleFor(directory), linksFor(directory, base), depth);
    written.push(write(out, rel, page));
  }

  for (const rel of servedDocs(base)) written.push(copy(join(base, rel), out, rel));

  written.push(write(out, LLMS_INDEX, index(base)));
  for (const layer of LAYERS) written.push(write(out, layerFile(layer), corpus(layer, base)));

  written.push(write(out, OG_SOURCE, ogPage()));
  written.push(write(out, '404.html', notFoundPage()));
  written.push(write(out, 'robots.txt', robots()));
  written.push(write(out, 'sitemap.xml', sitemap(base)));
  written.push(write(out, 'CNAME', `${DOMAIN}\n`));

  const png = await renderOgImage(join(out, OG_SOURCE));
  writeFileSync(join(out, OG_FILE), png);
  written.push(join(out, OG_FILE));

  return written;
}

function titleFor(directory: string) {
  if (directory === 'intro/guidelines') return 'Guidelines, Arena by Dravensoft';
  const sink = /^frameworks\/([a-z]+)\/kitchen-sink$/.exec(directory);
  if (sink) return `Kitchen sinks, ${sink[1]}`;
  const one = /^frameworks\/([a-z]+)\/kitchen-sink\/([a-z]+)$/.exec(directory);
  if (one) return `${one[2]} voice, ${one[1]}`;
  return directory;
}

async function main() {
  const written = await buildSite();
  console.log(`build-site: ${written.length} file(s) into ${SITE_DIR}`);
}

if (isMainModule(import.meta.url)) await main();
