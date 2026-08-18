/* Writes two regions into the component's own prompt, between markers this script owns. @api is
 * every contracted member as a table, under the names the layer binds them to, so a wrong cell is
 * fixed in the contract rather than here. @rules is a foot note pointing back at the router: a
 * prompt is the file an agent rereads deepest into a session, when the router carrying the rules
 * has long left its context, so the drift it answers is distance and it re-anchors and points
 * rather than restating a rule that would then live in 118 places. It is owed to every prompt,
 * uncontracted ones included, and all of them sit at one depth, so ROUTER_FROM_PROMPT is a
 * constant rather than a computation. The prose between the two stays hand-written, the way
 * generate-member-docs.ts holds a member's doc comment, and check:prompts holds both equal to a
 * fresh emit. */

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { bindingName, normaliseDoc } from '../../lib/arena/api-surface.ts';
import type { ContractCandidate, MemberCandidate } from '../../lib/arena/contract-shapes.ts';
import {
  CONSUMER_LAYERS, componentDir, loadCategories, loadContract, escapeCell,
} from './generate-skills.ts';
import { captured } from '../../utils/captures.ts';

export const PROMPTS = CONSUMER_LAYERS.map((layer) => `frameworks/${layer}/components/**/*.prompt.md`);

export const node = {
  name: 'generate:prompt-api',
  reads: ['contracts/api/components', 'frameworks/Components.json', ...PROMPTS],
  writes: PROMPTS,
  feeds: [
    'build:angular-package',
    'build:react-package',
    'check:appearance',
    'check:parts',
    'check:arbitrary',
    'check:behaviour',
    'check:compliance',
    'check:dimensions',
    'check:duplicate-constants',
    'check:focus-trap',
    'check:generated',
    'check:icons',
    'check:layer-independence',
    'check:playgrounds',
    'check:prompts',
    'check:routes',
    'check:script-tokens',
    'check:shared-arithmetic',
    'check:skills',
    'check:states',
    'build:site',
  ],
};

export const CONSUMER_DATA = 'Record<string, unknown>';

export const OPEN_LINE = /^<!-- @api GENERATED from [^\n]*-->$/m;
export const CLOSE_LINE = '<!-- @api end -->';

export const openLine = (component: string) => `<!-- @api GENERATED from contracts/api/components/${component}.json.`
  + ' Edit the contract, not this table. -->';

export const RULES_OPEN_LINE = /^<!-- @rules GENERATED[^\n]*-->$/m;
export const RULES_CLOSE_LINE = '<!-- @rules end -->';

export const RULES_OPEN = '<!-- @rules GENERATED for every prompt from one source.'
  + ' Edit it there, not here. -->';

export const ROUTER_FROM_PROMPT = '../../../../../skills/design/SKILL.md';

export const OWN_CLASS_ATTR: Record<string, string> = { react: 'className', angular: 'class' };

export function renderRulesRegion(layer: string) {
  return [
    RULES_OPEN,
    '',
    '**The rules of the language hold in the code you write from this page, and no gate reads your '
    + `application to enforce them.** An Arena component is not a styling surface: put no \`${
      OWN_CLASS_ATTR[layer] ?? 'class'}\` of your own on it, read every value through its token `
    + 'rather than a raw colour or a bare `16px`, and never wrap it in your router\'s own link. The '
    + `rest of the rules are in [\`${ROUTER_FROM_PROMPT}\`](${ROUTER_FROM_PROMPT}).`,
    '',
    RULES_CLOSE_LINE,
  ].join('\n');
}

const OPENS_FENCE = /^ {0,3}(`{3,}|~{3,})/;
const CLOSES_FENCE = /^ {0,3}(`+|~+)[ \t]*$/;

export function typeOf(name: string | undefined) {
  return name === 'consumerData' ? CONSUMER_DATA : name ?? '';
}

export function signature(params = {}) {
  return (Object.entries(params) as [string, string][])
    .map(([name, type]) => `${name}: ${typeOf(type)}`).join(', ');
}

export function typeCell(spec: MemberCandidate) {
  if (spec.form === 'array') return `\`readonly ${typeOf(spec.of)}[]\``;
  if (spec.form === 'consumerData') return `\`${CONSUMER_DATA}\``;
  if (spec.form === 'functionInput') return `\`(${signature(spec.params)}) => ${typeOf(spec.returns)}\``;
  if (spec.form === 'event') return spec.payload ? `\`${typeOf(spec.payload)}\`` : '';
  if (spec.form === 'slot') return spec.params ? `\`(${signature(spec.params)})\`` : '';
  return spec.type ? `\`${spec.type}\`` : '';
}

