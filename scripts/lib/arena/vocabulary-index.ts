/* What `arena audit` needs to read a class against the vocabulary, as one JSON file a package carries
 * beside its component map: the audit ships inside the package and can read neither a family file
 * nor a manifest from there. */

import { join } from 'node:path';
import { answerOf, answeredFamilies, axesOf, readFamilies, targetOf, type Family } from '../tailwind/vocabulary.ts';
import { layerManifests } from '../tailwind/tailwind-compile.ts';
import { DOMAIN } from './site-pages.ts';
import { repoRoot } from './repo-root.ts';
import { write } from './package-assembly.ts';
import type { VocabularyIndex } from '../../generate/core/arena-cli/audit.ts';
import type { ComponentManifest } from '../tailwind/manifest-shapes.ts';

export const VOCABULARY_FILE = 'arena.vocabulary.json';

export function vocabularyIndexOf(families: Family[], manifests: Iterable<Pick<ComponentManifest, 'component' | 'answers'>>, page: string): VocabularyIndex {
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
  return { page, classes, answers, options, axes, defaults };
}

export function vocabularyIndex(root = repoRoot) {
  return vocabularyIndexOf([...readFamilies(root).values()], layerManifests(root).values(),
    `https://${DOMAIN}/frameworks/VOCABULARY.md`);
}

export function writeVocabularyIndex(dir: string, root = repoRoot) {
  return write(dir, VOCABULARY_FILE, `${JSON.stringify(vocabularyIndex(root), null, 2)}\n`);
}
