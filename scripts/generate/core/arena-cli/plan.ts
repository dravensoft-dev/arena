/* What a build would leave on disk, worked out without leaving anything. themeSheets, fontFiles and
 * spriteFiles are the theme, font and sprite steps with the writes taken out: they read the disk and
 * answer the files, their reports and the code a failure carries. plan runs them in order and answers
 * all the files or none, so a tree never pairs a new theme with an old sprite. The theme is worked
 * out twice when a font is cut, once to learn the weights it paints and once to name the cut files.
 * A named component list is closed against the same map before the config is validated, and with no
 * map it is used as written. A reports-only plan reads each font's weight axis and cuts nothing, so
 * arena check uses it and arena doctor, which compares bytes, does not. */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, basename, join, resolve } from 'node:path';
import { configProblems, defaultedNote, packageCss, packageImports, paletteReports, rootWithDefaults, runtimeData, themeCss, weightReports } from './theme-css.ts';
import type { PackageSheets } from './theme-css.ts';
import { AUTO, resolve as resolveComponents } from './components.ts';
import type { ComponentMap } from './components.ts';
import { scan, drawnGlyphs, fillSourceGlyphs, glyphNames, mergeShipped, shippedNames, WEIGHT_CLASSES } from './icon-css.ts';
import type { IconScan } from './icon-css.ts';
import { iconMemberGlyphs, tagEnd } from './audit.ts';
import { report } from './reports.ts';
import type { Report } from './reports.ts';
import {
  THEME_SHEET, PACKAGE_SHEET, PLUGIN_SHEET, RUNTIME_DATA, PLUGIN_LAYER, ICON_MANIFEST, SPRITE_MODULE, SPRITE_TYPES, SPRITE_STEM,
  iconManifest, pluginCss, pluginSheets, readPlugins,
} from './sheets.ts';
import { OUTPUT_SHEETS, fontFilesIn, missingSource, sourceFiles, spriteFilesIn, writtenFontStems } from './sources.ts';
import { contentName, glyphFile, spriteModule, spriteSvg } from './sprite.ts';
import { cutFonts, importedSheets, loadDecoder, loadFontTools } from './font-files.ts';
import type { FontCuts, FontToolRoots } from './font-files.ts';
import { fontToolRoots } from './host.ts';
import { FONT_ROLES } from './palette-keys.ts';
import { autoComponents, namedComponents, reportLines } from './steps.ts';
import type { Options } from './args.ts';
import type { CheckedConfig } from './theme-css.ts';
import type { resolveEnvironment } from './host.ts';

export type PlanOptions = Pick<Options, 'config' | 'paths' | 'out' | 'importHeader'>;
export type PlanEnvironment = Omit<ReturnType<typeof resolveEnvironment>, 'fontTools'> & { fontTools?: FontToolRoots };
export type ThemeEnvironment = { packageName: string; sheets: PackageSheets; map?: ComponentMap | null };
export type SheetOutput = { name: string; path: string; content: string; summary: string };
export type BinaryOutput = { name: string; path: string; content: Uint8Array; summary: string };
export type FileOutput = SheetOutput | BinaryOutput;
export type Plan = {
  code: 0 | 1 | 2;
  fatal: string[];
  reports: Report[];
  notes: string[];
  outputs: SheetOutput[];
  binaries: BinaryOutput[];
  orphans: string[];
};
export type SheetState = { path: string; state: 'missing' | 'stale' | 'current' };

