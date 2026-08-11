/* GENERATED-file writer. Emits the consumer branch's index tree: frameworks/SKILL.md, which
 * says what Arena ships and how it is classified, and one frameworks/<layer>/SKILL.md, which
 * names each member as that layer binds it and links the prompt beside the component. Every
 * column is derived, so no page can disagree with the contracts, and check:skills fails a
 * stale one. They are tracked because the plugin is served from the git tag, where nothing
 * runs a build, and they carry no frontmatter: a nested file is reached by link rather than
 * registered, and the plugin root's SKILL.md is the one that is a skill. */

import { writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { kebab } from '../../utils/case.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { bindingCases } from '../../lib/arena/behaviour-contracts.ts';
import { memberEntries } from '../../lib/arena/contract-shapes.ts';
import type { ContractCandidate } from '../../lib/arena/contract-shapes.ts';
import { bindingName } from '../../lib/arena/api-surface.ts';

export const CONSUMER_LAYERS = LAYERS.filter((layer) => layer !== 'tailwind');

export const INDEX_TARGET = 'frameworks/SKILL.md';

export const layerTarget = (layer: string) => `frameworks/${layer}/SKILL.md`;

export const SKILL_TARGETS = [INDEX_TARGET, ...CONSUMER_LAYERS.map(layerTarget)];

export const node = {
  name: 'generate:skills',
  reads: [
    'frameworks/Components.json',
    'contracts/api/components',
    ...CONSUMER_LAYERS.map((layer) => `frameworks/${layer}/components/**/*.behaviour.json`),
  ],
  writes: SKILL_TARGETS,
  feeds: [
    'build:angular-package',
    'build:react-package',
    'check:arbitrary',
    'check:dimensions',
    'check:duplicate-constants',
    'check:generated',
    'check:icons',
    'check:layer-independence',
    'check:routes',
    'check:script-tokens',
    'check:skills',
  ],
};

const GENERATED = '<!-- GENERATED from the contracts by bun run generate:skills.'
  + ' Edit the contracts, not this file. -->';

export const PACKAGES: Record<string, string> = {
  react: '@dravensoft/arena-react',
  angular: '@dravensoft/arena-angular',
};

export const LAYER_TITLE: Record<string, string> = {
  react: 'React',
  angular: 'Angular',
};

export const LAYER_IDIOM: Record<string, string> = {
  react: `\`\`\`tsx
import { ArenaButton, ArenaTag } from '${PACKAGES.react}';
\`\`\`

A member is a prop. The main slot is \`children\`, a named slot is a prop taking a node, and an
event is an \`on\`-prefixed handler. An icon is a Phosphor class-name string, never an element.`,
  angular: `\`\`\`ts
import { ArenaButton, ArenaTag } from '${PACKAGES.angular}';
\`\`\`

Every component is standalone: put its class in the host component's \`imports\`, then write its
\`arena-\` element. A member is a signal input, an event is an output under the name the contract
gives it, and the main slot is content projection. A named slot is a marker directive, which goes
in \`imports\` as well, because a component cannot tell an un-imported marker from an unfilled
slot. An icon is a Phosphor class-name string, never an element.`,
};

const INDEX_HEADER = `${GENERATED}

# Arena components

Every component Arena ships, by the category it is filed under. **This page answers one question:
whether a component exists at all, and which layers ship it.** It is not a stop on the way to
writing one: what a member is called where you are building, and how to write it, is your own
layer's index and then the component's own prompt, and reading this page first buys nothing when
you already know what you are reaching for.

| Layer | Index | Package |
|---|---|---|
${CONSUMER_LAYERS
    .map((layer) => `| ${LAYER_TITLE[layer]} | [\`${layer}/SKILL.md\`](./${layer}/SKILL.md) | \`${PACKAGES[layer]}\` |`)
    .join('\n')}

- **Takes** is the members its API contract declares, in contract order, under the neutral names
  the contract gives them. A member marked \`*\` is required. Your layer's index gives the name
  each one binds to there, and the component's own prompt gives its type and its default.
- **Behaviour** is the accessibility pattern the component binds. \`none\` means no pattern
  applies, which is a claim the binding argues rather than an omission.
- **Layers** is which layers ship the component today.`;

export function layerHeader(layer: string) {
  return `${GENERATED}

# Arena components, the ${LAYER_TITLE[layer]} layer

Every component this layer ships, by category, under the names it binds them to. **This page is
an index, not a manual.** How to write one is its own prompt, linked in the last column.

Import from the package root, never from a path inside it:

${LAYER_IDIOM[layer]}

- **Which voice this application takes, which is decided before any component here**:
  [\`../../SKILL.md\`](../../SKILL.md). Every component below answers to it without being told, so
  a screen built without picking one is built in the default voice by accident rather than on
  purpose.
- Installing the package, declaring your skin, and what it exports besides components:
  [\`PACKAGE.md\`](./PACKAGE.md).
- Whether a component exists at all, including any this layer does not ship:
  [\`../SKILL.md\`](../SKILL.md).
- **Takes** is the members the component's API contract declares, in contract order, under this
  layer's own names. A member marked \`*\` is required; the prompt gives its type and its default.
- **A member whose type is an object or an enum takes one this package exports.** The prompt
  names the type and says what it is for; the fields it holds are in the type declaration itself,
  which \`import type { … } from '${PACKAGES[layer]}'\` brings in. That field list is in neither
  the prompt nor the contract, so the type is where you read it.`;
}

export function loadCategories(base = root) {
  return readJson(join(base, 'frameworks/Components.json'));
}

