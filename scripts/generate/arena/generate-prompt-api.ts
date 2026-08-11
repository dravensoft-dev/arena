/* Writes every contracted member into the component's own prompt as a table, under the names
 * the layer binds them to, between markers this script owns. A prompt's prose stays
 * hand-written: this region is the one part of it a contract can hold to, the way
 * generate-member-docs.ts holds a member's doc comment. check:prompts then holds every region
 * equal to a fresh emit, so the table a consumer reads cannot drift from the API it describes,
 * and a wrong cell is fixed in the contract rather than here. */

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
  ],
};

export const CONSUMER_DATA = 'Record<string, unknown>';

export const OPEN_LINE = /^<!-- @api GENERATED from [^\n]*-->$/m;
export const CLOSE_LINE = '<!-- @api end -->';

export const openLine = (component: string) => `<!-- @api GENERATED from contracts/api/components/${component}.json.`
  + ' Edit the contract, not this table. -->';

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
    if (!contract) continue;
    const before = read(join(base, path), 'utf8');
    const after = applyRegion(before, renderRegion(contract, layer));
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
