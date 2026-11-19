/* contracts/design/color-slots.json is the slot tier above the roles: every coloured part of a
 * group of components, per option, property and state, as a question a plugin answers with a role
 * its accepts set names. It carries no value, so check:dtcg leaves it by name and this gate holds its
 * shape: the declarations first (unknown keys, exceptions, member defaults and their decisions),
 * then the derived catalogue: each slot's name, the roles a property may be answered with, where a
 * default or derivation may point, what a slot sits on (its fill, a sibling's, its rest, the ground),
 * the member parts that read each slot under its state (a channel-less member reads its chain inline,
 * per axis branch), the Emphasis family's chains (R7), and the group map. A member default (D21's
 * grant, R5) is one rest slot of the member's part, unlike the group's answer. paintedByPaths names
 * the files the map stats, so a rename or a delete of one reruns the gate. */

import { statSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { colouredParts } from '../../lib/core/color-slot-map.ts';
import type { ColouredPart } from '../../lib/core/color-slot-map.ts';
import { COLOR_SLOTS, SLOT_KEYS, deriveSlots, isMemberDecl, readSlotDeclarations } from '../../lib/core/color-slots.ts';
import type { GroupPart, MemberDecl, SlotDeclarations } from '../../lib/core/color-slots.ts';
import { declarations } from '../../lib/tailwind/vocabulary.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';
import {
  SLOT_PROPERTIES, SLOT_STATES, acceptedRole, channelValue, expectedName, glob, memberChain, memberChannel, memberValue, optionAxes,
} from '../../generate/core/arena-cli/slots.ts';
import type { ColorSlot, MemberPart, SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';
import { slotPairs } from '../../generate/core/arena-cli/slot-contrast.ts';

export const EMPHASIS_FAMILY = 'frameworks/tailwind/vocabulary/arena-emphasis/Emphasis.family.json';

function paintedByPaths(): string[] {
  const groups = readSlotDeclarations().groups ?? {};
  const paths = Object.values(groups).flatMap((g) => Object.values(g.parts ?? {})).flatMap((p) => p.paintedBy ?? []);
  return [...new Set(paths)].sort();
}

export const node = {
  name: 'check:color-slots',
  reads: [COLOR_SLOTS, EMPHASIS_FAMILY, 'contracts/design/roles.json', 'contracts/design/palette.dark.json', 'frameworks/tailwind/Theme.css', 'frameworks/tailwind/components/**/*.manifest.json', ...paintedByPaths()],
  writes: [],
  feeds: [],
};

type Manifests = ReadonlyMap<string, ComponentManifest>;

const TOP_KEYS = ['accepts', 'refused', 'states', 'groups', 'members', 'rings', 'halos', 'slots'];
const SCOPED = ['scope', 'family', 'component', 'draws'];
const WORD: Record<string, string> = { fill: 'fill', ink: 'ink', icon: 'ink', edge: 'edge' };
const REF = /^\{([a-z0-9-]+)\}$/;
const entries = (c: SlotCatalogue) => Object.entries(c.slots);
const DISABLED = new Set(['disabled', 'selected-disabled']);

export function colourRoleSet(root = repoRoot): Set<string> {
  const roles = readJson(join(root, 'contracts/design/roles.json')) as Record<string, { $type?: string }>;
  return new Set(Object.entries(roles).filter(([, r]) => r.$type === 'color').map(([name]) => name));
}

export function slotManifests(root = repoRoot): Map<string, ComponentManifest> {
  return new Map([...layerManifests(root).values()].map((m) => [m.component, m]));
}

export function shapeProblems(c: SlotCatalogue): string[] {
  const out: string[] = [];
  for (const key of Object.keys(c)) if (!TOP_KEYS.includes(key)) out.push(`${COLOR_SLOTS}: unknown key "${key}"`);
  if (JSON.stringify(c.states) !== JSON.stringify(SLOT_STATES)) out.push(`${COLOR_SLOTS}: states is not ${SLOT_STATES.join(', ')}`);
  for (const p of SLOT_PROPERTIES) if (!Array.isArray(c.accepts?.[p])) out.push(`${COLOR_SLOTS}: accepts declares no list for ${p}`);
  for (const [name, s] of entries(c)) {
    for (const key of Object.keys(s)) {
      if (SCOPED.includes(key)) out.push(`${name}: a slot belongs to a group and names no ${key}`);
      else if (!(SLOT_KEYS as readonly string[]).includes(key)) out.push(`${name}: unknown key "${key}"`);
    }
    if (!(SLOT_PROPERTIES as readonly string[]).includes(s.property)) out.push(`${name}: property "${s.property}" is outside ${SLOT_PROPERTIES.join(', ')}`);
    if (!(SLOT_STATES as readonly string[]).includes(s.state)) out.push(`${name}: state "${s.state}" is outside ${SLOT_STATES.join(', ')}`);
    if (!(SLOT_PROPERTIES as readonly string[]).includes(s.accepts)) out.push(`${name}: accepts "${s.accepts}" names no property`);
    const parts = c.groups?.[s.group ?? '']?.parts;
    if (!parts) out.push(`${name}: group "${s.group}" is not declared in groups`);
    else if (!parts.includes(s.part)) out.push(`${name}: part "${s.part}" is not a part of group ${s.group} (${parts.join(', ')})`);
    if (s.channel !== undefined && !/^--[a-z0-9-]+$/.test(s.channel)) out.push(`${name}: channel "${s.channel}" is no custom property`);
    if (s.optional !== undefined && s.optional !== true) out.push(`${name}: optional is true or absent`);
  }
  return out;
}

export function nameProblems(c: SlotCatalogue): string[] {
  return entries(c).filter(([name, s]) => name !== expectedName(s))
    .map(([name, s]) => `${name}: its fields name it ${expectedName(s)}`);
}

export function acceptsProblems(c: SlotCatalogue, roles: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const p of SLOT_PROPERTIES) {
    for (const pattern of c.accepts[p] ?? []) {
      if (pattern === 'transparent') continue;
      const re = glob(pattern);
      const hits = [...roles].filter((r) => re.test(r));
      if (hits.length === 0) out.push(`accepts.${p}: "${pattern}" matches no colour role`);
      const wrong = hits.filter((r) => !r.includes(WORD[p] ?? p));
      if (wrong.length) out.push(`accepts.${p}: "${pattern}" matches ${wrong.join(', ')}, which name another property than ${WORD[p]}`);
    }
  }
  return out;
}

const mixIsFill = (s: ColorSlot) => s.derive?.mix === undefined || s.property === 'fill'
  || (s.property === 'edge' && (s.state === 'selected-hover' || s.state === 'selected-pressed'));

export function defaultProblems(c: SlotCatalogue, roles: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [name, s] of entries(c)) {
    const answered = [s.default !== undefined, s.derive !== undefined].filter(Boolean).length;
    if (s.state === 'rest') {
      if (s.default === undefined || s.derive !== undefined || s.optional === true) out.push(`${name}: a rest slot carries a default and nothing else`);
    } else if (answered > 1 || (answered === 0 && s.optional !== true) || (s.derive !== undefined && s.optional === true)) {
      out.push(`${name}: a ${s.state} slot carries a default or a derive, never both, and carries neither only when it is optional; only a disabled or selected-disabled slot may be optional, with or without a default and never with a derive`);
    }
    if (s.optional && s.state !== 'disabled' && s.state !== 'selected-disabled') out.push(`${name}: optional is for a disabled or selected-disabled slot only`);
    if (s.optional) {
      const base = expectedName({ ...s, state: s.state === 'selected-disabled' ? 'selected' : 'rest' });
      if (!Object.hasOwn(c.slots, base)) out.push(`${name}: it falls to ${base}, which is no slot`);
    }
    if (!mixIsFill(s)) out.push(`${name}: mix is for a fill, and for a selected hover or pressed edge, which follows its fill's mix (D85)`);
    if (s.derive?.mix !== undefined && !['mix-hover', 'mix-pressed'].includes(s.derive.mix)) out.push(`${name}: mix "${s.derive.mix}" is neither mix-hover nor mix-pressed`);
    if (s.default !== undefined) {
      const ref = REF.exec(s.default)?.[1];
      const ok = s.default === 'transparent' ? acceptedRole(c, s, 'transparent', roles)
        : ref !== undefined && (Object.hasOwn(c.slots, ref) || acceptedRole(c, s, ref, roles));
      if (!ok) out.push(`${name}: its default ${s.default} is not transparent where ${s.accepts} accepts it, a role ${s.accepts} accepts, or a slot`);
    }
    if (s.derive) {
      const from = c.slots[s.derive.from];
      const want = s.state.startsWith('selected-') ? 'selected' : 'rest';
      if (!from) out.push(`${name}: derives from ${s.derive.from}, which is no slot`);
      else if (from.group !== s.group || from.option !== s.option || from.part !== s.part || from.property !== s.property || from.state !== want) {
        out.push(`${name}: derives from ${s.derive.from}, which is not the ${[s.group, s.option, s.part].filter(Boolean).join(' ')} ${s.property} slot at ${want}`);
      }
    }
  }
  for (const start of Object.keys(c.slots)) {
    const seen = new Set<string>();
    for (let at: string | undefined = start; at !== undefined && c.slots[at];) {
      if (seen.has(at)) { out.push(`${start}: its chain returns to ${at}, a cycle`); break; }
      seen.add(at);
      const s: ColorSlot = c.slots[at]!;
      at = s.derive?.from ?? (s.default ? REF.exec(s.default)?.[1] : undefined);
    }
  }
  return [...new Set(out)];
}

