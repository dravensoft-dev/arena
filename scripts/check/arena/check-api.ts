/* Asserts each API contract against every layer implementing it. There is no
 * exception map, and that is deliberate: a contract forbids divergence, so it has
 * nowhere for a second opinion to live. R2 and R3 are authoring rules no gate
 * asserts, and neither is a fact about source text -- contracts/api/AGENTS.md states why. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { readJson } from '../../utils/read-file.ts';
import { buildApiModules } from '../../generate/arena/generate-api-types.ts';
import { PREFIX } from './check-structure.ts';
import {
  reactSurface, angularSurface, reactImplementation, defaultProblems, normaliseDoc, UnrecognisedShape,
  bindingName,
} from '../../lib/arena/api-surface.ts';
import { pascal } from '../../utils/case.ts';
import { readLayer } from '../../lib/arena/layers.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { MEMBER_FORMS, memberEntries, fieldEntries } from '../../lib/arena/contract-shapes.ts';
import type { ContractCandidate, TypeContract } from '../../lib/arena/contract-shapes.ts';
import type { SurfaceMember } from '../../lib/arena/api-surface.ts';
import { relPosix } from '../../utils/posix-path.ts';

export const node = {
  name: 'check:api',
  reads: [
    'contracts/api', 'frameworks/Components.json',
    'frameworks/react/components/**/*.tsx', 'frameworks/angular/components/**/*.ts',
    'frameworks/react/Api.generated.ts', 'frameworks/angular/Api.generated.ts',
  ],
  writes: [],
  feeds: [],
};


const FORMS: Set<string> = new Set(MEMBER_FORMS);
const PRIMITIVE_TYPES = new Set(['string', 'number', 'boolean']);

const isPrimitive = (name: string | undefined) => name !== undefined && PRIMITIVE_TYPES.has(name);

export function zeroContractProblems({ contracts, types }: { contracts: number; types: number }) {
  const problems = [];
  if (contracts === 0)
    problems.push('found 0 contracts in contracts/api/components — an empty result set is a failure, not a clean pass; check the discovery path');
  if (types === 0)
    problems.push('found 0 types in contracts/api/types — an empty result set is a failure, not a clean pass; check the discovery path');
  return problems;
}

export { bindingName };

export function docProblems(contract: ContractCandidate, docs: Map<string, string>, layer: string) {
  const problems = [];
  const where = `${layer}/${contract.component}`;
  const wanted = new Map();

  for (const [name, spec] of memberEntries(contract.api)) {
    if (!spec.description) continue;

    if (layer === 'angular' && spec.form === 'slot') continue;
    wanted.set(bindingName(name, spec.form, layer), { member: name, text: normaliseDoc(spec.description) });
  }

  for (const [bound, { member, text }] of wanted) {
    const found = docs.get(bound);
    if (found === undefined) {
      problems.push(
        `${where}.${bound}: carries no /** */ doc, so the contract's description for "${member}" never reaches `
        + 'a consumer\'s editor. Run bun run generate:api',
      );
      continue;
    }
    if (found !== text) {
      problems.push(
        `${where}.${bound}: its doc has drifted from the contract's description for "${member}" -- the contract `
        + 'is the authority. Run bun run generate:api',
      );
    }
  }

  for (const bound of docs.keys()) {
    if (wanted.has(bound)) continue;
    problems.push(
      `${where}.${bound}: carries a /** */ doc and is no contracted member. Only a contract-derived doc is `
      + 'allowed here, because only that one is held equal to something',
    );
  }

  return problems;
}

