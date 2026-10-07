/* The payload as addressable resources. A URI per document rather than one blob, because the
 * route this corpus is written for is four stops deep and reading it whole is the thing the
 * depth exists to avoid: a client that fetches arena://component/ArenaInput has paid for one
 * component, and one that fetches the router has paid for the rules. The names are derived from
 * the tree rather than listed here, so a component added to Arena is one this server serves
 * without being told. A payload carrying no component at all is an error, since an empty
 * catalogue answers every question with silence. A document is written in a tree and served
 * over a scheme, so the links it carries are resolved against the catalogue on the way out: a
 * relative path is correct in a clone and answers nothing here, and a reader who follows one
 * spends a call to be told the server has no such thing. */

import { walk, relPosix, readIn, SUPPORT, type Manifest } from './payload.ts';
import { byCodeUnit, dirPosix, resolvePosix } from './posix.ts';

export const SCHEME = 'arena';

export const ROUTER_URI = `${SCHEME}://router`;
export const SUPPORT_URI = `${SCHEME}://support`;
export const ROLES_URI = `${SCHEME}://roles`;
export const RULES_URI = `${SCHEME}://rules`;
export const LAYER_INDEX_URI = `${SCHEME}://index`;
export const CATALOGUE_URI = `${SCHEME}://index/all`;
export const VOCABULARY_URI = `${SCHEME}://vocabulary`;

export const REFERENCE_DIR = 'skills/design/references';
export const NEUTRAL_INDEX = 'frameworks/INDEX.md';
export const VOCABULARY = 'frameworks/VOCABULARY.md';
export const ROLES = 'contracts/design/roles.json';
export const RULES = 'rules.json';
export const PROMPT_SUFFIX = '.prompt.md';
export const INDEX = 'INDEX.md';
export const TOKENS_DIR = 'contracts/design';
export const BEHAVIOUR_DIR = 'contracts/behaviour';
export const TOKENS_PREFIX = `${SCHEME}://tokens/`;
export const BEHAVIOUR_PREFIX = `${SCHEME}://behaviour/`;

const jsonIn = (rel: string, dir: string) => dirPosix(rel) === dir && rel.endsWith('.json');
const jsonName = (rel: string) => (rel.split('/').at(-1) ?? '').replace(/\.json$/, '');

export const FAMILY_PREFIX = `${SCHEME}://family/`;

export type Entry = { uri: string; rel: string; title: string; mime: string };

export function extractFamilies(text: string): Array<{ name: string; description: string }> {
  const families: Array<{ name: string; description: string }> = [];
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line && line.startsWith('## ') && !line.startsWith('## The')) {
      const name = line.slice(3).trim();
      let j = i + 1;
      while (j < lines.length && lines[j]?.trim() === '') j += 1;
      const description = lines[j]?.trim() ?? '';
      const firstSentence = description.split(/[.!?]/)[0] ?? '';
      if (name && firstSentence) {
        families.push({ name, description: firstSentence });
      }
    }
  }
  return families;
}

export function nameOf(rel: string) {
  const last = rel.split('/').at(-1) ?? '';
  return last.replace(PROMPT_SUFFIX, '').replace(/\.md$/, '');
}

export function categoryOf(rel: string) {
  return rel.split('/').at(-2) ?? '';
}

export function entries(payload: string, manifest: Manifest): Entry[] {
  const files = walk(payload).map((path) => relPosix(payload, path));
  const layer = manifest.layer;
  const found: Entry[] = [
    { uri: ROUTER_URI, rel: manifest.router, mime: 'text/markdown',
      title: 'The router: the rules of the language, and where each question is answered' },
    { uri: SUPPORT_URI, rel: SUPPORT, mime: 'application/json',
      title: 'What Arena supports on every axis, with the evidence behind each answer' },
  ];
  if (files.includes(RULES)) {
    found.push({ uri: RULES_URI, rel: RULES, mime: 'application/json',
      title: 'Every rule of the language, and whether arena_check reports the code you write for it' });
  }
  if (files.includes(ROLES)) {
    found.push({ uri: ROLES_URI, rel: ROLES, mime: 'application/json',
      title: 'Every style role a project answers, with a type and no value' });
  }
  if (files.includes(NEUTRAL_INDEX)) {
    found.push({ uri: CATALOGUE_URI, rel: NEUTRAL_INDEX, mime: 'text/markdown',
      title: 'Whether a component exists at all, and which layers ship it' });
  }
  if (files.includes(VOCABULARY)) {
    found.push({ uri: VOCABULARY_URI, rel: VOCABULARY, mime: 'text/markdown',
      title: 'The vocabulary: every class you write on a component to decide how it looks, such as full width' });
    const text = readIn(payload, VOCABULARY);
    if (text) {
      const families = extractFamilies(text);
      for (const family of families) {
        found.push({
          uri: `${FAMILY_PREFIX}${family.name}`,
          rel: VOCABULARY,
          mime: 'text/markdown',
          title: `Family ${family.name}: ${family.description}`,
        });
      }
    }
  }
  const layerIndex = `frameworks/${layer}/${INDEX}`;
  if (files.includes(layerIndex)) {
    found.push({ uri: LAYER_INDEX_URI, rel: layerIndex, mime: 'text/markdown',
      title: `Every ${layer} component, under the category it is filed under` });
  }
  for (const rel of files) {
    if (jsonIn(rel, TOKENS_DIR) && rel !== ROLES) {
      found.push({ uri: `${TOKENS_PREFIX}${jsonName(rel)}`, rel, mime: 'application/json',
        title: `Tokens: ${jsonName(rel)}` });
      continue;
    }
    if (jsonIn(rel, BEHAVIOUR_DIR)) {
      found.push({ uri: `${BEHAVIOUR_PREFIX}${jsonName(rel)}`, rel, mime: 'application/json',
        title: `Behaviour: ${jsonName(rel)}` });
      continue;
    }
    if (rel.startsWith(`${REFERENCE_DIR}/`) && rel.endsWith('.md')) {
      found.push({ uri: `${SCHEME}://reference/${nameOf(rel)}`, rel, mime: 'text/markdown',
        title: `Reference: ${nameOf(rel)}` });
      continue;
    }
    if (rel.endsWith(`/${INDEX}`) && rel.includes('/components/')) {
      found.push({ uri: `${SCHEME}://category/${categoryOf(rel)}`, rel, mime: 'text/markdown',
        title: `Every ${layer} component filed under ${categoryOf(rel)}` });
      continue;
    }
    if (rel.endsWith(PROMPT_SUFFIX)) {
      found.push({ uri: `${SCHEME}://component/${nameOf(rel)}`, rel, mime: 'text/markdown',
        title: `${nameOf(rel)}: its members, its examples and its Do and Don't` });
    }
  }
  return found;
}

