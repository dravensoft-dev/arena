/* The generated regions of the consumer pages: what the repository is, how a skin is declared,
 * the sheet table, and each npm page's question table. Each region lands only in the targets
 * REGION_TARGETS maps it to, between markers a person placed, because where a section sits is the
 * author's decision and only what it says is this file's. The question tables come from
 * NPM_QUESTIONS and link into skills/design/ at the tag of the release. A region shared by two
 * pages names no layer: `check:layer-independence` refuses a page under `frameworks/<A>/` that
 * cites layer B, and the test here holds every shared region to that. */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { packageSheetName, sheetFamilies, VOCABULARY_DIR, FAMILY_SUFFIX } from '../../lib/tailwind/vocabulary.ts';
import { CSS_CHAIN, tokenCatalogue } from '../../lib/arena/package-assembly.ts';
import { NPM_PAGES, renderQuestions } from '../../lib/arena/npm-questions.ts';
import { ARENA_EXT, RESERVED } from '../core/arena-cli/style-plugin-rules.ts';
import { readJson } from '../../utils/read-file.ts';
import { fieldEntries } from '../../lib/arena/contract-shapes.ts';
import {
  readPlugin, resolvedPlugin, PLUGIN_TOKENS, PLUGIN_SHEET, ARENA_CONFIG_KEYS, ARENA_FONT_KEYS, ARENA_FONT_DEFAULTS,
  STYLESHEET_KEYS,
} from '../core/arena-cli/theme-css.ts';
import type { ArenaConfig, ArenaFont } from '../core/arena-cli/theme-css.ts';
import { FONT_ROLES } from '../core/arena-cli/palette-keys.ts';
import { CSS_TARGETS } from './generate-tokens.ts';
import { HUES_FILE } from '../../lib/tailwind/hue-sheet.ts';
import { RULE_TAGS, RULE_DESCRIPTIONS } from '../core/arena-cli/audit.ts';
import { LAYER_SCRIPTS, wiredScripts } from '../core/arena-cli/command-init.ts';
import { RULES } from '../../lib/arena/language-rules.ts';

export const LOCALE_CONTRACT = 'contracts/api/types/arena-locale.json';
export const ROLE_CONTRACT = 'contracts/design/roles.json';
export const BEHAVIOUR_CONTRACT = 'contracts/design/behaviour.json';

type Row = { type: string; required: string; default: string };

const CONFIG_ROWS: Partial<Record<keyof ArenaConfig, Row>> = {
  palettes: { type: 'array of palettes', required: 'yes', default: 'none' },
  fonts: { type: 'object, one entry per font role', required: 'yes', default: 'none' },
  stylePlugins: { type: 'array of `default` or a directory path', required: 'no', default: '`["default"]`' },
  stylesheet: { type: 'object', required: 'no', default: 'every sheet the package ships' },
  gradientMark: { type: 'boolean', required: 'no', default: 'unset' },
};

const FONT_ROWS: Partial<Record<keyof ArenaFont, () => Row>> = {
  family: () => ({ type: 'string', required: 'yes', default: 'none' }),
  src: () => ({ type: 'string, a stylesheet URL or a font file', required: 'yes', default: 'none' }),
  fallback: () => ({
    type: 'array of family names', required: 'no',
    default: `per role: ${Object.entries(FONT_ROLES).map(([name, list]) => `${name} \`${list.join(', ')}\``).join(', ')}`,
  }),
  style: () => ({ type: 'string', required: 'no', default: `\`${ARENA_FONT_DEFAULTS.style}\`` }),
  weight: () => ({ type: 'string', required: 'no', default: `\`${ARENA_FONT_DEFAULTS.weight}\`` }),
  display: () => ({ type: 'string', required: 'no', default: `\`${ARENA_FONT_DEFAULTS.display}\`` }),
};

const STYLESHEET_ROWS: Record<string, Row> = {
  components: { type: 'array of sheet names, or `"auto"`', required: 'no', default: 'every component sheet' },
  preflight: { type: 'boolean', required: 'no', default: '`true`' },
};

export function configKeyTable() {
  const line = (key: string, row: Row) => `| \`${key}\` | ${cell(row.type)} | ${row.required} | ${cell(row.default)} |`;
  return ['| key | type | required | default |', '| --- | --- | --- | --- |',
    ...ARENA_CONFIG_KEYS.map((key) => line(key, CONFIG_ROWS[key]!)),
    ...ARENA_FONT_KEYS.map((key) => line(`fonts.<role>.${key}`, FONT_ROWS[key]!())),
    ...STYLESHEET_KEYS.map((key) => line(`stylesheet.${key}`, STYLESHEET_ROWS[key]!)),
  ].join('\n');
}

