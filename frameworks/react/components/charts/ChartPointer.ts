export function arenaCursorForward(axis: string): string {
  return axis === 'y' ? 'ArrowDown' : 'ArrowRight';
}

export function arenaCursorBackward(axis: string): string {
  return axis === 'y' ? 'ArrowUp' : 'ArrowLeft';
}

export function arenaCursorHandles(key: string, axis: string): boolean {
  if (key === 'Home' || key === 'End' || key === 'Escape') return true;
  return key === arenaCursorForward(axis) || key === arenaCursorBackward(axis);
}

export function arenaCursorStep(current: number | null, key: string, count: number, axis: string): number | null {
  if (count <= 0) return null;
  const last = count - 1;
  if (key === 'Escape') return null;
  if (key === 'Home') return 0;
  if (key === 'End') return last;
  if (key === arenaCursorForward(axis)) return current === null ? 0 : Math.min(last, current + 1);
  if (key === arenaCursorBackward(axis)) return current === null ? last : Math.max(0, current - 1);
  return current;
}

export function arenaPointerUpdates(pointerType: string, phase: string): boolean {
  if (phase === 'down') return true;
  return pointerType !== 'touch';
}

export function arenaPointerClears(pointerType: string): boolean {
  return pointerType !== 'touch';
}

export interface ArenaCell {
  row: number;
  col: number;
}

export function arenaCursorHandles2d(key: string): boolean {
  return key === 'ArrowLeft' || key === 'ArrowRight' || key === 'ArrowUp' || key === 'ArrowDown'
    || key === 'Home' || key === 'End' || key === 'Escape';
}

export function arenaCursorStep2d(current: ArenaCell | null, key: string, rows: number, cols: number): ArenaCell | null {
  if (rows <= 0 || cols <= 0 || key === 'Escape') return null;
  if (!arenaCursorHandles2d(key)) return current;
  if (current === null) return { row: 0, col: key === 'End' ? cols - 1 : 0 };
  const row = Math.max(0, Math.min(current.row, rows - 1));
  const col = Math.max(0, Math.min(current.col, cols - 1));
  if (key === 'Home') return { row, col: 0 };
  if (key === 'End') return { row, col: cols - 1 };
  if (key === 'ArrowRight') return { row, col: Math.min(cols - 1, col + 1) };
  if (key === 'ArrowLeft') return { row, col: Math.max(0, col - 1) };
  if (key === 'ArrowDown') return { row: Math.min(rows - 1, row + 1), col };
  return { row: Math.max(0, row - 1), col };
}
