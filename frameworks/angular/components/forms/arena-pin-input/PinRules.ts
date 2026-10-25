import type { ArenaPinCharacters } from '../../../Api.generated';

export interface ArenaPinEdit {
  code: string;
  cell: number;
}

export type ArenaPinMove = 'previous' | 'next' | 'first' | 'last';

export function arenaPinLength(length: number | undefined): number {
  return length !== undefined && Number.isInteger(length) && length >= 1 ? length : 6;
}

export function arenaPinAccepts(character: string, characters: ArenaPinCharacters): boolean {
  return characters === 'alphanumeric' ? /^[0-9A-Za-z]$/.test(character) : /^[0-9]$/.test(character);
}

export function arenaPinFilter(text: string, characters: ArenaPinCharacters): string {
  return [...text].filter((character) => arenaPinAccepts(character, characters)).join('');
}

export function arenaPinCode(value: string | undefined, length: number, characters: ArenaPinCharacters): string {
  return arenaPinFilter(value ?? '', characters).slice(0, length);
}

export function arenaPinTabStop(code: string, length: number): number {
  return Math.min(code.length, length - 1);
}

export function arenaPinInputMode(characters: ArenaPinCharacters): 'numeric' | 'text' {
  return characters === 'alphanumeric' ? 'text' : 'numeric';
}

export function arenaPinPattern(characters: ArenaPinCharacters): string | undefined {
  return characters === 'alphanumeric' ? undefined : '[0-9]*';
}

export function arenaPinTyped(held: string, text: string): string {
  if (held.length === 1 && text.length === 2) {
    if (text.startsWith(held)) return text.slice(1);
    if (text.endsWith(held)) return text.slice(0, 1);
  }
  return text;
}

export function arenaPinInsert(code: string, cell: number, text: string, length: number, characters: ArenaPinCharacters): ArenaPinEdit {
  const kept = arenaPinFilter(text, characters);
  if (kept.length === 0) return { code, cell };
  if (kept.length >= length) return { code: kept.slice(0, length), cell: length - 1 };
  const from = Math.min(cell, code.length);
  const next = (code.slice(0, from) + kept + code.slice(from + kept.length)).slice(0, length);
  return { code: next, cell: Math.min(from + kept.length, length - 1) };
}

export function arenaPinBackspace(code: string, cell: number): ArenaPinEdit {
  if (cell < code.length) return { code: code.slice(0, cell) + code.slice(cell + 1), cell };
  const before = Math.min(cell, code.length) - 1;
  if (before < 0) return { code, cell: 0 };
  return { code: code.slice(0, before) + code.slice(before + 1), cell: before };
}

export function arenaPinDelete(code: string, cell: number): ArenaPinEdit {
  if (cell >= code.length) return { code, cell };
  return { code: code.slice(0, cell) + code.slice(cell + 1), cell };
}

export function arenaPinKey(key: string, mirrored: boolean): ArenaPinMove | null {
  if (key === 'ArrowLeft') return mirrored ? 'next' : 'previous';
  if (key === 'ArrowRight') return mirrored ? 'previous' : 'next';
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  return null;
}

export function arenaPinMoveTo(cell: number, move: ArenaPinMove, length: number): number {
  if (move === 'first') return 0;
  if (move === 'last') return length - 1;
  return move === 'next' ? Math.min(cell + 1, length - 1) : Math.max(cell - 1, 0);
}

export function arenaPinCompletes(before: string, after: string, length: number, inserted = 0): boolean {
  return after.length === length && (before.length < length || inserted > 1);
}
