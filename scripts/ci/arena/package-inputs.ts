/* What a published package is assembled from, so a workflow can ask whether anything it carries
 * has moved since the version now on the registry. The version file is deliberately absent: a
 * release always moves it and the guard is only reached when the registry disagrees with it, so
 * naming it would leave "nothing this package carries has moved" an answer nothing could reach.
 * A spec names a directory holding prose no package carries, so `carries` puts the assembler's own
 * `excluded()` to the part of a path INSIDE the spec that reached it. It imports that rule and
 * never the assembler: this runs in a job with no install, where a bare specifier is answered by
 * the registry rather than by bun.lock, and check:workflow-scripts refuses the alternative. The
 * contracts entry spreads none of SHARED_INPUTS: five of those eight are false for a package with
 * no stylesheet, no CLI and no component map, and inheriting them would republish it for nothing. */

import { isMainModule } from '../../utils/main-module.ts';
import { excluded } from '../../lib/arena/package-exclusions.ts';
import { inPayload } from '../../lib/arena/agent-payload.ts';

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
  contracts: {
    'contracts/design/': 'the design values, carried as JSON. The three .css files under it are the '
      + 'composition layer and this package carries none of them, which costs nothing here: a spec '
      + 'names a directory and a stylesheet moving inside it republishes a package whose payload did '
      + 'not change, which is the cheap direction to be wrong in',
    'contracts/api/': 'the capability contracts and the types their members take',
    'contracts/behaviour/': 'the behaviour patterns',
    'contracts/NPM.md': 'the page npm shows, carried as README.md',
    'scripts/build/arena/build-contracts-package.ts': 'the assembler, and the NOT_CARRIED map that '
      + 'decides the payload',
    'scripts/lib/arena/package-assembly.ts': 'pluginIdentity, the copy helpers and the behaviour copy',
    'LICENSE': 'shipped verbatim',
  },
  mcp: {
    'scripts/generate/core/arena-mcp/': 'the server itself, transpiled whole into bin/',
    'scripts/build/arena/build-mcp-package.ts': 'the assembler, and the manifest it stamps',
    'mcp/NPM.md': 'the page npm shows, carried as README.md',
    'server.json': 'the manifest the MCP registry reads, sent by the publish job of this package '
      + 'and by no other. The tarball does not carry it, and it is named here anyway: the entry '
      + 'moves only inside a run that published, so a server.json edit the guard cannot see is one '
      + 'the registry never hears about',
    'skills/design/': 'the router and the references, carried into agent/<layer>/ of this package',
    'frameworks/INDEX.md': 'the layer-neutral catalogue the router routes through',
    'contracts/design/roles.json': 'the style roles a project answers, carried beside the router',
    'contracts/behaviour/': 'the patterns the corpus links, carried so the link resolves inside it',
    'scripts/lib/arena/agent-payload.ts': 'the spec that decides what the corpus carries and how a '
      + 'path in it is rewritten',
    'scripts/lib/arena/package-assembly.ts': 'copyAgentPayload, which writes the corpus',
    'LICENSE': 'shipped verbatim',
  },
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
};

export const PAYLOAD_LAYERS: Record<string, string[]> = { mcp: ['react', 'angular'] };

export function pathspecs(pkg: string) {
  const inputs = PACKAGE_INPUTS[pkg];
  if (!inputs) throw new Error(`package-inputs: no package is assembled under the name "${pkg}"`);
  return Object.keys(inputs).sort();
}

export function carries(path: string, pkg: string) {
  const specs = pathspecs(pkg);
  if (specs.some((spec) => !spec.endsWith('/') && spec === path)) return true;

  const layers = PAYLOAD_LAYERS[pkg] ?? [];
  if (layers.some((layer) => inPayload(path, layer))) return true;

  const dir = specs.find((spec) => spec.endsWith('/') && path.startsWith(spec));
  if (dir === undefined) return false;

  const inside = path.slice(dir.length).split('/').filter(Boolean);
  if (inside.length === 0) return false;
  if (inside.some((name) => excluded(name) || name.startsWith('.'))) return false;
  return !(inside[inside.length - 1]! in PROSE_NAMES);
}

export function carried(paths: Iterable<string>, pkg: string) {
  return [...paths].map((p) => p.trim()).filter(Boolean).filter((p) => carries(p, pkg));
}

async function readStdin() {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks).toString('utf8');
}

async function main() {
  const args = process.argv.slice(2);
  const pkg = args.find((a) => !a.startsWith('--')) ?? '';
  try {
    if (args.includes('--carried')) {
      pathspecs(pkg);
      const kept = carried((await readStdin()).split('\n'), pkg);
      if (kept.length > 0) console.log(kept.join('\n'));
      return;
    }
    console.log(pathspecs(pkg).join('\n'));
  } catch (err) {
    console.error((err as Error).message);
    process.exit(1);
  }
}

if (isMainModule(import.meta.url)) await main();