export function catalogue(payload: string, manifest: Manifest) {
  const found = entries(payload, manifest);
  const components = found.filter((one) => one.uri.startsWith(`${SCHEME}://component/`));
  if (components.length === 0) {
    throw new Error('arena-mcp: the payload carries no component document, so every question about '
      + 'a component would be answered with silence. Check that the Arena package it came from is '
      + 'whole');
  }
  return { entries: found, byUri: new Map(found.map((one) => [one.uri, one])), byRel: relIndex(found) };
}

export const MARKDOWN_LINK = /\]\(([^)\s]+)\)/g;
export const ADDRESSED = /^(?:[a-z][a-z0-9+.-]*:|#|\/)/i;

export function relIndex(found: Entry[]) {
  const index = new Map<string, string>();
  for (const entry of found) {
    if (!entry.uri.startsWith(FAMILY_PREFIX)) {
      index.set(entry.rel, entry.uri);
    }
  }
  return index;
}

export function withUris(text: string, rel: string, byRel: Map<string, string>) {
  return text.replace(MARKDOWN_LINK, (whole, target: string) => {
    if (ADDRESSED.test(target)) return whole;
    const cut = target.indexOf('#');
    const path = cut === -1 ? target : target.slice(0, cut);
    const uri = byRel.get(resolvePosix(dirPosix(rel), path));
    return uri === undefined ? whole : `](${uri}${cut === -1 ? '' : target.slice(cut)})`;
  });
}

export function textOf(payload: string, entry: Entry, byRel: Map<string, string>) {
  const text = readIn(payload, entry.rel);
  if (text === null || entry.mime !== 'text/markdown') return text;
  return withUris(text, entry.rel, byRel);
}

export const WORD = /[a-z0-9]+/g;
export const CAMEL = /([a-z0-9])([A-Z])/g;

export const IN_NAME = 8;
export const IN_TITLE = 4;
export const IN_OPENING = 1;

export function words(text: string) {
  return new Set((text.replace(CAMEL, '$1 $2').toLowerCase().match(WORD) ?? []));
}

export function score(entry: Entry, wanted: Set<string>, summary: string) {
  const name = words(nameOf(entry.rel));
  const title = words(entry.title);
  const opening = words(summary);
  let hits = 0;
  let rank = 0;
  for (const one of wanted) {
    const weight = name.has(one) ? IN_NAME : title.has(one) ? IN_TITLE : opening.has(one) ? IN_OPENING : 0;
    if (weight === 0) continue;
    hits += 1;
    rank += weight;
  }
  return { hits, rank };
}

export function tokenNames(node: unknown, path: string[] = []): string[] {
  if (node === null || typeof node !== 'object') return [];
  const own = '$value' in node ? [path.join('-')] : [];
  return [...own, ...Object.entries(node).filter(([key]) => !key.startsWith('$'))
    .flatMap(([key, child]) => tokenNames(child, [...path, key]))];
}

export function summaryOf(entry: Entry, text: string) {
  if (entry.uri.startsWith(BEHAVIOUR_PREFIX)) return '';
  if (!entry.uri.startsWith(TOKENS_PREFIX)) return text.slice(0, 400);
  try {
    const tree = JSON.parse(text);
    return [...Object.keys(tree), ...tokenNames(tree)].join(' ');
  } catch {
    return '';
  }
}

export function search(payload: string, found: Entry[], query: string, limit = 8) {
  const wanted = words(query);
  if (wanted.size === 0) return [];
  const byRel = relIndex(found);
  return found
    .map((entry) => {
      const text = textOf(payload, entry, byRel) ?? '';
      return { entry, ...score(entry, wanted, summaryOf(entry, text)) };
    })
    .filter((one) => one.hits > 0)
    .sort((a, b) => b.rank - a.rank || byCodeUnit(a.entry.uri, b.entry.uri))
    .slice(0, limit);
}
