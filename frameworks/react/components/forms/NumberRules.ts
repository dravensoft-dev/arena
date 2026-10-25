import type { ArenaNumberFormat } from '../../Api.generated';

export interface ArenaNumberSeparators {
  decimal: string;
  group: string;
  minus: string;
  digits: string[];
}

export interface ArenaNumberFieldIds {
  control: string;
  label: string;
  note: string;
}

export interface ArenaSliderBounds {
  min: number;
  max: number;
  step: number;
  last: number;
}

export interface ArenaSliderPair {
  start: number;
  end: number;
}

export type ArenaNumberKey = number | 'home' | 'end';

export function arenaDecimalsOf(value: number | undefined): number {
  if (value === undefined || !Number.isFinite(value)) return 0;
  const [mantissa = '', exponent] = String(Math.abs(value)).split('e');
  const fraction = (mantissa.split('.')[1] ?? '').length;
  const shift = exponent === undefined ? 0 : -Number(exponent);
  return Math.max(0, fraction + shift);
}

export function arenaRoundTo(value: number, decimals: number): number {
  return Number(value.toFixed(Math.min(Math.max(decimals, 0), 20)));
}

export function arenaClampNumber(value: number, min: number | undefined, max: number | undefined): number {
  let out = value;
  if (max !== undefined && Number.isFinite(max) && out > max) out = max;
  if (min !== undefined && Number.isFinite(min) && out < min) out = min;
  return out;
}

export function arenaStepSize(step: number | undefined): number {
  return step !== undefined && Number.isFinite(step) && step > 0 ? step : 1;
}

export function arenaStepNumber(from: number, steps: number, step: number | undefined, min: number | undefined, max: number | undefined): number {
  const size = arenaStepSize(step);
  const decimals = Math.max(arenaDecimalsOf(size), arenaDecimalsOf(min), arenaDecimalsOf(from));
  return arenaClampNumber(arenaRoundTo(from + steps * size, decimals), min, max);
}

export function arenaNumberBaseline(min: number | undefined, max: number | undefined): number {
  return arenaClampNumber(min !== undefined && Number.isFinite(min) ? min : 0, min, max);
}

export function arenaNumberKey(key: string): ArenaNumberKey | null {
  if (key === 'ArrowUp') return 1;
  if (key === 'ArrowDown') return -1;
  if (key === 'PageUp') return 10;
  if (key === 'PageDown') return -10;
  if (key === 'Home') return 'home';
  if (key === 'End') return 'end';
  return null;
}

export function arenaNumberFieldIds(id: string | undefined, label: string): ArenaNumberFieldIds {
  const control = id || `nf-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return { control, label: `${control}-label`, note: `${control}-note` };
}

export function arenaFieldFormat(format: ArenaNumberFormat | undefined, locale: string): ArenaNumberFormat {
  return { ...format, locale: format?.locale ?? locale, compact: false };
}

export function arenaNumberSeparators(locale: string): ArenaNumberSeparators {
  let parts: Intl.NumberFormatPart[];
  let digitParts: Intl.NumberFormatPart[];
  try {
    const format = new Intl.NumberFormat(locale);
    parts = format.formatToParts(-12345.6);
    digitParts = new Intl.NumberFormat(locale, { useGrouping: false }).formatToParts(9876543210);
  } catch {
    return { decimal: '.', group: '', minus: '-', digits: [...'0123456789'] };
  }
  const part = (type: string) => parts.find((one) => one.type === type)?.value;
  const written = Array.from(digitParts.find((one) => one.type === 'integer')?.value ?? '').reverse();
  return {
    decimal: part('decimal') ?? '.',
    group: part('group') ?? '',
    minus: part('minusSign') ?? '-',
    digits: written.length === 10 ? written : [...'0123456789'],
  };
}

export function arenaParseNumber(text: string, separators: ArenaNumberSeparators): number | undefined {
  let plain = Array.from(text.replace(/\s/g, '')).map((one) => {
    const at = separators.digits.indexOf(one);
    return at < 0 ? one : String(at);
  }).join('');
  if (plain === '') return undefined;
  const group = separators.group.replace(/\s/g, '');
  if (group !== '' && group !== separators.decimal) plain = plain.split(group).join('');
  plain = plain.split(separators.minus).join('-').split(String.fromCharCode(0x2212)).join('-').split(separators.decimal).join('.');
  if (!/^-?(\d+\.?\d*|\.\d+)$/.test(plain)) return Number.NaN;
  return Number(plain);
}

export function arenaDraftText(value: number | undefined, separators: ArenaNumberSeparators): string {
  if (value === undefined) return '';
  return String(value).split('.').join(separators.decimal);
}

export function arenaCanonicalNumber(value: number | undefined): string {
  return value === undefined ? '' : String(value);
}

export function arenaSliderBounds(min: number, max: number, step: number): ArenaSliderBounds {
  const wide = Number.isFinite(min) && Number.isFinite(max) && max > min;
  const low = wide ? min : 0;
  const high = wide ? max : 100;
  const size = arenaStepSize(step);
  const last = arenaRoundTo(low + Math.floor(arenaRoundTo((high - low) / size, 9)) * size, Math.max(arenaDecimalsOf(size), arenaDecimalsOf(low)));
  return { min: low, max: high, step: size, last };
}

export function arenaSnapToStep(value: number, bounds: ArenaSliderBounds): number {
  const raw = Number.isFinite(value) ? value : bounds.min;
  const snapped = bounds.min + Math.round(arenaRoundTo((raw - bounds.min) / bounds.step, 9)) * bounds.step;
  const decimals = Math.max(arenaDecimalsOf(bounds.step), arenaDecimalsOf(bounds.min));
  return arenaRoundTo(arenaClampNumber(snapped, bounds.min, bounds.last), decimals);
}

export function arenaSliderPair(start: number, end: number, bounds: ArenaSliderBounds): ArenaSliderPair {
  const last = arenaSnapToStep(end, bounds);
  return { start: Math.min(arenaSnapToStep(start, bounds), last), end: last };
}

export function arenaSliderMove(value: number, steps: number, bounds: ArenaSliderBounds, lower: number, upper: number): number {
  return arenaClampNumber(arenaSnapToStep(value + steps * bounds.step, bounds), lower, upper);
}

export function arenaSliderFraction(value: number, bounds: ArenaSliderBounds): number {
  return arenaClampNumber((value - bounds.min) / (bounds.max - bounds.min), 0, 1);
}

export function arenaFractionAt(position: number, start: number, length: number, reversed: boolean): number {
  const along = length > 0 ? arenaClampNumber((position - start) / length, 0, 1) : 0;
  return reversed ? 1 - along : along;
}

export function arenaValueAtFraction(fraction: number, bounds: ArenaSliderBounds): number {
  return arenaSnapToStep(bounds.min + fraction * (bounds.max - bounds.min), bounds);
}

export function arenaNearestThumb(value: number, pair: ArenaSliderPair): 'start' | 'end' {
  if (value < pair.start) return 'start';
  if (value > pair.end) return 'end';
  return value - pair.start < pair.end - value ? 'start' : 'end';
}

export function arenaSliderKey(key: string, mirrored: boolean): ArenaNumberKey | null {
  if (key === 'ArrowRight') return mirrored ? -1 : 1;
  if (key === 'ArrowLeft') return mirrored ? 1 : -1;
  return arenaNumberKey(key);
}
