/* The consumer page for the arena command against the command itself. Every command the dispatch
 * carries has a row, every row lists every spelling of every flag that command takes, every kind
 * --strict holds is named beside its command, and every `arena <word>` the page writes is a word
 * the dispatch answers. The page is prose a person writes, so this is what keeps it from naming a
 * flag the parser refuses or missing one it accepts. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { COMMANDS } from './arena.ts';
import { COMMAND_NAMES, FLAGS, FLAG_NAMES, SPECS } from './args.ts';
import { KINDS_BY_COMMAND } from './reports.ts';

const PAGE = fileURLToPath(new URL('../../../../skills/design/references/cli.md', import.meta.url));
const ANSWERED = new Set<string>([...COMMAND_NAMES, 'help', '--help', '-h', '--version']);

const page = () => {
  assert.ok(existsSync(PAGE), `${PAGE} is not there`);
  return readFileSync(PAGE, 'utf8');
};

function row(source: string, command: string) {
  const line = source.split('\n').find((one) => one.startsWith(`| \`arena ${command}\``));
  assert.ok(line, `the command table has no row for arena ${command}`);
  return line;
}

function code(source: string) {
  const fences = [...source.matchAll(/```[^\n]*\n([\s\S]*?)```/g)].map((match) => match[1] ?? '');
  const prose = source.replace(/```[^\n]*\n[\s\S]*?```/g, '');
  const spans = [...prose.matchAll(/`([^`\n]+)`/g)].map((match) => match[1] ?? '');
  return [...fences, ...spans];
}

test('the command table has a row for every command the dispatch carries', () => {
  const source = page();
  assert.deepEqual(Object.keys(COMMANDS).sort(), [...COMMAND_NAMES].sort());
  for (const command of COMMAND_NAMES) row(source, command);
});

test('every row names every spelling of every flag its command takes, and no other flag', () => {
  const source = page();
  for (const command of COMMAND_NAMES) {
    const line = row(source, command);
    for (const name of FLAG_NAMES) {
      for (const spelling of FLAGS[name].spellings) {
        const named = new RegExp(`\`${spelling}(?![\\w-])`).test(line);
        if (SPECS[command].flags.includes(name)) assert.ok(named, `the arena ${command} row does not name ${spelling}`);
        else assert.ok(!named, `the arena ${command} row names ${spelling}, which arena ${command} refuses`);
      }
    }
  }
});

test('a flag no command takes is named nowhere on the page', () => {
  const source = page();
  const taken = new Set(COMMAND_NAMES.flatMap((command) => SPECS[command].flags));
  for (const name of FLAG_NAMES) {
    if (taken.has(name)) continue;
    for (const spelling of FLAGS[name].spellings) {
      assert.ok(!new RegExp(`${spelling}(?![\\w-])`).test(source), `the page names ${spelling}, which every command refuses`);
    }
  }
});

test('every kind --strict holds is named on the line that names its command', () => {
  const source = page();
  for (const [command, kinds] of Object.entries(KINDS_BY_COMMAND)) {
    const line = source.split('\n').find((one) => one.startsWith(`| \`arena ${command} --strict\``));
    assert.ok(line, `the strict table has no row for arena ${command}`);
    for (const kind of kinds) assert.ok(line.includes(`\`${kind}\``), `the arena ${command} --strict row does not name ${kind}`);
  }
});

test('every arena <word> the page writes is a word the dispatch answers', () => {
  const named = code(page()).flatMap((text) => [...text.matchAll(/(?<![\w@/.:-])arena\s+([^\s`"',;)]+)/g)].map((match) => match[1] ?? ''));
  assert.ok(named.length > 0, 'the page writes no arena command at all');
  for (const word of named.filter((one) => !/^<\w+>$/.test(one))) assert.ok(ANSWERED.has(word), `the page writes arena ${word}, which the dispatch does not answer`);
});
