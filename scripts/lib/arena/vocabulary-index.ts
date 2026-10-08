/* What `arena audit` needs to read a class against the vocabulary, as one JSON file a package carries
 * beside its component map: the audit ships inside the package and can read neither a family file
 * nor a manifest from there. */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { bindingAlso, bindingCases, type BehaviourBinding } from './behaviour-contracts.ts';
import { answerOf, answeredFamilies, axesOf, readFamilies, targetOf, type Family } from '../tailwind/vocabulary.ts';
import { layerManifests } from '../tailwind/tailwind-compile.ts';
import { kebab } from '../../utils/case.ts';
import { markerAttributes } from './component-map.ts';
import { DOMAIN } from './site-pages.ts';
import { repoRoot } from './repo-root.ts';
import { write } from './package-assembly.ts';
import type { VocabularyIndex } from '../../generate/core/arena-cli/audit.ts';
import type { ComponentManifest } from '../tailwind/manifest-shapes.ts';

export const VOCABULARY_FILE = 'arena.vocabulary.json';

export const MODAL_PATTERNS = ['dialog-modal', 'alertdialog'];

export function bindsModal(binding: BehaviourBinding) {
  return [...bindingCases(binding), ...bindingAlso(binding)].some(({ pattern }) => MODAL_PATTERNS.includes(pattern ?? ''));
}

export function layerBindings(root = repoRoot): [string, BehaviourBinding][] {
  const out: [string, BehaviourBinding][] = [];
  for (const layer of ['react', 'angular']) {
    const base = join(root, 'frameworks', layer, 'components');
    for (const entry of readdirSync(base, { recursive: true, encoding: 'utf8' }).sort()) {
      if (!entry.endsWith('.behaviour.json')) continue;
      out.push([basename(entry, '.behaviour.json'), JSON.parse(readFileSync(join(base, entry), 'utf8'))]);
    }
  }
  return out;
}

type ApiContract = { component: string; api?: Record<string, { form?: string }> };

const DIRECTIVE_SELECTOR = /selector:\s*'([^']*)'/g;
const TAG_ATTRIBUTE = /^\s*(arena-[a-z0-9-]+)\[([A-Za-z]+)\]\s*$/;

export function directiveAttributes(root = repoRoot): Record<string, string[]> {
  const base = join(root, 'frameworks', 'angular', 'forms');
  const out: Record<string, string[]> = {};
  const sources = readdirSync(base).filter((name) => name.endsWith('.ts') && !name.endsWith('.test.ts')).sort();
  for (const file of sources) {
    for (const [, selector = ''] of readFileSync(join(base, file), 'utf8').matchAll(DIRECTIVE_SELECTOR)) {
      for (const part of selector.split(',')) {
        const [, tag, attribute] = TAG_ATTRIBUTE.exec(part) ?? [];
        if (tag && attribute) out[tag] = [...new Set([...(out[tag] ?? []), attribute])].sort();
      }
    }
  }
  return out;
}

export function layerInputs(root = repoRoot): Record<string, string[]> {
  const base = join(root, 'contracts', 'api', 'components');
  const contracts = readdirSync(base).filter((name) => name.endsWith('.json')).sort()
    .map((file) => JSON.parse(readFileSync(join(base, file), 'utf8')) as ApiContract);
  const slots = contracts.flatMap(({ api = {} }) => Object.entries(api).filter(([, member]) => member.form === 'slot').map(([name]) => name));
  const markers = [...markerAttributes(root).values(), ...slots];
  const directives = directiveAttributes(root);
  const out: Record<string, string[]> = {};
  for (const { component, api = {} } of contracts) {
    const tag = kebab(component);
    out[tag] = [...new Set([...Object.keys(api), ...markers, ...(directives[tag] ?? [])])].sort();
  }
  return out;
}

export function vocabularyIndexOf(families: Family[], manifests: Iterable<Pick<ComponentManifest, 'component' | 'answers'>>, page: string,
  bindings: Iterable<[string, BehaviourBinding]> = [], inputs: Record<string, string[]> = {}): VocabularyIndex {
  const classes: VocabularyIndex['classes'] = {};
  const axes: NonNullable<VocabularyIndex['axes']> = {};
  for (const family of families) {
    const replaced = axesOf(family).filter((axis) => !Object.values(family.variants).some((variant) => variant.includes(`var(${axis}`)));
    if (replaced.length > 0) axes[family.family] = replaced;
    const target = targetOf(family);
    if (target === 'keyed') continue;
    for (const option of Object.keys(family.variants).sort()) classes[option] = { family: family.family, reach: family.reach, target };
  }
  const answers: VocabularyIndex['answers'] = {};
  const options: VocabularyIndex['options'] = {};
  const defaults: NonNullable<VocabularyIndex['defaults']> = {};
  for (const manifest of manifests) {
    if (!manifest.answers?.length) continue;
    answers[manifest.component] = answeredFamilies(manifest);
    options[manifest.component] = families.flatMap((family) => answerOf(manifest as ComponentManifest, family)?.options ?? []);
    const own: Record<string, string> = {};
    for (const family of families) {
      const answer = answerOf(manifest as ComponentManifest, family);
      if (answer?.default) own[family.family] = answer.default;
    }
    if (Object.keys(own).length > 0) defaults[manifest.component] = own;
  }
  const modals = [...new Set([...bindings].filter(([, binding]) => bindsModal(binding)).map(([component]) => component))].sort();
  return { page, classes, answers, options, axes, defaults, modals, inputs };
}

export function vocabularyIndex(root = repoRoot) {
  return vocabularyIndexOf([...readFamilies(root).values()], layerManifests(root).values(),
    `https://${DOMAIN}/frameworks/VOCABULARY.md`, layerBindings(root), layerInputs(root));
}

export function writeVocabularyIndex(dir: string, root = repoRoot) {
  return write(dir, VOCABULARY_FILE, `${JSON.stringify(vocabularyIndex(root), null, 2)}\n`);
}
