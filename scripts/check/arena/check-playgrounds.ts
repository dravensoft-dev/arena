/* Asserts the playground fixtures against the API contracts they seed. There is no
 * exception map: a fixture supplies what a contract cannot invent, so a value it gets
 * wrong renders a page that lies while every other gate stays green. Type-checking a
 * seed is the whole point -- a component drawn from a bad seed still draws. The citation
 * check left here is the half only this gate can make: whether a cited page is one a contract
 * EMITS, and whether a bare filename names anything; a path that merely has to exist is
 * check:citations'. The smoke phase needs a browser, because a page that mounts nothing is
 * invisible to every portable check here: emitted source is what they compare, and one that compiles
 * can still throw on the first render. A page is probed once it is drawn plus a grace window,
 * never on a blind sleep, and a page that never draws still waits the whole deadline. */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { mapWithConcurrency } from '../../utils/concurrency.ts';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { readJson } from '../../utils/read-file.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { LAYERS } from '../../lib/arena/layers.ts';
import { startStaticServer } from '../../lib/arena/static-server.ts';
import { browserOrExit, launchChromium } from '../../lib/arena/chromium.ts';
import { connect } from '../../lib/arena/cdp.ts';
import { cannotRun } from '../../lib/arena/arena-scripts-vars.ts';
import { playgroundModel, SUBJECT } from '../../lib/arena/playground-model.ts';
import { buildPlaygrounds } from '../../generate/arena/generate-playgrounds.ts';
import { memberEntries, fieldEntries } from '../../lib/arena/contract-shapes.ts';
import type { ComponentContract, MemberSpec, TypeContract } from '../../lib/arena/contract-shapes.ts';
import type { Fixture, FixtureChild } from '../../lib/arena/playground-model.ts';
import { captured } from '../../utils/captures.ts';

export const node = {
  name: 'check:playgrounds',
  reads: [
    'contracts/api', 'frameworks/demos/**', 'frameworks/Components.json',
    'frameworks/react/components/**', 'frameworks/angular/components/**',
    'frameworks/tailwind/components/**', 'frameworks/tailwind/consume/**',
    'frameworks/angular/build/demo/**',
  ],
  writes: [],
  feeds: [],
};


type Contracts = Map<string, ComponentContract>;
type Types = Map<string, TypeContract>;

export const FIXTURE_DIR = 'frameworks/demos';
export const FIXTURE_SUFFIX = '.demo.json';

const SEEDABLE = new Set(['primitive', 'enum', 'object', 'array', 'functionInput']);

export function loadJson(path: string) {
  return readJson(path);
}

export function loadTypes(base = root): Types {
  const dir = join(base, 'contracts/api/types');
  const out: Types = new Map();
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.json')) continue;
    const type = loadJson(join(dir, file));
    out.set(type.name, type);
  }
  return out;
}

export function loadContracts(base = root): Contracts {
  const dir = join(base, 'contracts/api/components');
  const out: Contracts = new Map();
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.json')) continue;
    out.set(file.replace(/\.json$/, ''), loadJson(join(dir, file)));
  }
  return out;
}

export function loadFixtures(base = root) {
  const dir = join(base, FIXTURE_DIR);
  const out = new Map();
  if (!existsSync(dir)) return out;
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(FIXTURE_SUFFIX)) continue;
    out.set(file.slice(0, -FIXTURE_SUFFIX.length), loadJson(join(dir, file)));
  }
  return out;
}

export function coverageProblems(contracts: Contracts, fixtures: Map<string, Fixture>) {
  const problems: string[] = [];
  if (contracts.size === 0)
    problems.push('found 0 contracts in contracts/api/components — an empty result set is a failure, not a clean pass; check the discovery path');
  if (fixtures.size === 0)
    problems.push(`found 0 fixtures in ${FIXTURE_DIR} — an empty result set is a failure, not a clean pass; check the discovery path`);
  for (const name of contracts.keys())
    if (!fixtures.has(name)) problems.push(`${name}: contracted but ${FIXTURE_DIR}/${name}${FIXTURE_SUFFIX} does not exist, so it can have no playground`);
  for (const name of fixtures.keys())
    if (!contracts.has(name)) problems.push(`${name}${FIXTURE_SUFFIX}: no contract named ${name}, so the fixture seeds nothing`);
  return problems;
}