export function fallbackProblems(c: SlotCatalogue): string[] {
  const out: string[] = [];
  for (const [name, s] of entries(c)) {
    if (s.property === 'icon') {
      const ink = expectedName({ ...s, property: 'ink' });
      if (s.default === undefined) out.push(`${name}: an icon slot falls to the ink slot of its own part and state, and this one names no default`);
      else if (s.default !== `{${ink}}`) out.push(`${name}: it falls to ${s.default} and must fall to ${ink}`);
      if (c.slots[ink]?.level !== s.level) out.push(`${name}: it carries level ${s.level ?? 'none'} and its ink slot carries ${c.slots[ink]?.level ?? 'none'}`);
    } else if (s.default !== undefined && REF.test(s.default) && Object.hasOwn(c.slots, REF.exec(s.default)![1]!)) {
      out.push(`${name}: a group slot falls to a role, and ${s.default} is a slot`);
    }
  }
  return out;
}

const SELECTED_ON = new Set(['selected', 'selected-hover', 'selected-pressed']);

export function pairProblems(c: SlotCatalogue, d: SlotDeclarations = readSlotDeclarations()): string[] {
  const out: string[] = [];
  for (const [name, s] of entries(c)) {
    const gp = d.groups?.[s.group]?.parts?.[s.part];
    if (gp === undefined) continue;
    const option = Array.isArray(gp.options) || s.option === undefined ? undefined : gp.options?.[s.option];
    const own = (option?.properties ?? gp.properties).includes('fill') ? expectedName({ ...s, property: 'fill' }) : undefined;
    const sibling = gp.on === undefined ? undefined : expectedName({ group: s.group, part: gp.on, property: 'fill', state: s.state });
    let want: string | undefined;
    if (s.property === 'ink' || s.property === 'icon') want = own ?? sibling ?? 'ground';
    else if (s.property === 'fill') want = gp.selectedOn === 'rest' && SELECTED_ON.has(s.state) ? expectedName({ ...s, state: 'rest' }) : sibling;
    else want = sibling ?? own;
    if (s.on !== want) out.push(`${name}: it sits on ${s.on ?? 'nothing'} and the declarations give ${want ?? 'nothing'}`);
    else if (s.on !== undefined && s.on !== 'ground' && c.slots[s.on]?.property !== 'fill') out.push(`${name}: it sits on ${s.on}, which is no fill slot`);
  }
  return out;
}

const classesOf = (m: ComponentManifest): Record<string, string[]> => {
  const parts: Record<string, string[]> = {};
  const add = (map: unknown) => {
    for (const [k, v] of Object.entries((map ?? {}) as Record<string, unknown>)) if (typeof v === 'string') (parts[k] ??= []).push(v);
  };
  add(m.slots);
  for (const group of Object.values(m.variants ?? {})) for (const option of Object.values(group)) add(option);
  for (const cv of m.compoundVariants ?? []) add(cv.class);
  return parts;
};

const emphasisOptions = (m: ComponentManifest) => (m.answers ?? [])
  .flatMap((a) => (typeof a === 'string' || a.family !== 'emphasis' ? [] : a.options.map((o) => o.replace(/^arena-emphasis-/, ''))));

