/* Reading a theme block out of the generated palette, and one colour out of that block. They sit
 * in lib rather than in either gate that wants them because check-text-contrast and
 * check-boundary-contrast both ask the same two questions of the same file, and a library must
 * not reach up into a gate to answer them. */

export function paletteBlock(css: string, selector: string, file: string) {
  const m = css.match(new RegExp(`${selector}\\s*\\{([^}]*)\\}`))?.[1];
  if (m === undefined) throw new Error(`${file}: no ${selector} block found`);
  return m;
}

export function readHex(body: string, name: string) {
  const m = body.match(new RegExp(`--${name}\\s*:\\s*(#[0-9a-fA-F]{6})`))?.[1];
  if (!m) throw new Error(`palette.generated.css: --${name} missing or not a #rrggbb literal`);
  return m;
}

export const THEMES = [
  { name: 'dark', selector: ':root' },
  { name: 'light', selector: '\\.arena-light' },
];