export function valueProblems(where: string, spec: MemberSpec, value: unknown, types: Types): string[] {
  const kind = spec.form;
  if (kind === 'primitive') {
    return typeof value === spec.type ? [] : [`${where}: declares ${spec.type} and the fixture holds ${typeof value}`];
  }
  if (kind === 'enum') {
    const values: (string | number)[] = (spec.type === undefined ? undefined : types.get(spec.type)?.values) ?? [];
    return values.includes(value as string | number) ? [] : [`${where}: ${JSON.stringify(value)} is not one of ${spec.type}'s ${JSON.stringify(values)}`];
  }
  if (kind === 'array') {
    if (!Array.isArray(value)) return [`${where}: declares an array and the fixture holds ${typeof value}`];
    if (spec.of === 'string' || spec.of === 'number') {
      return value.flatMap((item, i) => (typeof item === spec.of ? [] : [`${where}[${i}]: declares ${spec.of} and the fixture holds ${typeof item}`]));
    }
    return value.flatMap((item, i) => objectProblems(`${where}[${i}]`, spec.of, item, types));
  }
  if (kind === 'object') return objectProblems(where, spec.type, value, types);
  if (kind === 'functionInput') {
    return typeof value === 'string' ? [] : [`${where}: a functionInput is chosen by name and the fixture holds ${typeof value}`];
  }
  return [`${where}: form ${kind} takes no seed`];
}

export function objectProblems(where: string, typeName: string | undefined, value: unknown, types: Types): string[] {
  const type = typeName === undefined ? undefined : types.get(typeName);
  if (!type) return [`${where}: no type named ${typeName} is declared in contracts/api/types`];
  if (value === null || typeof value !== 'object' || Array.isArray(value))
    return [`${where}: declares ${typeName} and the fixture holds ${Array.isArray(value) ? 'an array' : typeof value}`];
  const fields = type.fields ?? {};
  const problems = [];
  for (const [key, held] of Object.entries(value)) {
    if (!(key in fields)) { problems.push(`${where}.${key}: ${typeName} declares no such field`); continue; }
    const field = fields[key];
    if (field) problems.push(...valueProblems(`${where}.${key}`, field, held, types));
  }
  for (const [key, field] of fieldEntries(fields))
    if (field.required && !(key in value)) problems.push(`${where}: ${typeName}.${key} is required and the fixture omits it`);
  return problems;
}

export function seedProblems(name: string, contract: ComponentContract,
  fixture: Pick<Fixture, 'seed'>, types: Types) {
  const api = contract.api ?? {};
  const seed = fixture.seed ?? {};
  const problems = [];
  for (const [member, value] of Object.entries(seed)) {
    const spec = api[member];
    if (!spec) { problems.push(`${name}.seed.${member}: the contract declares no such member`); continue; }
    if (!SEEDABLE.has(spec.form)) { problems.push(`${name}.seed.${member}: form ${spec.form} is not seeded here`); continue; }
    problems.push(...valueProblems(`${name}.seed.${member}`, spec, value, types));
  }
  for (const [member, spec] of memberEntries(api)) {
    if (spec.form === 'slot' || spec.form === 'event') continue;
    if (spec.required && !('default' in spec) && !(member in seed))
      problems.push(`${name}.seed: ${member} is required and carries no default, so the fixture has to seed it`);
  }
  return problems;
}