export function validateTypes(types: TypeContract[]) {
  const problems = [];
  const seen = new Set();

  const kindByName = new Map();
  for (const type of types) {
    if (type.name) kindByName.set(type.name, type.kind);
  }
  for (const type of types) {
    if (!type.name) { problems.push('contracts/api/types: a type has no name'); continue; }
    if (!type.name.startsWith(PREFIX)) {
      problems.push(`${type.name}: does not start with ${PREFIX}. Every type reaches a consumer through the `
        + 'package root, where an unprefixed name collides with whatever that project already calls it');
    }
    if (seen.has(type.name)) problems.push(`${type.name}: declared twice`);
    seen.add(type.name);
    if (type.kind === 'enum') {
      if (!Array.isArray(type.values) || !type.values.length) {
        problems.push(`${type.name}: an enum is a closed set and this declares no values`);
      }
      continue;
    }
    if (type.kind !== 'object') { problems.push(`${type.name}: unknown kind "${type.kind}"`); continue; }
    for (const [field, spec] of fieldEntries(type.fields)) {
      if (spec.form === 'primitive') {
        if (!isPrimitive(spec.type)) problems.push(`${type.name}.${field}: "${spec.type}" is not a primitive`);
      } else if (spec.form === 'enum') {

        if (!kindByName.has(spec.type)) {
          problems.push(`${type.name}.${field}: names enum type "${spec.type}", which contracts/api/types/ does not declare`);
        } else if (kindByName.get(spec.type) !== 'enum') {
          problems.push(`${type.name}.${field}: "${spec.type}" is a ${kindByName.get(spec.type)}, used where an enum belongs`);
        }
      } else if (spec.form === 'array') {

        if (!isPrimitive(spec.of)) {
          problems.push(`${type.name}.${field}: a field of a predefined object may be an array of primitives, and "${spec.of}" is not a primitive — R1, an object is pure data with known fields, and an array of objects reopens a nesting depth the reader has no bottom for`);
        }
      } else if (spec.form === 'consumerData') {

        problems.push(`${type.name}.${field}: consumer data may not be a field of a predefined object — R1, an object is pure data with known fields`);
      } else {
        problems.push(`${type.name}.${field}: form "${spec.form}" is not allowed inside a predefined object — R1, an object is pure data`);
      }
    }
  }
  return problems;
}

export function validateContract(contract: ContractCandidate, typeNames: Map<string, string>) {
  const problems: string[] = [];
  const where = contract.component ?? '(unnamed)';
  const note = (problem: string | null) => { if (problem) problems.push(problem); };
  const declared = (name: string | undefined, kind: string) => {
    if (name === undefined || !typeNames.has(name)) return `${where}: names type "${name}", which contracts/api/types/ does not declare`;
    if (typeNames.get(name) !== kind) return `${where}: "${name}" is a ${typeNames.get(name)}, used where a ${kind} belongs`;
    return null;
  };

  const CONSUMER_DATA = 'consumerData';
  const held = [];
  const routes = [];
  for (const [member, spec] of memberEntries(contract.api)) {
    if (!FORMS.has(spec.form)) {
      problems.push(`${where}.${member}: form "${spec.form}" is none of the nine — see contracts/api/AGENTS.md`);
      continue;
    }
    if (spec.form === 'primitive' && !isPrimitive(spec.type)) {
      problems.push(`${where}.${member}: "${spec.type}" is not a primitive`);
    }
    if (spec.form === 'enum') note(declared(spec.type, 'enum'));
    if (spec.form === 'object') note(declared(spec.type, 'object'));
    if (spec.form === 'array' && !isPrimitive(spec.of) && spec.of !== CONSUMER_DATA) {
      note(declared(spec.of, 'object'));
    }

    if (spec.form === 'event' && spec.payload
        && !PRIMITIVE_TYPES.has(spec.payload) && spec.payload !== CONSUMER_DATA) {
      if (typeNames.get(spec.payload) !== 'enum') {
        note(declared(spec.payload, 'object'));
      }
    }

    const paramOf = spec.form === 'functionInput' ? 'functionInput parameter' : 'slot parameter';
    for (const [param, type] of Object.entries(spec.params ?? {})) {
      if (PRIMITIVE_TYPES.has(type) || type === CONSUMER_DATA) continue;
      if (!typeNames.has(type)) problems.push(`${where}.${member}: ${paramOf} "${param}" names undeclared type "${type}"`);
    }

    if (spec.form === 'functionInput') {
      if (contract.kind !== 'input') {
        problems.push(
          `${where}.${member}: a functionInput is legal only in a contract with "kind": "input" — `
          + `the ninth form is for data-entry controls (contracts/api/AGENTS.md)`,
        );
      }
      if (spec.returns === undefined) {
        problems.push(`${where}.${member}: a functionInput declares no "returns" — its signature is modelled, not free TypeScript`);
      } else if (!isPrimitive(spec.returns) && !typeNames.has(spec.returns)) {
        problems.push(`${where}.${member}: functionInput return names undeclared type "${spec.returns}"`);
      }
    }

    if (spec.form === CONSUMER_DATA || (spec.form === 'array' && spec.of === CONSUMER_DATA)) held.push(member);
    if (spec.form === 'slot' && Object.values(spec.params ?? {}).includes(CONSUMER_DATA)) routes.push(member);
    if (spec.form === 'event' && spec.payload === CONSUMER_DATA) routes.push(member);
  }

  if (held.length && !routes.length) {
    for (const member of held) {
      problems.push(
        `${where}.${member}: consumer data with no consumer — Arena may not inspect it, so a contract `
        + `taking it in must also declare a slot parameter or an event payload of "${CONSUMER_DATA}" that hands it back`,
      );
    }
  }
  return problems;
}

