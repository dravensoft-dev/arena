/* Assembles the published site out of the built tree. It copies rather than rewrites: a page names
 * its assets by a relative href counting directories, so the output holds the same shape under the
 * same names and the page served from the domain is the page a clone serves. node_modules is on
 * that path for a playground's Phosphor sheets, and only the sheet and font binaries travel.
 * copyAll, not package-assembly's copyTree, whose exclusions are exactly what a playground loads.
 * A page's JavaScript is copied by following it: the React pages load unbundled ES modules, so
 * publishing the entry beside the page and stopping there put up pages answering 200 at every href
 * with an empty root. What it authors is what serve.ts answers at request time and a static host
 * cannot: an index per directory a visitor lands on, the landing page, the sitemap, robots.txt, a
 * 404 and the preview card. No count is typed on any; each is derived from the map the packages ship. */

import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { reset, write, copy } from '../../lib/arena/package-assembly.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import {
  DOMAIN, SITE_DIR, LAYERS, COPIED, SINK_PAGE,
  entryPoints, sinkNames, components, pages, indexedDirectories, phosphorFiles,
  playgroundsOnDisk, playgroundSections, modules, titleOf, url, directoryUrl, REPOSITORY,
} from '../../lib/arena/site-pages.ts';
import { renderPageImage } from '../../lib/arena/page-image.ts';
import {
  HERO_SHEET, HERO_SOURCE, HERO_FILE, HERO_WIDTH, HERO_HEIGHT, heroPage, heroStyles,
} from '../../lib/arena/hero-page.ts';
import { LLMS_INDEX, layerFile, index, corpus, servedDocs } from '../../lib/arena/llms-index.ts';

export const node = {
  name: 'build:site',
  reads: [
    'skills/design/SKILL.md', 'skills/design/references/*.md', 'frameworks/**/INDEX.md', 'frameworks/**/*.prompt.md', 'frameworks/*/PACKAGE.md',
    '!frameworks/*/build/package/**', '!frameworks/*/dist/**',
    'intro/**', 'contracts/behaviour/**', 'contracts/design/**', 'contracts/design-generated/**', 'assets/**',
    'plugin-style-store/**/plugin.css', 'plugin-style-store/catalogue/*/plugin.tokens.json',
    'frameworks/tailwind/consume/**', 'frameworks/react/vendor/**',
    'frameworks/*/kitchen-sink/**', 'frameworks/*/components/**',
    'frameworks/*/playground/**', 'frameworks/react/*.generated.js',
    'frameworks/angular/build/demo/**',
  ],
  writes: [`${SITE_DIR}/**`],
  feeds: ['check:site'],
};

export const OG_FILE = 'og.png';
export const OG_SOURCE = 'og.html';
export const OG_WIDTH = 1200;
export const OG_HEIGHT = 630;

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

const head = (title: string, description: string, canonical: string | null, depth: number) => {
  const up = '../'.repeat(depth);
  const addressed = canonical === null
    ? '<meta name="robots" content="noindex">'
    : `<link rel="canonical" href="${canonical}">\n<meta property="og:url" content="${canonical}">`;
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escape(title)}</title>
<meta name="description" content="${escape(description)}">
${addressed}
<meta property="og:type" content="website">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
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

export type Section = { heading?: string; links: { href: string; label: string }[] };

export function indexPage(
  title: string, description: string, canonical: string, sections: Section[], depth: number,
) {
  const blocks = sections.map(({ heading, links }) => {
    const items = links
      .map(({ href, label }) => `  <li><a href="${href}">${escape(label)}</a></li>`)
      .join('\n');
    const headed = heading === undefined
      ? ''
      : `<h2 style="font-family:var(--font-display)">${escape(heading)}</h2>\n`;
    return `${headed}<ul style="line-height:2">\n${items}\n</ul>`;
  }).join('\n');
  return `${head(title, description, canonical, depth)}
<main style="max-width:60rem;margin:0 auto;padding:var(--sp-6)">
<h1 style="font-family:var(--font-display)">${escape(title)}</h1>
${blocks}
</main>
</body></html>
`;
}

export const TAGLINE = 'One design system, in React and in Angular, built to be operated by an AI agent.';

export function structuredData() {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: 'Arena by Dravensoft',
    alternateName: 'Arena',
    description: TAGLINE,
    url: `https://${DOMAIN}/`,
    codeRepository: REPOSITORY,
    license: 'https://opensource.org/license/mit',
    programmingLanguage: ['TypeScript', 'CSS'],
    runtimePlatform: ['React', 'Angular'],
    applicationCategory: 'DeveloperApplication',
    image: `https://${DOMAIN}/${OG_FILE}`,
    author: { '@type': 'Organization', name: 'Dravensoft' },
  });
}

