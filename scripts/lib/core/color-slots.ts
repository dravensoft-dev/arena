/* The colour slot contract: contracts/design/color-slots.json declares families, parts, states and exceptions,
 * and deriveSlots expands them into the catalogue every gate and generator reads, in memory (D29, D30). */

import { join } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { slotStem } from '../../generate/core/arena-cli/slots.ts';
import type { ColorSlot, SlotCatalogue } from '../../generate/core/arena-cli/slots.ts';

export const COLOR_SLOTS = 'contracts/design/color-slots.json';

type Answer = string | { role: string; level?: string };
type StateSpec = string | Record<string, string>;
type Rest = Record<string, Answer>;

export type SlotDeclarations = {
  $description?: string;
  accepts: SlotCatalogue['accepts'];
  refused: string[];
  states: string[];
  stateSets: Record<string, string[]>;
  selected: Record<string, Answer>;
  families: Record<string, {
    channel?: string;
    channels?: Record<string, string>;
    options?: Record<string, { states: StateSpec; parts: Record<string, Rest> }>;
  }>;
  variants: Record<string, { decision?: string; rest: Rest }>;
  components: Record<string, Record<string, {
    family?: string;
    options?: string[];
    states: string | string[];
    variants?: string[];
    edgeChannel?: string;
    own?: Record<string, Record<string, string>>;
    draws?: string;
  }>>;
  exceptions: Record<string, { default: string; decision: string }>;
  rings: Record<string, string>;
};

export const SLOT_KEYS = ['scope', 'family', 'component', 'option', 'part', 'property', 'state', 'channel', 'accepts', 'on', 'default',
  'derive', 'level', 'optional', 'draws'] as const;
const PROPS = ['fill', 'ink', 'edge', 'icon'] as const;
const DISABLED = ['disabled', 'selected-disabled'];
const answer = (v: Answer): [string, string | undefined] => (typeof v === 'object' ? [v.role, v.level] : [v, undefined]);
const restOf = (rest: Rest): Rest => {
  const fixed: Rest = Object.fromEntries(Object.entries(rest).filter(([, v]) => v !== 'ink'));
  if (Object.values(rest).includes('ink')) fixed.icon = 'ink';
  return fixed;
};
const slotName = (owner: string, opt: string, part: string, prop: string, st: string) => [owner, opt, part, prop, st].join('-');

type Standing = { owner: string; opt: string; part: string; rest: Rest; states: (prop: string) => string[];
  channel: (prop: string, st: string) => string | undefined; scope: Partial<ColorSlot> };

