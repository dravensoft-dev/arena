/* Which framework layers a diff reaches. The map is here rather than in YAML because a
 * routing rule nothing tests is a rule that reports green over a tree it never opened,
 * and because two of its entries are not obvious: a Tailwind edit routes to BOTH other
 * layers. Angular reads a generated manifest from it and ngc fails without one; React
 * compiles modules emitted into its own tree from it, and those are gitignored, so a
 * manifest edit changes what React builds while nothing tracked under it moves. The domains line
 * is what verify.yml selects by: every domain that is no layer, and each layer the diff reaches. */

import { isMainModule } from '../../utils/main-module.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { DOMAINS } from '../../lib/arena/domains.ts';

export const SHARED = {
  'contracts/': 'the three contract levels every layer answers to',
  'scripts/': 'the tooling that builds, generates and gates every layer',
  '.github/': 'the workflows deciding what runs at all',
  'package.json': 'the toolchain and every script a job invokes',
  'bun.lock': 'the resolved dependency tree each layer compiles against',
};

export const LAYER_INPUTS: Record<string, Record<string, string>> = {
  react: {
    'frameworks/react/': 'its own layer',
    'frameworks/tailwind/': 'the manifest modules and the recipe runtime are emitted into this '
      + 'layer from there and are gitignored, so a manifest edit changes what React compiles',
  },
  angular: {
    'frameworks/angular/': 'its own layer',
    'frameworks/tailwind/': 'every .variants.ts imports a generated manifest, so ngc fails without it',
  },
  tailwind: { 'frameworks/tailwind/': 'its own layer' },
};

function reaches(prefix: string, path: string) {
  return prefix.endsWith('/') ? path.startsWith(prefix) : path === prefix;
}

export function layersChanged(paths: string[]) {
  const changed: Record<string, boolean> = {};
  const shared = paths.some((p) => Object.keys(SHARED).some((prefix) => reaches(prefix, p)));
  for (const layer of Object.keys(LAYER_INPUTS)) {
    changed[layer] = shared
      || paths.some((p) => Object.keys(LAYER_INPUTS[layer] ?? {}).some((prefix) => reaches(prefix, p)));
  }
  return changed;
}

export function domainsOf(changed: Record<string, boolean>, domains = DOMAINS, layers = LAYERS) {
  return domains.filter((domain) => !layers.includes(domain) || changed[domain] === true);
}

export function renderOutputs(changed: Record<string, boolean>) {
  return [
    ...Object.keys(LAYER_INPUTS).sort().map((layer) => `${layer}=${changed[layer] ? 'true' : 'false'}`),
    `domains=${domainsOf(changed).join(',')}`,
  ].join('\n');
}

export function unroutedLayers(inputs: Record<string, unknown> = LAYER_INPUTS, layers = LAYERS) {
  return layers.filter((layer) => !(layer in inputs));
}

async function main() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  const paths = String(Buffer.concat(chunks))
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);

  const unrouted = unroutedLayers();
  if (unrouted.length > 0) {
    console.error(`changed-layers: ${unrouted.join(', ')} has no entry in LAYER_INPUTS, so a change to it would route nowhere`);
    process.exit(1);
  }

  const changed = layersChanged(paths);
  console.log(renderOutputs(changed));
  console.error(`changed-layers: ${paths.length} path(s) -> ${renderOutputs(changed).replace(/\n/g, ' ')}`);
}

if (isMainModule(import.meta.url)) await main();
