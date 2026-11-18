/* The colour slot catalogue: the tier above the roles. A slot is one coloured part of one group
 * of components, per option, property and state, and a plugin answers it with a role its accepts
 * set names. A member default replaces the group default at the end of that member's chain, and a
 * state deriving the same colour from it reads the member's chain (R5). A part with no fill sits
 * on the ground, and a halo is an option's edge-rest chain at the level it names. MeasuredSlots is what a
 * contrast measurement reads. The command ships this file, so it imports nothing outside it. */

export const SLOT_PROPERTIES = ['fill', 'ink', 'edge', 'icon'] as const;
export const SLOT_STATES = ['rest', 'hover', 'pressed', 'selected', 'selected-hover', 'selected-pressed', 'disabled', 'selected-disabled'] as const;

export type SlotProperty = (typeof SLOT_PROPERTIES)[number];
export type SlotState = (typeof SLOT_STATES)[number];

export type ColorSlot = {
  group: string;
  option?: string;
  part: string;
  property: SlotProperty;
  state: SlotState;
  channel?: string;
  accepts: SlotProperty;
  on?: string | 'ground';
  default?: string;
  derive?: { from: string; mix?: 'mix-hover' | 'mix-pressed' };
  level?: string;
  optional?: true;
};

export type MemberPart = {
  to: string;
  options: string[];
  states: SlotState[];
  channels?: Partial<Record<SlotProperty, string>>;
  defaults?: Record<string, string>;
  optionBy?: { axis: string; values: Record<string, string> };
  selectedBy?: { axis: string; value: string };
};

export type SlotCatalogue = {
  accepts: Record<SlotProperty, string[]>;
  refused: string[];
  states: string[];
  groups: Record<string, { parts: string[] }>;
  members: Record<string, MemberPart>;
  rings: Record<string, string>;
  halos?: Record<string, string>;
  slots: Record<string, ColorSlot>;
};

export type MeasuredSlots = Pick<SlotCatalogue, 'rings' | 'slots'> & Partial<Pick<SlotCatalogue, 'members'>>;

export const measuredSlots = (catalogue: SlotCatalogue): MeasuredSlots => ({ rings: catalogue.rings, slots: catalogue.slots, members: catalogue.members });

type Named = Pick<ColorSlot, 'group' | 'option' | 'part'>;

const stemOf = (slot: Named) => [slot.group, ...(slot.option === undefined ? [] : [slot.option]), slot.part].join('-');

export function expectedName(slot: Named & Pick<ColorSlot, 'property' | 'state'>): string {
  return `${stemOf(slot)}-${slot.property}-${slot.state}`;
}

export const glob = (pattern: string) =>
  new RegExp(`^${pattern.split('*').map((p) => p.replace(/[.+?^${}()|[\]\\]/g, '\\$&')).join('.*')}$`);

export function acceptedRole(catalogue: SlotCatalogue, slot: ColorSlot, role: string, colourRoles: ReadonlySet<string>): boolean {
  const patterns = catalogue.accepts[slot.accepts] ?? [];
  if (role === 'transparent') return patterns.includes('transparent');
  if (catalogue.refused.includes(role) || !colourRoles.has(role)) return false;
  return patterns.some((p) => p !== 'transparent' && glob(p).test(role));
}

const SLOT_ANSWER = /^\{([a-z][a-z0-9-]*)\}$/;

export function slotAnswer(value: string, name: string, catalogue: SlotCatalogue, colourRoles: ReadonlySet<string>): boolean {
  const slot = catalogue.slots[name];
  if (!slot || typeof value !== 'string') return false;
  const text = value.trim();
  if (text === 'transparent') return acceptedRole(catalogue, slot, text, colourRoles);
  const role = SLOT_ANSWER.exec(text)?.[1];
  return role !== undefined && acceptedRole(catalogue, slot, role, colourRoles);
}

export function slotProblem(where: string, name: string, value: string, catalogue: SlotCatalogue): string {
  const slot = catalogue.slots[name] as ColorSlot;
  const takes = (catalogue.accepts[slot.accepts] ?? []).map((p) => (p === 'transparent' ? p : `{${p}}`)).join(', ');
  return `${where}: --${name} is ${JSON.stringify(value)}, and a ${slot.accepts} slot takes a role from its accepts set: ${takes}. `
    + 'A slot is answered with a role the set names, or with transparent where the set lists it; a palette alias, '
    + 'a literal, another slot and the focus edge are refused.';
}

export function fadeMarkers(answered: Iterable<string>, catalogue: SlotCatalogue): [string, string][] {
  const markers = new Set<string>();
  for (const name of answered) {
    const slot = catalogue.slots[name];
    if (!slot || (slot.state !== 'disabled' && slot.state !== 'selected-disabled')) continue;
    markers.add(`--${stemOf(slot)}-fade-${slot.state}`);
  }
  return [...markers].map((name) => [name, '1']);
}

export const colourNamesOf = (roles: Record<string, unknown>, key: 'type' | '$type'): Set<string> =>
  new Set(Object.entries(roles).filter(([, role]) => (role as Record<string, unknown> | null)?.[key] === 'color').map(([name]) => name));

const REF = /^\{([a-z][a-z0-9-]*)\}$/;

