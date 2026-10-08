import test from 'node:test';
import assert from 'node:assert/strict';
import {
  matchesSpec, inPayload, servedBy, classify, resolvePosix, relativePosix,
  rewrite, rewriteTarget, retarget, carriedSpecs, isRepoPath, ROUTER_SOURCE, ROUTER_FILE,
} from './agent-payload.ts';

const BASES = {
  site: 'https://arena.dravensoft.org',
  repository: 'https://github.com/dravensoft-dev/arena/blob/main',
};

test('a double star spec reaches any depth and a single one stops at a segment', () => {
  assert.ok(matchesSpec('frameworks/react/components/forms/x/X.prompt.md', 'frameworks/react/components/**/*.prompt.md'));
  assert.ok(matchesSpec('frameworks/react/components/forms/INDEX.md', 'frameworks/react/components/*/INDEX.md'));
  assert.ok(!matchesSpec('frameworks/react/components/forms/x/INDEX.md', 'frameworks/react/components/*/INDEX.md'));
});

test('the payload carries the installed layer and never the other one', () => {
  assert.ok(inPayload('frameworks/react/INDEX.md', 'react'));
  assert.ok(!inPayload('frameworks/angular/INDEX.md', 'react'));
  assert.ok(inPayload('frameworks/angular/INDEX.md', 'angular'));
});

test('the payload carries the references, the neutral index, the roles and the patterns', () => {
  for (const rel of ['skills/design/references/stack.md', 'frameworks/INDEX.md',
    'contracts/design/roles.json', 'contracts/behaviour/feed.json']) {
    assert.ok(inPayload(rel, 'react'), `${rel} is not carried`);
  }
});

test('a spec list names the shared files plus the layer tree, and nothing else', () => {
  assert.equal(carriedSpecs('react').length, 13);
  assert.ok(carriedSpecs('react').every((spec) => !spec.includes('angular')));
});

test('what the site publishes and what only the repository has are told apart', () => {
  assert.equal(servedBy('contracts/design/colors.css'), 'site');
  assert.equal(servedBy('intro/styles.css'), 'site');
  assert.equal(servedBy('contracts/api/components/ArenaButton.json'), 'repository');
  assert.equal(servedBy('contracts/design/AGENTS.md'), 'repository');
  assert.equal(servedBy('frameworks/PACKAGING.md'), 'repository');
});

test('a pattern is carried rather than climbed to, so its link never leaves the corpus', () => {
  assert.equal(classify('contracts/behaviour/feed.json', 'react'), 'payload');
  assert.equal(rewriteTarget('contracts/behaviour/feed.json', ROUTER_FILE, 'react', BASES),
    '../../contracts/behaviour/feed.json');
});

test('the router is classified as carried and is renamed on the way in', () => {
  assert.equal(classify(ROUTER_SOURCE, 'react'), 'payload');
  assert.equal(rewriteTarget(ROUTER_SOURCE, 'skills/design/references/page.md', 'react', BASES), '../ROUTER.md');
  assert.equal(ROUTER_FILE, 'skills/design/ROUTER.md');
});

test('a layer placeholder resolves to the layer the package is', () => {
  assert.equal(rewriteTarget('frameworks/<layer>/INDEX.md', ROUTER_FILE, 'react', BASES),
    '../../frameworks/react/INDEX.md');
  assert.equal(rewriteTarget('frameworks/<layer>/INDEX.md', ROUTER_FILE, 'angular', BASES),
    '../../frameworks/angular/INDEX.md');
});

test('a path resolves and comes back relative, so a carried link keeps the text it had', () => {
  assert.equal(resolvePosix('skills/design/SKILL.md', './references/page.md'), 'skills/design/references/page.md');
  assert.equal(resolvePosix('skills/design/references/page.md', '../../../frameworks/INDEX.md'), 'frameworks/INDEX.md');
  assert.equal(relativePosix('skills/design/ROUTER.md', 'skills/design/references/page.md'), './references/page.md');
});