export function defaultCell(spec: MemberCandidate) {
  return spec.default === undefined ? '' : `\`${escapeCell(JSON.stringify(spec.default))}\``;
}

export function memberRow(name: string, spec: MemberCandidate, layer: string) {
  const bound = bindingName(name, spec.form ?? '', layer);
  return `| \`${bound}${spec.required ? '*' : ''}\` | ${spec.form} | ${typeCell(spec)} | ${
    defaultCell(spec)} | ${escapeCell(normaliseDoc(spec.description ?? ''))} |`;
}

export function renderRegion(contract: ContractCandidate, layer: string) {
  const members = Object.entries(contract.api ?? {});
  const lines = [
    openLine(contract.component ?? ''),
    '',
    members.length === 0
      ? '**Members.** This component declares none: everything it draws, it decides.'
      : '**Members**, in contract order and under this layer\'s own names. `*` marks a required one.',
  ];
  if (members.length > 0) {
    lines.push('');
    lines.push('| Member | Form | Type | Default | What it is |');
    lines.push('|---|---|---|---|---|');
    for (const [name, spec] of members) lines.push(memberRow(name, spec, layer));
  }
  lines.push('');
  lines.push(CLOSE_LINE);
  return lines.join('\n');
}

export function fenceEnd(source: string) {
  const lines = source.split('\n');
  let fence = null;
  for (let i = 0; i < lines.length; i += 1) {
    const closing = CLOSES_FENCE.exec(lines[i] ?? '');
    const run = closing ? captured(closing) : '';
    if (fence && closing && run[0] === fence[0] && run.length >= fence.length) return i;
    if (fence) continue;
    const opening = OPENS_FENCE.exec(lines[i] ?? '');
    if (opening) fence = opening[1];
  }
  return -1;
}

export function applyRegion(source: string, region: string) {
  const lines = source.split('\n');
  const opensAt = lines.findIndex((line) => OPEN_LINE.test(line));

  if (opensAt !== -1) {
    const closesAt = lines.indexOf(CLOSE_LINE, opensAt);
    if (closesAt === -1) throw new Error('generate-prompt-api: an @api region opens and never closes');
    return [...lines.slice(0, opensAt), ...region.split('\n'), ...lines.slice(closesAt + 1)].join('\n');
  }

  const after = fenceEnd(source);
  if (after === -1) throw new Error('generate-prompt-api: no fenced example to place the region after');
  return [...lines.slice(0, after + 1), '', ...region.split('\n'), ...lines.slice(after + 1)].join('\n');
}

export function applyRulesRegion(source: string, region: string) {
  const lines = source.split('\n');
  const opensAt = lines.findIndex((line) => RULES_OPEN_LINE.test(line));

  if (opensAt !== -1) {
    const closesAt = lines.indexOf(RULES_CLOSE_LINE, opensAt);
    if (closesAt === -1) throw new Error('generate-prompt-api: a @rules region opens and never closes');
    return [...lines.slice(0, opensAt), ...region.split('\n'), ...lines.slice(closesAt + 1)].join('\n');
  }

  return `${source.replace(/\s*$/, '')}\n\n${region}\n`;
}

export function promptPaths(base = root) {
  const categories = loadCategories(base);
  const found = [];
  for (const [category, components] of Object.entries(categories) as [string, string[]][]) {
    for (const component of components) {
      for (const layer of CONSUMER_LAYERS) {
        const path = join(componentDir(layer, category, component), `${component}.prompt.md`);
        if (existsSync(join(base, path))) found.push({ component, layer, path });
      }
    }
  }
  return found;
}

export function writePromptApis({
  base = root, read = readFileSync, write = writeFileSync, prompts = promptPaths(base),
} = {}) {
  const written = [];
  for (const { component, layer, path } of prompts) {
    const contract = loadContract(component, base);
    const before = read(join(base, path), 'utf8');
    const withApi = contract ? applyRegion(before, renderRegion(contract, layer)) : before;
    const after = applyRulesRegion(withApi, renderRulesRegion(layer));
    if (after !== before) { write(join(base, path), after); written.push(path); }
  }
  return written;
}

function main() {
  const written = writePromptApis();
  for (const path of written) console.log(`generate-prompt-api: wrote ${path}`);
  console.log(`generate-prompt-api: ${written.length} prompt(s) updated`);
}

if (isMainModule(import.meta.url)) main();
