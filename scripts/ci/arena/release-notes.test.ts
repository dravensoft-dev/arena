/* The script reads a real repository, so these drive its pure halves with a stub git: the tag
 * ordering a first release has to survive, the merge subjects that would otherwise be the whole
 * page, and the em dash a hundred subjects carry into prose that punctuates without one. */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  AREA, MERGE, UNGROUPED, REPOSITORY, unwrapDashes, previousTag, subjects, grouped, body, notes,
} from './release-notes.ts';

function stub(answers: Record<string, string>) {
  return (...args: string[]) => {
    const key = args.join(' ');
    if (!(key in answers)) throw new Error(`no stub for: git ${key}`);
    return answers[key] ?? '';
  };
}

const TAGS = 'tag --sort=-v:refname';

test('the previous tag is the next one down in version order, and the first release has none', () => {
  const git = stub({ [TAGS]: 'v2.0.0\nv1.1.0\nv1.0.0' });
  assert.equal(previousTag('v2.0.0', git), 'v1.1.0');
  assert.equal(previousTag('v1.0.0', git), undefined);
});

test('a tag this repository does not carry is a throw rather than an empty page', () => {
  const git = stub({ [TAGS]: 'v1.0.0' });
  assert.throws(() => previousTag('v9.9.9', git), /not a tag/);
});

test('a merge subject never reaches the page, since every release arrives as one', () => {
  const git = stub({
    [TAGS]: 'v2.0.0\nv1.0.0',
    'log --no-merges --format=%s v1.0.0..v2.0.0':
      'Merge pull request #19 from dravensoft-dev/develop\ngates: a real defect\nMerge branch \'main\' into develop',
  });
  assert.deepEqual(subjects('v2.0.0', 'v1.0.0', git), ['gates: a real defect']);
});

test('subjects group by the area each one names, and one that names none is still printed', () => {
  const areas = grouped(['gates: one thing', 'gates: another', 'preparing minor release']);
  assert.deepEqual([...areas.keys()], ['gates', UNGROUPED]);
  assert.deepEqual(areas.get('gates'), ['one thing', 'another']);
  assert.deepEqual(areas.get(UNGROUPED), ['preparing minor release']);
});

test('an area of more than one word is an area, because subjects here are written that way', () => {
  assert.equal(AREA.exec('release steps: the checklist pointed somewhere')?.[1], 'release steps');
  assert.equal(AREA.exec('arena-to-prod: the audit read one line')?.[1], 'arena-to-prod');
  assert.equal(AREA.exec('no colon here at all'), null);
});

test('an em dash becomes a comma, because a release page is prose and this one punctuates without it', () => {
  assert.equal(unwrapDashes('a — b'), 'a, b');
  assert.equal(unwrapDashes('a—b'), 'a, b');
  assert.ok(!unwrapDashes('one — two — three').includes('—'));
});

test('the ungrouped section sorts last, so a release does not open with its own bookkeeping', () => {
  const page = body('v2.0.0', 'v1.0.0', ['preparing release', 'zebra: last alphabetically', 'alpha: first']);
  const order = ['### alpha', '### zebra', `### ${UNGROUPED}`].map((h) => page.indexOf(h));
  assert.ok(order.every((at) => at !== -1), 'every section is on the page');
  assert.deepEqual([...order].sort((a, b) => a - b), order, 'and they are in that order');
});

test('the page ends with a link to every commit, comparing against the previous tag when there is one', () => {
  assert.match(body('v2.0.0', 'v1.0.0', ['a: b']), new RegExp(`${REPOSITORY}/compare/v1\\.0\\.0\\.\\.\\.v2\\.0\\.0`));
  assert.match(body('v1.0.0', undefined, ['a: b']), new RegExp(`${REPOSITORY}/commits/v1\\.0\\.0`));
});

test('a release with nothing between it and the last says so rather than printing an empty page', () => {
  assert.match(body('v2.0.0', 'v1.0.0', []), /No commit stands between v1\.0\.0 and v2\.0\.0/);
});

test('notes drives the whole of it from one tag', () => {
  const git = stub({
    [TAGS]: 'v2.0.0\nv1.0.0',
    'log --no-merges --format=%s v1.0.0..v2.0.0': 'gates: a defect — stated with a dash',
  });
  const page = notes('v2.0.0', git);
  assert.match(page, /### gates/);
  assert.match(page, /a defect, stated with a dash/);
  assert.ok(!page.includes('—'));
});

test('MERGE knows the three shapes git writes, and nothing else', () => {
  assert.ok(MERGE.test('Merge pull request #1 from a/b'));
  assert.ok(MERGE.test("Merge branch 'main' into develop"));
  assert.ok(MERGE.test('Merge remote-tracking branch origin/main'));
  assert.ok(!MERGE.test('merges: the gate that reads them'));
});
