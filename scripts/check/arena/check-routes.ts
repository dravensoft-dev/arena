/* Holds what a reading route costs. Both branches route rather than explain, so a document grows
 * by a paragraph that reads as an improvement while the cost lands on every agent taking that
 * route, once per build, with every other gate green. ROUTES declares a route as its ordered stops
 * and a budget carrying the reason for its number; a stop is a pathspec and the LARGEST file it
 * reaches is what the route is charged, so the figure is the worst case a reader can meet rather
 * than an average nobody experiences. A budget the tree has fallen far under fails as a stale
 * allowance, the shape SIZE_ALLOWANCE has in check-docs.ts, so decomposing a document returns the
 * pressure instead of ending it. The stops are this gate's declared reads, derived rather than
 * written a second time. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { resolveSpecs } from '../../graph/pathspecs.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const BUDGET_SLACK = 0.85;

export type Route = {
  name: string;
  who: string;
  stops: string[];
  budget: number;
  reason: string;
};

export const ROUTES: Route[] = [
  {
    name: 'consumer-component',
    who: 'an agent writing a screen: the router, where it takes the rules, then its layer\'s '
      + 'directory, then the index of the one category it reaches into, then the prompt of the one '
      + 'component it writes',
    stops: [
      'skills/design/SKILL.md',
      'frameworks/*/INDEX.md',
      'frameworks/*/components/*/INDEX.md',
      'frameworks/*/components/**/*.prompt.md',
    ],
    budget: 44_000,
    reason:
      'the route every build takes, and the only one paid per screen rather than per project. The '
      + 'layer-neutral index is deliberately NOT a stop: it answers whether a component exists at '
      + 'all, which is a question a builder who knows what they are reaching for never asks, and '
      + 'charging every build for it cost half again what the route costs now. The layer stop is a '
      + 'directory naming every component under its category rather than one index describing all '
      + 'fifty-nine, so a build is charged the one category it reaches into: splitting it took a '
      + 'quarter off this number, and naming the components in the directory is what keeps the '
      + 'extra stop from costing a guess. The number is what the stops measure today with room for '
      + 'one component to grow, and it is the ceiling a new rule on the consumer branch is argued '
      + 'against.',
  },
  {
    name: 'consumer-install',
    who: 'a consumer putting Arena into a project: the router, then the npm page of their package',
    stops: ['skills/design/SKILL.md', 'frameworks/*/PACKAGE.md'],
    budget: 42_000,
    reason:
      'paid once per project rather than per screen, so it carries what the build route may not: '
      + 'the config file, the command, the theme surface and the two measurements. It shares the '
      + 'router with the build route, so the two move together whenever that page does. The number '
      + 'is argued up rather than held down when a correction lands on the npm page: a pre-paint '
      + 'script that answers the device as well as storage is longer than one that does not, and '
      + 'being right is what the page is for. It is what the stops measure once the appearance a '
      + 'project adopts stopped being picked from a page rather than written in a directory. '
      + 'Raised from 36,000 when the audit gained a scope: a consumer has to be told which rule '
      + 'relaxes inside a style plugin directory and which does not, and a report that is silent '
      + 'about where it stops applying is one nobody can act on. Raised again when the third '
      + 'generated file gained a name on the page: a file nobody is told to import is a plugin '
      + 'whose CSS reaches no page, and the failure is silent, so naming it is worth more than the '
      + 'lines it costs. Raised again when the page stated which register the library is for: what '
      + 'this route decides is whether to adopt Arena at all, and a consumer whose product is a '
      + 'media or a consumer one otherwise learns that the components run out by building the '
      + 'screen, which costs more than every stop on this route put together. Raised again when '
      + '--strict stopped being one switch: a project whose brand does not clear 4.5:1 has to be '
      + 'told which kinds it can still hold, and a flag whose kinds are not named on the page is '
      + 'one nobody can type. Raised again when the config gained a key for a brand whose mark is '
      + 'a gradient: what the key buys is that --strict=audit stops failing over the most '
      + 'recognisable thing about a product, and a key nobody is told about is one nobody '
      + 'declares, so the report it silences goes on being suppressed a line at a time. Raised '
      + 'again when the router\'s description named the style kernel: the description is the whole '
      + 'of what an agent reads before it decides whether to load Arena at all, and one that stops '
      + 'at the palette describes a system that cannot be reskinned. Raised again when the '
      + 'question table gained the three rows the kernel answers: this route and the build route '
      + 'share the router, so a project that has to decide its appearance before the first screen '
      + 'pays for those rows here too. Most of what they cost was bought back out of the paragraph '
      + 'that used to describe a style plugin on the router, which the kernel document owns now.',
  },
  {
    name: 'consumer-skin',
    who: 'a project deciding what Arena looks like in their product: the router, then the kernel '
      + 'document that says what the questions are and which answers carry the difference',
    stops: ['skills/design/SKILL.md', 'skills/design/references/style-kernel.md'],
    budget: 24_000,
    reason:
      'paid once per project and never per screen, like the install route, which is what lets it '
      + 'carry the whole surface the kernel exposes rather than a pointer to it. What it buys is '
      + 'that a project stops learning the kernel from a normative contributor document that names '
      + 'gates and links a contributor roof, which is where four products learned it. The number is '
      + 'what the stops measure with room for the kernel to grow a section, and it moves when the '
      + 'kernel grows a question rather than when the document grows a paragraph: the differentiation '
      + 'table is a measurement over consumer benches, so it grows by remeasuring and not by writing.',
  },
  {
    name: 'contributor-component',
    who: 'a contributor adding or changing a component: the router, the frameworks roof, then the '
      + 'layer that binds it',
    stops: ['AGENTS.md', 'frameworks/AGENTS.md', 'frameworks/*/AGENTS.md'],
    budget: 84_500,
    reason:
      'the most-walked contributor route and the one carrying the most reasoning per stop. It is '
      + 'allowed to cost more than any consumer route because it is paid by whoever changes Arena '
      + 'and never by whoever uses it. What it may not carry is one category\'s own tour: the '
      + 'chart family is a fourth stop, frameworks/CHARTS.md, for whoever changes a chart, and '
      + 'charging every component change for it cost a fifth of this route. Raised from 83,000 '
      + 'when the branch named the convention it answers to and the two places it departs from '
      + 'one: a contributor who does not know the consumer branch is a skill adds an eighteenth '
      + 'file under the reserved name, and the cost of that is paid by every reader of the tag.',
  },
  {
    name: 'contributor-token',
    who: 'a contributor moving a value: the router, the contracts roof, the design specification '
      + 'and the shape a token is authored in',
    stops: ['AGENTS.md', 'contracts/AGENTS.md', 'contracts/design/AGENTS.md', 'contracts/design/TokenTypes.md'],
    budget: 76_000,
    reason:
      'the normative half of the tree, where a stop is read for what a value MEANS rather than for '
      + 'how to write one, so it is bounded by what a person can hold rather than by what an agent '
      + 'can afford. Raised from 72,000 when the role tier went from 28 roles to 63 and grew a '
      + 'ninth token type: TokenTypes.md has to state what a keyword is and why it is the one '
      + 'departure from 2025.10, and the design specification has to say why a style plugin now '
      + 'reaches type, ink and internal air. The route is longer because the thing it describes is '
      + 'bigger, which is the one reason a budget should ever move.',
  },
  {
    name: 'contributor-gate',
    who: 'a contributor writing or moving a gate: the router, the scripts roof, the check roof and '
      + 'the domain the gate lands in',
    stops: ['AGENTS.md', 'scripts/AGENTS.md', 'scripts/check/AGENTS.md', 'scripts/check/*/AGENTS.md'],
    budget: 96_000,
    reason:
      'the route this repository asks a contributor to take most often after the component one, '
      + 'and the one whose last stop grows every time a gate lands, since a gate states its whole '
      + 'claim in one table row. The headroom is deliberately a few gates wide: a budget a single '
      + 'new row breaks reports the row rather than the growth it is there to report. Raised from '
      + '88,000 when check:parts landed and one row spent the last of it, and again when '
      + 'check:skill-spec landed and spent the next of it: that is the clause above happening '
      + 'twice, and it is what the headroom is for. Raised to 96,000 rather than to the next row, '
      + 'because two rows landed in one session and a headroom spent the day it is granted is not '
      + 'headroom: the number is what restores the few gates of room the clause above claims.',
  },
];

