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

export interface ArenaPanelViewport extends ArenaPanelSize {
  readonly top?: number;
  readonly left?: number;
}

export interface ArenaPanelPlacement {
  readonly x: number;
  readonly y: number;
  readonly side: ArenaPanelSide;
  readonly maxHeight: number | null;
}

export type ArenaPanelDirection = 'ltr' | 'rtl';

export interface ArenaPanelRegion<T> {
  contains(other: T): boolean;
}

const PANEL_FLOOR = 44;

export function arenaViewportBox(view: Window): { top: number; left: number; height: number; width: number } {
  const visual = view.visualViewport;
  if (visual) return { top: visual.offsetTop, left: visual.offsetLeft, height: visual.height, width: visual.width };
  return { top: 0, left: 0, height: view.innerHeight, width: view.document.documentElement.clientWidth };
}

export function arenaPanelSide(anchor: ArenaPanelRect, panel: ArenaPanelSize, viewport: ArenaPanelViewport, offset: number, prefer: ArenaPanelSide): ArenaPanelSide {
  const top = viewport.top ?? 0;
  const below = top + viewport.height - (anchor.top + anchor.height) - offset;
  const above = anchor.top - top - offset;
  const room = prefer === 'below' ? below : above;
  const other = prefer === 'below' ? above : below;
  if (room >= panel.height || other <= room) return prefer;
  return prefer === 'below' ? 'above' : 'below';
}

export function arenaPlacePanel(anchor: ArenaPanelRect, panel: ArenaPanelSize, viewport: ArenaPanelViewport, align: ArenaPanelAlign, offset: number, prefer: ArenaPanelSide = 'below', direction: ArenaPanelDirection = 'ltr'): ArenaPanelPlacement {
  const side = arenaPanelSide(anchor, panel, viewport, offset, prefer);
  const top = viewport.top ?? 0;
  const room = side === 'below' ? top + viewport.height - (anchor.top + anchor.height) - offset : anchor.top - top - offset;
  const cap = Math.min(viewport.height, Math.max(room, Math.min(panel.height, PANEL_FLOOR)));
  const maxHeight = cap > 0 && panel.height > cap ? cap : null;
  const height = maxHeight ?? panel.height;
  const placed = side === 'below' ? anchor.top + anchor.height + offset : anchor.top - offset - height;
  const y = Math.max(top, Math.min(placed, top + viewport.height - height));
  const physical: ArenaPanelAlign = direction === 'rtl' && align !== 'center' ? (align === 'end' ? 'start' : 'end') : align;
  const alignedAt = (one: ArenaPanelAlign) => one === 'end' ? anchor.left + anchor.width - panel.width
    : one === 'center' ? anchor.left + (anchor.width - panel.width) / 2 : anchor.left;
  const left = viewport.left ?? 0;
  const fits = (at: number) => at >= left && at + panel.width <= left + viewport.width;
  const overflow = (at: number) => Math.max(0, left - at) + Math.max(0, at + panel.width - left - viewport.width);
  let wanted = alignedAt(physical);
  if (physical !== 'center' && !fits(wanted)) {
    const flipped = alignedAt(physical === 'end' ? 'start' : 'end');
    if (overflow(flipped) < overflow(wanted)) wanted = flipped;
  }
  const x = Math.max(left, Math.min(wanted, left + viewport.width - panel.width));
  return { x, y, side, maxHeight };
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