export function loadContract(component: string, base = root) {
  const path = join(base, 'contracts/api/components', `${component}.json`);
  if (!existsSync(path)) return null;
  return readJson(path);
}

export function componentDir(layer: string, category: string, component: string) {
  return join('frameworks', layer, 'components', category, kebab(component));
}

export function layersFor(category: string, component: string, base = root) {
  return CONSUMER_LAYERS.filter((layer) => existsSync(join(base, componentDir(layer, category, component))));
}

export function promptPath(category: string, component: string) {
  return `./components/${category}/${kebab(component)}/${component}.prompt.md`;
}

export function memberList(contract: ContractCandidate | null, layer?: string) {
  if (!contract) return [];
  return memberEntries(contract.api).map(([name, member]) => {
    const bound = layer ? bindingName(name, member.form, layer) : name;
    return member.required ? `${bound}*` : bound;
  });
}

export function patternsFor(category: string, component: string, layers: string[], base = root) {
  const found = new Map();
  for (const layer of layers) {
    const path = join(base, componentDir(layer, category, component), `${component}.behaviour.json`);
    if (!existsSync(path)) continue;
    const binding = readJson(path);
    for (const one of bindingCases(binding)) {
      if (!found.has(one.pattern)) found.set(one.pattern, new Set());
      found.get(one.pattern).add(layer);
    }
  }
  return found;
}

export function renderPatterns(found: Map<string, Set<string>>, layers: string[]) {
  const names = [...found.keys()].sort();
  if (names.length === 0) return '';
  const everywhere = (pattern: string) => layers.every((layer: string) => found.get(pattern)?.has(layer));
  return names
    .map((pattern) => (everywhere(pattern) ? pattern : `${pattern} (${[...(found.get(pattern) ?? [])].sort().join(', ')})`))
    .join(', ');
}

export function escapeCell(text: string) {
  return String(text).split('|').join('\\|').split('\n').join(' ');
}

export function rowsFor(category: string, components: string[], base = root) {
  return components.map((component: string) => {
    const layers = layersFor(category, component, base);
    const contract = loadContract(component, base);
    return {
      component,
      category,
      description: contract?.description ?? '',
      layers,
      contract,
      members: memberList(contract),
      patterns: renderPatterns(patternsFor(category, component, layers, base), layers),
    };
  });
}

export type SkillRow = {
  component: string;
  category?: string;
  description?: string;
  layers: string[];
  contract?: ContractCandidate | null;
  members?: string[];
  patterns?: string;
};

function taken(members: string[]) {
  return members.map((m) => `\`${m}\``).join(' ') || '(no members)';
}

export function renderRow(row: SkillRow) {
  return `| \`${row.component}\` | ${escapeCell(row.description ?? '')} | ${taken(row.members ?? [])} | ${
    row.patterns || '(undeclared)'
  } | ${row.layers.join(', ') || '(no layer)'} |`;
}

export function renderLayerRow(row: SkillRow, layer: string) {
  return `| \`${row.component}\` | ${escapeCell(row.description ?? '')} | ${
    taken(memberList(row.contract ?? null, layer))
  } | [\`${row.component}.prompt.md\`](${promptPath(row.category ?? '', row.component)}) |`;
}

function indexOfNothing(what: string) {
  throw new Error(`generate-skills: ${what}, and an index of nothing indexes nothing`);
}

export function renderIndex(base = root) {
  const categories = loadCategories(base);
  const out = [INDEX_HEADER];
  let count = 0;

  for (const category of Object.keys(categories).sort()) {
    const rows = rowsFor(category, [...categories[category]].sort(), base);
    count += rows.length;
    out.push('');
    out.push(`## ${category}`);
    out.push('');
    out.push('| Component | What it is | Takes | Behaviour | Layers |');
    out.push('|---|---|---|---|---|');
    for (const row of rows) out.push(renderRow(row));
  }

  if (count === 0) indexOfNothing('frameworks/Components.json declared no component');

  out.push('');
  out.push(`${count} components across ${Object.keys(categories).length} categories.`);
  out.push('');
  return out.join('\n');
}

export function renderLayerIndex(layer: string, base = root) {
  const categories = loadCategories(base);
  const out = [layerHeader(layer)];
  let count = 0;
  let sections = 0;

  for (const category of Object.keys(categories).sort()) {
    const rows = rowsFor(category, [...categories[category]].sort(), base)
      .filter((row) => row.layers.includes(layer));
    if (rows.length === 0) continue;
    count += rows.length;
    sections += 1;
    out.push('');
    out.push(`## ${category}`);
    out.push('');
    out.push('| Component | What it is | Takes | Usage |');
    out.push('|---|---|---|---|');
    for (const row of rows) out.push(renderLayerRow(row, layer));
  }

  if (count === 0) indexOfNothing(`the ${layer} layer holds no declared component`);

  out.push('');
  out.push(`${count} components across ${sections} categories in this layer.`);
  out.push('');
  return out.join('\n');
}

export function renderTarget(target: string, base = root) {
  if (target === INDEX_TARGET) return renderIndex(base);
  const layer = CONSUMER_LAYERS.find((one) => layerTarget(one) === target);
  if (!layer) throw new Error(`generate-skills: nothing emits ${target}`);
  return renderLayerIndex(layer, base);
}

function main() {
  for (const target of SKILL_TARGETS) {
    writeFileSync(join(root, target), renderTarget(target));
    console.log(`generate-skills: wrote ${target}`);
  }
}

if (isMainModule(import.meta.url)) main();
