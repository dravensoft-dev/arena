/* What makes a voice a voice, stated once and run in two places. Arena runs it over the catalogue
 * it ships; a consumer's build runs it over the voice they derived in arena.config.json, and the
 * two have to agree or a local voice would be held to a weaker rule than a published one. It lives
 * inside the command's own directory because that is the only tree a package carries: a module
 * under scripts/ is a specifier that resolves here and to nothing beside a consumer's node_modules,
 * so the shared half goes in and the gates import upward, which is what audit.ts and palette-keys.ts
 * already do. Everything here is a function of plain data, reads no file and knows no path, since
 * the repository hands it CSS off disk and the CLI hands it CSS out of a package. */

export const ARENA_EXT = 'com.dravensoft.arena';

export const RESERVED_NAME = 'none';

export const KEBAB = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

export const FS_STEP = /^fs-[a-z0-9]+$/;

export const RHYTHM_STEP = /^rhythm-[a-z]+$/;

export const PAGE_FILL = 'color-base-100';

export const MIN_PROXIMITY_RATIO = 4;

export const MIN_PROSE_LEADING = 1.5;

export const MIN_HEADING_LEADING = 1;

export const MIN_PROSE_MEASURE = 45;

export const MAX_PROSE_MEASURE = 90;

export type RoleShape = { $type?: string; $extensions?: Record<string, { values?: unknown }> };

export type MovedToken = { $type?: string; $value?: unknown; $description?: string };

export function isZeroLength(value: string | undefined) {
  return value !== undefined && /^0(\.0+)?[a-z%]*$/.test(value.trim());
}

export function paintsNothing(shadow: string | undefined) {
  if (shadow === undefined) return true;
  const rgba = shadow.match(/rgba?\(([^)]*)\)/);
  if (!rgba) return false;
  const parts = (rgba[1] ?? '').split(',').map((p) => p.trim());
  return parts.length === 4 && Number(parts[3]) === 0;
}

const REFERENCE = /^var\(\s*--([\w-]+)\s*\)$/;

const pointsAt = (at: Map<string, string>, role: string) =>
  REFERENCE.exec(at.get(role)?.trim() ?? '')?.[1];

export const fillsLikeThePage = (at: Map<string, string>) => {
  const surface = pointsAt(at, 'fill-surface');
  return surface !== undefined && surface === (pointsAt(at, 'fill-page') ?? PAGE_FILL);
};

const px = (value: string | undefined) => Number.parseFloat(value ?? '');

export function proximityRatio(at: Map<string, string>) {
  const near = px(at.get('rhythm-group'));
  const far = px(at.get('rhythm-section'));
  return Number.isFinite(near) && Number.isFinite(far) && near > 0 ? far / near : null;
}