export function landingPage(base = repoRoot) {
  const drawn = components('react', base).length;
  const links = entryPoints(base).filter((entry) => entry.public);
  const cards = links
    .map((entry) => `  <li><a href=".${entry.path}">${escape(entry.label)}</a></li>`)
    .join('\n');
  return `${head('Arena by Dravensoft', TAGLINE, `https://${DOMAIN}/`, 0)}
<script type="application/ld+json">${structuredData()}</script>
<main style="max-width:64rem;margin:0 auto;padding:var(--sp-8) var(--sp-6)">
<h1 style="font-family:var(--font-display);font-size:var(--fs-hero);margin:0">Arena by Dravensoft</h1>
<p style="font-size:var(--fs-lg);color:var(--mute);max-width:44rem">${escape(TAGLINE)}</p>

<img src="./${HERO_FILE}" width="${HERO_WIDTH}" height="${HERO_HEIGHT}" alt="One ArenaButton under
three style plugins, with the API and behaviour contracts pointing at it" style="max-width:100%;
height:auto;margin:var(--sp-6) 0">

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
<h2 style="font-family:var(--font-display)">Take it</h2>
<ul style="line-height:2">
  <li><a href="https://www.npmjs.com/package/@dravensoft/arena-react">@dravensoft/arena-react</a></li>
  <li><a href="https://www.npmjs.com/package/@dravensoft/arena-angular">@dravensoft/arena-angular</a></li>
  <li><a href="${REPOSITORY}">The repository, MIT</a></li>
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
  return `${head('Not found, Arena by Dravensoft', 'That page is not here.', null, 0)}
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
  const located = [...indexedDirectories(base).map(directoryUrl), ...pages(base).map(url)];
  const entries = located.map((loc) => `  <url><loc>${loc}</loc></url>`).join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries}\n</urlset>\n`;
}

function sectionsFor(directory: string, base: string): Section[] {
  if (directory === 'intro/guidelines') {
    return [{ links: guidelineLinks(base) }];
  }
  const drawn = /^frameworks\/([a-z]+)\/components$/.exec(directory);
  if (drawn) return playgroundSections(drawn[1] ?? '', base);
  const sink = /^frameworks\/([a-z]+)\/kitchen-sink$/.exec(directory);
  if (sink) {
    return [{ links: sinkNames(base).map((name) => ({ href: `${name}/`, label: name })) }];
  }
  const one = /^frameworks\/([a-z]+)\/kitchen-sink\/([a-z]+)$/.exec(directory);
  if (one) return [{ links: [{ href: SINK_PAGE, label: titleOf(`${directory}/${SINK_PAGE}`, base) }] }];
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
    }
  }

  const carried = new Set(written);
  for (const rel of modules(base)) {
    if (carried.has(join(out, rel))) continue;
    written.push(copy(join(base, rel), out, rel));
  }

  for (const rel of phosphorFiles(base)) written.push(copy(join(base, rel), out, rel));

  for (const directory of indexedDirectories(base)) {
    const depth = directory === '' ? 0 : directory.split('/').length;
    const rel = directory === '' ? 'index.html' : `${directory}/index.html`;
    const page = directory === ''
      ? landingPage(base)
      : indexPage(
        titleFor(directory), descriptionFor(directory), directoryUrl(directory),
        sectionsFor(directory, base), depth,
      );
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

  written.push(write(out, HERO_SHEET, await heroStyles()));
  written.push(write(out, HERO_SOURCE, heroPage(components('react', base).length)));

  const png = await renderPageImage(join(out, OG_SOURCE), OG_WIDTH, OG_HEIGHT);
  writeFileSync(join(out, OG_FILE), png);
  written.push(join(out, OG_FILE));

  const hero = await renderPageImage(join(out, HERO_SOURCE), HERO_WIDTH, HERO_HEIGHT);
  writeFileSync(join(out, HERO_FILE), hero);
  written.push(join(out, HERO_FILE));

  return written;
}

function descriptionFor(directory: string) {
  if (directory === 'intro/guidelines') {
    return 'The specimens every Arena screen is drawn from: colour, type, spacing, effects and '
      + 'icons, each showing the token a component reads rather than describing it.';
  }
  const drawn = /^frameworks\/([a-z]+)\/components$/.exec(directory);
  if (drawn) {
    return `Every Arena component under ${drawn[1]}, each on a page that draws it and lets you `
      + 'change what it takes.';
  }
  const sink = /^frameworks\/([a-z]+)\/kitchen-sink$/.exec(directory);
  if (sink) {
    return `Every Arena component under ${sink[1]} on one page, under each style plugin this `
      + 'repository ships.';
  }
  const one = /^frameworks\/([a-z]+)\/kitchen-sink\/([a-z]+)$/.exec(directory);
  if (one) {
    return `The ${one[2]} style plugin drawing every Arena component under ${one[1]} on one page.`;
  }
  return TAGLINE;
}

function titleFor(directory: string) {
  if (directory === 'intro/guidelines') return 'Guidelines, Arena by Dravensoft';
  const drawn = /^frameworks\/([a-z]+)\/components$/.exec(directory);
  if (drawn) return `Playgrounds, ${drawn[1]}`;
  const sink = /^frameworks\/([a-z]+)\/kitchen-sink$/.exec(directory);
  if (sink) return `Kitchen sinks, ${sink[1]}`;
  const one = /^frameworks\/([a-z]+)\/kitchen-sink\/([a-z]+)$/.exec(directory);
  if (one) return `${one[2]}, ${one[1]}`;
  return directory;
}

async function main() {
  const written = await buildSite();
  console.log(`build-site: ${written.length} file(s) into ${SITE_DIR}`);
}

if (isMainModule(import.meta.url)) await main();
