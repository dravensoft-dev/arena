import { test } from 'bun:test';
import assert from 'node:assert/strict';
import {
  HARNESS_KEYS, MAX_DESCRIPTION, MAX_BODY_LINES, bodyProblems, collect, descriptionProblems,
  frontmatterOf, frontmatterProblems, keyProblems, nameProblems, scalarProblems,
  soleSkillProblems, staleHarnessProblems, trackedSkills, zeroSkillProblems,
} from './check-skill-spec.ts';

test('a name must match the directory that holds it', () => {
  assert.deepEqual(nameProblems('skills/design/SKILL.md', 'design'), []);
  assert.equal(nameProblems('skills/design/SKILL.md', 'router').length, 1);
});

test('a name is lowercase, hyphen separated, and never opens, closes or doubles a hyphen', () => {
  for (const bad of ['Design', '-design', 'design-', 'de--sign', 'design_x', 'a'.repeat(65)]) {
    assert.ok(nameProblems(`skills/${bad}/SKILL.md`, bad).length > 0, bad);
  }
});

test('an empty name fails on its length and on its shape rather than passing either', () => {
  assert.equal(nameProblems('skills/design/SKILL.md', '').length, 3);
});

test('a description is present and inside the length the standard fixes', () => {
  assert.equal(descriptionProblems('a/SKILL.md', '').length, 1);
  assert.equal(descriptionProblems('a/SKILL.md', 'x'.repeat(MAX_DESCRIPTION + 1)).length, 1);
  assert.deepEqual(descriptionProblems('a/SKILL.md', 'what it does, and when to reach for it'), []);
});

test('a frontmatter key is one the standard defines or one HARNESS_KEYS declares', () => {
  assert.deepEqual(keyProblems('a/SKILL.md', ['name', 'description', 'license', 'metadata']), []);
  assert.equal(keyProblems('a/SKILL.md', ['name', 'description', 'colour']).length, 1);
  assert.equal(keyProblems('a/SKILL.md', ['name', 'description', 'user-invocable']).length, 1,
    'the field the standard refuses sets a value it already defaults to, so it buys nothing');
});

test('HARNESS_KEYS is empty, and the emptiness is the claim', () => {
  assert.deepEqual([...HARNESS_KEYS.keys()], []);
  assert.deepEqual(staleHarnessProblems(['name', 'description']), []);
});

test('an unquoted value carrying a colon and a space does not parse as YAML', () => {
  const bad = new Map([['description', 'the language and not the skin: it ships a palette']]);
  assert.equal(scalarProblems('a/SKILL.md', bad).length, 1);
  const quoted = new Map([['description', '"the language and not the skin: it ships a palette"']]);
  assert.deepEqual(scalarProblems('a/SKILL.md', quoted), []);
  const plain = new Map([['name', 'design']]);
  assert.deepEqual(scalarProblems('a/SKILL.md', plain), []);
});

test('a body over the ceiling the standard recommends is a finding', () => {
  assert.equal(bodyProblems('a/SKILL.md', Array(MAX_BODY_LINES + 1).fill('x').join('\n')).length, 1);
  assert.deepEqual(bodyProblems('a/SKILL.md', Array(MAX_BODY_LINES).fill('x').join('\n')), []);
});

test('a second file under the reserved name is a broken skill, whatever it holds', () => {
  assert.equal(soleSkillProblems(['skills/design/SKILL.md', 'frameworks/SKILL.md']).length, 1);
  assert.deepEqual(soleSkillProblems(['skills/design/SKILL.md']), []);
});

test('a file carrying no frontmatter is never discovered, so it is reported as such', () => {
  assert.equal(frontmatterProblems('a/SKILL.md', '# Arena\n').length, 1);
  assert.deepEqual(frontmatterProblems('a/SKILL.md', '---\nname: a\n---\n# Arena\n'), []);
});

test('the frontmatter reader keeps top level keys and drops what is nested under them', () => {
  const front = frontmatterOf('---\nname: design\nmetadata:\n  homepage: x\n---\nbody\n');
  assert.deepEqual(front?.keys, ['name', 'metadata']);
  assert.equal(front?.values.get('name'), 'design');
  assert.equal(front?.body, 'body\n');
});

test('finding nothing is a failure rather than a clean pass', () => {
  assert.equal(zeroSkillProblems([]).length, 1);
  assert.deepEqual(zeroSkillProblems(['skills/design/SKILL.md']), []);
});

test('the index carries at least one file under the reserved name', () => {
  assert.ok(trackedSkills().length > 0, 'the walk found nothing, so every assertion below is vacuous');
});

test('this tree conforms', () => {
  const problems = collect();
  assert.deepEqual(problems, [], problems.join('\n'));
});
