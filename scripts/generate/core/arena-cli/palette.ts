/* The palette a user defines at runtime, checked and declared with the build's own code. It is
 * node-free and shared by the CLI and both framework packages: it reads no file, so the roles,
 * levels and names a build knows arrive as the data arena build writes into
 * arena.runtime.generated.json. Every type an exported signature names is declared here, so the
 * declaration file emitted for this module imports nothing. A palette that fails a check is
 * returned with its reports and still declared; the checks tell, they do not refuse. */

import { HEX, KEBAB, paletteDeclarations, paletteInputProblems, paletteMessages } from './theme-css.ts';
import { reservedProblems } from './style-plugin-rules.ts';

export type ArenaPolarity = 'dark' | 'light';
export type ArenaPaletteInput = { polarity: ArenaPolarity; colors: Record<string, string> };
export type ArenaPaletteReport = { kind: string; message: string; rule?: string };
export type ArenaRuntimeData = { arenaRuntimePalettes: 1; [key: string]: unknown };
export type ArenaRuntimePalette = { name: string; polarity: ArenaPolarity; properties: Record<string, string> };

type Held = {
  hasRoot: boolean;
  declared: string[];
  taken: string[];
  levels: Parameters<typeof paletteDeclarations>[2];
  washes: Parameters<typeof paletteMessages>[3];
  roles: Record<ArenaPolarity, Record<string, string>>;
};

function held(fn: string, data: unknown): Held {
  const found = data as { arenaRuntimePalettes?: unknown } | null | undefined;
  if (found === null || typeof found !== 'object' || found.arenaRuntimePalettes !== 1) {
    throw new Error(`${fn}: no runtime data. Set "runtimePalettes": true in arena.config.json, run arena build, `
      + 'and pass the contents of arena.runtime.generated.json');
  }
  return found as unknown as Held;
}

function checked(input: unknown): ArenaPaletteInput {
  const problems = paletteInputProblems('palette', (input ?? {}) as { polarity?: unknown; colors?: unknown });
  if (problems.length > 0) throw new Error(problems.join('\n'));
  const { polarity, colors } = input as ArenaPaletteInput;
  const lowered: Record<string, string> = {};
  for (const [key, value] of Object.entries(colors)) lowered[key] = HEX.test(value) ? value.toLowerCase() : value;
  return { polarity, colors: lowered };
}

function rolesOf(data: Held, polarity: ArenaPolarity): Map<string, string> {
  return new Map(Object.entries(data.roles[polarity]));
}

export function arenaCheckPalette(input: unknown, data: unknown): ArenaPaletteReport[] {
  const known = held('arenaCheckPalette', data);
  const palette = checked(input);
  return paletteMessages(palette, rolesOf(known, palette.polarity), known.levels, known.washes, known.hasRoot);
}

export function arenaPaletteDeclarations(input: unknown, data: unknown): Record<string, string> {
  const known = held('arenaPaletteDeclarations', data);
  const palette = checked(input);
  const out: Record<string, string> = {};
  for (const declaration of paletteDeclarations(palette, rolesOf(known, palette.polarity), known.levels)) {
    const at = declaration.indexOf(':');
    out[declaration.slice(0, at)] = declaration.slice(at + 1).replace(/;$/, '');
  }
  return out;
}

function nameProblem(name: string, data: Held): string | null {
  if (typeof name !== 'string' || !KEBAB.test(name)) return `arenaRuntimePalette: ${JSON.stringify(name)} is not a kebab-case name`;
  if (data.declared.includes(name)) return `arenaRuntimePalette: "${name}" is a palette the build declares, so its class .arena-${name} already exists`;
  if (data.taken.includes(name)) return `arenaRuntimePalette: "${name}" is a class this package ships (.arena-${name})`;
  return reservedProblems(name, 'arenaRuntimePalette')[0] ?? null;
}

export function arenaRuntimePalette(
  name: string, input: unknown, data: unknown,
): { palette: ArenaRuntimePalette; reports: ArenaPaletteReport[] } {
  const known = held('arenaRuntimePalette', data);
  const refused = nameProblem(name, known);
  if (refused !== null) throw new Error(refused);
  const palette = checked(input);
  return {
    palette: {
      name,
      polarity: palette.polarity,
      properties: { ...arenaPaletteDeclarations(palette, data), '--arena-palette': name },
    },
    reports: arenaCheckPalette(palette, data),
  };
}
