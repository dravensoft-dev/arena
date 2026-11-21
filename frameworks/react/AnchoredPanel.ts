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
}

export interface ArenaPanelPlacement {
  readonly x: number;
  readonly y: number;
  readonly side: ArenaPanelSide;
}

export interface ArenaPanelRegion<T> {
  contains(other: T): boolean;
}

export function arenaViewportBox(view: Window): { top: number; height: number; width: number } {
  const visual = view.visualViewport;
  if (visual) return { top: visual.offsetTop, height: visual.height, width: visual.width };
  return { top: 0, height: view.innerHeight, width: view.document.documentElement.clientWidth };
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

export function arenaPlacePanel(anchor: ArenaPanelRect, panel: ArenaPanelSize, viewport: ArenaPanelViewport, align: ArenaPanelAlign, offset: number, prefer: ArenaPanelSide = 'below'): ArenaPanelPlacement {
  const side = arenaPanelSide(anchor, panel, viewport, offset, prefer);
  const placed = side === 'below' ? anchor.top + anchor.height + offset : anchor.top - offset - panel.height;
  const top = viewport.top ?? 0;
  const y = Math.max(top, Math.min(placed, top + viewport.height - panel.height));
  const alignedAt = (one: ArenaPanelAlign) => one === 'end' ? anchor.left + anchor.width - panel.width
    : one === 'center' ? anchor.left + (anchor.width - panel.width) / 2 : anchor.left;
  const fits = (at: number) => at >= 0 && at + panel.width <= viewport.width;
  const overflow = (at: number) => Math.max(0, -at) + Math.max(0, at + panel.width - viewport.width);
  let wanted = alignedAt(align);
  if (align !== 'center' && !fits(wanted)) {
    const flipped = alignedAt(align === 'end' ? 'start' : 'end');
    if (overflow(flipped) < overflow(wanted)) wanted = flipped;
  }
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
