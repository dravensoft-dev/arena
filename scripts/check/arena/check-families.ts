/* Holds the vocabulary to its own rules: a family declares a reach, a description that argues for
 * it, a default among its options, and options that write only its own channels; every channel is
 * read by a manifest that answers the family, with the default's value as that read's fallback, so
 * the look with no class written is the look the default names; every answers names a family, and
 * every transparent slot is a slot of its manifest with a reason. The vocabulary page must equal a
 * fresh render of the same files. An empty vocabulary fails, and so does an arena- class in a compiled
 * or shipped sheet that no family and no manifest emits. */

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { VOCABULARY_TARGET, renderVocabulary } from '../../generate/arena/generate-vocabulary.ts';
import { pascal } from '../../utils/case.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import { classesManifest } from '../../lib/tailwind/component-css.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { kebab } from '../../utils/case.ts';
import { NOT_WRITTEN, SHEETS, classesIn, themeUtilities } from './check-classes.ts';
import {
  REACHES, TARGETS, VOCABULARY_DIR, answerOf, answeredFamilies, axesOf, axisWrapped, channelPrefix, channelReads, declarations, familyFiles,
  optionDeclarations, readFamilies, slotClassStrings, type Family,
} from '../../lib/tailwind/vocabulary.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';

export const node = {
  name: 'check:families',
  reads: [`${VOCABULARY_DIR}/**`, 'frameworks/tailwind/components/**/*.manifest.json',
    'frameworks/react/components/**', 'frameworks/angular/components/**', VOCABULARY_TARGET, ...SHEETS, 'frameworks/tailwind/consume/**/*.css'],
  writes: [],
  feeds: [],
};

