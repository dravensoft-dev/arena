/* Which element each contracted slot projects into, and whether it stops a box family there. A
 * case is a component's own demo fixture with a probe element in place of every slot's content,
 * so the render is the one check:playgrounds already holds to the contract. ITEM_SLOTS names a
 * slot that takes Arena items, where a bare probe would be dropped: the parent of the first item's
 * host, or of its part where the layer draws no host, is read instead. SEPARATE names a slot the fixture never opens, measured in a case of its
 * own with the members, the removal or the press its entry gives, which leaves the demo fixtures,
 * and so the kitchen sinks, untouched. A manifest's transparent key is the one record of a slot
 * that projects content without being a boundary. */

import { classesManifest } from '../tailwind/component-css.ts';
import { manifestFor } from '../tailwind/manifest-surfaces.ts';
import { readManifests } from '../../check/arena/check-measured-box.ts';
import { loadDemos } from '../../generate/arena/generate-kitchen-sink.ts';
import { loadContracts } from '../../generate/arena/generate-playgrounds.ts';
import { instanceNode } from './kitchen-sink-model.ts';
import { repoRoot } from './repo-root.ts';
import { BOUNDARY } from '../tailwind/vocabulary.ts';
import type { Fixture, FixtureChild, FixtureNode } from './playground-model.ts';

export const PROBE = 'data-arena-probe';

export const ITEM_SLOTS = new Map<string, { item: string; part: string; why: string }>([
  ['ArenaCalendar.content', { item: 'ArenaCalendarEvent', part: 'calendar.chip', why: 'the calendar places its children as events on the grid and drops anything that is not one' }],
]);

export type Separate = { members?: Record<string, unknown>; without?: string[]; press?: string; why: string };

export const SEPARATE = new Map<string, Separate>([
  ['ArenaFigure.fallback', { without: ['media'],
    why: 'the fallback draws only where no media is given, so it is measured in a case without the media' }],
  ['ArenaProgressBar.content', { members: { shape: 'radial' },
    why: 'only a ring has a middle to project into, and a bar draws nothing for the slot' }],
  ['ArenaTable.empty', { without: ['content'],
    why: 'the empty sentence draws only when no row is written, so it is measured in a case without the rows' }],
  ['ArenaCalendarEvent.actions', { members: { actionsEnabled: true }, press: '[data-arena-part$="kebab-wrap"] button',
    why: 'the actions sit in a panel the chip opens from its own action button, drawn only when actionsEnabled is on' }],
]);

export type BoundaryCase = {
  component: string;
  label: string;
  press?: string;
  manifest: string | null;
  slots: string[];
  node: FixtureNode;
  transparent: Record<string, string>;
  slotOfPart: Record<string, string>;
};

export type ElementLike = {
  tagName: string;
  parentElement: ElementLike | null;
  hasAttribute(name: string): boolean;
  getAttribute(name: string): string | null;
  closest(selector: string): ElementLike | null;
  querySelector(selector: string): ElementLike | null;
};

export type ProbeSite = { slot: string; found: boolean; boundary: boolean; part: string | null };

type Contract = { component?: string; api?: Record<string, { form?: string; params?: unknown }> };

export function slotMembers(contract: Contract): string[] {
  return Object.entries(contract.api ?? {})
    .filter(([, spec]) => spec.form === 'slot' && spec.params === undefined)
    .map(([name]) => name);
}

const probe = (slot: string): FixtureNode => ({ element: 'i', attrs: { [PROBE]: slot } });