const memberSlots = (c: SlotCatalogue, m: MemberPart) => {
  const [group, part] = m.to.split('.');
  return entries(c).filter(([, s]) => s.group === group && s.part === part && (s.option === undefined ? m.options.length === 0 : m.options.includes(s.option)) && m.states.includes(s.state) && (m.properties === undefined || m.properties.includes(s.property)));
};

export function manifestProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const manifest = manifests.get(comp);
    if (!manifest) { out.push(`members.${key}: no manifest declares the component ${comp}`); continue; }
    if (!Object.hasOwn(manifest.slots ?? {}, part)) out.push(`members.${key}: ${comp} has no slot ${part}`);
    const targeted = new Set(optionAxes(m).flatMap((one) => Object.values(one.values)));
    for (const option of m.options) {
      if (!entries(c).some(([, s]) => `${s.group}.${s.part}` === m.to && s.option === option)) out.push(`members.${key}: ${m.to} derives no ${option} slot`);
      const axis = targeted.has(option) || (m.optionBy === undefined && m.options.length === 1) || (m.optionBy !== undefined && m.options.filter((o) => !targeted.has(o)).length === 1);
      if (!axis && !emphasisOptions(manifest).includes(option) && !Object.hasOwn(manifest.variants ?? {}, option)) {
        out.push(`members.${key}: ${comp} answers no emphasis ${option} and declares no variant ${option}`);
      }
    }
    const branches: [string, string][] = [...optionAxes(m).flatMap((one) => Object.keys(one.values).map((value) => [one.axis, value] as [string, string])),
      ...(m.selectedBy && m.states.includes('rest') ? [[m.selectedBy.axis, m.selectedBy.value] as [string, string]] : []),
      ...(m.disabledBy && m.states.some((st) => DISABLED.has(st)) ? [[m.disabledBy.axis, m.disabledBy.value] as [string, string]] : []),
      ...(m.hoverBy && m.states.includes('hover') ? [[m.hoverBy.axis, m.hoverBy.value] as [string, string]] : []),
      ...(m.hoverIn && m.states.some((st) => st === 'hover' || st === 'pressed') ? [[m.hoverIn.axis, m.hoverIn.value] as [string, string]] : []),
      ...(m.onlyBy ? [[m.onlyBy.axis, m.onlyBy.value] as [string, string]] : [])];
    for (const [axis, value] of branches) {
      if (!Object.hasOwn(manifest.variants?.[axis] ?? {}, value)) out.push(`members.${key}: ${comp} declares no variant ${axis}=${value}`);
    }
  }
  for (const m of manifests.values()) {
    if (emphasisOptions(m).length === 0) continue;
    for (const [part, texts] of Object.entries(classesOf(m))) {
      if (texts.some((t) => t.includes('--arena-emphasis-')) && !Object.hasOwn(c.members ?? {}, `${m.component}.${part}`)) {
        out.push(`${m.component}.${part} reads an --arena-emphasis-* channel and is no member part of a group in ${COLOR_SLOTS}`);
      }
    }
  }
  return out;
}

export function ringProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  const focusable = new Set<string>();
  for (const key of Object.keys(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const text = manifests.get(comp)?.slots?.[part as never] as unknown;
    if (typeof text === 'string' && text.includes('focus-visible:outline')) focusable.add(key);
  }
  const measured = new Set(slotPairs(c).filter((pair) => pair.slot === 'edge-focus').map((pair) => pair.over));
  for (const key of focusable) {
    if (!(key in c.rings)) out.push(`${key} is focusable and a member part of a group, and rings does not say what its focus ring sits on`);
  }
  for (const [key, on] of Object.entries(c.rings)) {
    if (!focusable.has(key)) out.push(`rings names ${key}, which is no focusable member part of a group`);
    else if (on !== 'ground' && c.slots[on]?.property !== 'fill') out.push(`rings.${key} is ${on}, which is neither ground nor a fill slot`);
    else if (on !== 'ground' && !measured.has(on)) out.push(`rings.${key} is ${on}, a fill the focus ring is never measured over: a disabled state is no pair`);
  }
  return out;
}

const MODIFIER: Record<string, string> = {
  rest: '', hover: 'hover:', pressed: 'active:', disabled: 'disabled:', selected: '', 'selected-hover': 'hover:', 'selected-pressed': 'active:', 'selected-disabled': 'disabled:',
};
const UTILITY: Record<string, string> = { fill: 'bg-[color:', ink: 'text-[color:', edge: 'border-[color:', icon: '[--arena-icon-ink:' };
const RULE = 'shadow-[inset_0_calc(var(--bw-strong)*-1)_0_';
const VARIANT = /^(?:[a-z][a-z0-9-]*:)+/;

const reads = (token: string, modifier: string, property: string, expected: string[]) => {
  const prefix = VARIANT.exec(token)?.[0] ?? '';
  return prefix === modifier && token.slice(prefix.length).startsWith(UTILITY[property] ?? '?') && expected.some((one) => token.includes(one));
};

const utilityOf = (m: MemberPart, property: string) => (property === 'edge' && m.edgeAs === 'rule' ? RULE : UTILITY[property]);
const modifierOf = (m: MemberPart, s: ColorSlot) => {
  if (DISABLED.has(s.state) && m.disabledModifier !== undefined) return m.disabledModifier;
  return (m.disabledBy && DISABLED.has(s.state)) || (m.hoverBy && s.state === 'hover') ? '' : MODIFIER[s.state] ?? '';
};
const whereOf = (branch: [string, string][]) => (branch.length ? branch.map(([axis, value]) => `the ${axis}=${value} branch`).join(' and ') : 'the base class');

const inlineMember = (c: SlotCatalogue, m: MemberPart) => m.inline === true || m.channels === undefined && memberSlots(c, m).every(([, s]) => s.channel === undefined);

const branchOf = (m: MemberPart, s: ColorSlot): [string, string][] => {
  const out: [string, string][] = [];
  if (m.onlyBy) out.push([m.onlyBy.axis, m.onlyBy.value]);
  for (const one of optionAxes(m)) {
    const by = Object.entries(one.values).find(([, option]) => option === s.option);
    if (by) { out.push([one.axis, by[0]]); break; }
  }
  if (m.selectedBy && m.states.includes('rest') && s.state.startsWith('selected')) out.push([m.selectedBy.axis, m.selectedBy.value]);
  if (m.disabledBy && DISABLED.has(s.state)) out.push([m.disabledBy.axis, m.disabledBy.value]);
  if (m.hoverBy && s.state === 'hover') out.push([m.hoverBy.axis, m.hoverBy.value]);
  if (m.hoverIn && (s.state === 'hover' || s.state === 'pressed')) out.push([m.hoverIn.axis, m.hoverIn.value]);
  return out;
};

