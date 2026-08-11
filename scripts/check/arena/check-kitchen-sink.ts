/* Holds what check:pixel-parity is pointed at. That gate reports the two layers agreeing over a
 * page holding everything exactly as it does over a page holding nothing, so the arrangement is
 * the thing to hold and this is where. Each claim closes a way the surface silently shrinks:
 * every component the registry names appears in every arrangement, so no voice is compared over
 * less than its siblings; every voice the build ships has one, so an extension cannot land
 * painted by nobody; nothing names what does not exist, since a typo drops a component and reads
 * as a choice; a fixture keeps pinning the members its component would otherwise take off the
 * clock or the host's own zone, which would move the page between two runs; and every emitted
 * file matches a fresh run, so a page edited by hand fails rather than becoming the thing
 * compared. PINNED carries the reason per entry, and an entry that outlives it fails here. */

import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';
import { everyComponent } from '../../lib/tailwind/manifest-surfaces.ts';
import {
  buildKitchenSink, loadFixtures, shippedExtensions, FIXTURES,
} from '../../generate/arena/generate-kitchen-sink.ts';
import type { SinkFixture } from '../../lib/arena/kitchen-sink-model.ts';

export const node = {
  name: 'check:kitchen-sink',
  reads: [
    `${FIXTURES}/*.sink.json`, 'frameworks/demos/*.demo.json', 'frameworks/Components.json',
    'contracts/design/extension.*.json', 'contracts/api/components',
    'frameworks/react/kitchen-sink/**', 'frameworks/angular/kitchen-sink/**',
    'frameworks/angular/ProjectionMarkers.ts', 'frameworks/tailwind/components/**/*.manifest.json',
  ],
  writes: [],
  feeds: [],
};

export const PINNED: Record<string, { members: string[]; reason: string }> = {
  ArenaCalendar: {
    members: ['anchorDate', 'timeZone'],
    reason: 'the grid is laid out around a date and rendered in a zone, and it falls back to today '
      + 'in the host\'s own zone, so a page that leaves either out draws a different week tomorrow '
      + 'and a different one on a runner in another zone',
  },
};

export function coverageProblems(fixtures: Map<string, SinkFixture>, registry: string[]) {
  const problems = [];
  const known = new Set(registry);
  for (const [extension, fixture] of fixtures) {
    const items = fixture.sections.flatMap((section) => section.items);
    if (items.length === 0) {
      problems.push(`${extension}: the arrangement holds no component at all, so its pair of pages `
        + 'compares two empty documents and passes');
      continue;
    }
    const seen = new Set(items);
    const missing = registry.filter((name) => !seen.has(name));
    if (missing.length > 0) {
      problems.push(`${extension}: ${missing.length} component(s) the registry names appear nowhere in `
        + `this arrangement, so nothing compares them in this voice: ${missing.join(', ')}`);
    }
    const unknown = [...seen].filter((name) => !known.has(name)).sort();
    if (unknown.length > 0) {
      problems.push(`${extension}: names ${unknown.join(', ')}, which frameworks/Components.json does `
        + 'not, so the name reaches no component and the arrangement silently holds one fewer');
    }
    const twice = [...seen].filter((name) => items.filter((one) => one === name).length > 1).sort();
    if (twice.length > 0) {
      problems.push(`${extension}: places ${twice.join(', ')} more than once. A page is not made more `
        + 'comparable by holding the same component twice, and the second copy is a section that lost '
        + 'track of what it was for');
    }
  }
  return problems;
}

export function voiceProblems(fixtures: Map<string, SinkFixture>, shipped: string[]) {
  const problems = [];
  for (const extension of shipped) {
    if (fixtures.has(extension)) continue;
    problems.push(`the build ships the ${extension} voice and no ${extension}.sink.json arranges it, `
      + 'so it reaches an adopter with nothing having compared the layers under it');
  }
  for (const extension of fixtures.keys()) {
    if (shipped.includes(extension)) continue;
    problems.push(`${extension}.sink.json arranges a voice the build does not ship, so its page paints `
      + 'a scope class the cascade ignores and the pair agrees by drawing the plain voice twice');
  }
  return problems;
}

export function pinnedProblems(demos: Map<string, { seed?: Record<string, unknown> }>,
  pinned = PINNED) {
  const problems = [];
  for (const [component, { members, reason }] of Object.entries(pinned)) {
    const demo = demos.get(component);
    if (!demo) {
      problems.push(`PINNED names ${component}, and no fixture in frameworks/demos/ is called that. `
        + `The allowance outlived what it was written for: ${reason}`);
      continue;
    }
    for (const member of members) {
      if (demo.seed && Object.hasOwn(demo.seed, member)) continue;
      problems.push(`${component} does not seed ${member}, and it has to: ${reason}`);
    }
  }
  return problems;
}

export function emissionProblems(files: Map<string, string>, base = root) {
  const problems = [];
  for (const [rel, body] of files) {
    const path = join(base, rel);
    if (!existsSync(path)) {
      problems.push(`${rel} is not on disk, and the generator emits it. Run bun run build: the page `
        + 'a gate opens is the one that is there, not the one a fresh run would write');
      continue;
    }
    if (readFileSync(path, 'utf8') === body) continue;
    problems.push(`${rel} is not what a fresh run of generate-kitchen-sink writes. Either it was `
      + 'edited by hand, which the banner refuses, or its source moved and nothing rebuilt it');
  }
  return problems;
}

export function loadDemoSeeds(base = root) {
  const dir = join(base, 'frameworks/demos');
  const out = new Map();
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith('.demo.json')) continue;
    out.set(file.slice(0, -'.demo.json'.length), JSON.parse(readFileSync(join(dir, file), 'utf8')));
  }
  return out;
}

function main() {
  const fixtures = loadFixtures();
  if (fixtures.size === 0) {
    console.error(`check-kitchen-sink: found 0 arrangement(s) under ${FIXTURES}. An empty walk reports `
      + 'every voice covered and every component placed, which is a clean-looking pass over a '
      + 'directory it never opened.');
    process.exit(1);
  }
  const registry = everyComponent();
  if (registry.length === 0) {
    console.error('check-kitchen-sink: the registry names 0 components, so coverage is satisfied by '
      + 'an empty page; frameworks/Components.json is what to look at');
    process.exit(1);
  }

  const { files, problems: emitted } = buildKitchenSink();
  const problems = [
    ...voiceProblems(fixtures, shippedExtensions()),
    ...coverageProblems(fixtures, registry),
    ...pinnedProblems(loadDemoSeeds()),
    ...emitted,
    ...emissionProblems(files),
  ];

  if (problems.length) {
    console.error(`check-kitchen-sink: ${problems.length} problem(s)\n`);
    for (const p of problems) console.error(`  ${p}\n`);
    process.exit(1);
  }
  console.log(`check-kitchen-sink: ${fixtures.size} arrangement(s) place all ${registry.length} `
    + `component(s) each, one per voice the build ships, and the ${files.size} emitted file(s) match `
    + 'a fresh run of the generator');
}

if (isMainModule(import.meta.url)) main();
