import { arenaWarnOnce } from '../../../WarnOnce.ts';

const KEY = /^[A-Za-z0-9_-]+$/;

export function arenaColumnKey(table: string, key: string | undefined): string | null {
  if (key === undefined) return null;
  if (KEY.test(key)) return key;
  arenaWarnOnce(`ArenaTable "${table}": column key "${key}" is not a custom property name. A key is letters, digits, `
    + 'hyphens and underscores, so --arena-column-<key>-width can be written; this column takes the table\'s own layout.');
  return null;
}