export const node = {
  name: 'check:routes',
  reads: [...new Set(ROUTES.flatMap((route) => route.stops))],
  writes: [],
  feeds: [],
};

export const SKIPPED_ANYWHERE = new Set(['node_modules', '.git', 'dist', 'build', 'vendor']);

export function skips(name: string) {
  return SKIPPED_ANYWHERE.has(name);
}

export function documents(base = root) {
  return walkFiles(base, { skip: (name) => skips(name) })
    .filter((path) => path.endsWith('.md'))
    .map((path) => relPosix(base, path));
}

export type Charge = { stop: string; rel: string; chars: number };

export function largestReached(stop: string, universe: string[], base = root): Charge | null {
  const reached = resolveSpecs([stop], universe);
  let charge: Charge | null = null;
  for (const rel of reached) {
    const chars = readFileSync(join(base, rel), 'utf8').length;
    if (!charge || chars > charge.chars) charge = { stop, rel, chars };
  }
  return charge;
}

export function measure(route: Route, universe: string[], base = root) {
  const charged: Charge[] = [];
  const unreached: string[] = [];
  for (const stop of route.stops) {
    const charge = largestReached(stop, universe, base);
    if (charge) charged.push(charge);
    else unreached.push(stop);
  }
  return { charged, unreached, total: charged.reduce((sum, one) => sum + one.chars, 0) };
}