export function deriveSlots(d: SlotDeclarations): SlotCatalogue {
  const slots = new Map<string, Record<string, unknown>>();
  const sets = (s: string | string[]): string[] => (typeof s === 'string' ? d.stateSets[s] ?? fail(`state set "${s}" is undeclared`) : s);
  const put = (name: string, f: Record<string, unknown>) => {
    if (slots.has(name)) throw new Error(`slot ${name} is built twice`);
    slots.set(name, Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined && v !== null)));
  };

  function standing({ owner, opt, part, rest, states, channel, scope }: Standing) {
    for (const prop of Object.keys(rest)) {
      for (const st of states(prop)) {
        const n = slotName(owner, opt, part, prop, st);
        const f: Record<string, unknown> = { ...scope, option: opt, part, property: prop, state: st, channel: channel(prop, st), accepts: prop };
        if (prop !== 'fill') f.on = slotName(owner, opt, part, 'fill', st);
        const selectedAnswer = () => d.selected[prop] ?? fail(`${n}: no selected answer for ${prop}`);
        if (prop === 'icon') {
          f.default = `{${slotName(owner, opt, part, 'ink', st)}}`;
          if (st === 'rest' && rest.ink) f.level = answer(rest.ink)[1];
          else if (st === 'selected') f.level = answer(d.selected.ink ?? fail(`${n}: no selected answer for ink`))[1];
        } else if (st === 'rest') [f.default, f.level] = answer(rest[prop] as Answer);
        else if (st === 'selected') [f.default, f.level] = answer(selectedAnswer());
        else if (!DISABLED.includes(st)) {
          const mix = prop === 'fill' && st !== 'hover' ? (st === 'selected-hover' ? 'mix-hover' : 'mix-pressed') : undefined;
          f.derive = { from: slotName(owner, opt, part, prop, st.startsWith('selected') ? 'selected' : 'rest'), ...(mix ? { mix } : {}) };
        }
        if (DISABLED.includes(st)) f.optional = true;
        put(n, f);
      }
    }
  }

  const families: SlotCatalogue['families'] = {};
  for (const [fam, decl] of Object.entries(d.families)) {
    const options = decl.options ?? {};
    const parts: string[] = [];
    for (const [opt, { states: spec, parts: byPart }] of Object.entries(options)) {
      if (spec === undefined) fail(`${fam}-${opt}: no states`);
      for (const [part, rest] of Object.entries(byPart)) {
        if (!parts.includes(part)) parts.push(part);
        standing({
          owner: fam, opt, part, rest: restOf(rest), scope: { scope: 'family', family: fam },
          states: (prop) => sets(typeof spec === 'string' ? spec : (spec[prop] ?? spec['*'] ?? fail(`${fam}-${opt}: no states for ${prop}`))),
          channel: (prop, st) => (decl.channels
            ? decl.channels[`${part}.${prop}`] ?? fail(`${fam}.${part}.${prop}: no channel declared`)
            : (decl.channel ?? '').replace('{property}', prop) + (st === 'rest' ? '' : `-${st}`)),
        });
      }
    }
    families[fam] = { parts };
  }

  const emphasis = (prop: string, st: string, edge?: string) =>
    `--arena-emphasis-${prop === 'edge' ? (edge ?? '--arena-emphasis-edge').replace('--arena-emphasis-', '') : prop}${st === 'rest' ? '' : `-${st}`}`;

  for (const [comp, parts] of Object.entries(d.components)) {
    const owner = slotStem(comp);
    const scope = { scope: 'component', component: comp } as const;
    for (const [part, decl] of Object.entries(parts)) {
      if (decl.draws) continue;
      if (decl.states === undefined) fail(`${comp}.${part}: no states`);
      const sts = sets(decl.states);
      const own = decl.own ?? {};
      for (const opt of decl.options ?? []) {
        for (const prop of PROPS) {
          const ownRow = own[prop];
          if (ownRow) {
            standing({ owner, opt, part, rest: { [prop]: ownRow[opt] ?? fail(`${comp}.${part}: own ${prop} has no answer for ${opt}`) }, states: () => sts,
              channel: (p, s) => emphasis(p, s, decl.edgeChannel), scope });
            continue;
          }
          for (const st of sts) {
            const target = slotName(decl.family ?? '', opt, 'root', prop, st);
            if (!slots.has(target)) throw new Error(`${slotName(owner, opt, part, prop, st)} falls to ${target}, which no family builds`);
            put(slotName(owner, opt, part, prop, st), { ...scope, option: opt, part, property: prop, state: st, channel: emphasis(prop, st, decl.edgeChannel),
              accepts: prop, on: prop === 'fill' ? undefined : slotName(owner, opt, part, 'fill', st), default: `{${target}}`,
              optional: DISABLED.includes(st) ? true : undefined });
          }
        }
      }
      for (const variant of decl.variants ?? []) {
        const rest = { ...(d.variants[variant] ?? fail(`variant "${variant}" is undeclared`)).rest };
        standing({ owner, opt: variant, part, rest: restOf(rest), states: () => sts,
          channel: () => undefined, scope });
      }
    }
  }

  for (const [comp, parts] of Object.entries(d.components)) {
    for (const [part, decl] of Object.entries(parts)) {
      if (!decl.draws) continue;
      const [dc, dp] = decl.draws.split('.');
      if (decl.states === undefined) fail(`${comp}.${part}: no states`);
      const sts = sets(decl.states);
      let built = 0;
      for (const [n, f] of [...slots]) {
        if (f.component !== dc || f.part !== dp || !sts.includes(f.state as string)) continue;
        const own = slotStem(comp);
        put(slotName(own, f.option as string, part, f.property as string, f.state as string), { scope: 'component', component: comp, option: f.option, part,
          property: f.property, state: f.state, channel: f.channel, accepts: f.property,
          on: f.property === 'fill' ? undefined : slotName(own, f.option as string, part, 'fill', f.state as string), default: `{${n}}`, optional: f.optional, draws: decl.draws });
        built++;
      }
      if (built === 0) fail(`${comp}.${part} draws ${decl.draws}, which builds no slot`);
    }
  }

  for (const [n, exc] of Object.entries(d.exceptions)) {
    const f = slots.get(n) ?? fail(`exception ${n} names no slot the rule builds`);
    delete f.derive;
    f.default = exc.default;
  }

  const ordered = (f: Record<string, unknown>) => Object.fromEntries(SLOT_KEYS.filter((k) => f[k] !== undefined).map((k) => [k, f[k]]));
  const sorted = [...slots].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return { accepts: d.accepts, refused: d.refused, states: d.states, families, rings: d.rings,
    slots: Object.fromEntries(sorted.map(([n, f]) => [n, ordered(f) as ColorSlot])) };
}

function fail(message: string): never {
  throw new Error(message);
}

export const readSlotDeclarations = (root = repoRoot): SlotDeclarations => readJson(join(root, COLOR_SLOTS)) as SlotDeclarations;

export const readColorSlots = (root = repoRoot): SlotCatalogue => deriveSlots(readSlotDeclarations(root));
