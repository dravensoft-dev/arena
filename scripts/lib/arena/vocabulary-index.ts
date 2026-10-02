/* What --audit needs to read a class against the vocabulary, as one JSON file a package carries
 * beside its component map: the audit ships inside the package and can read neither a family file
 * nor a manifest from there. */

import { join } from 'node:path';
import { readFamilies, type Family } from '../tailwind/vocabulary.ts';
import { layerManifests } from '../tailwind/tailwind-compile.ts';
import { DOMAIN } from './site-pages.ts';
import { repoRoot } from './repo-root.ts';
import { write } from './package-assembly.ts';
import type { VocabularyIndex } from '../../generate/core/arena-to-prod/audit.ts';
import type { ComponentManifest } from '../tailwind/manifest-shapes.ts';

export const VOCABULARY_FILE = 'arena.vocabulary.json';

export function vocabularyIndexOf(families: Family[], manifests: Iterable<Pick<ComponentManifest, 'component' | 'answers'>>, page: string): VocabularyIndex {
  const classes: VocabularyIndex['classes'] = {};
  for (const family of families)
    for (const option of Object.keys(family.variants).sort()) classes[option] = { family: family.family, reach: family.reach };
  const answers: VocabularyIndex['answers'] = {};
  for (const manifest of manifests) if (manifest.answers?.length) answers[manifest.component] = [...manifest.answers];
  return { page, classes, answers };
}

export function vocabularyIndex(root = repoRoot) {
  return vocabularyIndexOf([...readFamilies(root).values()], layerManifests(root).values(),
    `https://${DOMAIN}/frameworks/VOCABULARY.md`);
}

export function writeVocabularyIndex(dir: string, root = repoRoot) {
  return write(dir, VOCABULARY_FILE, `${JSON.stringify(vocabularyIndex(root), null, 2)}\n`);
}