export function boundaryCases(root = repoRoot): BoundaryCase[] {
  const contracts = loadContracts(root) as Map<string, Contract>;
  const demos = loadDemos(root) as Map<string, Fixture>;
  const manifests = readManifests(root);
  const cases: BoundaryCase[] = [];
  for (const [component, contract] of contracts) {
    const slots = slotMembers(contract);
    if (slots.length === 0) continue;
    const fixture = demos.get(component);
    if (!fixture) throw new Error(`boundary-cases: ${component} contracts a slot and has no frameworks/demos fixture to render it from`);
    const owner = manifestFor(component, root);
    const manifest = owner ? manifests.get(owner) : undefined;
    const parts = manifest ? classesManifest(manifest).parts ?? {} : {};
    const shared = {
      component,
      manifest: manifest?.component ?? null,
      transparent: { ...(manifest?.transparent ?? {}) },
      slotOfPart: Object.fromEntries(Object.entries(parts).map(([slot, part]) => [part, slot])),
    };
    const together = slots.filter((slot) => !SEPARATE.has(`${component}.${slot}`));
    const filled: Record<string, FixtureChild[]> = { ...(fixture.slots ?? {}) };
    for (const slot of together) if (!ITEM_SLOTS.has(`${component}.${slot}`)) filled[slot] = [probe(slot)];
    if (together.length) cases.push({ ...shared, label: component, slots: together, node: instanceNode({ ...fixture, slots: filled }) });
    for (const slot of slots.filter((one) => SEPARATE.has(`${component}.${one}`))) {
      const entry = SEPARATE.get(`${component}.${slot}`) as Separate;
      const alone: Record<string, FixtureChild[]> = { ...(fixture.slots ?? {}) };
      for (const gone of entry.without ?? []) delete alone[gone];
      alone[slot] = [probe(slot)];
      cases.push({
        ...shared, label: `${component} (${slot})`, slots: [slot], press: entry.press,
        node: instanceNode({ ...fixture, seed: { ...(fixture.seed ?? {}), ...(entry.members ?? {}) }, slots: alone }),
      });
    }
  }
  return cases;
}

const hostTag = (item: string) => item.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();

export function readSites(container: ElementLike, kase: BoundaryCase): ProbeSite[] {
  return kase.slots.map((slot) => {
    const items = ITEM_SLOTS.get(`${kase.component}.${slot}`);
    const at = items
      ? container.querySelector(hostTag(items.item)) ?? container.querySelector(`[data-arena-part="${items.part}"]`)
      : container.querySelector(`[${PROBE}="${slot}"]`);
    const parent = at?.parentElement ?? null;
    return {
      slot,
      found: at !== null,
      boundary: parent?.hasAttribute(BOUNDARY) ?? false,
      part: parent?.closest('[data-arena-part]')?.getAttribute('data-arena-part') ?? null,
    };
  });
}

export function siteProblems(kase: BoundaryCase, sites: ProbeSite[], layer: string) {
  const problems: string[] = [];
  const spent: string[] = [];
  for (const site of sites) {
    const where = `${layer}/${kase.component}.${site.slot}`;
    if (!site.found) {
      problems.push(`${where}: rendered nowhere. Its demo fixture never opens this slot, so nothing measured `
        + 'where it lands: seed the fixture so it renders, or name it in ITEM_SLOTS if it takes Arena items');
      continue;
    }
    const slot = site.part ? kase.slotOfPart[site.part] : undefined;
    if (site.boundary) {
      if (slot !== undefined && kase.transparent[slot] !== undefined) {
        problems.push(`${where} projects into part "${site.part}", declared transparent in the manifest yet carrying ${BOUNDARY}: remove one of them`);
      }
      continue;
    }
    if (slot !== undefined && kase.transparent[slot] !== undefined) { spent.push(`${kase.manifest}.${slot}`); continue; }
    problems.push(`${where} projects into part "${site.part ?? '(none)'}", which carries no ${BOUNDARY}. `
      + 'A box class written above the component would reach the adopter\'s content: put the attribute on '
      + 'the element the content is projected into, or declare the slot transparent in the manifest with its reason');
  }
  return { problems, spent };
}

export function separateProblems(separate: Map<string, Separate>, contracts: Map<string, Contract>) {
  const problems: string[] = [];
  for (const key of separate.keys()) {
    const [component = '', slot = ''] = key.split('.');
    const contract = contracts.get(component);
    if (!contract || !slotMembers(contract).includes(slot)) problems.push(`SEPARATE: ${key} is no contracted slot`);
  }
  return problems;
}

export function staleTransparentProblems(cases: BoundaryCase[], spent: Set<string>, layer: string) {
  const declared = new Map<string, string>();
  for (const kase of cases)
    for (const [slot, why] of Object.entries(kase.transparent)) declared.set(`${kase.manifest}.${slot}`, why);
  return [...declared].filter(([key]) => !spent.has(key)).map(([key, why]) =>
    `${layer}: ${key} is declared transparent and no slot projected into it, so the exemption covers nothing: ${why}`);
}
