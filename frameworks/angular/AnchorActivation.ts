export interface ArenaActivationModifiers {
  button: number;
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
}

export function isArenaPrimaryActivation(event: ArenaActivationModifiers): boolean {
  return event.button === 0
    && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey;
}

export const ARENA_INTERACTIVE_DESCENDANT = 'a[href], button, input, select, textarea, label,'
  + ' [role="button"], [role="link"], [role="checkbox"], [role="switch"], [role="menuitem"],'
  + ' [role="tab"], [role="option"], [contenteditable="true"]';

export function isArenaOwnActivation(target: EventTarget | null, container: Element): boolean {
  if (!(target instanceof Element)) return true;
  const control = target.closest(ARENA_INTERACTIVE_DESCENDANT);
  return control === null || control === container || !container.contains(control);
}
