import { readFileSync } from 'node:fs';
import { relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import {
  buildTailwind, buildManifestModules, buildComponentCss, buildClassModules,
  buildStylesRuntime, generatedPath, BANNER, node as tailwindNode,
} from '../../build/tailwind/build-tailwind.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import { relPosix } from '../../utils/posix-path.ts';

export { BANNER, generatedPath };

export const node = {
  name: 'check:tailwind-generated',
  reads: [
    ...tailwindNode.reads, ...tailwindNode.writes,
    'frameworks/tailwind/components/**/*.generated.ts',
    'frameworks/angular/ArenaStyles.generated.ts', 'frameworks/angular/Tv.generated.ts',
  ],
  writes: [],
  feeds: [],
};

export function drift(opts = {}) {
  const path = generatedPath(opts);
  let committed;
  try {
    committed = readFileSync(path, 'utf8');
  } catch {
    return relPosix(repoRoot, path);
  }
  if (committed !== buildTailwind(opts)) return relPosix(repoRoot, path);

  const emitted = [
    ...buildManifestModules(opts), ...buildComponentCss(opts),
    ...buildClassModules(opts), ...buildStylesRuntime(opts),
  ];
  for (const [filePath, content] of emitted) {
    let committedFile;
    try {
      committedFile = readFileSync(filePath, 'utf8');
    } catch {
      return relPosix(repoRoot, filePath);
    }
    if (committedFile !== content) return relPosix(repoRoot, filePath);
  }
  return null;
}

function main() {
  const stale = drift();
  if (stale) {
    console.error(
      `check-tailwind-generated: ${stale} is missing or stale — run \`bun run build:tailwind\`;`
      + ' every output of that build is git-ignored, so there is nothing to commit',
    );
    process.exit(1);
  }
  console.log('check-tailwind-generated: the compiled sheet, every component stylesheet, the prelude, '
    + 'the barrel, every class module and the composer all match a fresh build of the preset and the manifests');
}

if (isMainModule(import.meta.url)) main();