export function compareSurface(
  contract: ContractCandidate, members: SurfaceMember[], layer: string, types = new Map(),
) {
  const problems = [];
  const where = `${layer}/${contract.component}`;

  const expected = new Map();
  const collided = new Set();
  for (const [name, spec] of memberEntries(contract.api)) {
    const bound = bindingName(name, spec.form, layer);
    if (expected.has(bound)) {

      problems.push(
        `${where}: contract members "${expected.get(bound).member}" and "${name}" both bind to "${bound}" `
        + `in ${layer} -- rename one; verification of either against the layer is not possible while they collide`,
      );
      collided.add(bound);
      continue;
    }
    expected.set(bound, { member: name, ...spec });
  }

  const seen = new Set();
  const rawSeen = new Set();
  for (const m of members) {

    if (rawSeen.has(m.name)) {
      problems.push(`${where}.${m.name}: declared twice in this layer's own surface -- a slot mentioned in a doc comment as well as the real template is the known case`);
    } else {
      rawSeen.add(m.name);
    }
    if (m.form === 'platform') {
      problems.push(`${where}.${m.name}: "${m.type}" is a platform type and none of the nine forms — R4`);
      continue;
    }
    if (m.form === 'union') {
      problems.push(`${where}.${m.name}: a union between forms (${(m.parts ?? []).join(' | ')}) — R5, a member is one form`);
      continue;
    }
    if (m.platformPayload) {
      problems.push(`${where}.${m.name}: the event payload "${m.payload}" is a platform type — R4`);
      continue;
    }

    if (collided.has(m.name)) { seen.add(m.name); continue; }
    const spec = expected.get(m.name);
    if (!spec) {
      problems.push(`${where}.${m.name}: declared, but the contract does not name it — add it to the contract or remove it from the layer`);
      continue;
    }
    seen.add(m.name);

    if (m.form === 'named') {
      if (spec.form !== 'enum' && spec.form !== 'object') {
        problems.push(`${where}.${m.name}: declared as named type "${m.type}", contract says ${spec.form}`);
        continue;
      }
    } else if (m.form !== spec.form) {
      problems.push(`${where}.${m.name}: declared as ${m.form}, contract says ${spec.form}`);
      continue;
    }

    if (spec.form === 'primitive' || spec.form === 'enum' || spec.form === 'object'
      || spec.form === 'array' || spec.form === 'consumerData' || spec.form === 'functionInput') {
      const contractRequired = Boolean(spec.required);
      const layerRequired = Boolean(m.required);
      if (contractRequired !== layerRequired) {
        problems.push(
          `${where}.${m.name}: contract says ${contractRequired ? 'required' : 'optional'}, `
          + `${layer} declares it ${layerRequired ? 'required' : 'optional'}`,
        );
      }
    }
    if (spec.form === 'array' && m.of !== spec.of) {
      problems.push(`${where}.${m.name}: array of ${m.of}, contract says array of ${spec.of}`);
    }
    if (spec.form === 'event' && (m.payload ?? null) !== (spec.payload ?? null)) {
      problems.push(`${where}.${m.name}: payload ${m.payload ?? 'none'}, contract says ${spec.payload ?? 'none'}`);
    }

    if (spec.form === 'functionInput') {
      const layerParams = m.params ?? {};
      const contractParams = spec.params ?? {};
      const names = new Set([...Object.keys(contractParams), ...Object.keys(layerParams)]);
      for (const param of names) {
        if (!(param in contractParams)) {
          problems.push(`${where}.${m.name}: declares parameter "${param}: ${layerParams[param]}", which the contract's signature does not name`);
        } else if (!(param in layerParams)) {
          problems.push(`${where}.${m.name}: does not declare parameter "${param}" (contract says ${contractParams[param]})`);
        } else if (layerParams[param] !== contractParams[param]) {
          problems.push(`${where}.${m.name}: parameter "${param}" is ${layerParams[param]}, contract says ${contractParams[param]}`);
        }
      }
      if ((m.returns ?? null) !== (spec.returns ?? null)) {
        problems.push(`${where}.${m.name}: returns ${m.returns ?? 'nothing'}, contract says ${spec.returns ?? 'nothing'}`);
      }
    }
    if ((spec.form === 'enum' || spec.form === 'object') && m.type && m.type !== spec.type) {
      problems.push(`${where}.${m.name}: typed ${m.type}, contract says ${spec.type}`);
    }

    if (spec.form === 'primitive' && m.type !== spec.type) {
      problems.push(`${where}.${m.name}: typed ${m.type}, contract says ${spec.type}`);
    }

    if (spec.form === 'enum' && m.form === 'enum' && Array.isArray(m.values)) {
      const declared = types.get(spec.type);
      if (declared?.kind === 'enum' && Array.isArray(declared.values)) {
        const layerSet = new Set(m.values);
        const contractSet = new Set(declared.values);
        const same = layerSet.size === contractSet.size && [...layerSet].every((v) => contractSet.has(v));
        if (!same) {
          problems.push(
            `${where}.${m.name}: inline union values [${m.values.join(', ')}] do not match `
            + `${spec.type}'s declared values [${declared.values.join(', ')}]`,
          );
        }
      }
    }
  }

  for (const [bound, spec] of expected) {
    if (seen.has(bound) || collided.has(bound)) continue;
    problems.push(`${where}: does not declare "${bound}" (contract member "${spec.member}", ${spec.form})`
      + (spec.required === false ? ' — an optional member is still a declared member' : ''));
  }
  return problems;
}