export function unreachedProblems(route: Route, unreached: string[]) {
  return unreached.map((stop) =>
    `${route.name}: the stop ${stop} reaches no document, so the route describes a tree that moved `
    + 'under it and the cost it reports is of a journey nobody can take',
  );
}

export function overBudgetProblems(route: Route, charged: Charge[], total: number) {
  if (total <= route.budget) return [];
  const worst = [...charged].sort((a, b) => b.chars - a.chars)[0];
  return [
    `${route.name}: costs ${total} characters against a budget of ${route.budget}. ${route.reason} `
    + `The stop spending most of it is ${worst?.rel} at ${worst?.chars}. Move a level's own tour `
    + 'into that level and leave the cross-level rule with a pointer, or argue the budget up here '
    + 'with the reason.',
  ];
}

export function staleBudgetProblems(route: Route, total: number) {
  const floor = Math.round(route.budget * BUDGET_SLACK);
  if (total >= floor) return [];
  return [
    `${route.name}: costs ${total} characters against a budget of ${route.budget}, which it has `
    + `fallen ${route.budget - total} under. An allowance is not an exemption: lower the budget to `
    + 'what the route now costs, or the next paragraph spends a saving nobody argued for.',
  ];
}

export function zeroScanProblems(routes: Route[], universe: string[]) {
  const problems = [];
  if (routes.length === 0)
    problems.push('declared 0 routes, so this gate holds no reader to anything and reports clean');
  if (universe.length === 0)
    problems.push('walked 0 documents, so every stop reads as unreachable and no cost is measured at all');
  for (const route of routes)
    if (route.stops.length === 0)
      problems.push(`${route.name} declares no stop, so it costs nothing and is a route in name only`);
  return problems;
}

export function routeProblems(base = root, routes = ROUTES) {
  const universe = documents(base);
  const problems = [...zeroScanProblems(routes, universe)];
  const measured = [];

  for (const route of routes) {
    const { charged, unreached, total } = measure(route, universe, base);
    measured.push({ route, charged, total });
    problems.push(
      ...unreachedProblems(route, unreached),
      ...overBudgetProblems(route, charged, total),
      ...staleBudgetProblems(route, total),
    );
  }

  return { problems, measured, scanned: universe.length };
}

function main() {
  const { problems, measured, scanned } = routeProblems();
  for (const { route, total } of measured)
    console.log(`  ${String(total).padStart(6)} / ${String(route.budget).padStart(6)}  ${route.name}`);

  if (problems.length > 0) {
    console.error(`\ncheck-routes: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`\ncheck-routes: ${measured.length} route(s) inside their budget, over ${scanned} document(s)`);
}

if (isMainModule(import.meta.url)) main();
