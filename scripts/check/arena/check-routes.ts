/* Holds what a reading route costs. Both branches route rather than explain, so a document grows
 * by a paragraph that reads as an improvement while the cost lands on every agent taking that
 * route, once per build, with every other gate green. ROUTES declares a route as its ordered stops
 * and a budget carrying the reason for its number; a stop is a pathspec and the LARGEST file it
 * reaches is what the route is charged, so the figure is the worst case a reader can meet rather
 * than an average nobody experiences. A budget the tree has fallen far under fails as a stale
 * allowance, the shape SIZE_ALLOWANCE has in check-docs.ts, so decomposing a document returns the
 * pressure instead of ending it. A reason says why its number is right today, so it names no
 * figure, carries no raise and stays short: the history of a budget is the commit that moved it. */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { isMainModule } from '../../utils/main-module.ts';
import { walkFiles } from '../../utils/walk-files.ts';
import { relPosix } from '../../utils/posix-path.ts';
import { resolveSpecs } from '../../graph/pathspecs.ts';
import { repoRoot as root } from '../../lib/arena/repo-root.ts';

export const BUDGET_SLACK = 0.85;

export const REASON_MAX_CHARS = 1_200;

export const BUDGET_FIGURE = /\b\d{1,3}(?:[,_]\d{3})+\b|\b\d{4,}\b/;

export const HISTORY_WORDS = /\b(?:raised|lowered)\b/i;

export type Entry = {
  name: string;
  router: string;
  budget: number;
  reason: string;
};

export type Branch = {
  name?: string;
  stops: string[];
};

export type Route = {
  name: string;
  who: string;
  entry: string;
  stops?: string[];
  branches?: Branch[];
  budget: number;
  reason: string;
};

export const ENTRIES: Entry[] = [
  {
    name: 'consumer',
    router: 'skills/design/SKILL.md',
    budget: 18_600,
    reason:
      'the page every consumer route opens with, declared once rather than as the first stop of '
      + 'each route, because a router charged to every route opening with it is argued once per route '
      + 'and never once for its reader. What a route pays past it is its own, so the two move '
      + 'independently and each is argued where it is spent. A question earns a row here only when it '
      + 'is asked before a builder knows which situation they are in: whether a component exists, how '
      + 'much of Arena a project takes, what it installs Arena with, where the appearance comes from, '
      + 'whether anybody outside the product has to find it, and where a defect goes once it is '
      + 'proved to be Arena\'s. Everything asked after that belongs to the node that asks it. The '
      + 'rules list is emitted from one declaration, so each rule says whether a gate reads the '
      + 'reader\'s own sources, and the prose holds the register check:register reads. A page whose '
      + 'prose is already flat has nothing left to spend, so what moves this number is a new question '
      + 'rather than a longer answer.',
  },
  {
    name: 'contributor',
    router: 'AGENTS.md',
    budget: 23_600,
    reason:
      'the same argument on the other branch, and it is allowed to cost more because it is paid by '
      + 'whoever changes Arena and never by whoever uses it. It carries a routing table rather than a '
      + 'tour, so it grows by a row when a level appears and not by a paragraph when a level grows. '
      + 'The first rows are indexed by symptom rather than by what is being changed, because a reader '
      + 'holding a defect cannot answer that question yet, and a router indexed only by intent serves '
      + 'the reader who already has one. One row is a promise rather than a directory, what a '
      + 'consumer may build Arena into, since no page a contributor opens by path states it. The page '
      + 'also names every artefact a release moves and every departure from the convention it answers '
      + 'to, because a forgotten artefact fails in silence and an unwritten departure is one the next '
      + 'reader repairs.',
  },
];

