/* Compiling the Tailwind layer: the classes a manifest names, the CSS escape each one needs, the
 * entry stylesheet handed to the CLI, and the manifests themselves keyed for everything
 * downstream. That key is the repo-relative path spelled posix and never the native one. Five
 * readers in build-tailwind.ts treat it as a string carrying '/' -- replacing a prefix, counting
 * segments to a depth, sorting the barrel, mirroring into two layers -- and against a backslash
 * key each is a silent no-op except the depth, which goes negative and throws. Handing it back to
 * node costs nothing, since join reads a forward slash on every platform. The two paths in the
 * entry stylesheet convert for the same reason: a backslash inside a CSS string starts an escape
 * rather than a segment, so a native root names a file that is not on disk. */

import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { walkFiles } from '../../utils/walk-files.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../arena/repo-root.ts';
import { nodeBin } from '../arena/node-bin.ts';
import { relPosix, toPosix } from '../../utils/posix-path.ts';
import type { ManifestClassSource, Manifests } from './manifest-shapes.ts';

export function manifestClasses(manifest: ManifestClassSource): string[] {
  const out = new Set<string>();
  const eat = (v: unknown) => {
    if (typeof v === 'string') for (const c of v.split(/\s+/)) { if (c) out.add(c); }
    else if (v && typeof v === 'object') for (const child of Object.values(v)) eat(child);
  };
  eat(manifest.slots);
  eat(manifest.variants);
  return [...out].sort();
}

export function escapeClass(cls: string) {
  const backslash = (s: string) => s.replace(/[^A-Za-z0-9_-]/g, (ch) => `\\${ch}`);
  const first = cls.codePointAt(0);
  if (first !== undefined && /^[0-9]/.test(cls))
    return `\\${first.toString(16)} ${backslash(cls.slice(1))}`;
  return backslash(cls);
}

export function manifestFiles(componentsDir: string) {
  return walkFiles(componentsDir).filter((p) => p.endsWith('.manifest.json')).sort();
}

export function entryStylesheet(preset: string, components: string, extra?: string) {
  return `@import '${toPosix(preset)}' source(none);\n`
    + `@source '${toPosix(components)}/**/*.manifest.json';\n`
    + (extra ? `@source '${toPosix(extra)}';\n` : '');
}

export function compileEntry(entry: string, root = repoRoot) {
  const bin = nodeBin('@tailwindcss/cli', undefined, root);
  const dir = mkdtempSync(join(tmpdir(), 'arena-tw-'));
  const out = join(dir, 'out.css');
  try {
    const r = spawnSync(process.execPath, [bin, '-i', '-', '-o', out], { input: entry, encoding: 'utf8' });
    if (r.status !== 0) {
      if (r.error) throw new Error(`tailwindcss failed to spawn: ${r.error.message || r.error}`);
      throw new Error(`tailwindcss exited ${r.status}\n${r.stderr || r.stdout}`);
    }
    return readFileSync(out, 'utf8');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function layerManifests(root = repoRoot): Manifests {
  const components = join(root, 'frameworks/tailwind/components');
  const manifests: Manifests = new Map();
  for (const p of manifestFiles(components))
    manifests.set(relPosix(root, p), readJson(p));
  return manifests;
}

export function compileLayer(opts: { root?: string; extraSource?: string } = {}) {
  const root = opts.root ?? repoRoot;
  const preset = join(root, 'frameworks/tailwind/Theme.css');
  const components = join(root, 'frameworks/tailwind/components');

  const manifests = layerManifests(root);
  const entry = entryStylesheet(preset, components, opts.extraSource);
  return { css: compileEntry(entry, root), manifests };
}
