/* The fixture the colour suites share: colors.css with its order statements and its arena-defaults
 * wrapper removed, which is the unlayered body a layered reader must read the same as the file. */

export const unlayeredColors = (css: string) => css.replace(/@layer\s+[^{};]*;\s*/g, '')
  .replace(/@layer arena-defaults\s*\{([\s\S]*)\}\s*$/, '$1');