export const ROUTES: Route[] = [
  {
    name: 'consumer-component',
    who: 'an agent writing a screen: the router, where it takes the rules, then its layer\'s '
      + 'directory, then the index of the one category it reaches into, then the prompt of the one '
      + 'component it writes',
    entry: 'consumer',
    stops: [
      'frameworks/*/INDEX.md',
      'frameworks/*/components/*/INDEX.md',
      'frameworks/*/components/**/*.prompt.md',
    ],
    budget: 32_800,
    reason:
      'the route every build takes, and the only one paid per screen rather than per project. The '
      + 'layer-neutral index is deliberately not a stop: it answers whether a component exists at '
      + 'all, which a builder who knows what they are reaching for never asks. The layer stop is a '
      + 'directory naming every component under its category rather than one index describing all of '
      + 'them, so a build is charged the one category it reaches into, and naming the components '
      + 'there is what keeps the extra stop from costing a guess. The largest prompt this route '
      + 'reaches is the table\'s, and every screen taking a table pays for it, which argues for '
      + 'keeping that page short rather than for leaving a member out: a paged table has to say how '
      + 'big its list is and where the page starts in it, and the header row taking the first index '
      + 'is arithmetic no member description can carry. The number is what the stops measure with '
      + 'room for one component to grow, and it is the ceiling a new rule on the consumer branch is '
      + 'argued against.',
  },
  {
    name: 'consumer-install',
    who: 'a consumer putting Arena into a project: the router, then the npm page of their package',
    entry: 'consumer',
    stops: ['frameworks/*/PACKAGE.md'],
    budget: 51_700,
    reason:
      'paid once per project rather than per screen, so it carries what the build route may not: '
      + 'the config file, the command, the theme surface and what each of them costs. It is the only '
      + 'route a reader arriving from the registry can take, and the package they installed carries '
      + 'none of the language, so a thing the package ships and this page never names is a thing '
      + 'nobody imports: an export, a stylesheet, a class, a constant id, a second entry point, a '
      + 'config key. Cold walks of this route rewrote each of those from memory when the page left it '
      + 'out. The config block is copied whole, so it states every key that decides the appearance; '
      + 'the install section gives the evidence behind each package manager and runtime it names; and '
      + 'a section shared by both npm pages is said once and charged to the larger. What moves this '
      + 'number is being right, since that is what the page is for, and what keeps it honest is that '
      + 'a gate fails the page rather than a reader discovering it.',
  },
  {
    name: 'consumer-skin',
    who: 'a project deciding what Arena looks like in their product: the router, then the kernel '
      + 'document that says what the questions are and which answers carry the difference',
    entry: 'consumer',
    stops: ['skills/design/references/style-kernel.md'],
    budget: 17_700,
    reason:
      'paid once per project and never per screen, which is what lets it carry the whole surface '
      + 'the kernel exposes rather than a pointer to it, so a project stops learning the kernel from '
      + 'a normative contributor document. It states which scale each role draws from, that a reading '
      + 'floor refuses the build rather than reporting, which answers a project may inherit and which '
      + 'it has to make, and how the one exception to the scale rule is keyed. A cold walk without '
      + 'those had to guess each of them. The differentiation table is a measurement over the '
      + 'catalogue, so it grows by remeasuring and not by writing, and a row the catalogue moves from '
      + 'inherited to decided is a decision this page is obliged to name. The number is what the '
      + 'stops measure with room for the kernel to grow a section, and it moves when the kernel grows '
      + 'a question rather than when the document grows a paragraph.',
  },
  {
    name: 'consumer-register',
    who: 'a builder whose product, or one screen of it, is outside the component list: the router, '
      + 'then the page that says what Arena hands over instead of a component',
    entry: 'consumer',
    stops: ['skills/design/references/media-register.md'],
    budget: 9_600,
    reason:
      'paid once per project, by a reader the router has just told to write their own markup. What '
      + 'it buys is that the honest sentence sending them away from the component list stops costing '
      + 'more than a dishonest one: without it a walk hand-rolls a focus trap the package already '
      + 'ships, guesses an ARIA contract that is written down, and rediscovers that a photo wall is '
      + 'one line of CSS. It names what Arena hands over instead of a component, the component names '
      + 'that look like the answer and are not, and the viewer that opens a picture at full size with '
      + 'the answers every walk otherwise invents: what dims the page, whether the picture is '
      + 'contained, what a control over it stands on, and which pattern it still binds. The number is '
      + 'what the stops measure with room for one section, and it grows when the register gains a '
      + 'part to hand over rather than when the page gains a paragraph.',
  },
  {
    name: 'consumer-seo',
    who: 'a project deciding whether what it builds has to be found from outside it: the router, '
      + 'then the page that says what Arena writes into the head and which layer writes it',
    entry: 'consumer',
    stops: ['skills/design/references/seo.md'],
    budget: 4_700,
    reason:
      'paid once per project and taken before the first screen, because the answer reaches the '
      + 'layer and the install rather than a component, so a project that settles it afterwards '
      + 'settles it against code already written. What it buys is that the metadata entry point is '
      + 'reachable from the decision instead of from deep inside the install page. Every default it '
      + 'surfaces is silent in the direction that costs: a route is born unindexed, and an '
      + 'application with no origin publishes no canonical, so both are correct until a screen is '
      + 'missing from a result nobody checked. It states which layer supplies a head and that a '
      + 'framework picked to be found supplies its own, and it points at the node carrying the '
      + 'server-rendering evidence at the decision, without choosing an architecture for the project. '
      + 'The number is what the stops measure with room for one section, and it grows when Arena '
      + 'gains something to write into the head.',
  },
  {
    name: 'consumer-surface',
    who: 'a project deciding how much of Arena it is taking: the router, then the page naming '
      + 'every part Arena ships, the three steps a project can stop at, and where Arena stops',
    entry: 'consumer',
    stops: ['skills/design/references/surface.md'],
    budget: 10_800,
    reason:
      'paid once per project and taken before the skin, register and seo routes, because each of '
      + 'them asks how much of a thing nobody has shown the reader yet. What it buys is that a '
      + 'consumer stops learning the offer by running out of it: every part Arena ships is named in '
      + 'one place, beside the document that owns it. The page is an index rather than a tutorial, '
      + 'which is what keeps it inside this budget and keeps it from becoming a second router. It '
      + 'also carries where Arena stops, each line a decision rather than a gap, because a limit kept '
      + 'in a component prompt is reached after the project has planned around it, and a page '
      + 'promising the whole line is falsified by any part of it kept elsewhere. The number is what '
      + 'the stops measure with room for one part, and it grows when Arena ships something new rather '
      + 'than when the page explains something better.',
  },
  {
    name: 'consumer-stack',
    who: 'a project settling what it installs Arena with and what assembles it: the router, then '
      + 'the page naming every axis, every answer Arena supports on it, and how much evidence '
      + 'each of those answers has',
    entry: 'consumer',
    stops: ['skills/design/references/stack.md'],
    budget: 10_300,
    reason:
      'paid once per project like the surface, skin, register and seo routes, and taken beside the '
      + 'cold start tree rather than after it, because a toolchain settled after the first screen is '
      + 'settled against code already written. What it buys is that a reader stops inheriting Arena: '
      + 'a branch saying nothing about the difference between what Arena supports and what Arena is '
      + 'built with documents its own build as a requirement. The evidence column is most of what the '
      + 'page costs and all of what makes it usable, since an answer allowed by a manifest and never '
      + 'exercised is worth having and is not worth the same as one a suite runs. What it '
      + 'deliberately does not carry is the layer decision and the render architecture, which are '
      + 'nodes of the cold start tree: naming them here would give a project two places to answer one '
      + 'thing, and the tree is where the answer reaches a peer dependency rather than a preference.',
  },
  {
    name: 'consumer-page',
    who: 'anybody writing markup that is not a component, which is every project: the router, then '
      + 'the page saying what colour their own markup takes, what column it sits in and how much '
      + 'air goes between two components',
    entry: 'consumer',
    stops: ['skills/design/references/page.md'],
    budget: 14_200,
    reason:
      'paid per element a builder draws themselves, which every screen has. What it buys is the '
      + 'half of a page that is never a component: which colour role each thing a builder draws takes '
      + 'and which level holds it back, since under the default style plugin a bare muted ink paints '
      + 'a caption at body strength and no gate reports it; the three rhythm steps as classes and as '
      + 'custom properties; the row as the horizontal half of those steps rather than a wrapping '
      + 'line; what to wrap when the element being laid out is a component; the block air the band '
      + 'leaves; and the gutter as a ceiling. Cold walks missed each of those when the page left it '
      + 'out. It closes on the same least-to-most the surface page opens with. The number is what the '
      + 'stops measure with room for one section, and it grows when Arena ships a piece for somebody '
      + 'else\'s markup rather than when this page argues again for one it already names.',
  },
  {
    name: 'consumer-coldstart',
    who: 'an agent starting a project that has no appearance of its own: the router, then the tree, '
      + 'then whichever of its branches the answers unlock',
    entry: 'consumer',
    branches: [
      { name: 'the tree alone', stops: ['skills/design/references/cold-start.md'] },
      {
        name: 'a catalogue entry',
        stops: [
          'skills/design/references/cold-start.md',
          'plugin-style-store/catalogue/*/ENTRY.md',
        ],
      },
    ],
    budget: 24_000,
    reason:
      'the route declared as a tree, and the reason that shape exists: a reader answers a question '
      + 'and walks one way, so the route is charged its worst branch and never the sum. Handed a '
      + 'document stating the palette and the type, a reader reads the tree and goes on; choosing a '
      + 'measured register instead, they read the tree and one catalogue entry, and that stop is a '
      + 'glob so the charge is the largest entry rather than the first. The tree carries the '
      + 'decisions that reach an install rather than a screen, whether the product has to be found '
      + 'and what it is assembled on, so its last node derives the dependency list from answers '
      + 'instead of asking about dependencies. A description is matched against the one line every '
      + 'entry carries, which keeps the second stop at a single entry as the catalogue grows. The '
      + 'alternative to reading it is an agent inferring a palette from a screenshot, which costs '
      + 'nothing here and costs the project every screen.',
  },
  {
    name: 'contributor-component',
    who: 'a contributor adding or changing a component: the router, the frameworks roof, then the '
      + 'layer that binds it',
    entry: 'contributor',
    stops: ['frameworks/AGENTS.md', 'frameworks/*/AGENTS.md'],
    budget: 71_000,
    reason:
      'the most-walked contributor route and the one carrying the most reasoning per stop, allowed '
      + 'to cost more than any consumer route because it is paid by whoever changes Arena. It may not '
      + 'carry one category\'s own tour: the chart family is a page of its own, frameworks/CHARTS.md, '
      + 'for whoever changes a chart. What it carries is what every component meets: the ordered '
      + 'steps a new component takes, including the barrel chain an Angular primitive needs to be '
      + 'compiled at all and the suites it owes; the architecture envelope, since a module-scope read '
      + 'of a browser global throws during a server render with a stack naming the import rather than '
      + 'the component; when a primitive is an attribute on a native element; and the Angular default '
      + 'written twice, as the initial value and as the fallback, a pair no gate holds. The roof '
      + 'carries what binds both layers and each layer carries its own envelope and peer, which is '
      + 'the split that keeps the pair from going stale in one of them.',
  },
  {
    name: 'contributor-authoring',
    who: 'a contributor about to edit a file and deciding which half of it is theirs: the router, '
      + 'then the page that says what a machine writes and where the boundary runs inside one file',
    entry: 'contributor',
    stops: ['GENERATED.md'],
    budget: 7_900,
    reason:
      'paid once per contributor rather than per change, which is what lets it carry the whole '
      + 'surface rather than a pointer to it. It is the shortest contributor route on purpose: what '
      + 'it answers is asked before the first edit, by a reader who has not chosen a task yet, and a '
      + 'route that costs more than the change it precedes is one nobody walks. Cold walks of every '
      + 'other contributor route decided generated against authored by opening files rather than by '
      + 'being told: a source carrying an emitted doc comment with no marker, a prompt read as wholly '
      + 'generated when it is mostly prose, a manifest no stop mentions. Each of those ships green. '
      + 'It also names the file a generator writes into a package this tree never holds, since a '
      + 'prompt found inside a package is one a contributor would otherwise correct in the copy. It '
      + 'grows when a generator gains a shape, not when the page gains a paragraph.',
  },
  {
    name: 'contributor-token',
    who: 'a contributor moving a value: the router, the contracts roof, the design specification '
      + 'and the shape a token is authored in',
    entry: 'contributor',
    stops: ['contracts/AGENTS.md', 'contracts/design/AGENTS.md', 'contracts/design/TokenTypes.md'],
    budget: 65_600,
    reason:
      'the normative half of the tree, where a stop is read for what a value means rather than for '
      + 'how to write one, so it is bounded by what a person can hold rather than by what an agent '
      + 'can afford. The level answers two readers: a contributor deciding a value, and a platform '
      + 'target that reads contracts/design/ first and is not a browser. So TokenTypes.md states the '
      + 'one departure from DTCG and why, the axis a reader asking for larger text moves and what it '
      + 'obliges on each platform, and the shapes in the type map that read one way on the web and '
      + 'another elsewhere. The specification states the muted levels as floors a palette moves up '
      + 'and never down, target size as the axis density answers, and what DTCG deliberately does not '
      + 'model. The route moves when the level describes something bigger, never when it describes '
      + 'the same thing at more length.',
  },
  {
    name: 'contributor-gate',
    who: 'a contributor writing or moving a gate: the router, the scripts roof, the check roof and '
      + 'the domain the gate lands in',
    entry: 'contributor',
    stops: ['scripts/AGENTS.md', 'scripts/check/AGENTS.md', 'scripts/check/*/AGENTS.md'],
    budget: 86_000,
    reason:
      'the route a contributor takes most often after the component one, and the one whose last '
      + 'stop grows every time a gate lands, since each gate has a row in its domain\'s table. The '
      + 'headroom is a few rows wide on purpose: a budget a single new row breaks reports the row '
      + 'rather than the growth it is there to report. A row states the claim and the failure the '
      + 'gate exists for, and the rest of its argument belongs to the gate\'s own reason strings, '
      + 'which its paired suite asserts by name; check:docs caps a table cell, so a row cannot '
      + 'become the page. Before writing a row, measure the median and the '
      + 'longest row of the domain table, because the row that breaks a budget is the long one and '
      + 'the median is what says how often that happens.',
  },
  {
    name: 'contributor-tailwind',
    who: 'a contributor changing how a component looks and nothing about what it is: the router, '
      + 'then the one layer that owns an appearance decision for both frameworks at once',
    entry: 'contributor',
    stops: ['frameworks/tailwind/AGENTS.md'],
    budget: 44_000,
    reason:
      'the row a contributor takes when a shape, a colour or a state is wrong and the API is not. '
      + 'The file a corner radius actually moves in is a style plugin under plugin-style-store, '
      + 'because the appearance Arena installs with is itself a plugin, and a cold walk found no page '
      + 'on the way saying so. One stop, and it is the largest single page on the contributor branch, '
      + 'so what this budget holds down is the document most likely to grow by a hazard nobody routes '
      + 'to and everybody meets.',
  },
  {
    name: 'contributor-behaviour',
    who: 'a contributor answering a report about a role, a key, focus or a dismissal: the router, '
      + 'the contracts roof, then the level that says what a kind of component must do',
    entry: 'contributor',
    stops: ['contracts/AGENTS.md', 'contracts/behaviour/AGENTS.md'],
    budget: 38_600,
    reason:
      'the route a bug report takes, and the one whose answer is most often that nothing in the '
      + 'code is broken: a requirement no suite pins is unfalsifiable rather than unverified, and '
      + 'that paragraph is what a reader comes here for. It is budgeted apart from the component '
      + 'route because the two share no stop past the roof, and because this one is paid by whoever '
      + 'holds a defect rather than by whoever adds a component. The level answers a reader outside '
      + 'the browser as well: a pattern names the role it requires as a field and not only inside '
      + 'prose, and the rule about native semantics states the half that applies where no browser '
      + 'supplies them. The roof names the one page on that level written for somebody who is not '
      + 'changing Arena, the npm page of the contracts package, and says who it is for.',
  },
  {
    name: 'contributor-release',
    who: 'a contributor cutting a release: the router, the order the moves are made in, what a '
      + 'package is, and what CI does with the tag once it exists',
    entry: 'contributor',
    stops: ['versioning_steps.md', 'frameworks/PACKAGING.md', '.github/workflows/AGENTS.md'],
    budget: 69_600,
    reason:
      'the least frequent route on the branch and the most expensive one to get wrong, because '
      + 'every one of its failures publishes nothing and errors nowhere. The sequence is the first '
      + 'stop because it is what a reader needs first; the other two are where it sends them. It '
      + 'carries each precondition this route reaches nowhere else: main takes no push, so the tag '
      + 'rides develop and the release lands as a merge; the operating system matrix runs on develop, '
      + 'so the merge request opens on a green develop; the tag exists before Arena main finishes or '
      + 'the release page needs a hand dispatch; server.json is a version surface check-release.ts '
      + 'never reads; each package has a publisher of its own, one of them npm for the attestation '
      + 'Bun cannot give; a first publish needs a trusted publisher configured by hand; and the '
      + 'corpus and the components travel apart, so both are installed to check them. Each is this '
      + 'route\'s failure mode: nothing errors, and nobody is told.',
  },
];