const branchTexts = (manifest: ComponentManifest, part: string, branch: [string, string][]): string[] => {
  const text = (v: unknown) => (typeof v === 'string' ? [v] : []);
  if (branch.length === 0) return text((manifest.slots as Record<string, unknown> | undefined)?.[part]);
  if (branch.length === 1) return text(manifest.variants?.[branch[0]![0]]?.[branch[0]![1]]?.[part as never]);
  return (manifest.compoundVariants ?? []).filter((cv) => branch.every(([axis, value]) => String(cv[axis]) === value)).flatMap((cv) => text((cv.class as Record<string, unknown>)[part]));
};

const hoverless = (c: SlotCatalogue, m: MemberPart) => {
  const slots = memberSlots(c, m);
  const has = (option: string, state: string) => slots.some(([, s]) => s.option === option && s.state === state);
  const axisOf = (option: string) => optionAxes(m).find((one) => Object.values(one.values).includes(option));
  const without = m.states.includes('hover') ? m.options.filter((o) => has(o, 'rest') && !has(o, 'hover') && axisOf(o)) : [];
  return without.flatMap((o) => m.options.filter((p) => has(p, 'hover') && axisOf(p) && axisOf(p)!.axis !== axisOf(o)!.axis).map((p) => [o, p] as [string, string]));
};

const heldAt = (manifest: ComponentManifest, part: string, branch: [string, string][], want: string) =>
  branchTexts(manifest, part, branch).some((text) => text.split(/\s+/).includes(want));

export function memberReadProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const manifest = manifests.get(comp);
    if (!manifest || !inlineMember(c, m)) continue;
    if (m.inkFrom !== undefined) {
      const [group, from] = m.inkFrom.split('.');
      for (const [name, s] of entries(c).filter(([, one]) => one.group === group && one.part === from && one.property === 'ink')) {
        const want = `${MODIFIER[s.state] ?? ''}text-[color:${memberValue(c, key, name, 'tailwind')}]`;
        if (!heldAt(manifest, part, [], want)) out.push(`${key}: its ink is not read from ${m.inkFrom} as ${want} in the base class`);
      }
    }
    for (const [name, s] of memberSlots(c, m)) {
      const branch = branchOf(m, s);
      const modifier = modifierOf(m, s);
      const want = `${utilityOf(m, s.property)}${memberValue(c, key, name, 'tailwind')}]`;
      const holds = (at: [string, string][]) => branchTexts(manifest, part, at).some((text) => text.split(/\s+/).some((token) => {
        const prefix = VARIANT.exec(token)?.[0] ?? '';
        return prefix === modifier && token.slice(prefix.length) === want;
      }));
      const twin = m.selectedBy !== undefined && (s.state === 'hover' || s.state === 'pressed') && modifier !== ''
        ? memberSlots(c, m).find(([, one]) => one.option === s.option && one.property === s.property && one.state === `selected-${s.state}`)?.[0] : undefined;
      if (twin !== undefined) {
        const unselected: [string, string][] = [...branch, [m.selectedBy!.axis, m.selectedBy!.value === 'true' ? 'false' : 'true']];
        if (m.selectedBy!.value === 'true' && holds(unselected)) continue;
        if (holds(branch)) {
          out.push(`${key}: ${name} is read under ${modifier} in ${whereOf(branch)} and ${twin} under ${modifier} in ${whereOf([...branch, [m.selectedBy!.axis, m.selectedBy!.value]])}, and a selected part matches both with no rule for their order (R4): read ${name} in ${whereOf(unselected)}`);
          continue;
        }
      }
      if (!holds(branch)) out.push(`${key}: ${name} is not read as ${modifier}${want} in ${whereOf(branch)}`);
    }
    const held = new Set<string>();
    for (const [still, moving] of hoverless(c, m)) {
      for (const [, s] of memberSlots(c, m).filter(([, one]) => one.option === moving && one.state === 'hover')) {
        const paints = memberSlots(c, m).find(([, one]) => one.option === still && one.state === 'rest' && one.property === s.property);
        const [name, rest] = paints ?? [expectedName({ ...s, state: 'rest' }), { ...s, state: 'rest' } as ColorSlot];
        const branch = paints ? branchOf(m, rest) : [...branchOf(m, { ...rest, option: still }), ...branchOf(m, rest).filter(([axis]) => !(m.onlyBy && axis === m.onlyBy.axis))];
        const want = `hover:${UTILITY[s.property]}${memberValue(c, key, name, 'tailwind')}]`;
        const where = branch.map(([axis, value]) => `the ${axis}=${value} branch`).join(' and ');
        if (held.has(`${name} ${where}`)) continue;
        held.add(`${name} ${where}`);
        if (!heldAt(manifest, part, branch, want)) out.push(`${key}: ${name} is not held as ${want} in ${where}, so a hovered ${still} field takes another option's hover (D73)`);
      }
    }
  }
  return out;
}

const FADES = /opacity-\[var\(--(?:[a-z0-9-]+-)?fade-/;

const textsUnder = (manifest: ComponentManifest, part: string, branch: [string, string][]): string[] => {
  const text = (v: unknown) => (typeof v === 'string' ? [v] : []);
  const holds = (conditions: Record<string, unknown>) => branch.every(([axis, value]) => String(conditions[axis]) === value);
  return [
    ...(branch.length === 0 ? text((manifest.slots as Record<string, unknown> | undefined)?.[part]) : []),
    ...Object.entries(manifest.variants ?? {}).flatMap(([axis, values]) => Object.entries(values).filter(([value]) => holds({ [axis]: value })).flatMap(([, one]) => text((one as Record<string, unknown>)[part]))),
    ...(manifest.compoundVariants ?? []).filter((cv) => holds(cv as Record<string, unknown>)).flatMap((cv) => text((cv.class as Record<string, unknown>)[part])),
  ];
};

export function fadeProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const manifest = manifests.get(comp);
    if (!manifest || !(classesOf(manifest)[part] ?? []).some((text) => FADES.test(text))) continue;
    const seen = new Set<string>();
    for (const [name, s] of memberSlots(c, m)) {
      if (!DISABLED.has(s.state) || !(inlineMember(c, m) || s.channel === undefined)) continue;
      const marker = `opacity-[var(--${[s.group, ...(s.option === undefined ? [] : [s.option]), s.part].join('-')}-fade-${s.state},var(--fade-disabled))]`;
      const branch = branchOf(m, s);
      if (seen.has(marker + JSON.stringify(branch))) continue;
      seen.add(marker + JSON.stringify(branch));
      const carried = textsUnder(manifest, part, branch).some((text) => text.split(/\s+/).some((token) => token === marker || token === `${m.disabledModifier ?? 'disabled:'}${marker}`));
      if (!carried) {
        const where = branch.length ? branch.map(([axis, value]) => `the ${axis}=${value} branch`).join(' and ') : 'the base class';
        out.push(`${key}: it reads ${name} and fades, and no class of ${where} or a branch under it carries ${marker}, so an answered ${s.state} slot never stops the fade (D8)`);
      }
    }
  }
  return out;
}

