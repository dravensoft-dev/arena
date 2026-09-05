import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  collect, dependencyProblems, importedPackages, binProblems, corpusProblems, catalogueProblems,
  unresolvedTarget, targetsIn, registryProblems, SITE_BASE, REGISTRY_SCHEMA,
  REGISTRY_DESCRIPTION_LIMIT,
} from './check-mcp.ts';
import {
  RUNTIME_DEPENDENCIES, ENTRY, NAME, LAYERS, DIST, REGISTRY_NAME, manifest,
} from '../../build/arena/build-mcp-package.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

const MANIFEST = JSON.stringify({
  name: 'arena', description: 'd', homepage: 'h', version: '0.0.0',
  package: NAME, layer: 'react', router: 'skills/design/ROUTER.md',
});

function corpus(files: Record<string, string>) {
  const dir = mkdtempSync(join(tmpdir(), 'arena-mcp-pkg-'));
  for (const [path, body] of Object.entries(files)) {
    const full = join(dir, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return dir;
}

test('the tree passes its own claims', () => {
  const { problems } = collect();
  assert.deepEqual(problems, []);
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
  const dir = mkdtempSync(join(tmpdir(), 'arena-mcp-pkg-'));
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

test('a link, a relative inline path and an absolute one are all targets; prose is not', () => {
  const found = targetsIn('see [a](./b.md) and `../c.md` and `https://d/e` but not `a word`');
  assert.deepEqual(found, ['./b.md', '../c.md', 'https://d/e']);
});

test('the catalogue claim is measured against what the tree declares, and it names the package', () => {
  assert.deepEqual(catalogueProblems(join(root, ...DIST.split('/'))), []);
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
