/* Whether a catalogue entry is still usable by somebody who is not in this tree. Nothing under
 * plugin-style-store/catalogue is compiled, so no other gate reads one: an entry that stopped
 * answering a role the kernel gained is a build that refuses in every project that took it, and
 * none of those projects is here to report it. The rules are the shipped command's own, imported
 * rather than restated, so an entry is measured by what will measure it once it is copied. Two of
 * them are not: floorProblems reads declarations a build already resolved, and keyProblems asks
 * every token for a $description that no plugin in this tree carries and that would put the
 * reasoning somewhere ENTRY.md already owns. What that rule holds besides the description, a key
 * that is a role at all and a type agreeing with roles.json, is held below in this gate's words. */

import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot } from '../../lib/arena/repo-root.ts';
import {
  POLARITIES, FONT_ROLES, requiredKeys,
} from '../../generate/core/arena-to-prod/palette-keys.ts';
import { ROLES, movedTokens } from './check-style-plugin.ts';
import {
  nameProblems, totalityProblems, valueProblems,
} from '../../generate/core/arena-to-prod/style-plugin-rules.ts';

export const CATALOGUE = 'plugin-style-store/catalogue';

export const TOKENS = 'plugin.tokens.json';

export const SHEET = 'plugin.css';

export const CONFIG = 'arena.config.json';

export const CARD = 'ENTRY.md';

export const CARRIES = [TOKENS, SHEET, CONFIG, CARD];

export const node = {
  name: 'check:catalogue',
  reads: [ROLES, `${CATALOGUE}/**`],
  writes: [],
  feeds: [],
};