export function themeSheets(options: PlanOptions, { packageName, sheets, map }: ThemeEnvironment, cuts: FontCuts = {}):
  { code: 0 | 1 | 2; fatal: string[]; reports: Report[]; notes: string[]; sheets: SheetOutput[]; components: string[] | null;
    config: CheckedConfig | null; imports: string[] } {
  const stop = (code: 1 | 2, fatal: string[]) => ({
    code, fatal, reports: [] as Report[], notes: [] as string[], sheets: [] as SheetOutput[], components: null, config: null, imports: [] as string[],
  });
  let config;
  try {
    config = JSON.parse(readFileSync(options.config, 'utf8'));
  } catch (error) {
    return stop(2, [`cannot read ${options.config}: ${(error as Error).message}`]);
  }

  const closure = { reports: [] as Report[], notes: [] as string[] };
  const byDefault = config.stylesheet?.components === undefined;
  let drawn: string[] | null = null;
  if (byDefault && sheets && !map) {
    closure.reports.push(report('environment', 'the component map is not beside this package, so every component sheet '
      + 'is imported instead of the ones the sources draw'));
  }
  const asksForAuto = config.stylesheet?.components === AUTO;
  if (asksForAuto && !map) {
    return stop(1, [`"components": "${AUTO}" reads the component map this package carries, and it is not `
      + 'beside this command, so nothing can be resolved; name the sheets instead']);
  }
  const resolvesFromMap = asksForAuto || (byDefault && sheets);
  if (map && resolvesFromMap) {
    const resolved = autoComponents(config, { paths: options.paths, config: options.config }, map, packageName, !byDefault);
    if (resolved.fatal) return stop(1, resolved.fatal);
    if (byDefault) drawn = resolved.components;
    else config = { ...config, stylesheet: { ...config.stylesheet, components: resolved.components } };
    closure.reports.push(...resolved.reports.map((line) => report('components', line)));
    closure.notes.push(resolved.note);
  } else if (Array.isArray(config.stylesheet?.components) && map) {
    const named = namedComponents(config.stylesheet.components, map);
    config = { ...config, stylesheet: { ...config.stylesheet, components: named.components } };
    if (named.note) closure.notes.push(named.note);
  }

  const from = dirname(resolve(options.config));
  const { plugins, fatal } = readPlugins(config, from);
  if (fatal.length) return stop(1, fatal);

  const problems = configProblems(config, sheets, plugins);
  if (problems.length) return stop(1, problems);

  if (drawn) config = { ...config, stylesheet: { ...config.stylesheet, components: drawn } };

  const completed = rootWithDefaults(plugins, sheets?.catalogue ?? null);
  if (completed.defaulted.length) closure.notes.push(defaultedNote(completed.defaulted));
  const reports = [...closure.reports,
    ...reportLines(paletteReports(config, sheets?.catalogue ?? null, completed.plugins, sheets?.levels ?? [], sheets?.washes ?? [])),
    ...weightReports(config, sheets?.catalogue ?? null, completed.plugins, cuts)];
  const css = themeCss(config, { source: basename(options.config), sheets, plugins: completed.plugins, cuts });
  const out: SheetOutput[] = [{ name: THEME_SHEET, path: join(options.out, THEME_SHEET), content: css, summary: `${css.length} bytes` }];
  const imports = packageImports(config, { packageName, sheets }) ?? [];
  if (options.importHeader) {
    const pack = packageCss(config, { packageName, sheets });
    out.push({ name: PACKAGE_SHEET, path: join(options.out, PACKAGE_SHEET), content: pack, summary: `${pack.length} bytes` });
  }
  const layered = pluginCss(pluginSheets(config, from));
  if (layered !== null) {
    out.push({
      name: PLUGIN_SHEET,
      path: join(options.out, PLUGIN_SHEET),
      content: layered,
      summary: `${layered.length} bytes, wrapped in @layer ${PLUGIN_LAYER}`,
    });
  }
  if (config.runtimePalettes === true) {
    const data = `${JSON.stringify(runtimeData(config, sheets, completed.plugins), null, 2)}\n`;
    out.push({ name: RUNTIME_DATA, path: join(options.out, RUNTIME_DATA), content: data, summary: `${data.length} bytes` });
  }
  const resolved = map && Array.isArray(config.stylesheet?.components) ? config.stylesheet.components as string[] : null;
  return { code: 0, fatal: [], reports, notes: closure.notes, sheets: out, components: resolved, config, imports };
}

export type FontEnvironment = ThemeEnvironment & { arena?: string | null; fontTools?: FontToolRoots };

export async function fontFiles(options: PlanOptions, env: FontEnvironment, theme: ReturnType<typeof themeSheets>, dry = false):
  Promise<{ fatal: string[]; reports: Report[]; cuts: FontCuts; files: BinaryOutput[]; stems: string[] }> {
  const none = { fatal: [] as string[], reports: [] as Report[], cuts: {} as FontCuts, files: [] as BinaryOutput[], stems: [] as string[] };
  const config = theme.config;
  if (!config) return none;
  const generated = theme.sheets.find((one) => one.name === THEME_SHEET)?.content ?? '';
  const done = await cutFonts({
    fonts: config.fonts,
    roles: Object.keys(FONT_ROLES),
    from: dirname(resolve(options.config)),
    css: `${importedSheets(theme.imports.join('\n'), env.arena ?? null, env.packageName)}\n${generated}`,
    tools: () => (dry ? loadDecoder : loadFontTools)(env.fontTools ?? fontToolRoots()),
    dry,
  });
  return {
    fatal: done.fatal,
    reports: done.reports,
    cuts: done.cuts,
    stems: done.stems,
    files: done.files.map(({ name, content, summary }) => ({ name, path: join(options.out, name), content, summary })),
  };
}

export type SpriteEnvironment = { arena: string | null; phosphor: string | null; map?: ComponentMap | null; packageName?: string };

const bare = (glyph: string) => glyph.replace(/^ph-/, '');

