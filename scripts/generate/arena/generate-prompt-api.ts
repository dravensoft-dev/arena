/* Writes three regions into the component's own prompt, between markers this script owns. @api is
 * every contracted member as a table, so a wrong cell is fixed in the contract. @answers names the
 * families its own manifest answers, linked to their rows. @rules points back at the router, since
 * a prompt is what an agent rereads deepest into a session; it is owed to every prompt and all sit
 * at one depth, so ROUTER_FROM_PROMPT is a constant. The prose between stays hand-written, and
 * check:prompts holds all three regions equal to a fresh emit. */

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
import { readFamilies, answerOf, answeredFamilies as answeredNames, VOCABULARY_DIR, type Family } from '../../lib/tailwind/vocabulary.ts';
import { manifestFor } from '../../lib/tailwind/manifest-surfaces.ts';
import { readManifests } from '../../check/arena/check-measured-box.ts';

export const PROMPTS = CONSUMER_LAYERS.map((layer) => `frameworks/${layer}/components/**/*.prompt.md`);

export const node = {
  name: 'generate:prompt-api',
  reads: ['contracts/api/components', 'frameworks/Components.json', VOCABULARY_DIR,
    'frameworks/tailwind/components', ...PROMPTS],
  writes: PROMPTS,
  feeds: [
    'build:angular-package',
    'build:react-package',
    'build:mcp-package',
    'check:appearance',
    'check:parts',
    'check:arbitrary',
    'check:behaviour',
    'check:support',
    'check:community',
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
    'check:register'],
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

export const ANSWERS_OPEN_LINE = /^<!-- @answers GENERATED[^\n]*-->$/m;
export const ANSWERS_CLOSE_LINE = '<!-- @answers end -->';
export const ANSWERS_OPEN = '<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest\'s answers, not this line. -->';
export const VOCABULARY_FROM_PROMPT = '../../../../VOCABULARY.md';

export const ROUTER_FROM_PROMPT = '../../../../../skills/design/SKILL.md';

export const OWN_CLASS_ATTR: Record<string, string> = { react: 'className', angular: 'class' };

export function renderRulesRegion(layer: string) {
  return [
    RULES_OPEN,
    '',
    '**The rules of the language hold in the code you write from this page.** An Arena component '
    + `takes a class of the vocabulary and no other, so put no \`${OWN_CLASS_ATTR[layer] ?? 'class'}\` of your own on `
    + 'it. Read every value through its token, never a raw colour and never a bare `16px`. Never '
    + 'wrap it in your router\'s own link. `arena-to-prod --audit` reports these three in your '
    + `sources. The rest are in [\`${ROUTER_FROM_PROMPT}\`](${ROUTER_FROM_PROMPT}), which marks the `
    + 'ones it reports.',
    '',
    RULES_CLOSE_LINE,
  ].join('\n');
}

export type { Family };

export type AnsweredFamily = Family & { answer?: { options: readonly string[]; default: string } };

export function renderAnswersRegion(component: string, layer: string, answered: readonly AnsweredFamily[]) {
  const attribute = OWN_CLASS_ATTR[layer] ?? 'class';
  const body = answered.length === 0
    ? `**Answers.** No family of the [vocabulary](${VOCABULARY_FROM_PROMPT}) decides anything in this component's own box.`
    : answered.map((family) => {
      const options = [...(family.answer?.options ?? Object.keys(family.variants))].sort();
      const own = family.answer?.default ?? family.default;
      const listed = options.map((one) => (one === own ? `\`${one}\` (default)` : `\`${one}\``)).join(', ');
      const shown = options.find((one) => one !== own) ?? options[0];
      return `**Answers** [\`${family.family}\`](${VOCABULARY_FROM_PROMPT}#${family.family}): ${listed}. `
        + `Write one as \`${attribute}="${shown}"\` on the component, or on a container whose components should all take it.`;
    }).join('\n\n');
  return [ANSWERS_OPEN, '', body, '', ANSWERS_CLOSE_LINE].join('\n');
}

export function applyAnswersRegion(source: string, region: string) {
  const lines = source.split('\n');
  const opensAt = lines.findIndex((line) => ANSWERS_OPEN_LINE.test(line));
  if (opensAt !== -1) {
    const closesAt = lines.indexOf(ANSWERS_CLOSE_LINE, opensAt);
    if (closesAt === -1) throw new Error('generate-prompt-api: an @answers region opens and never closes');
    return [...lines.slice(0, opensAt), ...region.split('\n'), ...lines.slice(closesAt + 1)].join('\n');
  }
  const after = lines.indexOf(CLOSE_LINE);
  if (after === -1) return `${source.replace(/\s*$/, '')}\n\n${region}\n`;
  return [...lines.slice(0, after + 1), '', ...region.split('\n'), ...lines.slice(after + 1)].join('\n');
}

export function answeredFamilies(
  component: string, base = root,
  families = readFamilies(base), manifests = readManifests(base),
): AnsweredFamily[] {
  const owner = manifestFor(component, base);
  const manifest = owner ? manifests.get(owner) : undefined;
  if (!manifest || manifest.component !== component) return [];
  return answeredNames(manifest).flatMap((name) => {
    const family = families.get(name);
    if (!family) return [];
    const answer = answerOf(manifest, family);
    return [answer ? { ...family, answer } : family];
  });
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
  const families = readFamilies(base);
  const manifests = readManifests(base);
  for (const { component, layer, path } of prompts) {
    const contract = loadContract(component, base);
    const before = read(join(base, path), 'utf8');
    const withApi = contract ? applyRegion(before, renderRegion(contract, layer)) : before;
    const withAnswers = applyAnswersRegion(
      withApi, renderAnswersRegion(component, layer, answeredFamilies(component, base, families, manifests)),
    );
    const after = applyRulesRegion(withAnswers, renderRulesRegion(layer));
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