export function branchesOf(route: Route): Branch[] {
  return route.branches ?? [{ stops: route.stops ?? [] }];
}

export const node = {
  name: 'check:routes',
  reads: [...new Set([
    ...ENTRIES.map((entry) => entry.router),
    ...ROUTES.flatMap((route) => branchesOf(route).flatMap((branch) => branch.stops)),
  ])],
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

export function chargeStops(stops: string[], universe: string[], base = root) {
  const charged: Charge[] = [];
  const unreached: string[] = [];
  for (const stop of stops) {
    const charge = largestReached(stop, universe, base);
    if (charge) charged.push(charge);
    else unreached.push(stop);
  }
  return { charged, unreached, total: charged.reduce((sum, one) => sum + one.chars, 0) };
}

export function measureEntry(entry: Entry, universe: string[], base = root) {
  const { charged, unreached, total } = chargeStops([entry.router], universe, base);
  return { entry, charged, unreached, total };
}

export function measure(route: Route, universe: string[], base = root) {
  const measured = branchesOf(route).map((branch, index) => ({
    branch,
    name: branch.name ?? `the ${route.name} branch`,
    index,
    ...chargeStops(branch.stops, universe, base),
  }));
  const worst = [...measured].sort((a, b) => b.total - a.total)[0];
  return {
    branches: measured,
    worst,
    charged: worst?.charged ?? [],
    unreached: measured.flatMap((one) => one.unreached),
    total: worst?.total ?? 0,
  };
}

export function unreachedProblems(route: Route, unreached: string[]) {
  return unreached.map((stop) =>
    `${route.name}: the stop ${stop} reaches no document, so the route describes a tree that moved `
    + 'under it and the cost it reports is of a journey nobody can take',
  );
}

export function overBudgetProblems(
  name: string, reason: string, budget: number, charged: Charge[], total: number, what = 'route',
) {
  if (total <= budget) return [];
  const worst = [...charged].sort((a, b) => b.chars - a.chars)[0];
  return [
    `${name}: costs ${total} characters against a budget of ${budget}. ${reason} `
    + `The stop spending most of it is ${worst?.rel} at ${worst?.chars}. Move a level's own tour `
    + `into that level and leave the cross-level rule with a pointer, or argue the ${what}'s budget `
    + 'up here with the reason.',
  ];
}

export function staleBudgetProblems(name: string, budget: number, total: number) {
  const floor = Math.round(budget * BUDGET_SLACK);
  if (total >= floor) return [];
  return [
    `${name}: costs ${total} characters against a budget of ${budget}, which it has `
    + `fallen ${budget - total} under. An allowance is not an exemption: lower the budget to `
    + 'what it now costs, or the next paragraph spends a saving nobody argued for.',
  ];
}

export function reasonProblems(name: string, reason: string) {
  const problems = [];
  if (reason.length > REASON_MAX_CHARS)
    problems.push(`${name}: its reason runs ${reason.length} characters against ${REASON_MAX_CHARS}. `
      + 'A reason says why the number is right today, and one that keeps growing is a raise history '
      + 'read by every contributor arguing the next one.');
  const figure = BUDGET_FIGURE.exec(reason)?.[0];
  if (figure)
    problems.push(`${name}: its reason names the figure ${figure}. The budget is the field beside `
      + 'the reason, and a figure written into the prose is one nothing holds when the field moves.');
  const history = HISTORY_WORDS.exec(reason)?.[0];
  if (history)
    problems.push(`${name}: its reason says "${history}", which is what the budget was rather than `
      + 'why it is right. The commit that moved it carries that, dated.');
  return problems;
}

export function entryProblems(route: Route, entries = ENTRIES) {
  if (entries.some((entry) => entry.name === route.entry)) return [];
  return [
    `${route.name}: opens with the entry "${route.entry}", and no entry is declared under that `
    + 'name. A route is what a reader pays PAST its router, so one whose router is not declared '
    + 'reports a cost that leaves the first document out.',
  ];
}

export function zeroScanProblems(routes: Route[], universe: string[], entries = ENTRIES) {
  const problems = [];
  if (entries.length === 0)
    problems.push('declared 0 entries, so every route reports what it adds and nothing reports the '
      + 'page each of them opens with');
  if (routes.length === 0)
    problems.push('declared 0 routes, so this gate holds no reader to anything and reports clean');
  if (universe.length === 0)
    problems.push('walked 0 documents, so every stop reads as unreachable and no cost is measured at all');
  for (const entry of entries)
    if (!routes.some((route) => route.entry === entry.name))
      problems.push(`the entry ${entry.name} is declared and no route opens with it, so its budget `
        + 'holds a page nobody is measured reading');
  for (const route of routes)
    for (const branch of branchesOf(route))
      if (branch.stops.length === 0)
        problems.push(`${route.name}: ${branch.name ?? 'a branch'} declares no stop, so it costs `
          + 'nothing and is the branch every measurement of this route will pick as its cheapest');
  return problems;
}

export function routeProblems(base = root, routes = ROUTES, entries = ENTRIES) {
  const universe = documents(base);
  const problems = [...zeroScanProblems(routes, universe, entries)];
  const opened = new Map<string, ReturnType<typeof measureEntry>>();
  const measured = [];

  for (const entry of entries) {
    const one = measureEntry(entry, universe, base);
    opened.set(entry.name, one);
    problems.push(
      ...one.unreached.map((stop) =>
        `${entry.name}: the router ${stop} reaches no document, so every route opening with it `
        + 'reports a cost that starts at the second page'),
      ...overBudgetProblems(entry.name, entry.reason, entry.budget, one.charged, one.total, 'entry'),
      ...staleBudgetProblems(entry.name, entry.budget, one.total),
      ...reasonProblems(entry.name, entry.reason),
    );
  }

  for (const route of routes) {
    const named = entryProblems(route, entries);
    problems.push(...named);
    const { branches, worst, charged, unreached, total } = measure(route, universe, base);
    const opening = opened.get(route.entry)?.total ?? 0;
    measured.push({ route, branches, worst, charged, total, opening, whole: opening + total });
    problems.push(
      ...unreachedProblems(route, unreached),
      ...reasonProblems(route.name, route.reason),
      ...(named.length > 0 ? [] : [
        ...overBudgetProblems(route.name, route.reason, route.budget, charged, total),
        ...staleBudgetProblems(route.name, route.budget, total),
      ]),
    );
  }

  return { problems, measured, opened: [...opened.values()], scanned: universe.length };
}

function main() {
  const { problems, measured, opened, scanned } = routeProblems();
  for (const { entry, total } of opened)
    console.log(`  ${String(total).padStart(6)} / ${String(entry.budget).padStart(6)}  `
      + `${entry.name} (${entry.router})`);
  for (const { route, worst, total, whole } of measured)
    console.log(`  ${String(total).padStart(6)} / ${String(route.budget).padStart(6)}  `
      + `${route.name} past ${route.entry}, ${whole} whole`
      + `${route.branches ? `, worst branch ${worst?.name}` : ''}`);

  if (problems.length > 0) {
    console.error(`\ncheck-routes: ${problems.length} problem(s)\n`);
    for (const problem of problems) console.error(`  ${problem}`);
    process.exit(1);
  }
  console.log(`\ncheck-routes: ${opened.length} entr(ies) and ${measured.length} route(s) inside `
    + `their budget, over ${scanned} document(s)`);
}

if (isMainModule(import.meta.url)) main();
