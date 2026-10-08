/* The floors a reader is owed and the shape a moved token takes, stated once and run in two
 * places. Arena runs it over what it ships; a consumer's build runs it over what they wrote, and
 * the two have to agree or one would be held to a weaker rule than the other. It lives inside the
 * command's own directory because that is the only tree a package carries: a module under scripts/
 * is a specifier that resolves here and to nothing beside a consumer's node_modules, so the shared
 * half goes in and the gates import upward, which is what audit.ts and palette-keys.ts already do.
 * Everything here is a function of plain data, reads no file and knows no path, since the
 * repository hands it CSS off disk and the CLI hands it CSS out of a package. scopeOn spells how
 * a scope class crosses a selector, and it is here for the same reason: the generator and the
 * emitter both write that selector, and two spellings of one cascade rule drift. */

export const ARENA_EXT = 'com.dravensoft.arena';

export const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const FS_STEP = /^fs-[a-z0-9]+$/;

export const RHYTHM_STEP = /^rhythm-[a-z]+$/;

export const MIN_PROSE_LEADING = 1.5;

export const MIN_HEADING_LEADING = 1;

export const MIN_PROSE_MEASURE = 45;

export const MAX_PROSE_MEASURE = 90;

export const DANGER_FLOOR = 'hue-danger-fill-strong';

export const RESERVED = new Map<string, string>([
  ['divider', 'ArenaDivider, a rule between two regions (spec 01)'],
  ['kbd', 'ArenaKbd, a key or a key combination (spec 02)'],
  ['fieldset', 'ArenaFieldset, a labelled group of form controls (spec 03)'],
  ['link', 'ArenaLink, an inline link (spec 04)'],
  ['copy-button', 'ArenaCopyButton, a button that copies a value (spec 05)'],
  ['meter', 'ArenaMeter, a value inside a known range (spec 06)'],
  ['accordion', 'ArenaAccordion, a stack of disclosure sections (spec 10)'],
  ['stepper', 'ArenaStepper, the steps of a process and where it stands (spec 11)'],
  ['timeline', 'ArenaTimeline, milestones in order (spec 12)'],
  ['number-field', 'ArenaNumberField, a formatted number input (spec 13)'],
  ['pin-input', 'ArenaPinInput, a code entered one character per cell (spec 14)'],
  ['file-input', 'ArenaFileInput, a file picker with a drop zone (spec 15)'],
  ['slider', 'ArenaSlider, a number chosen inside a range (spec 16)'],
  ['sparkline', 'ArenaSparkline, a small inline trend chart (spec 17)'],
  ['gauge-chart', 'ArenaGaugeChart, one value against banded thresholds (spec 18)'],
  ['filter-bar', 'ArenaFilterBar, the filters applied to a collection (spec 19)'],
  ['funnel-chart', 'ArenaFunnelChart, the stages a count narrows through (spec 20)'],
  ['popover', 'ArenaPopover, an anchored panel (spec 21)'],
  ['combobox', 'ArenaCombobox, a text input that filters a list of options (spec 22)'],
  ['split-button', 'ArenaSplitButton, an action with a menu of alternatives (spec 24)'],
  ['tree-view', 'ArenaTreeView, a hierarchy that expands and collapses (spec 25)'],
  ['heatmap-chart', 'ArenaHeatmapChart, values on a grid of two categories (spec 26)'],
  ['sticky-head', 'the sticky family option that keeps a table head in view (spec 27)'],
  ['sticky-none', 'the sticky family option that lets a table head scroll away (spec 27)'],
]);

export const scopeOn = (className: string) => (selector: string) => (selector === ':root'
  ? className
  : `${className}${selector}, ${className} ${selector}, ${selector} ${className}`);

export type RoleShape = { $type?: string; $extensions?: Record<string, { values?: unknown }> };

export type MovedToken = { $type?: string; $value?: unknown; $description?: string };

export function floorProblems(at: Map<string, string>, scope: string, where: string) {
  const problems = [];
  const leading = Number.parseFloat(at.get('lh-prose') ?? '');
  if (!Number.isFinite(leading))
    problems.push(`${where}: --lh-prose does not resolve to a number in ${scope}, so the reading floor cannot be measured`);
  else if (leading < MIN_PROSE_LEADING)
    problems.push(`${where}: --lh-prose is ${leading} in ${scope}, under the ${MIN_PROSE_LEADING} WCAG 1.4.8 asks of `
      + `line spacing within a paragraph. An answer may open a paragraph up and may never close it below the `
      + `floor every element already inherits from --lh-root.`);

  const heading = Number.parseFloat(at.get('lh-heading') ?? '');
  if (!Number.isFinite(heading))
    problems.push(`${where}: --lh-heading does not resolve to a number in ${scope}, so its floor cannot be measured`);
  else if (heading < MIN_HEADING_LEADING)
    problems.push(`${where}: --lh-heading is ${heading} in ${scope}, under ${MIN_HEADING_LEADING}. A heading `
      + `carries no reading floor, because it is a shape rather than the paragraph 1.4.8 is about, but under `
      + `1 its own lines overlap and a two-line title stops being legible at any size.`);

  const measure = Number.parseFloat(at.get('measure-prose') ?? '');
  if (!Number.isFinite(measure))
    problems.push(`${where}: --measure-prose does not resolve to a number in ${scope}, so the column cannot be measured`);
  else if (measure < MIN_PROSE_MEASURE || measure > MAX_PROSE_MEASURE)
    problems.push(`${where}: --measure-prose is ${measure}ch in ${scope}, outside ${MIN_PROSE_MEASURE} to `
      + `${MAX_PROSE_MEASURE}. Under the floor a line breaks mid-thought and over the ceiling the eye loses `
      + `which line it was on coming back, and both are failures of the same thing a measure exists to hold.`);

  const danger = at.get(DANGER_FLOOR);
  if (danger !== undefined && danger !== 'transparent')
    problems.push(`${where}: --${DANGER_FLOOR} is ${danger} in ${scope}, and danger is outline: its strong `
      + 'fill is transparent in every answer, and the one filled danger surface reads fill-confirm-final');
  return problems;
}

