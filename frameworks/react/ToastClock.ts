import type { ArenaToastTone } from './Api.generated.ts';

export interface ArenaToastNotice {
  title?: string;
  message?: string;
  tone?: ArenaToastTone;
  actionLabel?: string;
  persist?: boolean;
  dismissible?: boolean;
}

export function arenaToastPersists(notice: ArenaToastNotice): boolean {
  return notice.persist === true || notice.tone === 'danger';
}

export function arenaToastDelay(notice: ArenaToastNotice, dismiss: { default: number; actionable: number }): number | null {
  if (arenaToastPersists(notice)) return null;
  return notice.actionLabel === undefined || notice.actionLabel === '' ? dismiss.default : dismiss.actionable;
}
