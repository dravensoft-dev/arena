/* The rules of the language, decided over source text rather than over Arena's own tree, so the
 * one statement of each serves both sides of the ship boundary: this module ships inside the
 * packages beside the CLI, and check:arbitrary and check:dimensions read their rule from here
 * rather than holding a second copy that would drift. It depends on nothing but its own siblings,
 * because inside a package scripts/ does not exist. It decides what source text shows and nothing
 * else: filled danger and the render rules are not visible from outside. A line carrying an allow
 * marker is exempt, and a marker over a line with nothing to exempt is stale. Every rule is read
 * in a SCOPE, because an audit that cannot say where a project's appearance lives has given up
 * half of what it reports: a declared style plugin directory may select a part hook and may paint
 * a gradient, and an application source may do neither. */

export const UNMODELLED_UNITS = ['%', 'ch', 'fr', 'vh', 'vw', 'vmin', 'vmax', 'deg'];

export const ALLOW_MARKER = /arena-audit allow\b/;

const CANDIDATE = /(?<![\w-])(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[([^\]\s"']+)\])/g;
const MARKER = /<!--\s*check-arbitrary-values allow:\s*([^>]*?)\s*-->/g;
const HINT = /^(?:length|color|number|percentage|integer|angle|time|url|image|family-name):/;
const TOKEN = /var\(\s*--[a-z0-9-]+\s*\)/g;
const UNMODELLED = new RegExp(`^-?\\d*\\.?\\d+(?:${UNMODELLED_UNITS.join('|')})$`);
const UNIT_LITERAL = /\d*\.?\d+\s*([a-z%]+)\b(?!\()/g;
const ZERO_RUN = /(?<![\w.])-?0(?:px|rem|em|%)?(?![\w.])/g;
const BARE_NUMBER = /(?<![\w.])-?\d*\.?\d+(?![\w.%])/g;
const MATH_OPEN = /\b(?:calc|min|max|clamp)$/;

export function group(match: RegExpMatchArray | RegExpExecArray | null, index = 1): string {
  const value = match?.[index];
  if (value === undefined) {
    throw new Error(match
      ? `audit: group ${index} of "${match[0]}" did not capture, so the pattern lost it`
      : `audit: group ${index} was read off a match that never happened`);
  }
  return value;
}

function insideMathParens(rest: string, index: number) {
  const stack = [];
  for (let i = 0; i < index; i++) {
    if (rest[i] === '(') stack.push(MATH_OPEN.test(rest.slice(0, i)));
    else if (rest[i] === ')') stack.pop();
  }
  return stack.length > 0 && stack[stack.length - 1];
}

export function isLegalBracket(content: string) {
  const value = content.replace(HINT, '').replaceAll('_', ' ');
  if (UNMODELLED.test(value.trim())) return true;
  if (!/[\d#]/.test(value)) return true;
  if (value.includes('#')) return false;
  if (!TOKEN.test(value)) return false;
  TOKEN.lastIndex = 0;

  const rest = value.replace(TOKEN, ' ').replace(ZERO_RUN, ' ');
  for (const m of rest.matchAll(UNIT_LITERAL))
    if (!UNMODELLED_UNITS.includes(group(m))) return false;

  for (const m of rest.matchAll(BARE_NUMBER))
    if (!insideMathParens(rest, m.index)) return false;
  return true;
}

export function scanText(text: string) {
  const out = [];
  for (const m of text.matchAll(CANDIDATE)) {
    const [, cls, content] = m;
    if (content === undefined || isLegalBracket(content)) continue;
    out.push({ cls, content });
  }
  return out;
}

export function findMarkers(text: string) {
  return [...text.matchAll(MARKER)].map((m) => ({
    raw: m[0],
    classes: group(m).trim().split(/\s+/).filter(Boolean),
  }));
}

export function markerAllowlist(text: string) {
  const out = new Set<string>();
  for (const { classes } of findMarkers(text)) for (const cls of classes) out.add(cls);
  return out;
}

export function scanFile(relPath: string, text: string) {
  const isMarkdown = relPath.endsWith('.md');
  const markers = findMarkers(text);
  const errs = [];

  if (markers.length && !isMarkdown)
    errs.push(`${relPath}: check-arbitrary-values marker is only honoured in .md files`);

  const withoutMarkers = markers.length ? text.replace(MARKER, '') : text;
  const candidates = scanText(withoutMarkers);
  const allowed = isMarkdown ? markerAllowlist(text) : new Set<string>();

  for (const { cls } of candidates)
    if (cls !== undefined && !allowed.has(cls)) errs.push(`${relPath}: \`${cls}\` — a raw value, not a token`);

  if (isMarkdown) {
    const flagged = new Set(candidates.map((c) => c.cls));
    for (const cls of allowed)
      if (!flagged.has(cls))
        errs.push(`${relPath}: stale allowance \`${cls}\` — does not appear as a raw value in the file`);
  }

  return errs;
}

export const STYLE_EXTENSIONS = ['.css', '.scss', '.sass', '.less'];

const OWN_RULE = /(^|[\s,{}])\.arena-[a-z0-9-]+/;

const RAW_HEX = /#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3}(?:[0-9a-fA-F]{2})?)?\b/;
const BARE_PIXELS = /(?<![\w.-])-?\d*\.?\d+px\b/;

export const NAMED_COLOURS = [
  'aliceblue', 'antiquewhite', 'aqua', 'aquamarine', 'azure', 'beige', 'bisque', 'black',
  'blanchedalmond', 'blue', 'blueviolet', 'brown', 'burlywood', 'cadetblue', 'chartreuse',
  'chocolate', 'coral', 'cornflowerblue', 'cornsilk', 'crimson', 'cyan', 'darkblue', 'darkcyan',
  'darkgoldenrod', 'darkgray', 'darkgreen', 'darkgrey', 'darkkhaki', 'darkmagenta',
  'darkolivegreen', 'darkorange', 'darkorchid', 'darkred', 'darksalmon', 'darkseagreen',
  'darkslateblue', 'darkslategray', 'darkslategrey', 'darkturquoise', 'darkviolet', 'deeppink',
  'deepskyblue', 'dimgray', 'dimgrey', 'dodgerblue', 'firebrick', 'floralwhite', 'forestgreen',
  'fuchsia', 'gainsboro', 'ghostwhite', 'gold', 'goldenrod', 'gray', 'green', 'greenyellow',
  'grey', 'honeydew', 'hotpink', 'indianred', 'indigo', 'ivory', 'khaki', 'lavender',
  'lavenderblush', 'lawngreen', 'lemonchiffon', 'lightblue', 'lightcoral', 'lightcyan',
  'lightgoldenrodyellow', 'lightgray', 'lightgreen', 'lightgrey', 'lightpink', 'lightsalmon',
  'lightseagreen', 'lightskyblue', 'lightslategray', 'lightslategrey', 'lightsteelblue',
  'lightyellow', 'lime', 'limegreen', 'linen', 'magenta', 'maroon', 'mediumaquamarine',
  'mediumblue', 'mediumorchid', 'mediumpurple', 'mediumseagreen', 'mediumslateblue',
  'mediumspringgreen', 'mediumturquoise', 'mediumvioletred', 'midnightblue', 'mintcream',
  'mistyrose', 'moccasin', 'navajowhite', 'navy', 'oldlace', 'olive', 'olivedrab', 'orange',
  'orangered', 'orchid', 'palegoldenrod', 'palegreen', 'paleturquoise', 'palevioletred',
  'papayawhip', 'peachpuff', 'peru', 'pink', 'plum', 'powderblue', 'purple', 'rebeccapurple',
  'red', 'rosybrown', 'royalblue', 'saddlebrown', 'salmon', 'sandybrown', 'seagreen', 'seashell',
  'sienna', 'silver', 'skyblue', 'slateblue', 'slategray', 'slategrey', 'snow', 'springgreen',
  'steelblue', 'tan', 'teal', 'thistle', 'tomato', 'turquoise', 'violet', 'wheat', 'white',
  'whitesmoke', 'yellow', 'yellowgreen',
];

const NAMED_COLOUR = new RegExp(`(?<![\\w-])(?:${NAMED_COLOURS.join('|')})(?![\\w-])`, 'i');
const COLOUR_CALL = /\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color-mix|color)\s*\(/gi;
const DECLARATION = /:\s*([^;{}]*)/g;
const QUOTED = /"[^"]*"|'[^']*'/g;
const VAR_CALL = /var\(\s*--[a-z0-9-]+\s*(?:,(?:[^()]|\([^()]*\))*)?\)/gi;
const COLOUR_SPACE = /\bin\s+[a-z0-9-]+(?:\s+(?:shorter|longer|increasing|decreasing)\s+hue)?/gi;
const CHANNEL = /\b(?:from|none|transparent|currentcolor|alpha|[rgbhslwac])\b/gi;
const SHARE = /-?\d*\.?\d+%/g;

function callArguments(text: string, from: number) {
  let depth = 0;
  for (let i = from; i < text.length; i++) {
    if (text[i] === '(') depth += 1;
    else if (text[i] === ')') {
      depth -= 1;
      if (depth === 0) return text.slice(from + 1, i);
    }
  }
  return text.slice(from + 1);
}

export function namesAColour(value: string, isStylesheet: boolean) {
  const text = (isStylesheet ? value.replace(QUOTED, ' ') : value)
    .replace(VAR_CALL, ' ')
    .replace(RAW_HEX, ' ');
  if (NAMED_COLOUR.test(text)) return true;

  COLOUR_CALL.lastIndex = 0;
  let call = COLOUR_CALL.exec(text);
  let read = 0;
  while (call) {
    if (call.index >= read) {
      const args = callArguments(text, call.index + call[0].length - 1);
      read = call.index + call[0].length + args.length;
      const left = args
        .replace(COLOUR_SPACE, ' ')
        .replace(CHANNEL, ' ')
        .replace(SHARE, ' ')
        .replace(/[,/()\s]/g, '');
      if (left.length) return true;
    }
    call = COLOUR_CALL.exec(text);
  }
  return false;
}

export function rawColour(line: string, isStylesheet: boolean) {
  DECLARATION.lastIndex = 0;
  for (const declaration of line.matchAll(DECLARATION))
    if (namesAColour(group(declaration), isStylesheet)) return true;
  return false;
}

export const RAW_COLOUR_MESSAGE = 'a raw colour where a token belongs. A channel value and a '
  + 'colour\'s name are both the skin written down: read the colour through its custom property, '
  + 'as var(--crimson), or compose one with color-mix() over var()';
const GRADIENT = /\b(?:linear|radial|conic)-gradient\s*\(/;
const PART_SELECTOR = /\[data-arena-part[~^$*|]?=/;
const INLINE_STYLE = /\bstyle\s*=\s*(["'{])/;

export const PAINTED_PART = /\[data-arena-part\s*=\s*"([^"]+)"\]/g;

export type Scope = 'app' | 'plugin';

export const SEGMENT = /[^/\\]+/g;

const segments = (path: string) => path.match(SEGMENT) ?? [];

export function sourceScope(relPath: string, pluginDirs: string[]): Scope {
  const path = segments(relPath);
  const inside = (dir: string) => {
    const at = segments(dir);
    return at.length > 0 && at.every((part, i) => path[i] === part);
  };
  return pluginDirs.some(inside) ? 'plugin' : 'app';
}

export function paintedParts(css: string) {
  return [...new Set([...css.matchAll(PAINTED_PART)].map((m) => group(m)))].sort();
}

const ICON_ELEMENT = /\bicon(?:Right)?\s*=\s*\{\s*</;

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

const OPEN_TAG = /<([A-Za-z][A-Za-z0-9._-]*)/g;
const ARENA_TAG = /^(?:Arena[A-Za-z0-9]*|arena-[a-z0-9-]+)$/;
const LINK_TAG = /^(?:a|Link|NavLink)$/;
export const OWN_CLASS_ATTRIBUTE = /(?:^|\s)(?:className|class|\[class\]|\[ngClass\]|\[class\.[a-z0-9-]+\])\s*=/;
const ROUTER_ATTRIBUTE = /(?:^|\s)(?:routerLink|\[routerLink\]|to|href)\s*=/;

export const OWN_CLASS_MESSAGE = 'a class of your own on a component Arena draws. Arena renders its '
  + 'own slot names and no contract names them, so a rule of yours reaches one by specificity '
  + 'and breaks in any release. Re-skin through arena.config.json';

export const ROUTER_LINK_MESSAGE = 'an Arena component wrapped in a link of your own, which nests '
  + 'an anchor inside an anchor and in Angular does not bind at all. Pass the href to the '
  + 'component and route from the event it reports';

const BLOCK_COMMENT = /\/\*[\s\S]*?\*\//g;

export function withoutComments(text: string) {
  return text.replace(BLOCK_COMMENT, (span) => span.replace(/[^\n]/g, ' '));
}

export type Finding = { line: number; rule: string; message: string };

function at(line: number, rule: string, message: string): Finding {
  return { line, rule, message };
}

export function tagEnd(text: string, from: number) {
  let depth = 0;
  let quote = '';
  for (let i = from; i < text.length; i++) {
    const c = text[i];
    if (quote) { if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
    if (c === '{') { depth += 1; continue; }
    if (c === '}') { depth -= 1; continue; }
    if (c === '>' && depth <= 0) return i + 1;
  }
  return -1;
}

export function lineAt(text: string, index: number) {
  let line = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text[i] === '\n') line += 1;
  return line;
}

export function ownAttributes(attributes: string) {
  let depth = 0;
  let quote = '';
  let out = '';
  for (const c of attributes) {
    if (quote) { out += depth ? ' ' : c; if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += depth ? ' ' : c; continue; }
    if (c === '{') { depth += 1; out += ' '; continue; }
    if (c === '}') { depth -= 1; out += ' '; continue; }
    out += depth ? ' ' : c;
  }
  return out;
}

export function structuralFindings(text: string): Finding[] {
  const found: Finding[] = [];
  for (const m of text.matchAll(OPEN_TAG)) {
    const name = m[1] ?? '';
    const start = m.index ?? 0;
    const ends = tagEnd(text, start);
    if (ends === -1) continue;
    const attributes = ownAttributes(text.slice(start + name.length + 1, ends - 1));

    if (ARENA_TAG.test(name) && OWN_CLASS_ATTRIBUTE.test(attributes))
      found.push(at(lineAt(text, start), 'own-class', OWN_CLASS_MESSAGE));

    const links = LINK_TAG.test(name) || /(?:^|\s)\[?routerLink\]?\s*=/.test(attributes);
    if (!links || !ROUTER_ATTRIBUTE.test(attributes)) continue;
    const inside = text.slice(ends).replace(/^\s*(?:\{\s*\/\*[\s\S]*?\*\/\s*\}\s*|<!--[\s\S]*?-->\s*)*/, '');
    if (/^<(?:Arena[A-Za-z0-9]*|arena-[a-z0-9-]+)\b/.test(inside))
      found.push(at(lineAt(text, start), 'router-link', ROUTER_LINK_MESSAGE));
  }
  return found;
}

export function lineFindings(line: string, isStylesheet: boolean, scope: Scope = 'app'): Finding[] {
  const found: Finding[] = [];

  if (isStylesheet && OWN_RULE.test(line))
    found.push(at(0, 'own-class', 'a rule targeting an arena- class. That name is compiler output '
      + 'rather than a surface somebody meant you to target, and a slot may be renamed in any release'));

  if (scope === 'app' && PART_SELECTOR.test(line))
    found.push(at(0, 'own-class', 'a rule targeting a data-arena-part hook from outside a style '
      + 'plugin. The hook is where a project\'s appearance is allowed to live, and a rule reaching '
      + 'it from anywhere else is appearance nobody can find; move it into a directory the config '
      + 'declares in stylePlugins'));

  const styled = isStylesheet || INLINE_STYLE.test(line);
  if (styled && RAW_HEX.test(line))
    found.push(at(0, 'raw-value', 'a raw hex where a token belongs. Read the value through its '
      + 'custom property, as var(--crimson)'));
  if (styled && rawColour(line, isStylesheet))
    found.push(at(0, 'raw-value', RAW_COLOUR_MESSAGE));
  if (styled && BARE_PIXELS.test(line))
    found.push(at(0, 'raw-value', 'a bare pixel length. Read it through the spacing scale, as '
      + 'var(--sp-4), or derive it with calc() over one'));
  if (styled && scope === 'app' && GRADIENT.test(line))
    found.push(at(0, 'raw-value', 'a gradient. Depth comes from the base-100 to base-300 surface '
      + 'scale, the hairline border and the warm shadow'));

  if (ICON_ELEMENT.test(line))
    found.push(at(0, 'icon-element', 'an icon passed as an element. An icon is a Phosphor '
      + 'class-name string, as icon="ph-bold ph-plus"'));

  if (EMOJI.test(line))
    found.push(at(0, 'emoji', 'an emoji, which Arena carries in neither product nor copy'));

  return found;
}

export function bracketFindings(text: string, lines: string[]): Finding[] {
  return scanText(text).map(({ cls }) => {
    const where = lines.findIndex((line) => line.includes(cls ?? ''));
    return at(where === -1 ? 1 : where + 1, 'raw-value', `\`${cls}\` is a raw value, not a token`);
  });
}

export function findings(relPath: string, text: string, scope: Scope = 'app'): Finding[] {
  const isStylesheet = STYLE_EXTENSIONS.some((ext) => relPath.endsWith(ext));
  const lines = text.split('\n');
  const perLine = withoutComments(text).split('\n').flatMap((line, index) =>
    lineFindings(line, isStylesheet, scope).map((one) => at(index + 1, one.rule, one.message)));
  return [...perLine, ...structuralFindings(text), ...bracketFindings(text, lines)]
    .sort((a, b) => a.line - b.line);
}

export function auditText(relPath: string, text: string, scope: Scope = 'app'): string[] {
  const lines = text.split('\n');
  const byLine = new Map<number, Finding[]>();
  for (const one of findings(relPath, text, scope)) {
    if (!byLine.has(one.line)) byLine.set(one.line, []);
    (byLine.get(one.line) ?? []).push(one);
  }

  const problems: string[] = [];
  lines.forEach((line, index) => {
    const number = index + 1;
    const found = byLine.get(number) ?? [];
    if (ALLOW_MARKER.test(line)) {
      if (found.length === 0)
        problems.push(`${relPath}:${number}: stale arena-audit allowance, and nothing on the line `
          + 'to exempt');
      return;
    }
    for (const one of found) problems.push(`${relPath}:${number}: ${one.message} (${one.rule})`);
  });

  return problems;
}
