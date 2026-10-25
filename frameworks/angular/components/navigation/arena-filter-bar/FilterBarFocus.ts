export type ArenaFilterBarPending = number | 'clear' | null;

export type ArenaFilterBarTarget = { chip: number } | 'content' | null;

export function arenaFilterBarSame(before: readonly string[], after: readonly string[]): boolean {
  return before.length === after.length && before.every((id, index) => id === after[index]);
}

export function arenaFilterBarTarget(pending: ArenaFilterBarPending, before: readonly string[], after: readonly string[]): ArenaFilterBarTarget {
  if (pending === null || arenaFilterBarSame(before, after)) return null;
  if (pending === 'clear' || after.length === 0) return 'content';
  return { chip: Math.min(pending, after.length - 1) };
}

export function arenaFilterBarMayFocus(active: Element | null, bar: Element, controls: Element): boolean {
  if (active === null || !active.isConnected || active === active.ownerDocument.body) return true;
  return bar.contains(active) && !controls.contains(active);
}

export function arenaFirstTabbable(root: Element): HTMLElement | null {
  const candidates = root.querySelectorAll<HTMLElement>('input:not([type="hidden"]), select, textarea, button, a[href], [tabindex]');
  for (const candidate of candidates) {
    if (candidate.hasAttribute('disabled') || candidate.getAttribute('tabindex') === '-1') continue;
    if (candidate.closest('[inert], [hidden]')) continue;
    if (arenaUncheckedRadio(candidate, root)) continue;
    return candidate;
  }
  return null;
}

export function arenaUncheckedRadio(candidate: HTMLElement, root: Element): boolean {
  if (candidate.tagName !== 'INPUT') return false;
  const radio = candidate as HTMLInputElement;
  if (radio.type !== 'radio' || radio.checked) return false;
  return [...root.querySelectorAll<HTMLInputElement>('input[type="radio"]')].some((other) => other.name === radio.name && other.checked);
}
