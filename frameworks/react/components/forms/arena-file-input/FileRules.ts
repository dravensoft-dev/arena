import type { ArenaFileRejection, ArenaFileSelection, ArenaLocale } from '../../../Api.generated';
import { arenaPhrase } from '../../../Phrase.ts';
import { arenaWarnOnce } from '../../../WarnOnce.ts';

export interface ArenaFileFacts {
  name: string;
  size: number;
  type: string;
  lastModified: number;
}

export interface ArenaFileRules {
  accept?: string;
  maxSize?: number;
  multiple: boolean;
}

export interface ArenaFileMerge<T extends ArenaFileFacts> extends ArenaFileRejection {
  held: T[];
  changed: boolean;
}

export interface ArenaFileInputIds {
  trigger: string;
  label: string;
  text: string;
}

export function arenaFileInputIds(id: string | undefined, label: string): ArenaFileInputIds {
  const trigger = id || `fi-${label.replace(/\s+/g, '-').toLowerCase()}`;
  return { trigger, label: `${trigger}-label`, text: `${trigger}-text` };
}

export function arenaAcceptTokens(accept: string | undefined): string[] {
  if (!accept) return [];
  return accept.split(',').map((one) => one.trim().toLowerCase()).filter((one) => one.length > 0);
}

export function arenaAccepts(file: ArenaFileFacts, tokens: readonly string[]): boolean {
  if (tokens.length === 0) return true;
  const name = file.name.toLowerCase();
  const type = file.type.toLowerCase();
  return tokens.some((token) => {
    if (token.startsWith('.')) return name.endsWith(token);
    if (token.endsWith('/*')) return type.startsWith(token.slice(0, -1));
    return type === token;
  });
}

export function arenaSameFile(a: ArenaFileFacts, b: ArenaFileFacts): boolean {
  return a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;
}

export function arenaMergeFiles<T extends ArenaFileFacts>(
  held: readonly T[], incoming: readonly T[], rules: ArenaFileRules,
): ArenaFileMerge<T> {
  const tokens = arenaAcceptTokens(rules.accept);
  const accepted: T[] = [];
  const tooLarge: string[] = [];
  const wrongType: string[] = [];
  const surplus: string[] = [];
  for (const file of incoming) {
    if (!arenaAccepts(file, tokens)) wrongType.push(file.name);
    else if (rules.maxSize !== undefined && file.size > rules.maxSize) tooLarge.push(file.name);
    else accepted.push(file);
  }
  if (!rules.multiple) {
    const first = accepted[0];
    for (const extra of accepted.slice(1)) surplus.push(extra.name);
    if (first === undefined) return { held: [...held], changed: false, tooLarge, wrongType, surplus };
    const kept = held[0];
    const same = held.length === 1 && kept !== undefined && arenaSameFile(kept, first);
    return { held: [first], changed: !same, tooLarge, wrongType, surplus };
  }
  const next = [...held];
  for (const file of accepted) {
    if (!next.some((one) => arenaSameFile(one, file))) next.push(file);
  }
  return { held: next, changed: next.length !== held.length, tooLarge, wrongType, surplus };
}

export function arenaFileSelection(held: readonly ArenaFileFacts[]): ArenaFileSelection {
  return {
    names: held.map((file) => file.name),
    sizes: held.map((file) => file.size),
    types: held.map((file) => file.type),
  };
}

export function arenaFileRejection(merge: ArenaFileRejection): ArenaFileRejection | null {
  const { tooLarge, wrongType, surplus } = merge;
  if (tooLarge.length + wrongType.length + surplus.length === 0) return null;
  return { tooLarge: [...tooLarge], wrongType: [...wrongType], surplus: [...surplus] };
}

export function arenaSizeNumber(locale: string, digits: number): Intl.NumberFormat {
  try {
    return new Intl.NumberFormat(locale, { maximumFractionDigits: digits });
  } catch {
    arenaWarnOnce(`file-input: the locale "${locale}" is not a tag Intl accepts, so every file size `
      + 'is written in en until it is a BCP 47 tag.');
    return new Intl.NumberFormat('en', { maximumFractionDigits: digits });
  }
}

export function arenaFileSize(bytes: number, locale: string): string {
  const units = ['B', 'kB', 'MB', 'GB'];
  let value = bytes;
  let step = 0;
  while (step < units.length - 1 && Math.round(value * 10) / 10 >= 1000) {
    value /= 1000;
    step += 1;
  }
  return `${arenaSizeNumber(locale, step === 0 ? 0 : 1).format(value)} ${units[step]}`;
}

export function arenaRejectionLines(
  locale: ArenaLocale, rejection: ArenaFileRejection | null, maxSize: number | undefined,
): string[] {
  if (!rejection) return [];
  const size = maxSize === undefined ? '' : arenaFileSize(maxSize, locale.locale);
  return [
    ...rejection.tooLarge.map((name) => arenaPhrase(locale.fileInputTooLarge, { name, size })),
    ...rejection.wrongType.map((name) => arenaPhrase(locale.fileInputWrongType, { name })),
    ...rejection.surplus.map((name) => arenaPhrase(locale.fileInputSurplus, { name })),
  ];
}

export function arenaFileAnnouncement(locale: ArenaLocale, count: number, lines: readonly string[]): string {
  const head = count === 0 ? locale.fileInputNone : arenaPhrase(locale.fileInputCount, { count });
  return [head, ...lines].join(' ');
}

export function arenaWriteInputFiles(input: HTMLInputElement, files: readonly File[]): void {
  const transfer = new DataTransfer();
  for (const file of files) transfer.items.add(file);
  input.files = transfer.files;
}
