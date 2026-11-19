/* The colour slot contract: contracts/design/color-slots.json declares the groups, their parts,
 * options, states and rest answers, the members that map their parts onto them, and the exceptions,
 * and deriveSlots expands them into the catalogue every gate and generator reads, in memory (D29, D30). */

import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import type { ColorSlot, MemberPart, OptionAxis, SlotCatalogue, SlotState } from '../../generate/core/arena-cli/slots.ts';

export const COLOR_SLOTS = 'contracts/design/color-slots.json';

type Answer = string | { role: string; level?: string };
type StateSpec = string | string[];
type Rest = Record<string, Answer>;

export type GroupOption = { states?: StateSpec; properties?: string[]; rest: Rest; halo?: string; channel?: string | null; decision?: string };
export type GroupPart = {
  properties: string[];
  options?: string[] | Record<string, GroupOption>;
  states?: StateSpec;
  channel?: string | null;
  rest?: Rest;
  selected?: Rest;
  on?: string;
  over?: string;
  mark?: true;
  selectedOn?: 'rest';
  decision?: string;
  paintedBy?: string | string[];
};
export type MemberDecl = {
  to: string; options: string[]; states: StateSpec; channels?: Record<string, string>; defaults?: Record<string, string>; decision?: string;
  optionBy?: OptionAxis | OptionAxis[]; selectedBy?: { axis: string; value: string };
  disabledBy?: { axis: string; value: string }; hoverBy?: { axis: string; value: string }; onlyBy?: { axis: string; value: string }; hoverIn?: { axis: string; value: string }; fillAs?: 'stroke'; edgeAs?: 'rule' | 'stripe'; disabledModifier?: string; inkFrom?: string; properties?: string[]; inline?: true;
};

export type SlotDeclarations = {
  $description?: string;
  accepts: SlotCatalogue['accepts'];
  refused: string[];
  states: string[];
  stateSets: Record<string, string[]>;
  selected: Record<string, Answer>;
  groups?: Record<string, { parts: Record<string, GroupPart> }>;
  members?: Record<string, { group: string | null; parts: Record<string, string | null | MemberDecl> }>;
  exceptions: Record<string, { default: string; decision: string; level?: string }>;
  rings: Record<string, string>;
};

export const SLOT_KEYS = ['group', 'option', 'part', 'property', 'state', 'channel', 'accepts', 'on', 'pair', 'default', 'derive', 'level', 'optional'] as const;
const DISABLED = ['disabled', 'selected-disabled'];
const answer = (v: Answer): [string, string | undefined] => (typeof v === 'object' ? [v.role, v.level] : [v, undefined]);
const restOf = (rest: Rest): Rest => {
  const fixed: Rest = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== 'ink'));
  if (Object.values(rest).includes('ink')) fixed.icon = 'ink';
  return fixed;
};
const slotName = (group: string, opt: string | undefined, part: string, prop: string, st: string) =>
  [group, ...(opt === undefined ? [] : [opt]), part, prop, st].join('-');

export const isMemberDecl = (to: unknown): to is MemberDecl => typeof to === 'object' && to !== null;

type Standing = {
  group: string; opt: string | undefined; part: string; rest: Rest; selected: Rest; states: string[]; channel: string | null | undefined;
  properties: string[]; on: string | undefined; over: string | undefined; mark: true | undefined; selectedOn: 'rest' | undefined;
  siblingOptions: string[];
};