const PART_HOOK = /^\s*\[data-arena-part=/;

const LAYER = /@layer/;

export function entries(base = repoRoot) {
  const dir = join(base, CATALOGUE);
  if (!existsSync(dir)) return [];
  return readdirSync(dir, { withFileTypes: true })
    .filter((one) => one.isDirectory())
    .map((one) => one.name)
    .sort();
}

export function missingFileProblems(name: string, base = repoRoot) {
  return CARRIES
    .filter((file) => !existsSync(join(base, CATALOGUE, name, file)))
    .map((file) => `${CATALOGUE}/${name} carries no ${file}. An entry is taken whole by a project `
      + 'that has not decided what it looks like, and a part of one is a decision that project has '
      + 'to make without being told it is making it.');
}

export function shapeProblems(
  where: string, key: string, token: { $type?: string }, role: { $type?: string } | undefined,
) {
  if (!role)
    return [`${where}: --${key} is not a role in ${ROLES}. An entry re-answers the kernel's `
      + 'questions and asks none of its own: a scale, a palette colour or a density step is shared '
      + 'by every use that wants that value, so moving one is not a style plugin but a different '
      + 'Arena, and a name that is neither reaches nothing at all.'];
  if (token?.$type !== role.$type)
    return [`${where}: --${key} is a ${token?.$type} here and a ${role.$type} in ${ROLES}, and the `
      + 'two cannot disagree. The emitter serialises by the authored type, so the wrong one is a '
      + 'declaration the browser drops rather than a value that looks off.'];
  return [];
}

export function tokenProblems(name: string, roles: Record<string, unknown>, base = repoRoot) {
  const where = `${CATALOGUE}/${name}/${TOKENS}`;
  const tokens = readJson(join(base, where)) as Record<string, unknown>;
  const problems = [...nameProblems(name, POLARITIES, where)];

  for (const { key, token } of movedTokens(tokens)) {
    const role = roles[key] as Parameters<typeof valueProblems>[3] | undefined;
    problems.push(...shapeProblems(where, key, token, role));
    if (role) problems.push(...valueProblems(where, key, token, role));
  }

  problems.push(...totalityProblems(Object.keys(roles), Object.keys(tokens))
    .map((problem) => `${where}: ${problem}`));
  return problems;
}

export function sheetProblems(name: string, base = repoRoot) {
  const where = `${CATALOGUE}/${name}/${SHEET}`;
  const css = readFileSync(join(base, where), 'utf8');
  const problems = [];

  if (LAYER.test(css))
    problems.push(`${where} spells @layer. The build wraps an entry's sheet in the reserved layer `
      + 'itself, and a layer typed by hand is one an author can get wrong in a way nothing reports.');

  const selectors = css
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('}')
    .map((block) => block.split('{')[0] ?? '')
    .flatMap((head) => head.split(','))
    .map((one) => one.trim())
    .filter(Boolean);

  for (const selector of selectors)
    if (!PART_HOOK.test(selector))
      problems.push(`${where} selects ${selector}, which is not a data-arena-part hook. An entry `
        + 'reaches a component through the hook every slot carries and through nothing else: a class '
        + 'a component renders is compiler output that no contract names, so a rule resting on one '
        + 'is a rule a release may silently stop matching.');

  return problems;
}

export function configProblems(name: string, base = repoRoot) {
  const where = `${CATALOGUE}/${name}/${CONFIG}`;
  const config = readJson(join(base, where)) as {
    stylePlugins?: unknown; palettes?: { name?: string; polarity?: string; colors?: Record<string, string> }[];
    fonts?: Record<string, unknown>;
  };
  const problems = [];

  const declared = Array.isArray(config.stylePlugins) ? config.stylePlugins : [];
  if (declared[0] !== `./design/${name}`)
    problems.push(`${where} names ${JSON.stringify(declared[0])} first in stylePlugins, and this `
      + `entry is ./design/${name}. The config ships so a project can run it where it puts the `
      + 'directory, and a first entry naming somewhere else resolves to nothing there.');

  const palettes = config.palettes ?? [];
  for (const polarity of POLARITIES)
    if (!palettes.some((one) => one.polarity === polarity))
      problems.push(`${where} declares no ${polarity} palette. Arena is two themes before it is `
        + 'anything else, and an entry carrying one of them hands a project a build that has a '
        + 'polarity nobody authored.');

  for (const palette of palettes)
    for (const key of requiredKeys())
      if (!palette.colors?.[key])
        problems.push(`${where}: the ${palette.name} palette answers no ${key}. Every colour role `
          + 'resolves to one of these, so a missing key is a role that resolves to nothing and a '
          + 'declaration the browser drops.');

  for (const slot of Object.keys(FONT_ROLES))
    if (!config.fonts?.[slot])
      problems.push(`${where} declares no ${slot} font. The three slots are what ff-heading, `
        + 'ff-body and ff-mono resolve through, and an unanswered slot leaves type to whatever the '
        + 'document already had.');

  return problems;
}

export function zeroScanProblems(found: string[]) {
  if (found.length > 0) return [];
  return [`walked 0 entr(ies) under ${CATALOGUE}, so this gate holds nothing and reports clean. `
    + 'The catalogue is what a cold start picks from, and an empty one is a skill routing a reader '
    + 'to a directory with no answer in it.'];
}

export function catalogueProblems(base = repoRoot) {
  const found = entries(base);
  const problems = [...zeroScanProblems(found)];
  const roles = readJson(join(repoRoot, ROLES)) as Record<string, unknown>;

  for (const name of found) {
    const missing = missingFileProblems(name, base);
    problems.push(...missing);
    if (missing.length > 0) continue;
    problems.push(
      ...tokenProblems(name, roles, base),
      ...sheetProblems(name, base),
      ...configProblems(name, base),
    );
  }

  return { problems, found };
}

function main() {
  const { problems, found } = catalogueProblems();
  if (problems.length > 0) {
    console.error(`check-catalogue: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`check-catalogue: ${found.length} entr(ies) answer every role the kernel declares, `
    + 'paint through part hooks only, and ship a config a project can run where it puts it');
}

if (isMainModule(import.meta.url)) main();
