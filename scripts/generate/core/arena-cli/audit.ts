/* The rules of the language, decided over source text rather than over Arena's own tree, so the
 * one statement of each serves both sides of the ship boundary: this module ships inside the
 * packages beside the CLI, and check:arbitrary and check:dimensions read their rule from here.
 * It depends on nothing but node and its own siblings, because inside a package scripts/ does
 * not exist. It decides what source text shows and nothing else: the render rules are not
 * visible from outside, and a filled danger surface is visible only where a project paints one
 * of its own. A line carrying an allow marker is exempt, and a marker over a line with nothing
 * to exempt is stale. Every rule is read in a SCOPE: a declared plugin directory may select a
 * part hook and paint a gradient, and a source may not. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RULE_TAGS = ['compat-alias', 'danger-fill', 'emoji', 'icon-element',
  'one-primary', 'outline-gap', 'own-class', 'raw-value', 'router-link'] as const;

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
export const COMPAT_ALIASES = [
  'level-ink-body', 'level-ink-quiet', 'level-ink-muted', 'level-presence',
  'level-hue-soft-danger', 'level-hue-soft-success', 'level-hue-soft-warning', 'level-hue-soft-info',
  'level-accent-soft-primary', 'level-accent-soft-gold',
  'picker-invert', 'ink', 'ink-2', 'panel', 'line-strong', 'bone', 'bone-dim', 'mute',
  'mute-2-disabled', 'status-offline', 'crimson', 'crimson-strong', 'crimson-soft', 'gold',
  'gold-strong', 'gold-soft', 'success', 'success-soft', 'warning', 'warning-soft', 'danger',
  'danger-strong', 'danger-soft', 'danger-fill', 'info', 'info-soft', 'bg', 'bg-raised',
  'surface-card', 'surface-input', 'text-strong', 'text-body', 'text-muted', 'border',
  'border-strong', 'accent', 'accent-press', 'accent-soft', 'focus-ring', 'on-accent',
];

export const COMPAT_ALIAS_MESSAGE = 'a value read through one of Arena\'s own compatibility '
  + 'aliases. The layer maps Arena\'s names onto the palette and ships with the package, so a rule '
  + 'naming one assigns a step of the ramp under another name rather than answering a role: answer '
  + 'the role in plugin.tokens.json with one of your palette colours, and compose the shade you '
  + 'want with color-mix() over var(--color-*) where no palette entry holds it';

export function namesAnAlias(line: string) {
  return COMPAT_ALIASES.some((alias) => new RegExp(`var\\(\\s*--${alias}\\s*[,)]`).test(line));
}

export const DANGER_FILL_TOKENS = ['--danger', '--danger-strong', '--danger-fill',
  '--color-error', '--color-error-fill'];

export const FILL_PROPERTY = /(?:^|[\s;{"'])(?:background|background-color|backgroundColor)\s*:/;

export const DANGER_FILL_MESSAGE = 'a filled danger surface. Danger is outline in Arena: leave the '
  + 'background transparent and read var(--danger) for the border and the content. The one filled '
  + 'danger surface in the system is the final confirmation inside ArenaConfirmDialog, and '
  + 'var(--danger-soft) is the tint a surface of your own may carry';

export function fillsWithDanger(line: string) {
  if (!FILL_PROPERTY.test(line)) return false;
  return DANGER_FILL_TOKENS.some((token) => new RegExp(`var\\(\\s*${token}\\s*[,)]`).test(line));
}

const GRADIENT = /\b(?:linear|radial|conic)-gradient\s*\(/;
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
  defaults?: Record<string, Record<string, string>>;
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

export const HEADING_RUNGS: Record<string, number> = {
  'arena-hero': 1,
  'arena-page-head': 1,
  'arena-section': 2,
  'arena-unauth-card': 2,
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

export const STATED_PRIMARY = /(?:^|\s)\[?(?:class|className)\]?\s*=\s*\{?\s*["'`]{1,2}[^"'`]*?(?<![\w-])arena-emphasis-primary(?![\w-])/;

const EMPHASIS_OPTION = /(?<![\w-])arena-emphasis-[a-z]+(?![\w-])/;
const DESTRUCTIVE = /(?:^|\s)\[?destructive\]?(?=[\s=/>]|$)/;
const BARE_COMPUTED_CLASS = /(?:^|\s)(?:className\s*=\s*\{|\[(?:class|ngClass|attr\.class|class\.[a-z0-9-]+)\]\s*=|class\s*=\s*["'][^"']*\{\{)|\{\s*\.\.\./;
const BRANCH_ATTRIBUTE = /(?:^|\s)\*ng(?:If|SwitchCase|SwitchDefault)\b/;
const BRANCH_BLOCK = /@(?:if|else|switch|case|default)\b[^{}@]*\{|@else\s*\{/y;
const BRANCH_LEAD = /(?:\?\??|:|&&|\|\|)\s*(?:\(\s*|<>\s*)*$/;
const STRING_CONTEXT = /[=:,(\[?&|]\s*$|\breturn\s*$/;
const INLINE_TEMPLATE = /\btemplate\s*:\s*$/;

export function inBranch(text: string, start: number, attributes: string, openBranches: { name: string; end: number }[]) {
  if (BRANCH_ATTRIBUTE.test(attributes) || BRANCH_LEAD.test(text.slice(Math.max(0, start - 40), start))) return true;
  if (openBranches.some(({ name, end }) => {
    let depth = 1;
    const tags = new RegExp(`<(/?)${name}(?![\\w.-])(?:[^>]*[^/>])?>`, 'g');
    for (const m of text.slice(end, start).matchAll(tags)) {
      depth += m[1] ? -1 : 1;
      if (depth === 0) return false;
    }
    return true;
  })) return true;
  const stack: boolean[] = [];
  for (let i = 0; i < start; i++) {
    const c = text[i];
    if (c === '"' || c === "'" || c === '`') {
      const before = text.slice(0, i);
      if (STRING_CONTEXT.test(before.slice(-12)) && !(c === '`' && INLINE_TEMPLATE.test(before.slice(-24)))) {
        let j = i + 1;
        while (j < start && text[j] !== c) j += text[j] === '\\' ? 2 : 1;
        i = j;
      }
    } else if (c === '@') {
      BRANCH_BLOCK.lastIndex = i;
      const m = BRANCH_BLOCK.exec(text);
      if (m) { stack.push(true); i += m[0].length - 1; }
    } else if (c === '{') stack.push(false);
    else if (c === '}') stack.pop();
  }
  return stack.some(Boolean);
}

export function pascalTag(name: string) {
  return name.startsWith('arena-')
    ? name.split('-').map((word) => word.slice(0, 1).toUpperCase() + word.slice(1)).join('')
    : name;
}

export function bareOfEmphasis(raw: string) {
  return !EMPHASIS_OPTION.test(raw) && !DESTRUCTIVE.test(raw) && !BARE_COMPUTED_CLASS.test(raw);
}

export function primaryMessage(first: number) {
  return `a second primary action on this screen, and the first is on line ${first}. Crimson is `
    + 'the voice, so at most one arena-emphasis-primary action stands in a view. Write '
    + 'arena-emphasis-secondary or arena-emphasis-ghost on the others, and keep the primary for the '
    + 'one action the screen is for. A button with no emphasis class is primary too';
}

export const LINKABLE_TAGS = new Set([
  'arena-bottom-nav-item', 'arena-card', 'arena-side-nav-item', 'arena-table-cell',
]);

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
  const rungs: number[] = [];
  let firstRung = 0;
  const primaries: number[] = [];
  const bare: number[] = [];
  const branches: { name: string; end: number }[] = [];
  let contextEmphasis = false;
  for (const m of text.matchAll(OPEN_TAG)) {
    const name = m[1] ?? '';
    const start = m.index ?? 0;
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

    if (ARENA_TAG.test(name) && STATED_PRIMARY.test(attributes)) primaries.push(lineAt(text, start));
    if (ARENA_TAG.test(name) || EMPHASIS_OPTION.test(attributes)) {
      const component = pascalTag(name);
      const answersEmphasis = (vocabulary?.answers[component] ?? []).includes('emphasis');
      if (EMPHASIS_OPTION.test(attributes) && !answersEmphasis) contextEmphasis = true;
      if (vocabulary?.defaults?.[component]?.emphasis === 'arena-emphasis-primary' && bareOfEmphasis(raw)
        && !inBranch(text, start, attributes, branches))
        bare.push(lineAt(text, start));
    }

    if ((BRANCH_ATTRIBUTE.test(attributes) || BRANCH_LEAD.test(text.slice(Math.max(0, start - 40), start))) && !raw.trimEnd().endsWith('/')) branches.push({ name, end: ends });

    const links = LINK_TAG.test(name) || /(?:^|\s)\[?routerLink\]?\s*=/.test(attributes);
    if (!links || !ROUTER_ATTRIBUTE.test(attributes)) continue;
    const inside = text.slice(ends).replace(/^\s*(?:\{\s*\/\*[\s\S]*?\*\/\s*\}\s*|<!--[\s\S]*?-->\s*)*/, '');
    const wrapped = /^<(Arena[A-Za-z0-9]*|arena-[a-z0-9-]+)\b/.exec(inside)?.[1];
    if (wrapped !== undefined && LINKABLE_TAGS.has(kebabTag(wrapped)))
      found.push(at(lineAt(text, start), 'router-link', ROUTER_LINK_MESSAGE));
  }
  const gap = outlineGap(rungs);
  if (gap) found.push(at(firstRung, 'outline-gap', outlineMessage(gap[0], gap[1])));
  const counted = (contextEmphasis ? primaries : [...primaries, ...bare]).sort((a, b) => a - b);
  for (const line of counted.slice(1))
    found.push(at(line, 'one-primary', primaryMessage(counted[0] as number)));
  return found;
}

