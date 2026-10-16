export type ArenaStepState = 'complete' | 'current' | 'upcoming';

export function arenaStepIndex(index: number, count: number): number {
  if (!Number.isFinite(index) || index < 0) return 0;
  return Math.min(Math.floor(index), count);
}

export function arenaStepState(position: number, current: number): ArenaStepState {
  if (position < current) return 'complete';
  return position === current ? 'current' : 'upcoming';
}

export function arenaStepReachable(position: number, current: number, interactive: boolean): boolean {
  return interactive && position < current;
}