export function nodeProblems(where: string, node: FixtureChild, contracts: Contracts, types: Types,
  { allowSubject }: { allowSubject?: boolean }): string[] {
  if (node === SUBJECT) {
    return allowSubject ? [] : [`${where}: "${SUBJECT}" marks where the component under test goes and belongs in a host, nowhere else`];
  }
  if (node === null || typeof node !== 'object' || Array.isArray(node))
    return [`${where}: a node is "${SUBJECT}", a text node or a component node, and this is ${Array.isArray(node) ? 'an array' : typeof node}`];

  if (typeof node.text === 'string') {
    const unknown = Object.keys(node).filter((k) => !['text', 'element', 'attrs'].includes(k));
    return unknown.map((k) => `${where}: a text node carries text, element and attrs, never ${k}`);
  }
  if (typeof node.element === 'string') {
    const unknown = Object.keys(node).filter((k) => !['element', 'attrs', 'text'].includes(k));
    return unknown.map((k) => `${where}: an element node carries element, attrs and text, never ${k}`);
  }
  if (typeof node.component !== 'string')
    return [`${where}: a node names neither text, element nor component`];

  const contract = contracts.get(node.component);
  if (!contract) return [`${where}: no component named ${node.component} is contracted`];
  const api = contract.api ?? {};
  const problems = [];
  for (const [member, value] of Object.entries(node.members ?? {})) {
    const spec = api[member];
    if (!spec) { problems.push(`${where}.${member}: ${node.component} declares no such member`); continue; }
    if (!SEEDABLE.has(spec.form)) { problems.push(`${where}.${member}: form ${spec.form} takes no literal here`); continue; }
    problems.push(...valueProblems(`${where}.${member}`, spec, value, types));
  }
  for (const [member, spec] of memberEntries(api)) {
    if (spec.required && spec.form !== 'slot' && !('default' in spec) && !(member in (node.members ?? {})))
      problems.push(`${where}: ${node.component}.${member} is required and this node omits it`);
  }
  for (const [slot, list] of Object.entries(node.slots ?? {})) {
    if (api[slot]?.form !== 'slot') { problems.push(`${where}.slots.${slot}: ${node.component} declares no such slot`); continue; }
    problems.push(...listProblems(`${where}.slots.${slot}`, list, contracts, types, { allowSubject }));
  }
  return problems;
}

export function listProblems(where: string, list: FixtureChild[], contracts: Contracts, types: Types,
  options: { allowSubject?: boolean }): string[] {
  if (!Array.isArray(list)) return [`${where}: a slot holds a list of nodes and this is ${typeof list}`];
  return list.flatMap((node, i) => nodeProblems(`${where}[${i}]`, node, contracts, types, options));
}

export function slotProblems(name: string, contract: ComponentContract,
  fixture: Pick<Fixture, 'slots'>, contracts: Contracts, types: Types) {
  const api = contract.api ?? {};
  const problems = [];
  for (const [slot, list] of Object.entries(fixture.slots ?? {})) {
    if (api[slot]?.form !== 'slot') { problems.push(`${name}.slots.${slot}: the contract declares no such slot`); continue; }
    problems.push(...listProblems(`${name}.slots.${slot}`, list, contracts, types, { allowSubject: false }));
  }
  for (const [member, spec] of memberEntries(api))
    if (spec.form === 'slot' && spec.required && !(member in (fixture.slots ?? {})))
      problems.push(`${name}.slots: ${member} is a required slot, so the fixture has to fill it`);
  return problems;
}

export function knobTarget(contract: Pick<ComponentContract, 'api'>, target: string): {
  spec?: MemberSpec | null; problem?: string; member?: string; field?: string; objectType?: string;
} {
  const [member = '', field] = String(target).split('.');
  const spec = contract.api?.[member];
  if (!spec) return { problem: `names ${member}, which the contract does not declare` };
  if (field === undefined) return { spec };
  if (spec.form !== 'object') return { problem: `names ${member}.${field}, but ${member} is not an object` };
  return { spec: null, member, field, objectType: spec.type };
}

export function bindProblems(name: string, contract: Pick<ComponentContract, 'api'>,
  fixture: Pick<Fixture, 'bind'>, types: Types) {
  const api = contract.api ?? {};
  const problems = [];
  for (const [event, target] of Object.entries(fixture.bind ?? {})) {
    const spec = api[event];
    if (!spec || spec.form !== 'event') { problems.push(`${name}.bind.${event}: the contract declares no event called ${event}`); continue; }

    if (typeof target === 'string') {
      if (!spec.payload) { problems.push(`${name}.bind.${event}: ${event} carries no payload, so it has nothing to write into ${target}`); continue; }
      const found = knobTarget(contract, target);
      if (found.problem) { problems.push(`${name}.bind.${event}: ${found.problem}`); continue; }
      const wanted = found.spec
        ?? (found.objectType && found.field
          ? (types.get(found.objectType)?.fields ?? {})[found.field]
          : undefined);
      if (!wanted) { problems.push(`${name}.bind.${event}: ${found.objectType} declares no field called ${found.field}`); continue; }
      const carries = wanted.form === 'primitive' || wanted.form === 'enum' ? wanted.type : wanted.type ?? wanted.of;
      if (carries !== spec.payload)
        problems.push(`${name}.bind.${event}: the event carries ${spec.payload} and ${target} holds ${carries}`);
      continue;
    }

    if (target === null || typeof target !== 'object' || Array.isArray(target)) {
      problems.push(`${name}.bind.${event}: a target is a member name or a patch object, and this is ${typeof target}`);
      continue;
    }
    for (const [member, value] of Object.entries(target)) {
      const knob = api[member];
      if (!knob) { problems.push(`${name}.bind.${event}: patches ${member}, which the contract does not declare`); continue; }
      if (value !== null && typeof value === 'object' && '$delta' in value) {
        if (knob.form !== 'primitive' || knob.type !== 'number')
          problems.push(`${name}.bind.${event}: $delta steps a number and ${member} is ${knob.form}<${knob.type ?? ''}>`);
        else if (typeof value.$delta !== 'number')
          problems.push(`${name}.bind.${event}: $delta holds a number and this holds ${typeof value.$delta}`);
        continue;
      }
      problems.push(...valueProblems(`${name}.bind.${event}.${member}`, knob, value, types));
    }
  }
  return problems;
}