const THEME_KEY = /var\(\s*(--(?:spacing(?![a-z0-9])|spacing-|radius-|text-|color-)[a-z0-9-]*)/g;

function paletteKeys(root: string) {
  const at = join(root, 'frameworks', 'tailwind', 'Theme.css');
  const css = existsSync(at) ? readFileSync(at, 'utf8') : '';
  return new Set([...css.matchAll(/(--color-[a-z0-9-]+)\s*:\s*var\(\s*(--color-[a-z0-9-]+)\s*\)/g)]
    .filter((match) => match[1] === match[2]).map((match) => match[1] ?? ''));
}

export function themeKeyReads(text: string, palette: Set<string>) {
  return [...new Set([...text.matchAll(THEME_KEY)].map((match) => match[1] ?? '').filter((key) => !palette.has(key)))];
}

function keyedShapeProblems(family: Family) {
  const name = family.family;
  const problems: string[] = [];
  if (family.reach !== 'box') problems.push(`${name}: a keyed family is a box family, and ${family.reach} is not`);
  if (Object.keys(family.variants ?? {}).length) problems.push(`${name}: a keyed family has no options, and variants must be {}`);
  if (family.default !== undefined) problems.push(`${name}: a keyed family declares a default, and no option is in effect on a key nobody set`);
  if (family.axis !== undefined) problems.push(`${name}: a keyed family declares an axis, and its properties are keyed instead`);
  if (!family.keyed) problems.push(`${name}: a keyed family names the field its key is read from`);
  const properties = family.properties ?? [];
  if (properties.length === 0) problems.push(`${name}: a keyed family declares no properties, so an adopter has nothing to set`);
  for (const property of properties)
    if (!new RegExp(`^--arena-${name}-<key>-[a-z]+$`).test(property)) problems.push(`${name}: ${property} is not --arena-${name}-<key>-<what>`);
  const channels = family.channels ?? [];
  if (channels.length === 0) problems.push(`${name}: a keyed family declares no channels, so no manifest reads what its component writes`);
  for (const channel of channels)
    if (!new RegExp(`^--arena-${name}-[a-z]+$`).test(channel)) problems.push(`${name}: ${channel} is not --arena-${name}-<what>`);
  if ((family.binds ?? []).length === 0) problems.push(`${name}: a keyed family binds no component, so nothing writes its channels`);
  return problems;
}

function shapeProblems(family: Family, rel: string | undefined, root = repoRoot) {
  const problems: string[] = [];
  const name = family.family;
  if (!/^[a-z][a-z0-9-]*$/.test(name ?? '')) problems.push(`${rel}: family "${name}" is not a kebab-case name`);
  const wanted = `${VOCABULARY_DIR}/arena-${name}/${pascal(name)}.family.json`;
  if (rel !== wanted) problems.push(`${name}: lives at ${rel}, and a family lives at ${wanted}`);
  if (!(REACHES as readonly string[]).includes(family.reach)) problems.push(`${name}: reach "${family.reach}" is neither context nor box`);
  if (!family.description?.trim()) problems.push(`${name}: has no description, and the description is the argument for the family existing at all`);
  const target = family.target ?? 'component';
  const markup = target === 'markup';
  const keyed = target === 'keyed';
  if (!(TARGETS as readonly string[]).includes(target)) problems.push(`${name}: target "${family.target}" is neither component nor markup`);
  if (markup) {
    if (family.default !== undefined) problems.push(`${name}: is a markup family and declares a default, and nothing is in effect on markup nobody wrote a class on`);
    if (family.axis !== undefined) problems.push(`${name}: is a markup family and declares an axis, which only a box family answered by a component resets`);
  } else if (keyed) {
    problems.push(...keyedShapeProblems(family));
  } else {
    if (family.restates !== undefined) problems.push(`${name}: restates ${family.restates} and is not a markup family`);
    if (!((family.default ?? '') in (family.variants ?? {}))) problems.push(`${name}: default ${family.default} is none of its options`);
    for (const axis of axesOf(family)) {
      if (axis !== `--arena-${name}` && !axis.startsWith(`--arena-${name}-`)) problems.push(`${name}: axis ${axis} is not --arena-${name} or --arena-${name}-<suffix>`);
      if (family.reach !== 'box') problems.push(`${name}: declares an axis and is not a box family, so nothing would reset it`);
    }
  }
  for (const option of Object.keys(family.variants ?? {})) {
    if (!option.startsWith('arena-')) problems.push(`${name}: option "${option}" does not start with arena-`);
    try {
      for (const [property] of optionDeclarations(family, option, root)) {
        if (!markup) {
          if (axesOf(family).includes(property)) problems.push(`${name}: option ${option} writes ${property}, which is an axis, and an adopter sets an axis where no option does`);
          else if (!property.startsWith(channelPrefix(name))) problems.push(`${name}: ${option} writes ${property}, outside ${channelPrefix(name)}*`);
        } else if (family.restates) {
          if (!property.startsWith(`--${family.restates}-`)) problems.push(`${name}: ${option} writes ${property}, outside the --${family.restates}-* group it restates`);
        } else if (property.startsWith('--')) {
          problems.push(`${name}: ${option} writes ${property}, and a markup family writes declarations, never a custom property, unless it restates a contract group`);
        }
      }
    } catch (error) {
      problems.push(`${name}: ${(error as Error).message}`);
    }
  }
  return problems;
}

export type KeyedSource = (layer: string, component: string) => string;

const TEST_SOURCE = /\.(test|spec)\.tsx?$/;

export function treeSource(root: string): KeyedSource {
  return (layer, component) => {
    const base = join(root, 'frameworks', layer, 'components');
    if (!existsSync(base)) return '';
    const wanted = kebab(component);
    return walkFiles(base)
      .filter((file) => /\.tsx?$/.test(file) && !TEST_SOURCE.test(file))
      .filter((file) => relPosix(base, file).split('/').slice(0, -1).some((part) => part.startsWith(wanted)))
      .map((file) => readFileSync(file, 'utf8')).join('\n');
  };
}

export function familyProblems(
  families: Map<string, Family>, files: string[], manifests: Map<string, ComponentManifest>, root = repoRoot,
  source: KeyedSource = treeSource(root),
) {
  if (families.size === 0) return ['found 0 families under the vocabulary, so every rule below was asked of nothing; an empty vocabulary is a failure rather than a clean pass'];
  const problems: string[] = [];
  const relOf = new Map(files.map((rel) => [(rel.split('/').at(-2) ?? '').replace(/^arena-/, ''), rel]));
  const owners = new Map<string, string>();
  for (const family of families.values()) {
    problems.push(...shapeProblems(family, relOf.get(family.family), root));
    for (const option of Object.keys(family.variants ?? {})) {
      const other = owners.get(option);
      if (other) problems.push(`${option} is an option of both ${other} and ${family.family}`);
      owners.set(option, family.family);
    }
  }
  const palette = paletteKeys(root);
  for (const family of families.values()) {
    if (family.restates) continue;
    for (const [option, classes] of Object.entries(family.variants ?? {}))
      for (const key of themeKeyReads(String(classes), palette))
        problems.push(`${family.family}: ${option} names ${key}, a Tailwind theme key that no sheet declares at runtime; name an Arena token or role`);
  }
  const answeredBy = new Map<string, string[]>();
  for (const manifest of manifests.values())
    for (const answered of answeredFamilies(manifest)) answeredBy.set(answered, [...(answeredBy.get(answered) ?? []), manifest.component]);
  for (const family of families.values()) {
    const by = answeredBy.get(family.family) ?? [];
    if (family.target === 'keyed') continue;
    if (family.target === 'markup' && by.length) {
      problems.push(`${family.family}: is a markup family and ${by.join(', ')} answer it. A markup family applies to the element its class is written on, so no component answers it`);
    } else if (family.target !== 'markup' && by.length === 0) {
      problems.push(`${family.family}: no manifest answers it, so every option would compile to a rule that selects nothing`);
    }
  }
  const writtenBy = new Map<string, Set<string>>();
  for (const family of families.values()) {
    const written = new Set<string>();
    if (family.target !== 'markup') {
      for (const classes of Object.values(family.variants ?? {})) {
        try { for (const [property] of declarations(classes)) written.add(property); } catch { continue; }
      }
    }
    writtenBy.set(family.family, written);
  }
  const isAxis = (channel: string) => [...families.values()].some((one) => axesOf(one).includes(channel));
  const familyOf = (channel: string) => (isAxis(channel) ? undefined
    : [...families.values()].find((one) => channel.startsWith(channelPrefix(one.family))));
  const readsByFamily = new Map<string, Set<string>>();
  const axisReads = new Map<string, Set<string>>();
  const answeredOptions = new Map<string, Set<string>>();
  for (const manifest of manifests.values()) {
    const answers = answeredFamilies(manifest);
    for (const answer of manifest.answers ?? []) {
      const name = typeof answer === 'string' ? answer : answer.family;
      const family = families.get(name);
      if (!family) { problems.push(`${manifest.component}: answers ${name}, which no family declares`); continue; }
      const own = answerOf(manifest, family);
      if (own) answeredOptions.set(name, new Set([...(answeredOptions.get(name) ?? []), ...own.options]));
      if (typeof answer === 'string') continue;
      const known = Object.keys(family.variants ?? {});
      if (answer.options.length === 0) problems.push(`${manifest.component}: answers ${name} with no options`);
      for (const option of answer.options)
        if (!known.includes(option)) problems.push(`${manifest.component}: answers ${name} with ${option}, which is not an option of ${name}`);
      if (!answer.options.includes(answer.default)) problems.push(`${manifest.component}: answers ${name} with a default ${answer.default} that is none of its options`);
    }
    for (const [slot, classes] of slotClassStrings(manifest)) {
      for (const { channel, fallback: raw } of channelReads(String(classes ?? ''))) {
        const owner = [...families.values()].find((one) => axesOf(one).includes(channel));
        if (owner && answers.includes(owner.family)) axisReads.set(owner.family, (axisReads.get(owner.family) ?? new Set()).add(channel));
        const family = familyOf(channel);
        if (!family) continue;
        if (!answers.includes(family.family)) {
          problems.push(`${manifest.component}.${slot}: reads ${channel} and does not answer ${family.family}, so the compiled rule never selects it`);
          continue;
        }
        readsByFamily.set(family.family, (readsByFamily.get(family.family) ?? new Set()).add(channel));
        const fallback = (raw ?? '').replaceAll('_', ' ');
        for (const key of themeKeyReads(fallback, palette))
          problems.push(`${manifest.component}.${slot}: ${channel} falls back to ${key}, a Tailwind theme key that no sheet declares at runtime; name an Arena token or role`);
        const chosen = answerOf(manifest, family)?.default ?? family.default;
        const written = (() => { try { return chosen === undefined ? [] : declarations(family.variants[chosen] ?? ''); } catch { return []; } })()
          .find(([property]) => property === channel)?.[1];
        if (written !== undefined && !axisWrapped(fallback, written, axesOf(family))) {
          problems.push(`${manifest.component}.${slot}: ${channel} falls back to ${raw === null ? 'nothing' : fallback} and the default ${chosen} writes ${written}, `
            + 'so the component with no class written does not look like its default');
        }
      }
    }
    for (const [channel, why] of Object.entries(manifest.bound ?? {})) {
      const family = familyOf(channel);
      if (!family || !writtenBy.get(family.family)?.has(channel)) {
        problems.push(`${manifest.component}: binds ${channel}, which no family writes, so the entry outlived what it was written for`);
        continue;
      }
      if (!answers.includes(family.family)) problems.push(`${manifest.component}: binds ${channel} and does not answer ${family.family}`);
      else readsByFamily.set(family.family, (readsByFamily.get(family.family) ?? new Set()).add(channel));
      if (!String(why).trim()) problems.push(`${manifest.component}: binds ${channel} with no reason`);
    }
    const slots = new Set(Object.keys(manifest.slots ?? {}));
    for (const [slot, why] of Object.entries(manifest.transparent ?? {})) {
      if (!slots.has(slot)) problems.push(`${manifest.component} declares ${slot} transparent and has no such slot`);
      else if (!String(why).trim()) problems.push(`${manifest.component} declares ${slot} transparent with no reason`);
    }
    for (const [slot, why] of Object.entries(manifest.floating ?? {})) {
      if (!slots.has(slot)) problems.push(`${manifest.component} declares ${slot} floating and has no such slot`);
      else if (!String(why).trim()) problems.push(`${manifest.component} declares ${slot} floating with no reason`);
    }
  }
  for (const family of families.values()) {
    if (family.target === 'keyed') {
      const read = readsByFamily.get(family.family) ?? new Set();
      for (const channel of family.channels ?? [])
        if (!read.has(channel)) problems.push(`${channel} is declared by the keyed family ${family.family} and no manifest answering it reads it`);
      for (const component of family.binds ?? []) {
        if (!manifests.has(component)) { problems.push(`${family.family}: binds ${component}, which is no contracted component`); continue; }
        const written = (['react', 'angular'] as const).filter((layer) => source(layer, component).includes(`--arena-${family.family}-\${`));
        const marker = `--arena-${family.family}-\${`;
        if (written.length === 0) problems.push(`${family.family}: binds ${component}, and neither layer's source under its directories writes ${marker}`);
        else if (written.length === 1) problems.push(`${family.family}: binds ${component}, and the ${written[0] === 'react' ? 'angular' : 'react'} source under its directories does not write ${marker}`);
      }
      continue;
    }
    if (family.target === 'markup') continue;
    for (const axis of axesOf(family))
      if (!(axisReads.get(family.family) ?? new Set()).has(axis)) problems.push(`${family.family}: axis ${axis} is read by no answering manifest`);
    const read = readsByFamily.get(family.family) ?? new Set();
    for (const channel of writtenBy.get(family.family) ?? [])
      if (!read.has(channel)) problems.push(`${channel} is written and no manifest answering ${family.family} reads it`);
    const answered = answeredOptions.get(family.family) ?? new Set();
    if (answered.size === 0) continue;
    for (const option of Object.keys(family.variants ?? {}))
      if (!answered.has(option)) problems.push(`${family.family}: ${option} is answered by no manifest, and an option nobody answers is a question nobody asked`);
  }
  return problems;
}

export function pageDriftProblems(onDisk: string | null, fresh: string) {
  if (onDisk === null) return [`${VOCABULARY_TARGET}: missing, run bun run generate:vocabulary`];
  return onDisk === fresh ? [] : [`${VOCABULARY_TARGET}: stale, run bun run generate:vocabulary`];
}

export function strayClassProblems(classes: Map<string, string>, families: Map<string, Family>, manifestClasses: Set<string>, exempt: Map<string, string>) {
  const allowed = new Set([...families.values()].flatMap((family) => Object.keys(family.variants ?? {})));
  const problems: string[] = [];
  for (const [name, rel] of classes) {
    if (allowed.has(name) || manifestClasses.has(name) || exempt.has(name)) continue;
    problems.push(`${rel} emits .${name}, which no family and no manifest emits. An adopter-facing class lives in a family under ${VOCABULARY_DIR}/, or is named in NOT_WRITTEN in check-classes.ts with why it is not one`);
  }
  return problems;
}

export function utilityProblems(utilities: Map<string, string>, families: Map<string, Family>, manifestClasses: Set<string>, exempt: Map<string, string>) {
  const allowed = new Set([...families.values()].flatMap((family) => Object.keys(family.variants ?? {})));
  const problems: string[] = [];
  for (const [name, rel] of utilities) {
    if (allowed.has(name) || manifestClasses.has(name) || exempt.has(name)) continue;
    problems.push(`${rel} defines @utility ${name}, which is no family option, no manifest class and no entry of NOT_WRITTEN in check-classes.ts. `
      + `An adopter-facing name lives in a family under ${VOCABULARY_DIR}/, or is named in NOT_WRITTEN with why it is not one`);
  }
  return problems;
}

export function sweptSheets(root = repoRoot) {
  const consume = join(root, 'frameworks', 'tailwind', 'consume');
  const walked = existsSync(consume) ? walkFiles(consume).filter((file) => file.endsWith('.css')).map((file) => relPosix(root, file)) : [];
  return [...new Set([...SHEETS, ...walked])].filter((rel) => existsSync(join(root, ...rel.split('/'))));
}

export function sweptProblems(families: Map<string, Family>, manifests: Map<string, ComponentManifest>, root = repoRoot) {
  const sheets = sweptSheets(root);
  if (sheets.length === 0) return ['found 0 compiled or shipped sheets to sweep, so the stray-class rule was asked of nothing; a fresh clone builds first'];
  const classes = new Map<string, string>();
  for (const rel of sheets)
    for (const name of classesIn(readFileSync(join(root, ...rel.split('/')), 'utf8'))) if (!classes.has(name)) classes.set(name, rel);
  const emitted = new Set<string>();
  for (const manifest of manifests.values()) {
    const all = classesManifest(manifest);
    for (const value of Object.values(all.slots ?? {}))
      for (const name of String(value ?? '').split(/\s+/)) if (name.startsWith('arena-')) emitted.add(name);
  }
  return [...strayClassProblems(classes, families, emitted, NOT_WRITTEN),
    ...utilityProblems(themeUtilities(root), families, emitted, NOT_WRITTEN)];
}

export function collect(root = repoRoot) {
  const families = readFamilies(root);
  const manifests = new Map([...layerManifests(root).values()].map((one) => [one.component, one]));
  const page = join(root, VOCABULARY_TARGET);
  const drift = pageDriftProblems(existsSync(page) ? readFileSync(page, 'utf8') : null, renderVocabulary(root));
  return { families, problems: [...familyProblems(families, familyFiles(root), manifests, root), ...sweptProblems(families, manifests, root), ...drift] };
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