test('each of the three classes lands where it belongs', () => {
  const from = ROUTER_FILE;
  const out = rewrite(
    'see [a](./references/page.md), [b](../../frameworks/angular/PACKAGE.md), '
    + '[c](../../contracts/api/components/ArenaButton.json) and `contracts/behaviour/feed.json`',
    from, 'react', BASES,
  );
  assert.match(out, /\(\.\/references\/page\.md\)/, 'carried keeps its own path');
  assert.match(out, /\(https:\/\/arena\.dravensoft\.org\/frameworks\/angular\/PACKAGE\.md\)/, 'a page the site publishes goes to the site');
  assert.match(out, /\(https:\/\/github\.com\/[^)]*contracts\/api\/components\/ArenaButton\.json\)/, 'what only the repository has goes to the repository');
  assert.match(out, /`\.\.\/\.\.\/contracts\/behaviour\/feed\.json`/, 'a pattern is carried beside the router');
});

test('a link label naming the old router is rewritten with its target, not left behind', () => {
  const out = rewrite('[`../SKILL.md`](../SKILL.md)', 'skills/design/references/page.md', 'react', BASES);
  assert.equal(out, '[`../ROUTER.md`](../ROUTER.md)');
});

test('an off-site link and ordinary prose in backticks are left alone', () => {
  const from = ROUTER_FILE;
  assert.equal(rewrite('[x](https://example.com/a)', from, 'react', BASES), '[x](https://example.com/a)');
  assert.equal(rewrite('the `.arena-shell` class', from, 'react', BASES), 'the `.arena-shell` class');
  assert.equal(rewrite('a `16px` value', from, 'react', BASES), 'a `16px` value');
});

test('isRepoPath answers for a repository root and refuses a class name or a word', () => {
  assert.ok(isRepoPath('frameworks/INDEX.md'));
  assert.ok(isRepoPath('AGENTS.md'));
  assert.ok(!isRepoPath('.arena-shell'));
  assert.ok(!isRepoPath('arena.config.json'));
});

test('a page the site publishes points what the site leaves behind at the tag and keeps the rest', () => {
  const tag = 'https://github.com/dravensoft-dev/arena/blob/v1.2.3';
  const from = 'intro/AGENTS.md';
  const text = '[a](../AGENTS.md) [b](../scripts/x.ts#top) [c](./guidelines/y.html) [d](https://e.org/z) [e](#k)';
  assert.equal(
    retarget(text, from, tag),
    `[a](${tag}/AGENTS.md) [b](${tag}/scripts/x.ts#top) [c](./guidelines/y.html) [d](https://e.org/z) [e](#k)`,
  );
});

test('a link into a tree the site serves but did not carry is pointed at the tag as well', () => {
  const tag = 'https://github.com/dravensoft-dev/arena/blob/v1.2.3';
  const out = retarget('[a](../../frameworks/CHARTS.md) [b](../../frameworks/INDEX.md)', 'contracts/design/S.md', tag,
    (path) => path === 'frameworks/INDEX.md');
  assert.equal(out, `[a](${tag}/frameworks/CHARTS.md) [b](../../frameworks/INDEX.md)`);
});

test('the payload carries every token group, so a value a reference names can be read offline', () => {
  for (const rel of ['contracts/design/spacing.json', 'contracts/design/typography.json']) {
    assert.ok(inPayload(rel, 'react'), `${rel} is not carried`);
  }
  assert.equal(inPayload('contracts/design/Scales.md', 'react'), false,
    'the prose specification stays on the site, only the DTCG groups travel');
});

test('the default style plugin and the catalogue travel in both layers, and what is not a copy does not', () => {
  for (const layer of ['react', 'angular']) {
    for (const rel of ['plugin-style-store/default/plugin.tokens.json',
      'plugin-style-store/catalogue/INDEX.md', 'plugin-style-store/catalogue/booking/ENTRY.md',
      'plugin-style-store/catalogue/booking/plugin.css',
      'plugin-style-store/catalogue/booking/arena.config.json']) {
      assert.ok(inPayload(rel, layer), `${rel} is not carried in ${layer}`);
    }
  }
  assert.equal(inPayload('plugin-style-store/catalogue/AGENTS.md', 'react'), false);
  assert.equal(inPayload('plugin-style-store/AGENTS.md', 'react'), false);
});