export function hostProblems(name: string, fixture: Pick<Fixture, 'host'> & { component?: string },
  contracts: Contracts, types: Types) {
  if (!('host' in fixture) || fixture.host === null || fixture.host === undefined) return [];
  return nodeProblems(`${name}.host`, fixture.host, contracts, types, { allowSubject: true });
}

export function shapeProblems(name: string, fixture: Fixture & Record<string, unknown>) {
  const problems: string[] = [];
  if (fixture.component !== name)
    problems.push(`${name}${FIXTURE_SUFFIX}: declares component "${fixture.component}", and the file name says ${name}`);
  const known = ['component', 'seed', 'slots', 'bind', 'host', 'note'];
  for (const key of Object.keys(fixture))
    if (!known.includes(key)) problems.push(`${name}${FIXTURE_SUFFIX}: carries ${key}, and a fixture holds ${known.join(', ')}`);
  return problems;
}

export function fixtureProblems(name: string, contract: ComponentContract, fixture: Fixture,
  contracts: Contracts, types: Types) {
  const problems = [
    ...shapeProblems(name, fixture),
    ...seedProblems(name, contract, fixture, types),
    ...slotProblems(name, contract, fixture, contracts, types),
    ...bindProblems(name, contract, fixture, types),
    ...hostProblems(name, fixture, contracts, types),
  ];
  if (problems.length > 0) return problems;
  try {
    playgroundModel(contract, fixture, types);
  } catch (err) {
    return [`${name}: ${(err as Error).message}`];
  }
  return [];
}

export function emissionProblems(base = root, files = buildPlaygrounds(base).files) {
  const problems = [];
  if (files.size === 0) {
    problems.push('generate-playgrounds emitted 0 files, and an empty emit is a failure rather than a clean pass');
  }
  for (const [rel, expected] of files) {
    const path = join(base, rel);
    if (!existsSync(path)) {
      problems.push(`${rel}: missing — run bun run generate:playgrounds`);
      continue;
    }
    if (readFileSync(path, 'utf8') !== expected) {
      problems.push(`${rel}: stale — run bun run generate:playgrounds`);
    }
  }
  const codecs = [...files].filter(([rel]) => rel.endsWith('PlaygroundCodec.generated.ts')).map(([, body]) => body);
  if (new Set(codecs).size > 1) {
    problems.push(
      'the emitted copies of the codec are not byte-identical, so the same URL can resolve to two different views',
    );
  }
  problems.push(...modelParityProblems(files));
  return problems;
}

export function modelLiteral(source: string) {
  const open = source.indexOf('const MODEL: KnobModel = ');
  if (open === -1) return null;
  const start = source.indexOf('{', open);
  return source.slice(start, source.lastIndexOf('\n};', start === -1 ? 0 : source.length) + 2);
}

export function modelParityProblems(files: Map<string, string>) {
  const byComponent = new Map<string, [string, string | null][]>();
  for (const [rel, body] of files) {
    const match = /\/(\w+)\.demo\.entry\.generated\.tsx?$/.exec(rel);
    if (!match) continue;
    const found = byComponent.get(captured(match)) ?? [];
    found.push([rel, modelLiteral(body)]);
    byComponent.set(captured(match), found);
  }
  const problems = [];
  for (const [component, entries] of byComponent) {
    if (entries.some(([, literal]) => literal === null)) {
      problems.push(`${component}: an entry carries no MODEL literal, so nothing holds the two layers to one model`);
      continue;
    }
    if (new Set(entries.map(([, literal]) => literal)).size > 1) {
      problems.push(`${component}: the layers' MODEL literals differ, so the two pages are not the same page`);
    }
  }
  return problems;
}

