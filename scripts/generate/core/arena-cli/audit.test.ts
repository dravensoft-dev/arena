/* The audit's rules, one case each. The every-tag case reads both audit.ts and steps.ts, since the rules
 * that read a plugin's names are emitted by the audit step. */
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { repoRoot } from '../../../lib/arena/repo-root.ts';
import {
  auditText, auditFindings, findings, lineFindings, isLegalBracket,
  paintedParts, sourceScope, outlineGap, kebabTag, HEADING_RUNGS,
  LINKABLE_TAGS, WRAPPED_LINK_TAGS, statedRung, namesAnAlias, RULE_TAGS, RULE_DESCRIPTIONS,
  styleIdentifiers, styleObjectLines, unknownInputs,
  levelledRoles, loadLevels, catalogueLevels, classCandidates, NO_LEVELS, NO_DEAD,
  iconMemberGlyphs, ownClassFindings, classValues, valueResults, RAW_GLYPH_BOUND_MESSAGE, RAW_COLOUR_MESSAGE, RAW_HEX_MESSAGE, type VocabularyIndex,
} from './audit.ts';
import { vocabularyIndex } from '../../../lib/arena/vocabulary-index.ts';
import { tokenCatalogue } from '../../../lib/arena/package-assembly.ts';

function rules(source: string, path = 'src/App.tsx') {
  return auditText(path, source).join('\n');
}

