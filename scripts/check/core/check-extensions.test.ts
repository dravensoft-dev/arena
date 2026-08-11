import test from 'node:test';
import assert from 'node:assert/strict';
import {
  extensionName, extensionProblems, declarationProblems, zeroExtensionProblem, collect,
  fillsLikeThePage, floorProblems, groupingOf, isZeroLength, movedTokens, paintsNothing,
  principleProblems, jobOf, jobProblems,
  proximityRatio, resolvedFor, sharedPrincipleProblems,
} from './check-extensions.ts';

const LINE = '1px';
const NO_LINE = '0px';
const NO_DEPTH = '0px 0px 0px 0px rgba(0,0,0,0)';
const DEPTH = '0px 2px 6px -2px rgba(0,0,0,.5)';

const PAGE_LIKE = 'var(--color-base-100)';
const OWN_FILL = 'var(--color-base-200)';

const roles = (over: Record<string, string> = {}) => new Map(Object.entries({
  'bw-surface': LINE,
  'shadow-surface-rest': NO_DEPTH,
  'fill-surface': PAGE_LIKE,
  'rhythm-group': '8px',
  'rhythm-section': '64px',
  ...over,
}));

const at = (over: Record<string, string> = {}) => new Map([['dark', roles(over)]]);

const ROLES = {
  'r-surface': { $type: 'dimension' },
  'bw-surface': { $type: 'dimension' },
  'dur-hover': { $type: 'duration' },
};

const ok = { 'r-surface': { $type: 'dimension', $value: '{r.xl}', $description: 'why' } };

test('the name is the middle segment of the file name', () => {
  assert.equal(extensionName('contracts/design/extension.showcase.json'), 'showcase');
});

test('an extension overriding a role is accepted', () => {
  assert.deepEqual(extensionProblems('showcase', ok, ROLES), []);
});

test('an extension overriding something that is not a role fails, naming the token', () => {
  const tokens = { 'color-primary': { $type: 'color', $value: '#fff', $description: 'why' } };
  const problems = extensionProblems('showcase', tokens, ROLES);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /color-primary/);
});

test('an extension reaching for a raw scale step fails, because a scale is not an extension to move', () => {
  const tokens = { 'r-lg': { $type: 'dimension', $value: '{r.xl}', $description: 'why' } };
  assert.match(extensionProblems('showcase', tokens, ROLES)[0] ?? '', /r-lg/);
});

test('a type that disagrees with the role it overrides fails, so the two cannot drift', () => {
  const tokens = { 'dur-hover': { $type: 'dimension', $value: '{dur.mid}', $description: 'why' } };
  assert.match(extensionProblems('showcase', tokens, ROLES)[0] ?? '', /dimension.*duration|duration.*dimension/);
});

test('a token moved without a reason fails, because an extension is a set of decisions', () => {
  const tokens = { 'r-surface': { $type: 'dimension', $value: '{r.xl}' } };
  assert.match(extensionProblems('showcase', tokens, ROLES)[0] ?? '', /\$description/);
});

test('an extension that moves nothing fails rather than passing vacuously', () => {
  assert.match(extensionProblems('empty', {}, ROLES)[0] ?? '', /no role/i);
});

test('a name that is not kebab-case fails, since it becomes a class', () => {
  assert.match(extensionProblems('Showcase', ok, ROLES)[0] ?? '', /kebab/i);
});

test('an extension the generator does not emit fails, because the file alone paints nothing', () => {
  const problems = declarationProblems(['showcase'], [{ selector: ':root', source: 'roles.json' }]);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /\.arena-showcase/);
});

test('an extension declared under the matching selector is accepted', () => {
  const blocks = [{ selector: '.arena-showcase', source: 'extension.showcase.json' }];
  assert.deepEqual(declarationProblems(['showcase'], blocks), []);
});

test('a generator block naming an extension file that does not exist fails as the other half of the join', () => {
  const blocks = [{ selector: '.arena-gone', source: 'extension.gone.json' }];
  assert.match(declarationProblems([], blocks)[0] ?? '', /extension\.gone\.json/);
});

test('zeroExtensionProblem fails on an empty walk rather than reporting a clean pass', () => {
  assert.match(zeroExtensionProblem([]) ?? '', /0 extension/i);
});

test('the real tree holds: every shipped extension moves roles only, and the generator emits each one', () => {
  assert.deepEqual(collect(), []);
});

test('an extension re-valuing an fs step is accepted, because the type ladder is already a set of roles', () => {
  const tokens = { 'fs-display': { $type: 'dimension', $value: { value: 80, unit: 'px' }, $description: 'why' } };
  assert.deepEqual(extensionProblems('showcase', tokens, ROLES), []);
});

test('an fs step still needs a reason, like any other move', () => {
  const tokens = { 'fs-display': { $type: 'dimension', $value: { value: 80, unit: 'px' } } };
  assert.match(extensionProblems('showcase', tokens, ROLES)[0] ?? '', /\$description/);
});