export function lineFindings(line: string, isStylesheet: boolean, scope: Scope = 'app',
  gradientMark = false, inStyleObject = false): Finding[] {
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
    found.push(at(0, 'raw-value', 'a raw hex where a token belongs. Read the value through its '
      + 'custom property, as var(--crimson)'));
  if (styled && rawColour(line, isStylesheet))
    found.push(at(0, 'raw-value', RAW_COLOUR_MESSAGE));
  if (styled && BARE_PIXELS.test(line))
    found.push(at(0, 'raw-value', 'a bare pixel length. Read it through the spacing scale, as '
      + 'var(--sp-4), or derive it with calc() over one'));
  if (isStylesheet && scope === 'plugin' && namesAnAlias(line))
    found.push(at(0, 'compat-alias', COMPAT_ALIAS_MESSAGE));

  if (styled && scope === 'app' && !gradientMark && GRADIENT.test(line))
    found.push(at(0, 'raw-value', 'a gradient. Depth comes from the base-100 to base-300 surface '
      + 'scale, the hairline border and the warm shadow'));

  if (styled && scope === 'app' && fillsWithDanger(line))
    found.push(at(0, 'danger-fill', DANGER_FILL_MESSAGE));

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

export function findings(relPath: string, text: string, scope: Scope = 'app',
  gradientMark = false, vocabulary: VocabularyIndex | null = null): Finding[] {
  const isStylesheet = STYLE_EXTENSIONS.some((ext) => relPath.endsWith(ext));
  const lines = text.split('\n');
  const stripped = withoutComments(text);
  const painted = isStylesheet ? new Set<number>() : styleObjectLines(stripped);
  const perLine = stripped.split('\n').flatMap((line, index) =>
    lineFindings(line, isStylesheet, scope, gradientMark, painted.has(index + 1))
      .map((one) => at(index + 1, one.rule, one.message)));
  return [...perLine, ...structuralFindings(text, vocabulary), ...bracketFindings(text, lines)]
    .sort((a, b) => a.line - b.line);
}

export function auditText(relPath: string, text: string, scope: Scope = 'app',
  gradientMark = false, vocabulary: VocabularyIndex | null = null): string[] {
  const lines = text.split('\n');
  const byLine = new Map<number, Finding[]>();
  for (const one of findings(relPath, text, scope, gradientMark, vocabulary)) {
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
