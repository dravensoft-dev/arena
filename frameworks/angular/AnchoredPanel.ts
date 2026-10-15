export type ArenaPanelAlign = 'start' | 'end' | 'center';

export type ArenaPanelSide = 'below' | 'above';

export type ArenaPanelDismissal = 'escape' | 'outside' | 'tab';

export interface ArenaPanelRect {
  readonly left: number;
  readonly top: number;
  readonly width: number;
  readonly height: number;
}

export interface ArenaPanelSize {
  readonly width: number;
  readonly height: number;
}

export interface ArenaPanelPlacement {
  readonly x: number;
  readonly y: number;
  readonly side: ArenaPanelSide;
}

export interface ArenaPanelRegion<T> {
  contains(other: T): boolean;
}

export function arenaPanelSide(anchor: ArenaPanelRect, panel: ArenaPanelSize, viewport: ArenaPanelSize, offset: number, prefer: ArenaPanelSide): ArenaPanelSide {
  const below = viewport.height - (anchor.top + anchor.height) - offset;
  const above = anchor.top - offset;
  const room = prefer === 'below' ? below : above;
  const other = prefer === 'below' ? above : below;
  if (room >= panel.height || other <= room) return prefer;
  return prefer === 'below' ? 'above' : 'below';
}

export function arenaPlacePanel(anchor: ArenaPanelRect, panel: ArenaPanelSize, viewport: ArenaPanelSize, align: ArenaPanelAlign, offset: number, prefer: ArenaPanelSide = 'below'): ArenaPanelPlacement {
  const side = arenaPanelSide(anchor, panel, viewport, offset, prefer);
  const placed = side === 'below' ? anchor.top + anchor.height + offset : anchor.top - offset - panel.height;
  const y = Math.max(0, Math.min(placed, viewport.height - panel.height));
  let wanted = anchor.left;
  if (align === 'end') wanted = anchor.left + anchor.width - panel.width;
  if (align === 'center') wanted = anchor.left + (anchor.width - panel.width) / 2;
  const x = Math.max(0, Math.min(wanted, viewport.width - panel.width));
  return { x, y, side };
}

export function arenaTopmostPanel<T>(stack: readonly T[]): T | null {
  return stack[stack.length - 1] ?? null;
}

export function arenaPanelsAbove<T>(stack: readonly T[], entry: T): T[] {
  const at = stack.indexOf(entry);
  return at === -1 ? [] : stack.slice(at + 1);
}

export function arenaPressInside<T>(target: T, regions: readonly (ArenaPanelRegion<T> | null | undefined)[]): boolean {
  return regions.some((region) => region != null && region.contains(target));
}

export function arenaOpeningFocus<T>(focusables: readonly T[], panel: T): T {
  return focusables[0] ?? panel;
}

export function arenaTabLeavesPanel<T>(focusables: readonly T[], current: T | null, backward: boolean): boolean {
  if (focusables.length === 0) return true;
  if (current === null || !focusables.includes(current)) return backward;
  const edge = backward ? focusables[0] : focusables[focusables.length - 1];
  return current === edge;
}

export function arenaEscapeInsideModal<M extends object>(target: { closest(selector: string): M | null }, panel: ArenaPanelRegion<M>): boolean {
  const modal = target.closest('[aria-modal="true"]');
  return modal !== null && (modal as object) !== panel && panel.contains(modal);
}