const LITERAL = /^(?:'[^']*'|"[^"]*"|`[^`$]*`)$/;

const iconGiven = (names: string[]) => {
  const any = names.join('|');
  return new RegExp(`\\s(?:\\[(?:${any})\\]=(?:"([^"]*)"|'([^']*)')|(?:${any})=(?:"([^"]*)"|'([^']*)')|(?:${any})=\\{|\\{\\s*\\.\\.\\.)`, 'g');
};

function expressionIcon(tag: string, { names = ['icon'], spread = true, element = true } = {}) {
  for (const match of tag.matchAll(iconGiven(names))) {
    const bound = match[1] ?? match[2];
    if (bound !== undefined) {
      if (!LITERAL.test(bound.trim())) return true;
      continue;
    }
    const written = match[3] ?? match[4];
    if (written !== undefined) {
      if (written.includes('{{')) return true;
      continue;
    }
    if (match[0].endsWith('...')) {
      if (spread) return true;
      continue;
    }
    let depth = 1;
    let quote = '';
    let i = match.index + match[0].length;
    const from = i;
    for (; i < tag.length && depth > 0; i++) {
      const c = tag[i];
      if (quote) { if (c === quote) quote = ''; continue; }
      if (c === '"' || c === "'" || c === '`') quote = c;
      else if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
    }
    const value = tag.slice(from, i - 1).trim();
    if (!LITERAL.test(value) && (element || !/^\(*</.test(value))) return true;
  }
  return false;
}

export function fillsIconExpression(source: string, fills: Set<string>) {
  const names = [...fills].flatMap((one) => {
    const kebab = one.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
    const pascal = kebab.split('-').map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join('');
    return [kebab, pascal];
  });
  if (names.length === 0) return false;
  const opening = new RegExp(`<(?:${names.join('|')})(?=[\\s/>])`, 'g');
  for (const match of source.matchAll(opening)) {
    const end = tagEnd(source, match.index + match[0].length);
    if (expressionIcon(source.slice(match.index, end === -1 ? source.length : end))) return true;
  }
  return false;
}

export function handsIconExpression(source: string) {
  for (const match of source.matchAll(/<(Arena[A-Za-z0-9]*|arena-[a-z0-9-]+)(?=[\s/>])/g)) {
    const end = tagEnd(source, match.index + match[0].length);
    const tag = source.slice(match.index, end === -1 ? source.length : end);
    if (expressionIcon(tag, { names: ['icon', 'iconRight'], spread: /^(?:ArenaIcon|arena-icon)$/.test(match[1] ?? ''), element: false })) return true;
  }
  return false;
}

export function spriteFiles(options: PlanOptions, { arena, phosphor, map = null, packageName = '' }: SpriteEnvironment,
  drawn: string[] | null = null):
  { code: 0 | 1 | 2; fatal: string[]; reports: Report[]; files: SheetOutput[] } {
  if (!phosphor) {
    return { code: 2, reports: [], files: [], fatal: ['cannot find @phosphor-icons/core; it is a dependency of this package, so install the package again'] };
  }

  const found: IconScan = { pairs: new Map(), loose: new Set() };
  const reports: Report[] = [];

  const shipped = arena ? iconManifest(arena) : null;
  const counted = shipped && map && drawn
    ? new Set(Object.entries(map.draws).filter(([, sheet]) => sheet && drawn.includes(sheet)).map(([key]) => key))
    : null;
  if (shipped) {
    mergeShipped(shipped, found, counted);
    if (!map) {
      reports.push(report('environment', 'the component map is not beside this package, so every component\'s '
        + 'glyphs are in the sprite instead of the ones the sources draw'));
    }
  } else if (arena) {
    reports.push(report('environment', `${ICON_MANIFEST} is not beside this package, so the icons Arena `
      + 'draws itself were not counted and your sprite carries only what your own sources name'));
  } else {
    reports.push(report('environment', 'not running from inside an Arena package, so the icons Arena draws itself were not counted'));
  }

  const yours: IconScan = { pairs: new Map(), loose: new Set() };
  const swapping = new Set(shipped?.fills ?? []);
  const sources: string[] = [];
  for (const path of options.paths) {
    const files = sourceFiles(path);
    if (!files) return { code: 2, reports, files: [], fatal: [`${path} is not there`] };
    for (const file of files) {
      const source = readFileSync(file, 'utf8');
      scan(source, found);
      scan(source, yours);
      sources.push(source);
    }
  }

  const drawsFill = (source: string) => !map
    ? true
    : resolveComponents(map, [source], packageName)?.keys.some((key) => swapping.has(String(key))) ?? true;
  const expressive = sources.some((source) => fillsIconExpression(source, swapping));
  const wanted = drawnGlyphs(found, expressive ? glyphNames(yours) : fillSourceGlyphs(sources, drawsFill));
  if (wanted.length === 0 && !shipped) {
    return {
      code: 1,
      reports,
      files: [],
      fatal: ['no Phosphor weight class was found beside a glyph, so no symbol can be written; '
        + `a class list reads ${WEIGHT_CLASSES.bold} ph-bell, and the weight is what names the glyph`],
    };
  }

  const { svg, missing, kept } = spriteSvg(
    wanted.map(({ weight, glyphs }) => ({ weight, glyphs: new Set([...glyphs].map(bare)) })),
    (weight, name) => {
      try {
        return readFileSync(glyphFile(phosphor, weight, name), 'utf8');
      } catch {
        return null;
      }
    },
  );
  for (const [weight, names] of missing) {
    for (const name of names) reports.push(report('glyph', `${weight}: ph-${name} is not an icon Phosphor draws at that weight`));
  }

  const missingNames = new Set([...missing.values()].flatMap((names) => [...names].map((one) => `ph-${one}`)));
  const drawnByMembers = new Set(sources.flatMap((source) => [...iconMemberGlyphs(source)]));
  if (expressive || sources.some(handsIconExpression)) for (const glyph of glyphNames(yours)) drawnByMembers.add(glyph);
  for (const glyph of glyphNames(yours)) {
    if (drawnByMembers.has(glyph) || missingNames.has(glyph)) continue;
    reports.push(report('glyph', `${glyph} is in the sprite, and no literal in an ArenaIcon, arena-icon or icon attribute names it`));
  }

  const name = contentName(SPRITE_STEM, 'svg', svg);
  const module = spriteModule(name);
  const empty = kept === 0;
  const summary = empty
    ? `0 symbol(s), no weight drawn by your sources or by the Arena components they draw, ${svg.length} bytes`
    : `${kept} symbol(s), ${glyphNames(yours).size} named by your sources and `
      + `${shipped ? shippedNames(shipped, counted).size : 0} drawn by Arena's own components, `
      + `${wanted.length} weight(s), ${svg.length} bytes`;
  return {
    code: 0,
    reports,
    fatal: [],
    files: [
      { name, path: join(options.out, name), content: svg, summary },
      { name: SPRITE_MODULE, path: join(options.out, SPRITE_MODULE), content: module.js, summary: `exports ${name}` },
      { name: SPRITE_TYPES, path: join(options.out, SPRITE_TYPES), content: module.dts, summary: `${module.dts.length} bytes` },
    ],
  };
}

const failed = (code: 1 | 2, fatal: string[], reports: Report[] = []): Plan =>
  ({ code, fatal, reports, notes: [], outputs: [], binaries: [], orphans: [] });

export type PlanMode = { reportsOnly?: boolean };

export async function plan(options: PlanOptions, env: PlanEnvironment, mode: PlanMode = {}): Promise<Plan> {
  const absent = missingSource(options.paths);
  if (absent !== null) return failed(2, [`${absent} is not there`]);

  let theme = themeSheets(options, env);
  if (theme.fatal.length) return failed(theme.code === 2 ? 2 : 1, theme.fatal, theme.reports);

  const fonts = await fontFiles(options, env, theme, mode.reportsOnly === true);
  if (fonts.fatal.length) return failed(2, fonts.fatal, theme.reports);
  if (Object.keys(fonts.cuts).length > 0) theme = themeSheets(options, env, fonts.cuts);
  const themeReports = [...theme.reports, ...fonts.reports];

  const icons = spriteFiles(options, env, theme.components);
  if (icons.fatal.length) return failed(icons.code === 2 ? 2 : 1, icons.fatal, [...themeReports, ...icons.reports]);

  const outputs = [...theme.sheets, ...icons.files];
  const carried = new Set<string>([...outputs, ...fonts.files].map((one) => one.name));
  const orphans = [...OUTPUT_SHEETS, ...spriteFilesIn(options.out), ...fontFilesIn(options.out, [...fonts.stems, ...writtenFontStems(options.out)])]
    .filter((name) => !carried.has(name) && existsSync(join(options.out, name)));
  return {
    code: 0,
    fatal: [],
    reports: [...themeReports, ...icons.reports],
    notes: theme.notes,
    outputs,
    binaries: fonts.files,
    orphans,
  };
}

export function sheetStates(outputs: FileOutput[]): SheetState[] {
  return outputs.map(({ path, content }) => {
    if (!existsSync(path)) return { path, state: 'missing' };
    const same = typeof content === 'string' ? readFileSync(path, 'utf8') === content : Buffer.from(content).equals(readFileSync(path));
    return { path, state: same ? 'current' : 'stale' };
  });
}