export function readProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const lines = new Map<string, string[]>();
  const read = new Set<string>();
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const manifest = manifests.get(comp);
    for (const [name, s] of memberSlots(c, m)) {
      read.add(name);
      if (inlineMember(c, m)) continue;
      const selected = s.state.startsWith('selected');
      const texts = selected ? [(manifest?.variants?.pressed as Record<string, Record<string, string>> | undefined)?.true?.[part]]
        : classesOf(manifest ?? ({} as ComponentManifest))[part] ?? [];
      const channel = memberChannel(m, s);
      const expected = channel === undefined ? [memberChain(c, key, name)] : [`var(${channel},`, `var(${channel})`];
      const modifier = MODIFIER[s.state] ?? '';
      const found = texts.some((text) => String(text ?? '').split(/\s+/).some((token) => reads(token, modifier, s.property, expected)));
      if (!found) {
        const line = `${key} does not read ${channel ?? 'its full chain'} under ${modifier || 'no variant'}${selected ? ' in the pressed branch' : ''}`;
        lines.set(line, [...(lines.get(line) ?? []), name]);
      }
    }
  }
  for (const name of Object.keys(c.slots)) if (!read.has(name)) lines.set(`${name}: no member part reads it`, []);
  return [...lines].map(([key, names]) => (names.length ? `${key}: ${names.join(', ')}` : key));
}

export function familyProblems(c: SlotCatalogue, family: { variants?: Record<string, string> }): string[] {
  const out: string[] = [];
  for (const [option, classes] of Object.entries(family.variants ?? {})) {
    const opt = option.replace(/^arena-emphasis-/, '');
    const written = new Map(declarations(classes) as [string, string][]);
    const slots = entries(c).filter(([, s]) => s.group === 'actions' && s.part === 'root' && s.option === opt && s.channel?.startsWith('--arena-emphasis-'));
    for (const [name, s] of slots) {
      const want = channelValue(c, name, 'css');
      const value = written.get(s.channel as string);
      const readThrough = Object.values(c.members ?? {}).some((m) => memberSlots(c, m).some(([n]) => n === name) && memberChannel(m, s) === s.channel);
      if (!readThrough) {
        if (value !== undefined) out.push(`${EMPHASIS_FAMILY}: ${option} writes ${s.channel}, and every member part reads ${name} through a channel of its own`);
      } else if (value === undefined) out.push(`${EMPHASIS_FAMILY}: ${option} writes no ${s.channel}, and ${name} is read through it`);
      else if (value !== want) out.push(`${EMPHASIS_FAMILY}: ${option} writes ${s.channel} as ${value}, and the chain of ${name} is ${want}`);
    }
    for (const state of ['disabled', 'selected-disabled']) {
      if (!slots.some(([, s]) => s.state === state)) continue;
      const marker = `var(--actions-${opt}-root-fade-${state},`;
      if (!(written.get(`--arena-emphasis-fade-${state}`) ?? '').startsWith(marker)) out.push(`${EMPHASIS_FAMILY}: ${option} writes --arena-emphasis-fade-${state} without ${marker}…), so an answered ${state} slot never stops the fade`);
    }
  }
  return out;
}

const DECLARED = {
  top: ['$description', 'accepts', 'refused', 'states', 'stateSets', 'selected', 'exceptions', 'rings', 'groups', 'members'],
  group: ['parts'],
  groupPart: ['properties', 'options', 'states', 'channel', 'rest', 'selected', 'on', 'selectedOn', 'decision', 'paintedBy'],
  option: ['states', 'properties', 'rest', 'halo', 'channel', 'decision'],
  member: ['group', 'parts'],
  memberPart: ['to', 'options', 'states', 'channels', 'defaults', 'decision', 'optionBy', 'selectedBy', 'disabledBy', 'hoverBy', 'onlyBy', 'hoverIn', 'edgeAs', 'disabledModifier', 'inkFrom', 'properties', 'inline'],
  exception: ['default', 'decision', 'level'],
};
const DECISION = /^[DR]\d+$/;
const LEVEL = /^level-[a-z0-9-]+$/;