const CITING_TREES = LAYERS.map((layer) => join('frameworks', layer));
const PATH_LIKE = /frameworks\/[A-Za-z0-9._-]+(?:\/[A-Za-z0-9._-]+)+/g;
const PAGE_LIKE = /\b[A-Za-z][A-Za-z0-9]*\.(?:card|demo)(?:\.generated)?\.(?:html|json|entry\.tsx|entry\.ts)\b/g;

const CITING_SKIP = new Set(['node_modules', 'dist', 'build', 'vendor']);

const scanned = (dir: string) =>
  (existsSync(dir) ? walkFiles(dir, { skip: (name) => CITING_SKIP.has(name) }) : []);

export function basenameIndex(base = root) {
  return new Set(scanned(join(base, 'frameworks')).map((path) => basename(path)));
}

export function citingFiles(base = root): string[] {
  return CITING_TREES.flatMap((tree) => scanned(join(base, tree)))
    .filter((path) => path.endsWith('.prompt.md') || basename(path) === 'AGENTS.md');
}

export function citationProblems(
  base = root,
  files: Iterable<any> = citingFiles(base),
  names = basenameIndex(base),
  emitted = pagePaths(base),
) {
  const problems = [];
  const pages = new Set(emitted);
  const pageNames = new Set(emitted.map((rel) => rel.slice(rel.lastIndexOf('/') + 1)));
  for (const path of files) {
    const rel = path.slice(base.length + 1);
    for (const [line, text] of readFileSync(path, 'utf8').split('\n').entries()) {
      for (const cited of text.match(PATH_LIKE) ?? []) {
        const cleaned = cited.replace(/[.,;:)]+$/, '');
        if (!cleaned.endsWith('.demo.generated.html')) continue;
        if (pages.has(cleaned)) continue;
        problems.push(`${rel}:${line + 1}: cites ${cleaned}, and no contract emits that page`);
      }
      for (const cited of text.match(PAGE_LIKE) ?? []) {
        if (pageNames.has(cited) || names.has(cited)) continue;
        if (cited.includes('.generated.')) {
          problems.push(`${rel}:${line + 1}: names ${cited}, and no contract emits a page called that`);
          continue;
        }
        problems.push(`${rel}:${line + 1}: names ${cited}, and no file under frameworks/ is called that`);
      }
    }
  }
  return problems;
}

export const SMOKE_CONCURRENCY = 8;
export const SMOKE_READY_MS = 10_000;
export const SMOKE_GRACE_MS = 250;
export const SMOKE_POLL_MS = 25;
export const NAVIGATE_TIMEOUT_MS = 30_000;

export function pagePaths(base = root, files = buildPlaygrounds(base).files) {
  return [...files.keys()].filter((rel) => rel.endsWith('.demo.generated.html')).sort();
}

export function smokeProblems(page: string, seen: {
  mounted?: boolean; knobs?: number; staged?: boolean;
  undefinedClasses?: string[]; errors: string[];
}) {
  const problems: string[] = [];
  if (!seen.mounted) {
    problems.push(`${page}: mounted nothing — run bun run build first, since a page loads a generated sibling`);
    return problems;
  }
  if (seen.knobs === 0) problems.push(`${page}: drew no knob row, so the panel never read its model`);
  if (!seen.staged) problems.push(`${page}: drew an empty stage, so the component under test rendered nothing`);
  for (const name of seen.undefinedClasses ?? []) {
    problems.push(`${page}: renders .${name} and links no stylesheet defining it, so that part draws `
      + 'unstyled with nothing in the console. The page links a sheet per surface it draws, and a '
      + 'surface a component composes internally is one of them');
  }
  for (const error of seen.errors) problems.push(`${page}: ${error}`);
  return problems;
}

const DRAWN = `(() => {
  const stage = document.querySelector('.pg-stage');
  return {
    mounted: Boolean(document.querySelector('.pg-title')),
    knobs: document.querySelectorAll('.pg-knob-name').length,
    staged: ((stage?.textContent ?? '').trim().length > 0) || (stage?.children.length ?? 0) > 0,
  };
})()`;

