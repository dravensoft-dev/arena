/* The proximity fixture and the two directions it is read in. Each layer's suite renders a case and
 * holds the normalised tree of its own DOM equal to the fixture's tree for that layer, which is how
 * an Angular host shape and a React root shape both reach the gate; the gate rebuilds each tree as
 * HTML, giving every part the slot classes its manifest resolves to by default, and measures it in
 * Chromium. The witness family is a context family the fixture declares, since phase 1 ships none. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from './repo-root.ts';
import type { Family } from '../tailwind/vocabulary.ts';
import { readFamilies } from '../tailwind/vocabulary.ts';

export const PROXIMITY_CASES = 'scripts/check/arena/proximity-cases.json';
export const SUBJECT = 'data-proximity-subject';

export type Tree = { tag: string; part?: string; boundary?: true; contents?: true; class?: string; text?: string; subject?: true; children?: Tree[] };

export type WitnessFamily = Family & { parts?: string[] };

export type ProximityCase = {
  name: string;
  container: string;
  measure: { width: 'container' | 'own' } | { property: string; value: string };
  react: Tree | null;
  angular: Tree | null;
};

export type MarkupCase = {
  name: string;
  root?: string;
  html: string;
} & ({ expect: Record<string, string | null> } | { equal: Record<string, string> });

export type NodeLike = {
  nodeType: number;
  tagName?: string;
  textContent?: string | null;
  childNodes: ArrayLike<NodeLike> | NodeLike[];
  getAttribute?(name: string): string | null;
  hasAttribute?(name: string): boolean;
};

export function readProximity(root = repoRoot) {
  const raw = JSON.parse(readFileSync(join(root, PROXIMITY_CASES), 'utf8')) as { families: WitnessFamily[]; cases: ProximityCase[]; markup?: MarkupCase[] };
  return { families: raw.families, cases: raw.cases, markup: raw.markup ?? [] };
}

export function vocabularyClasses(witness: Family[], root = repoRoot) {
  return new Set([...readFamilies(root).values(), ...witness].flatMap((family) => Object.keys(family.variants)));
}

export function normalize(element: NodeLike, vocabulary: Set<string>, subject: NodeLike | null = null): Tree | null {
  const tree: Tree = { tag: (element.tagName ?? '').toLowerCase() };
  const part = element.getAttribute?.('data-arena-part');
  if (part) tree.part = part;
  if (element.hasAttribute?.('data-arena-boundary')) tree.boundary = true;
  if (/display:\s*contents/.test(element.getAttribute?.('style') ?? '')) tree.contents = true;
  const classes = (element.getAttribute?.('class') ?? '').split(/\s+/).filter((one) => vocabulary.has(one));
  if (classes.length) tree.class = classes.join(' ');
  if (element === subject) tree.subject = true;
  const kids = Array.from(element.childNodes as ArrayLike<NodeLike>);
  const text = kids.filter((one) => one.nodeType === 3).map((one) => one.textContent ?? '').join('').trim();
  if (text) tree.text = text;
  const children = kids.filter((one) => one.nodeType === 1).map((one) => normalize(one, vocabulary, subject)).filter((one): one is Tree => one !== null);
  if (children.length) tree.children = children;
  const kept = tree.part || tree.boundary || tree.contents || tree.class || tree.text || tree.subject || tree.children;
  return kept ? tree : null;
}

const escape = (text: string) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');

export function treeHtml(tree: Tree, classesOf: (part: string) => string): string {
  const attrs: string[] = [];
  if (tree.part) attrs.push(`data-arena-part="${tree.part}"`);
  if (tree.boundary) attrs.push('data-arena-boundary=""');
  if (tree.subject) attrs.push(`${SUBJECT}=""`);
  if (tree.contents) attrs.push('style="display: contents"');
  const classes = [tree.part ? classesOf(tree.part) : '', tree.class ?? ''].filter(Boolean).join(' ');
  if (classes) attrs.push(`class="${classes}"`);
  const inner = `${tree.text ? escape(tree.text) : ''}${(tree.children ?? []).map((one) => treeHtml(one, classesOf)).join('')}`;
  return `<${tree.tag}${attrs.length ? ` ${attrs.join(' ')}` : ''}>${inner}</${tree.tag}>`;
}