export function followsInk(catalogue: MeasuredSlots, slot: ColorSlot): boolean {
  const ref = REF.exec((slot.default ?? '').trim())?.[1];
  const target = ref === undefined ? undefined : catalogue.slots[ref];
  return slot.property === 'icon' && slot.level === undefined && target !== undefined && target.property === 'ink' && target.channel !== undefined && target.group === slot.group;
}

type Member = MemberPart | undefined;

export function slotChain(catalogue: SlotCatalogue, name: string): string {
  return chain(catalogue, undefined, name);
}

export function memberChain(catalogue: SlotCatalogue, member: string, name: string): string {
  const m = catalogue.members[member];
  if (!m) throw new Error(`${name}: ${member} is no member part of the catalogue`);
  return chain(catalogue, m, name);
}

export function memberValue(catalogue: SlotCatalogue, member: string, name: string, form: 'tailwind' | 'css'): string {
  return levelled(catalogue, name, memberChain(catalogue, member, name), form);
}

export function haloValue(catalogue: SlotCatalogue, member: string, option: string): string {
  const m = catalogue.members[member];
  if (!m) throw new Error(`${option}: ${member} is no member part of the catalogue`);
  const [group, part] = m.to.split('.');
  const stem = `${group}-${option}-${part}`;
  const level = catalogue.halos?.[stem] ?? (() => { throw new Error(`${member}: ${stem} declares no halo`); })();
  return `color-mix(in_oklab,${memberChain(catalogue, member, `${stem}-edge-rest`)}_var(--${level}),transparent)`;
}

export function memberChannel(m: Member, slot: ColorSlot): string | undefined {
  const own = m?.channels?.[slot.property];
  if (slot.channel === undefined || own === undefined) return slot.channel;
  return own + (slot.state === 'rest' ? '' : `-${slot.state}`);
}

export const restOf = (slot: ColorSlot) => expectedName({ ...slot, state: slot.state === 'selected-disabled' ? 'selected' : 'rest' });

export function touched(catalogue: MeasuredSlots, m: Member, name: string): boolean {
  if (m?.defaults === undefined) return false;
  if (Object.hasOwn(m.defaults, name)) return true;
  const slot = catalogue.slots[name];
  if (!slot) return false;
  if (slot.derive) return slot.derive.mix === undefined && touched(catalogue, m, slot.derive.from);
  return slot.optional === true && slot.default === undefined && touched(catalogue, m, restOf(slot));
}

function chain(catalogue: SlotCatalogue, m: Member, name: string): string {
  return `var(--${name},${fall(catalogue, m, name, catalogue.slots[name] as ColorSlot)})`;
}

function read(catalogue: SlotCatalogue, m: Member, name: string): string {
  if (touched(catalogue, m, name)) return chain(catalogue, m, name);
  const channel = memberChannel(m, catalogue.slots[name] as ColorSlot);
  return channel ? `var(${channel})` : levelled(catalogue, name, chain(catalogue, m, name), 'tailwind');
}

function inkOf(catalogue: SlotCatalogue, m: Member, from: ColorSlot, built: string): string {
  const ink = expectedName({ ...from, property: 'ink' });
  if (!catalogue.slots[ink]) throw new Error(`${built}: ${expectedName(from)} has no ink slot of the same group, option, part and state to mix toward`);
  return read(catalogue, m, ink);
}

function fall(catalogue: SlotCatalogue, m: Member, name: string, slot: ColorSlot): string {
  const own = m?.defaults?.[name];
  if (slot.derive && own === undefined) {
    const base = read(catalogue, m, slot.derive.from);
    const from = catalogue.slots[slot.derive.from] as ColorSlot;
    return slot.derive.mix ? `color-mix(in_oklab,${base},${inkOf(catalogue, m, from, name)}_calc(var(--${slot.derive.mix})*100%))` : base;
  }
  if (slot.optional && slot.default === undefined && own === undefined) return read(catalogue, m, restOf(slot));
  const answer = (own ?? slot.default ?? '').trim();
  if (answer === 'transparent') return 'transparent';
  const ref = REF.exec(answer)?.[1];
  if (ref === undefined) throw new Error(`${name}: default ${JSON.stringify(own ?? slot.default)} is neither transparent nor a {role} or {slot}`);
  const target = catalogue.slots[ref];
  if (!target) return `var(--${ref})`;
  if (followsInk(catalogue, slot)) return read(catalogue, m, ref);
  if (target.group === slot.group) return chain(catalogue, m, ref);
  return read(catalogue, m, ref);
}

function levelled(catalogue: SlotCatalogue, name: string, value: string, form: 'tailwind' | 'css'): string {
  const slot = catalogue.slots[name] as ColorSlot;
  const wrapped = slot.level && !followsInk(catalogue, slot) ? `color-mix(in_oklab,${value}_var(--${slot.level}),transparent)` : value;
  return form === 'tailwind' ? wrapped : wrapped.replaceAll('in_oklab', 'in oklab').replaceAll('_', ' ');
}

export function channelValue(catalogue: SlotCatalogue, name: string, form: 'tailwind' | 'css'): string {
  return levelled(catalogue, name, slotChain(catalogue, name), form);
}