export function floorProblems(at: Map<string, string>, scope: string, where: string) {
  const problems = [];
  const leading = Number.parseFloat(at.get('lh-prose') ?? '');
  if (!Number.isFinite(leading))
    problems.push(`${where}: --lh-prose does not resolve to a number in ${scope}, so the reading floor cannot be measured`);
  else if (leading < MIN_PROSE_LEADING)
    problems.push(`${where}: --lh-prose is ${leading} in ${scope}, under the ${MIN_PROSE_LEADING} WCAG 1.4.8 asks of `
      + `line spacing within a paragraph. A voice may open a paragraph up and may never close it below the `
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
  return problems;
}

export const PRINCIPLES = new Map<string, {
  says: string;
  holds: (at: Map<string, string>) => string | null;
}>([
  ['common-region', {
    says: 'a line drawn around a region says the things inside it are one thing',
    holds: (at) => (isZeroLength(at.get('bw-surface'))
      ? 'it sets --bw-surface to zero, and a voice that groups by drawing the region has to draw it'
      : null),
  }],
  ['figure-ground', {
    says: 'a surface is an object standing off a floor, so depth separates it and no line has to',
    holds: (at) => {
      if (!isZeroLength(at.get('bw-surface')))
        return 'it still draws --bw-surface, so the depth is decoration over the default voice '
          + 'rather than the thing carrying the grouping';
      if (paintsNothing(at.get('shadow-surface-rest')) && fillsLikeThePage(at))
        return 'it removed --bw-surface and then gave the surface neither a depth nor a fill of its '
          + 'own, so a figure is told from its ground by nothing at all';
      return null;
    },
  }],
  ['proximity', {
    says: 'what belongs together is near and what does not is far, and nothing is drawn at all',
    holds: (at) => {
      if (!isZeroLength(at.get('bw-surface')))
        return 'it draws --bw-surface, which is grouping by common region under another name';
      if (!paintsNothing(at.get('shadow-surface-rest')))
        return 'it paints --shadow-surface-rest, which is grouping by figure and ground under another name';
      if (!fillsLikeThePage(at))
        return `it leaves --fill-surface off --${PAGE_FILL}, and a fill is a region drawn however faint `
          + 'it is, so the surface still encloses what a voice said only distance would group';
      const ratio = proximityRatio(at);
      if (ratio === null)
        return 'its rhythm steps do not resolve to lengths this gate can compare, so the one signal it '
          + 'has left cannot be measured';
      if (ratio < MIN_PROXIMITY_RATIO)
        return `--rhythm-section is only ${ratio.toFixed(1)} times --rhythm-group, and distance is the `
          + `only signal left once nothing is drawn: under ${MIN_PROXIMITY_RATIO} it cannot carry both `
          + 'what belongs together and what does not';
      return null;
    },
  }],
  ['similarity', {
    says: 'a group is marked rather than enclosed or lifted, so identical treatment is what says the things are a set',
    holds: (at) => {
      if (!isZeroLength(at.get('bw-surface')))
        return 'it draws --bw-surface, which is grouping by common region under another name';
      if (!paintsNothing(at.get('shadow-surface-rest')))
        return 'it paints --shadow-surface-rest, which is grouping by figure and ground under another name';
      if (fillsLikeThePage(at))
        return 'its --fill-surface is the page own fill, so there is nothing to tell it from the page '
          + 'and the marking a voice said would group is not painted at all, which is proximity';
      return null;
    },
  }],
]);

const COLOUR_ALIAS = /^\{color\.[a-z0-9-]+\}$/;

export function valueProblems(where: string, key: string, token: MovedToken, role: RoleShape) {
  if (role.$type === 'color') {
    const value = token?.$value;
    if (typeof value !== 'string')
      return [`${where}: --${key} authors a colour outright. An extension assigns a colour and never authors one: `
        + 'the 27 values are the consumer\'s, and what a voice may say is WHICH of them a surface takes.'];
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
        + 'it is declared: a voice re-answers the question and does not widen it.'];
  }
  return [];
}

export function nameProblems(name: string, polarities: readonly string[], where = `extension.${name}.json`) {
  const problems = [];
  if (name === RESERVED_NAME)
    problems.push(`${where}: "${RESERVED_NAME}" is how a consumer says it wants no extension, so an extension `
      + 'answering to that name could never be selected');
  if (polarities.includes(name))
    problems.push(`${where}: "${name}" is a theme polarity, and .arena-${name} is already the class a palette of `
      + `that polarity answers to. An extension named after one would be indistinguishable from the `
      + `theme's own scope, both to the cascade and to the consumer CLI reading the catalogue out of `
      + `the shipped CSS.`);
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
      problems.push(`${where}: --${key} carries no $description, and an extension is a set of decisions rather than a set of values`);
    return problems;
  }
  if (!role) {
    problems.push(`${where}: --${key} is neither a role in contracts/design/roles.json nor an fs or rhythm step. `
      + 'An extension re-values those only: a scale, a colour, a density step or a spacing step is shared by '
      + 'every use that wants that value, so moving one is not an extension but a different Arena.');
    return problems;
  }
  if (token?.$type !== role.$type)
    problems.push(`${where}: --${key} is a ${token?.$type} here and a ${role.$type} in roles.json, and the two cannot disagree`);
  if (!token?.$description)
    problems.push(`${where}: --${key} carries no $description, and an extension is a set of decisions rather than a set of values`);
  problems.push(...valueProblems(where, key, token, role));
  return problems;
}
