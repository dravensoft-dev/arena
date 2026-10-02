/* Holds the vocabulary to its own rules: a family declares a reach, a description that argues for
 * it, a default among its options, and options that write only its own channels; every channel is
 * read by a manifest that answers the family, with the default's value as that read's fallback, so
 * the look with no class written is the look the default names; every answers names a family, and
 * every transparent slot is a slot of its manifest with a reason. An empty vocabulary fails. */

import { isMainModule } from '../../utils/main-module.ts';
import { pascal } from '../../utils/case.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import {
  REACHES, VOCABULARY_DIR, channelPrefix, declarations, familyFiles, readFamilies, slotClassStrings, type Family,
} from '../../lib/tailwind/vocabulary.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

export const node = {
  name: 'check:families',
  reads: ['frameworks/tailwind/components/**/*.manifest.json'],
  writes: [],
  feeds: [],
};

const READ = /var\((--arena-[a-z0-9-]+)\s*,\s*([^)]*)\)/g;

function shapeProblems(family: Family, rel: string | undefined) {
  const problems: string[] = [];
  const name = family.family;
  if (!/^[a-z][a-z0-9-]*$/.test(name ?? '')) problems.push(`${rel}: family "${name}" is not a kebab-case name`);
  const wanted = `${VOCABULARY_DIR}/arena-${name}/${pascal(name)}.family.json`;
  if (rel !== wanted) problems.push(`${name}: lives at ${rel}, and a family lives at ${wanted}`);
  if (!(REACHES as readonly string[]).includes(family.reach)) problems.push(`${name}: reach "${family.reach}" is neither context nor box`);
  if (!family.description?.trim()) problems.push(`${name}: has no description, and the description is the argument for the family existing at all`);
  if (!(family.default in (family.variants ?? {}))) problems.push(`${name}: default ${family.default} is none of its options`);
  if (family.axis !== undefined) {
    if (family.axis !== `--arena-${name}`) problems.push(`${name}: axis ${family.axis} is not --arena-${name}`);
    if (family.reach !== 'box') problems.push(`${name}: declares an axis and is not a box family, so nothing would reset it`);
  }
  for (const [option, classes] of Object.entries(family.variants ?? {})) {
    if (!option.startsWith('arena-')) problems.push(`${name}: option "${option}" does not start with arena-`);
    try {
      for (const [property] of declarations(classes))
        if (!property.startsWith(channelPrefix(name))) problems.push(`${name}: ${option} writes ${property}, outside ${channelPrefix(name)}*`);
    } catch (error) {
      problems.push(`${name}: ${(error as Error).message}`);
    }
  }
  return problems;
}

export function familyProblems(families: Map<string, Family>, files: string[], manifests: Map<string, ComponentManifest>) {
  if (families.size === 0) return ['found 0 families under the vocabulary, so every rule below was asked of nothing; an empty vocabulary is a failure rather than a clean pass'];
  const problems: string[] = [];
  const relOf = new Map(files.map((rel) => [(rel.split('/').at(-2) ?? '').replace(/^arena-/, ''), rel]));
  const owners = new Map<string, string>();
  for (const family of families.values()) {
    problems.push(...shapeProblems(family, relOf.get(family.family)));
    for (const option of Object.keys(family.variants ?? {})) {
      const other = owners.get(option);
      if (other) problems.push(`${option} is an option of both ${other} and ${family.family}`);
      owners.set(option, family.family);
    }
  }
  const readsByFamily = new Map<string, Set<string>>();
  for (const manifest of manifests.values()) {
    const answers = manifest.answers ?? [];
    for (const family of answers)
      if (!families.has(family)) problems.push(`${manifest.component}: answers ${family}, which no family declares`);
    for (const [slot, classes] of slotClassStrings(manifest)) {
      for (const match of String(classes ?? '').matchAll(READ)) {
        const channel = match[1] ?? '';
        const fallback = (match[2] ?? '').trim().replaceAll('_', ' ');
        const family = [...families.values()].find((one) => channel.startsWith(channelPrefix(one.family)));
        if (!family) continue;
        if (!answers.includes(family.family)) {
          problems.push(`${manifest.component}.${slot}: reads ${channel} and does not answer ${family.family}, so the compiled rule never selects it`);
          continue;
        }
        readsByFamily.set(family.family, (readsByFamily.get(family.family) ?? new Set()).add(channel));
        const written = (() => { try { return declarations(family.variants[family.default] ?? ''); } catch { return []; } })()
          .find(([property]) => property === channel)?.[1];
        if (written !== undefined && written !== fallback) {
          problems.push(`${manifest.component}.${slot}: ${channel} falls back to ${fallback} and the default ${family.default} writes ${written}, `
            + 'so the component with no class written does not look like its default');
        }
      }
    }
    const slots = new Set(Object.keys(manifest.slots ?? {}));
    for (const [slot, why] of Object.entries(manifest.transparent ?? {})) {
      if (!slots.has(slot)) problems.push(`${manifest.component} declares ${slot} transparent and has no such slot`);
      else if (!String(why).trim()) problems.push(`${manifest.component} declares ${slot} transparent with no reason`);
    }
  }
  for (const family of families.values()) {
    const read = readsByFamily.get(family.family) ?? new Set();
    const written = new Set<string>();
    for (const classes of Object.values(family.variants ?? {})) {
      try { for (const [property] of declarations(classes)) written.add(property); } catch { continue; }
    }
    for (const channel of written)
      if (!read.has(channel)) problems.push(`${channel} is written and no manifest answering ${family.family} reads it`);
  }
  return problems;
}

export function collect(root = repoRoot) {
  const families = readFamilies(root);
  const manifests = new Map([...layerManifests(root).values()].map((one) => [one.component, one]));
  return { families, problems: familyProblems(families, familyFiles(root), manifests) };
}

function main() {
  const { families, problems } = collect();
  if (problems.length) {
    console.error(`check-families: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-families: ${families.size} family(ies), each writing its own channels and read by the manifests that answer it`);
}

if (isMainModule(import.meta.url)) main();