test('an fs step declared as something other than a dimension fails', () => {
  const tokens = { 'fs-display': { $type: 'duration', $value: '{dur.mid}', $description: 'why' } };
  assert.match(extensionProblems('showcase', tokens, ROLES)[0] ?? '', /dimension/);
});

test('a token that merely starts with fs is not an fs step', () => {
  const tokens = { 'fsx-display': { $type: 'dimension', $value: { value: 80, unit: 'px' }, $description: 'why' } };
  assert.match(extensionProblems('showcase', tokens, ROLES)[0] ?? '', /fsx-display/);
});

test('an extension named none fails, because none is how a consumer says it wants no extension', () => {
  assert.match(extensionProblems('none', ok, ROLES)[0] ?? '', /none/);
});

test('an extension named default is ordinary, since default is not a word the config gives meaning to', () => {
  assert.deepEqual(extensionProblems('default', ok, ROLES), []);
});

test('a length is zero however it is spelled, and a shadow at zero alpha paints nothing', () => {
  assert.ok(isZeroLength('0px') && isZeroLength('0') && isZeroLength('0rem'));
  assert.ok(!isZeroLength('1px') && !isZeroLength('0.5px') && !isZeroLength(undefined));
  assert.ok(paintsNothing(NO_DEPTH) && paintsNothing(undefined));
  assert.ok(!paintsNothing(DEPTH) && !paintsNothing('0px 2px 6px rgb(0,0,0)'));
});

test('the principle is read from the arena namespace, and anything else is undeclared', () => {
  assert.equal(groupingOf({ $extensions: { 'com.dravensoft.arena': { grouping: 'proximity' } } }), 'proximity');
  assert.equal(groupingOf({ $extensions: { 'com.example': { grouping: 'proximity' } } }), undefined);
  assert.equal(groupingOf({ 'r-surface': {} }), undefined);
});

test('a voice that declares no principle fails, because a catalogue of undeclared ones differs by degree', () => {
  const problems = principleProblems('showcase', undefined, at());
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /declares no grouping principle/);
});

test('a principle Arena does not know fails rather than passing unchecked', () => {
  assert.match(principleProblems('showcase', 'vibes', at())[0] ?? '', /not a grouping principle/);
});

test('figure/ground has to remove the line and then separate the figure by depth OR by fill', () => {
  assert.deepEqual(principleProblems('showcase', 'figure-ground',
    at({ 'bw-surface': NO_LINE, 'shadow-surface-rest': DEPTH })), []);
  assert.deepEqual(principleProblems('showcase', 'figure-ground',
    at({ 'bw-surface': NO_LINE, 'fill-surface': OWN_FILL })), [],
  'a fill of its own separates a figure from its ground as a depth does, which is the clause the '
  + 'fill roles earned');
  assert.match(principleProblems('showcase', 'figure-ground', at({ 'shadow-surface-rest': DEPTH }))[0] ?? '',
    /still draws --bw-surface/);
  assert.match(principleProblems('showcase', 'figure-ground', at({ 'bw-surface': NO_LINE }))[0] ?? '',
    /neither a depth nor a fill/);
});

test('proximity draws nothing at all, so a line or a depth is another principle wearing its name', () => {
  assert.deepEqual(principleProblems('editorial', 'proximity', at({ 'bw-surface': NO_LINE })), []);
  assert.match(principleProblems('editorial', 'proximity',
    at({ 'bw-surface': NO_LINE, 'fill-surface': OWN_FILL }))[0] ?? '', /a fill is a region drawn/);
  assert.match(principleProblems('editorial', 'proximity', at())[0] ?? '', /common region under another name/);
  assert.match(principleProblems('editorial', 'proximity',
    at({ 'bw-surface': NO_LINE, 'shadow-surface-rest': DEPTH }))[0] ?? '', /figure and ground under another name/);
});

test('common region has to draw the region it claims to group by', () => {
  assert.deepEqual(principleProblems('console', 'common-region', at()), []);
  assert.match(principleProblems('console', 'common-region', at({ 'bw-surface': NO_LINE }))[0] ?? '',
    /has to draw it/);
});

test('two voices claiming one principle fail, which is the whole point of declaring it', () => {
  const problems = sharedPrincipleProblems(new Map([
    ['showcase', 'figure-ground'], ['glossy', 'figure-ground'], ['editorial', 'proximity'],
  ]));
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /extension\.showcase\.json and extension\.glossy\.json both group by figure-ground/);
});

test('an undeclared voice is not counted as sharing with another undeclared one, which is a different failure', () => {
  assert.deepEqual(sharedPrincipleProblems(new Map([['a', undefined], ['b', undefined]])), []);
});

test('a role a voice leaves alone resolves to what it inherits, and one it moves to what it wrote', () => {
  const css = ':root{--bw-surface:1px;--dur-hover:120ms}\n.arena-showcase{--bw-surface:0px}';
  const resolved = resolvedFor(css, 'showcase');
  assert.equal(resolved.get('bw-surface'), '0px');
  assert.equal(resolved.get('dur-hover'), '120ms');
});

