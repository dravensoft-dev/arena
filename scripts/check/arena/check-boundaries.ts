/* Holds the boundary rule's records: both layers keep a suite rendering every contracted slot
 * from its demo fixture, every transparent slot in a manifest is a slot of it with a reason, and
 * every ITEM_SLOTS and SEPARATE entry names a contracted slot. The suites decide whether a projected
 * slot carries data-arena-boundary; this gate decides that they exist and derive, so a slot added
 * to a contract cannot go unmeasured. No contracted slot at all is a failure. */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { readManifests } from './check-measured-box.ts';
import { loadContracts } from '../../generate/arena/generate-playgrounds.ts';
import { ITEM_SLOTS, SEPARATE, separateProblems, slotMembers } from '../../lib/arena/boundary-cases.ts';

export const SUITES = {
  react: 'frameworks/react/test/Boundaries.dom.test.tsx',
  angular: 'frameworks/angular/test/Boundaries.test.ts',
} as const;

export const node = {
  name: 'check:boundaries',
  reads: [...Object.values(SUITES), 'contracts/api/components', 'frameworks/tailwind/components/**/*.manifest.json',
    'scripts/lib/arena/boundary-cases.ts'],
  writes: [],
  feeds: [],
};

const DERIVES = ['boundaryCases(', 'siteProblems(', 'staleTransparentProblems('];

export function suiteProblems(read: (rel: string) => string | null) {
  const problems: string[] = [];
  for (const rel of Object.values(SUITES)) {
    const text = read(rel);
    if (text === null) { problems.push(`${rel}: missing, so that layer's projected slots are measured by nothing`); continue; }
    const absent = DERIVES.filter((call) => !text.includes(call));
    if (absent.length) problems.push(`${rel}: does not derive its cases (no ${absent.join(', ')}), so a slot added to a contract would go unmeasured`);
  }
  return problems;
}

type Manifestish = { component: string; slots?: Record<string, string>; transparent?: Record<string, string> };

export function transparentProblems(manifests: Iterable<Manifestish>) {
  const problems: string[] = [];
  for (const manifest of manifests) {
    for (const [slot, why] of Object.entries(manifest.transparent ?? {})) {
      if (!(slot in (manifest.slots ?? {}))) problems.push(`${manifest.component}: ${slot} is declared transparent and is no slot of its manifest`);
      else if (!String(why).trim()) problems.push(`${manifest.component}: ${slot} is declared transparent with no reason`);
    }
  }
  return problems;
}

export function itemSlotProblems(items: Map<string, { item: string; part: string; why: string }>, contracts: Map<string, { api?: Record<string, { form?: string; params?: unknown }> }>) {
  const problems: string[] = [];
  for (const [key, { item }] of items) {
    const [component = '', slot = ''] = key.split('.');
    const contract = contracts.get(component);
    if (!contract || !slotMembers(contract).includes(slot)) problems.push(`ITEM_SLOTS: ${key} is no contracted slot`);
    if (!contracts.has(item)) problems.push(`ITEM_SLOTS: ${key} names ${item}, and ${item} is no contracted component`);
  }
  return problems;
}

export function collect(root = repoRoot) {
  const contracts = loadContracts(root);
  const slotted = [...contracts.values()].filter((one) => slotMembers(one).length > 0).length;
  const problems = [
    ...(slotted === 0 ? ['found 0 contracted slots, so there was nothing to measure; an empty sweep is a failure rather than a clean pass'] : []),
    ...suiteProblems((rel) => (existsSync(join(root, rel)) ? readFileSync(join(root, rel), 'utf8') : null)),
    ...transparentProblems(readManifests(root).values()),
    ...itemSlotProblems(ITEM_SLOTS, contracts),
    ...separateProblems(SEPARATE, contracts),
  ];
  return { slotted, problems };
}

function main() {
  const { slotted, problems } = collect();
  if (problems.length) {
    console.error(`check-boundaries: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-boundaries: ${slotted} component(s) with a contracted slot, each rendered in both layers by a derived suite`);
}

if (isMainModule(import.meta.url)) main();
