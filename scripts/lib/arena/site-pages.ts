/* What the published site is, named once and read by both the thing that builds it and the dev
 * server, so a page a contributor opens and a page a stranger opens cannot come from two lists;
 * PAGES in serve.ts was that second list. A component name is asked of the map the packages
 * ship rather than of a directory walk, because a playground missing because its build failed is
 * an ABSENT file and a walk sees an absence as nothing at all; both sides are compared in kebab,
 * since React keys that map by exported name and Angular by selector. Paths are repo-relative
 * and preserved into the output, so no href is rewritten and the page served from the domain is
 * the page served from a clone. indexedDirectories is where serve.ts answers with a listing it
 * makes at request time and a static host answers 404. A specimen under intro/guidelines/ has no
 * <title> and is named by the @dsCard header the Overview page already reads. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { repoRoot as root } from './repo-root.ts';
import { componentMap } from './component-map.ts';
import { PHOSPHOR_WEIGHTS } from './playground-page.ts';
import { kebab } from '../../utils/case.ts';

export const DOMAIN = 'arena.dravensoft.org';
export const SITE_DIR = 'dist/site';
export const LAYERS = ['react', 'angular'];
export const PLAYGROUND_SUFFIX = '.demo.generated.html';
export const SINK_PAGE = 'index.generated.html';
export const PHOSPHOR = 'node_modules/@phosphor-icons/web/src';
export const PHOSPHOR_KEEP = ['style.css', '.woff2', '.woff'];

export const COPIED = [
  'intro',
  'contracts/design',
  'contracts/design-generated',
  'assets',
  'frameworks/tailwind/consume',
  'frameworks/react/vendor',
  'frameworks/angular/build/demo',
];

export type Entry = { label: string; path: string; public: boolean };

export const SINK_FIXTURES = 'frameworks/kitchen-sink';
export const SINK_SUFFIX = '.sink.json';

export function sinkNames(base = root) {
  const dir = join(base, SINK_FIXTURES);
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((file) => file.endsWith(SINK_SUFFIX))
    .map((file) => file.slice(0, -SINK_SUFFIX.length))
    .sort();
}

export function entryPoints(base = root): Entry[] {
  return [
    { label: 'Overview', path: '/intro/Arena%20-%20Overview.html', public: true },
    { label: 'Identity', path: '/intro/Dravensoft%20Identity.dc.html', public: true },
    { label: 'Guidelines', path: '/intro/guidelines/', public: true },
    ...LAYERS.map((layer) => ({
      label: `Kitchen sink, ${layer}`,
      path: `/frameworks/${layer}/kitchen-sink/`,
      public: true,
    })),
  ];
}

export function components(layer: string, base = root) {
  return Object.keys(componentMap(layer, base).draws).map(kebab).sort();
}

export function playgroundsOnDisk(layer: string, base = root) {
  const dir = join(base, 'frameworks', layer, 'components');
  if (!existsSync(dir)) return new Map<string, string>();
  const found = new Map<string, string>();
  for (const path of walkFiles(dir)) {
    if (!path.endsWith(PLAYGROUND_SUFFIX)) continue;
    found.set(kebab(basename(path).slice(0, -PLAYGROUND_SUFFIX.length)), relPosix(base, path));
  }
  return found;
}

export function missingPlaygrounds(base = root) {
  const absent = [];
  for (const layer of LAYERS) {
    const drawn = playgroundsOnDisk(layer, base);
    for (const name of components(layer, base)) {
      if (!drawn.has(name)) absent.push(`frameworks/${layer}: ${name} draws no playground page`);
    }
  }
  return absent;
}

export function sinkPages(base = root) {
  return LAYERS.flatMap((layer) => sinkNames(base).map(
    (name) => `frameworks/${layer}/kitchen-sink/${name}/${SINK_PAGE}`,
  ));
}

export function guidelinePages(base = root) {
  const dir = join(base, 'intro', 'guidelines');
  if (!existsSync(dir)) return [];
  return walkFiles(dir).filter((path) => path.endsWith('.html')).map((path) => relPosix(base, path)).sort();
}

export function pages(base = root) {
  const playgrounds = LAYERS.flatMap((layer) => [...playgroundsOnDisk(layer, base).values()]);
  return [
    'intro/Arena - Overview.html',
    'intro/Dravensoft Identity.dc.html',
    ...guidelinePages(base),
    ...sinkPages(base),
    ...playgrounds.sort(),
  ];
}

export function indexedDirectories(base = root) {
  return [
    '',
    'intro/guidelines',
    ...LAYERS.map((layer) => `frameworks/${layer}/kitchen-sink`),
    ...LAYERS.flatMap((layer) => sinkNames(base).map((name) => `frameworks/${layer}/kitchen-sink/${name}`)),
  ];
}

export function phosphorKeeps(name: string) {
  return PHOSPHOR_KEEP.some((keep) => (keep.startsWith('.') ? name.endsWith(keep) : name === keep));
}

export function phosphorFiles(base = root) {
  const found = [];
  for (const weight of PHOSPHOR_WEIGHTS) {
    const dir = join(base, PHOSPHOR, weight);
    if (!existsSync(dir)) continue;
    for (const path of walkFiles(dir)) {
      if (phosphorKeeps(basename(path))) found.push(relPosix(base, path));
    }
  }
  return found.sort();
}

export const TITLE = /<title>([^<]*)<\/title>/;
export const CARD_GROUP = /@dsCard[^>]*\sgroup="([^"]*)"/;
export const CARD_NAME = /@dsCard[^>]*\sname="([^"]*)"/;

export function titleOf(rel: string, base = root) {
  const path = join(base, rel);
  if (!existsSync(path)) return basename(rel);
  const html = readFileSync(path, 'utf8');
  const titled = TITLE.exec(html)?.[1]?.trim();
  if (titled) return titled;
  const group = CARD_GROUP.exec(html)?.[1]?.trim();
  const name = CARD_NAME.exec(html)?.[1]?.trim();
  if (group && name) return `${group}, ${name}`;
  return basename(rel);
}

export function url(rel: string) {
  return `https://${DOMAIN}/${rel.split('/').map(encodeURIComponent).join('/')}`;
}