test('a theme group is flattened to the tokens it holds, each labelled with the scope it overrides in', () => {
  const moved = movedTokens({
    $extensions: { 'com.dravensoft.arena': { grouping: 'figure-ground' } },
    'bw-surface': { $type: 'dimension' },
    light: { 'shadow-surface-rest': { $type: 'shadow' } },
  });
  assert.deepEqual(moved.map((m) => [m.key, m.theme]),
    [['bw-surface', ''], ['shadow-surface-rest', 'light']]);
});

test('a theme block overrides the base one, and the base one is the dark answer because :root is dark', () => {
  const css = ':root{--shadow-surface-rest:none}\n'
    + '.arena-showcase{--shadow-surface-rest:RIM}\n'
    + '.arena-light.arena-showcase, .arena-light .arena-showcase, .arena-showcase .arena-light'
    + '{--shadow-surface-rest:DROP}';
  assert.equal(resolvedFor(css, 'showcase', 'dark').get('shadow-surface-rest'), 'RIM');
  assert.equal(resolvedFor(css, 'showcase', 'light').get('shadow-surface-rest'), 'DROP');
});

test('a voice is held in every scope it ships, so a cue that carries one polarity and not the other fails', () => {
  const byScope = new Map([
    ['dark', roles({ 'bw-surface': NO_LINE, 'shadow-surface-rest': DEPTH })],
    ['light', roles({ 'bw-surface': NO_LINE })],
  ]);
  const problems = principleProblems('showcase', 'figure-ground', byScope);
  assert.equal(problems.length, 1);
  assert.match(problems[0] ?? '', /in light .*neither a depth nor a fill/);
});

test('a rhythm step is movable for the same reason an fs step is, and both still need a reason', () => {
  const moved = { 'rhythm-section': { $type: 'dimension', $value: '{sp.10}', $description: 'why' } };
  assert.deepEqual(extensionProblems('editorial', moved, ROLES), []);
  const mute = { 'rhythm-section': { $type: 'dimension', $value: '{sp.10}' } };
  assert.match(extensionProblems('editorial', mute, ROLES)[0] ?? '', /\$description/);
  const wrong = { 'rhythm-section': { $type: 'duration', $value: '{dur.mid}', $description: 'why' } };
  assert.match(extensionProblems('editorial', wrong, ROLES)[0] ?? '', /rhythm step is a dimension/);
});

test('a spacing step that is not a rhythm step is still a scale, so an extension cannot reach it', () => {
  const tokens = { 'sp-5': { $type: 'dimension', $value: '{sp.8}', $description: 'why' } };
  assert.match(extensionProblems('editorial', tokens, ROLES)[0] ?? '', /sp-5/);
});

test('proximity is held to a ratio, because distance is the only signal it has left', () => {
  assert.match(principleProblems('editorial', 'proximity',
    at({ 'bw-surface': NO_LINE, 'rhythm-section': '24px' }))[0] ?? '', /only 3\.0 times/);
  assert.deepEqual(principleProblems('editorial', 'proximity',
    at({ 'bw-surface': NO_LINE, 'rhythm-section': '32px' })), []);
  assert.equal(proximityRatio(roles()), 8);
  assert.equal(proximityRatio(new Map([['rhythm-group', '0px'], ['rhythm-section', '64px']])), null);
});

test('a fill counts as the page only when it references the page colour, never when it merely resolves near it', () => {
  assert.ok(fillsLikeThePage(new Map([['fill-surface', 'var(--color-base-100)']])));
  assert.ok(!fillsLikeThePage(new Map([['fill-surface', 'var(--color-base-200)']])));
  assert.ok(!fillsLikeThePage(new Map([['fill-surface', '#141010']])));
  assert.ok(!fillsLikeThePage(new Map()));
});

test('the reading floor is measured, not trusted, and a voice may sit far above it', () => {
  assert.deepEqual(floorProblems(new Map([['lh-prose', '1.8']]), 'dark', 'x'), []);
  assert.deepEqual(floorProblems(new Map([['lh-prose', '1.5']]), 'dark', 'x'), []);
  assert.match(floorProblems(new Map([['lh-prose', '1.15']]), 'dark', 'x')[0] ?? '',
    /--lh-prose is 1\.15 in dark, under the 1\.5/);
  assert.match(floorProblems(new Map(), 'light', 'x')[0] ?? '', /does not resolve to a number in light/);
});

test('a voice declares the work it is for, because that is the question a reader picks it by', () => {
  assert.deepEqual(jobOf({ $extensions: { 'com.dravensoft.arena': { job: 'read: documentation and reports' } } }),
    'read: documentation and reports');
  assert.equal(jobOf({ $extensions: { 'com.dravensoft.arena': { grouping: 'proximity' } } }), undefined);
  assert.deepEqual(jobProblems('editorial', 'read: documentation, reports and changelogs'), []);
  assert.match(jobProblems('editorial', undefined)[0] ?? '', /declares no job a reader can pick it by/);
  assert.match(jobProblems('editorial', 'read')[0] ?? '', /naming the WORK the voice is for/);
});
