/* What the published site is, named once and read by both the thing that builds it and the dev
 * server, so a page a contributor opens and a stranger's cannot come from two lists; PAGES in
 * serve.ts was that second list. A component name is asked of the map the packages ship rather
 * than of a directory walk, since a playground its build dropped is an ABSENT file and a walk sees
 * an absence as nothing; both sides compare in kebab, React keying by exported name and Angular by
 * selector. moduleGraph is that argument for JavaScript: a React page loads unbundled ES modules,
 * so the set is walked from the page through every import to the leaves and a specifier reaching
 * nothing is reported. Paths are repo-relative and preserved, so no href is rewritten and the page
 * served from the domain is a clone's. indexedDirectories is what serve.ts lists at request time
 * and a host 404s. A specimen under intro/guidelines/ is named by the @dsCard header instead. */
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix, isInside } from '../../utils/posix-path.ts';
import { pageModules, importSpecifiers } from '../../utils/module-graph.ts';
import { byCodeUnit, byKey } from '../../utils/compare.ts';
import { memoBy } from '../../utils/memo.ts';
import { repoRoot as root } from './repo-root.ts';
import { componentMap } from './component-map.ts';
import { PHOSPHOR_WEIGHTS } from './playground-page.ts';
import { kebab, pascal } from '../../utils/case.ts';

export const DOMAIN = 'arena.dravensoft.org';
export const SITE_DIR = 'dist/site';
export const LAYERS = ['react', 'angular'];
export const PLAYGROUND_SUFFIX = '.demo.generated.html';
export const SINK_PAGE = 'index.generated.html';
export const PLAYGROUND_INDEX = 'components';
export const PHOSPHOR = 'node_modules/@phosphor-icons/web/src';
export const PHOSPHOR_KEEP = ['style.css', '.woff2', '.woff'];

export const COPIED = [
  'intro',
  'contracts/behaviour',
  'contracts/design',
  'contracts/design-generated',
  'plugin-style-store',
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
    ...LAYERS.map((layer) => ({
      label: `Playgrounds, ${layer}`,
      path: `/${componentsDir(layer)}/`,
      public: true,
    })),
  ];
}

export function componentsDir(layer: string) {
  return `frameworks/${layer}/${PLAYGROUND_INDEX}`;
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

export function playgroundSections(layer: string, base = root) {
  const under = `${componentsDir(layer)}/`;
  const sections = new Map<string, { href: string; label: string }[]>();
  for (const rel of [...playgroundsOnDisk(layer, base).values()].sort(byCodeUnit)) {
    const href = rel.slice(under.length);
    const category = href.split('/')[0] ?? '';
    const links = sections.get(category) ?? [];
    links.push({ href, label: basename(rel).slice(0, -PLAYGROUND_SUFFIX.length) });
    sections.set(category, links);
  }
  return [...sections.keys()].sort(byCodeUnit).map((category) => ({
    heading: pascal(category),
    links: (sections.get(category) ?? []).sort(byKey(({ label }) => label)),
  }));
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

export const moduleGraph = memoBy((base: string = root) => base, (base: string = root) => {
  const carried: string[] = [];
  const absent: string[] = [];
  const seen = new Set<string>();
  const queue: { from: string; target: string }[] = [];

  for (const page of pages(base)) {
    const path = join(base, page);
    if (!existsSync(path)) continue;
    for (const target of pageModules(readFileSync(path, 'utf8'))) queue.push({ from: path, target });
  }

  for (let at = 0; at < queue.length; at += 1) {
    const step = queue[at];
    if (step === undefined) continue;
    const path = step.target.startsWith('/')
      ? join(base, step.target)
      : resolve(dirname(step.from), step.target);
    const from = relPosix(base, step.from);
    if (!isInside(base, path)) {
      absent.push(`${from} loads ${step.target}, which climbs out of the repository`);
      continue;
    }
    const rel = relPosix(base, path);
    if (seen.has(rel)) continue;
    seen.add(rel);
    if (!existsSync(path)) {
      absent.push(`${from} loads ${step.target}, and the tree carries no ${rel}`);
      continue;
    }
    carried.push(rel);
    for (const specifier of importSpecifiers(readFileSync(path, 'utf8'))) {
      queue.push({ from: path, target: specifier });
    }
  }

  return { carried: carried.sort(byCodeUnit), absent: absent.sort(byCodeUnit) };
});

export function modules(base = root) {
  return moduleGraph(base).carried;
}

export function missingModules(base = root) {
  return moduleGraph(base).absent;
}

export function indexedDirectories(base = root) {
  return [
    '',
    'intro/guidelines',
    ...LAYERS.map((layer) => `frameworks/${layer}/kitchen-sink`),
    ...LAYERS.map((layer) => componentsDir(layer)),
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
