export type Codec = 'raw' | 'number' | 'flag' | 'json';

export type Control =
  | 'text' | 'number' | 'check' | 'select' | 'lines' | 'json' | 'fields' | 'slotText' | 'slotPresence';

export type BindClass = 'pinned' | 'defaulted' | 'optional';

export type Option = string | number;

export interface KnobField {
  name: string;
  form: string;
  type?: string;
  required: boolean;
  options?: Option[];
  initial: unknown;
}

export interface Knob {
  member: string;
  form: string;
  type: string | null;
  bind: BindClass;
  bound: boolean;
  control: Control;
  codec: Codec;
  options?: Option[];
  fields?: KnobField[];
  itemForm?: 'string' | 'number';
  itemType?: string;
  params?: Record<string, string>;
  returns?: string;
  initial: unknown;
  nodes: unknown;
  doc: string;
}

export interface KnobEvent {
  name: string;
  payload: string | null;
  bind: string | Record<string, unknown> | null;
  doc: string;
}

export interface KnobModel {
  component: string;
  description: string;
  note: string;
  affordances: string[];
  knobs: Knob[];
  events: KnobEvent[];
  host: unknown;
  uses: string[];
  class?: string;
}

export interface PlaygroundState {
  held: Record<string, unknown>;
  bound: Record<string, boolean>;
}

export interface LogEntry {
  id: number;
  name: string;
  payload: string;
}

export const OFF_PARAM = 'off';

export const LOG_LIMIT = 40;

export function encode(knob: Knob, value: unknown): string {
  if (knob.codec === 'json') return JSON.stringify(value ?? null);
  if (knob.codec === 'flag') return value ? '1' : '0';
  return String(value);
}

export function decode(knob: Knob, raw: string): unknown {
  if (knob.codec === 'json') {
    try {
      return JSON.parse(raw);
    } catch {
      return knob.initial;
    }
  }
  if (knob.codec === 'flag') return raw === '1' || raw === 'true';
  if (knob.codec === 'number') {
    const parsed = Number(raw);
    return Number.isFinite(parsed) ? parsed : knob.initial;
  }
  if (knob.options) {
    const found = knob.options.find((option) => String(option) === raw);
    return found === undefined ? knob.initial : found;
  }
  return raw;
}

export function baseState(model: KnobModel): PlaygroundState {
  const held: Record<string, unknown> = {};
  const bound: Record<string, boolean> = {};
  for (const knob of model.knobs) {
    held[knob.member] = knob.initial;
    bound[knob.member] = knob.bound;
  }
  return { held, bound };
}

export function readState(model: KnobModel, search: string): PlaygroundState {
  const state = baseState(model);
  const params = new URLSearchParams(search);
  const off = new Set((params.get(OFF_PARAM) ?? '').split(',').filter((name) => name.length > 0));
  for (const knob of model.knobs) {
    const raw = params.get(knob.member);
    if (raw !== null) {
      state.held[knob.member] = decode(knob, raw);
      state.bound[knob.member] = true;
    }
    if (off.has(knob.member)) state.bound[knob.member] = false;
  }
  return state;
}

export function writeSearch(model: KnobModel, state: PlaygroundState, search: string): string {
  const params = new URLSearchParams(search);
  for (const knob of model.knobs) params.delete(knob.member);
  params.delete(OFF_PARAM);

  const off: string[] = [];
  for (const knob of model.knobs) {
    if (!state.bound[knob.member]) {
      if (knob.bound) off.push(knob.member);
      continue;
    }
    const moved = encode(knob, state.held[knob.member]) !== encode(knob, knob.initial);
    if (moved || !knob.bound) params.set(knob.member, encode(knob, state.held[knob.member]));
  }
  if (off.length > 0) params.set(OFF_PARAM, off.join(','));
  return params.toString();
}

export function boundValues(model: KnobModel, state: PlaygroundState): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const knob of model.knobs) {
    out[knob.member] = state.bound[knob.member] ? state.held[knob.member] : undefined;
  }
  return out;
}

function isDelta(value: unknown): value is { $delta: number } {
  return value !== null && typeof value === 'object' && '$delta' in (value as Record<string, unknown>);
}

export function applyBind(
  state: PlaygroundState,
  bind: string | Record<string, unknown> | null | undefined,
  payload: unknown,
): PlaygroundState {
  if (!bind) return state;
  const held: Record<string, unknown> = { ...state.held };
  const bound: Record<string, boolean> = { ...state.bound };

  if (typeof bind === 'string') {
    const dot = bind.indexOf('.');
    const member = dot === -1 ? bind : bind.slice(0, dot);
    const field = dot === -1 ? null : bind.slice(dot + 1);
    if (field === null) held[member] = payload;
    else held[member] = { ...(held[member] as Record<string, unknown>), [field]: payload };
    bound[member] = true;
    return { held, bound };
  }

  for (const entry of Object.entries(bind)) {
    const member = entry[0];
    const value = entry[1];
    held[member] = isDelta(value) ? Number(held[member] ?? 0) + value.$delta : value;
    bound[member] = true;
  }
  return { held, bound };
}

export function describePayload(payload: unknown): string {
  if (payload === undefined) return '';
  if (typeof payload === 'string') return payload;
  return JSON.stringify(payload);
}

export function nextEntries(entries: LogEntry[], entry: LogEntry): LogEntry[] {
  return [entry, ...entries].slice(0, LOG_LIMIT);
}

export function searchUrl(pathname: string, search: string): string {
  return search.length > 0 ? `${pathname}?${search}` : pathname;
}

export function listToLines(value: unknown): string {
  return Array.isArray(value) ? value.map((item) => String(item)).join('\n') : '';
}

export function linesToList(text: string, itemForm: 'string' | 'number' | undefined): unknown[] {
  const lines = text.split('\n').map((line) => line.trim()).filter((line) => line.length > 0);
  return itemForm === 'number' ? lines.map((line) => Number(line)) : lines;
}

export function optionFor(options: Option[] | undefined, raw: string): Option | string {
  return options?.find((option) => String(option) === raw) ?? raw;
}
