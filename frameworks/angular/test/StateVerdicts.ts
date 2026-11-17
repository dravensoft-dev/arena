/* Verdicts for the three ARIA states the behaviour contracts require and no snapshot decides: states.pressed (button), states.invalid (textbox), states.current (navigation). Each reads a rendered tree, so a suite that declares one has looked at the DOM instead of writing a true. Each layer keeps its own copy of this file beside its own suites, because the layers do not import each other. */

export function commandButtonVerdict(button: Element): boolean {
  return button.getAttribute('aria-pressed') === null;
}

export function toggleButtonVerdict(button: Element, pressed: boolean): boolean {
  return button.getAttribute('aria-pressed') === String(pressed);
}

export function invalidVerdict(invalid: Element[], valid: Element[]): boolean {
  return invalid.length > 0 && valid.length > 0
    && invalid.every((el) => el.getAttribute('aria-invalid') === 'true')
    && valid.every((el) => el.getAttribute('aria-invalid') !== 'true');
}

export function currentVerdict(
  expected: Element | null | undefined, items: Element[], token: 'page' | 'step' = 'page',
): boolean {
  if (!expected) return false;
  return expected.getAttribute('aria-current') === token
    && items.filter((item) => item !== expected).every((item) => item.getAttribute('aria-current') === null);
}

export function itemNamed(scope: Element, selector: string, name: string): Element | undefined {
  return [...scope.querySelectorAll(selector)].find((item) => (item.textContent ?? '').trim() === name);
}