export function deriveSlots(d: SlotDeclarations): SlotCatalogue {
  const slots = new Map<string, Record<string, unknown>>();
  const sets = (s: StateSpec): string[] => (typeof s === 'string' ? d.stateSets[s] ?? fail(`state set "${s}" is undeclared`) : s);
  const put = (name: string, f: Record<string, unknown>) => {
    if (slots.has(name)) throw new Error(`slot ${name} is built twice`);
    slots.set(name, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== null)));
  };

  function standing({ group, opt, part, rest, selected, states, channel, properties, on, over, mark, selectedOn, siblingOptions }: Standing) {
    const under = on ?? over;
    const siblingOpt = opt !== undefined && siblingOptions.includes(opt) ? opt : undefined;
    for (const prop of Object.keys(rest)) {
      for (const st of states) {
        const n = slotName(group, opt, part, prop, st);
        const f: Record<string, unknown> = {
          group, option: opt, part, property: prop, state: st,
          channel: channel ? channel.replace('{property}', prop) + (st === 'rest' ? '' : `-${st}`) : undefined, accepts: prop,
        };
        const sibling = under === undefined ? undefined : slotName(group, siblingOpt, under, 'fill', st);
        const own = properties.includes('fill') ? slotName(group, opt, part, 'fill', st) : undefined;
        if (over !== undefined) f.on = sibling;
        else if (prop === 'fill' && mark && sibling === undefined) f.on = 'ground';
        else if (prop === 'fill') f.on = selectedOn && ['selected', 'selected-hover', 'selected-pressed'].includes(st) ? slotName(group, opt, part, 'fill', 'rest') : sibling;
        else if (prop === 'edge') f.on = sibling ?? own;
        else f.on = own ?? sibling ?? 'ground';
        f.pair = over !== undefined ? 'own' : mark ? 'mark' : undefined;
        const selectedAnswer = () => selected[prop] ?? d.selected[prop] ?? fail(`${n}: no selected answer for ${prop}`);
        if (prop === 'icon') {
          f.default = `{${slotName(group, opt, part, 'ink', st)}}`;
          if (st === 'rest' && rest.ink) f.level = answer(rest.ink)[1];
          else if (st === 'selected') f.level = answer(selected.ink ?? d.selected.ink ?? fail(`${n}: no selected answer for ink`))[1];
        } else if (st === 'rest') [f.default, f.level] = answer(rest[prop] as Answer);
        else if (st === 'selected') [f.default, f.level] = answer(selectedAnswer());
        else if (!DISABLED.includes(st)) {
          const follows = prop === 'fill' ? st !== 'hover' : prop === 'edge' && st.startsWith('selected-');
          const mix = follows ? (st === 'selected-hover' ? 'mix-hover' : 'mix-pressed') : undefined;
          f.derive = { from: slotName(group, opt, part, prop, st.startsWith('selected') ? 'selected' : 'rest'), ...(mix ? { mix } : {}) };
        }
        if (DISABLED.includes(st)) f.optional = true;
        put(n, f);
      }
    }
  }

  const groups: SlotCatalogue['groups'] = {};
  const halos: Record<string, string> = {};
  for (const [group, decl] of Object.entries(d.groups ?? {})) {
    groups[group] = { parts: Object.keys(decl.parts ?? {}) };
    for (const [part, p] of Object.entries(decl.parts ?? {})) {
      const options = p.options;
      const under = decl.parts[p.on ?? p.over ?? '']?.options;
      const siblingOptions = under === undefined || Array.isArray(under) ? [] : Object.keys(under);
      const placed = { on: p.on, over: p.over, mark: p.mark, selectedOn: p.selectedOn, siblingOptions };
      if (options !== undefined && !Array.isArray(options)) {
        for (const [opt, o] of Object.entries(options)) {
          const owner = [group, opt, part].join('-');
          if (o.rest === undefined) fail(`${owner}: no rest answers`);
          const spec = o.states ?? p.states ?? fail(`${owner}: no states`);
          if (o.halo !== undefined) halos[owner] = o.halo;
          standing({
            group, opt, part, rest: restOf(o.rest), selected: { ...p.selected }, states: sets(spec),
            channel: o.channel !== undefined ? o.channel : p.channel, properties: o.properties ?? p.properties, ...placed,
          });
        }
      } else if (p.rest !== undefined || p.selected !== undefined) {
        const spec = p.states ?? fail(`${group}-${part}: no states`);
        const states = sets(spec);
        if (p.rest === undefined && states.includes('rest')) fail(`${group}-${part}: its states hold rest and it answers no rest`);
        standing({
          group, opt: undefined, part, rest: restOf(p.rest ?? p.selected ?? {}), selected: { ...p.selected }, states, channel: p.channel,
          properties: p.properties, ...placed,
        });
      }
    }
  }

  for (const [n, exc] of Object.entries(d.exceptions)) {
    const f = slots.get(n) ?? fail(`exception ${n} names no slot the rule builds`);
    delete f.derive;
    f.default = exc.default;
    f.level = exc.level;
    const at = n.lastIndexOf('-ink-');
    const icon = at < 0 ? undefined : slots.get(`${n.slice(0, at)}-icon-${n.slice(at + 5)}`);
    if (icon?.default === `{${n}}`) icon.level = exc.level;
  }

  const members: SlotCatalogue['members'] = {};
  for (const [comp, m] of Object.entries(d.members ?? {})) {
    for (const [part, to] of Object.entries(m.parts ?? {})) {
      if (!isMemberDecl(to)) continue;
      const key = `${comp}.${part}`;
      for (const name of Object.keys(to.defaults ?? {})) if (!slots.has(name)) fail(`${key}: its default ${name} names no slot the group builds`);
      const one: MemberPart = { to: to.to, options: to.options, states: sets(to.states ?? fail(`${key}: no states`)) as SlotState[] };
      if (to.channels) one.channels = to.channels;
      if (to.defaults) one.defaults = to.defaults;
      if (to.optionBy) one.optionBy = to.optionBy;
      if (to.selectedBy) one.selectedBy = to.selectedBy;
      if (to.disabledBy) one.disabledBy = to.disabledBy;
      if (to.hoverBy) one.hoverBy = to.hoverBy;
      if (to.onlyBy) one.onlyBy = to.onlyBy;
      if (to.hoverIn) one.hoverIn = to.hoverIn;
      if (to.fillAs) one.fillAs = to.fillAs;
      if (to.edgeAs) one.edgeAs = to.edgeAs;
      if (to.disabledModifier) one.disabledModifier = to.disabledModifier;
      if (to.inkFrom) one.inkFrom = to.inkFrom;
      if (to.properties) one.properties = to.properties as MemberPart['properties'];
      if (to.inline) one.inline = true;
      members[key] = one;
    }
  }

  const ordered = (f: Record<string, unknown>) => Object.fromEntries(SLOT_KEYS.filter((k) => f[k] !== undefined).map((k) => [k, f[k]]));
  const sorted = [...slots].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { accepts: d.accepts, refused: d.refused, states: d.states, groups, members, rings: d.rings,
    ...(Object.keys(halos).length ? { halos } : {}),
    slots: Object.fromEntries(sorted.map(([n, f]) => [n, ordered(f) as ColorSlot])) };
}

function fail(message: string): never {
  throw new Error(message);
}

export const readSlotDeclarations = (root = repoRoot): SlotDeclarations => readJson(join(root, COLOR_SLOTS)) as SlotDeclarations;

export const readColorSlots = (root = repoRoot): SlotCatalogue => deriveSlots(readSlotDeclarations(root));
