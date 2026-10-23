export interface ArenaComboboxChoice {
  readonly value: string;
  readonly label: string;
}

export type ArenaComboboxStep = 'ArrowDown' | 'ArrowUp';

export type ArenaChipStep = 'ArrowLeft' | 'ArrowRight';

export type ArenaComboboxCommit = 'clear' | 'restore';

export interface ArenaChipWindow {
  readonly shown: readonly string[];
  readonly hidden: number;
}

export function arenaFilterOptions<T extends ArenaComboboxChoice>(options: readonly T[], query: string): T[] {
  const needle = query.toLowerCase();
  return options.filter((option) => option.label.toLowerCase().includes(needle));
}

export function arenaOptionId(uid: string, index: number): string {
  return `${uid}-option-${index}`;
}

export function arenaActiveOptionId(uid: string, active: number, count: number): string | undefined {
  return active >= 0 && active < count ? arenaOptionId(uid, active) : undefined;
}

export function arenaLabelOf(options: readonly ArenaComboboxChoice[], value: string | undefined): string {
  const found = options.find((option) => option.value === value);
  return found ? found.label : '';
}

export function arenaOpeningOption(rows: readonly ArenaComboboxChoice[], chosen: readonly string[]): number {
  if (rows.length === 0) return -1;
  const at = rows.findIndex((row) => chosen.includes(row.value));
  return at === -1 ? 0 : at;
}

export function arenaStepOption(current: number, key: ArenaComboboxStep, count: number): number {
  if (count === 0) return -1;
  if (current < 0 || current >= count) return 0;
  return key === 'ArrowDown' ? Math.min(current + 1, count - 1) : Math.max(current - 1, 0);
}

export function arenaCommitText(text: string, value: string | undefined, required: boolean): ArenaComboboxCommit {
  return text.trim() === '' && !required && (value ?? '') !== '' ? 'clear' : 'restore';
}

export function arenaAtCap(values: readonly string[], max: number | undefined): boolean {
  return max !== undefined && values.length >= max;
}

export function arenaUniqueValues(values: readonly string[]): string[] {
  return [...new Set(values)];
}

export function arenaToggleValue(values: readonly string[], value: string, max: number | undefined): string[] | null {
  if (values.includes(value)) return values.filter((one) => one !== value);
  if (arenaAtCap(values, max)) return null;
  return [...values, value];
}

export function arenaChipWindow(values: readonly string[], maxVisible: number | undefined): ArenaChipWindow {
  if (maxVisible === undefined || maxVisible < 0 || values.length <= maxVisible) return { shown: [...values], hidden: 0 };
  return { shown: values.slice(0, maxVisible), hidden: values.length - maxVisible };
}

export function arenaStepChip(current: number, key: ArenaChipStep, count: number): number {
  if (count === 0) return -1;
  if (key === 'ArrowLeft') return Math.max(current - 1, 0);
  return current + 1 >= count ? -1 : current + 1;
}

export function arenaChipAfterRemoval(removed: number, count: number): number {
  const left = count - 1;
  if (left <= 0) return -1;
  return removed < left ? removed : left - 1;
}
