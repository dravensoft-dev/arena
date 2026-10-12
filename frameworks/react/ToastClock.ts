import type { ArenaToastNotice } from './Api.generated.ts';

export function arenaToastPersists(notice: ArenaToastNotice): boolean {
  return notice.persist === true || notice.tone === 'danger';
}

export function arenaToastDelay(notice: ArenaToastNotice, dismiss: { default: number; actionable: number }): number | null {
  if (arenaToastPersists(notice)) return null;
  return notice.actionLabel === undefined || notice.actionLabel === '' ? dismiss.default : dismiss.actionable;
}
