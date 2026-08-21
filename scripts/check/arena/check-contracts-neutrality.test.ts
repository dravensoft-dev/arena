import test from 'node:test';
import assert from 'node:assert/strict';
import {
  BROWSER_BOUND, CSS_VALUED, WEB_PROSE, WEB_SHAPED, collect, memberPath, proseProblems, strands,
  valueProblems, zeroRecordProblems, zeroWalkProblems,
} from './check-contracts-neutrality.ts';

const of = (rel: string, tree: unknown) => strands(rel, tree);

test('a string under a description key is prose and every other string is a value', () => {
  const all = of('x.json', {
    api: { width: { default: 'calc(1px)', description: 'a calc() explained' } },
  });
  const value = all.find((s) => s.path.endsWith('.default'));
  const prose = all.find((s) => s.path.endsWith('.description'));
  assert.equal(value?.prose, false);
  assert.equal(prose?.prose, true);
});

test('a value carrying a browser construct fails, and the record is what makes it not fail', () => {
  const tree = { api: { width: { default: 'calc(var(--sp-1) * 120)' } } };
  const loose = valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND, new Map());
  assert.equal(loose.length, 1);
  assert.match(loose[0] ?? '', /cannot execute/);

  const recorded = new Map([['contracts/api/components/Ghost.json:api.width', 'on the record']]);
  assert.deepEqual(valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND, recorded), []);
});

test('a recorded member whose value stopped being CSS fails, so the record cannot outlive the debt', () => {
  const tree = { api: { width: { default: '480' } } };
  const recorded = new Map([['contracts/api/components/Ghost.json:api.width', 'on the record']]);
  const problems = valueProblems(of('contracts/api/components/Ghost.json', tree), BROWSER_BOUND, recorded);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /outlived the debt it records/);
});

test('a member path drops the field the value sat in, so one entry covers its type and its default', () => {
  const all = of('x.json', { api: { width: { default: 'calc(1px)', type: 'string' } } });
  const paths = new Set(all.filter((s) => !s.prose).map(memberPath));
  assert.deepEqual([...paths], ['x.json:api.width']);
});

test('prose speaking web idiom fails unless recorded, and a recorded one that stopped fails too', () => {
  const web = of('x.json', { a: { $description: 'add var(--pad-safe-bottom) to it' } });
  assert.match(proseProblems(web, BROWSER_BOUND, new Map())[0] ?? '', /WEB_PROSE does not name it/);
  assert.deepEqual(proseProblems(web, BROWSER_BOUND, new Map([['x.json:a', 'recorded']])), []);

  const plain = of('x.json', { a: { $description: 'a plain sentence' } });
  const stale = proseProblems(plain, BROWSER_BOUND, new Map([['x.json:a', 'recorded']]));
  assert.match(stale[0] ?? '', /no longer speaks web idiom/);
});

test('an empty walk, an empty record and an empty exemption set are all failures', () => {
  assert.deepEqual(zeroWalkProblems(1, 1, 1), []);
  assert.equal(zeroWalkProblems(0, 1, 1).length, 1);
  assert.equal(zeroWalkProblems(1, 0, 1).length, 1);
  assert.equal(zeroWalkProblems(1, 1, 0).length, 1);
  assert.deepEqual(zeroRecordProblems(1), []);
  assert.equal(zeroRecordProblems(0).length, 1);
});

test('the tree passes its own claim, over more than nothing', () => {
  const { files, all, problems } = collect();
  assert.deepEqual(problems, []);
  assert.ok(files.length > 0);
  assert.ok(all.filter((s) => !s.prose).length > 0, 'a gate reading no value checks no value');
});

test('every record still names something the payload holds', () => {
  const { all } = collect();
  const values = new Set(all.filter((s) => !s.prose).map(memberPath));
  for (const member of CSS_VALUED.keys()) {
    assert.ok(values.has(member), `CSS_VALUED names ${member} and no value under it was read`);
  }
  const proseAt = new Set(all.filter((s) => s.prose).map((s) => `${s.rel}:${s.path.split('.').slice(0, -1).join('.') || '(root)'}`));
  for (const at of WEB_PROSE.keys()) {
    assert.ok(proseAt.has(at), `WEB_PROSE names ${at} and no description was read there`);
  }
  assert.ok(WEB_SHAPED.size > 0);
  assert.ok(BROWSER_BOUND.size > 0);
});