export function defaultedRoles(base = root) {
  const roles = readJson(join(base, ROLE_CONTRACT)) as Record<string, { $extensions?: Record<string, { default?: unknown }> }>;
  return Object.keys(roles).filter((name) => roles[name]?.$extensions?.[ARENA_EXT]?.default !== undefined).sort();
}

export function unansweredCount(base = root) {
  const roles = readJson(join(base, ROLE_CONTRACT)) as Record<string, unknown>;
  return Object.keys(roles).length - defaultedRoles(base).length;
}

export function toastIntervals(base = root) {
  const behaviour = readJson(join(base, BEHAVIOUR_CONTRACT)) as {
    dismiss: Record<'default' | 'actionable', { $value: { value: number; unit: string } }>;
  };
  const ms = (name: 'default' | 'actionable') => `${behaviour.dismiss[name].$value.value} ${behaviour.dismiss[name].$value.unit}`;
  return { standard: ms('default'), actionable: ms('actionable') };
}

export function roleRuns(roles: string[]) {
  const out: string[] = [];
  for (let i = 0; i < roles.length; i += 1) {
    const [, stem, first] = /^(.*-)(\d+)$/.exec(roles[i]!) ?? [];
    let j = i;
    while (stem !== undefined && roles[j + 1] === `${stem}${Number(first) + (j + 1 - i)}`) j += 1;
    out.push(j - i >= 2 ? `\`${roles[i]}\` to \`${roles[j]}\`` : `\`${roles[i]}\``);
    if (j - i >= 2) i = j;
  }
  return out;
}

export function defaultedSentence(roles: string[], total = 0) {
  if (roles.length === 0)
    return `No role in this package carries a default, so your root style plugin answers every one of the ${total} roles and the command refuses a root plugin silent on any.`;
  return `The ${roles.length} roles carrying a default are ${roleRuns(roles).join(', ')}. Your root plugin answers the other ${total}.`;
}

export function defaultsStatement(base = root) {
  const roles = defaultedRoles(base);
  return `${defaultedSentence(roles, unansweredCount(base))} A minor release may add a role that carries Arena's default. Your root plugin may then leave that role silent, and the role takes the default. The command notes it, as \`N role(s) your root style plugin leaves unanswered take Arena's default: …\`. Your package's \`arena.tokens.json\` writes a role's default beside its type.`;
}

export const TOAST_NOTICE_CONTRACT = 'contracts/api/types/arena-toast-notice.json';
export const CONFIRM_REQUEST_CONTRACT = 'contracts/api/types/arena-confirm-request.json';

const cell = (text: string) => text.replace(/\|/g, '\\|');

export function fieldTable(base: string, typeFile: string) {
  const contract = readJson(join(base, typeFile)) as { fields?: unknown };
  const rows = fieldEntries(contract.fields).map(([name, field]) => {
    if (field.type === undefined || field.description === undefined)
      throw new Error(`generate-npm-pages: ${typeFile} field ${name} carries no ${field.type === undefined ? 'type' : 'description'}`);
    const fallback = field.default === undefined ? 'none' : `\`${cell(String(field.default))}\``;
    return `| \`${name}\` | \`${cell(field.type)}\` | ${field.required ? 'yes' : 'no'} | ${fallback} | ${cell(field.description)} |`;
  });
  return ['| field | type | required | default | what it means |', '| --- | --- | --- | --- | --- |', ...rows].join('\n');
}

export function requiredLead(base: string, typeFile: string) {
  const contract = readJson(join(base, typeFile)) as { fields?: unknown };
  const required = fieldEntries(contract.fields).filter(([, field]) => field.required).map(([name]) => `\`${name}\``);
  if (required.length === 0) return 'Every field is optional.';
  if (required.length === 1) return `Only ${required[0]} is required.`;
  return `${required.slice(0, -1).join(', ')} and ${required.at(-1)} are required.`;
}

export const DENSITY_CONTRACTS = { compact: 'contracts/design/density.compact.json', comfortable: 'contracts/design/density.comfortable.json' };
export const THEME_SHEET = 'frameworks/tailwind/Theme.css';
const TYPE_GROUPS = ['font', 'fw', 'fs', 'lh', 'ls'];