export function declarationProblems(d: SlotDeclarations): string[] {
  const out: string[] = [];
  const keys = (where: string, value: unknown, allowed: string[]) => {
    for (const key of Object.keys((value ?? {}) as object)) if (!allowed.includes(key)) out.push(`${where}: unknown key "${key}"`);
  };
  const sets = (where: string, spec: unknown) => {
    if (spec === undefined) out.push(`${where}: no states`);
    else if (typeof spec === 'string') {
      if (!Object.hasOwn(d.stateSets ?? {}, spec)) out.push(`${where}: state set "${spec}" is not declared in stateSets`);
    } else if (Array.isArray(spec)) {
      for (const st of spec) if (!(d.states ?? []).includes(st)) out.push(`${where}: state "${st}" is not declared in states`);
    } else out.push(`${where}: its states name a state set or list states, and this is neither`);
  };
  const decision = (where: string, value: unknown, what: string) => {
    if (value === undefined) out.push(`${where}: it declares ${what} and carries no decision, and needs D<n> or R<n>`);
    else if (!DECISION.test(String(value))) out.push(`${where}: its decision "${String(value)}" is neither D<n> nor R<n>`);
  };
  const rest = (where: string, answers: Record<string, unknown>, part: GroupPart) => {
    for (const [prop, a] of Object.entries(answers ?? {})) {
      if (!part.properties.includes(prop)) out.push(`${where}.${prop}: the part paints no ${prop} (${part.properties.join(', ')})`);
      if (a === 'ink' && prop !== 'icon') out.push(`${where}.${prop}: the answer "ink" belongs to icon only`);
    }
    for (const prop of part.properties) if (!Object.hasOwn(answers ?? {}, prop)) out.push(`${where}: it answers no ${prop}, and a part that derives slots answers every property it paints (D45)`);
  };
  const channel = (where: string, value: unknown) => {
    if (value !== undefined && value !== null && !/^--[a-z0-9-]+(\{property\}[a-z0-9-]*)?$/.test(String(value))) out.push(`${where}.channel: "${String(value)}" is neither null nor a custom property`);
  };
  const selectedOf = (where: string, answers: unknown, part: GroupPart, spec: unknown) => {
    if (answers === undefined) return;
    for (const [prop, a] of Object.entries(answers as Record<string, unknown>)) {
      if (!['fill', 'ink', 'edge'].includes(prop)) out.push(`${where}.${prop}: a selected answer is fill, ink or edge`);
      else if (!part.properties.includes(prop)) out.push(`${where}.${prop}: the part paints no ${prop} (${part.properties.join(', ')})`);
      else if (a === 'ink') out.push(`${where}.${prop}: the answer "ink" belongs to icon only`);
    }
    const names = typeof spec === 'string' ? d.stateSets?.[spec] : Array.isArray(spec) ? spec : undefined;
    if (names !== undefined && !names.includes('selected')) out.push(`${where}: its states have no selected state, so the answers derive no slot`);
  };
  keys(COLOR_SLOTS, d, DECLARED.top);
  for (const [prop, a] of Object.entries(d.selected ?? {})) {
    if (!['fill', 'ink', 'edge'].includes(prop)) out.push(`selected: unknown key "${prop}"`);
    else if (a === 'ink') out.push(`selected.${prop}: the answer "ink" belongs to icon only`);
  }
  for (const [n, e] of Object.entries(d.exceptions ?? {})) {
    keys(`exceptions.${n}`, e, DECLARED.exception);
    if (e.level !== undefined && !LEVEL.test(String(e.level))) out.push(`exceptions.${n}.level: "${String(e.level)}" is no level, and a level is level-<name>`);
  }
  for (const [g, group] of Object.entries(d.groups ?? {})) {
    keys(`groups.${g}`, group, DECLARED.group);
    for (const [part, p] of Object.entries(group.parts ?? {})) {
      const where = `groups.${g}.parts.${part}`;
      keys(where, p, DECLARED.groupPart);
      for (const prop of p.properties ?? []) if (!['fill', 'ink', 'edge', 'icon'].includes(prop)) out.push(`${where}: property "${prop}" is outside fill, ink, edge, icon`);
      channel(where, p.channel);
      if (p.on !== undefined && (p.on === part || !(group.parts[String(p.on)]?.properties ?? []).includes('fill'))) out.push(`${where}.on: "${String(p.on)}" is no part of ${g} that paints a fill, besides this one`);
      if (p.selectedOn !== undefined && p.selectedOn !== 'rest') out.push(`${where}.selectedOn: "${String(p.selectedOn)}" is not "rest"`);
      if (p.selectedOn !== undefined && !p.properties.includes('fill')) out.push(`${where}.selectedOn: the part paints no fill to sit on`);
      selectedOf(`${where}.selected`, p.selected, p, p.states);
      const options = p.options;
      if (options !== undefined && !Array.isArray(options)) {
        if (p.rest !== undefined) out.push(`${where}: a part with options answers its rest per option, never on the part`);
        for (const [opt, o] of Object.entries(options)) {
          const at = `${where}.options.${opt}`;
          keys(at, o, DECLARED.option);
          channel(at, o.channel);
          if (o.halo !== undefined && !LEVEL.test(String(o.halo))) out.push(`${at}.halo: "${String(o.halo)}" is no level, and a level is level-<name>`);
          if (o.halo !== undefined && !(o.properties ?? p.properties).includes('edge')) out.push(`${at}.halo: the part paints no edge for a halo to follow`);
          if (o.decision !== undefined) decision(at, o.decision, 'a decision');
          if (o.rest === undefined) out.push(`${at}: an option of a part that derives slots declares its rest answers (D45)`);
          else rest(`${at}.rest`, o.rest, { ...p, properties: o.properties ?? p.properties });
          for (const prop of o.properties ?? []) if (!p.properties.includes(prop)) out.push(`${at}.properties: "${prop}" is a property the part does not paint (${p.properties.join(', ')})`);
          if (o.properties !== undefined && o.properties.length === 0) out.push(`${at}.properties: it lists no property`);
          sets(at, o.states ?? p.states);
        }
      } else {
        if (p.states !== undefined || p.rest !== undefined) sets(where, p.states);
        if (p.rest !== undefined) {
          if (options !== undefined) out.push(`${where}: a part that lists its options answers its rest per option`);
          rest(`${where}.rest`, p.rest, p);
        }
        const names = typeof p.states === 'string' ? d.stateSets?.[p.states] : Array.isArray(p.states) ? p.states : undefined;
        if (names !== undefined && p.rest === undefined && p.selected !== undefined && names.includes('rest')) out.push(`${where}: its states hold rest and it answers no rest`);
        if (p.rest === undefined && p.selected !== undefined && options === undefined) rest(`${where}.selected`, p.selected, p);
      }
    }
  }
  for (const [comp, m] of Object.entries(d.members ?? {})) {
    keys(`members.${comp}`, m, DECLARED.member);
    for (const [part, to] of Object.entries(m.parts ?? {})) {
      if (!isMemberDecl(to)) continue;
      const where = `members.${comp}.parts.${part}`;
      keys(where, to, DECLARED.memberPart);
      sets(where, (to as MemberDecl).states);
      if (Object.keys(to.defaults ?? {}).length) decision(where, to.decision, 'defaults');
      const axes = optionAxes(to as MemberPart);
      const axisNames = new Set<string>();
      for (const by of axes) {
        if (typeof by.axis !== 'string' || by.axis === '') out.push(`${where}.optionBy: it names no axis`);
        else if (axisNames.has(by.axis)) out.push(`${where}.optionBy: the axis ${by.axis} is named twice`);
        axisNames.add(by.axis);
        for (const [value, option] of Object.entries(by.values ?? {})) {
          if (!(to.options ?? []).includes(option)) out.push(`${where}.optionBy: "${option}" is not an option the member lists (${(to.options ?? []).join(', ') || 'none'}), for ${by.axis}=${value}`);
        }
        if (Object.keys(by.values ?? {}).length === 0) out.push(`${where}.optionBy: it maps no value onto an option`);
      }
      if (axes.length > 0 && (to.options ?? []).filter((o) => !axes.some((one) => Object.values(one.values ?? {}).includes(o))).length > 1) {
        out.push(`${where}.optionBy: more than one option is left with no value, and only the base option has none`);
      }
      const branch = (key: 'selectedBy' | 'disabledBy' | 'hoverBy' | 'onlyBy' | 'hoverIn', others: ('optionBy' | 'selectedBy' | 'disabledBy' | 'hoverBy')[]) => {
        const one = to[key];
        if (one === undefined) return;
        if (typeof one.axis !== 'string' || one.axis === '' || typeof one.value !== 'string') { out.push(`${where}.${key}: it names an axis and a value`); return; }
        for (const other of others) {
          const shared = other === 'optionBy' ? axisNames.has(one.axis) : (to[other] as { axis: string } | undefined)?.axis === one.axis;
          if (shared) { out.push(`${where}.${key}: it shares the axis ${one.axis} with ${other}`); return; }
        }
      };
      branch('selectedBy', ['optionBy']);
      branch('disabledBy', ['optionBy', 'selectedBy']);
      branch('hoverBy', ['optionBy', 'selectedBy', 'disabledBy']);
      branch('onlyBy', ['optionBy', 'selectedBy', 'disabledBy', 'hoverBy']);
      branch('hoverIn', ['optionBy', 'selectedBy', 'disabledBy']);
      for (const other of ['hoverBy', 'onlyBy'] as const) if (to.hoverIn !== undefined && to[other] !== undefined) out.push(`${where}.hoverIn: it stands beside ${other}, and a member reads its hover in one branch or under one axis`);
      const [homeGroup, homePart] = String(to.to).split('.');
      const stateList = (spec: unknown): string[] => (typeof spec === 'string' ? d.stateSets?.[spec] ?? [] : Array.isArray(spec) ? spec as string[] : []);
      const homeDecl = d.groups?.[homeGroup as string]?.parts?.[homePart as string];
      if (homeDecl !== undefined) {
        const homeOptions = homeDecl.options !== undefined && !Array.isArray(homeDecl.options) ? homeDecl.options : {};
        const owners = (to.options ?? []).length > 0 ? (to.options ?? []).map((o) => [o, stateList(homeOptions[o]?.states ?? homeDecl.states)] as const) : [[undefined, stateList(homeDecl.states)] as const];
        const declared = owners.every(([, derived]) => derived.length > 0);
        for (const st of declared ? stateList(to.states).filter((one) => (d.states ?? []).includes(one)) : []) {
          if (owners.some(([, derived]) => derived.includes(st))) continue;
          const named = owners.map(([o]) => [homeGroup, o, homePart].filter(Boolean).join('.')).join(', ');
          out.push(`${where}.states: "${st}" is a state none of ${named} derives, so the member reads no slot for it`);
        }
      }
      const homeProps = to.properties ?? d.groups?.[homeGroup as string]?.parts?.[homePart as string]?.properties ?? [];
      if (to.edgeAs !== undefined && to.edgeAs !== 'rule') out.push(`${where}.edgeAs: "${String(to.edgeAs)}" is not "rule"`);
      else if (to.edgeAs !== undefined && !homeProps.includes('edge')) out.push(`${where}.edgeAs: ${to.to} paints no edge to draw as a rule`);
      if (to.disabledModifier !== undefined && to.disabledModifier !== 'aria-disabled:') out.push(`${where}.disabledModifier: "${String(to.disabledModifier)}" is not "aria-disabled:"`);
      else if (to.disabledModifier !== undefined && to.disabledBy !== undefined) out.push(`${where}.disabledModifier: it stands beside disabledBy, and a member reads its disabled states under one of them`);
      if (to.properties !== undefined) {
        const [group, partName] = String(to.to).split('.');
        const painted = d.groups?.[group as string]?.parts?.[partName as string]?.properties ?? [];
        for (const prop of to.properties) if (!painted.includes(prop)) out.push(`${where}.properties: "${prop}" is a property ${to.to} does not paint (${painted.join(', ') || 'none'})`);
      }
      for (const [prop, ch] of Object.entries(to.channels ?? {})) {
        if (!['fill', 'ink', 'edge', 'icon'].includes(prop)) out.push(`${where}.channels: unknown key "${prop}"`);
        if (!/^--[a-z0-9-]+$/.test(ch)) out.push(`${where}.channels.${prop}: "${ch}" is no custom property`);
      }
    }
  }
  return out;
}