export const REACT_SURFACE_EXTENSIONS = ['.tsx', '.d.ts'];

export function resolveReactImplementations(tree: Record<string, string[]>, exists: (path: string) => boolean) {
  const implementations = new Map();
  const problems = [];
  for (const [category, dirs] of Object.entries(tree))
    for (const dir of dirs) {
      const name = pascal(dir);
      const base = `frameworks/react/components/${category}/${dir}/${name}`;
      const found = REACT_SURFACE_EXTENSIONS.map((e) => `${base}${e}`).find((p) => exists(p));
      if (found) { implementations.set(name, found); continue; }
      problems.push(
        `frameworks/react/components/${category}/${dir}/: is a component directory with no ${name}.tsx and no `
        + `${name}.d.ts — this gate cannot read a surface it cannot find, and skipping it would report a clean `
        + 'pass over an unchecked layer');
    }
  if (implementations.size === 0)
    problems.push('found 0 React component implementations — an empty result set is a failure, not a clean pass; check the discovery path');
  return { implementations, problems };
}

export const COMPARABLE_DEFAULT = new Set(['primitive', 'enum']);

export const REACT_SOURCE_EXTENSIONS = ['.tsx', '.jsx'];

export function reactSourceFor(declarationPath: string, readFile = readFileSync) {
  if (declarationPath.endsWith('.tsx')) {
    try {
      return { path: declarationPath, source: readFile(declarationPath, 'utf8') };
    } catch {
      return null;
    }
  }
  for (const ext of REACT_SOURCE_EXTENSIONS) {
    const candidate = declarationPath.replace(/\.d\.ts$/, ext);
    try {
      return { path: candidate, source: readFile(candidate, 'utf8') };
    } catch {
      continue;
    }
  }
  return null;
}

export function reactImplementationProblems(contract: ContractCandidate, declarationPath: string, readFile = readFileSync) {
  const where = `react/${contract.component}`;
  const found = reactSourceFor(declarationPath, readFile);
  if (!found) {
    return [`${where}: no ${REACT_SOURCE_EXTENSIONS.join(' and no ')} beside ${relPosix(root, declarationPath)}. check:api reads the declaration; without the implementation it can only check what the declaration agrees to.`];
  }
  const source = found.source;
  let impl;
  try {
    impl = reactImplementation(source, contract.component ?? '');
  } catch (error) {
    if (!(error instanceof UnrecognisedShape)) throw error;
    return [`${where}: the reader could not read the implementation — ${error.message}`];
  }
  const problems = [];
  if (impl.rest) {
    problems.push(
      `${where}: the implementation spreads {...${impl.rest}} onto its element. Flattening a component's heritage `
      + `dropped every global and ARIA attribute a spread forwards, and the .d.ts agreeing with the contract is `
      + `what let a restored spread pass — this gate now reads the implementation so it cannot.`,
    );
  }
  if (!impl.destructures) return problems;
  for (const [member, spec] of memberEntries(contract.api)) {
    if (!COMPARABLE_DEFAULT.has(spec.form)) continue;
    if (!impl.defaults.has(member)) continue;
    problems.push(...defaultProblems(where, member, spec.default, impl.defaults.get(member)));
  }
  return problems;
}

