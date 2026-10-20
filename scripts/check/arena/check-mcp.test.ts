import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import {
  collect, unassembled, dependencyProblems, importedPackages, binProblems, corpusProblems, catalogueProblems,
  unresolvedTarget, targetsIn, registryProblems, SITE_BASE, REGISTRY_SCHEMA,
  REGISTRY_DESCRIPTION_LIMIT, flatProblems, ESCAPING_SPECIFIER, vocabularyProblems,
  styleStoreProblems, identityProblems,
} from './check-mcp.ts';
import {
  RUNTIME_DEPENDENCIES, ENTRY, NAME, LAYERS, DIST, REGISTRY_NAME, manifest, buildMcpPackage,
} from '../../build/arena/build-mcp-package.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { IDENTITY_DIR as PAYLOAD_IDENTITY_DIR } from '../../lib/arena/agent-payload.ts';
import { IDENTITY_DIR } from '../../generate/core/arena-mcp/catalogue.ts';

const made: string[] = [];
const track = (dir: string) => { made.push(dir); return dir; };
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

const MANIFEST = JSON.stringify({
  name: 'arena', description: 'd', homepage: 'h', version: '0.0.0',
  package: NAME, layer: 'react', router: 'skills/design/ROUTER.md',
});

function corpus(files: Record<string, string>) {
  const dir = track(mkdtempSync(join(tmpdir(), 'arena-mcp-pkg-')));
  for (const [path, body] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

const assembly = track(mkdtempSync(join(tmpdir(), 'arena-mcp-asm-')));
buildMcpPackage(root, assembly);

test('the tree passes its own claims, and an empty assembly does not', () => {
  assert.deepEqual(collect(root, assembly).problems, []);
  const empty = corpus({});
  mkdirSync(join(empty, 'bin'));
  assert.ok(collect(root, empty).problems.length > 0, 'an assembly holding no file cannot pass in vacuum');
});

const refusal = (base: string, strict: string) => spawnSync(process.execPath, ['-e', [
  `const { refuseUnassembled } = await import(${JSON.stringify(pathToFileURL(join(root, 'scripts', 'check', 'arena', 'check-mcp.ts')).href)});`,
  `refuseUnassembled(${JSON.stringify(base)}, { ARENA_CHECK_STRICT: ${JSON.stringify(strict)} });`,
  "console.log('went on');",
].join('\n')], { encoding: 'utf8' });

test('check:mcp refuses a tree with no dist/mcp and names the step that assembles it', () => {
  assert.match(unassembled('/nowhere-at-all') ?? '', new RegExp(`${DIST} is not assembled.*run bun run build:packages first`));
  const soft = refusal('/nowhere-at-all', '0');
  assert.equal(soft.status, 2, soft.stderr);
  assert.match(soft.stderr, /check:mcp: SKIPPED/);
  assert.doesNotMatch(soft.stdout, /went on/);
  assert.equal(refusal('/nowhere-at-all', '1').status, 1);
  const base = track(mkdtempSync(join(tmpdir(), 'check-mcp-assembled-')));
  mkdirSync(join(base, ...DIST.split('/')), { recursive: true });
  assert.equal(unassembled(base), null);
  assert.match(refusal(base, '1').stdout, /went on/);
});

test('the gate read a real result set rather than an empty one', () => {
  const imported = importedPackages();
  assert.ok(imported.size > 0, 'no bare import was found, so a clean pass says nothing');
  assert.deepEqual([...imported].sort(), Object.keys(RUNTIME_DEPENDENCIES).sort());
});

test('an import with no dependency behind it is a server that throws at spawn', () => {
  const problems = dependencyProblems(undefined, { zod: '^4' });
  assert.ok(problems.some((one) => /@modelcontextprotocol\/server and declares no dependency/.test(one)));
});

test('a dependency nothing imports is one every consumer installs for nothing', () => {
  const problems = dependencyProblems(undefined, { ...RUNTIME_DEPENDENCIES, 'left-pad': '^1' });
  assert.ok(problems.some((one) => /left-pad and imports it nowhere/.test(one)));
});

test('a bin the package declares and does not carry is a command an editor cannot spawn', () => {
  const dir = track(mkdtempSync(join(tmpdir(), 'arena-mcp-pkg-')));
  assert.match(binProblems(dir)[0] ?? '', /is declared as the bin and is not there/);
  mkdirSync(join(dir, 'bin'), { recursive: true });
  writeFileSync(join(dir, ...ENTRY.split('/')), '');
  assert.deepEqual(binProblems(dir), []);
  rmSync(dir, { recursive: true });
});

test('a layer this package carries no corpus for is a half no agent can read', () => {
  const dir = corpus({ [`agent/react/${'skill.json'}`]: MANIFEST });
  const problems = corpusProblems(dir);
  assert.equal(problems.length, LAYERS.length - 1);
  assert.match(problems[0] ?? '', /carries no corpus for the angular layer/);
  rmSync(dir, { recursive: true });
});

test('a layer whose payload lacks the vocabulary index reports every class of the language as the adopter\'s own', () => {
  const index = JSON.stringify({ page: 'p', classes: {}, answers: {}, options: {} });
  const both = Object.fromEntries(LAYERS.flatMap((layer) => [
    [`agent/${layer}/skill.json`, MANIFEST], [`agent/${layer}/arena.vocabulary.json`, index],
  ]));
  const whole = corpus(both);
  assert.deepEqual(vocabularyProblems(whole), []);
  rmSync(whole, { recursive: true });

  delete both['agent/angular/arena.vocabulary.json'];
  const dir = corpus(both);
  const problems = vocabularyProblems(dir);
  assert.equal(problems.length, 1, 'one layer lacks it');
  assert.match(problems[0] ?? '', /no vocabulary index for the angular layer/);
  rmSync(dir, { recursive: true });
});

test('a repository path surviving the rewrite is a dead route, and it is reported as one', () => {
  const dir = corpus({
    'agent/react/skill.json': MANIFEST,
    'agent/react/skills/design/ROUTER.md': 'read `frameworks/react/INDEX.md` first\n',
    'agent/angular/skill.json': MANIFEST,
  });
  const problems = corpusProblems(dir);
  assert.ok(problems.some((one) => /still names the repository path/.test(one)),
    'a surviving repository path is the failure this gate exists for');
  rmSync(dir, { recursive: true });
});

test('a target inside the corpus is judged by whether it is there', () => {
  const dir = corpus({
    'agent/react/skill.json': MANIFEST,
    'agent/react/skills/design/ROUTER.md': 'x',
    'agent/react/skills/design/references/page.md': 'y',
  });
  const payload = join(dir, 'agent', 'react');
  assert.equal(unresolvedTarget('./references/page.md', 'skills/design/ROUTER.md', payload, new Set()), null);
  assert.match(unresolvedTarget('./references/gone.md', 'skills/design/ROUTER.md', payload, new Set()) ?? '',
    /resolves to nothing a consumer installs/);
  rmSync(dir, { recursive: true });
});

test('a page named on the domain is judged against what the site actually publishes', () => {
  const served = new Set(['skills/design/references/page.md']);
  const payload = join(root, 'nowhere');
  assert.equal(unresolvedTarget(`${SITE_BASE}skills/design/references/page.md`, 'skills/design/ROUTER.md', payload, served), null);
  assert.match(unresolvedTarget(`${SITE_BASE}nowhere/at/all.md`, 'skills/design/ROUTER.md', payload, served) ?? '',
    /the site publishes nothing there/);
});

test('a page the site build writes is published although no file in the tree carries it', () => {
  const payload = join(root, 'nowhere');
  const from = 'skills/design/ROUTER.md';
  for (const page of ['llms.txt', 'llms-react.txt', 'llms-angular.txt']) {
    assert.equal(unresolvedTarget(`${SITE_BASE}${page}`, from, payload, new Set()), null);
  }
  assert.match(unresolvedTarget(`${SITE_BASE}llms-nowhere.txt`, from, payload, new Set()) ?? '',
    /the site publishes nothing there/);
});

test('a link, a relative inline path and an absolute one are all targets; prose is not', () => {
  const found = targetsIn('see [a](./b.md) and `../c.md` and `https://d/e` but not `a word`');
  assert.deepEqual(found, ['./b.md', '../c.md', 'https://d/e']);
});

test('the catalogue claim is measured against what the tree declares, and it names the package', () => {
  assert.deepEqual(catalogueProblems(assembly), []);
  assert.equal(NAME, '@dravensoft/arena-mcp');
});

const PLUGIN = (version: string, repository = 'https://github.com/dravensoft-dev/arena') =>
  `${JSON.stringify({
    name: 'arena', version, license: 'MIT', homepage: 'https://arena.dravensoft.org',
    repository, author: { name: 'Dravensoft' },
  }, null, 2)}\n`;

const SERVER = (over: Record<string, unknown> = {}) => `${JSON.stringify({
  $schema: REGISTRY_SCHEMA,
  name: REGISTRY_NAME,
  description: 'Arena by Dravensoft over MCP: the router, the references and every component document.',
  version: '11.0.0',
  repository: { url: 'https://github.com/dravensoft-dev/arena', source: 'github' },
  websiteUrl: 'https://arena.dravensoft.org',
  packages: [{
    registryType: 'npm', identifier: NAME, version: '11.0.0', transport: { type: 'stdio' },
  }],
  ...over,
}, null, 2)}\n`;

const TREE = (server: string, version = '11.0.0', repository?: string) => corpus({
  'server.json': server,
  '.claude-plugin/plugin.json': PLUGIN(version, repository),
});

test('this tree states one server name and one version in both files that carry them', () => {
  assert.deepEqual(registryProblems(), []);
});

test('the manifest stamps the name the registry reads out of the published package', () => {
  assert.equal(manifest().mcpName, REGISTRY_NAME);
});

test('no server.json at all is a package that publishes to npm and appears in no index', () => {
  const dir = corpus({ '.claude-plugin/plugin.json': PLUGIN('11.0.0') });
  assert.match(registryProblems(dir)[0] ?? '', /server\.json is not there/);
  rmSync(dir, { recursive: true });
});

test('a version that moved in plugin.json and not in server.json names both members', () => {
  const dir = TREE(SERVER(), '11.0.1');
  const problems = registryProblems(dir);
  assert.equal(problems.length, 2);
  assert.ok(problems.some((one) => /server\.json states version 11\.0\.0/.test(one)));
  assert.ok(problems.some((one) => /packages\[0\]\.version 11\.0\.0/.test(one)));
  rmSync(dir, { recursive: true });
});

test('an entry pointing at another package is one the registry proves against the wrong tarball', () => {
  const dir = TREE(SERVER({
    packages: [{
      registryType: 'npm', identifier: '@dravensoft/arena-react', version: '11.0.0',
      transport: { type: 'stdio' },
    }],
  }));
  assert.match(registryProblems(dir).find((one) => /npm package/.test(one)) ?? '',
    /@dravensoft\/arena-react/);
  rmSync(dir, { recursive: true });
});

test('a description over the ceiling fails here rather than in a rejection message', () => {
  const dir = TREE(SERVER({ description: 'x'.repeat(REGISTRY_DESCRIPTION_LIMIT + 1) }));
  assert.match(registryProblems(dir).find((one) => /description/.test(one)) ?? '',
    /101 characters against the 100/);
  rmSync(dir, { recursive: true });
});

test('a name the manifest does not stamp is an entry the registry refuses to prove', () => {
  const dir = TREE(SERVER({ name: 'io.github.dravensoft-dev/arena-mcp' }));
  const problems = registryProblems(dir);
  assert.ok(problems.some((one) => /mcpName/.test(one)),
    'the two files disagreeing about the name is the failure no other gate here would catch');
  rmSync(dir, { recursive: true });
});

test('the namespace is the repository owner, which is the whole of what GitHub OIDC proves', () => {
  const dir = TREE(SERVER(), '11.0.0', 'https://github.com/someone-else/arena');
  assert.match(registryProblems(dir).find((one) => /namespace/.test(one)) ?? '', /someone-else/);
  rmSync(dir, { recursive: true });
});

test('a schema that is not the one this tree is written against is refused by the publisher', () => {
  const dir = TREE(SERVER({ $schema: 'https://static.modelcontextprotocol.io/schemas/2025-07-09/server.schema.json' }));
  assert.ok(registryProblems(dir).some((one) => /declares the schema/.test(one)));
  rmSync(dir, { recursive: true });
});


test('a specifier that escapes the flat bin is reported, since bin/ has no directory above it', () => {
  const dir = track(mkdtempSync(join(tmpdir(), 'arena-mcp-flat-')));
  try {
    mkdirSync(join(dir, 'bin'), { recursive: true });
    writeFileSync(join(dir, 'bin', 'clean.mjs'), "import { x } from './audit.mjs';\n");
    assert.deepEqual(flatProblems(dir), []);

    writeFileSync(join(dir, 'bin', 'escaping.mjs'), "import { x } from '../arena-cli/audit.mjs';\n");
    const problems = flatProblems(dir);
    assert.equal(problems.length, 1);
    assert.match(problems[0] ?? '', /escaping\.mjs/);
    assert.match(problems[0] ?? '', /bin\/ is flat/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the pattern reads a specifier and not a path that happens to sit in a string', () => {
  const of = (text: string) => [...text.matchAll(ESCAPING_SPECIFIER)].map((one) => one[1]);
  assert.deepEqual(of("import { a } from '../b/c.mjs';"), ['../b/c.mjs']);
  assert.deepEqual(of("import { a } from './c.mjs';"), []);
  assert.deepEqual(of("const note = '../b/c.mjs';"), []);
});

test('a default plugin or a catalogue entry missing from the assembled corpus is reported', () => {
  const store = {
    'plugin-style-store/default/plugin.tokens.json': '{}',
    'plugin-style-store/catalogue/INDEX.md': '# i\n',
    'plugin-style-store/catalogue/booking/ENTRY.md': '# b\n',
    'plugin-style-store/catalogue/booking/plugin.css': '.x{}',
  };
  const base = corpus(store);
  const bundle = (files: Record<string, string>) => corpus(Object.fromEntries(LAYERS.flatMap((layer) => [
    [`agent/${layer}/skill.json`, MANIFEST.replace('react', layer)],
    [`agent/${layer}/skills/design/ROUTER.md`, '# r\n'],
    [`agent/${layer}/support.json`, '{}'],
    [`agent/${layer}/frameworks/${layer}/components/a/ArenaA.prompt.md`, 'a\n'],
    ...Object.entries(files).map(([rel, body]) => [`agent/${layer}/${rel}`, body]),
  ])));
  const whole = bundle(store);
  const without = bundle(store);
  const noManifest = corpus(Object.fromEntries(LAYERS.map((layer) => [`agent/${layer}/support.json`, '{}'])));
  const noEntry = bundle(Object.fromEntries(Object.entries(store)
    .filter(([rel]) => !rel.includes('booking/plugin.css'))));
  try {
    assert.deepEqual(styleStoreProblems(whole, base), []);
    assert.match(styleStoreProblems(noEntry, base).join('\n'), /style\/catalogue\/booking\/plugin\.css/);
    rmSync(join(without, 'agent', 'react', 'plugin-style-store', 'default'), { recursive: true });
    assert.match(styleStoreProblems(without, base).join('\n'), /style\/default\/plugin\.tokens\.json/);
    assert.match(styleStoreProblems(corpus({}), base).join('\n'), /layer has no corpus, so the style store/);
    assert.match(styleStoreProblems(noManifest, base).join('\n'), /layer has no corpus, so the style store/);
  } finally {
    for (const dir of [base, whole, without, noEntry, noManifest]) rmSync(dir, { recursive: true, force: true });
  }
});

test('an identity page the corpus is specified to carry and the catalogue does not serve is reported', () => {
  const pages = {
    'arena-from-scratch/identity.html': '<!doctype html>',
    'arena-from-scratch/identity.example.html': '<!doctype html>',
  };
  const base = corpus(pages);
  const bundle = (files: Record<string, string>) => corpus(Object.fromEntries(LAYERS.flatMap((layer) => [
    [`agent/${layer}/skill.json`, MANIFEST.replace('react', layer)],
    [`agent/${layer}/skills/design/ROUTER.md`, '# r\n'],
    [`agent/${layer}/support.json`, '{}'],
    [`agent/${layer}/frameworks/${layer}/components/a/ArenaA.prompt.md`, 'a\n'],
    ...Object.entries(files).map(([rel, body]) => [`agent/${layer}/${rel}`, body]),
  ])));
  const whole = bundle(pages);
  const lacking = bundle({ 'arena-from-scratch/identity.html': '<!doctype html>' });
  const bare = corpus({ 'README.md': 'x' });
  const onePage = corpus({ 'arena-from-scratch/identity.html': '<!doctype html>' });
  try {
    assert.deepEqual(identityProblems(whole, base), []);
    assert.match(identityProblems(lacking, base).join('\n'), /identity\/identity\.example\.html/);
    assert.match(identityProblems(whole, bare).join('\n'), /carries neither/);
    assert.match(identityProblems(corpus({}), base).join('\n'), /layer has no corpus, so the identity template/);
    assert.match(identityProblems(whole, onePage).join('\n'), /carries only some/);
    assert.match(identityProblems(whole, onePage).join('\n'), /identity\.example\.html and carries only some/);
  } finally {
    for (const dir of [base, whole, lacking, bare, onePage]) rmSync(dir, { recursive: true, force: true });
  }
});

test('the identity directory the payload list names is the one the served catalogue reads', () => {
  assert.equal(PAYLOAD_IDENTITY_DIR, IDENTITY_DIR);
});
