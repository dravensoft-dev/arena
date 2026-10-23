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
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix, isInside } from '../../utils/posix-path.ts';
import { pageModules, importSpecifiers } from '../../utils/module-graph.ts';
import { byCodeUnit, byKey } from '../../utils/compare.ts';
import { memoBy } from '../../utils/memo.ts';
import { repoRoot as root } from './repo-root.ts';
import { IDENTITY_PAGES } from './agent-payload.ts';
import { shippedComponents } from './component-map.ts';
import { isVariantArrangement, type SinkFixture } from './kitchen-sink-model.ts';
import { SPRITE_FILE } from './playground-page.ts';
import { kebab, pascal } from '../../utils/case.ts';

export const DOMAIN = 'arena.dravensoft.org';
export const REPOSITORY = 'https://github.com/dravensoft-dev/arena';
export const SITE_DIR = 'dist/site';
export const LAYERS = ['react', 'angular'];
export const PLAYGROUND_SUFFIX = '.demo.generated.html';
export const SINK_PAGE = 'index.generated.html';
export const PLAYGROUND_INDEX = 'components';
export { SPRITE_FILE };

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

export const COPIED_FILES = IDENTITY_PAGES;

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

export function variantSinkNames(base = root) {
  return sinkNames(base).filter((name) => isVariantArrangement(
    JSON.parse(readFileSync(join(base, SINK_FIXTURES, `${name}${SINK_SUFFIX}`), 'utf8')) as Pick<SinkFixture, 'sections'>));
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
  return shippedComponents(layer, base).map(kebab).sort();
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

export function treePages(base = root) {
  const playgrounds = LAYERS.flatMap((layer) => [...playgroundsOnDisk(layer, base).values()]);
  return [
    'intro/Arena - Overview.html',
    'intro/Dravensoft Identity.dc.html',
    ...COPIED_FILES,
    ...guidelinePages(base),
    ...sinkPages(base),
    ...playgrounds.sort(),
  ];
}

export const ADOPTER_MANIFEST = 'arena-adopter.json';
export const ADOPTER_NAME = /^[a-z0-9-]+$/;
const ADOPTER_HREF = /^(?:[A-Za-z0-9._-]+\/)+$/;

export type AdopterLink = { label: string; href: string };
export type AdopterSection = { heading: string; links: AdopterLink[] };
export type AdopterManifest = {
  arena: string; name: string; title: string; description: string; repository: string; sections: AdopterSection[];
};
export type AdopterVerdict = { publish: true; manifest: AdopterManifest; line: string } | { publish: false; line: string };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function adopterShape(raw: unknown): AdopterManifest | string {
  if (!isRecord(raw)) return 'the manifest is not an object';
  for (const field of ['arena', 'name', 'title', 'description', 'repository']) {
    if (typeof raw[field] !== 'string') return `${field} is missing or not a string`;
  }
  if (!Array.isArray(raw.sections)) return 'sections is missing or not an array';
  for (const section of raw.sections as unknown[]) {
    if (!isRecord(section) || typeof section.heading !== 'string' || !Array.isArray(section.links)) {
      return 'a section lacks a heading or its links';
    }
    for (const link of section.links as unknown[]) {
      if (!isRecord(link) || typeof link.label !== 'string' || typeof link.href !== 'string') {
        return 'a link lacks a label or an href';
      }
      if (!ADOPTER_HREF.test(link.href) || link.href.split('/').some((part) => part === '.' || part === '..')) {
        return `the href ${JSON.stringify(link.href)} is not a directory under the adopter's own`;
      }
    }
  }
  return raw as unknown as AdopterManifest;
}

export function adopterVerdict(dir: string, version: string): AdopterVerdict {
  const refuse = (why: string): AdopterVerdict => ({ publish: false, line: `${dir}: not published, ${why}` });
  const path = join(dir, ADOPTER_MANIFEST);
  if (!existsSync(path)) return refuse(`it carries no ${ADOPTER_MANIFEST}`);
  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return refuse(`${ADOPTER_MANIFEST} is not JSON`);
  }
  const manifest = adopterShape(raw);
  if (typeof manifest === 'string') return refuse(manifest);
  if (!ADOPTER_NAME.test(manifest.name)) return refuse(`the name ${JSON.stringify(manifest.name)} is not a plain directory name`);
  if (manifest.arena !== version) return refuse(`it declares Arena ${manifest.arena} and this tree is ${version}`);
  return { publish: true, manifest, line: `${dir}: published for Arena ${version} at /${manifest.name}/` };
}

export function publishedAdopter(out: string): AdopterManifest | null {
  if (!existsSync(out) || !statSync(out).isDirectory()) return null;
  for (const entry of readdirSync(out, { withFileTypes: true }).filter((e) => e.isDirectory()).sort(byKey((e) => e.name))) {
    const path = join(out, entry.name, ADOPTER_MANIFEST);
    if (!existsSync(path)) continue;
    try {
      const manifest = adopterShape(JSON.parse(readFileSync(path, 'utf8')));
      if (typeof manifest !== 'string' && manifest.name === entry.name && ADOPTER_NAME.test(manifest.name)) return manifest;
    } catch {
      continue;
    }
  }
  return null;
}

export function adopterPages(out: string) {
  const adopter = publishedAdopter(out);
  if (adopter === null) return [];
  const hrefs = adopter.sections.flatMap(({ links }) => links.map(({ href }) => `${adopter.name}/${href}index.html`));
  return [...new Set(hrefs)].sort(byCodeUnit);
}

export function adopterDirectories(out: string) {
  const adopter = publishedAdopter(out);
  return adopter === null ? [] : [adopter.name];
}

export function pages(base: string, out: string) {
  return [...treePages(base), ...adopterPages(out)];
}

export const moduleGraph = memoBy((base: string = root) => base, (base: string = root) => {
  const carried: string[] = [];
  const absent: string[] = [];
  const seen = new Set<string>();
  const queue: { from: string; target: string }[] = [];

  for (const page of treePages(base)) {
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

export function indexedDirectories(base: string, out: string) {
  return [
    '',
    'intro/guidelines',
    ...LAYERS.map((layer) => `frameworks/${layer}/kitchen-sink`),
    ...LAYERS.map((layer) => componentsDir(layer)),
    ...LAYERS.flatMap((layer) => sinkNames(base).map((name) => `frameworks/${layer}/kitchen-sink/${name}`)),
    ...adopterDirectories(out),
  ];
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

export function directoryUrl(directory: string) {
  return directory === '' ? `https://${DOMAIN}/` : `${url(directory)}/`;
}
