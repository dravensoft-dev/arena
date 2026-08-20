/* What a published package is assembled from, so a workflow can ask whether anything it carries
 * has moved since the version now on the registry. The version file is deliberately absent: a
 * release always moves it and the guard is only reached when the registry disagrees with it, so
 * naming it would leave "nothing this package carries has moved" an answer nothing could reach.
 * A spec names a directory, and a directory holds the suites, the prompts and the prose no package
 * carries; `carries` puts the assembler's own `excluded()` to the part of a path INSIDE the spec
 * that reached it, since a spec naming a file is read rather than walked and `build` is one of the
 * names that walk skips. It imports that rule and never the assembler: this runs in a job with no
 * install, where a bare specifier is answered by the registry at whatever major it serves rather
 * than the one bun.lock pins, and check:workflow-scripts is what refuses the alternative. */

import { isMainModule } from '../../utils/main-module.ts';
import { excluded } from '../../lib/arena/package-exclusions.ts';

export const SHARED_INPUTS = {
  'contracts/design/': 'reset.css and colors.css lead the stylesheet every package carries',
  'contracts/design-generated/': 'the typography, spacing and effects the CSS chain copies',
  'contracts/behaviour/': 'the behaviour contracts, copied whole into contracts/behaviour/ of both packages',
  'scripts/generate/core/arena-to-prod/': 'the CLI each package ships as its bin',
  'scripts/lib/arena/package-assembly.ts': 'the exclusion list, the copy and the manifest template',
  'scripts/lib/arena/package-exclusions.ts': 'the rule that decides which of these paths is carried at all',
  'scripts/lib/arena/component-map.ts': 'the map of what a consumer writes to the sheet it costs, carried in both packages',
  'LICENSE': 'shipped verbatim in both packages',
};

export const PACKAGE_INPUTS: Record<string, Record<string, string>> = {
  react: {
    ...SHARED_INPUTS,
    'frameworks/react/': 'the layer itself',
    'frameworks/tailwind/': 'the manifest modules and the recipe runtime emitted into the layer, '
      + 'which are gitignored, so a manifest edit moves what the package ships and no tracked '
      + 'file under frameworks/react/ moves with it',
    'scripts/build/react/build-react-package.ts': 'the assembler',
    'scripts/build/react/build-react-barrel.ts': 'the entry point it compiles',
  },
  angular: {
    ...SHARED_INPUTS,
    'frameworks/angular/': 'the layer itself',
    'frameworks/tailwind/': 'the recipes the layer imports, staged into the package beside it',
    'scripts/build/angular/build-angular-package.ts': 'the assembler',
  },
};

export const PROSE_NAMES: Record<string, string> = {
  'AGENTS.md': 'instructions to whoever edits the directory, carried by no package',
  'INDEX.md': 'the directory index the site and the skill read, carried by no package',
};

export function pathspecs(layer: string) {
  const inputs = PACKAGE_INPUTS[layer];
  if (!inputs) throw new Error(`package-inputs: no package is assembled from a layer called "${layer}"`);
  return Object.keys(inputs).sort();
}

export function carries(path: string, layer: string) {
  const specs = pathspecs(layer);
  if (specs.some((spec) => !spec.endsWith('/') && spec === path)) return true;

  const dir = specs.find((spec) => spec.endsWith('/') && path.startsWith(spec));
  if (dir === undefined) return false;

  const inside = path.slice(dir.length).split('/').filter(Boolean);
  if (inside.length === 0) return false;
  if (inside.some((name) => excluded(name) || name.startsWith('.'))) return false;
  return !(inside[inside.length - 1]! in PROSE_NAMES);
}

export function carried(paths: Iterable<string>, layer: string) {
  return [...paths].map((p) => p.trim()).filter(Boolean).filter((p) => carries(p, layer));
}

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const layer = args.find((a) => !a.startsWith('--')) ?? '';
  try {
    if (args.includes('--carried')) {
      pathspecs(layer);
      const kept = carried((await readStdin()).split('\n'), layer);
      if (kept.length > 0) console.log(kept.join('\n'));
      return;
    }
    console.log(pathspecs(layer).join('\n'));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

if (isMainModule(import.meta.url)) await main();