export function exceptionProblems(d: SlotDeclarations): string[] {
  const out: string[] = [];
  const built = deriveSlots({ ...d, exceptions: {} }).slots;
  for (const [n, e] of Object.entries(d.exceptions ?? {})) {
    if (!/^[DR]\d+$/.test(e.decision ?? '')) {
      out.push(e.decision === undefined ? `exceptions.${n}: the exception carries no decision, and needs D<n> or R<n>` : `exceptions.${n}: its decision "${e.decision}" is neither D<n> nor R<n>`);
    }
    const rest = Object.fromEntries(Object.entries(d.exceptions).filter(([k]) => k !== n && Object.hasOwn(built, k)));
    const slot = deriveSlots({ ...d, exceptions: rest }).slots[n];
    if (!slot) out.push(`exceptions.${n}: it names no slot the rule builds`);
    else if (slot.default === e.default && slot.level === e.level) out.push(`exceptions.${n}: ${n} already falls to ${e.default}, the rule already gives it, so the exception is no exception`);
  }
  return out;
}

const targetOf = (to: string) => {
  const [at, options] = to.split('@');
  const [group, part] = (at ?? '').split('.');
  return { group: group ?? '', part: part ?? '', options: options === undefined ? [] : options.split('|') };
};

export function mapProblems(d: SlotDeclarations, coloured: ReadonlyMap<string, ColouredPart>, manifests: Manifests, root = repoRoot): string[] {
  const out: string[] = [];
  const groups = d.groups ?? {};
  const members = d.members ?? {};
  const used = new Set<string>();
  for (const [comp, m] of Object.entries(members)) {
    const manifest = manifests.get(comp);
    if (!manifest) { out.push(`members.${comp}: no manifest declares the component ${comp}`); continue; }
    if (m.group !== null && !Object.hasOwn(groups, m.group)) out.push(`members.${comp}: its group "${m.group}" is not declared in groups`);
    for (const [part, to] of Object.entries(m.parts ?? {})) {
      const key = `${comp}.${part}`;
      if (!Object.hasOwn(manifest.slots ?? {}, part)) { out.push(`${key}: ${comp} has no slot ${part}`); continue; }
      const painted = coloured.get(key);
      if (to === null) {
        if (!painted?.keywordsOnly) out.push(`${key}: it is null and paints ${painted ? 'a role' : 'no colour'}; null is for a part that paints only current or transparent`);
        continue;
      }
      const t = isMemberDecl(to) ? { ...targetOf(to.to), options: to.options } : targetOf(to);
      const gp = groups[t.group]?.parts?.[t.part];
      if (!gp) { out.push(`${key}: it maps onto ${t.group}.${t.part}, which is no group part declared in groups`); continue; }
      used.add(`${t.group}.${t.part}`);
      const known = Array.isArray(gp.options) ? gp.options : Object.keys(gp.options ?? {});
      for (const o of t.options) if (!known.includes(o)) out.push(`${key}: its option "${o}" is not an option of ${t.group}.${t.part} (${known.join(', ') || 'none'})`);
      const from = isMemberDecl(to) ? to.inkFrom : undefined;
      if (from !== undefined) {
        const [fg, fp] = from.split('.');
        const source = groups[fg as string]?.parts?.[fp as string];
        if (!source || !source.properties.includes('ink')) out.push(`${key}: inkFrom "${from}" is no group part that paints ink`);
        else used.add(from);
      }
      const extra = (painted?.properties ?? []).filter((p) => !gp.properties.includes(p) && !(p === 'ink' && from !== undefined));
      if (extra.length) out.push(`${key}: it paints ${extra.join(', ')}, which ${t.group}.${t.part} does not paint (${gp.properties.join(', ')})`);
    }
  }
  for (const comp of manifests.keys()) if (!Object.hasOwn(members, comp)) out.push(`members: ${comp} has a manifest and no entry`);
  for (const [key, painted] of coloured) {
    const [comp, part] = key.split('.') as [string, string];
    if (!painted.focusOnly && !Object.hasOwn(members[comp]?.parts ?? {}, part)) out.push(`${key}: a coloured part mapped onto no group part in members`);
  }
  for (const [g, group] of Object.entries(groups)) {
    for (const [part, gp] of Object.entries(group.parts ?? {})) {
      const at = `groups.${g}.parts.${part}`;
      if (used.has(`${g}.${part}`)) {
        if (gp.paintedBy !== undefined) out.push(`${at}: a member part maps onto it, so it carries no paintedBy`);
      } else if (gp.paintedBy === undefined) out.push(`${at}: no member part maps onto it and it names no paintedBy, the file that paints it`);
      else {
        const paths = typeof gp.paintedBy === 'string' ? [gp.paintedBy] : gp.paintedBy;
        if (paths.length === 0) out.push(`${at}: paintedBy names no file`);
        for (const path of paths) if (path === '' || !statSync(join(root, path), { throwIfNoEntry: false })?.isFile()) out.push(`${at}: paintedBy ${path} is no file`);
      }
    }
  }
  return out;
}

