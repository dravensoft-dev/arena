import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditText, findings, lineFindings, isLegalBracket, scanText, scanFile, markerAllowlist,
  paintedParts, sourceScope, OWN_CLASS_ATTRIBUTE, UNMODELLED_UNITS,
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