const UNDEFINED_CLASSES = `(() => {
  const rendered = new Set();
  for (const el of document.querySelectorAll('*'))
    for (const c of el.classList) if (/^arena-[a-z0-9-]+__/.test(c)) rendered.add(c);
  const defined = new Set();
  const walk = (sheet) => { try { for (const rule of sheet.cssRules) {
    if (rule.styleSheet) { walk(rule.styleSheet); continue; }
    for (const m of (rule.cssText ?? '').matchAll(/\\.(arena-[a-z0-9_-]+__[a-z0-9_-]+)/g)) defined.add(m[1]);
  } } catch { void 0; } };
  for (const sheet of document.styleSheets) walk(sheet);
  return [...rendered].filter((c) => !defined.has(c)).sort();
})()`;

const PROBE = `(() => ({ ...${DRAWN}, undefinedClasses: ${UNDEFINED_CLASSES}, errors: window.__arenaErrors ?? [] }))()`;

export const READY = `new Promise((resolve) => {
  const deadline = Date.now() + ${SMOKE_READY_MS};
  const tick = () => {
    const drawn = ${DRAWN};
    if (drawn.mounted && drawn.staged && drawn.knobs > 0) { setTimeout(resolve, ${SMOKE_GRACE_MS}); return; }
    if (Date.now() >= deadline) { resolve(); return; }
    setTimeout(tick, ${SMOKE_POLL_MS});
  };
  tick();
})`;

const WATCH = "window.__arenaErrors=[];"
  + "addEventListener('error',(e)=>window.__arenaErrors.push('threw: '+String(e.message)));"
  + "addEventListener('unhandledrejection',(e)=>window.__arenaErrors.push('rejected: '+String(e.reason)));"
  + "const ce=console.error;console.error=(...a)=>{"
  + "window.__arenaErrors.push('console.error: '+a.map(String).join(' ').slice(0,200));ce(...a);};";

async function visit(cdp: any, url: string, page: string) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  try {
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    await cdp.send('Page.enable', {}, sessionId);
    await cdp.send('Runtime.enable', {}, sessionId);
    await cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: WATCH }, sessionId);
    await cdp.send('Page.navigate', { url }, sessionId);
    const ev = (expression: string) => cdp.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
    await ev(READY);
    return smokeProblems(page, (await ev(PROBE)).result.value);
  } finally {
    try { await cdp.send('Target.closeTarget', { targetId }); } catch { void 0; }
  }
}

async function smoke(pages: string[], exe: string) {
  const server = await startStaticServer(root);
  const chrome = await launchChromium(exe);
  const cdp = await connect(chrome.wsUrl);
  const problems: string[] = [];
  try {
    const perPage = await mapWithConcurrency(pages, SMOKE_CONCURRENCY,
      (page: string) => visit(cdp, `http://127.0.0.1:${server.port}/${page}`, page));
    problems.push(...perPage.flat());
  } finally {
    chrome.kill?.();
    server.close?.();
  }
  return problems.sort();
}

const skip: (reason: string) => never = (reason) => cannotRun('check-playgrounds', reason);

async function main() {
  const contracts = loadContracts();
  const fixtures = loadFixtures();
  const types = loadTypes();

  const problems = coverageProblems(contracts, fixtures);
  if (problems.length === 0) {
    for (const [name, contract] of contracts)
      problems.push(...fixtureProblems(name, contract, fixtures.get(name), contracts, types));
  }
  problems.push(...emissionProblems());
  problems.push(...citationProblems());

  const report = (found: string[]) => {
    console.error(`check-playgrounds: ${found.length} problem(s)\n`);
    for (const one of found) console.error(`  ${one}`);
    process.exit(1);
  };
  if (problems.length > 0) report(problems);

  const pages = pagePaths();
  const exe = browserOrExit('check-playgrounds');
  const smoked = await smoke(pages, exe);
  if (smoked.length > 0) report(smoked);

  console.log(
    `check-playgrounds: ${fixtures.size} fixture(s) seed every contracted member a contract cannot invent, `
    + `${buildPlaygrounds().files.size} emitted file(s) match a fresh run and every page pair carries one model, `
    + `${pages.length} page(s) mount and draw with a clean console, `
    + 'and every page a layer cites is one a contract emits',
  );
}

if (isMainModule(import.meta.url)) await main();