function reactImplementations() {
  const { implementations, problems } = resolveReactImplementations(
    readLayer('react'),
    (path: string) => existsSync(join(root, path)),
  );
  return {
    implementations: new Map([...implementations].map(([name, path]) => [name, join(root, path)])),
    problems,
  };
}

export function resolveAngularImplementations(tree: Record<string, string[]>, exists: (path: string) => boolean) {
  const implementations = new Map();
  const problems = [];
  for (const [category, dirs] of Object.entries(tree))
    for (const dir of dirs) {
      const name = pascal(dir);
      const path = `frameworks/angular/components/${category}/${dir}/${name}.ts`;
      if (exists(path)) { implementations.set(name, path); continue; }
      problems.push(
        `frameworks/angular/components/${category}/${dir}/: is a component directory with no ${name}.ts — `
        + 'this gate cannot read a surface it cannot find, and skipping it would report a clean pass over an unchecked layer');
    }
  if (implementations.size === 0)
    problems.push('found 0 Angular component implementations — an empty result set is a failure, not a clean pass; check the discovery path');
  return { implementations, problems };
}

function angularImplementations() {
  const { implementations, problems } = resolveAngularImplementations(
    readLayer('angular'),
    (path: string) => existsSync(join(root, path)),
  );
  return {
    implementations: new Map([...implementations].map(([name, path]) => [name, join(root, path)])),
    problems,
  };
}

function main() {
  const problems = [];

  for (const [path, expected] of buildApiModules()) {
    let actual;
    try { actual = readFileSync(join(root, path), 'utf8'); }
    catch { problems.push(`${path}: missing — run bun run generate:api`); continue; }
    if (actual !== expected) problems.push(`${path}: stale — run bun run generate:api`);
  }

  const typeDir = join(root, 'contracts/api/types');
  const types = readdirSync(typeDir).filter((f) => f.endsWith('.json')).sort().map((f) => readJson(join(typeDir, f)));
  problems.push(...validateTypes(types));
  const typeNames = new Map(types.map((t) => [t.name, t.kind]));

  const typesByName = new Map(types.map((t) => [t.name, t]));

  const contractDir = join(root, 'contracts/api/components');
  const files = existsSync(contractDir) ? readdirSync(contractDir).filter((f) => f.endsWith('.json')).sort() : [];
  problems.push(...zeroContractProblems({ contracts: files.length, types: types.length }));

  const reactLayer = reactImplementations();
  problems.push(...reactLayer.problems);
  const angularLayer = angularImplementations();
  problems.push(...angularLayer.problems);
  let layersChecked = 0;

  for (const file of files) {
    const contract = readJson(join(contractDir, file));
    problems.push(...validateContract(contract, typeNames));

    const react = reactLayer.implementations.get(contract.component) ?? null;
    const angular = angularLayer.implementations.get(contract.component) ?? null;
    if (!react && !angular) {
      problems.push(`${file}: names component "${contract.component}", which no layer implements`);
      continue;
    }

    for (const [layer, path, readSurface, symbol] of [
      ['react', react, reactSurface, `${contract.component}Props`],
      ['angular', angular, angularSurface, contract.component],
    ]) {
      if (!path) continue;
      layersChecked += 1;
      let surface;
      try {
        surface = readSurface(readFileSync(path, 'utf8'), symbol);
      } catch (error) {
        if (!(error instanceof UnrecognisedShape)) throw error;
        problems.push(`${layer}/${contract.component}: the reader could not read this surface — ${error.message}`);
        continue;
      }
      for (const base of surface.heritage ?? []) {
        problems.push(`${layer}/${contract.component}: extends "${base}" — the {...rest} escape is none of the nine forms, R4`);
      }
      problems.push(...compareSurface(contract, surface.members, layer, typesByName));
      problems.push(...docProblems(contract, surface.docs ?? new Map(), layer));
      if (layer === 'react') problems.push(...reactImplementationProblems(contract, path));
    }
  }

  if (problems.length) {
    console.error(`check-api: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}`);
    process.exit(1);
  }
  console.log(`check-api: ${files.length} contract(s) and ${types.length} type(s) hold across ${layersChecked} layer implementation(s)`);
}

if (isMainModule(import.meta.url)) main();
