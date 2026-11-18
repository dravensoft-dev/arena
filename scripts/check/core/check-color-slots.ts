/* contracts/design/color-slots.json is the slot tier above the roles: every coloured part of a
 * group of components, per option, property and state, as a question a plugin answers with a role
 * its accepts set names. It carries no value, so check:dtcg leaves it by name and this gate holds its
 * shape: the declarations first (unknown keys, exceptions, member defaults and their decisions),
 * then the derived catalogue: the name each slot must have, the roles each property may be answered
 * with, where a default or a derivation may point, the fill an ink sits on, the member parts that
 * read each slot under its state, the Emphasis family's chains (R7), and the group map. A member default
 * (D21's grant, R5) is one rest slot of the member's part, on an option and state it lists, answered with a
 * role its slot accepts and unlike the group's answer. paintedByPaths names the files the map stats, so a
 * rename or a delete of one reruns the gate. */

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
  SLOT_PROPERTIES, SLOT_STATES, acceptedRole, channelValue, expectedName, glob, memberChain, memberChannel,
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

const TOP_KEYS = ['accepts', 'refused', 'states', 'groups', 'members', 'rings', 'slots'];
const SCOPED = ['scope', 'family', 'component', 'draws'];
const WORD: Record<string, string> = { fill: 'fill', ink: 'ink', icon: 'ink', edge: 'edge' };
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

const mixIsFill = (s: ColorSlot) => s.derive?.mix === undefined || s.property === 'fill';

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

export function pairProblems(c: SlotCatalogue): string[] {
  const out: string[] = [];
  for (const [name, s] of entries(c)) {
    if (s.property === 'fill') { if (s.on !== undefined) out.push(`${name}: a fill carries no "on"`); continue; }
    const fill = expectedName({ ...s, property: 'fill' });
    if (s.on !== fill) out.push(`${name}: it sits on ${s.on ?? 'nothing'} and must sit on ${fill}`);
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
  return entries(c).filter(([, s]) => s.group === group && s.part === part && m.options.includes(s.option ?? '') && m.states.includes(s.state));
};

export function manifestProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const out: string[] = [];
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const manifest = manifests.get(comp);
    if (!manifest) { out.push(`members.${key}: no manifest declares the component ${comp}`); continue; }
    if (!Object.hasOwn(manifest.slots ?? {}, part)) out.push(`members.${key}: ${comp} has no slot ${part}`);
    for (const option of m.options) {
      if (!entries(c).some(([, s]) => `${s.group}.${s.part}` === m.to && s.option === option)) out.push(`members.${key}: ${m.to} derives no ${option} slot`);
      if (!emphasisOptions(manifest).includes(option) && !Object.hasOwn(manifest.variants ?? {}, option)) {
        out.push(`members.${key}: ${comp} answers no emphasis ${option} and declares no variant ${option}`);
      }
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
const VARIANT = /^(?:[a-z][a-z0-9-]*:)+/;

const reads = (token: string, modifier: string, property: string, expected: string[]) => {
  const prefix = VARIANT.exec(token)?.[0] ?? '';
  return prefix === modifier && token.slice(prefix.length).startsWith(UTILITY[property] ?? '?') && expected.some((one) => token.includes(one));
};

export function readProblems(c: SlotCatalogue, manifests: Manifests): string[] {
  const lines = new Map<string, string[]>();
  const read = new Set<string>();
  for (const [key, m] of Object.entries(c.members ?? {})) {
    const [comp, part] = key.split('.') as [string, string];
    const manifest = manifests.get(comp);
    for (const [name, s] of memberSlots(c, m)) {
      read.add(name);
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
  groupPart: ['properties', 'options', 'states', 'channel', 'rest', 'decision', 'paintedBy'],
  option: ['states', 'rest', 'channel', 'decision'],
  member: ['group', 'parts'],
  memberPart: ['to', 'options', 'states', 'channels', 'defaults', 'decision'],
  exception: ['default', 'decision'],
};
const DECISION = /^[DR]\d+$/;

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
  keys(COLOR_SLOTS, d, DECLARED.top);
  for (const [prop, a] of Object.entries(d.selected ?? {})) {
    if (!['fill', 'ink', 'edge'].includes(prop)) out.push(`selected: unknown key "${prop}"`);
    else if (a === 'ink') out.push(`selected.${prop}: the answer "ink" belongs to icon only`);
  }
  for (const [n, e] of Object.entries(d.exceptions ?? {})) keys(`exceptions.${n}`, e, DECLARED.exception);
  for (const [g, group] of Object.entries(d.groups ?? {})) {
    keys(`groups.${g}`, group, DECLARED.group);
    for (const [part, p] of Object.entries(group.parts ?? {})) {
      const where = `groups.${g}.parts.${part}`;
      keys(where, p, DECLARED.groupPart);
      for (const prop of p.properties ?? []) if (!['fill', 'ink', 'edge', 'icon'].includes(prop)) out.push(`${where}: property "${prop}" is outside fill, ink, edge, icon`);
      channel(where, p.channel);
      const options = p.options;
      if (options !== undefined && !Array.isArray(options)) {
        if (p.rest !== undefined) out.push(`${where}: a part with options answers its rest per option, never on the part`);
        for (const [opt, o] of Object.entries(options)) {
          const at = `${where}.options.${opt}`;
          keys(at, o, DECLARED.option);
          channel(at, o.channel);
          if (o.decision !== undefined) decision(at, o.decision, 'a decision');
          if (o.rest === undefined) out.push(`${at}: an option of a part that derives slots declares its rest answers (D45)`);
          else rest(`${at}.rest`, o.rest, p);
          sets(at, o.states ?? p.states);
        }
      } else {
        if (p.states !== undefined || p.rest !== undefined) sets(where, p.states);
        if (p.rest !== undefined) {
          if (options !== undefined) out.push(`${where}: a part that lists its options answers its rest per option`);
          rest(`${where}.rest`, p.rest, p);
        }
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
    else if (slot.default === e.default) out.push(`exceptions.${n}: ${n} already falls to ${e.default}, the rule already gives it, so the exception is no exception`);
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
      const extra = (painted?.properties ?? []).filter((p) => !gp.properties.includes(p));
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
    ...pairProblems(c), ...manifestProblems(c, manifests), ...ringProblems(c, manifests), ...readProblems(c, manifests),
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
