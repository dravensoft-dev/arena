/* Writes the voice catalogue into the router's @voices region. The choice of voice is the first
 * decision a screen takes and the only one every later decision is read against, so it belongs on
 * the route before the component index rather than on the install page a builder may never open.
 * The table is generated because a third voice landing has to reach the reader without anybody
 * remembering: the names, the work each is for and the mechanism each groups by are all declared
 * in contracts/design/extension.*.json, and the base voice is the one row with no contract because
 * it is what the tokens already are. The principle vocabulary is imported from the gate that holds
 * it rather than restated here, since a second copy of "what says two things belong together"
 * would drift from the invariant that enforces it. */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import {
  extensionFiles, extensionName, groupingOf, jobOf, PRINCIPLES, RESERVED_NAME,
} from '../../check/core/check-extensions.ts';
import { escapeCell } from './generate-skills.ts';

export const VOICES_TARGET = 'SKILL.md';
export const DESIGN_DIR = join('contracts', 'design');

export const OPEN_LINE = /^<!-- @voices GENERATED from [^\n]*-->$/m;
export const CLOSE_LINE = '<!-- @voices end -->';
export const openLine = () => '<!-- @voices GENERATED from contracts/design/extension.*.json.'
  + ' Edit the contract, not this table. -->';

export const BASE_VOICE = {
  name: RESERVED_NAME,
  grouping: 'common-region',
  job: 'scan and operate: dashboards, consoles, tables, admin and internal tooling, anything read '
    + 'a screenful at a time',
  why: 'the one row with no contract file, because it is not an extension: it is what the token '
    + 'layer already is, and "none" is how a consumer says it wants no extension.',
};

export const node = {
  name: 'generate:voices',
  reads: ['contracts/design/extension.*.json'],
  writes: [VOICES_TARGET],
  feeds: ['check:routes', 'check:skills', 'check:community'],
};

export type Voice = { name: string; job: string; grouping: string; says: string };

export function saysOf(grouping: string) {
  return PRINCIPLES.get(grouping)?.says ?? '';
}

export function voices(base = root): Voice[] {
  const dir = join(base, DESIGN_DIR);
  const shipped = extensionFiles(dir).map((file) => {
    const name = extensionName(file);
    const tokens = readJson(join(dir, file));
    const grouping = groupingOf(tokens) ?? '';
    return { name, job: jobOf(tokens) ?? '', grouping, says: saysOf(grouping) };
  });
  return [
    { ...BASE_VOICE, says: saysOf(BASE_VOICE.grouping) },
    ...shipped,
  ];
}

export function classOf(voice: Voice) {
  return voice.name === RESERVED_NAME ? 'none, the default' : `\`.arena-${voice.name}\``;
}

export function voiceTable(base = root) {
  return [
    '| Voice | The work it is for | What says two things belong together |',
    '|---|---|---|',
    ...voices(base)
      .map((voice) => `| ${classOf(voice)} | ${escapeCell(voice.job)} | ${escapeCell(voice.says)} |`),
  ];
}

export const NUMBER_WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six'];

export function countWord(n: number) {
  const word = NUMBER_WORDS[n];
  if (word === undefined)
    throw new Error(
      `generate-voices: ${n} voices, and NUMBER_WORDS stops at ${NUMBER_WORDS.length - 1}. A page `
      + 'says how many ship in words rather than digits, so the list grows with the catalogue.',
    );
  return word;
}

export function renderRegion(base = root) {
  return [openLine(), '', ...voiceTable(base), '', CLOSE_LINE].join('\n');
}

export function applyRegion(source: string, region: string) {
  const lines = source.split('\n');
  const opensAt = lines.findIndex((line) => OPEN_LINE.test(line));
  if (opensAt === -1)
    throw new Error(
      `generate-voices: ${VOICES_TARGET} carries no @voices region. The router is hand-written and `
      + 'a person chooses where the catalogue sits on the route, so this writes a region that is '
      + 'already there rather than placing one.',
    );
  const closesAt = lines.indexOf(CLOSE_LINE, opensAt);
  if (closesAt === -1) throw new Error('generate-voices: the @voices region opens and never closes');
  return [...lines.slice(0, opensAt), ...region.split('\n'), ...lines.slice(closesAt + 1)].join('\n');
}

export function writeVoices({ base = root, read = readFileSync, write = writeFileSync } = {}) {
  const path = join(base, VOICES_TARGET);
  const before = read(path, 'utf8');
  const after = applyRegion(before, renderRegion(base));
  if (after === before) return [];
  write(path, after);
  return [VOICES_TARGET];
}

function main() {
  const written = writeVoices();
  console.log(written.length > 0
    ? `generate-voices: wrote ${VOICES_TARGET}`
    : `generate-voices: ${VOICES_TARGET} already matches the catalogue`);
}

if (isMainModule(import.meta.url)) main();
