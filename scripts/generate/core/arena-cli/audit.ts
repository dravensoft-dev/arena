/* The rules of the language, decided over source text rather than over Arena's own tree, so the
 * one statement of each serves both sides of the ship boundary: this module ships inside the
 * packages beside the CLI, and check:arbitrary and check:dimensions read their rule from here.
 * It depends on nothing but node and its own siblings, because inside a package scripts/ does
 * not exist. It decides what source text shows and nothing else: the render rules are not
 * visible from outside. A line carrying an allow marker is exempt, and a marker over a line with nothing
 * to exempt is stale. Every rule is read in a SCOPE: a declared plugin directory may select a
 * part hook, and a source may not. A bracket may also carry em, which has no
 * token to name; the dimension gate still reports it, because tracking is expressed in em. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { SYMBOL_REF, WEIGHT_CLASSES, glyphNames, scan } from './icon-css.ts';

export const RULE_TAGS = ['compat-alias', 'dead-utility', 'emoji', 'icon-element', 'missing-level',
  'outline-gap', 'own-class', 'raw-glyph', 'raw-value', 'router-link', 'stale-allowance', 'unknown-input', 'unknown-part', 'unknown-property', 'wrapped-link'] as const;

export const RULE_DESCRIPTIONS: Record<(typeof RULE_TAGS)[number], string> = {
  'compat-alias': 'A stylesheet in a style plugin directory reads one of Arena\'s compatibility aliases through `var()`, which names a step of the ramp instead of a role.',
  'dead-utility': 'A class of your own markup or an `@apply` names a Tailwind utility or variant that emits nothing under Arena\'s theme sheet and emits under Tailwind\'s own theme.',
  emoji: 'A line of a source holds an emoji character.',
  'icon-element': 'An `icon` or `iconRight` attribute is given an element in braces, where Arena takes a Phosphor class-name string.',
  'missing-level': 'A class or a `var()` reads a role whose `combines` names a level without that level, or holds it back by a literal share.',
  'outline-gap': 'A source draws Arena headings at two levels with a level missing between them, such as an h1 and an h3 with no h2.',
  'own-class': 'A component carries a class outside its vocabulary or a computed one, or a stylesheet targets an `arena-` class anywhere or a `data-arena-part` hook outside a style plugin.',
  'raw-glyph': 'An element other than `ArenaIcon` holds a Phosphor glyph class, or binds its class to a non-literal value in a file naming one; Arena ships no icon font.',
  'raw-value': 'A style holds a hex, colour or bare pixel length, or a class holds a non-token bracket value.',
  'router-link': 'A link of your own, such as `a`, `Link` or `routerLink`, directly wraps an Arena card, side nav item, bottom nav item or table cell.',
  'stale-allowance': 'An `arena-audit allow` marker sits on a line with nothing to exempt.',
  'unknown-input': 'A static attribute on an `arena-` element in an Angular template names no input or output of that component.',
  'unknown-part': 'A style plugin rule names a `data-arena-part` no component declares.',
  'unknown-property': 'A style plugin rule reads a `var()` that names no role, token, alias, channel, palette colour or property your sources declare.',
  'wrapped-link': 'A link of your own, such as `a`, `Link` or `routerLink`, directly wraps an Arena link, which is already an anchor.',
};

export const UNMODELLED_UNITS = ['%', 'ch', 'fr', 'vh', 'vw', 'vmin', 'vmax', 'deg'];

const BRACKET_UNITS = [...UNMODELLED_UNITS, 'em'];

export const ALLOW_MARKER = /arena-audit allow\b/;

const CANDIDATE = /(?<![\w-])(-?[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[([^\]\s"']+)\])/g;
const MARKER = /<!--\s*check-arbitrary-values allow:\s*([^>]*?)\s*-->/g;
const HINT = /^(?:length|color|number|percentage|integer|angle|time|url|image|family-name):/;
const TOKEN = /var\(\s*--[a-z0-9-]+\s*\)/g;
const UNMODELLED = new RegExp(`^-?\\d*\\.?\\d+(?:${BRACKET_UNITS.join('|')})$`);
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

const CHANNEL_READ = /var\(\s*--arena-[a-z0-9-]+\s*,/;

function withoutLegalFallbacks(value: string): string | null {
  let out = '';
  let rest = value;
  for (let match = CHANNEL_READ.exec(rest); match !== null; match = CHANNEL_READ.exec(rest)) {
    const from = match.index + match[0].length;
    let depth = 1;
    let at = from;
    for (; at < rest.length && depth > 0; at += 1) {
      if (rest[at] === '(') depth += 1;
      else if (rest[at] === ')') depth -= 1;
    }
    const fallback = rest.slice(from, depth === 0 ? at - 1 : at).trim();
    if (fallback !== '0' && !isLegalBracket(fallback.replaceAll(' ', '_'))) return null;
    out += `${rest.slice(0, match.index)}${match[0].replace(/\s*,$/, '')})`;
    rest = rest.slice(at);
  }
  return out + rest;
}

export function isLegalBracket(content: string) {
  const unhinted = content.replace(HINT, '').replaceAll('_', ' ');
  const value = withoutLegalFallbacks(unhinted);
  if (value === null) return false;
  if (UNMODELLED.test(value.trim())) return true;
  if (!/[\d#]/.test(value)) return true;
  if (value.includes('#')) return false;
  if (!TOKEN.test(value)) return false;
  TOKEN.lastIndex = 0;

  const rest = value.replace(TOKEN, ' ').replace(ZERO_RUN, ' ');
  for (const m of rest.matchAll(UNIT_LITERAL))
    if (!BRACKET_UNITS.includes(group(m))) return false;

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

export const RAW_HEX_MESSAGE = 'a raw hex where a token belongs. Read the value through its '
  + 'custom property, as var(--color-primary)';

export const RAW_COLOUR_MESSAGE = 'a raw colour where a token belongs. A channel value and a '
  + 'colour\'s name are both the skin written down: read the colour through its custom property, '
  + 'as var(--color-primary), or compose one with color-mix() over var()';
export const COMPAT_ALIASES = [
  'level-ink-body', 'level-ink-quiet', 'level-ink-muted', 'level-ink-full', 'level-presence',
  'level-hue-soft-danger', 'level-hue-soft-success', 'level-hue-soft-warning', 'level-hue-soft-info',
  'level-accent-soft-primary', 'level-accent-soft-gold', 'level-media', 'level-scrim',
  'picker-invert', 'ink', 'ink-2', 'panel', 'line-strong', 'bone', 'bone-dim', 'mute',
  'mute-2-disabled', 'status-offline', 'crimson', 'crimson-strong', 'crimson-soft', 'gold',
  'gold-strong', 'gold-soft', 'success', 'success-soft', 'warning', 'warning-soft', 'danger',
  'danger-strong', 'danger-soft', 'danger-fill', 'info', 'info-soft', 'bg', 'bg-raised',
  'surface-card', 'surface-input', 'text-strong', 'text-body', 'text-muted', 'border',
  'border-strong', 'accent', 'accent-press', 'accent-soft', 'focus-ring', 'on-accent', 'scrim',
];

export const COMPAT_ALIAS_MESSAGE = 'a value read through one of Arena\'s own compatibility '
  + 'aliases. The layer maps Arena\'s names onto the palette and ships with the package, so a rule '
  + 'naming one assigns a step of the ramp under another name rather than answering a role: answer '
  + 'the role in plugin.tokens.json with one of your palette colours, and compose the shade you '
  + 'want with color-mix() over var(--color-*) where no palette entry holds it';

export function namesAnAlias(line: string) {
  return COMPAT_ALIASES.some((alias) => new RegExp(`var\\(\\s*--${alias}\\s*[,)]`).test(line));
}

const PART_SELECTOR = /\[data-arena-part[~^$*|]?=/;
const INLINE_STYLE = /\bstyle\s*=\s*(["'{])/;
const STYLE_ANNOTATION = /:\s*(?:React\.)?CSSProperties\b/;
const BINDING = /^\s*(?:export\s+)?(?:const|let|var)\s+([A-Za-z_$][\w$]*)/;
const IDENTIFIER = /[A-Za-z_$][\w$]*/g;

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