export function memberDefaultProblems(c: SlotCatalogue, roles: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const to = targetOf(m.to);
    for (const [name, value] of Object.entries(m.defaults ?? {})) {
      const where = `${key}: its default ${name}`;
      const slot = c.slots[name];
      if (!slot) { out.push(`${where} names no slot`); continue; }
      if (slot.group !== to.group || slot.part !== to.part) out.push(`${where} is a slot of ${slot.group}.${slot.part}, and the member maps onto ${m.to}`);
      if (slot.option !== undefined && !m.options.includes(slot.option)) out.push(`${where} is on option ${slot.option}, which the member does not list (${m.options.join(', ')})`);
      if (!m.states.includes(slot.state)) out.push(`${where} is at state ${slot.state}, which the member does not list`);
      if (slot.state !== 'rest') out.push(`${where} is at ${slot.state}: a member default answers the rest slot, and the states that derive from it read the member's chain (R5)`);
      const ref = REF.exec(value)?.[1];
      if (!(value === 'transparent' ? acceptedRole(c, slot, 'transparent', roles) : ref !== undefined && acceptedRole(c, slot, ref, roles))) {
        out.push(`${where} is ${value}, which is not transparent where ${slot.accepts} accepts it or a role ${slot.accepts} accepts`);
      }
      if (slot.default === value) out.push(`${where} is ${value}, which the group already answers, so the default is no default`);
    }
  }
  return out;
}

export function collect(root = repoRoot): string[] {
  const d = readSlotDeclarations(root);
  const declared = declarationProblems(d);
  if (declared.length) return declared;
  let c: SlotCatalogue;
  try {
    const excepted = exceptionProblems(d);
    if (excepted.length) return excepted;
    c = deriveSlots(d);
  } catch (e) {
    return [`${COLOR_SLOTS}: ${(e as Error).message}`];
  }
  const roles = colourRoleSet(root);
  const manifests = slotManifests(root);
  if (Object.keys(c.slots ?? {}).length === 0) return [`found 0 slots in ${COLOR_SLOTS} -- an empty result set is a failure, not a clean pass`];
  const shape = shapeProblems(c);
  if (shape.length) return shape;
  return [
    ...nameProblems(c), ...acceptsProblems(c, roles), ...defaultProblems(c, roles), ...memberDefaultProblems(c, roles), ...fallbackProblems(c),
    ...pairProblems(c, d), ...manifestProblems(c, manifests), ...ringProblems(c, manifests), ...readProblems(c, manifests), ...memberReadProblems(c, manifests), ...fadeProblems(c, manifests),
    ...familyProblems(c, readJson(join(root, EMPHASIS_FAMILY)) as { variants?: Record<string, string> }),
    ...mapProblems(d, colouredParts(root), manifests, root),
  ];
}

function main() {
  const problems = collect();
  if (problems.length) {
    console.error(`check-color-slots: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-color-slots: ${Object.keys(deriveSlots(readSlotDeclarations()).slots).length} slot(s) are named by their fields, answered by roles their property accepts, and painted by a manifest part`);
}

if (isMainModule(import.meta.url)) main();