function utilitiesOf(base: string, pattern: RegExp, render: (kind: string, name: string) => string, keysOf = (match: RegExpExecArray) => [match[3]!]) {
  const found = new Map<string, string[]>();
  for (const line of readFileSync(join(base, THEME_SHEET), 'utf8').split('\n')) {
    const match = pattern.exec(line);
    if (!match) continue;
    const utility = `\`${render(match[1]!, match[2]!)}\``;
    for (const key of keysOf(match)) found.set(key, [...(found.get(key) ?? []), utility]);
  }
  return found;
}

export function localeMembers(base = root) {
  const found = new Map<string, string[]>();
  const dir = join(base, 'contracts/api/components');
  for (const file of readdirSync(dir).filter((name) => name.endsWith('.json')).sort()) {
    const contract = readJson(join(dir, file)) as { component: string; api?: Record<string, { description?: string }> };
    for (const [member, entry] of Object.entries(contract.api ?? {})) {
      const field = /provided locale's `?(\w+)`?/.exec(entry.description ?? '')?.[1];
      if (field) found.set(field, [...(found.get(field) ?? []), `${contract.component}.${member}`]);
    }
  }
  return found;
}

export function densityValues(base: string, file: string) {
  const dz = (readJson(join(base, file)) as { dz: Record<string, { $value: unknown }> }).dz;
  const text = (key: string, value: unknown) => {
    if (typeof value === 'string' || typeof value === 'number') return String(value);
    const one = value as { value?: unknown; unit?: unknown } | null;
    if (typeof one?.value === 'number' && typeof one.unit === 'string') return `${one.value}${one.unit}`;
    throw new Error(`generate-npm-pages: ${file} dz.${key} has a $value that is neither a string, a number nor { value, unit }`);
  };
  return (key: string) => dz[key] === undefined ? undefined : text(key, dz[key].$value);
}

export const DEFAULT_PLUGIN_DIR = 'plugin-style-store/default';
export const LAYOUT_ROLES = ['container-max', 'gutter', 'measure-prose'] as const;

export function layoutAnswers(base = root) {
  const plugin = readPlugin('default', readJson(join(base, DEFAULT_PLUGIN_DIR, PLUGIN_TOKENS)));
  const at = resolvedPlugin(plugin, tokenCatalogue(base));
  return LAYOUT_ROLES.map((role) => {
    const value = at.get(role);
    if (value === undefined) throw new Error(`generate-npm-pages: the default style plugin answers no ${role}`);
    return value;
  });
}

const CLI_PAGE = 'skills/design/references/cli.md';

export const REGION_TARGETS: Record<string, string[]> = {
  repository: ['frameworks/react/PACKAGE.md', 'frameworks/angular/PACKAGE.md'],
  skin: ['skills/design/references/config.md'],
  tokens: ['skills/design/references/tokens.md'],
  density: ['skills/design/references/tokens.md'],
  typography: ['skills/design/references/tokens.md'],
  defaults: ['skills/design/references/style-kernel.md'],
  sheets: ['skills/design/references/stylesheets.md'],
  locale: ['skills/design/references/locale.md'],
  toast: ['skills/design/references/exports.md'],
  queues: ['skills/design/references/exports.md'],
  audit: [CLI_PAGE],
  scriptsReact: [CLI_PAGE],
  scriptsAngular: [CLI_PAGE],
  questions: NPM_PAGES,
  layout: ['skills/design/references/style.md'],
};

export const TARGETS = [...new Set(Object.values(REGION_TARGETS).flat())];

export const node = {
  name: 'generate:npm-pages',
  reads: [...TARGETS, 'scripts/generate/core/arena-cli/audit.ts', 'scripts/generate/core/arena-cli/command-init.ts', 'scripts/lib/arena/language-rules.ts', `${DEFAULT_PLUGIN_DIR}/${PLUGIN_TOKENS}`, '.claude-plugin/plugin.json', 'scripts/generate/core/arena-cli/style-plugin-rules.ts', LOCALE_CONTRACT, ROLE_CONTRACT, BEHAVIOUR_CONTRACT, ...Object.values(DENSITY_CONTRACTS), THEME_SHEET, TOAST_NOTICE_CONTRACT, CONFIRM_REQUEST_CONTRACT, ...CSS_TARGETS, HUES_FILE, `${VOCABULARY_DIR}/**/*${FAMILY_SUFFIX}`],
  writes: TARGETS,
  feeds: [
    'build:angular-package',
    'build:contracts-package',
    'build:mcp-package', 'check:mcp',
    'build:react-package',
    'check:arbitrary',
    'check:classes',
    'check:community',
    'check:consumer',
    'check:contracts',
    'check:contracts-package',
    'check:dimensions',
    'check:duplicate-constants',
    'check:generated',
    'check:icons',
    'check:layer-independence',
    'check:packages',
    'check:routes',
    'check:script-tokens',
    'check:skills', 'check:support', 'build:site',
    'check:register', 'check:site'],
};

