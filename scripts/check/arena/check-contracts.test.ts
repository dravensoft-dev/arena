/* The gate reads the filesystem; these drive its pure functions with the shapes a real
 * mistake would produce, since the tree it guards is correct by construction today. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  LEVELS, GENERATED, SHAPE, rootProblems, levelProblems, generatedProblems,
  zeroContractLevelProblems,
} from './check-contracts.ts';

const STYLES = ['AGENTS.md', 'ColorSlots.md', 'Scales.md', 'StylePlugins.md', 'TokenTypes.md', 'colors.css', 'contrast.css', 'environment.css', 'reset.css'];
const ROOT_OK = ['AGENTS.md', 'NPM.md', 'api', 'behaviour', 'design', 'design-generated'];

test('the declared shape is three levels and one generated sibling, and nothing else', () => {
  assert.deepEqual(LEVELS, ['api', 'behaviour', 'design']);
  assert.equal(GENERATED, 'design-generated');
  assert.deepEqual([...SHAPE.keys()], LEVELS);
});

test('rootProblems admits the npm page and the three levels, and names a missing page or level, a fourth directory and a stray file', () => {
  const rows: { name: string; entries: string[]; count?: number; pattern?: RegExp }[] = [
    { name: 'the npm page is admitted here and nowhere else, because its reader is not on this branch', entries: ROOT_OK, count: 0 },
    { name: 'a missing npm page is reported', entries: ROOT_OK.filter((entry) => entry !== 'NPM.md'), count: 1, pattern: /NPM\.md is missing/ },
    { name: 'a fourth directory beside the three is a problem, which is the case that passed every gate', entries: [...ROOT_OK, 'tokens'], count: 1,
      pattern: /contracts\/tokens is not one of the three levels/ },
    { name: 'a stray file at the roof is the same problem, because a level is not the only thing that can be added', entries: [...ROOT_OK, 'notes.md'],
      pattern: /contracts\/notes\.md is not one of/ },
    { name: 'a missing level is reported, not silently skipped', entries: ['AGENTS.md', 'api', 'design', 'design-generated'],
      pattern: /contracts\/behaviour is missing/ },
  ];
  for (const row of rows) {
    const problems = rootProblems(row.entries);
    if (row.count !== undefined) assert.equal(problems.length, row.count, `${row.name}: finding count`);
    if (row.pattern) assert.match(problems[0] ?? '', row.pattern, row.name);
  }
});

test('levelProblems keeps the vocabulary directories, the normative document, the extensions and the stylesheets by name, and names what is unearned', () => {
  const isDir = (n: string) => !n.includes('.');
  const rows: { name: string; level: string; entries: string[]; isDir: (n: string) => boolean; count: number; patterns: RegExp[] }[] = [
    { name: 'api keeps two vocabulary directories', level: 'api', entries: ['AGENTS.md', 'MemberForms.md', 'components', 'types'], isDir, count: 0, patterns: [] },
    { name: 'behaviour keeps none', level: 'behaviour', entries: ['AGENTS.md', 'button.json', 'none.json'], isDir, count: 0, patterns: [] },
    { name: 'an unearned inner directory is a problem, and the message says why', level: 'behaviour', entries: ['AGENTS.md', 'patterns'],
      isDir: (n) => n === 'patterns', count: 1,
      patterns: [/is an inner directory contracts\/AGENTS\.md does not declare/, /earned, never assumed/] },
    { name: 'a level missing its normative document is a problem', level: 'behaviour', entries: ['button.json'], isDir: () => false, count: 1,
      patterns: [/contracts\/behaviour\/AGENTS\.md is missing/] },
    { name: 'a stray file inside a level is caught by extension, which is how every reader of that level finds its work', level: 'behaviour',
      entries: ['AGENTS.md', 'button.json', 'scratch.txt'], isDir: () => false, count: 1,
      patterns: [/contracts\/behaviour\/scratch\.txt is neither AGENTS\.md nor a \.json source/] },
    { name: 'design keeps its three hand-authored stylesheets by name, because none is a token source', level: 'design',
      entries: [...STYLES, 'palette.dark.json'], isDir: () => false, count: 0, patterns: [] },
    { name: "a level's statement may be several documents, and every one of them is named or it is a stray", level: 'design',
      entries: STYLES.slice(1), isDir: () => false, count: 1, patterns: [/contracts\/design\/AGENTS\.md is missing/] },
    { name: 'a fourth stylesheet is a problem until contracts/AGENTS.md names it, which is the point of listing them', level: 'design',
      entries: [...STYLES, 'motion.css'], isDir: () => false, count: 1,
      patterns: [/contracts\/design\/motion\.css is neither AGENTS\.md nor ColorSlots\.md nor Scales\.md/] },
  ];
  for (const row of rows) {
    const problems = levelProblems(row.level, row.entries, row.isDir);
    assert.equal(problems.length, row.count, `${row.name}: finding count`);
    for (const pattern of row.patterns) assert.match(problems[0] ?? '', pattern, `${row.name}: ${pattern}`);
  }
});

test('a generated stylesheet without the infix is a problem', () => {
  assert.deepEqual(generatedProblems(['palette.generated.css', 'fonts.generated.css']), []);
  assert.match(generatedProblems(['palette.css'])[0] ?? '', /carries no \.generated\. infix/);
});

test('an empty result set fails rather than passing vacuously', () => {
  assert.deepEqual(zeroContractLevelProblems(46), []);
  assert.match(zeroContractLevelProblems(0)[0] ?? '', /found 0 entries under contracts\//);
});