test('a class of your own on an Arena component is reported in either layer idiom', () => {
  assert.match(rules('<ArenaButton className="mine">Go</ArenaButton>'), /own-class/);
  assert.match(rules('<arena-button class="mine"></arena-button>', 'src/app.html'), /own-class/);
  assert.match(rules('<arena-card [ngClass]="k"></arena-card>', 'src/app.html'), /own-class/);
  assert.match(rules('<arena-card [class]="k"></arena-card>', 'src/app.html'), /own-class/);
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

test('an ArenaLink inside a link of your own is a rule of its own, so a project holding router-link is not newly held', () => {
  const react = auditText('src/a.tsx', '<Link to="/notes"><ArenaLink href="/notes">notes</ArenaLink></Link>').join('\n');
  assert.match(react, /wrapped-link/);
  assert.doesNotMatch(react, /router-link/, 'the link joined what router-link reads, which holds a project that never named it');
  assert.match(auditText('src/a.html', '<a routerLink="/notes"><arena-link href="/notes">notes</arena-link></a>').join('\n'), /wrapped-link/);
  assert.doesNotMatch(auditText('src/a.tsx', '<p>Read <ArenaLink href="/notes">notes</ArenaLink>.</p>').join('\n'), /wrapped-link/);
});

test('a raw value is reported where it styles something, and not where it is only a string', () => {
  assert.match(rules('<div style={{ color: "#b52a20" }} />'), /raw hex/);
  assert.match(rules('<div style={{ padding: "16px" }} />'), /bare pixel/);
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

test('a raw <i class="ph-bold ph-x"> is reported as raw-glyph, and ArenaIcon, ArenaButton and ArenaIconButton icons are not', () => {
  const raw = rules('<i className="ph-bold ph-x"></i>');
  assert.match(raw, /raw-glyph/);
  assert.match(raw, /^src\/App\.tsx:1: /);
  assert.match(rules('<span className={`ph ph-bell ${open ? "a" : "b"}`} />'), /raw-glyph/);
  assert.match(rules('<i class="ph-fill ph-x"></i>', 'src/a.html'), /raw-glyph/);
  assert.match(rules('<i class="x ph-duotone ph-arrow-left y"></i>', 'src/a.html'), /raw-glyph/);
  assert.equal(rules('<ArenaIcon icon="ph-bold ph-x" />'), '');
  assert.equal(rules('<ArenaButton icon="ph-bold ph-x">Go</ArenaButton>'), '');
  assert.equal(rules('<ArenaIconButton icon="ph-bold ph-x" label="Close" />'), '');
  assert.equal(rules('<i className="ph-bold"></i>'), '', 'a weight with no glyph names nothing to draw');
  assert.equal(rules('<i className="mine ph-x"></i>'), '', 'a glyph with no weight is not a pair the font drew');
  assert.doesNotMatch(rules('<ArenaIcon className="ph-bold ph-x" />'), /raw-glyph/, 'the icon element is never reported as a raw glyph');
});

test('the Angular template shape of a raw glyph is reported, and arena-icon and a component icon are not', () => {
  assert.match(rules('<i class="ph-bold ph-x" aria-hidden="true"></i>', 'src/app.component.html'), /raw-glyph/);
  assert.match(rules('<i [class]="open ? \'ph-bold ph-x\' : \'ph-bold ph-y\'"></i>', 'src/app.component.html'), /raw-glyph/);
  assert.match(rules('<span [ngClass]="\'ph-bold ph-x\'"></span>', 'src/app.component.html'), /raw-glyph/);
  assert.equal(rules('<arena-icon icon="ph-bold ph-x"></arena-icon>', 'src/app.component.html'), '');
  assert.equal(rules('<arena-button icon="ph-bold ph-x">Go</arena-button>', 'src/app.component.html'), '');
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
  const arrow = '<ArenaButton\n  onActivate={() => go()}\n  className="mine"\n>Go</ArenaButton>';
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

test('isLegalBracket accepts a var() whose fallback is a token, keyword or length, and refuses a pixel fallback', () => {
  assert.equal(isLegalBracket('var(--arena-layout-radius,0)'), true);
  assert.equal(isLegalBracket('var(--arena-placement-max-height,80vh)'), true);
  assert.equal(isLegalBracket('var(--arena-x,var(--r-lg))'), true);
  assert.equal(isLegalBracket('var(--arena-x,12px)'), false);
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

test('a raw value is reported in both scopes, and a gradient of tokens in neither', () => {
  assert.equal(findings('p.css', '.x { color: #fff }', 'plugin')[0]?.rule, 'raw-value');
  const ramp = '.x { background: linear-gradient(var(--cat-1), var(--cat-3)) }';
  assert.deepEqual(findings('p.css', ramp, 'plugin'), []);
  assert.deepEqual(findings('a.css', ramp, 'app'), []);
  assert.equal(findings('p.css', '.x { background: linear-gradient(red, blue) }', 'plugin').length, 1,
    'the colours in a gradient are still the skin, which the plugin assigns rather than authors');
});

test('a danger background is a colour choice and goes unreported', () => {
  assert.deepEqual(findings('src/app.css', '.mine { background: var(--danger); }'), []);
});

test('two primary actions on one screen go unreported', () => {
  const found = auditText('src/App.tsx', '<ArenaButton className="arena-emphasis-primary">Save</ArenaButton>\n'
    + '<ArenaButton className="arena-emphasis-primary">Publish</ArenaButton>', 'app', vocabularyIndex());
  assert.deepEqual(found, []);
});

test('a gradient in an application source goes unreported', () => {
  assert.deepEqual(findings('src/app.css',
    '.hero { background: linear-gradient(var(--color-base-100), var(--color-base-200)); }'), []);
  assert.deepEqual(findings('src/app.css', '.hero { background: linear-gradient(#fff, #000); }').map((one) => one.rule),
    ['raw-value']);
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

test('a plugin may not read a level', () => {
  const rule = '.x { background: color-mix(in oklab, var(--fill-selected) var(--level-accent-soft-primary), transparent) }';
  assert.equal(findings('design/x/plugin.css', rule, 'plugin').filter((one) => one.rule === 'compat-alias').length, 1,
    'a plugin answers roles, so the level stays refused there');
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
    if (contract.api?.href !== undefined && !WRAPPED_LINK_TAGS.has(kebabTag(contract.component))) declared.add(kebabTag(contract.component));
  }

  assert.ok(declared.size > 0, 'no contract declares an href, so this checked nothing');
  assert.deepEqual([...LINKABLE_TAGS].sort(), [...declared].sort(),
    'the audit ships inside the package and cannot read contracts/ from there, so this set is a '
    + 'literal and this is what keeps it from drifting. It reports only these because the finding '
    + 'tells a reader to pass the href to the component instead: a component with no href member '
    + 'cannot take that advice, and the app bar documents wrapping its brand in a link of your own');
});

test('whitespace inside var() does not hide an alias reference', () => {
  assert.equal(namesAnAlias('.x { color: var( --level-presence ) }'), true);
});

test('no audit message names a palette colour', () => {
  for (const message of [RAW_COLOUR_MESSAGE, RAW_HEX_MESSAGE])
    assert.doesNotMatch(message, /crimson|warm shadow/i);
});

test('every rule tag the audit can emit is declared, and every declared tag is one it emits', () => {
  const source = readFileSync(join(repoRoot, 'scripts/generate/core/arena-cli/audit.ts'), 'utf8');
  const CALL = /\bat\((?:[^()]|\([^()]*\))*?,\s*'([a-z-]+)'/g;
  const steps = readFileSync(join(repoRoot, 'scripts/generate/core/arena-cli/steps.ts'), 'utf8');
  const emitted = new Set([...source.matchAll(CALL), ...steps.matchAll(/\brule: '([a-z-]+)'/g)].map((m) => m[1]));

  assert.ok(emitted.size > 0, 'no tag was found in the module, so this checked nothing');
  assert.deepEqual([...emitted].sort(), [...RULE_TAGS].sort(),
    'RULE_TAGS is what every other surface reads to say which rule of the language a gate holds, '
    + 'so a tag the module emits and this list does not carry is a rule nothing can claim, and a '
    + 'tag on this list the module never emits is a claim nothing answers');
});

test('a style hoisted into a constant is styling, so the raw-value rules read it there too', () => {
  const hoisted = ['const zone = {', "  background: 'var(--danger)',", "  padding: '16px',", '};',
    'export default function A() {', '  return <div style={zone}>x</div>;', '}'].join('\n');
  assert.deepEqual(findings('src/App.tsx', hoisted).map((one) => one.rule), ['raw-value'],
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
  assert.deepEqual(findings('src/a.tsx', '<ArenaButton className="arena-fill">Go</ArenaButton>', 'app', VOCABULARY)
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
    const own = findings('src/a.tsx', source, 'app', AXES).filter((one) => one.rule === 'own-class');
    assert.deepEqual(own.map((one) => one.message), [message], source);
  }
  for (const source of [
    '<ArenaGrid className="arena-grid-min-sm">x</ArenaGrid>',
    '<ArenaGrid style={{ \'--arena-grid-min\': \'10rem\' }}>x</ArenaGrid>',
    '<ArenaGrid className="arena-grid-min-sm" style={{ \'--arena-grid-min-width\': \'10rem\' }}>x</ArenaGrid>',
  ])
    assert.deepEqual(findings('src/a.tsx', source, 'app', AXES).filter((one) => one.rule === 'own-class'), [], source);
});

test('a shape class and the property a family composes with are no conflict, and a class that replaces an axis is, in both binding forms', () => {
  const index = vocabularyIndex(repoRoot);
  const own = (source: string) => findings('src/a.tsx', source, 'app', index).filter((one) => one.rule === 'own-class');
  assert.deepEqual(own('<arena-skeleton class="arena-skeleton-line" style="--arena-skeleton-width: var(--sp-8)"></arena-skeleton>'), []);
  assert.equal(own('<arena-grid class="arena-grid-min-lg" [style.--arena-grid-min]="\'var(--sp-8)\'"></arena-grid>').length, 1);
  assert.equal(own('<arena-grid class="arena-grid-min-lg" style="--arena-grid-min: var(--sp-8)"></arena-grid>').length, 1);
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

const INPUT_INDEX = vocabularyIndex();

function inputRules(source: string, path = 'src/app.html') {
  return auditText(path, source, 'app', INPUT_INDEX).join('\n');
}

test('a static attribute an Arena component does not take is reported in a template', () => {
  assert.match(inputRules('<arena-icon-button icon="x" label="Close" size="sm" />'), /unknown-input/);
  assert.match(inputRules('<arena-button variant="secondary">Go</arena-button>'), /unknown-input/);
  assert.match(inputRules('@Component({ template: `<arena-button variant="secondary">Go</arena-button>` }) class A {}', 'src/a.component.ts'), /unknown-input/);
  assert.match(inputRules('<arena-button variant="a" variant="b" kind="c">Go</arena-button>'), new RegExp('an attribute variant that '
    + 'arena-button takes as no input or output, so no Arena component reads it\\. Write the class or input the component reads '
    + 'instead, or mark the line arena-audit allow when a directive of your own reads it \\(unknown-input\\)'));
  assert.match(inputRules('<arena-card heading-level="2">Body</arena-card>'), /an attribute heading-level that arena-card/,
    'Angular binds the camel name alone, so the kebab spelling reaches no input');
});

test('inputs, outputs, markers, globals and Angular syntax are not reported', () => {
  for (const ok of [
    '<arena-icon-button icon="x" label="Close" class="arena-size-sm" />',
    '<arena-button id="go" title="Go" role="link" tabindex="0" aria-describedby="h" data-test="go" slot="end" hidden>Go</arena-button>',
    '<arena-menu [items]="items" (select)="on($event)"><arena-button trigger>Open</arena-button></arena-menu>',
    '<arena-button #b *ngIf="on" i18n i18n-title title="Go" ngNonBindable>Go</arena-button>',
    '@if (on) { <arena-button>Go</arena-button> }',
    '<arena-button [attr.aria-label]="x" (activate)="go()" [class.arena-size-sm]="small" ngModel>Go</arena-button>',
    '<arena-button on-activate="go()" bind-title="x" bindon-ngModel="y" let-item>Go</arena-button>',
    '<arena-card headingLevel="2">Body</arena-card>',
  ]) assert.doesNotMatch(inputRules(ok), /unknown-input/, ok);
});

test('a name without ngModel and a form directive on a tag that has none are reported', () => {
  assert.match(inputRules('<arena-card name="submit">Body</arena-card>'), /an attribute name that arena-card/);
  assert.match(inputRules('<arena-button formControlName="x">Go</arena-button>'), /an attribute formControlName that arena-button/);
});

test('an attribute a forms directive selects on is not reported, on Arena\'s controls and on a group', () => {
  for (const ok of [
    '<arena-textarea label="Note" formControlName="note" />',
    '<arena-input label="Name" formControlName="name" [error]="name.touched ? messageFor(name.errors) : \'\'" />',
    '<arena-checkbox label="Terms" formControlName="terms" />',
    '<arena-select label="Plan" formControlName="plan" name="plan" />',
    '<arena-switch label="On" ngModel name="on" />',
    '<arena-input label="Name" ngModel name="x" />',
    '<arena-card formGroupName="address" formArrayName="lines">Body</arena-card>',
  ]) assert.doesNotMatch(inputRules(ok), /unknown-input/, ok);
});

const DOC_TAG = /<(arena-[a-z0-9-]+)((?:\s+[^\s=>/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*\/?>/g;

function docPages(dir: string, suffix: string) {
  return readdirSync(join(repoRoot, dir), { recursive: true, encoding: 'utf8' })
    .filter((entry) => entry.endsWith(suffix) && !entry.includes('node_modules')).map((entry) => join(dir, entry));
}

test('no Arena tag a consumer page shows carries an attribute unknown-input reports', () => {
  const found: string[] = [];
  for (const page of [...docPages('skills/design', '.md'), ...docPages('frameworks/angular/components', '.prompt.md')]) {
    for (const [, tag = '', attributes = ''] of readFileSync(join(repoRoot, page), 'utf8').matchAll(DOC_TAG))
      for (const name of unknownInputs(tag, attributes, INPUT_INDEX)) if (name !== '...') found.push(`${page}: ${tag} ${name}`);
  }
  assert.deepEqual(found, []);
});

test('a React source is not read by unknown-input', () => {
  assert.doesNotMatch(inputRules('<ArenaButton variant="secondary">Go</ArenaButton>', 'src/App.tsx'), /unknown-input/);
});

test('an arena-audit allow on the line exempts it', () => {
  assert.doesNotMatch(inputRules('<arena-button variant="x">Go</arena-button> <!-- arena-audit allow -->'), /unknown-input/);
});

test('without an index of inputs nothing is reported', () => {
  assert.doesNotMatch(rules('<arena-button variant="x">Go</arena-button>', 'src/app.html'), /unknown-input/);
});

test('every audit tag carries one description, in the register of a present-tense builder page, and nothing else does', () => {
  assert.deepEqual(Object.keys(RULE_DESCRIPTIONS).sort(), [...RULE_TAGS].sort());
  const banned = /\b(?:since|now|no longer|today|used to|anymore|previously|formerly|newly|recently|became|was|were|once|replaced|raised|lowered)\b|v?12\.|\u2014/i;
  for (const [tag, text] of Object.entries(RULE_DESCRIPTIONS)) {
    assert.ok(text.trim().length > 0, tag);
    assert.ok(text.endsWith('.') && text.split('. ').length === 1, `${tag} is one sentence`);
    assert.doesNotMatch(text, banned, tag);
    assert.ok(text.split(/\s+/).length <= 30, `${tag} runs past 30 words`);
  }
});

function glyphLines(source: string, path = 'src/a.tsx') {
  return auditText(path, source).filter((line) => line.includes('raw-glyph'));
}

test('a glyph nested in a JSX prop is reported once, at its own element', () => {
  const found = glyphLines('<ArenaAppBar\n  brand={<a><i className="ph-fill ph-storefront" /></a>}\n/>');
  assert.equal(found.length, 1);
  assert.ok((found[0] ?? '').startsWith('src/a.tsx:2:'), found[0] ?? 'no finding');
});

test('a nested element\'s emphasis class is not read as the outer tag\'s', () => {
  assert.equal(classValues(' actions={<ArenaButton className="arena-emphasis-secondary" />} '), '');
});

test('a brace inside a quoted class attribute is still the tag\'s own class', () => {
  assert.match(classValues(' class="{{ x }} ph-bold ph-x"'), /ph-bold ph-x/);
  assert.match(rules('<i [ngClass]="{ \'ph-bold ph-x\': on }"></i>', 'src/a.html'), /raw-glyph/);
});

test('a bound class in a file that names a ph-* literal may hold a Phosphor class', () => {
  const tsx = glyphLines("const TABS = [{ icon: 'ph-bold ph-kanban' }];\nexport const A = () => <i className={TABS[0].icon} />;");
  assert.equal(tsx.length, 1);
  assert.ok((tsx[0] ?? '').includes('may hold a Phosphor class'));
  assert.ok(RAW_GLYPH_BOUND_MESSAGE.includes('may hold a Phosphor class'));
  const braces = glyphLines('<i class="{{ entry.icon }} tab__icon"></i>\n<b class="ph-bold ph-sun"></b>', 'src/a.html');
  assert.equal(braces.filter((line) => line.includes('may hold')).length, 1);
  const bound = glyphLines('<i [class]="themeIcon()"></i>\n<b class="ph-bold ph-sun"></b>', 'src/a.html');
  assert.equal(bound.filter((line) => line.includes('may hold')).length, 1);
});

test('a bound class in a file with no ph-* literal reports nothing, and ArenaIcon is never reported', () => {
  assert.equal(glyphLines('<i className={row.icon} />').length, 0);
  assert.equal(glyphLines('const x = "ph-bold ph-x";\n<ArenaIcon className={x} />').length, 0);
});

test('an element whose literal class is a glyph is reported once, with the literal message', () => {
  const found = glyphLines('<span className={`ph ph-bell ${open ? "a" : "b"}`} />');
  assert.equal(found.length, 1);
  assert.ok(!(found[0] ?? '').includes('may hold'));
});

test('in a file naming a ph-* literal, a lone ngClass object and a glyph-free literal class are not reported as bound', () => {
  const lone = glyphLines('<b class="ph-bold ph-sun"></b>\n<i [ngClass]="{ on: active }"></i>', 'src/a.html');
  assert.equal(lone.filter((line) => line.startsWith('src/a.html:2:')).length, 0);
  const literal = glyphLines('const A = "ph-bold ph-sun";\nconst B = () => <i className="tab__icon" />;');
  assert.equal(literal.length, 0);
});

const NAMES_REACT = "const I = 'ph-bold ph-star';\n";
const NAMES_ANGULAR = '<arena-icon icon="ph-bold ph-star"></arena-icon>\n';
const verdicts = (lines: string[]) => lines.map((line) => (line.includes('may hold') ? 'bound' : 'literal'));
const glyphVerdicts = (react: string, angular: string) => [
  verdicts(glyphLines(NAMES_REACT + react)),
  verdicts(glyphLines(NAMES_ANGULAR + angular, 'src/a.html')),
];

test('raw-glyph reads a bound class by its results, alike in both layers', () => {
  const rows: [string, string, string, string[]][] = [
    ['identifier', '<div className={cls} />', '<div [class]="cls"></div>', ['bound']],
    ['ngClass identifier', '<div className={cls} />', '<div [ngClass]="cls"></div>', ['bound']],
    ['attr.class identifier', '<div className={cls} />', '<div [attr.class]="cls"></div>', ['bound']],
    ['interpolation', '<div className={`a ${cls}`} />', '<div class="{{ cls }}"></div>', ['bound']],
    ['toggle', "<ArenaTag className={on ? 'arena-accent-primary' : undefined} />", '<arena-tag [class.arena-accent-primary]="on"></arena-tag>', []],
    ['braced string', "<div className={'arena-a'} />", '<div class="arena-a"></div>', []],
    ['template, no substitution', '<div className={`arena-a`} />', "<div [class]=\"'arena-a'\"></div>", []],
    ['and', "<div className={on && 'arena-a'} />", "<div [ngClass]=\"{ 'arena-a': on }\"></div>", []],
    ['class object', "<div className={on && 'arena-a'} />", "<div [class]=\"{ 'arena-a': on }\"></div>", []],
    ['empty results', "<div className={a ? 'arena-a' : b ? null : false} />", "<div [class]=\"a ? 'arena-a' : ''\"></div>", []],
    ['or', "<div className={cls || 'arena-a'} />", "<div [class]=\"cls ?? 'arena-a'\"></div>", ['bound']],
    ['Phosphor toggle', "<i className={on ? 'ph-bold ph-star' : 'ph-bold'} />", '<i class="ph-bold" [class.ph-star]="on"></i>', ['literal']],
  ];
  for (const [label, react, angular, expected] of rows)
    assert.deepEqual(glyphVerdicts(react, angular), [expected, expected], label);
});

test('an unquoted template attribute reads as HTML does: [class]=cls is bound, class=arena-a is literal', () => {
  assert.equal(glyphLines(`${NAMES_ANGULAR}<div [class]=cls></div>`, 'src/a.html').length, 1);
  assert.equal(glyphLines(`${NAMES_ANGULAR}<div class=arena-a></div>`, 'src/a.html').length, 0);
});

test('valueResults skips quotes, optional chaining and wrapping parens', () => {
  assert.deepEqual(valueResults("{on ? 'a:b' : 'c?d'}"), ['a:b', 'c?d']);
  assert.deepEqual(valueResults("{row?.on ? 'arena-a' : ''}"), ['arena-a']);
  assert.deepEqual(valueResults("{(\n  on ? 'arena-a' : undefined\n)}"), ['arena-a']);
  assert.equal(valueResults('{cls ?? null}'), null);
  assert.equal(valueResults("{cn('arena-a', b)}"), null);
  assert.deepEqual(valueResults("\"{ 'arena-a arena-b': on, active: x }\"", true), ['arena-a arena-b', 'active']);
  assert.equal(valueResults('"{ [key]: on }"', true), null);
});

test('valueResults reads the right side of &&, every side of || and the key of an object entry whose value is a ternary', () => {
  assert.deepEqual(valueResults("{on && 'arena-a'}"), ['arena-a']);
  assert.deepEqual(valueResults("{a && b && 'arena-a'}"), ['arena-a']);
  assert.equal(valueResults('{on && cls}'), null);
  assert.deepEqual(valueResults("{'arena-a' || 'arena-b' || undefined}"), ['arena-a', 'arena-b']);
  assert.equal(valueResults("{'arena-a' || cls || 'arena-b'}"), null);
  assert.deepEqual(valueResults("\"{ 'arena-a': on ? x : y, active: a ? b : c }\"", true), ['arena-a', 'active']);
});

test('iconMemberGlyphs reads an attribute that follows a braced one', () => {
  assert.deepEqual([...iconMemberGlyphs('<ArenaIcon key={n} icon="ph-bold ph-star" />')], ['ph-star']);
  assert.deepEqual([...iconMemberGlyphs('<ArenaIcon key="k" icon="ph-bold ph-star" />')], ['ph-star']);
  assert.deepEqual([...iconMemberGlyphs('<ArenaButton icon={a} iconRight="ph-bold ph-caret-down" />')], ['ph-caret-down']);
  assert.deepEqual([...iconMemberGlyphs('<ArenaIcon key={n}\n  icon="ph-bold ph-star" />')], ['ph-star']);
});

test('classValues reads a class attribute that follows a braced one', () => {
  assert.match(classValues(' class={a} className="ph-bold ph-x"'), /ph-bold ph-x/);
  assert.match(classValues(' class={a} [class]="\'ph-bold ph-x\'"'), /ph-bold ph-x/);
  assert.match(classValues(' class={a} [ngClass]="{ \'ph-bold ph-x\': on }"'), /ph-bold ph-x/);
});

test('iconMemberGlyphs reads ArenaIcon, an icon attribute of an Arena tag and a symbol reference, and nothing else', () => {
  const text = [
    '<ArenaIcon icon="ph-bold ph-x" />',
    '<ArenaButton icon="ph ph-plus" />',
    '<arena-side-nav-item [icon]="\'ph-bold ph-house\'">',
    '<use href="/s.svg#ph-fill-heart" />',
    '<arena-icon icon="ph-bold ph-a"></arena-icon>',
    '<ArenaButton iconRight="ph-bold ph-b" />',
  ].join('\n');
  assert.deepEqual([...iconMemberGlyphs(text)].sort(), ['ph-a', 'ph-b', 'ph-heart', 'ph-house', 'ph-plus', 'ph-x']);
  assert.equal(iconMemberGlyphs("const T = [{ icon: 'ph-bold ph-kanban' }]").size, 0);
  assert.equal(iconMemberGlyphs('<i className="ph-bold ph-y" />').size, 0);
});

test('iconMemberGlyphs reads a glyph handed over in a JSX expression, and not one in a nested element of an Arena tag', () => {
  const text = [
    "<ArenaIcon icon={'ph-bold ph-q'} />",
    "<ArenaButton icon={on ? 'ph ph-r' : 'ph ph-s'} />",
    '<ArenaAppBar brand={<i className="ph-bold ph-z" />} />',
  ].join('\n');
  assert.deepEqual([...iconMemberGlyphs(text)].sort(), ['ph-q', 'ph-r', 'ph-s']);
});

test('iconMemberGlyphs does not count a glyph an icon attribute draws through a nested element', () => {
  assert.deepEqual([...iconMemberGlyphs('<ArenaButton icon={<i className="ph-bold ph-n" />} />')], []);
  assert.deepEqual([...iconMemberGlyphs('<ArenaButton icon={ <i className="ph-bold ph-n" />} />')], []);
});

test('iconMemberGlyphs reads the literals of an icon expression and not those of an element nested in it', () => {
  assert.deepEqual([...iconMemberGlyphs('<ArenaButton icon={on ? <i className="ph-bold ph-n"/> : \'ph ph-s\'} />')], ['ph-s']);
  assert.deepEqual([...iconMemberGlyphs('<ArenaButton icon={on ? <b><i className="ph-bold ph-n" /></b> : \'ph ph-s\'} />')], ['ph-s']);
});

const LEVELS = levelledRoles(tokenCatalogue(repoRoot).roles);

test('a role whose combines names a level is reported when it is read without one, with the levelled form in the message', () => {
  assert.equal(LEVELS.size, 9, 'the catalogue names nine levelled roles');
  assert.deepEqual(LEVELS.get('ink-muted'), { level: 'level-ink-muted', keys: ['ink-muted'] });
  assert.deepEqual(LEVELS.get('fill-selected'), { level: 'level-accent-soft-primary', keys: ['selected'] });
  const MIX = 'color-mix(in oklab, var(--ink-muted) var(--level-ink-muted), transparent)';
  const ROWS: { name: string; path: string; source: string; want: RegExp | null }[] = [
    { name: 'bare class', path: 'src/App.tsx', source: '<p className="text-ink-muted">x</p>', want: /`text-ink-muted\/\(--level-ink-muted\)`/ },
    { name: 'levelled class', path: 'src/App.tsx', source: '<p className="text-ink-muted/(--level-ink-muted)">x</p>', want: null },
    { name: 'bracket level', path: 'src/App.tsx', source: '<li className="bg-selected/[var(--level-accent-soft-primary)]">x</li>', want: null },
    { name: 'renamed key', path: 'src/App.tsx', source: '<li className="bg-selected">x</li>', want: /`bg-selected` reads fill-selected .*`bg-selected\/\(--level-accent-soft-primary\)`/ },
    { name: 'renamed key in a variant', path: 'src/App.tsx', source: '<li className="aria-selected:bg-selected">x</li>', want: /`aria-selected:bg-selected\/\(--level-accent-soft-primary\)`/ },
    { name: 'another level counts', path: 'src/App.tsx', source: '<p className="text-ink-body/(--level-ink-muted)">x</p>', want: null },
    { name: 'literal share', path: 'src/App.tsx', source: '<div className="bg-overlay-scrim/60" />', want: /`\/60`.*`bg-overlay-scrim\/\(--level-scrim\)`/ },
    { name: 'variants kept', path: 'src/App.tsx', source: '<p className="[&>p]:hover:text-ink-muted">x</p>', want: /`\[&>p\]:hover:text-ink-muted\/\(--level-ink-muted\)`/ },
    { name: 'Angular template', path: 'src/app.html', source: '<span class="text-ink-key">K</span>', want: /text-ink-key\/\(--level-ink-muted\)/ },
    { name: 'a string label', path: 'src/App.tsx', source: "const label = 'caption on bg-overlay-media';", want: /bg-overlay-media\/\(--level-media\)/ },
    { name: 'role without a level', path: 'src/App.tsx', source: '<h2 className="text-ink-heading">t</h2>', want: null },
    { name: 'longer name', path: 'src/App.tsx', source: '<p className="bg-selected-hover text-ink-muted-strong">x</p>', want: null },
    { name: 'comment', path: 'src/App.tsx', source: '/* text-ink-muted */', want: null },
    { name: 'allowed', path: 'src/App.tsx', source: '<p className="text-ink-muted">x</p> {/* arena-audit allow */}', want: null },
    { name: 'bare var', path: 'src/a.css', source: '.cap { color: var(--ink-muted); }', want: /color-mix\(in oklab, var\(--ink-muted\) var\(--level-ink-muted\), transparent\)/ },
    { name: 'colour key', path: 'src/a.css', source: '.cap { color: var(--color-ink-muted); }', want: /reads var\(--color-ink-muted\) without its level.*var\(--level-ink-muted\)/ },
    { name: 'renamed colour key', path: 'src/a.css', source: '.row { background: var(--color-selected); }', want: /reads var\(--color-selected\) without its level.*Write color-mix\(in oklab, var\(--color-selected\) var\(--level-accent-soft-primary\), transparent\)/ },
    { name: 'renamed colour key levelled', path: 'src/a.css', source: '.row { background: color-mix(in oklab, var(--color-selected) var(--level-accent-soft-primary), transparent); }', want: null },
    { name: 'colour key of the role name', path: 'src/a.css', source: '.cap { color: var(--color-fill-selected); }', want: null },
    { name: 'levelled mix', path: 'src/a.css', source: `.cap { color: ${MIX}; }`, want: null },
    { name: 'role in a fallback', path: 'src/a.css', source: '.cap { color: color-mix(in oklab, var(--mine, var(--ink-muted)) var(--level-ink-muted), transparent); }', want: null },
    { name: 'literal mix', path: 'src/a.css', source: '.cap { color: color-mix(in oklab, var(--ink-muted) 62%, transparent); }', want: /62%/ },
    { name: 'one of two', path: 'src/a.css', source: '.a { color: color-mix(in oklab, var(--ink-body) var(--level-ink-body), transparent); background: var(--overlay-media); }', want: /--overlay-media/ },
    { name: 'inline style', path: 'src/App.tsx', source: "<p style={{ color: 'var(--ink-figure)' }}>1</p>", want: /var\(--level-ink-full\)/ },
    { name: 'bracket var', path: 'src/App.tsx', source: '<p className="text-[var(--ink-link)]">a</p>', want: /Write color-mix\(in_oklab,var\(--ink-link\)_var\(--level-ink-body\),transparent\) \(missing-level\)$/ },
    { name: 'arbitrary property', path: 'src/App.tsx', source: '<p className="hover:[color:var(--ink-link)]">a</p>', want: /Write color-mix\(in_oklab,var\(--ink-link\)_var\(--level-ink-body\),transparent\) \(missing-level\)$/ },
    { name: 'a string in an array', path: 'src/App.tsx', source: "const reads = ['var(--ink-link)'];", want: /Write color-mix\(in oklab, var\(--ink-link\) var\(--level-ink-body\), transparent\) \(missing-level\)$/ },
    { name: 'inline style over two lines', path: 'src/App.tsx', source: '<p style={{ color: `color-mix(in oklab,\n  var(--ink-muted) var(--level-ink-muted), transparent)` }}>x</p>', want: null },
    { name: 'style attribute over two lines', path: 'src/app.html', source: '<p style="color: color-mix(in oklab, var(--ink-muted)\n  var(--level-ink-muted), transparent)">x</p>', want: null },
    { name: 'inline share on the next line', path: 'src/App.tsx', source: '<p style={{ color: `color-mix(in oklab,\n  var(--ink-muted) 62%, transparent)` }}>x</p>', want: /^src\/App\.tsx:2: reads ink-muted at a literal share of 62%/ },
    { name: 'a template slot inside a levelled mix', path: 'src/App.tsx', source: '<p style={{ color: `color-mix(in oklab, ${a}, var(--ink-muted) var(--level-ink-muted))` }}>x</p>', want: null },
    { name: 'a quoted fallback inside a levelled mix', path: 'src/App.tsx', source: '<p style={{ color: \'color-mix(in oklab, var(--ink-muted, "red") var(--level-ink-muted), transparent)\' }}>x</p>', want: null },
    { name: 'a template slot inside a bare mix', path: 'src/App.tsx', source: '<p style={{ color: `color-mix(in oklab, var(--ink-muted) ${a}, transparent)` }}>x</p>', want: /reads var\(--ink-muted\) without its level/ },
    { name: 'a comparison before the read', path: 'src/App.tsx', source: "const tone = x < 3 ? 'var(--ink-muted)' : '';", want: /reads var\(--ink-muted\) without its level/ },
    { name: 'inline share on one line', path: 'src/App.tsx', source: "<p style={{ color: 'color-mix(in oklab, var(--ink-muted) 62%, transparent)' }}>x</p>", want: /reads ink-muted at a literal share of 62%/ },
    { name: 'a bracket of another class', path: 'src/App.tsx', source: '<p className="grid-cols-[repeat(2,1fr)] text-[var(--ink-link)]">a</p>', want: /Write color-mix\(in_oklab,var\(--ink-link\)_var\(--level-ink-body\),transparent\) \(missing-level\)$/ },
    { name: 'an index, not a class', path: 'src/App.tsx', source: '<p data-tone=tones[var(--ink-link)]>a</p>', want: /Write color-mix\(in oklab, var\(--ink-link\) var\(--level-ink-body\), transparent\) \(missing-level\)$/ },
    { name: 'call on the line above', path: 'src/a.css', source: '.cap {\n  color: color-mix(in oklab,\n    var(--ink-muted) var(--level-ink-muted), transparent);\n}', want: null },
    { name: 'level on the next line', path: 'src/a.css', source: '.cap {\n  color: color-mix(in oklab, var(--ink-muted)\n    var(--level-ink-muted), transparent);\n}', want: null },
    { name: 'share on the next line', path: 'src/a.css', source: '.cap {\n  color: color-mix(in oklab,\n    var(--ink-muted) 62%, transparent);\n}', want: /^src\/a\.css:3: reads ink-muted at a literal share of 62%/ },
    { name: 'gradient stop', path: 'src/a.css', source: '.cap { background: linear-gradient(to bottom, var(--overlay-media) 20%, transparent); }', want: /^src\/a\.css:1: reads var\(--overlay-media\) without its level/ },
    { name: 'a selector', path: 'src/a.css', source: '.text-ink-muted { color: red; }', want: null },
    { name: 'applied class', path: 'src/a.css', source: '.cap { @apply text-ink-muted; }', want: /`text-ink-muted\/\(--level-ink-muted\)`/ },
  ];
  for (const row of ROWS) {
    const got = auditText(row.path, row.source, 'app', null, LEVELS).filter((l) => l.endsWith('(missing-level)'));
    if (row.want === null) assert.equal(got.length, 0, `${row.name}: ${got.join(' | ')}`);
    else {
      assert.equal(got.length, 1, `${row.name}: ${got.join(' | ')}`);
      assert.match(got[0] ?? '', row.want, row.name);
    }
  }
});

test('the level rule is silent where nothing names the levels and in a style plugin', () => {
  const ROWS: { name: string; found: string[] }[] = [
    { name: 'no levels argument', found: auditText('src/App.tsx', '<p className="text-ink-muted">x</p>') },
    { name: 'style plugin', found: findings('design/x/plugin.css', '.x { color: var(--ink-muted); }', 'plugin', null, LEVELS).map((one) => one.rule) },
  ];
  for (const row of ROWS) assert.equal(row.found.join(' ').includes('missing-level'), false, row.name);
});

test('levelledRoles keeps the roles whose combines names a level, and nothing else', () => {
  type Level = { level: string; keys: string[] };
  const ROWS: { name: string; roles: Parameters<typeof levelledRoles>[0]; want: [string, Level][] }[] = [
    { name: 'no roles', roles: undefined, want: [] },
    { name: 'one level among others', want: [['ink-muted', { level: 'level-ink-muted', keys: ['ink-muted'] }]], roles: {
      'pad-row-x': { combines: [{ with: 'dz-row-scale-x', as: 'density' }] },
      'ink-muted': { combines: [{ with: 'level-ink-muted', as: 'level' }], keys: ['ink-muted'] },
      'ink-heading': {},
    } },
    { name: 'a renamed key', want: [['fill-selected', { level: 'level-accent-soft-primary', keys: ['selected'] }]], roles: {
      'fill-selected': { combines: [{ with: 'level-accent-soft-primary', as: 'level' }], keys: ['selected'] },
    } },
    { name: 'no keys', want: [['a', { level: 'level-a', keys: [] }]], roles: { a: { combines: [{ with: 'level-a', as: 'level' }] } } },
  ];
  for (const row of ROWS) assert.deepEqual([...levelledRoles(row.roles)], row.want, row.name);
});

test('the levels a directory carries are read from its table or its catalogue, and nothing from a missing or malformed one', () => {
  const a = { level: 'level-a', keys: ['a-key'] };
  const catalogue = JSON.stringify({ roles: { a: { combines: [{ with: 'level-a', as: 'level' }], keys: ['a-key'] } } });
  const ROWS: [string, string, string | null, typeof loadLevels, [string, typeof a][] | null][] = [
    ['no table', 'arena.levels.json', null, loadLevels, null],
    ['a table', 'arena.levels.json', JSON.stringify({ a }), loadLevels, [['a', a]]],
    ['a table holding an array', 'arena.levels.json', '[1]', loadLevels, null],
    ['a table without keys', 'arena.levels.json', '{"a":{"level":"level-a"}}', loadLevels, null],
    ['a table of bare levels', 'arena.levels.json', '{"a":"level-a"}', loadLevels, null],
    ['no catalogue', 'arena.tokens.json', null, catalogueLevels, null],
    ['a catalogue', 'arena.tokens.json', catalogue, catalogueLevels, [['a', a]]],
    ['an unreadable catalogue', 'arena.tokens.json', '{nope', catalogueLevels, null],
  ];
  for (const [name, file, body, reader, want] of ROWS) {
    const dir = mkdtempSync(join(tmpdir(), 'levels-'));
    try {
      if (body !== null) writeFileSync(join(dir, file), body);
      const got = reader(dir);
      assert.deepEqual(got === null ? null : [...got], want, name);
    } finally { rmSync(dir, { recursive: true, force: true }); }
  }
});

test('class candidates are read from the class attributes of own elements and from @apply', () => {
  const ROWS: { name: string; path: string; source: string; want: [number, string][] }[] = [
    { name: 'static class', path: 'src/App.tsx', source: '<div className="p-2 shadow-md">x</div>', want: [[1, 'p-2'], [1, 'shadow-md']] },
    { name: 'Arena element', path: 'src/App.tsx', source: '<ArenaButton className="arena-emphasis-primary" />', want: [] },
    { name: 'call', path: 'src/App.tsx', source: "<div className={cn('flex', on && 'xl:flex')} />", want: [[1, 'flex'], [1, 'xl:flex']] },
    { name: 'ternary', path: 'src/App.tsx', source: "<div className={on ? 'ease-in' : 'ease-out'} />", want: [[1, 'ease-in'], [1, 'ease-out']] },
    { name: 'template', path: 'src/App.tsx', source: '<div className={`gap-2 ${x} rounded-3xl`} />', want: [[1, 'gap-2'], [1, 'rounded-3xl']] },
    { name: 'template fragment', path: 'src/App.tsx', source: '<div className={`bg-${tone}`} />', want: [] },
    { name: 'interpolation', path: 'src/app.html', source: '<p class="text-gray-500 {{ extra }}">x</p>', want: [[1, 'text-gray-500']] },
    { name: 'ngClass keys', path: 'src/app.html', source: `<p [ngClass]="{ 'shadow-md': on }">x</p>`, want: [[1, 'shadow-md']] },
    { name: 'attr class', path: 'src/app.html', source: `<p [attr.class]="'shadow-md'">x</p>`, want: [[1, 'shadow-md']] },
    { name: 'class binding ternary', path: 'src/app.html', source: `<p [class]="on ? 'shadow-md' : 'p-2'">x</p>`, want: [[1, 'shadow-md'], [1, 'p-2']] },
    { name: 'class toggle', path: 'src/app.html', source: '<p [class.shadow-md]="on">x</p>', want: [[1, 'shadow-md']] },
    { name: 'Angular element', path: 'src/app.html', source: '<arena-card class="arena-fill"></arena-card>', want: [] },
    { name: 'apply', path: 'src/a.css', source: '.card { @apply p-4 shadow-md; }', want: [[1, 'p-4'], [1, 'shadow-md']] },
    { name: 'apply over lines', path: 'src/a.css', source: '.c {\n  @apply p-4\n    shadow-md;\n}', want: [[2, 'p-4'], [3, 'shadow-md']] },
    { name: 'no apply', path: 'src/a.css', source: '.card { box-shadow: var(--shadow-1); }', want: [] },
    { name: 'comment', path: 'src/App.tsx', source: '{/* <div className="shadow-md" /> */}', want: [] },
    { name: 'later line', path: 'src/App.tsx', source: '<div\n  className="flex\n    shadow-md"\n/>', want: [[2, 'flex'], [3, 'shadow-md']] },
    { name: 'a string outside a class', path: 'src/App.tsx', source: "const label = 'shadow-md';", want: [] },
  ];
  for (const row of ROWS)
    assert.deepEqual(classCandidates(row.path, row.source).map((c) => [c.line, c.candidate]), row.want, row.name);
});

test('a candidate the dead map names is dead-utility at its line, in app scope only', () => {
  const DEAD = new Map([['shadow-md', 'MSG']]);
  const ROWS: { name: string; source: string; scope: 'app' | 'plugin'; dead: ReadonlyMap<string, string>; want: string[] }[] = [
    { name: 'reported', source: '<div className="p-2 shadow-md" />', scope: 'app', dead: DEAD, want: ['src/App.tsx:1: MSG (dead-utility)'] },
    { name: 'allowed and not stale', source: '<div className="shadow-md" /> {/* arena-audit allow */}', scope: 'app', dead: DEAD, want: [] },
    { name: 'Arena element', source: '<ArenaCard className="shadow-md" />', scope: 'app', dead: DEAD, want: [] },
    { name: 'plugin', source: '<div className="shadow-md" />', scope: 'plugin', dead: DEAD, want: [] },
    { name: 'no map', source: '<div className="shadow-md" />', scope: 'app', dead: NO_DEAD, want: [] },
    { name: 'twice on a line', source: '<div className="shadow-md shadow-md" />', scope: 'app', dead: DEAD, want: ['src/App.tsx:1: MSG (dead-utility)'] },
  ];
  for (const row of ROWS) {
    const got = auditText('src/App.tsx', row.source, row.scope, null, NO_LEVELS, row.dead)
      .filter((line) => line.endsWith('(dead-utility)') || line.includes('stale'));
    assert.deepEqual(got, row.want, row.name);
  }
});