export const openLine = (key: string) => `<!-- @shared ${key} GENERATED by bun run generate:npm-pages.`
  + ' Edit that script, not this copy. -->';
export const closeLine = (key: string) => `<!-- @shared ${key} end -->`;
export const opensAt = (key: string) => new RegExp(`^<!-- @shared ${key} GENERATED `);

function initFence(layer: string) {
  const scripts = Object.fromEntries(wiredScripts(LAYER_SCRIPTS[layer]!));
  return ['```json', JSON.stringify({ scripts }, null, 2), '```'].join('\n');
}

export const REGIONS: Record<string, (base?: string, target?: string) => string> = {
  repository: () => `## This package ships the components and not the language

See it before you install it: **https://arena.dravensoft.org** has the guidelines, a kitchen sink
and a playground for every component. Source and full documentation:
**https://github.com/dravensoft-dev/arena**

**An agent building with Arena needs the language, and this tarball does not carry it.** Not the rules every component answers to, not the usage document of each one, and not the style kernel that makes Arena look like a project's own product. What is in here is the code, and
what markup of your own is held to: \`contracts/behaviour/\`, one file per accessibility
pattern, and \`arena.tokens.json\`.

**Reach the language before you ask for the first screen**, by any one of these routes. Install **\`@dravensoft/arena-mcp\`** and configure it in your editor. The server carries the whole corpus, both halves of it, and serves the one your project installed a document at a time. The server says so when its version and this package's differ. Install the **Claude Code plugin**. Clone the repository and
point your agent at \`skills/design/SKILL.md\`. Or work over HTTP, starting at
**https://arena.dravensoft.org/llms.txt**.

Without one of them an agent guesses. \`arena audit\` reads your own sources for the rules a source text can show, and nothing reports the rest. The screen renders, and the rules it breaks are the ones only a reader notices.

The package is the code. The server, the plugin and the repository are the language.`,

  tokens: (base = root) => {
    const groups = ['sp', 'r', 'bw', 'shadow', 'dur', 'loop', 'ease', 'z', 'bp'];
    const { tokens } = tokenCatalogue(base);
    const roles = new Set(Object.keys(readJson(join(base, ROLE_CONTRACT)) as Record<string, unknown>));
    const utilities = utilitiesOf(base, /^\s*--(spacing|radius|shadow|ease|z-index)-([a-z0-9-]+):\s*var\(--((?:sp|r|shadow|ease|z)-[a-z0-9-]+)\)\s*;/,
      (kind, name) => ({ spacing: `*-${name}`, radius: `rounded-${name}`, 'z-index': `z-${name}` })[kind] ?? `${kind}-${name}`);
    const unit = /^\s*--spacing:\s*var\(--([a-z0-9-]+)\)\s*;/m.exec(readFileSync(join(base, THEME_SHEET), 'utf8'))?.[1];
    const pixels = (name: string) => /^(-?[\d.]+)px$/.exec(String(tokens[name]))?.[1];
    const multiple = (name: string) => {
      const step = unit === undefined ? undefined : Number(pixels(name)) / Number(pixels(unit));
      return name.startsWith('sp-') && step !== undefined && Number.isFinite(step) ? `\`*-${step}\`` : undefined;
    };
    const rows = groups.flatMap((group) => Object.entries(tokens)
      .filter(([name]) => !roles.has(name) && (name === group || name.startsWith(`${group}-`)))
      .map(([name, value]) => `| \`--${name}\` | \`${value}\` | ${multiple(name) ?? utilities.get(name)?.join(', ') ?? 'none'} |`));
    return ['`*-` stands for any spacing utility, such as `h-` or `py-`. The sheet sets the spacing base to `--sp-1`, so a spacing utility resolves as its number times that step. A row marked `none` has no utility that reads its token. Where the sheet resets a Tailwind default scale (radius, shadow, ease and z-index), a utility of that default, such as `shadow-md`, emits nothing and reports nothing. The `sm:`, `md:` and `lg:` variants keep Tailwind\'s own widths, not the `--bp-*` values.', '',
      '| custom property | value | Tailwind |', '| --- | --- | --- |', ...rows].join('\n');
  },

  density: (base = root) => {
    const { tokens } = tokenCatalogue(base);
    const compact = densityValues(base, DENSITY_CONTRACTS.compact);
    const comfortable = densityValues(base, DENSITY_CONTRACTS.comfortable);
    const utilities = utilitiesOf(base, /^\s*--(spacing|text|leading)-([a-z0-9-]+):\s*([^;]*var\(--dz-[^;]*);/,
      (kind, name) => kind === 'spacing' ? `*-${name}` : `${kind}-${name}`,
      (match) => [...match[3]!.matchAll(/var\(--dz-([a-z0-9-]+)\)/g)].map((one) => one[1]!));
    const shown = (value: string | undefined) => value === undefined ? 'base' : `\`${cell(value)}\``;
    const sizes = (readJson(join(base, 'contracts/design/spacing.json')) as { dz: Record<string, { $description?: string }> }).dz;
    const rows = Object.entries(tokens).filter(([name]) => name.startsWith('dz-')).map(([name, value]) => {
      const key = name.slice(3);
      const reads = utilities.get(key)?.join(', ') ?? 'none';
      const sized = sizes[key]?.$description?.split(/\. /)[0]?.replace(/\.$/, '');
      if (!sized) throw new Error(`generate-npm-pages: contracts/design/spacing.json dz.${key} has no $description to say what it sizes`);
      return `| \`--${name}\` | \`${value}\` | ${shown(compact(key))} | ${shown(comfortable(key))} | ${reads} | ${cell(sized)} |`;
    });
    return ['`*-` stands for any spacing utility, such as `h-` or `py-`.', '',
      '| custom property | base | .arena-compact | .arena-comfortable | Tailwind | what it sizes |', '| --- | --- | --- | --- | --- | --- |', ...rows].join('\n');
  },

  typography: (base = root) => {
    const { tokens } = tokenCatalogue(base);
    const roles = new Set(Object.keys(readJson(join(base, ROLE_CONTRACT)) as Record<string, unknown>));
    const utilities = utilitiesOf(base, /^\s*--(font-weight|font|text|leading|tracking)-([a-z0-9-]+):\s*var\(--((?:font|fw|fs|lh|ls)-[a-z0-9-]+)\)/,
      (kind, name) => kind === 'font-weight' ? `font-${name}` : `${kind}-${name}`);
    const rows = TYPE_GROUPS.flatMap((group) => Object.entries(tokens)
      .filter(([name]) => !roles.has(name) && (name === group || name.startsWith(`${group}-`)))
      .map(([name, value]) => `| \`--${name}\` | \`${value}\` | ${utilities.get(name)?.join(', ') ?? 'none'} |`));
    return ['| custom property | value | Tailwind |', '| --- | --- | --- |', ...rows].join('\n');
  },

  toast: (base = root) => {
    const { standard, actionable } = toastIntervals(base);
    return `**A notice leaves on one of three branches.** The default interval is ${standard}. The interval for a notice carrying an \`actionLabel\` is ${actionable}, because that notice asks the reader to decide and not only to read. A notice raised with \`persist\`, or with \`tone: 'danger'\`, has no timer at all and stays until it is dismissed. A \`danger\` notice ignores a \`persist\` of false.`;
  },

  queues: (base = root) => `**\`raise(notice)\` takes an \`ArenaToastNotice\`.** ${requiredLead(base, TOAST_NOTICE_CONTRACT)}

${fieldTable(base, TOAST_NOTICE_CONTRACT)}

**\`ask(request)\` takes an \`ArenaConfirmRequest\`.** ${requiredLead(base, CONFIRM_REQUEST_CONTRACT)}

${fieldTable(base, CONFIRM_REQUEST_CONTRACT)}`,

  audit: () => {
    const rows = RULE_TAGS.map((tag) => {
      const held = RULES.filter((rule) => rule.held === tag).map((rule) => rule.short);
      return `| \`${tag}\` | ${held.length ? cell(held.join(' ')) : 'none of the language rules'} | ${cell(RULE_DESCRIPTIONS[tag])} |`;
    });
    return ['| tag | the rule it reports | what fires it |', '| --- | --- | --- |', ...rows].join('\n');
  },

  scriptsReact: () => initFence('@dravensoft/arena-react'),

  scriptsAngular: () => initFence('@dravensoft/arena-angular'),

  sheets: (base = root) => {
    const families = sheetFamilies(base).map((one) => one.family).sort().map((family) => `\`${packageSheetName(family)}\``);
    const tokens = CSS_CHAIN.map(({ to }) => (to === PLUGIN_SHEET
      ? `the slot your style plugin's sheet takes (\`${to}\` until you write one)`
      : `\`${to}\``));
    const SHEETS_PER_SENTENCE = 20;
    const chunks = Array.from({ length: Math.ceil(families.length / SHEETS_PER_SENTENCE) },
      (_, at) => families.slice(at * SHEETS_PER_SENTENCE, (at + 1) * SHEETS_PER_SENTENCE).join(', '));
    const sheetList = chunks.join('. Further sheets in that directory are ');
    const listed = `${tokens.slice(0, -1).join(', ')} and ${tokens.at(-1)}`;
    const hues = readJson(join(base, HUES_FILE)) as { hues: Record<string, Record<string, string>> };
    const channels = [...new Set(Object.values(hues.hues).flatMap((one) => Object.keys(one)))].map((name) => `\`--arena-hue-${name}\``);
    const channelList = `${channels.slice(0, -1).join(', ')} and ${channels.at(-1)}`;
    return `| stylesheet | what it is |
| --- | --- |
| \`css/base.css\` | the browser reset and nothing of Arena's. Arena needs one: without \`button, input, select, textarea { font: inherit }\` a control falls back to the browser's 13.33px Arial. Every control in the library is then 20% off, with nothing to tell you. Keep yours or keep this one, but keep one |
| \`css/components.css\` | every component Arena draws |
| \`css/components/<name>.css\` | one component, named for its sheet as \`arena-button.css\` or \`arena-stat-card.css\`. Each imports the prelude it needs itself, so importing one alone is safe |
| \`css/hues/<name>.css\` | a component's hue sheet, imported by its sheet, writing ${channelList} from the component's \`data-arena\` values, or unconditionally on a slot whose hue no value varies |
| \`css/vocabulary/\` | One sheet per family on the vocabulary page: ${sheetList}. \`arena.css\` imports them. A project importing component sheets one by one imports these too, or a vocabulary class does nothing |
| \`css/tailwind-theme.css\` | Arena's theme and utilities for markup of your own compiled with \`tailwindcss\` v4. Import it right after \`@import 'tailwindcss'\`: every utility then resolves to Arena's scale, \`case-eyebrow\`, \`case-label\`, \`fit-media\` and the animation utilities are available, and the compiler's own defaults are unreachable. A key of yours survives only below this import. The sheet's \`sm:\`, \`md:\` and \`lg:\` variants and their \`max-*\` complements sit at the \`--bp-*\` thresholds the viewport helper reads. A wide frame marked \`max-md:hidden\` and a phone frame marked \`md:hidden\` are therefore right at the first paint, a server's HTML included |

**The rest of what ships under \`css/\` is not a choice.** The token layer is these sheets, in this order: ${listed}. \`arena.css\` imports them in the order they have to be in, and \`css/prelude.css\` is what a single component sheet pulls in for itself. The one that IS a decision is \`css/style-plugin-default.css\`, the appearance this package installs with. The sheet arrives through \`arena.css\` like the rest. A \`stylePlugins\` list of your own that does not name \`default\` does not receive it, which is the point of writing one.`;
  },

  skin: (base = root) => {
    const reserved = RESERVED.size === 0
      ? 'No name is held ahead for a class Arena is going to ship.'
      : `The names held for a class Arena is going to ship are \`${[...RESERVED.keys()].join(', ')}\`.`;
    return `## Declare your skin

**A palette is not an appearance.** Arena keeps its questions about shape, space, weight and depth, and the answers are a style plugin your project writes. The config below decides which colours a surface takes, and none of how round, how tight or how heavy the product is. That decision is paid
once per project and belongs before the first screen, and
[\`style-kernel.md\`](./style-kernel.md) is where it is made.

Write \`arena.config.json\` in your project root. The block below is the whole file, with one palette and three fonts served by Google Fonts. The file is enough to start:

\`\`\`json
{
  "palettes": [
    {
      "name": "dark",
      "default": true,
      "polarity": "dark",
      "colors": {
        "base-100": "#141010",
        "base-200": "#1d1715",
        "base-300": "#241c19",
        "base-content": "#f3ede5",
        "primary": "#b52a20",
        "primary-content": "#ffffff",
        "primary-fill": "#b52a20",
        "secondary": "#c5a059",
        "secondary-content": "#141010",
        "neutral": "#2c221e",
        "neutral-content": "#d8cfc4",
        "info": "#3182ce",
        "info-content": "#141010",
        "success": "#38a169",
        "success-content": "#141010",
        "warning": "#ecc94b",
        "warning-content": "#141010",
        "error": "#e85151",
        "error-content": "#ffffff",
        "error-fill": "#ce3838",
        "cat-1": "#3c7b0a",
        "cat-2": "#3b63be",
        "cat-3": "#0a924b",
        "cat-4": "#6a59bc",
        "cat-5": "#00a3c0",
        "cat-6": "#884da9",
        "cat-7": "#00a99a",
        "cat-8": "#984697"
      }
    }
  ],
  "fonts": {
    "display": { "family": "Archivo", "src": "https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800;900&display=swap" },
    "body": { "family": "Familjen Grotesk", "src": "https://fonts.googleapis.com/css2?family=Familjen+Grotesk:wght@400;500;600;700;800;900&display=swap" },
    "mono": { "family": "Spline Sans Mono", "src": "https://fonts.googleapis.com/css2?family=Spline+Sans+Mono:wght@400;500;600;700;800;900&display=swap" }
  },
  "stylePlugins": ["default"]
}
\`\`\`

\`arena.config.example.json\`, which each package ships at its root, is the same file with two palettes, one dark and one light, ready to copy and edit. The full examples are \`plugin-style-store/catalogue/*/arena.config.json\`, listed in [\`INDEX.md\`](../../../plugin-style-store/catalogue/INDEX.md).

Every key, with its type and its default:

${configKeyTable()}

**\`stylePlugins\` is in that block because leaving it out is a decision and not a blank.** The value above is the appearance this package installs with, which is Dravensoft's. A project that means to look like itself replaces it with the path to a plugin directory of its own. Both
are finished answers; only one of them is one somebody made.

What each part means:

- **\`palettes\`** is an array, so declare as many as you want. Exactly one is the \`default\` and
  reaches \`:root\`; every other one becomes a class, \`.arena-<name>\`, that you put on
  \`<html>\` to switch skin. The command refuses a palette or style plugin named after a class Arena
  ships or is going to ship, naming the component a future class belongs to. ${reserved} A palette may still take its own polarity's name, \`dark\` or \`light\`, and a style plugin may not. A palette name is kebab-case, and a name declared twice is refused.
- **\`polarity\`** is \`dark\` or \`light\`. The polarity decides the native date picker's colour, and it is what a first visit matches \`prefers-color-scheme\` against.
- **\`colors\`** takes every key above, each a six-digit hex such as \`#141010\`. \`error-fill\`, \`primary-fill\` and the heat steps are optional. Leave
  \`error-fill\` out and Arena darkens \`error\` in oklab for the single filled danger surface it has. Leave \`primary-fill\` out and every ground \`primary-content\` sits on, a filled button, a checked box, a current page, fills with \`primary\`. Declare it when the accent you tuned to read as ink on your page cannot also carry \`primary-content\`. A violet light enough to read on a dark page is too light to carry white. Name a deeper violet here and keep the light one as \`primary\`.
- **\`cat-1\`** through **\`cat-8\`** are the chart ramp. The order of the slots is their identity, so slot 3 is always slot 3. The slots are never used to mean anything, only to tell series apart.
- **\`heat-1\`** through **\`heat-5\`** are a heatmap's ladder. Pin all five or none: left out, they are derived from \`cat-4\`, \`base-200\` and \`base-content\`.
- **\`fonts\`** fills the three families Arena reads. \`src\` takes either a stylesheet URL, as
  above, or a font binary you host yourself, which becomes an \`@font-face\`:
  \`{ "family": "Archivo", "src": "/fonts/archivo.woff2", "weight": "400 900" }\`.
- **\`stylesheet\`** is optional and names what you render, so you send nothing else. See
  Build to production, below.
- **\`stylePlugins\`** names the appearance. **\`["default"]\`, or leaving the key out, is a finished answer** rather than a step somebody has not taken yet. The answer is the right one for a first screen, for a prototype, and for a tool nobody outside the team looks at. What it leaves
  unresolved is the appearance: the product wears the answers this package installs with, and every
  project stopping there looks like every other one. Writing one of your own is what makes the
  corners, the weights, the borders, the depth and the internal air the product's own, with no
  component rewritten to get there.
  The key is a list, because a build can carry more than one register. The first entry is what a page with no class on it looks like. Every later one emits under \`.arena-<name>\`, which you put on \`<html>\` beside any palette class, and is a difference. An entry is the word
  \`default\`, which is the appearance this package installs with, or a path to a directory of
  your own holding \`plugin.tokens.json\` and optionally \`plugin.css\`. A \`stylePlugins\` path resolves against the directory that holds \`arena.config.json\`. The plugin's name is the name of that directory, so a directory called \`ember\` declares the plugin \`ember\`. The name must be kebab-case, and it may not repeat a palette name or another plugin's. The first entry answers every role that carries no default. ${defaultsStatement(base)} A custom property with no value is invalid at computed-value time, so an unanswered role is a missing border rather than a plainer look. Declare a list without \`default\` and you do not receive its stylesheet, the
  same way the preflight can already be dropped.
- **\`gradientMark\`** is optional, a boolean, and says the mark your product is drawn with is a
  gradient. Arena ships no element that is one, so yours lives in your own CSS, where \`arena audit\` reports it. The scope reads which directory a line sits in, which is right for a part hook and wrong for a brand. Declare it once and that rule goes quiet in your sources; the colours inside
  the gradient are still reported, since they are the skin. The key replaces an \`arena-audit allow\` marker, which silences every rule on its line and is repeated wherever the mark is drawn.

**A plugin carrying a \`plugin.css\` gets a third generated file**, \`plugin.generated.css\`, and
you import it beside the other two. The sheet declares the cascade layer order itself and then opens the reserved layer. Where your bundler places it among your other stylesheets cannot change what wins.`;
  },

  defaults: (base = root) => defaultsStatement(base),

  locale: (base = root) => {
    const contract = readJson(join(base, LOCALE_CONTRACT)) as {
      fields: Record<string, { default: string; description: string }>;
    };
    const outranks = localeMembers(base);
    const rows = Object.entries(contract.fields)
      .map(([name, field]) => `| \`${name}\` | \`${cell(field.default)}\` | ${cell(field.description)} | ${outranks.get(name)?.map((member) => `\`${member}\``).join(', ') ?? 'none'} |`);
    return ['Every field is optional in what you provide, and one you leave out keeps the default below. A member in the last column outranks its field on that component.', '',
      '| field | English default | what it names | member that outranks it |', '| --- | --- | --- | --- |', ...rows].join('\n');
  },

  questions: (base = root, target = '') => renderQuestions(target, base),

  layout: (base = root) => {
    const [container, gutter, measure] = layoutAnswers(base);
    return `The default style plugin answers \`container-max\` with ${container}, \`gutter\` with ${gutter} and \`measure-prose\` with ${measure}. The three values are that plugin's answers, not Arena's constants: another plugin answers its own, and a release may change them.`;
  },
};

