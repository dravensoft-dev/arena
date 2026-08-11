/* A hover or focus affordance is a decision about the component, so the authority is
 * contracts/api/components/<Name>.json's `affordances` and no layer's source. Both halves run
 * one way only: a state modifier or an implementation the contract does not declare is
 * invented, while a declared affordance a layer does not implement may be composition.
 * A layer that realises an affordance by rendering the manifest's own class is unaskable
 * here, because asking it would be asking the manifest, and that is now both layers wherever
 * a component renders its recipe. So the react half reads HAND_DRAWN, the components that
 * write their own appearance and are therefore the only ones with an answer of their own; an
 * empty HAND_DRAWN leaves that half with no subject and fails rather than passing. */

import { readFileSync, existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { manifestFiles } from '../../lib/tailwind/tailwind-compile.ts';
import {
  HAND_DRAWN, MANIFEST_COVERS, categoryOf, coveredContracts, surfaceProblems,
} from '../../lib/tailwind/manifest-surfaces.ts';
import { kebab } from '../../utils/case.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import type { ComponentManifest, ManifestClassSource } from '../../lib/tailwind/manifest-shapes.ts';
import type { ContractCandidate } from '../../lib/arena/contract-shapes.ts';

export const node = {
  name: 'check:states',
  reads: [
    'contracts/api/components', 'frameworks/Components.json',
    'frameworks/react/components/**', 'frameworks/tailwind/components/**',
  ],
  writes: [],
  feeds: [],
};


export { HAND_DRAWN, MANIFEST_COVERS, coveredContracts };

const COMPONENTS_DIR = join(repoRoot, 'frameworks/tailwind/components');
const CONTRACTS_DIR = join(repoRoot, 'contracts/api/components');
const REACT_COMPONENTS_DIR = join(repoRoot, 'frameworks/react/components');

export const EXEMPT = new Map<string, string>([]);

const FAMILY_PATTERNS = {
  hover: /(?:^|:)hover:/,
  focus: /(?:^|:)focus(?:-visible|-within)?:/,
};

const IMPLEMENTS_PATTERNS = {
  hover: /\bonMouseEnter\b|\bonMouseLeave\b|\bonPointerEnter\b|\bonPointerLeave\b|\bonPointerMove\b|:hover\b|\(mouseenter\)|\(mouseleave\)|\(pointerenter\)|\(pointerleave\)|\(pointermove\)/,
  focus: /\bonFocus\b|\bonBlur\b|:focus(?:-visible|-within)?\b|\(focus\)|\(blur\)/,
};

export const FAMILIES = Object.keys(FAMILY_PATTERNS);

export function stateFamilies(classString: string) {
  const families = new Set<string>();
  for (const token of classString.split(/\s+/).filter(Boolean))
    for (const [family, re] of Object.entries(FAMILY_PATTERNS))
      if (re.test(token)) families.add(family);
  return families;
}

export function sourceImplements(sourceText: string): Record<string, boolean> {
  return {
    hover: IMPLEMENTS_PATTERNS.hover.test(sourceText),
    focus: IMPLEMENTS_PATTERNS.focus.test(sourceText),
  };
}

export function classStringsBySlot(manifest: ManifestClassSource) {
  const bySlot = new Map();
  const add = (slot: string, cls: string) => {
    if (typeof cls !== 'string') return;
    if (!bySlot.has(slot)) bySlot.set(slot, []);
    bySlot.get(slot).push(cls);
  };
  for (const [slot, cls] of Object.entries(manifest.slots || {}) as [string, string][]) add(slot, cls);
  for (const variantGroup of Object.values(manifest.variants || {}))
    for (const branch of Object.values(variantGroup))
      for (const [slot, cls] of Object.entries(branch || {}) as [string, string][]) add(slot, cls);
  for (const compound of manifest.compoundVariants || [])
    for (const [slot, cls] of Object.entries(compound.class || {}) as [string, string][]) add(slot, cls);
  return bySlot;
}

export function readContract(name: string) {
  const path = join(CONTRACTS_DIR, `${name}.json`);
  if (!existsSync(path)) return null;
  return readJson(path);
}

export function declaredAffordances(contract: ContractCandidate, where: string): Set<string> {
  if (!Array.isArray(contract.affordances)) {
    throw new Error(
      `check-manifest-states: ${where} declares no \`affordances\` array. Every contract states one, `
      + 'and an empty array is how a component says it presents no hover or focus state.',
    );
  }
  const unknown = contract.affordances.filter((a) => !FAMILIES.includes(a));
  if (unknown.length) {
    throw new Error(`check-manifest-states: ${where} declares unknown affordance(s) ${unknown.join(', ')}`);
  }
  return new Set(contract.affordances);
}

export function affordancesFor(names: string[]) {
  const union = new Set<string>();
  for (const name of names) {
    const contract = readContract(name);
    if (!contract) continue;
    for (const a of declaredAffordances(contract, `contracts/api/components/${name}.json`)) union.add(a);
  }
  return union;
}

export type StateFinding =
  | { half: 'manifest'; component: string; slot: string; family: string }
  | { half: 'react'; component: string; family: string };

export function manifestProblems(manifest: ComponentManifest, declared: Set<string>) {
  const findings: StateFinding[] = [];
  const matchedKeys = [];
  let sites = 0;
  const name = manifest.component;
  for (const [slot, classList] of classStringsBySlot(manifest)) {
    const families = new Set<string>();
    for (const cls of classList) for (const f of stateFamilies(cls)) families.add(f);
    for (const family of families) {
      sites += 1;
      if (declared.has(family)) continue;
      const key = `${name}:${slot}:${family}`;
      matchedKeys.push(key);
      if (EXEMPT.has(key)) continue;
      findings.push({ half: 'manifest', component: name, slot, family });
    }
  }
  return { findings, matchedKeys, sites };
}

export const SOURCE_EXTENSIONS = ['.tsx', '.jsx'];

export function reactSourceFor(name: string, category: string) {
  const dir = join(REACT_COMPONENTS_DIR, category, kebab(name));
  for (const ext of SOURCE_EXTENSIONS) {
    const path = join(dir, `${name}${ext}`);
    if (existsSync(path)) return path;
  }
  return null;
}

export function missingReactSource(name: string, category: string) {
  const dir = join(REACT_COMPONENTS_DIR, category, kebab(name));
  if (!existsSync(dir) || reactSourceFor(name, category)) return null;
  return `${name}: frameworks/react/components/${category}/${kebab(name)}/ holds no ${name}.tsx and `
    + `no ${name}.jsx, so its affordances were never read and this half reported clean over nothing`;
}

export function zeroReactSourceProblems(count: number) {
  if (count > 0) return [];
  return ['read 0 React sources; the react half of this gate checked nothing, which is a failure '
    + 'rather than a clean pass'];
}

export function unaskedHandDrawn(asked: Iterable<string>, handDrawn = HAND_DRAWN) {
  const seen = new Set(asked);
  const problems = [...handDrawn.keys()]
    .filter((name) => !seen.has(name))
    .map((name) => `HAND_DRAWN names ${name} and no React source for it was read, so the react `
      + 'half reported clean over a component it never opened');
  if (handDrawn.size === 0) {
    problems.push('HAND_DRAWN is empty, so the react half has no subject at all; a half with '
      + 'nothing to ask is retired on the record, never left to pass over nothing');
  }
  return problems;
}

export function reactProblems(name: string, category: string) {
  const path = reactSourceFor(name, category);
  if (!path) return { findings: [], sites: 0 };
  const contract = readContract(name);
  if (!contract) return { findings: [], sites: 0 };
  const declared = declaredAffordances(contract, `contracts/api/components/${name}.json`);
  const capability = sourceImplements(readFileSync(path, 'utf8'));
  const findings: StateFinding[] = [];
  let sites = 0;
  for (const family of FAMILIES) {
    if (!capability[family]) continue;
    sites += 1;
    if (declared.has(family)) continue;
    findings.push({ half: 'react', component: name, family });
  }
  return { findings, sites };
}

export function collect() {
  const findings: StateFinding[] = [];
  const matchedKeys = [];
  let sites = 0;

  for (const p of manifestFiles(COMPONENTS_DIR)) {
    const manifest = readJson(p);
    const name = basename(p).replace(/\.manifest\.json$/, '');
    const result = manifestProblems(manifest, affordancesFor(coveredContracts(name)));
    findings.push(...result.findings);
    matchedKeys.push(...result.matchedKeys);
    sites += result.sites;
  }

  const categories = readJson(join(repoRoot, 'frameworks/Components.json'));
  const missingSources = [];
  let sourcesRead = 0;
  for (const [category, names] of Object.entries(categories) as [string, string[]][])
    for (const name of names) {
      const missing = missingReactSource(name, category);
      if (missing) missingSources.push(missing);
      if (reactSourceFor(name, category)) sourcesRead += 1;
    }

  const asked = [];
  for (const name of HAND_DRAWN.keys()) {
    const category = categoryOf(name);
    if (!category || !reactSourceFor(name, category)) continue;
    asked.push(name);
    const result = reactProblems(name, category);
    findings.push(...result.findings);
    sites += result.sites;
  }

  return {
    findings,
    matchedKeys,
    sites,
    missingSources,
    zeroSources: [...zeroReactSourceProblems(sourcesRead), ...unaskedHandDrawn(asked)],
  };
}

export function staleExemptions(matchedKeys: string[]) {
  const matched = new Set(matchedKeys);
  return [...EXEMPT.keys()].filter((k) => !matched.has(k));
}

export function staleCovers() {
  const missingContract = [...MANIFEST_COVERS].flatMap(([name, { covers }]) => {
    const missing = covers.filter((c) => !readContract(c));
    return missing.length ? [`${name} -> ${missing.join(', ')} names no contract`] : [];
  });
  return [...missingContract, ...surfaceProblems()];
}

function main() {
  const { findings, matchedKeys, sites, missingSources, zeroSources } = collect();
  const stale = staleExemptions(matchedKeys);
  const staleCoverage = staleCovers();
  let failed = false;

  if (missingSources.length || zeroSources.length) {
    failed = true;
    for (const problem of [...zeroSources, ...missingSources])
      console.error(`check-manifest-states: ${problem}`);
    console.error('');
  }

  if (findings.length) {
    failed = true;
    console.error(`check-manifest-states: ${findings.length} undeclared affordance(s)\n`);
    for (const f of findings) {
      if (f.half === 'manifest') {
        console.error(`  ${f.component}:${f.slot} carries a ${f.family}: modifier, and no contract this `
          + `manifest covers (${coveredContracts(f.component).join(', ')}) declares a ${f.family} affordance`);
      } else {
        console.error(`  ${f.component} implements ${f.family}, and contracts/api/components/${f.component}.json `
          + `declares no ${f.family} affordance`);
      }
    }
    console.error('\nEither the component genuinely presents the affordance -- declare it in the contract,');
    console.error('which licenses every layer at once -- or it does not and the state is invented.');
    console.error('See frameworks/tailwind/AGENTS.md, "P1 -- invented states".');
  }

  if (stale.length || staleCoverage.length) {
    if (failed) console.error('');
    failed = true;
    for (const key of stale) console.error(`  stale EXEMPT: ${key} -- ${EXEMPT.get(key)}`);
    for (const entry of staleCoverage) console.error(`  stale surface map: ${entry}`);
  }

  if (failed) process.exit(1);
  console.log(`check-manifest-states: clean -- ${sites} affordance site(s) checked against the contracts, `
    + `${EXEMPT.size} exempted on the record`);
}

if (isMainModule(import.meta.url)) main();