const WEIGHT_WORDS = Object.values(WEIGHT_CLASSES).map((token) => token.replace(/^ph-?/, '')).filter(Boolean).join('|');
const WEIGHT_TOKEN = /(?<![\w-])ph(?:-(?:thin|light|bold|fill|duotone))?(?![\w-])/;
const GLYPH_TOKEN = new RegExp(`(?<![\\w-])ph-(?!(?:${WEIGHT_WORDS})(?![\\w-]))[a-z0-9]+(?:-[a-z0-9]+)*`);
const RAW_GLYPH_MESSAGE = 'an element drawn with a Phosphor class, which paints nothing because Arena ships no icon '
  + 'font. Draw it through ArenaIcon (arena-icon in Angular), as icon="ph-bold ph-plus"';
export const RAW_GLYPH_BOUND_MESSAGE = 'an element whose class is bound to a value, in a file that names a Phosphor glyph, so it may hold '
  + 'a Phosphor class, which paints nothing because Arena ships no icon font. Draw it through ArenaIcon (arena-icon in Angular), '
  + 'handing it the value as icon';
const ICON_ELEMENT = /\bicon(?:Right)?\s*=\s*\{\s*</;

const EMOJI = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;

const OPEN_TAG = /<([A-Za-z][A-Za-z0-9._-]*)/g;
const ARENA_TAG = /^(?:Arena[A-Za-z0-9]*|arena-[a-z0-9-]+)$/;
const LINK_TAG = /^(?:a|Link|NavLink)$/;
export const OWN_CLASS_ATTRIBUTE = /(?:^|\s)(?:className|class|\[class\]|\[ngClass\]|\[class\.[a-z0-9-]+\])\s*=/;
const ROUTER_ATTRIBUTE = /(?:^|\s)(?:routerLink|\[routerLink\]|to|href)\s*=/;

export const OWN_CLASS_MESSAGE = 'a class of your own on a component Arena draws, or one the source computes. Only a '
  + 'class of Arena\'s vocabulary goes on a component, written as a literal so it can be read; a slot name is '
  + 'compiler output no contract names, and a rule of yours reaching one breaks in any release';

export type VocabularyIndex = {
  page: string;
  classes: Record<string, { family: string; reach: 'context' | 'box'; target?: 'component' | 'markup' }>;
  answers: Record<string, string[]>;
  options: Record<string, string[]>;
  axes?: Record<string, string[]>;
  inputs?: Record<string, string[]>;
  parts?: Record<string, Record<string, string[]>>;
};

export const VOCABULARY_INDEX = 'arena.vocabulary.json';

export function loadVocabulary(root: string): VocabularyIndex | null {
  try {
    const index = JSON.parse(readFileSync(join(root, VOCABULARY_INDEX), 'utf8'));
    return index && index.classes && index.answers ? index : null;
  } catch {
    return null;
  }
}

const STATIC_CLASS = /(?:^|\s)(?:className|class)\s*=\s*(["'])([^"']*)\1/;
const CLASS_TOGGLE = /(?:^|\s)\[class\.([a-z0-9-]+)\]\s*=/g;
const COMPUTED_CLASS = /(?:^|\s)(?:className\s*=\s*\{|\[class\]\s*=|\[ngClass\]\s*=)/;

export const componentOf = (tag: string) => (tag.startsWith('Arena') ? tag
  : tag.split('-').map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join(''));

const STYLE_BINDING = /(?:^|\s)\[style\.(--[\w-]+)\]\s*=/g;

export function styleValueOf(raw: string): string {
  const bound = [...raw.matchAll(STYLE_BINDING)].map((m) => group(m)).join(' ');
  const opening = /(?:^|\s)\[?style\]?\s*=\s*/.exec(raw);
  if (opening === null) return bound;
  return `${attributeValueAt(raw, opening.index + opening[0].length)} ${bound}`;
}

function attributeValueAt(raw: string, from: number): string {
  const first = raw[from] ?? '';
  if (first === '"' || first === "'" || first === '`') {
    const close = raw.indexOf(first, from + 1);
    return raw.slice(from, close === -1 ? raw.length : close + 1);
  }
  if (first !== '{') return raw.slice(from).split(/\s/)[0] ?? '';
  let depth = 0;
  let quote = '';
  for (let i = from; i < raw.length; i += 1) {
    const c = raw[i];
    if (quote) {
      if (c === '\\') i += 1;
      else if (c === quote) quote = '';
      continue;
    }
    if (c === '"' || c === "'" || c === '`') quote = c;
    if (c === '{') depth += 1;
    if (c === '}') depth -= 1;
    if (depth === 0) return raw.slice(from, i + 1);
  }
  return raw.slice(from);
}

export function ownClassFindings(tag: string, attributes: string, vocabulary: VocabularyIndex | null, raw = attributes): string[] {
  if (!OWN_CLASS_ATTRIBUTE.test(attributes)) return [];
  if (vocabulary === null || COMPUTED_CLASS.test(attributes)) return [OWN_CLASS_MESSAGE];
  const component = componentOf(tag);
  const tokens = [
    ...(STATIC_CLASS.exec(attributes)?.[2] ?? '').split(/\s+/).filter(Boolean),
    ...[...attributes.matchAll(CLASS_TOGGLE)].map((m) => group(m)),
  ];
  const found: string[] = [];
  const byFamily = new Map<string, string[]>();
  for (const token of tokens) {
    const entry = vocabulary.classes[token];
    if (!entry) {
      found.push(`"${token}" is not a class of Arena's vocabulary, and a component takes no other. `
        + `Every family and the components answering it: ${vocabulary.page}`);
      continue;
    }
    if (entry.target === 'markup' && entry.reach === 'box') {
      found.push(`${token} goes on an element you wrote and never on a component: ${component}'s own element may carry `
        + `no box, so the class would land on nothing. Put a <div> of yours around it. ${vocabulary.page}`);
      continue;
    }
    byFamily.set(entry.family, [...(byFamily.get(entry.family) ?? []), token]);
    if (entry.reach === 'box' && !(vocabulary.answers[component] ?? []).includes(entry.family)) {
      found.push(`${token} decides ${entry.family}, and ${component} does not answer ${entry.family}, so the `
        + `class reaches nothing in its box. ${vocabulary.page}`);
    } else if (entry.reach === 'box') {
      const answered = (vocabulary.options[component] ?? []).filter((option) => vocabulary.classes[option]?.family === entry.family);
      if (answered.length > 0 && !answered.includes(token)) {
        const prefix = (answered[0] ?? '').slice(0, (answered[0] ?? '').lastIndexOf('-') + 1);
        const named = answered.map((option, at) => (at > 0 && option.startsWith(prefix) ? option.slice(prefix.length - 1) : option));
        const list = named.length > 1 ? `${named.slice(0, -1).join(', ')} and ${named.at(-1)}` : named.join('');
        found.push(`\`${token}\` is an option ${component} does not answer: it answers ${list}. ${vocabulary.page}`);
      }
    }
  }
  for (const [family, written] of byFamily) {
    if (written.length > 1) {
      found.push(`${written.join(' and ')} are two options of ${family} on one component, and which one `
        + 'holds would be decided by the order the sheet happens to list them in. Keep one');
    }
    const style = styleValueOf(raw);
    for (const axis of vocabulary.axes?.[family] ?? []) {
      if (!new RegExp(`(?<![\\w-])${axis}(?![\\w-])`).test(style)) continue;
      for (const token of written)
        found.push(`\`${token}\` and \`${axis}\` on one ${component} decide one axis twice; the class wins on this `
          + 'component. Keep one.');
    }
  }
  return found;
}

export const ROUTER_LINK_MESSAGE = 'an Arena component wrapped in a link of your own, which nests '
  + 'an anchor inside an anchor and in Angular does not bind at all. Pass the href to the '
  + 'component and route from the event it reports';

export const WRAPPED_LINK_MESSAGE = 'an ArenaLink wrapped in a link of your own, which nests an anchor inside '
  + 'an anchor, and in Angular the outer link swallows the click. ArenaLink is already the anchor: pass the href to '
  + 'it and route from its navigate event';

export const UNKNOWN_INPUT_MESSAGE = (name: string, tag: string) => `an attribute ${name} that ${tag} takes as no input `
  + 'or output, so no Arena component reads it. Write the class or input the component reads instead, or mark the '
  + 'line arena-audit allow when a directive of your own reads it';

const TEMPLATE_TAG = /^arena-[a-z0-9-]+$/;
const BARE_ATTRIBUTE_NAME = /(?:^|\s)([^\s=/]+)/g;
const SYNTAX_ATTRIBUTE = /^(?:[[(*#@]|aria-|data-|i18n|(?:bind|bindon|on|let)-|on[a-z]|ng[A-Z]|router[A-Z])/;
const GLOBAL_ATTRIBUTES = new Set(['class', 'style', 'id', 'title', 'role', 'tabindex', 'hidden', 'lang', 'dir', 'slot',
  'part', 'ngNonBindable', 'inert', 'autofocus', 'draggable', 'spellcheck', 'translate', 'popover']);
const ANGULAR_FORM_ATTRIBUTES = new Set(['formGroupName', 'formArrayName']);
const NG_MODEL_NAME = /^\[?\(?ngModel\)?\]?$/;

export function unknownInputs(tag: string, attributes: string, vocabulary: VocabularyIndex | null): string[] {
  const taken = vocabulary?.inputs?.[tag];
  if (!TEMPLATE_TAG.test(tag) || taken === undefined) return [];
  const names = [...attributes.replace(/"[^"]*"|'[^']*'/g, '').matchAll(BARE_ATTRIBUTE_NAME)].map((m) => group(m));
  const named = names.some((name) => NG_MODEL_NAME.test(name));
  return [...new Set(names)].filter((name) => !SYNTAX_ATTRIBUTE.test(name) && !GLOBAL_ATTRIBUTES.has(name) && !ANGULAR_FORM_ATTRIBUTES.has(name)
    && !(named && name === 'name') && !taken.includes(name));
}

export const HEADING_RUNGS: Record<string, number> = {
  'arena-hero': 1,
  'arena-page-head': 1,
  'arena-section': 2,
  'arena-unauth-card': 2,
  'arena-accordion': 3,
  'arena-board-column': 3,
  'arena-card': 3,
  'arena-empty-state': 3,
  'arena-error-state': 3,
};

export const HEADING_LEVEL_ATTRIBUTE = /(?:^|\s)\[?headingLevel\]?\s*=/;

export const STATED_HEADING_LEVEL = /(?:^|\s)\[?headingLevel\]?\s*=\s*["']\{?\s*'?(h[1-6]|none)'?\s*\}?["']/;

export function statedRung(attributes: string) {
  const stated = STATED_HEADING_LEVEL.exec(attributes)?.[1];
  if (stated === undefined) return undefined;
  return stated === 'none' ? null : Number(stated.slice(1));
}

const CLASS_VALUE = /(?<=^|\s)(?:className|class|\[class\]|\[ngClass\]|\[attr\.class\])\s*=\s*/g;
const TAG_LEAD = /[\w$.]/;

export function elementEnd(text: string, name: string, ends: number) {
  let depth = 1;
  const tags = new RegExp(`<(/?)${name.replace(/[.]/g, '\\.')}(?![\\w.-])(?:[^>]*[^/>])?>`, 'g');
  for (const m of text.slice(ends).matchAll(tags)) {
    depth += m[1] ? -1 : 1;
    if (depth === 0) return ends + (m.index ?? 0);
  }
  return text.length;
}

function ownAttributeStarts(raw: string, pattern = CLASS_VALUE) {
  return [...ownAttributes(raw).matchAll(pattern)].map((m) => {
    let from = (m.index ?? 0) + m[0].trimEnd().length;
    while (/\s/.test(raw[from] ?? '')) from += 1;
    return { name: m[0], from };
  });
}

export function classValues(raw: string) {
  return ownAttributeStarts(raw).map(({ from }) => attributeValueAt(raw, from)).join(' ');
}

function closeOf(text: string, from: number): number {
  const quote = text[from];
  for (let i = from + 1; i < text.length; i += 1) {
    const c = text[i];
    if (c === '\\') i += 1;
    else if (c === quote) return i;
    else if (quote === '`' && c === '$' && text[i + 1] === '{') {
      let depth = 0;
      for (i += 1; i < text.length; i += 1) {
        const e = text[i];
        if (e === '"' || e === "'" || e === '`') i = closeOf(text, i);
        else if (e === '{') depth += 1;
        else if (e === '}') { depth -= 1; if (depth === 0) break; }
      }
    }
  }
  return text.length;
}

function topLevel(text: string): number[] {
  const at: number[] = [];
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i] ?? '';
    if (c === '"' || c === "'" || c === '`') i = closeOf(text, i);
    else if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) depth -= 1;
    else if (depth === 0) at.push(i);
  }
  return at;
}

function wrapsWhole(text: string): boolean {
  let depth = 0;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i] ?? '';
    if (c === '"' || c === "'" || c === '`') i = closeOf(text, i);
    else if ('([{'.includes(c)) depth += 1;
    else if (')]}'.includes(c)) { depth -= 1; if (depth === 0) return i === text.length - 1; }
  }
  return false;
}

function splitAt(text: string, marks: number[], width: number): string[] {
  const parts: string[] = [];
  let from = 0;
  for (const mark of marks) {
    parts.push(text.slice(from, mark));
    from = mark + width;
  }
  return [...parts, text.slice(from)];
}

function joined(parts: (string[] | null)[]): string[] | null {
  return parts.some((part) => part === null) ? null : parts.flat() as string[];
}

export function valueResults(expression: string, keys = false): string[] | null {
  const bare = expression.trim();
  const first = bare[0] ?? '';
  const body = first === '{' && !keys ? bare.slice(1, -1)
    : (first === '"' || first === "'") && closeOf(bare, 0) === bare.length - 1 ? bare.slice(1, -1) : bare;
  return readResults(body, keys);
}

export function resultTerms(source: string): string[] | null {
  let text = source.trim();
  while (text.startsWith('(') && wrapsWhole(text)) text = text.slice(1, -1).trim();
  const marks = topLevel(text);
  const lone = (i: number) => text[i + 1] !== '?' && text[i - 1] !== '?' && text[i + 1] !== '.';
  const ask = marks.find((i) => text[i] === '?' && lone(i));
  if (ask !== undefined) {
    let nested = 0;
    const colon = marks.find((i) => {
      if (i < ask) return false;
      if (text[i] === '?' && i > ask && lone(i)) nested += 1;
      else if (text[i] === ':') { if (nested === 0) return true; nested -= 1; }
      return false;
    });
    if (colon === undefined) return null;
    return joined([resultTerms(text.slice(ask + 1, colon)), resultTerms(text.slice(colon + 1))]);
  }
  const either = marks.filter((i) => (text[i] === '|' && text[i + 1] === '|') || (text[i] === '?' && text[i + 1] === '?'));
  if (either.length) return joined(splitAt(text, either, 2).map(resultTerms));
  const both = marks.filter((i) => text[i] === '&' && text[i + 1] === '&' && text[i - 1] !== '&');
  if (both.length) return resultTerms(splitAt(text, both, 2).at(-1) ?? '');
  return [text];
}

function readResults(source: string, keys: boolean): string[] | null {
  const terms = resultTerms(source);
  return terms && joined(terms.map((term) => readTerm(term, keys)));
}

export const emptyTerm = (term: string) => readTerm(term, false)?.length === 0;

function readTerm(text: string, keys: boolean): string[] | null {
  if (['', 'undefined', 'null', 'false'].includes(text)) return [];
  const opener = text[0] ?? '';
  if ((opener === '"' || opener === "'" || opener === '`') && closeOf(text, 0) === text.length - 1) {
    const inner = text.slice(1, -1);
    if (opener === '`' && inner.includes('${')) return null;
    return inner.trim() === '' ? [] : [inner];
  }
  if (keys && text.startsWith('{') && wrapsWhole(text)) {
    const inner = text.slice(1, -1);
    const names = splitAt(inner, topLevel(inner).filter((i) => inner[i] === ','), 1)
      .map((entry) => entry.trim()).filter(Boolean).map((entry) => {
        if (entry.startsWith('...') || entry.startsWith('[')) return null;
        if (/^["'`]/.test(entry)) return entry.slice(1, closeOf(entry, 0));
        return entry.split(':')[0]?.trim() ?? '';
      });
    return joined(names.map((name) => (name === null ? null : name === '' ? [] : [name])));
  }
  return null;
}

function boundClass(raw: string): boolean {
  return ownAttributeStarts(raw).some(({ name, from }) => {
    const value = attributeValueAt(raw, from);
    if (/^(?:className|class)\s*=\s*$/.test(name) && !value.startsWith('{')) return value.includes('{{');
    return valueResults(value, /^\[(?:ngClass|class)\]/.test(name)) === null;
  });
}

export const LINKABLE_TAGS = new Set([
  'arena-bottom-nav-item', 'arena-card', 'arena-side-nav-item', 'arena-table-cell',
]);

export const WRAPPED_LINK_TAGS = new Set(['arena-link']);

export function outlineGap(drawn: number[]): [number, number] | null {
  const rungs = [...new Set(drawn)].sort((a, b) => a - b);
  for (let i = 1; i < rungs.length; i += 1) {
    const under = rungs[i - 1] as number;
    const over = rungs[i] as number;
    if (over - under > 1) return [under, over];
  }
  return null;
}

export function outlineMessage(under: number, over: number) {
  return `an outline that skips h${under + 1}: this screen can draw an h${under} and an h${over} `
    + 'with nothing between them. Arena gives each component the rung of its own register, so a card '
    + 'lands at h3 on the reading that a section names the region holding it -- with no section '
    + 'written, the middle rung is not there and the outline has a hole a reader jumping by '
    + 'heading falls through. Wrap the region in an arena-section, or say the rung you meant with '
    + '`headingLevel`';
}

const BLOCK_COMMENT = /'(?:[^'\\\n]|\\.)*'|"(?:[^"\\\n]|\\.)*"|\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->/g;
const LINE_COMMENT = /(?<![:\w"'`/\\])\/\/[^\n]*/g;
const blanked = (span: string) => span.replace(/[^\n]/g, ' ');
const balanced = (prefix: string) => ['"', "'", '`'].every((quote) => prefix.split(quote).length % 2 === 1);

export function withoutComments(text: string) {
  return text.replace(BLOCK_COMMENT, (span) => (span[0] === '/' || span[0] === '<' ? blanked(span) : span)).split('\n').map((line) => {
    for (const m of line.matchAll(LINE_COMMENT))
      if (balanced(line.slice(0, m.index))) return line.slice(0, m.index) + blanked(m[0]);
    return line;
  }).join('\n');
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

export function kebabTag(name: string) {
  return name.startsWith('Arena')
    ? name.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()
    : name;
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

export function structuralFindings(text: string, vocabulary: VocabularyIndex | null = null): Finding[] {
  const found: Finding[] = [];
  const namesGlyph = glyphNames(scan(text)).size > 0;
  const rungs: number[] = [];
  let firstRung = 0;
  for (const m of text.matchAll(OPEN_TAG)) {
    const name = m[1] ?? '';
    const start = m.index ?? 0;
    if (start > 0 && TAG_LEAD.test(text[start - 1] ?? '')) continue;
    const ends = tagEnd(text, start);
    if (ends === -1) continue;
    const attributes = ownAttributes(text.slice(start + name.length + 1, ends - 1));

    const rung = HEADING_RUNGS[kebabTag(name)];
    if (rung !== undefined) {
      const stated = statedRung(attributes);
      const drawn = stated === undefined
        ? (HEADING_LEVEL_ATTRIBUTE.test(attributes) ? undefined : rung)
        : stated ?? undefined;
      if (drawn !== undefined) {
        if (!rungs.length) firstRung = lineAt(text, start);
        rungs.push(drawn);
      }
    }

    const raw = text.slice(start + name.length + 1, ends - 1);
    if (ARENA_TAG.test(name))
      for (const message of ownClassFindings(name, attributes, vocabulary, raw))
        found.push(at(lineAt(text, start), 'own-class', message));

    for (const attribute of unknownInputs(name, attributes, vocabulary))
      found.push(at(lineAt(text, start), 'unknown-input', UNKNOWN_INPUT_MESSAGE(attribute, name)));

    if (kebabTag(name) !== 'arena-icon') {
      const toggled = [...ownAttributes(raw).matchAll(CLASS_TOGGLE)].map((m) => group(m)).join(' ');
      const classes = `${classValues(raw)} ${toggled}`;
      if (WEIGHT_TOKEN.test(classes) && GLYPH_TOKEN.test(classes))
        found.push(at(lineAt(text, start), 'raw-glyph', RAW_GLYPH_MESSAGE));
      else if (namesGlyph && boundClass(raw))
        found.push(at(lineAt(text, start), 'raw-glyph', RAW_GLYPH_BOUND_MESSAGE));
    }

    const links = LINK_TAG.test(name) || /(?:^|\s)\[?routerLink\]?\s*=/.test(attributes);
    if (!links || !ROUTER_ATTRIBUTE.test(attributes)) continue;
    const inside = text.slice(ends).replace(/^\s*(?:\{\s*\}\s*)*/, '');
    const wrapped = /^<(Arena[A-Za-z0-9]*|arena-[a-z0-9-]+)\b/.exec(inside)?.[1];
    if (wrapped !== undefined && LINKABLE_TAGS.has(kebabTag(wrapped)))
      found.push(at(lineAt(text, start), 'router-link', ROUTER_LINK_MESSAGE));
    if (wrapped !== undefined && WRAPPED_LINK_TAGS.has(kebabTag(wrapped)))
      found.push(at(lineAt(text, start), 'wrapped-link', WRAPPED_LINK_MESSAGE));
  }
  const gap = outlineGap(rungs);
  if (gap) found.push(at(firstRung, 'outline-gap', outlineMessage(gap[0], gap[1])));
  return found;
}

export function lineFindings(line: string, isStylesheet: boolean, scope: Scope = 'app',
  inStyleObject = false): Finding[] {
  const found: Finding[] = [];

  if (isStylesheet && OWN_RULE.test(line))
    found.push(at(0, 'own-class', 'a rule targeting an arena- class. That name is compiler output '
      + 'rather than a surface somebody meant you to target, and a slot may be renamed in any release'));

  if (scope === 'app' && PART_SELECTOR.test(line))
    found.push(at(0, 'own-class', 'a rule targeting a data-arena-part hook from outside a style '
      + 'plugin. The hook is where a project\'s appearance is allowed to live, and a rule reaching '
      + 'it from anywhere else is appearance nobody can find; move it into a directory the config '
      + 'declares in stylePlugins'));

  const styled = isStylesheet || INLINE_STYLE.test(line) || inStyleObject;
  if (styled && RAW_HEX.test(line))
    found.push(at(0, 'raw-value', RAW_HEX_MESSAGE));
  if (styled && rawColour(line, isStylesheet))
    found.push(at(0, 'raw-value', RAW_COLOUR_MESSAGE));
  if (styled && BARE_PIXELS.test(line))
    found.push(at(0, 'raw-value', 'a bare pixel length. Read it through the spacing scale, as '
      + 'var(--sp-4), or derive it with calc() over one'));
  if (isStylesheet && scope === 'plugin' && namesAnAlias(line))
    found.push(at(0, 'compat-alias', COMPAT_ALIAS_MESSAGE));

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

export function styleIdentifiers(text: string) {
  const names = new Set<string>();
  const attribute = /\bstyle\s*=\s*\{/g;
  for (let opener = attribute.exec(text); opener; opener = attribute.exec(text)) {
    const from = opener.index + opener[0].length;
    let depth = 1;
    let to = from;
    for (; to < text.length && depth > 0; to += 1) {
      if (text[to] === '{') depth += 1;
      else if (text[to] === '}') depth -= 1;
    }
    const expression = text.slice(from, to - 1);
    for (const found of expression.matchAll(IDENTIFIER)) {
      if (/^\s*:/.test(expression.slice((found.index ?? 0) + found[0].length))) continue;
      names.add(found[0]);
    }
  }
  return names;
}

export function styleObjectLines(text: string) {
  const names = styleIdentifiers(text);
  const lines = text.split('\n');
  const inside = new Set<number>();
  lines.forEach((line, index) => {
    const declared = BINDING.exec(line)?.[1];
    if (!declared || (!names.has(declared) && !STYLE_ANNOTATION.test(line))) return;
    const open = line.indexOf('{');
    if (open === -1) return;
    let depth = 0;
    for (let scan = index; scan < lines.length; scan += 1) {
      for (const character of (lines[scan] ?? '').slice(scan === index ? open : 0)) {
        if (character === '{') depth += 1;
        else if (character === '}') depth -= 1;
      }
      inside.add(scan + 1);
      if (depth <= 0) return;
    }
  });
  return inside;
}

export type ClassCandidate = { line: number; candidate: string };
export type DeadUtilities = ReadonlyMap<string, string>;
export const NO_DEAD: DeadUtilities = new Map();

const APPLY_CLASSES = /@apply\s+([^;}]*)/g;

function tokensOf(value: string, base: number, into: { index: number; token: string }[]) {
  for (const m of value.matchAll(/\S+/g)) {
    if (/[{}$]/.test(m[0])) continue;
    into.push({ index: base + (m.index ?? 0), token: m[0] });
  }
}

function blankedHoles(value: string): string {
  let out = '';
  for (let i = 0; i < value.length; i += 1) {
    const opens = value.startsWith('${', i) || value.startsWith('{{', i);
    if (!opens) { out += value[i]; continue; }
    let depth = 0;
    let end = i;
    for (; end < value.length; end += 1) {
      if (value[end] === '{') depth += 1;
      else if (value[end] === '}') { depth -= 1; if (depth <= 0) break; }
    }
    out += '$'.repeat(Math.min(end, value.length - 1) - i + 1);
    i = Math.min(end, value.length - 1);
  }
  return out;
}

function literalsOf(value: string, base: number, into: { index: number; token: string }[]) {
  for (let i = 0; i < value.length; i += 1) {
    const q = value[i] ?? '';
    if (q !== '"' && q !== "'" && q !== '`') continue;
    let end = i + 1;
    for (; end < value.length && value[end] !== q; end += 1) {
      if (value[end] === '\\') end += 1;
      else if (q === '`' && value.startsWith('${', end)) {
        let depth = 0;
        for (; end < value.length; end += 1) {
          if (value[end] === '{') depth += 1;
          else if (value[end] === '}') { depth -= 1; if (depth === 0) break; }
        }
      }
    }
    tokensOf(blankedHoles(value.slice(i + 1, end)), base + i + 1, into);
    i = end;
  }
}

export function classCandidates(relPath: string, text: string): ClassCandidate[] {
  const stripped = withoutComments(text);
  const found: { index: number; token: string }[] = [];
  if (STYLE_EXTENSIONS.some((ext) => relPath.endsWith(ext))) {
    for (const m of stripped.matchAll(APPLY_CLASSES))
      tokensOf(group(m), (m.index ?? 0) + m[0].length - group(m).length, found);
  } else {
    for (const m of stripped.matchAll(OPEN_TAG)) {
      const name = m[1] ?? '';
      const start = m.index ?? 0;
      if (start > 0 && TAG_LEAD.test(stripped[start - 1] ?? '')) continue;
      const ends = tagEnd(stripped, start);
      if (ends === -1 || ARENA_TAG.test(name)) continue;
      const base = start + name.length + 1;
      const raw = stripped.slice(base, ends - 1);
      for (const { name: attribute, from } of ownAttributeStarts(raw)) {
        const value = attributeValueAt(raw, from);
        const quoted = /^["']/.test(value);
        if (quoted && /^(?:className|class)\s*=\s*$/.test(attribute))
          tokensOf(blankedHoles(value.slice(1, -1)), base + from + 1, found);
        else if (quoted) literalsOf(value.slice(1, -1), base + from + 1, found);
        else literalsOf(value, base + from, found);
      }
      for (const m2 of ownAttributes(raw).matchAll(CLASS_TOGGLE))
        found.push({ index: base + (m2.index ?? 0) + m2[0].indexOf('.') + 1, token: group(m2) });
    }
  }
  return found.sort((a, b) => a.index - b.index)
    .map(({ index, token }) => ({ line: lineAt(stripped, index), candidate: token }));
}

export function findings(relPath: string, text: string, scope: Scope = 'app',
  vocabulary: VocabularyIndex | null = null, levels: LevelledRoles = NO_LEVELS,
  dead: DeadUtilities = NO_DEAD): Finding[] {
  const isStylesheet = STYLE_EXTENSIONS.some((ext) => relPath.endsWith(ext));
  const lines = text.split('\n');
  const stripped = withoutComments(text);
  const painted = isStylesheet ? new Set<number>() : styleObjectLines(stripped);
  const readsLevels = scope === 'app' && levels.size > 0;
  let offset = 0;
  const perLine = stripped.split('\n').flatMap((line, index) => {
    const file = { text: stripped, offset, sheet: isStylesheet };
    offset += line.length + 1;
    return [...lineFindings(line, isStylesheet, scope, painted.has(index + 1)),
      ...(readsLevels ? levelFindings(line, levels, file) : [])]
      .map((one) => at(index + 1, one.rule, one.message));
  });
  const deadFound: Finding[] = [];
  if (scope === 'app' && dead.size > 0) {
    const seen = new Set<string>();
    for (const { line, candidate } of classCandidates(relPath, text)) {
      const message = dead.get(candidate);
      if (message === undefined || seen.has(`${line} ${candidate}`)) continue;
      seen.add(`${line} ${candidate}`);
      deadFound.push(at(line, 'dead-utility', message));
    }
  }
  return [...perLine, ...structuralFindings(stripped, vocabulary), ...bracketFindings(text, lines), ...deadFound]
    .sort((a, b) => a.line - b.line);
}

export type AuditLine = { rule: string; text: string };

export function auditFindings(relPath: string, text: string, scope: Scope = 'app',
  vocabulary: VocabularyIndex | null = null, levels: LevelledRoles = NO_LEVELS,
  dead: DeadUtilities = NO_DEAD): AuditLine[] {
  const lines = text.split('\n');
  const byLine = new Map<number, Finding[]>();
  for (const one of findings(relPath, text, scope, vocabulary, levels, dead)) {
    if (!byLine.has(one.line)) byLine.set(one.line, []);
    (byLine.get(one.line) ?? []).push(one);
  }

  const problems: AuditLine[] = [];
  lines.forEach((line, index) => {
    const number = index + 1;
    const found = byLine.get(number) ?? [];
    if (ALLOW_MARKER.test(line)) {
      if (found.length === 0) {
        const stale = at(number, 'stale-allowance', 'stale arena-audit allowance, and nothing on the line to exempt');
        problems.push({ rule: stale.rule, text: `${relPath}:${number}: ${stale.message}` });
      }
      return;
    }
    for (const one of found) {
      problems.push({ rule: one.rule, text: `${relPath}:${number}: ${one.message} (${one.rule})` });
    }
  });

  return problems;
}

export function auditText(relPath: string, text: string, scope: Scope = 'app',
  vocabulary: VocabularyIndex | null = null, levels: LevelledRoles = NO_LEVELS,
  dead: DeadUtilities = NO_DEAD): string[] {
  return auditFindings(relPath, text, scope, vocabulary, levels, dead).map((one) => one.text);
}

const ICON_TAG = /^(?:ArenaIcon|arena-icon)$/;
const ICON_ATTRIBUTE = /(?<=^|\s)\[?(?:icon|iconRight)\]?\s*=\s*/g;
const ANY_ATTRIBUTE = /(?<=^|\s)[[(]?[\w.:@-]+[\])]?\s*=\s*/g;

function withoutElements(value: string) {
  let out = '';
  let quote = '';
  for (let i = 0; i < value.length; i += 1) {
    const c = value[i] ?? '';
    if (quote) { out += c; if (c === quote) quote = ''; continue; }
    if (c === '"' || c === "'" || c === '`') { quote = c; out += c; continue; }
    const name = c === '<' ? /^[A-Za-z][\w.-]*/.exec(value.slice(i + 1))?.[0] : undefined;
    if (!name) { out += c; continue; }
    const opened = tagEnd(value, i);
    const ends = opened === -1 ? value.length : value[opened - 2] === '/' ? opened
      : Math.max(opened, value.indexOf('>', elementEnd(value, name, opened)) + 1);
    out += ' '.repeat(ends - i);
    i = ends - 1;
  }
  return out;
}

export function iconMemberGlyphs(text: string): Set<string> {
  const found = scan(text.match(new RegExp(SYMBOL_REF.source, 'g'))?.join(' ') ?? '');
  for (const m of text.matchAll(OPEN_TAG)) {
    const name = m[1] ?? '';
    const start = m.index ?? 0;
    if (start > 0 && TAG_LEAD.test(text[start - 1] ?? '')) continue;
    const ends = tagEnd(text, start);
    if (ends === -1) continue;
    const raw = text.slice(start + name.length + 1, ends - 1);
    const named = ICON_TAG.test(name) ? ANY_ATTRIBUTE : ARENA_TAG.test(name) ? ICON_ATTRIBUTE : null;
    if (named === null) continue;
    for (const { from } of ownAttributeStarts(raw, named)) {
      const value = attributeValueAt(raw, from);
      scan(named === ICON_ATTRIBUTE ? withoutElements(value) : value, found);
    }
  }
  return glyphNames(found);
}

export type LevelledRoles = ReadonlyMap<string, { level: string; keys: string[] }>;
export const NO_LEVELS: LevelledRoles = new Map();
export const LEVELS_INDEX = 'arena.levels.json';

export function levelledRoles(
  roles: Record<string, { combines?: { with: string; as: string }[]; keys?: string[] }> | undefined,
): LevelledRoles {
  const out = new Map<string, { level: string; keys: string[] }>();
  for (const [name, role] of Object.entries(roles ?? {})) {
    const level = role.combines?.find((one) => one.as === 'level');
    if (level) out.set(name, { level: level.with, keys: role.keys ?? [] });
  }
  return out;
}

const isLevel = (entry: unknown): entry is { level: string; keys: string[] } => {
  const { level, keys } = (entry ?? {}) as { level?: unknown; keys?: unknown };
  return typeof level === 'string' && Array.isArray(keys) && keys.every((key) => typeof key === 'string');
};

function readJsonOrNull(path: string): unknown {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return null; }
}

export function loadLevels(root: string): LevelledRoles | null {
  const parsed = readJsonOrNull(join(root, LEVELS_INDEX));
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) return null;
  const entries = Object.entries(parsed);
  return entries.every(([, entry]) => isLevel(entry)) ? new Map(entries as [string, { level: string; keys: string[] }][]) : null;
}

export function catalogueLevels(root: string): LevelledRoles | null {
  const parsed = readJsonOrNull(join(root, 'arena.tokens.json')) as { roles?: Parameters<typeof levelledRoles>[0] } | null;
  return parsed === null || typeof parsed !== 'object' ? null : levelledRoles(parsed.roles);
}

const COLOUR_PREFIXES = ['bg', 'text', 'border', 'border-x', 'border-y', 'border-s', 'border-e', 'border-t', 'border-r',
  'border-b', 'border-l', 'outline', 'ring', 'ring-offset', 'inset-ring', 'decoration', 'fill', 'stroke', 'caret', 'accent',
  'placeholder', 'divide', 'shadow', 'inset-shadow', 'drop-shadow', 'text-shadow', 'from', 'via', 'to'];
const CLASS_STOP = /[\s"'`(){}]/;
const LITERAL_SHARE = /\d*\.?\d+%|(?<![\w.-])\d*\.?\d+(?![\w.%-])/;
const LEVEL_CLASS_MODIFIER = /^(?:\(--level-|\[var\(--level-)/;
const APPLY = /@apply\b/;
const SHEET_CUT = { back: /[{};]/, ahead: /[;}]/, open: /\(/, close: /\)/ };
const MARKUP_CUT = { back: /['"`<>]/, ahead: /['"`<>]/, open: /[({]/, close: /[)}]/ };

const levelPatterns = new WeakMap<LevelledRoles, { utility: RegExp; read: RegExp; roleOf: Map<string, string> }>();
const escaped = (names: string[]) => names.map((name) => name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');

function patternsFor(levels: LevelledRoles) {
  const cached = levelPatterns.get(levels);
  if (cached) return cached;
  const roleOf = new Map([...levels].flatMap(([role, { keys }]) => keys.map((key): [string, string] => [key, role])));
  const roles = escaped([...levels.keys()]);
  const made = {
    roleOf,
    utility: new RegExp(`(?<![\\w-])(?:${COLOUR_PREFIXES.join('|')})-(${escaped([...roleOf.keys()]) || '(?!)'})(?![\\w-])(?:/(\\([^)]*\\)|\\[[^\\]]*\\]|[\\w.]+))?`, 'g'),
    read: new RegExp(`var\\(\\s*--(?:color-(${escaped([...roleOf.keys()]) || '(?!)'})|(${roles}))(?=\\s*[,)])`, 'g'),
  };
  levelPatterns.set(levels, made);
  return made;
}

function callAround(line: string, from: number) {
  let pos = from;
  for (;;) {
    let depth = 0;
    let open = -1;
    for (let i = pos - 1; i >= 0; i -= 1) {
      const c = line[i];
      if (c === ')') depth += 1;
      else if (c === '(') { if (depth === 0) { open = i; break; } depth -= 1; }
    }
    if (open === -1) return null;
    const name = /[\w-]*$/.exec(line.slice(0, open))?.[0] ?? '';
    if (name === 'var') { pos = open - 3; continue; }
    let nested = 0;
    let close = line.length;
    for (let i = open + 1; i < line.length; i += 1) {
      if (line[i] === '(') nested += 1;
      else if (line[i] === ')') { if (nested === 0) { close = i; break; } nested -= 1; }
    }
    return { name, args: line.slice(open + 1, close) };
  }
}

function declarationAround(text: string, from: number, sheet: boolean) {
  const cut = sheet ? SHEET_CUT : MARKUP_CUT;
  let start = from;
  for (let depth = 0; start > 0; start -= 1) {
    const c = text[start - 1] ?? '';
    if (cut.close.test(c)) depth += 1;
    else if (cut.open.test(c)) depth = Math.max(0, depth - 1);
    else if (depth === 0 && cut.back.test(c)) break;
  }
  let end = from;
  for (let depth = 0; end < text.length; end += 1) {
    const c = text[end] ?? '';
    if (cut.open.test(c)) depth += 1;
    else if (cut.close.test(c)) depth -= 1;
    else if (depth <= 0 && cut.ahead.test(c)) break;
  }
  return { text: text.slice(start, end), at: from - start };
}

function insideClassBracket(line: string, from: number) {
  const open = line.lastIndexOf('[', from);
  if (open === -1 || /[\]\s'"`]/.test(line.slice(open, from))) return false;
  return open === 0 || /[\s"'`{}:-]/.test(line[open - 1] ?? '');
}

function withoutVars(args: string) {
  let out = args;
  for (let next = out.replace(/var\([^()]*\)/g, ' '); next !== out; next = out.replace(/var\([^()]*\)/g, ' ')) out = next;
  return out;
}

export function levelFindings(line: string, levels: LevelledRoles,
  file: { text: string; offset: number; sheet: boolean } | null = null): Finding[] {
  if (levels.size === 0) return [];
  const { utility, read, roleOf } = patternsFor(levels);
  const found: Finding[] = [];
  const sheet = file?.sheet === true;
  const applied = sheet ? APPLY.exec(line) : null;
  const classes = !sheet ? line
    : applied === null ? '' : ' '.repeat(applied.index + applied[0].length) + line.slice(applied.index + applied[0].length);
  for (const m of classes.matchAll(utility)) {
    const role = roleOf.get(group(m)) ?? '';
    const level = levels.get(role)?.level ?? '';
    const modifier = m[2];
    if (modifier !== undefined && LEVEL_CLASS_MODIFIER.test(modifier)) continue;
    const start = m.index ?? 0;
    let from = start;
    while (from > 0 && !CLASS_STOP.test(classes[from - 1] ?? '')) from -= 1;
    const stem = classes.slice(from, start + m[0].length - (modifier === undefined ? 0 : modifier.length + 1));
    const cls = modifier === undefined ? stem : `${stem}/${modifier}`;
    found.push(at(0, 'missing-level', modifier === undefined
      ? `\`${cls}\` reads ${role} without its level, so it paints at full strength. Write \`${stem}/(--${level})\``
      : `\`${cls}\` holds ${role} back by \`/${modifier}\`, a share that cannot follow a level \`arena build\` raises. Write \`${stem}/(--${level})\``));
  }
  for (const m of line.matchAll(read)) {
    const role = m[1] === undefined ? group(m, 2) : roleOf.get(m[1]) ?? '';
    const written = m[0].replace(/^var\(\s*--/, '');
    const level = levels.get(role)?.level ?? '';
    const index = m.index ?? 0;
    const around = file === null ? { text: line, at: index } : declarationAround(file.text, file.offset + index, file.sheet);
    const call = callAround(around.text, around.at);
    if (call?.args.includes('var(--level-')) continue;
    const share = call?.name === 'color-mix' ? LITERAL_SHARE.exec(withoutVars(call.args))?.[0] : undefined;
    const form = insideClassBracket(line, index)
      ? `color-mix(in_oklab,var(--${written})_var(--${level}),transparent)`
      : `color-mix(in oklab, var(--${written}) var(--${level}), transparent)`;
    found.push(at(0, 'missing-level', call && share !== undefined
      ? `reads ${written} at a literal share of ${share} inside ${call.name}(), which cannot follow a level \`arena build\` raises. Write ${form}`
      : `reads var(--${written}) without its level, so it paints at full strength. Write ${form}`));
  }
  return found;
}
