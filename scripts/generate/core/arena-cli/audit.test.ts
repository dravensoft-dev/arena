import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import {
  auditText, auditFindings, findings, lineFindings, isLegalBracket, scanText, scanFile, markerAllowlist,
  paintedParts, sourceScope, outlineGap, kebabTag, HEADING_RUNGS, OWN_CLASS_ATTRIBUTE,
  LINKABLE_TAGS, statedRung, fillsWithDanger, RULE_TAGS,
  UNMODELLED_UNITS, styleIdentifiers, styleObjectLines,
  ownClassFindings, type VocabularyIndex,
} from './audit.ts';
import { vocabularyIndex } from '../../../lib/arena/vocabulary-index.ts';

function rules(source: string, path = 'src/App.tsx') {
  return auditText(path, source).join('\n');
}

function primaries(source: string, path = 'src/App.tsx') {
  return auditText(path, source).filter((line) => line.includes('one-primary')).join('\n');
}

test('a class of your own on an Arena component is reported in either layer idiom', () => {
  assert.match(rules('<ArenaButton className="mine">Go</ArenaButton>'), /own-class/);
  assert.match(rules('<arena-button class="mine"></arena-button>', 'src/app.html'), /own-class/);
  assert.match(rules('<arena-card [ngClass]="k"></arena-card>', 'src/app.html'), /own-class/);
  assert.equal(rules('<ArenaButton>Go</ArenaButton>'), '');
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

test('an element of your own passed into a slot carries your own class', () => {
  assert.equal(rules('<ArenaAppLogo name="X" mark={<img src="/m.svg" alt="" className="mark" />} />'), '',
    'a slot is filled by passing an element, so that element sits inside the Arena tag\'s '
    + 'attribute region and the class on it is the consumer\'s own');
  assert.equal(rules('<ArenaCard action={<button className="mine">Go</button>} title="t" />'), '');

  assert.match(rules('<ArenaButton className={styles.mine}>Go</ArenaButton>'), /own-class/,
    'a class on the Arena tag is still one whether its value is a string or an expression');
  assert.equal(rules('<ArenaCard className="mine" action={<button className="mine" />} />')
    .split('\n').length, 1, 'and the tag\'s own class is reported exactly once');
  assert.match(rules('<arena-card [ngClass]="k"><img class="mine" /></arena-card>', 'src/a.html'),
    /own-class/, 'the Angular idiom passes an element by projection and is unaffected');
});

test('a colour is raw whichever notation writes it, and derived through a token is not', () => {
  const css = (rule: string) => auditText('src/a.css', rule).join('\n');
  assert.match(css('.x { background: rgb(255 255 255 / 0.22) }'), /raw colour/);
  assert.match(css('.x { background: rgba(0, 0, 0, .18) }'), /raw colour/);
  assert.match(css('.x { color: hsl(210 40% 96%) }'), /raw colour/);
  assert.match(css('.x { color: oklch(0.7 0.1 250) }'), /raw colour/);
  assert.match(css('.x { background: color-mix(in oklab, black 22%, transparent) }'), /raw colour/);
  assert.match(css('.x { border-color: white }'), /raw colour/);
  assert.match(css('.x { box-shadow: 0 0 0 1px rebeccapurple }'), /raw colour/);

  assert.equal(css('.x { background: color-mix(in oklab, var(--crimson) 22%, transparent) }'), '');
  assert.equal(css('.x { color: color-mix(in oklab, var(--a) 50%, var(--b)) }'), '');
  assert.equal(css('.x { color: rgb(from var(--crimson) r g b / 40%) }'), '',
    'a channel READ from a custom property is not a value this project chose');
  assert.equal(css('.x { color: var(--ink-body) }'), '');
});

test('a colour name is a colour where a value goes, and a word everywhere else', () => {
  const css = (rule: string) => auditText('src/a.css', rule).join('\n');
  assert.equal(css('.white-panel { color: var(--ink-body) }'), '',
    'a selector is not a declaration, so a name inside one is not a colour');
  assert.equal(css('.x { background: url(white-dot.png) }'), '',
    'a name is a colour when it stands alone, and part of an identifier when it does not');
  assert.equal(css('.x { content: "red" }'), '',
    'a quoted value in a stylesheet is a string');
  assert.match(auditText('src/App.tsx', '<div style={{ color: "white" }} />').join('\n'),
    /raw colour/, 'and in an inline style the quotes are how the value is written');
});

test('a comment is prose, and the rules of the language read declarations', () => {
  assert.equal(auditText('src/a.css', '/* a profile header wants roughly 150px */').join('\n'), '',
    'a note explaining why a value is what it is is the note a reviewer wants, and reporting it is '
    + 'how the allowance mechanism gets spent on prose');
  assert.equal(auditText('src/a.css', '/* the .arena-avatar__box class is output */').join('\n'), '');
  assert.match(auditText('src/a.css', '.x { padding: 16px } /* and here is why */').join('\n'),
    /bare pixel/);
  assert.match(auditText('src/a.css', '/* why 16px:\n   the field is dense */\n.x { padding: 16px }')
    .join('\n'), /^src\/a\.css:3: /, 'a comment spanning lines keeps every line after it in place');
});

test('an allowance over a comment is stale, because the comment was never a finding', () => {
  assert.match(auditText('src/a.css', '/* roughly 150px */ /* arena-audit allow */').join('\n'),
    /stale arena-audit allowance/);
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

test('a tag broken across lines is the same defect, and it is how a formatter writes one', () => {
  const wrapped = '<Link to="/x">\n  <ArenaCard>c</ArenaCard>\n</Link>\n';
  assert.match(rules(wrapped), /router-link/);
  assert.match(rules(wrapped), /^src\/App\.tsx:1: /);

  const spread = '<ArenaButton\n  className="mine"\n  variant="primary"\n>\n  Go\n</ArenaButton>\n';
  assert.match(rules(spread), /own-class/);

  const template = '<a\n  routerLink="/x"\n>\n  <arena-card></arena-card>\n</a>\n';
  assert.match(auditText('src/a.html', template).join('\n'), /router-link/);
});

test('an attribute holding an arrow or a comparison does not end the tag early', () => {
  const arrow = '<ArenaButton\n  onClick={() => go()}\n  className="mine"\n>Go</ArenaButton>';
  assert.match(rules(arrow), /own-class/);
  const guarded = '<Link\n  to="/x"\n  onMouseOver={() => a > b}\n>\n  <ArenaCard>c</ArenaCard>\n</Link>';
  assert.match(rules(guarded), /router-link/);
});

test('a link holding anything but an Arena component is left alone', () => {
  assert.equal(rules('<Link to="/x">\n  <span>plain</span>\n</Link>'), '');
  assert.equal(rules('<a href="/x">\n  read more\n</a>'), '');
  assert.equal(rules('<ArenaCard>\n  <Link to="/x">inside is fine</Link>\n</ArenaCard>'), '');
});

test('a comment between the link and the component does not hide the nesting', () => {
  assert.match(rules('<Link to="/x">\n  {/* a note */}\n  <ArenaCard>c</ArenaCard>\n</Link>'), /router-link/);
});

test('a raw value keeps the line it is on once the findings are merged', () => {
  const found = auditText('src/App.tsx', '<div className="bg-[#ff0000]" />\n<p>ok</p>\n');
  assert.equal(found.length, 1);
  assert.match(found[0] ?? '', /^src\/App\.tsx:1: /);
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
  assert.equal(isLegalBracket('var(--arena-layout-radius,0)'), true);
  assert.equal(isLegalBracket('var(--arena-placement-max-height,80vh)'), true);
  assert.equal(isLegalBracket('var(--arena-x,var(--r-lg))'), true);
  assert.equal(isLegalBracket('var(--arena-x,12px)'), false);
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

test('a part selector is sanctioned in a plugin and reported in the app', () => {
  const rule = '[data-arena-part="card.body"] { color: var(--ink-body) }';
  assert.deepEqual(findings('p.css', rule, 'plugin'), [],
    'the plugin directory is the one place a project\'s appearance lives, and the hook is how it '
    + 'reaches a component');
  const app = findings('a.css', rule, 'app');
  assert.equal(app.length, 1);
  assert.equal(app[0]?.rule, 'own-class');
});

test('a compiler class is reported in both scopes', () => {
  const rule = '.arena-card__root { color: var(--ink-body) }';
  assert.equal(findings('p.css', rule, 'plugin').length, 1,
    'the part hook is the contract and the compiled class name is output, so reaching for the '
    + 'class is a defect even inside a plugin');
  assert.equal(findings('a.css', rule, 'app').length, 1);
});

test('a raw value is reported in both scopes and a gradient only in the app', () => {
  assert.equal(findings('p.css', '.x { color: #fff }', 'plugin')[0]?.rule, 'raw-value');
  const ramp = '.x { background: linear-gradient(var(--cat-1), var(--cat-3)) }';
  assert.deepEqual(findings('p.css', ramp, 'plugin'), [],
    'a plugin paints a gradient from its own stylesheet whatever the token tier says, so the norm '
    + 'records it as a report rather than a floor and --strict may not refuse what the norm permits');
  assert.equal(findings('a.css', ramp, 'app')[0]?.rule, 'raw-value');
  assert.equal(findings('p.css', '.x { background: linear-gradient(red, blue) }', 'plugin').length, 1,
    'the gradient is the plugin\'s to paint and the colours in it are still the skin, which the '
    + 'plugin assigns rather than authors');
});

test('a plugin assigning a colour through one of Arena\'s own aliases is reported', () => {
  const rule = '[data-arena-part="card.eyebrow"] { color: var(--mute) }';
  const found = findings('design/x/plugin.css', rule, 'plugin');
  assert.equal(found.length, 1, 'the alias is a step of the ramp under another name, so assigning '
    + 'it is authoring a skin rather than answering a role');
  assert.equal(found[0]?.rule, 'compat-alias');
});

test('the alias rule reads the plugin scope only, since an application is the last word', () => {
  const rule = '.thing { color: var(--mute) }';
  assert.deepEqual(findings('src/app.css', rule, 'app'), [],
    'application CSS reaching into Arena is already what the own-class rule reports, and the '
    + 'aliases ship, so naming one there is not this rule\'s business');
});

test('a plugin naming a role or a palette colour is not naming an alias', () => {
  for (const value of ['var(--ink-eyebrow)', 'var(--color-neutral-content)',
    'color-mix(in oklab, var(--color-base-content) 62%, transparent)']) {
    assert.deepEqual(findings('design/x/plugin.css', `[data-arena-part="card.eyebrow"] { color: ${value} }`, 'plugin'), [],
      `${value} is the route a plugin takes, so the rule must leave it alone`);
  }
});

test('an alias is matched whole, so a longer name is not read as a shorter one inside it', () => {
  assert.deepEqual(findings('design/x/plugin.css', '.x { color: var(--mute-2-disabled) }', 'plugin')
    .map((one) => one.rule), ['compat-alias'],
    'the longer alias is an alias too, and it is reported as itself rather than as --mute');
  assert.deepEqual(findings('design/x/plugin.css', '.x { color: var(--muted-of-my-own) }', 'plugin'), [],
    'a custom property of the project\'s own is not one of Arena\'s, and the boundary is what tells '
    + 'them apart');
});

test('an alias inside a fallback is still an assignment, since the fallback is what paints', () => {
  assert.equal(findings('design/x/plugin.css', '.x { color: var(--mute, red) }', 'plugin')
    .filter((one) => one.rule === 'compat-alias').length, 1);
});

test('a project whose mark is a gradient is not told about one, and only about that', () => {
  const rule = '.story__ring { background: conic-gradient(var(--color-cat-1), var(--color-cat-4)); }';
  assert.match(auditText('src/a.css', rule, 'app').join('\n'), /gradient/,
    'a gradient in an application source is the report the norm keeps');
  assert.equal(auditText('src/a.css', rule, 'app', true).join('\n').includes('gradient'), false,
    'a product whose mark IS a gradient draws that element itself, because Arena has none, so the '
    + 'scope that reads the directory a line sits in asks the wrong question about a brand');
});

test('declaring the mark silences the gradient and nothing else on the line', () => {
  const found = auditText('src/a.css', '.x { background: linear-gradient(red, blue); padding: 16px; }',
    'app', true);
  assert.match(found.join('\n'), /bare pixel length/,
    'an allowance suppresses the whole line, which is what declaring the mark replaces');
  assert.match(found.join('\n'), /raw colour/,
    'the colours in the gradient are still the skin, which a project assigns rather than authors');
});

test('the declaration is not a way into the plugin scope, which already permits a gradient', () => {
  const rule = '[data-arena-part="avatar.box"] { background: linear-gradient(var(--color-cat-1), var(--color-cat-4)); }';
  assert.deepEqual(findings('design/x/plugin.css', rule, 'plugin'), [],
    'a plugin paints one from its own stylesheet whatever the token tier says, declared or not');
  assert.deepEqual(findings('design/x/plugin.css', rule, 'plugin', true), []);
});

test('the scope defaults to the application, so no caller changes meaning by accident', () => {
  assert.equal(findings('a.css', '[data-arena-part="card"] { color: red }').length,
    findings('a.css', '[data-arena-part="card"] { color: red }', 'app').length);
});

test('a source inside a declared plugin directory is plugin scope and nothing else is', () => {
  const dirs = ['design/shop', 'vendor/house'];
  assert.equal(sourceScope('design/shop/plugin.css', dirs), 'plugin');
  assert.equal(sourceScope('design/shop/deep/more.css', dirs), 'plugin');
  assert.equal(sourceScope('design/shopfront/plugin.css', dirs), 'app',
    'a prefix that stops mid-segment is a different directory');
  assert.equal(sourceScope('src/app.css', dirs), 'app');
  assert.equal(sourceScope('design/shop/plugin.css', []), 'app');
});

test('the audit reports which parts a plugin paints', () => {
  assert.deepEqual(paintedParts('[data-arena-part="card.body"]{}[data-arena-part="hero.title"]{}'),
    ['card.body', 'hero.title']);
  assert.deepEqual(paintedParts('[data-arena-part="card"]{}[data-arena-part="card"]{}'), ['card'],
    'it answers which parts rather than how many rules, because it is what the role tier grows by');
});

test('the own-class attribute pattern is exported, so its suite can assert on it', () => {
  assert.ok(OWN_CLASS_ATTRIBUTE.test(' className='));
  assert.ok(OWN_CLASS_ATTRIBUTE.test(' [class]='));
});

test('a screen drawing a page head and a card, with no section between, is reported', () => {
  assert.match(rules('<ArenaPageHead title="Sales" /><ArenaCard title="Today" />'), /outline-gap/);
  assert.match(
    rules('<arena-page-head title="Sales" /><arena-card title="Today" />', 'src/app.html'),
    /outline-gap/,
    'the rule reads a screen and not a layer, so it holds in either idiom',
  );
});

test('the same screen with the middle rung written is not reported', () => {
  assert.equal(
    rules('<ArenaPageHead title="Sales" /><ArenaSection title="Today"><ArenaCard title="A" /></ArenaSection>'),
    '',
    'a section IS the h2 the outline was missing, which is the fix the message asks for',
  );
  assert.equal(
    rules('<ArenaPageHead title="Sales" /><ArenaCard title="A" headingLevel="h2" />'),
    '',
    'and saying the rung by hand is the other fix, so a component that declares one is not counted '
    + 'against a default it is not using',
  );
});

test('one rung on its own is no gap, however deep it sits', () => {
  assert.equal(rules('<ArenaCard title="A" /><ArenaCard title="B" />'), '',
    'a screen of cards inside a shell that draws the page head elsewhere is the ordinary case, and '
    + 'a rule that fired on it would be one every project turns off');
});

test('the gap is found between any two rungs, not only between one and three', () => {
  assert.deepEqual(outlineGap([1, 3]), [1, 3]);
  assert.deepEqual(outlineGap([2, 3, 1]), null, 'contiguous in any order is contiguous');
  assert.deepEqual(outlineGap([1, 2]), null);
  assert.deepEqual(outlineGap([]), null);
  assert.deepEqual(outlineGap([3, 3, 3]), null);
});

test('the ladder this rule reads is the one the contracts declare, or it is judging a shape Arena '
  + 'does not draw', () => {
  const dir = join(repoRoot, 'contracts/api/components');
  const declared: Record<string, number> = {};
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const contract = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    const level = contract.api?.headingLevel?.default;
    if (typeof level !== 'string' || !/^h[1-6]$/.test(level)) continue;
    declared[kebabTag(contract.component)] = Number(level.slice(1));
  }

  assert.ok(Object.keys(declared).length > 0, 'no contract declares a heading rung, so this checked nothing');
  assert.deepEqual(HEADING_RUNGS, declared,
    'the audit ships inside the package and cannot read contracts/ from there, so the ladder is a '
    + 'literal here and this is what keeps it from drifting: a component that gains, loses or moves '
    + 'a default rung has to move this list with it. A component defaulting to `none` is deliberately '
    + 'absent, because it opens no rung at all');
});

test('a stated heading level is the rung it states, so saying the level you meant cannot open a gap', () => {
  assert.equal(statedRung('headingLevel="h3"'), 3);
  assert.equal(statedRung("[headingLevel]=\"'h3'\""), 3);
  assert.equal(statedRung('headingLevel="none"'), null);
  assert.equal(statedRung('[headingLevel]="pitch()"'), undefined);
  assert.equal(statedRung('title="x"'), undefined);
});

test('the components a link may wrap are the ones whose contract takes an href, since the remedy is '
  + 'to pass it', () => {
  const dir = join(repoRoot, 'contracts/api/components');
  const declared = new Set<string>();
  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json')) continue;
    const contract = JSON.parse(readFileSync(join(dir, file), 'utf8'));
    if (contract.api?.href !== undefined) declared.add(kebabTag(contract.component));
  }

  assert.ok(declared.size > 0, 'no contract declares an href, so this checked nothing');
  assert.deepEqual([...LINKABLE_TAGS].sort(), [...declared].sort(),
    'the audit ships inside the package and cannot read contracts/ from there, so this set is a '
    + 'literal and this is what keeps it from drifting. It reports only these because the finding '
    + 'tells a reader to pass the href to the component instead: a component with no href member '
    + 'cannot take that advice, and the app bar documents wrapping its brand in a link of your own');
});


test('a second primary action on one screen is reported, and the first one is not', () => {
  assert.equal(primaries('<ArenaButton className="arena-emphasis-primary">Save</ArenaButton>'), '');
  const two = primaries('<ArenaButton className="arena-emphasis-primary">Save</ArenaButton>\n'
    + '<ArenaButton className="arena-emphasis-primary">Publish</ArenaButton>');
  assert.match(two, /one-primary/);
  assert.match(two, /at most one arena-emphasis-primary action stands in a view/);
  assert.equal(two.split('\n').length, 1, 'the first primary is the one the screen is for, so only '
    + 'the ones after it are findings');
  assert.match(two, /line 1/);
});

test('a primary emphasis class is read in either layer idiom, and an expression is not read at all', () => {
  assert.equal(primaries('<arena-button class="arena-emphasis-primary"></arena-button>', 'src/app.html'), '');
  assert.match(primaries('<arena-button class="arena-emphasis-primary"></arena-button>\n'
    + '<arena-button class="a arena-emphasis-primary"></arena-button>', 'src/app.html'), /one-primary/);
  assert.match(primaries('<arena-button [class]="\'arena-emphasis-primary\'"></arena-button>\n'
    + '<arena-button [class]="\'arena-emphasis-primary\'"></arena-button>', 'src/app.html'), /one-primary/);
  assert.equal(primaries('<ArenaButton className={kind}>a</ArenaButton>\n'
    + '<ArenaButton className={kind}>b</ArenaButton>'), '',
    'a class an expression decides is not a class this file states, and reporting it would '
    + 'report the one screen that cannot be read');
  assert.equal(primaries('<ArenaButton className="arena-emphasis-primary-x">a</ArenaButton>\n'
    + '<ArenaButton className="arena-emphasis-primary-x">b</ArenaButton>'), '');
  assert.equal(primaries('<ArenaButton variant="primary">a</ArenaButton>\n'
    + '<ArenaButton variant="primary">b</ArenaButton>').includes('one-primary'), false,
    'the rule does not read variant="primary"');
});


test('a variant of your own that happens to be primary on a tag Arena does not draw is not counted', () => {
  assert.equal(rules('<MyButton variant="primary">a</MyButton>\n'
    + '<MyButton variant="primary">b</MyButton>'), '');
});

test('a filled danger surface is reported, and the tint and the outline are not', () => {
  assert.match(auditText('src/a.css', '.mine { background: var(--danger); }').join('\n'),
    /danger-fill/);
  assert.match(auditText('src/a.css', '.mine { background-color: var(--color-error-fill); }').join('\n'),
    /danger-fill/);
  assert.equal(auditText('src/a.css', '.mine { background: var(--danger-soft); }').join('\n'), '',
    'a soft tint is the surface a project of your own may carry');
  assert.equal(auditText('src/a.css', '.mine { border-color: var(--danger); color: var(--danger); }').join('\n'), '',
    'the border and the content in danger are what the rule asks for');
});

test('a filled danger surface is read in an inline style, and only in an application source', () => {
  assert.match(rules('<div style={{ backgroundColor: \'var(--danger)\' }} />'), /danger-fill/);
  assert.equal(auditText('plugin/skin.css', '.confirm { background: var(--danger-fill); }',
    'plugin').join('\n').includes('danger-fill'), false,
    'the one filled danger surface in the system is a part a style plugin paints, so the scope '
    + 'that owns it is the scope that may draw it');
});

test('a fill and a token are read as one pair, so a danger token elsewhere on the line is not a fill', () => {
  assert.equal(fillsWithDanger('  border: 1px solid var(--danger);'), false);
  assert.equal(fillsWithDanger('  background: var(--danger);'), true);
  assert.equal(fillsWithDanger('  background: var(--danger-soft);'), false);
  assert.equal(fillsWithDanger('  background: var(--surface-card);'), false);
});

test('every rule tag the audit can emit is declared, and every declared tag is one it emits', () => {
  const source = readFileSync(join(repoRoot, 'scripts/generate/core/arena-cli/audit.ts'), 'utf8');
  const CALL = /\bat\((?:[^()]|\([^()]*\))*?,\s*'([a-z-]+)'/g;
  const emitted = new Set([...source.matchAll(CALL)].map((m) => m[1]));

  assert.ok(emitted.size > 0, 'no tag was found in the module, so this checked nothing');
  assert.deepEqual([...emitted].sort(), [...RULE_TAGS].sort(),
    'RULE_TAGS is what every other surface reads to say which rule of the language a gate holds, '
    + 'so a tag the module emits and this list does not carry is a rule nothing can claim, and a '
    + 'tag on this list the module never emits is a claim nothing answers');
});

test('a style hoisted into a constant is styling, so the raw-value rules read it there too', () => {
  const hoisted = ['const zone = {', "  background: 'var(--danger)',", "  padding: '16px',", '};',
    'export default function A() {', '  return <div style={zone}>x</div>;', '}'].join('\n');
  assert.deepEqual(findings('src/App.tsx', hoisted).map((one) => one.rule), ['danger-fill', 'raw-value'],
    'style={{ ... }} and const zone = { ... } are the same declaration written two ways, and '
    + 'hoisting is what React authors do the moment an object outgrows the attribute. A rule that '
    + 'reads only the attribute is a rule any screen escapes by moving three lines up');

  const annotated = ['const panel: CSSProperties = {', "  background: '#ff0000',", '};',
    'export default function A() {', '  return <div style={panel}>x</div>;', '}'].join('\n');
  assert.deepEqual(findings('src/App.tsx', annotated).map((one) => one.rule), ['raw-value'],
    'the annotation says it is styling even before anything uses it');

  const nested = ['const styles = {', "  card: { background: '#123456' },", '};',
    'export default function A() {', '  return <div style={styles.card}>x</div>;', '}'].join('\n');
  assert.deepEqual(nested.length && findings('src/App.tsx', nested).map((one) => one.rule), ['raw-value'],
    'a table of styles reached by member is still reached');
});

test('an object that never reaches a style attribute is data, and data is not judged as paint', () => {
  const config = ['const config = {', "  cache: '16px',", "  tag: '#abcdef',", '};',
    'export default function A() {', '  return <div>{config.tag}</div>;', '}'].join('\n');
  assert.deepEqual(findings('src/App.tsx', config), [],
    'a hex in a fixture, an id or a cache key is not a colour somebody painted with, and a rule '
    + 'that cannot tell the two apart costs more than the one it catches');

  const tokens = ['const ok: CSSProperties = {', "  background: 'var(--fill-surface)',",
    "  padding: 'var(--sp-6)',", '};', 'export default function A() {',
    '  return <div style={ok}>x</div>;', '}'].join('\n');
  assert.deepEqual(findings('src/App.tsx', tokens), [], 'a hoisted object of tokens is clean');
});

test('what a style attribute names is what gets read, and a key is not a name', () => {
  assert.deepEqual([...styleIdentifiers('<div style={zone}>')], ['zone']);
  assert.deepEqual([...styleIdentifiers('<div style={{ background: shade }}>')], ['shade'],
    'background is the property being set, not a binding that could hold a style');
  assert.deepEqual([...styleObjectLines('const zone = {\n  a: 1,\n};\n<div style={zone}/>')].sort(),
    [1, 2, 3], 'the whole body counts, not the line the brace opens on');
});

const VOCABULARY: VocabularyIndex = {
  page: 'https://arena.dravensoft.org/frameworks/VOCABULARY.md',
  classes: { 'arena-fill': { family: 'fill', reach: 'box' }, 'arena-fit': { family: 'fill', reach: 'box' },
    'arena-witness-on': { family: 'witness', reach: 'context' } },
  answers: { ArenaButton: ['fill'] },
  options: { ArenaButton: ['arena-fill', 'arena-fit'] },
};

test('a vocabulary class on a component that answers its family is no finding, in either layer\'s idiom', () => {
  assert.deepEqual(ownClassFindings('ArenaButton', ' className="arena-fill"', VOCABULARY), []);
  assert.deepEqual(ownClassFindings('arena-button', ' class="arena-fill"', VOCABULARY), []);
  assert.deepEqual(ownClassFindings('arena-card', ' class="arena-witness-on"', VOCABULARY), []);
  assert.deepEqual(ownClassFindings('arena-button', ' [class.arena-fill]="wide"', VOCABULARY), []);
});

test('a class outside the vocabulary, or a box class the component does not answer, is own-class naming the page', () => {
  assert.match(ownClassFindings('ArenaButton', ' className="mt-4"', VOCABULARY)[0] ?? '', /"mt-4" is not a class of Arena's vocabulary.*VOCABULARY\.md/);
  assert.match(ownClassFindings('arena-card', ' class="arena-fill"', VOCABULARY)[0] ?? '', /arena-fill decides fill, and ArenaCard does not answer fill/);
});

test('two options of one family on one component are reported, since source order would decide between them', () => {
  assert.match(ownClassFindings('ArenaButton', ' className="arena-fill arena-fit"', VOCABULARY)[0] ?? '',
    /arena-fill and arena-fit are two options of fill on one component/);
});

test('a class the source computes cannot be verified and is reported as before', () => {
  assert.equal(ownClassFindings('ArenaButton', ' className={styles.mine}', VOCABULARY).length, 1);
  assert.equal(ownClassFindings('arena-button', ' [ngClass]="k"', VOCABULARY).length, 1);
});

test('without a vocabulary index every class is own-class, which is the audit run outside a package', () => {
  assert.equal(ownClassFindings('ArenaButton', ' className="arena-fill"', null).length, 1);
});

test('findings carries the vocabulary through to the structural rules', () => {
  assert.deepEqual(findings('src/a.tsx', '<ArenaButton className="arena-fill">Go</ArenaButton>', 'app', false, VOCABULARY)
    .filter((one) => one.rule === 'own-class'), []);
});

test('a markup class on a component is reported as markup-only', () => {
  const vocabulary = { page: 'P', answers: {}, options: {}, classes: { 'arena-stack': { family: 'stack', reach: 'box', target: 'markup' } } } as VocabularyIndex;
  assert.match(ownClassFindings('ArenaCard', ' class="arena-stack"', vocabulary).join('\n'),
    /arena-stack goes on an element you wrote and never on a component/);
});

test('an option of a box family the component does not answer is refused, naming the options it answers', () => {
  const vocabulary: VocabularyIndex = {
    page: 'P',
    classes: Object.fromEntries(['top', 'bottom', 'start', 'end', 'top-end'].map((o) => [`arena-placement-${o}`, { family: 'placement', reach: 'box' as const }])),
    answers: { ArenaSheet: ['placement'] },
    options: { ArenaSheet: ['arena-placement-bottom', 'arena-placement-start', 'arena-placement-end'] },
  };
  assert.match(ownClassFindings('ArenaSheet', ' class="arena-placement-top-end"', vocabulary).join('\n'),
    /`arena-placement-top-end` is an option ArenaSheet does not answer: it answers arena-placement-bottom, -start and -end/);
  assert.deepEqual(ownClassFindings('ArenaSheet', ' class="arena-placement-start"', vocabulary), []);
});

const AXES: VocabularyIndex = {
  page: 'P',
  classes: { 'arena-grid-min-sm': { family: 'grid-min', reach: 'box' }, 'arena-grid-min-md': { family: 'grid-min', reach: 'box' } },
  answers: { ArenaGrid: ['grid-min'] },
  options: { ArenaGrid: ['arena-grid-min-sm', 'arena-grid-min-md'] },
  axes: { 'grid-min': ['--arena-grid-min'] },
};

test('a class and an axis of one family on one component are reported as deciding one axis twice, under own-class', () => {
  const message = '`arena-grid-min-sm` and `--arena-grid-min` on one ArenaGrid decide one axis twice; the class wins on this component. Keep one.';
  for (const source of [
    '<ArenaGrid className="arena-grid-min-sm" style={{ \'--arena-grid-min\': \'10rem\' }}>x</ArenaGrid>',
    '<arena-grid class="arena-grid-min-sm" style="--arena-grid-min: 10rem">x</arena-grid>',
  ]) {
    const own = findings('src/a.tsx', source, 'app', false, AXES).filter((one) => one.rule === 'own-class');
    assert.deepEqual(own.map((one) => one.message), [message], source);
  }
  for (const source of [
    '<ArenaGrid className="arena-grid-min-sm">x</ArenaGrid>',
    '<ArenaGrid style={{ \'--arena-grid-min\': \'10rem\' }}>x</ArenaGrid>',
    '<ArenaGrid className="arena-grid-min-sm" style={{ \'--arena-grid-min-width\': \'10rem\' }}>x</ArenaGrid>',
  ])
    assert.deepEqual(findings('src/a.tsx', source, 'app', false, AXES).filter((one) => one.rule === 'own-class'), [], source);
});

test('a shape class and the property a family composes with are no conflict, and a class that replaces an axis is, in both binding forms', () => {
  const index = vocabularyIndex(repoRoot);
  const own = (source: string) => findings('src/a.tsx', source, 'app', false, index).filter((one) => one.rule === 'own-class');
  assert.deepEqual(own('<arena-skeleton class="arena-skeleton-line" style="--arena-skeleton-width: var(--sp-8)"></arena-skeleton>'), []);
  assert.equal(own('<arena-grid class="arena-grid-min-lg" [style.--arena-grid-min]="\'var(--sp-8)\'"></arena-grid>').length, 1);
  assert.equal(own('<arena-grid class="arena-grid-min-lg" style="--arena-grid-min: var(--sp-8)"></arena-grid>').length, 1);
});

const EMPHASIS_INDEX: VocabularyIndex = {
  page: 'https://x/p',
  classes: {
    'arena-emphasis-primary': { family: 'emphasis', reach: 'context', target: 'component' },
    'arena-emphasis-secondary': { family: 'emphasis', reach: 'context', target: 'component' },
    'arena-emphasis-ghost': { family: 'emphasis', reach: 'context', target: 'component' },
  },
  answers: { ArenaButton: ['emphasis'], ArenaIconButton: ['emphasis'] },
  options: {
    ArenaButton: ['arena-emphasis-ghost', 'arena-emphasis-primary', 'arena-emphasis-secondary'],
    ArenaIconButton: ['arena-emphasis-ghost'],
  },
  defaults: {
    ArenaButton: { emphasis: 'arena-emphasis-primary' },
    ArenaIconButton: { emphasis: 'arena-emphasis-ghost' },
  },
  modals: ['ArenaDialog'],
};

function defaultPrimaries(source: string, path = 'src/App.tsx', vocabulary: VocabularyIndex | null = EMPHASIS_INDEX) {
  return auditText(path, source, 'app', false, vocabulary).filter((line) => line.includes('one-primary'));
}

test('a button with no emphasis class is the primary, so a second one is reported', () => {
  const two = defaultPrimaries('<ArenaButton>Save</ArenaButton>\n<ArenaButton>Publish</ArenaButton>');
  assert.equal(two.length, 1);
  assert.match(two[0] ?? '', /:2:/);
  assert.match(two[0] ?? '', /a button with no emphasis class is primary too/i);
  assert.equal(defaultPrimaries('<arena-button>Save</arena-button>\n<arena-button>Go</arena-button>',
    'src/app.html').length, 1, 'the Angular tag is read the same way');
  assert.equal(defaultPrimaries('<ArenaButton className="arena-emphasis-primary">A</ArenaButton>\n'
    + '<ArenaButton>B</ArenaButton>').length, 1, 'a stated primary and a bare one are two primaries');
});

test('explicit-others: one bare primary among stated secondaries and ghosts is clean', () => {
  assert.deepEqual(defaultPrimaries('<ArenaButton>Save</ArenaButton>\n'
    + '<ArenaButton className="arena-emphasis-secondary">Cancel</ArenaButton>\n'
    + '<ArenaButton className="arena-emphasis-ghost arena-size-sm">More</ArenaButton>\n'
    + '<ArenaIconButton className="arena-emphasis-ghost" icon="ph-bold ph-x" label="Close" />'), []);
});

test('a destructive button and a class an expression decides are not counted as bare', () => {
  assert.deepEqual(defaultPrimaries('<ArenaButton destructive>Retire</ArenaButton>\n<ArenaButton>Add</ArenaButton>'), []);
  assert.deepEqual(defaultPrimaries('<arena-button [destructive]="true">Retire</arena-button>\n'
    + '<arena-button>Add</arena-button>', 'src/app.html'), []);
  assert.deepEqual(defaultPrimaries('<ArenaButton className={kind}>A</ArenaButton>\n<ArenaButton>B</ArenaButton>'), []);
  assert.deepEqual(defaultPrimaries('<ArenaButton {...props}>A</ArenaButton>\n<ArenaButton>B</ArenaButton>'), []);
});

test('container: bare buttons under a container that may carry an emphasis class are not guessed at', () => {
  assert.deepEqual(defaultPrimaries('<div className="arena-emphasis-secondary">\n'
    + '<ArenaButton>A</ArenaButton>\n<ArenaButton>B</ArenaButton>\n</div>'), []);
  assert.equal(defaultPrimaries('<div className="arena-emphasis-secondary">\n'
    + '<ArenaButton className="arena-emphasis-primary">A</ArenaButton>\n'
    + '<ArenaButton className="arena-emphasis-primary">B</ArenaButton>\n</div>').length, 1,
    'stated primaries are still counted');
});

test('no-vocabulary: with no index nothing new is counted, so the check never fires on a guess', () => {
  assert.deepEqual(defaultPrimaries('<ArenaButton>Save</ArenaButton>\n<ArenaButton>Publish</ArenaButton>',
    'src/App.tsx', null), []);
});

test('the shipped vocabulary makes ArenaButton default to primary and no other component', () => {
  const index = vocabularyIndex();
  const primary = Object.entries(index.defaults ?? {})
    .filter(([, families]) => families.emphasis === 'arena-emphasis-primary').map(([name]) => name);
  assert.deepEqual(primary, ['ArenaButton']);
});

test('Angular interpolation and attr.class in a class attribute are a computed class, not a bare button', () => {
  assert.deepEqual(defaultPrimaries('<arena-button class="arena-size-sm {{k}}">A</arena-button>\n<arena-button>B</arena-button>',
    'src/app.html'), []);
  assert.deepEqual(defaultPrimaries('<arena-button [attr.class]="k">A</arena-button>\n<arena-button>B</arena-button>',
    'src/app.html'), []);
});

test('a bare button inside a conditional branch is not guessed at', () => {
  assert.deepEqual(defaultPrimaries('const a = cond ? <ArenaButton>A</ArenaButton> : <ArenaButton>B</ArenaButton>;'), []);
  assert.deepEqual(defaultPrimaries('{cond && <ArenaButton>A</ArenaButton>}\n{other && (\n<ArenaButton>B</ArenaButton>)}'), []);
  assert.deepEqual(defaultPrimaries('@if (a) {\n<arena-button>A</arena-button>\n} @else {\n<arena-button>B</arena-button>\n}',
    'src/app.html'), []);
  assert.deepEqual(defaultPrimaries('<arena-button *ngIf="a">A</arena-button>\n<arena-button *ngIf="!a">B</arena-button>',
    'src/app.html'), []);
  assert.deepEqual(defaultPrimaries('<div *ngIf="a"><arena-button>A</arena-button></div>\n'
    + '<div *ngIf="!a"><arena-button>B</arena-button></div>', 'src/app.html'), []);
  assert.equal(defaultPrimaries('<ArenaButton>A</ArenaButton>\n<ArenaButton className="arena-emphasis-primary">B</ArenaButton>').length, 1,
    'stated primaries still count');
  assert.equal(defaultPrimaries('@if (a) {\n<arena-button>A</arena-button>\n}\n<arena-button>B</arena-button>\n<arena-button>C</arena-button>',
    'src/app.html').length, 1, 'buttons outside the block are still counted');
  assert.equal(defaultPrimaries('<div *ngIf="a">x</div>\n<arena-button>A</arena-button>\n<arena-button>B</arena-button>',
    'src/app.html').length, 1, 'a closed element is not an ancestor');
});

test('a bare button inside an element a branch operator opens is in the branch', () => {
  assert.deepEqual(defaultPrimaries('const a = cond ? (<div><ArenaButton>A</ArenaButton></div>) : (<div><ArenaButton>B</ArenaButton></div>);'), []);
  assert.deepEqual(defaultPrimaries('const a = cond ? (\n<div>\n<ArenaButton>A</ArenaButton>\n</div>\n) : (\n<div>\n<ArenaButton>B</ArenaButton>\n</div>\n);'), []);
  assert.deepEqual(defaultPrimaries('{a && (\n <div><ArenaButton>A</ArenaButton></div>\n)}\n{b && (\n <div><ArenaButton>B</ArenaButton></div>\n)}'), []);
  assert.deepEqual(defaultPrimaries('{a && (\n <div><p><ArenaButton>A</ArenaButton></p><i/></div>\n)}\n{b && <><ArenaButton>B</ArenaButton></>}'), []);
  assert.equal(defaultPrimaries('{a && <div>x</div>}\n<ArenaButton>A</ArenaButton>\n<ArenaButton>B</ArenaButton>').length, 1,
    'a closed branch element is not an ancestor');
  assert.equal(defaultPrimaries('<div><ArenaButton>A</ArenaButton></div>\n<div><ArenaButton>B</ArenaButton></div>').length, 1);
});

test('a brace in a string literal of a source file does not open a block', () => {
  assert.equal(defaultPrimaries("const t = '@if (a) {';\nconst u = `@else {`;\n"
    + '<ArenaButton>A</ArenaButton>\n<ArenaButton>B</ArenaButton>').length, 1);
  assert.deepEqual(defaultPrimaries('@Component({ template: `@if (a) {\n<arena-button>A</arena-button>\n} @else {\n<arena-button>B</arena-button>\n}` })'), []);
  assert.equal(defaultPrimaries("it's {\n<arena-button>A</arena-button>\n<arena-button>B</arena-button>", 'src/app.html').length, 1);
});

test('a branch element that has closed is not the ancestor of a later sibling of the same name', () => {
  assert.equal(defaultPrimaries('{a && (\n<div>\n<p>x</p>\n</div>\n)}\n<div>\n<ArenaButton>A</ArenaButton>\n<ArenaButton>B</ArenaButton>\n</div>').length, 1);
  assert.deepEqual(defaultPrimaries('{a && (\n<div>\n<div>y</div>\n<ArenaButton>A</ArenaButton>\n</div>\n)}\n{b && (\n<div>\n<ArenaButton>B</ArenaButton>\n</div>\n)}'), []);
});

test('a comment that names a button declares nothing, in any comment form', () => {
  const one = '<ArenaButton>Save</ArenaButton>\n';
  assert.deepEqual(defaultPrimaries(`${one}{/* <ArenaButton>Old</ArenaButton> */}`), []);
  assert.deepEqual(defaultPrimaries(`${one}// Renders an <ArenaButton> for the old flow`), []);
  assert.deepEqual(defaultPrimaries('<arena-button>Save</arena-button>\n<!-- <arena-button>Old</arena-button> -->',
    'src/app.html'), []);
  assert.equal(defaultPrimaries(`const u = 'https://x.dev';\n${one}<ArenaButton>Go</ArenaButton>`).length, 1,
    'a URL is not a comment, so the code after it is still read');
  assert.match(rules('<Link to="/x">\n  {/* <ArenaCard> */}\n  <ArenaCard>c</ArenaCard>\n</Link>'), /router-link/);
});

test('a type argument is not a tag, so a generic naming a button counts nothing', () => {
  assert.deepEqual(defaultPrimaries('const r = useRef<ArenaButton>(null);\n<ArenaButton>Save</ArenaButton>'), []);
  assert.deepEqual(defaultPrimaries('@ViewChildren(B) bs!: QueryList<ArenaButton>;\n<arena-button>Save</arena-button>',
    'src/app.ts'), []);
});

test('a bare button in a statement-level branch is not guessed at', () => {
  assert.deepEqual(defaultPrimaries('if (error) return <ArenaButton>Retry</ArenaButton>;\nreturn <ArenaButton>Save</ArenaButton>;'), []);
  assert.deepEqual(defaultPrimaries('if (error) {\n  return <ArenaButton>Retry</ArenaButton>;\n}\nreturn <ArenaButton>Save</ArenaButton>;'), []);
  assert.deepEqual(defaultPrimaries('switch (step) {\n  case 1: return <ArenaButton>Next</ArenaButton>;\n'
    + '  default: return <ArenaButton>Finish</ArenaButton>;\n}'), []);
  assert.equal(defaultPrimaries('if (ready) load();\nreturn <><ArenaButton>A</ArenaButton><ArenaButton>B</ArenaButton></>;').length, 1,
    'a branch holding no button leaves the screen counted');
});

test('a container class an expression writes is still a container', () => {
  assert.deepEqual(defaultPrimaries('<div className={`toolbar arena-emphasis-secondary ${x}`}>\n'
    + '<ArenaButton>A</ArenaButton>\n<ArenaButton>B</ArenaButton>\n</div>'), []);
});

test('a modal counts its own primary, apart from the page under it', () => {
  assert.deepEqual(defaultPrimaries('<ArenaButton>Open</ArenaButton>\n<ArenaDialog open>\n<ArenaButton>Confirm</ArenaButton>\n</ArenaDialog>'), []);
  assert.deepEqual(defaultPrimaries('<arena-button>Open</arena-button>\n<arena-dialog>\n<arena-button>Confirm</arena-button>\n</arena-dialog>',
    'src/app.html'), []);
  assert.deepEqual(defaultPrimaries('<ArenaButton>Open</ArenaButton>\n<ArenaDialog open footer={<>\n<ArenaButton>Confirm</ArenaButton>\n</>} />'), []);
  const two = defaultPrimaries('<ArenaButton className="arena-emphasis-secondary">Open</ArenaButton>\n'
    + '<ArenaDialog open>\n<ArenaButton>Keep</ArenaButton>\n<ArenaButton>Confirm</ArenaButton>\n</ArenaDialog>');
  assert.equal(two.length, 1, 'two bare buttons inside one dialog are two primaries of that dialog');
  assert.match(two[0] ?? '', /:4:.*line 3/);
  assert.deepEqual(defaultPrimaries('<ArenaButton className="arena-emphasis-primary">Open</ArenaButton>\n'
    + '<ArenaDialog open>\n<ArenaButton className="arena-emphasis-primary">Confirm</ArenaButton>\n</ArenaDialog>'), []);
  assert.equal(defaultPrimaries('<ArenaDialog open>\n<ArenaButton>A</ArenaButton>\n</ArenaDialog>\n'
    + '<ArenaButton>B</ArenaButton>\n<ArenaButton>C</ArenaButton>').length, 1, 'a closed dialog gives the page back its own count');
  assert.equal(defaultPrimaries('<ArenaButton>Open</ArenaButton>\n<ArenaDialog open>\n<ArenaButton>Confirm</ArenaButton>\n</ArenaDialog>',
    'src/App.tsx', { ...EMPHASIS_INDEX, modals: undefined }).length, 1, 'with no modals indexed the file is one count, as before');
});

test('text that only looks like a comment does not carry a modal past its close tag', () => {
  assert.deepEqual(defaultPrimaries('<>\n<ArenaDialog open><ArenaButton>Confirm</ArenaButton><p>Rate: 5 // month</p></ArenaDialog>\n'
    + '<ArenaButton>New</ArenaButton>\n</>'), []);
  assert.deepEqual(defaultPrimaries("<>\n<ArenaDialog open><ArenaButton>Confirm</ArenaButton><p>{'src/**/*.tsx'}</p></ArenaDialog>\n"
    + '<ArenaButton>New</ArenaButton>\n</>\n/* a note */'), []);
});

test('every audit line carries its rule, and the line ends in it unless it is the stale allowance', () => {
  const source = '<div style={{ color: "#b52a20" }} /> 🎉\nconst x = 1; // arena-audit allow\n';
  const found = auditFindings('src/App.tsx', source);
  assert.ok(found.length >= 3, 'the fixture breaks raw-value and emoji and carries a stale allowance');
  for (const one of found) {
    assert.ok((RULE_TAGS as readonly string[]).includes(one.rule), one.rule);
    if (one.rule === 'stale-allowance') assert.ok(!one.text.endsWith(')'), one.text);
    else assert.ok(one.text.endsWith(` (${one.rule})`), one.text);
  }
  assert.ok(found.some((one) => one.rule === 'stale-allowance'));
  assert.deepEqual(auditText('src/App.tsx', source), found.map((one) => one.text));
});

test('the stale allowance line reads as it always has', () => {
  assert.deepEqual(auditFindings('a.tsx', 'const x = 1; // arena-audit allow\n'), [{
    rule: 'stale-allowance', text: 'a.tsx:1: stale arena-audit allowance, and nothing on the line to exempt',
  }]);
});