export function renderRegion(key: string, base = root, target = '') {
  const render = REGIONS[key];
  if (!render) throw new Error(`generate-npm-pages: no region called ${key}`);
  return [openLine(key), '', render(base, target), '', closeLine(key)].join('\n');
}

export function applyRegion(source: string, key: string, region: string) {
  const lines = source.split('\n');
  const from = lines.findIndex((line) => opensAt(key).test(line));
  if (from === -1)
    throw new Error(
      `generate-npm-pages: no @shared ${key} region to write into. A person places the markers, `
      + 'because where a section sits on a page a consumer reads is the page\'s decision and only '
      + 'what the section says belongs to this script.',
    );
  const to = lines.indexOf(closeLine(key), from);
  if (to === -1) throw new Error(`generate-npm-pages: the @shared ${key} region opens and never closes`);
  return [...lines.slice(0, from), ...region.split('\n'), ...lines.slice(to + 1)].join('\n');
}

export const regionsOf = (target: string) => Object.keys(REGIONS)
  .filter((key) => REGION_TARGETS[key]?.includes(target));

export function renderTarget(source: string, target: string, base = root) {
  return regionsOf(target).reduce(
    (text, key) => applyRegion(text, key, renderRegion(key, base, target)), source,
  );
}

export function writePages({ base = root, read = readFileSync, write = writeFileSync } = {}) {
  const written = [];
  for (const target of TARGETS) {
    const path = join(base, target);
    const before = read(path, 'utf8');
    const after = renderTarget(before, target, base);
    if (after === before) continue;
    write(path, after);
    written.push(target);
  }
  return written;
}

function main() {
  const written = writePages();
  for (const target of written) console.log(`generate-npm-pages: wrote ${target}`);
  console.log(`generate-npm-pages: ${TARGETS.length} target(s) carry their generated regions`);
}

if (isMainModule(import.meta.url)) main();
