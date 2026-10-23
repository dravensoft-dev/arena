/* The disk side of cutting fonts: it finds harfbuzzjs and wawoff2 where the command's own
 * package installed them, reads the sheets a build imports so paintedWeights has the CSS it
 * counts, and cuts each role whose src is a file. A src that is not a file (a stylesheet, a URL, a
 * path that is not there) stays as written and reports once. The cut files are named by content. */

import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { LATIN_1, cutFont, cutPlan, cutSteps, paintedWeights, weightAxis } from './font-cut.ts';
import type { CutPlan, FontTools } from './font-cut.ts';
import { report } from './report.ts';
import type { Report } from './report.ts';
import { contentName } from './sprite.ts';

export type FontToolRoots = { harfbuzz: string | null; wawoff2: string | null };

export function loadFontTools(roots: FontToolRoots): { tools: FontTools } | { missing: string } {
  if (roots.harfbuzz === null) return { missing: 'harfbuzzjs' };
  if (roots.wawoff2 === null) return { missing: 'wawoff2' };
  const wasm = join(roots.harfbuzz, 'dist', 'harfbuzz-subset.wasm');
  if (!existsSync(wasm)) return { missing: 'harfbuzzjs' };
  const codec = createRequire(join(roots.wawoff2, 'package.json'))(roots.wawoff2);
  return { tools: {
    subset: new WebAssembly.Module(readFileSync(wasm)),
    compress: codec.compress,
    decompress: codec.decompress,
  } };
}

const IMPORT = /@import\s+(?:url\(\s*)?['"]([^'"]+)['"]/g;

export function importedSheets(theme: string, arena: string | null, packageName: string) {
  if (arena === null) return '';
  const seen = new Set<string>();
  const parts: string[] = [];
  const visit = (path: string) => {
    if (seen.has(path) || !existsSync(path)) return;
    seen.add(path);
    const css = readFileSync(path, 'utf8');
    parts.push(css);
    for (const [, target = ''] of css.matchAll(IMPORT)) {
      if (/^[a-z]+:|^\/\//.test(target)) continue;
      visit(resolve(dirname(path), target.split('?')[0] as string));
    }
  };
  const prefix = `${packageName}/`;
  for (const [, target = ''] of theme.matchAll(IMPORT)) {
    const inside = target.startsWith(prefix) ? target.split(prefix)[1] : undefined;
    if (inside !== undefined) visit(join(arena, ...inside.split('/')));
  }
  return parts.join('\n');
}

export type FontCut = {
  family: string;
  label: string;
  axis: [number, number] | null;
  faces: { name: string; weight: string }[];
  lost: number[];
};
export type FontCuts = Record<string, FontCut>;
export type CutFile = { name: string; content: Uint8Array; summary: string };

type Declared = { family?: string; src?: string; weight?: string };

const REMOTE = /^(?:[a-z][a-z0-9+.-]*:)?\/\//i;
const CUTTABLE = ['.woff2', '.ttf', '.otf'];

export const localSource = (src: string) => !REMOTE.test(src) && !(src.split('?')[0] ?? '').endsWith('.css');

export const fontStem = (src: string) => basename(src.split('?')[0] ?? '', extname(src.split('?')[0] ?? ''));

const NOT_CUT = 'so it was not cut to the code points and weights this build paints';

function pinned(weights: number[], axis: [number, number] | null): CutPlan {
  if (axis === null) return { kind: 'pins', at: weights };
  const clamp = (w: number) => Math.min(Math.max(w, axis[0]), axis[1]);
  return { kind: 'pins', at: [...new Set(weights.map(clamp))].sort((a, b) => a - b), lost: weights.filter((w) => clamp(w) !== w) };
}

const faceWeight = (plan: CutPlan, declared: string) =>
  plan.kind === 'pins' ? `${plan.at[0] ?? declared}` : plan.lo === plan.hi ? `${plan.lo}` : `${plan.lo} ${plan.hi}`;

export async function cutFonts(input: {
  fonts: Record<string, Declared>;
  roles: string[];
  from: string;
  css: string;
  tools: () => { tools: FontTools } | { missing: string };
}): Promise<{ cuts: FontCuts; files: CutFile[]; reports: Report[]; fatal: string[]; stems: string[] }> {
  const reports: Report[] = [];
  const cuts: FontCuts = {};
  const files = new Map<string, CutFile>();
  const stems: string[] = [];
  const weights = paintedWeights(input.css, input.roles);
  let loaded: ReturnType<typeof input.tools> | null = null;

  for (const role of input.roles) {
    const font = input.fonts[role];
    const src = font?.src;
    if (font === undefined || src === undefined) continue;
    if (!localSource(src)) {
      reports.push(report('font', `${role}: ${src} is not a file on disk, ${NOT_CUT}`));
      continue;
    }
    stems.push(fontStem(src));
    const path = resolve(input.from, src.split('?')[0] as string);
    if (!existsSync(path)) {
      reports.push(report('font', `${role}: ${src} is not a file on disk, ${NOT_CUT}`));
      continue;
    }
    const extension = extname(path).toLowerCase();
    if (!CUTTABLE.includes(extension)) {
      reports.push(report('font', `${role}: ${src} is a ${extension || 'extensionless'} file and only woff2, ttf and otf are cut, ${NOT_CUT}`));
      continue;
    }
    loaded ??= input.tools();
    if ('missing' in loaded) return { cuts, files: [], reports, stems, fatal: [`cannot find ${loaded.missing}; it is a dependency of this package, so install the package again`] };
    try {
      const source = new Uint8Array(readFileSync(path));
      const sfnt = extension === '.woff2' ? await loaded.tools.decompress(source) : source;
      const axis = weightAxis(sfnt);
      const painted = weights.get(role) ?? [];
      const declared = (font.weight ?? '').split(/\s+/).map(Number).filter((n) => Number.isFinite(n) && n > 0);
      const plan = painted.length > 0 ? cutPlan(painted, axis) : pinned(declared.length > 0 ? declared : [400], axis);
      const steps: CutPlan[] = axis === null ? [{ kind: 'pins', at: [] }] : cutSteps(plan);
      const faces: FontCut['faces'] = [];
      const declaredFace = font.weight ?? '400 900';
      for (const step of steps) {
        const { bytes } = await cutFont(source, step, LATIN_1, loaded.tools);
        const name = contentName(fontStem(src), 'woff2', bytes);
        files.set(name, { name, content: bytes, summary: `${bytes.length} bytes, cut from ${source.length}` });
        faces.push({ name, weight: axis === null ? declaredFace : faceWeight(step, declaredFace) });
      }
      cuts[role] = { family: font.family ?? role, label: src, axis, faces, lost: plan.lost ?? [] };
    } catch (error) {
      return { cuts, files: [], reports, stems, fatal: [`cannot cut ${path}: ${(error as Error).message}`] };
    }
  }
  return { cuts, files: [...files.values()], reports, fatal: [], stems };
}

export function configFonts(config: string): string[] {
  try {
    const fonts = JSON.parse(readFileSync(config, 'utf8'))?.fonts;
    return Object.values(fonts ?? {}).map((one) => (one as { src?: unknown })?.src)
      .filter((src): src is string => typeof src === 'string' && localSource(src));
  } catch {
    return [];
  }
}
