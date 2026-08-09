/* Where ngc puts the Angular layer's output, derived rather than spelled out. A source is
 * emitted at `outDir` plus its own path relative to `rootDir`, so the tree a build script
 * walks is `outDir` plus the layer root's path relative to `rootDir`: `build/test` under
 * today's `rootDir: "."`, `build/test/angular` under the `".."` that preceded the layer
 * becoming self-contained. When that one token moved, the scripts holding the old depth
 * pruned every fresh emit as an orphan and called its sources never compiled, and `bun test`
 * was pointed at a directory that no longer existed, which it reports as a clean run of
 * nothing. The configs are parsed as strict JSON: tsconfig permits comments, these carry
 * none, and one added later throws here rather than resolving to a different tree. */

import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { readJson } from '../../utils/read-file.ts';
import { relPosix } from '../../utils/posix-path.ts';

export function declaredOption(configPath: string, option: string) {
  const seen = new Set();
  let current = resolve(configPath);
  while (!seen.has(current)) {
    seen.add(current);
    const config = readJson(current);
    const value = config.compilerOptions?.[option];
    if (value !== undefined) return { value, dir: dirname(current) };
    if (!config.extends) break;
    current = isAbsolute(config.extends) ? config.extends : resolve(dirname(current), config.extends);
  }
  throw new Error(`emit-root: no "${option}" is declared by ${configPath} or anything it extends`);
}

export function emitRoot({ rootDir, outDir, layerRoot }: { rootDir: string; outDir: string; layerRoot: string }) {
  const inside = relPosix(rootDir, layerRoot);
  if (inside.startsWith('..') || isAbsolute(inside)) {
    throw new Error(
      `emit-root: ${layerRoot} is not under rootDir ${rootDir}, so its output has no path under ${outDir}`,
    );
  }
  return join(outDir, inside);
}

export function angularEmitRoot(configPath: string) {
  const root = declaredOption(configPath, 'rootDir');
  const out = declaredOption(configPath, 'outDir');
  return emitRoot({
    rootDir: resolve(root.dir, root.value),
    outDir: resolve(out.dir, out.value),
    layerRoot: dirname(resolve(configPath)),
  });
}
