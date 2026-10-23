import type { ArenaToastNotice } from './Api.generated.ts';
import { dismissDefault, dismissActionable } from './Tokens.generated.js';

export const ARENA_TOAST_DISMISS = { default: dismissDefault, actionable: dismissActionable } as const;

export function arenaToastPersists(notice: ArenaToastNotice): boolean {
  return notice.persist === true || notice.tone === 'danger';
}

export function arenaToastDelay(notice: ArenaToastNotice, dismiss: { default: number; actionable: number }): number | null {
  if (arenaToastPersists(notice)) return null;
  return notice.actionLabel === undefined || notice.actionLabel === '' ? dismiss.default : dismiss.actionable;
}