const COLOUR_ALIAS = /^\{color\.[a-z0-9-]+\}$/;

export function valueProblems(where: string, key: string, token: MovedToken, role: RoleShape) {
  if (role.$type === 'color') {
    const value = token?.$value;
    if (typeof value !== 'string')
      return [`${where}: --${key} authors a colour outright. A style plugin assigns a colour and never authors one: `
        + 'the palette is the consumer\'s, and what a style plugin may say is WHICH of them a surface takes.'];
    if (!COLOUR_ALIAS.test(value.trim()))
      return [`${where}: --${key} is ${value}, and a colour role takes a {color.*} alias only. It is mechanical `
        + 'as well as doctrinal: the emitter turns a bare colour alias into a var() it restates under every '
        + 'theme, and anything else resolves to one theme\'s hex and inherits it into the other.'];
    return [];
  }
  if (role.$type === 'keyword') {
    const allowed = role.$extensions?.[ARENA_EXT]?.values;
    if (!Array.isArray(allowed)) return [];
    const value = token?.$value;
    if (typeof value !== 'string' || !allowed.includes(value))
      return [`${where}: --${key} is ${JSON.stringify(value)}, not one of ${allowed.join(', ')}. `
        + 'The closed set is what makes a keyword a type rather than a string, and roles.json is where '
        + 'it is declared: a style plugin re-answers the question and does not widen it.'];
  }
  return [];
}

export function totalityProblems(declared: string[], answered: string[]) {
  const given = new Set(answered);
  return declared.filter((role) => !given.has(role)).map((role) =>
    `the root style plugin does not answer ${role}. A custom property with no value is invalid at `
    + 'computed-value time, so the declaration reading it is dropped and the property disappears: '
    + 'an unanswered role is not a plainer appearance, it is a missing border.');
}

export function reservedProblems(name: string, where: string) {
  const reason = RESERVED.get(name);
  if (reason === undefined) return [];
  return [`${where}: "${name}" is held for ${reason}, which Arena is going to ship as the class .arena-${name}. `
    + 'A build naming it would fail on the release that ships that class, so the name is refused while '
    + 'renaming costs nothing.'];
}

export function nameProblems(
  name: string, polarities: readonly string[], where: string, shipped: readonly string[] = [],
) {
  const problems = [];
  if (polarities.includes(name))
    problems.push(`${where}: "${name}" is a theme polarity, and .arena-${name} is already the class a palette of `
      + `that polarity answers to. A style plugin named after one would be indistinguishable from the `
      + `theme's own scope, both to the cascade and to the consumer CLI reading the catalogue out of `
      + `the shipped CSS.`);
  else if (shipped.includes(name))
    problems.push(`${where}: "${name}" is already a class this package ships, and both would be `
      + `.arena-${name}. A style plugin shares one class namespace with every scope, utility and `
      + 'component Arena draws, so the roles it answers would land on whatever that class already '
      + 'selects.');
  else problems.push(...reservedProblems(name, where));
  if (!KEBAB.test(name))
    problems.push(`${where}: "${name}" is not kebab-case, and the name becomes the class .arena-${name}`);
  return problems;
}

export function keyProblems(where: string, key: string, token: MovedToken, role: RoleShape | undefined) {
  const problems = [];
  const named = FS_STEP.test(key) ? 'an fs step' : RHYTHM_STEP.test(key) ? 'a rhythm step' : null;
  if (named) {
    if (token?.$type !== 'dimension')
      problems.push(`${where}: --${key} is a ${token?.$type}, and ${named} is a dimension`);
    if (!token?.$description)
      problems.push(`${where}: --${key} carries no $description, and a style plugin is a set of decisions rather than a set of values`);
    return problems;
  }
  if (!role) {
    problems.push(`${where}: --${key} is neither a role in contracts/design/roles.json nor an fs or rhythm step. `
      + 'A style plugin re-values those only: a scale, a colour, a density step or a spacing step is shared by '
      + 'every use that wants that value, so moving one is not a style plugin but a different Arena.');
    return problems;
  }
  if (token?.$type !== role.$type)
    problems.push(`${where}: --${key} is a ${token?.$type} here and a ${role.$type} in roles.json, and the two cannot disagree`);
  if (!token?.$description)
    problems.push(`${where}: --${key} carries no $description, and a style plugin is a set of decisions rather than a set of values`);
  problems.push(...valueProblems(where, key, token, role));
  return problems;
}
