/* contracts/design/color-slots.json is the slot tier above the roles: every coloured part of a
 * component, per property and state, as a question a plugin answers with a role its accepts set
 * names. It carries no value, so check:dtcg leaves it by name and this gate holds its shape: the
 * name each slot must have, the roles each property may be answered with, where a default or a
 * derivation may point, the family a component slot falls to, the fill an ink sits on, and the
 * manifest part a slot paints. A slot is never asked for totality or kernel equality. */

import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { COLOR_SLOTS, readColorSlots } from '../../lib/core/color-slots.ts';
import { layerManifests } from '../../lib/tailwind/tailwind-compile.ts';
import type { ComponentManifest } from '../../lib/tailwind/manifest-shapes.ts';
import {
  SLOT_PROPERTIES, SLOT_STATES, acceptedRole, channelValue, expectedName, glob,
} from '../../generate/core/arena-cli/slots.ts';
import type { ColorSlot, SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';

export const node = {
  name: 'check:color-slots',
  reads: [COLOR_SLOTS, 'contracts/design/roles.json', 'frameworks/tailwind/vocabulary/arena-accent/Accent.family.json', 'frameworks/tailwind/Hues.json', 'frameworks/tailwind/components/**/*.manifest.json'],
  writes: [],
  feeds: [],
};

type Manifests = ReadonlyMap<string, ComponentManifest>;

const TOP_KEYS = ['$description', 'accepts', 'refused', 'states', 'families', 'rings', 'slots'];
const SLOT_KEYS = ['scope', 'family', 'component', 'option', 'part', 'property', 'state', 'channel', 'accepts', 'on',
  'default', 'derive', 'level', 'optional', 'draws'];
const WORD: Record<string, string> = { fill: 'fill', ink: 'ink', icon: 'ink', edge: 'edge' };
const ACCENT_FAMILY = 'frameworks/tailwind/vocabulary/arena-accent/Accent.family.json';
const HUES_JSON = 'frameworks/tailwind/Hues.json';
const REF = /^\{([a-z0-9-]+)\}$/;
const entries = (c: SlotCatalogue) => Object.entries(c.slots);

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
    for (const key of Object.keys(s)) if (!SLOT_KEYS.includes(key)) out.push(`${name}: unknown key "${key}"`);
    if (s.scope !== 'family' && s.scope !== 'component') out.push(`${name}: scope "${s.scope}" is neither family nor component`);
    if (!(SLOT_PROPERTIES as readonly string[]).includes(s.property)) out.push(`${name}: property "${s.property}" is outside ${SLOT_PROPERTIES.join(', ')}`);
    if (!(SLOT_STATES as readonly string[]).includes(s.state)) out.push(`${name}: state "${s.state}" is outside ${SLOT_STATES.join(', ')}`);
    if (!(SLOT_PROPERTIES as readonly string[]).includes(s.accepts)) out.push(`${name}: accepts "${s.accepts}" names no property`);
    if (s.scope === 'family') {
      const parts = c.families?.[s.family ?? '']?.parts;
      if (!parts) out.push(`${name}: family "${s.family}" is not declared in families`);
      else if (!parts.includes(s.part)) out.push(`${name}: part "${s.part}" is not a part of family ${s.family} (${parts.join(', ')})`);
      if (s.component !== undefined) out.push(`${name}: a family slot names no component`);
    } else if (!s.component || s.family !== undefined) out.push(`${name}: a component slot names a component and no family`);
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

const mixIsFill = (s: ColorSlot) => s.derive?.mix === undefined || s.property === 'fill';

export function defaultProblems(c: SlotCatalogue, roles: ReadonlySet<string>): string[] {
  const out: string[] = [];
  for (const [name, s] of entries(c)) {
    const answered = [s.default !== undefined, s.derive !== undefined].filter(Boolean).length;
    if (s.state === 'rest') {
      if (s.default === undefined || s.derive !== undefined || s.optional === true) out.push(`${name}: a rest slot carries a default and nothing else`);
    } else if (answered > 1 || (answered === 0 && s.optional !== true) || (s.derive !== undefined && s.optional === true)) {
      out.push(`${name}: a ${s.state} slot carries exactly one of a default or a derive, or is optional with neither; only a disabled slot may be optional beside its default`);
    }
    if (s.optional && s.state !== 'disabled') out.push(`${name}: optional is for a disabled slot only`);
    if (!mixIsFill(s)) out.push(`${name}: mix is for a fill only`);
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
      else if (from.scope !== s.scope || from.family !== s.family || from.component !== s.component || from.option !== s.option
        || from.part !== s.part || from.property !== s.property || from.state !== want) {
        out.push(`${name}: derives from ${s.derive.from}, which is not the ${s.option} ${s.part} ${s.property} slot at ${want}`);
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
    if (s.default === undefined) continue;
    const want = (target: string) => { if (s.default !== `{${target}}`) out.push(`${name}: it falls to ${s.default} and must fall to ${target}`); };
    const own = (property: string) => expectedName({ ...s, property: property as ColorSlot['property'], accepts: property as ColorSlot['property'] });
    if (s.property === 'icon' && (s.state === 'rest' || s.state === 'selected') && (s.scope === 'family' || s.option === 'destructive')) {
      want(own('ink'));
      const ink = c.slots[own('ink')];
      if (ink?.level !== s.level) out.push(`${name}: it carries level ${s.level ?? 'none'} and its ink slot carries ${ink?.level ?? 'none'}`);
    } else if (s.scope === 'component' && s.option !== 'destructive') {
      const owner = s.component === 'ArenaCopyButton' ? 'icon-button' : 'emphasis';
      if (s.property === 'edge' && s.component === 'ArenaIconButton') {
        const ref = REF.exec(s.default)?.[1];
        if (ref !== undefined && Object.hasOwn(c.slots, ref)) out.push(`${name}: an IconButton edge falls to the role it paints, and ${s.default} is a slot`);
      } else want([owner, s.option, owner === 'emphasis' ? 'root' : s.part, s.property, s.state].join('-'));
    } else if (s.scope === 'component') {
      const ref = REF.exec(s.default)?.[1];
      if (s.property === 'fill' && s.state === 'hover') {
        if (s.default !== '{fill-hover}') out.push(`${name}: a destructive hover fill falls to {fill-hover}, and this one falls to ${s.default}`);
      } else {
        const target = ref ? c.slots[ref] : undefined;
        if (!(target && target.scope === 'family' && target.family === 'hue' && target.property === s.property && target.state === s.state)) {
          out.push(`${name}: a destructive slot falls to a hue family slot of its property and state, and ${s.default} is not one`);
        }
      }
    } else if (REF.test(s.default) && Object.hasOwn(c.slots, REF.exec(s.default)![1]!)) {
      out.push(`${name}: a family slot falls to a role, and ${s.default} is a slot`);
    }
  }
  return out;
}

export function pairProblems(c: SlotCatalogue): string[] {
  const out: string[] = [];
  for (const [name, s] of entries(c)) {
    if (s.property === 'fill') { if (s.on !== undefined) out.push(`${name}: a fill carries no "on"`); continue; }
    const fill = expectedName({ ...s, property: 'fill', accepts: 'fill' });
    if (s.on === 'reader') {
      if (!(s.scope === 'family' && (s.family === 'accent' || s.family === 'hue'))) out.push(`${name}: "reader" is for an accent or hue family slot, and this one sits on ${fill}`);
    } else if (s.on !== fill) out.push(`${name}: it sits on ${s.on ?? 'nothing'} and must sit on ${fill}`);
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

export function manifestProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  const answered = new Set<string>();
  for (const [name, s] of entries(c)) {
    if (s.scope !== 'component') continue;
    const m = manifests.get(s.component ?? '');
    if (!m) { out.push(`${name}: no manifest declares the component ${s.component}`); continue; }
    answered.add(`${s.component}.${s.part}`);
    if (s.draws !== undefined) {
      const [dc, dp] = s.draws.split('.');
      if (!manifests.get(dc ?? '')?.slots || !Object.hasOwn(manifests.get(dc ?? '')!.slots!, dp ?? '')) out.push(`${name}: draws ${s.draws}, which is no slot of a manifest`);
    } else if (!Object.hasOwn(m.slots ?? {}, s.part)) out.push(`${name}: ${s.component} has no slot ${s.part}`);
    if (!emphasisOptions(m).includes(s.option) && !Object.hasOwn(m.hues ?? {}, s.option)) {
      out.push(`${name}: ${s.component} answers no emphasis ${s.option} and maps no variant ${s.option} through hues`);
    }
  }
  for (const m of manifests.values()) {
    if (emphasisOptions(m).length === 0) continue;
    for (const [part, texts] of Object.entries(classesOf(m))) {
      if (texts.some((t) => t.includes('--arena-emphasis-')) && !answered.has(`${m.component}.${part}`)) {
        out.push(`${m.component}.${part} reads an --arena-emphasis-* channel and declares no colour slot in ${COLOR_SLOTS}`);
      }
    }
  }
  return out;
}

export function ringProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  const focusable = new Set<string>();
  for (const s of Object.values(c.slots)) {
    if (s.scope !== 'component' || s.draws !== undefined) continue;
    const text = manifests.get(s.component ?? '')?.slots?.[s.part as never] as unknown;
    if (typeof text === 'string' && text.includes('focus-visible:outline')) focusable.add(`${s.component}.${s.part}`);
  }
  for (const key of focusable) {
    if (!(key in c.rings)) out.push(`${key} is focusable and carries colour slots, and rings does not say what its focus ring sits on`);
  }
  for (const [key, on] of Object.entries(c.rings)) {
    if (!focusable.has(key)) out.push(`rings names ${key}, which is no focusable part with colour slots`);
    else if (on !== 'ground' && c.slots[on]?.property !== 'fill') out.push(`rings.${key} is ${on}, which is neither ground nor a fill slot`);
  }
  return out;
}

const HUE_KEY: Record<string, string> = {
  '--arena-hue-ink': 'ink', '--arena-hue-edge': 'edge', '--arena-hue-fill-strong': 'fill-strong',
  '--arena-hue-fill-soft': 'fill-soft', '--arena-hue-on-ink': 'on-ink',
};

export function channelProblems(c: SlotCatalogue, families: { variants: Record<string, string> }, hues: { hues: Record<string, Record<string, string>> }): string[] {
  const out: string[] = [];
  const extra = new Set<string>();
  for (const [name, s] of entries(c)) {
    if (s.scope !== 'family' || !s.channel) continue;
    if (s.family === 'accent') {
      const entry = `[${s.channel}:${channelValue(c, name, 'tailwind')}]`;
      const written = families.variants[`arena-accent-${s.option}`] ?? '';
      const times = written.split(`[${s.channel}:`).length - 1;
      if (times !== 1 || !written.includes(entry)) out.push(`${name}: Accent.family.json arena-accent-${s.option} carries ${s.channel} ${times} time(s) and does not carry exactly ${entry}`);
      const own = new Set(entries(c).filter(([, o]) => o.family === 'accent' && o.option === s.option).map(([, o]) => o.channel));
      for (const [, channel] of written.matchAll(/\[(--[a-z0-9-]+):/g)) {
        if (!own.has(channel) && !extra.has(`${s.option}${channel}`)) { extra.add(`${s.option}${channel}`); out.push(`Accent.family.json arena-accent-${s.option} declares ${channel}, which no accent slot of that option reaches`); }
      }
    } else if (s.family === 'hue') {
      const want = channelValue(c, name, 'css');
      const got = hues.hues[s.option]?.[HUE_KEY[s.channel] ?? ''];
      if (got !== want) out.push(`${name}: Hues.json ${s.option}.${HUE_KEY[s.channel]} is ${JSON.stringify(got)}, not ${JSON.stringify(want)}`);
    }
  }
  return out;
}

export function collect(root = repoRoot): string[] {
  const c = readColorSlots(root);
  const roles = colourRoleSet(root);
  const manifests = slotManifests(root);
  if (Object.keys(c.slots ?? {}).length === 0) return [`found 0 slots in ${COLOR_SLOTS} -- an empty result set is a failure, not a clean pass`];
  const shape = shapeProblems(c);
  if (shape.length) return shape;
  return [
    ...nameProblems(c), ...acceptsProblems(c, roles), ...defaultProblems(c, roles), ...fallbackProblems(c),
    ...pairProblems(c), ...manifestProblems(c, manifests), ...ringProblems(c, manifests),
    ...channelProblems(c, readJson(join(root, ACCENT_FAMILY)) as never, readJson(join(root, HUES_JSON)) as never),
  ];
}

function main() {
  const problems = collect();
  if (problems.length) {
    console.error(`check-color-slots: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-color-slots: ${Object.keys(readColorSlots().slots).length} slot(s) are named by their fields, answered by roles their property accepts, and painted by a manifest part`);
}

if (isMainModule(import.meta.url)) main();
