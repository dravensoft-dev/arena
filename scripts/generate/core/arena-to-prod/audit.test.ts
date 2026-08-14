import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditText, lineFindings, isLegalBracket, scanText, scanFile, markerAllowlist, UNMODELLED_UNITS,
} from './audit.ts';

function rules(source: string, path = 'src/App.tsx') {
  return auditText(path, source).join('\n');
}

test('a class of your own on an Arena component is reported in either layer idiom', () => {
  assert.match(rules('<ArenaButton className="mine">Go</ArenaButton>'), /own-class/);
  assert.match(rules('<arena-button class="mine"></arena-button>', 'src/app.html'), /own-class/);
  assert.match(rules('<arena-card [ngClass]="k"></arena-card>', 'src/app.html'), /own-class/);
  assert.equal(rules('<ArenaButton variant="primary">Go</ArenaButton>'), '');
});

test('a stylesheet rule reaching an arena- slot is reported, and only in a stylesheet', () => {
  assert.match(auditText('src/a.css', '.arena-button__label { color: red; }').join('\n'), /own-class/);
  assert.equal(rules('const label = ".arena-button__label";'), '');
});

test('an Arena component inside a link of your own is reported, which Angular would not report at all', () => {
  assert.match(rules('<Link to="/x"><ArenaCard>c</ArenaCard></Link>'), /router-link/);
  assert.match(rules('<a href="/x"><arena-card></arena-card></a>', 'src/a.html'), /router-link/);
  assert.match(rules('<a routerLink="/x"><arena-card></arena-card></a>', 'src/a.html'), /router-link/);
  assert.equal(rules('<ArenaCard href="/x">c</ArenaCard>'), '');
});

test('a raw value is reported where it styles something, and not where it is only a string', () => {
  assert.match(rules('<div style={{ color: "#b52a20" }} />'), /raw hex/);
  assert.match(rules('<div style={{ padding: "16px" }} />'), /bare pixel/);
  assert.match(auditText('src/a.css', '.x { background: linear-gradient(a, b); }').join('\n'), /gradient/);
  assert.equal(rules('const id = "#b52a20";'), '');
  assert.equal(rules('const gap = "16px";'), '');
});

test('an icon as an element and an emoji are each reported', () => {
  assert.match(rules('<ArenaButton icon={<Plus />}>Go</ArenaButton>'), /icon-element/);
  assert.match(rules('<ArenaButton iconRight={<Down />}>Go</ArenaButton>'), /icon-element/);
  assert.match(rules('<p>Deploy 🚀</p>'), /emoji/);
  assert.equal(rules('<ArenaButton icon="ph-bold ph-plus">Go</ArenaButton>'), '');
});

test('an arbitrary Tailwind bracket is reported unless it resolves through a token', () => {
  assert.match(rules('<div className="bg-[#ff0000]" />'), /raw value, not a token/);
  assert.equal(rules('<div className="mt-[var(--sp-4)]" />'), '');
});

test('a line carries its own allowance, and an allowance over nothing is stale', () => {
  assert.equal(rules('<div style={{ color: "#b52a20" }} /> // arena-audit allow'), '');
  assert.match(rules('<ArenaButton>Go</ArenaButton> // arena-audit allow'), /stale arena-audit allowance/);
});

test('a finding names the line it is on, so the reader goes straight there', () => {
  const found = auditText('src/App.tsx', 'const a = 1;\nconst b = 2;\n<div style={{ padding: "16px" }} />');
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^src\/App\.tsx:3: /);
});

test('lineFindings decides a stylesheet rule only when it is reading a stylesheet', () => {
  assert.equal(lineFindings('.arena-tag { color: #fff; }', false).length, 0);
  assert.equal(lineFindings('.arena-tag { color: #fff; }', true).length, 2);
});

test('the moved bracket rule decides exactly what it decided inside the gate', () => {
  assert.equal(isLegalBracket('var(--sp-4)'), true);
  assert.equal(isLegalBracket('#b52a20'), false);
  assert.equal(isLegalBracket('16px'), false);
  assert.equal(isLegalBracket('50%'), true);
  assert.equal(isLegalBracket('calc(var(--sp-4)_*_2)'), true);
  assert.deepEqual(scanText('mt-[var(--sp-4)]'), []);
  assert.equal(scanText('bg-[#fff]').length, 1);
});

test('the markdown allowance the gate relies on still reads from this module', () => {
  const text = '<!-- check-arbitrary-values allow: bg-[#fff] -->\n`bg-[#fff]`\n';
  assert.deepEqual([...markerAllowlist(text)], ['bg-[#fff]']);
  assert.deepEqual(scanFile('a.md', text), []);
  assert.match(scanFile('a.md', '<!-- check-arbitrary-values allow: bg-[#fff] -->\n').join(''), /stale allowance/);
});

test('the unit list the dimension gate reads is the one stated here', () => {
  assert.ok(UNMODELLED_UNITS.includes('vh'));
  assert.ok(!UNMODELLED_UNITS.includes('px'));
});
