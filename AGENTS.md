# Arena, for whoever changes it

Arena is Dravensoft's design system: a token layer, React and Angular component libraries built
on it, and a shared Tailwind layer. **The repository itself is not an npm package**, and its root
`package.json` is dev-only and private; what npm gets is two packages *assembled* from this tree.

**This file routes. Read only what your task needs.**

## Which job is this?

**Building something with Arena** (a screen, a prototype, a skin, an integration): read
[`skills/design/SKILL.md`](./skills/design/SKILL.md) instead. It is the root of that branch and
this file is not, and the two are almost disjoint by design.

**Changing Arena itself**: stay here. Everything below is reached through this page.

## Where each decision goes

**Most rows below are indexed by what you are changing. The first two are not**, because a
reader arriving with a symptom does not know yet what they are changing, and that is the state
this table used to have no row for.

| I am here because | Start at |
|---|---|
| something renders or behaves wrong and I do not know which layer owns it | [`contracts/behaviour/AGENTS.md`](./contracts/behaviour/AGENTS.md) when it is a role, a key, focus or dismissal, whose last section is why a defect outlives a green run; otherwise the layer, through [`frameworks/AGENTS.md`](./frameworks/AGENTS.md) |
| I do not know whether Arena already has the thing I am about to add | [`frameworks/INDEX.md`](./frameworks/INDEX.md), one line per component and which layers ship it. It belongs to the other branch and it is still the only page that answers this, so read that one line and come back; its own pointers are a builder's and not yours |
| a value: a colour, a spacing step, a duration, a delay | [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md), and [`TokenTypes.md`](./contracts/design/TokenTypes.md) for the shape it is authored in |
| what a kind of component must DO: roles, keys, focus, dismissal | [`contracts/behaviour/AGENTS.md`](./contracts/behaviour/AGENTS.md) |
| what a component PRESENTS: its members | [`contracts/api/AGENTS.md`](./contracts/api/AGENTS.md) |
| which of those three a fact belongs to | [`contracts/AGENTS.md`](./contracts/AGENTS.md), the roof |
| a component, in one layer or both | [`frameworks/AGENTS.md`](./frameworks/AGENTS.md), then that layer's own |
| how a component LOOKS | [`frameworks/tailwind/AGENTS.md`](./frameworks/tailwind/AGENTS.md) |
| what a consumer may build Arena INTO: an import, a peer, a browser global, a server render | [`frameworks/AGENTS.md`](./frameworks/AGENTS.md), the envelope section, then the layer you are editing. `check:architecture` fails a withdrawal |
| a playground's seed | [`frameworks/demos/AGENTS.md`](./frameworks/demos/AGENTS.md) |
| a script, a gate, a generator | [`scripts/AGENTS.md`](./scripts/AGENTS.md) |
| a browsable page or a specimen | [`intro/AGENTS.md`](./intro/AGENTS.md) |
| the identity document a project fills in before its first screen | [`arena-from-scratch/AGENTS.md`](./arena-from-scratch/AGENTS.md) |
| a style plugin Arena renders, or an entry a project starts from | [`plugin-style-store/AGENTS.md`](./plugin-style-store/AGENTS.md), and [`catalogue/`](./plugin-style-store/catalogue/AGENTS.md) beside it |
| a release, in the order the moves are made | [`versioning_steps.md`](./versioning_steps.md), and nothing else until it sends you there |
| the npm channel: what a package is, what CI does with it | [`frameworks/PACKAGING.md`](./frameworks/PACKAGING.md) and [`.github/workflows/AGENTS.md`](./.github/workflows/AGENTS.md) |
| documentation | this page, the two sections below it |
| I am about to write down that something is wrong | [`DOUBTS.md`](./DOUBTS.md), which says what counts as a debt and which records beat a paragraph. It is not where a bug report starts; that is the first row |

**Nothing below the table routes.** What follows binds a change on this branch whatever it is,
so it is read once and not per task.

**Whether the file in front of you is yours to edit is asked before every row rather than by one
of them**, so [`GENERATED.md`](./GENERATED.md) is read before the edit and not after the gate.

**A fresh clone builds first.** `bun install && bun run build`, or part of the tree does not
exist and every gate that reads it reports its subject missing.
[`scripts/build/AGENTS.md`](./scripts/build/AGENTS.md) is the first-compile document.

**The commands that run this repository are the scripts whose name carries no colon**, and an
agent runs the ones a page names for it: `bun run build` compiles and generates, `bun run demos`
serves the playgrounds against a built tree, `bun run test` runs the suites alone, and
`bun run check` runs every gate and the suites together. A colon narrows one of those to a single
phase, so `bun run check:docs` is one gate of that sweep. **One `bun run check` at a time**, and
[`scripts/AGENTS.md`](./scripts/AGENTS.md) says when each is expected, which of them need a
browser, and how a long run is narrowed.

## What this repo ships

Three things at once, from the same tree:

- a **Claude Code plugin**, `.claude-plugin/`, registering the `design` skill that
  `skills/design/SKILL.md` defines, **served from the git tag**;
- two **npm packages**, `@dravensoft/arena-react` and `@dravensoft/arena-angular`, assembled by
  `bun run build:packages` into `frameworks/<layer>/dist/`;
- a standalone **Agent Skill**, `skills/design/SKILL.md`.

**A published Arena carries the language and never the skin**, which is the decision the whole
npm channel follows from: the palettes and the fonts arrive as an `arena.config.json` the
consuming project writes, and the `arena-to-prod` command each package ships turns it into the one
stylesheet a package cannot carry. Two couplings are part of the adoption contract: Phosphor for
iconography, and Tailwind, whose compiled sheet both packages carry inside `arena.css`.

**`dist/` is git-ignored, and several gates skip a directory of that name**, because it puts a
copy of each layer inside the tree they walk; each asserts that exclusion in its own suite.

**Because a published tag is a promise about the tree it resolves to, history is never
rewritten**, and `git filter-repo` and every equivalent are refused outright whatever a
repository-size argument says. What a release moves, and which of those moves fails in silence
when it is forgotten, is [`.github/workflows/AGENTS.md`](./.github/workflows/AGENTS.md).

## Where a new document goes

**Each branch answers to a published convention, and neither answers to a house style.** The
consumer branch is **one Agent Skill**, and the specification it conforms to is the one at
[agentskills.io](https://agentskills.io/specification). Its root is `skills/design/`, and every
document it reaches is a reference rather than a skill: a file carrying the reserved name and no
frontmatter is not a lesser skill but a broken one, since a scanner globbing for the name reads it
as a skill that fails to parse, and globbing for a `SKILL.md` a level inside a `skills` directory
is how the npm convention finds one at all. **The contributor branch is `AGENTS.md`, and it
answers [the convention published for that name](https://agents.md)**, which fixes a file at the root of the
repository, that name exactly, plain Markdown with no required field and no schema, a page per
level resolved by proximity so the closest to the file being edited wins, and a command an agent
runs because a page listed it and only because it did. **It publishes no validator and no schema**,
so `check:agents-spec` is the whole of what holds this branch to it, and `npx agents-lint` is a
third party's second opinion rather than the standard's. The site publishes **llms.txt** and one
corpus per layer, in the order that specification fixes. `check:skill-spec` holds the consumer
branch and `skills-ref validate` is that standard's own second opinion, which is worth running by
hand: it found two defects this gate did not, and the gate grew both.

**Where Arena departs from a specification, it departs in writing**, each with the measurement
that pays for it, because a departure nobody recorded is one the next reader repairs:

- **The consumer route is four stops deep where its specification recommends one.** `check:routes`
  reports what the build route costs as four stops, and it cost half again as a flat one. The
  depth is the saving and the budget is the instrument.
- **The reference tree lives beside the code it is generated from rather than inside
  `references/`.** A prompt sits next to its component, carrying regions emitted from that
  component's contract, and a copy inside the skill directory would be a second answer to a
  question the contracts answer once.
- **This page routes where the convention's own example instructs.** A contributor route is three
  and four stops, and `check:routes` is what says what carrying the whole of it here would cost on
  every task. What stays is what an agent acts on, which is the commands.
- **`CLAUDE.md` is a real file where the migration answer is a symlink.** A symlink would answer a
  builder with the contributor branch. `DEPARTURES` in `check-agents-spec.ts` carries the reason
  and fails the day the tree stops departing that way.
- **A level is reachable by a link and not only by being nearest**, which is stricter than the
  convention rather than different from it: proximity hands an agent the closest page and hands a
  reader nothing, so `check:agents` holds every level here to a chain of links from this one.

**Two branches, and a fact belongs to exactly one.** `skills/design/SKILL.md` roots the *consumer*
branch the way this file roots the contributor one, its own route is stated there, and everything
on that route after its router is under `frameworks/`. **It reads no `AGENTS.md`**, which is why
this page names them and says not to. **`check:routes` is what holds every route to a budget**,
and `ROUTES` in `scripts/check/arena/check-routes.ts` is where the stops are declared; no document
carries the figure.

**A rule written into both branches goes stale in one of them.** The design rules a builder has to
obey are the one place that reads like an exception and is not: those are DECIDED in
`contracts/design/AGENTS.md` and HANDED OVER in `skills/design/SKILL.md`, which are two different acts and two
different readers. A third statement, restating either, is what goes stale. **Most of the
specification is not handed over at all**, because most of it decides values rather than binding a
builder: a scale a component reads and a consumer never names has one home, and `skills/design/SKILL.md` is not
it. What a consumer has to know about a value reaches them through the layer's `PACKAGE.md`, which
is where a shipped stylesheet like `css/rhythm.css` is documented.

**The question that decides the branch is who has to act on the fact**, never which directory the
code sits in. A helper under `frameworks/react/` that a consumer imports is a consumer fact; a
token under `contracts/design/` that only a generator reads is a contributor one.

**Anything a package ships needs a home on the consumer branch**: an exported symbol, a file
under `css/`, a class a consumer writes. That home is the layer's `PACKAGE.md`, which is the page
npm shows; the layer's `INDEX.md` beside it is generated and indexes components alone. **A
layer's `AGENTS.md` is neither**, because the router forbids reading it, so a shipped thing
documented only there is a thing nobody can find. Derive what ships rather than trusting a list:
`ROOT_TS` in `scripts/build/react/build-react-package.ts`, and every `copy(` in
`scripts/build/angular/build-angular-package.ts`.

**A rule binding more than one component is the router's, stated once**; a rule binding one
component is that component's `.prompt.md`, in each layer's own idiom. **A consumer document
cites no contributor one**: `check:docs` fails a prompt, or an `INDEX.md` under `frameworks/`,
naming a path under `scripts/`, an `AGENTS.md` under `contracts/` or `frameworks/`, or
`frameworks/PACKAGING.md`. The router is the one carve-out, since naming this branch is how it
redirects. **Telling a consumer to import something names the package, never a path.**

**A `description` in `contracts/api/` is layer-neutral prose that reaches every layer's generated
types.** One naming a class, a package path or a single layer's idiom is emitted into the other
layer as a sentence that is false there, with every gate green, because `check:api` compares the
two copies and never reads either for meaning. Verify with
`grep -n '<phrase>' frameworks/*/Api.generated.ts` and put the layer's half in that layer's
`.prompt.md`.

## Documentation rules

- **Every `.md` file stays under 60,000 characters**, and **an allowance is not an exemption**: a
  document holding a raised limit is still measured against it, and one that falls back inside
  the shared limit **fails as a stale allowance**, so the pressure to decompose it returns rather
  than ending. **The way a budget is bought back is always the same**: move a level's own tour
  into that level's `AGENTS.md` and leave the cross-level rule with a pointer. What spends the
  budget is a new **rule**, not a new component.
  [`scripts/check/arena/AGENTS.md`](./scripts/check/arena/AGENTS.md) says how the gate measures,
  and a document measured any other way is measured against a different number.
- **No document on this branch carries a literal count of anything**, only the command that
  produces it, with **one** exception: the gate table in `scripts/check/AGENTS.md`, whose numbers
  `check-all.test.ts` derives from `GATES` and fails when they disagree. A number an assertion
  holds is better than a command; a number nothing holds is the defect this rule exists to stop.
- **Documentation punctuates with a colon, a comma, a semicolon or a full stop, never with an em
  dash.** A dash pair enclosing an aside becomes commas, or parentheses where commas would nest;
  a dash that amplifies or introduces a list becomes a colon; a dash marking a turn becomes a
  semicolon or a second sentence. An en dash between two numbers is a range and stays. The rule
  reaches prose only, so a fence and a code span keep what the code they quote contains.
- **Documentation is written in the present tense** and describes what Arena is, never what it
  was, when a part of it arrived, or which part is newest. **No released version other than this
  one exists on the page.** Nothing says what a name used to be, what a command replaced, what an
  upgrade costs or which release moved it: a reader on this tree cannot act on any of it, and a
  reader arriving from an older one is served by the version number and by the commit log, which
  is dated and is where the history already is. A retired token, a fixed defect, a former
  directory layout and a batch number belong in that log. **The npm page is not an exception**,
  though it is the one place the argument for an exception can be made, since its reader has
  neither this tree nor that log: what they get instead is a build that refuses a name this
  version does not ship and says what it does, which is the whole of what a migration note would
  have told them and is delivered where they are rather than where they are not. The reason a rule exists is not history
  and stays: state it as a property of the thing, not as an incident.
- **A debt is written in the present tense as well, and it goes to [`DOUBTS.md`](./DOUBTS.md).**
  Anything tracked, ambiguous, or implemented only in part is stated there as what the tree
  currently is, never as what went wrong or what is left over. That page says what counts as one
  and which records beat a paragraph, and every one of those records is a present-tense claim
  that fails the day it stops being true.
- **Prose cites code as `path/to/file:member(parameters)` and never by line number**, in a document,
  a published `description` and a suite header alike. A line
  moves under the next edit and takes every citation with it in silence, while a member carries
  its own address: `scripts/utils/case.ts:kebab(name)` still resolves after the file is reordered
  around it. `check:citations` holds both halves, the path to a file that is there and the member
  to that file declaring it. **The member half is the one that goes wrong quietly**: a citation
  naming the wrong file with the right member sends a reader somewhere confident and empty, and
  nothing about the sentence carrying it looks wrong.
- **The best comment is the one not written.** A method carries its own context through its name.
  The only exception is `scripts/` and test files, which may carry **one** comment, inline or
  block, as a file header, **at most 10 lines**. Files a script generates are outside the rule
  entirely and keep their comments.
- **A contracted member's own doc is the one carve-out, and it earns it by being held.** Under
  `frameworks/<layer>/components/`, a `/** … */` above a member is exempt, because `check:api`
  fails it unless its text is that member's `description`, and fails one on anything no contract
  names. A comment a gate keeps equal to its source cannot go quietly false, which is the whole
  reason the rule exists. **That shape and no other**: a `//` or a bare `/*` there still fails, as
  does a `/** … */` outside a component directory. `generate:api` writes them, so nobody types
  one.
- Knowledge a rename cannot express, such as a measurement, a vendor's behaviour, a pinned
  version or a constraint of a test environment, goes in the one header `scripts/` and test files
  are allowed, in a gate's own reason string, or in the component's `.prompt.md`. **Somewhere a
  stale copy of it fails something.**

`bun run check:docs` holds the size rule, the punctuation rule and the comment rule, and
`bun run check:citations` holds every path that prose names to existing. **The present-tense rule
is the one no gate holds**, because nothing mechanical can judge it.

## Conventions

- **English only.** All code, comments, docs and UI copy are in English.
- **The style layer is a `style plugin`, and prose always qualifies the word.** `plugin` alone is
  the Claude Code plugin this repository ships in `.claude-plugin/plugin.json`, and `extension` is
  the DTCG vendor key `$extensions` in every token file, so both are spoken for. The config key is
  `stylePlugins` and it takes a list, because a build can carry more than one register and the
  first of them is what a page with no class on it looks like. An entry is the word `default`,
  meaning the sheet each package assembles, or a path to a directory of the project's own holding
  `plugin.tokens.json`, and a plugin is named by that directory.
- **Specs and implementation plans live under `docs/superpowers/`** (`specs/`, `plans/`), dated
  `YYYY-MM-DD-<name>.md`. **A spec written ahead of its plan carries a `-pending-N` suffix until
  that plan exists**, because an unsuffixed spec sitting in `specs/` reads as work in flight;
  drop the suffix when the plan lands. **They are deleted once executed**, which is why debt filed
  in one dies with it, and why a document citing one is a citation that was condemned when it was
  written.
- **The design rules themselves are not here.** No gradients, no emoji, danger as an outline, one
  primary accent, a chart carrying identity or meaning: every one of them is decided in
  [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md) and handed to a builder by
  [`skills/design/SKILL.md`](./skills/design/SKILL.md). A third copy on this page is the one with
  no owner, and it is the copy that goes stale: the two that are left each fail something, the contract through
  `check:style-plugin` and the router through `check:docs`, while a router's restatement fails
  nothing at all. **The one rule about them that IS this page's**, because it binds a contributor
  and no consumer: a rule binding more than one component is stated once and never copied into a
  second document that happens to be nearby.
- **A commit message containing a backtick is written with a quoted here-doc**, never
  `git commit -m "…"`. A backtick inside a double-quoted shell string opens command substitution
  and is silently spliced away: the message lands with the name it was quoting missing, and
  nothing errors. Use `git commit -q -F - <<'MSG' … MSG` and verify with `git log -1 --format=%B`.
  **`git merge` does not accept `-F -`**, so use `--no-commit`, then commit.
- Responsive branches are JS, not media queries, and measure the **container**: a media query can
  only ask about the viewport.
- **A wait is for a condition, and the span beside it is a deadline rather than a schedule.** A
  duration is a statement about the machine that measured it, so a wait spelled as one is right
  where it was written and silently wrong everywhere else: it expires early and reports the
  subject as absent, which sends a reader into the component that has no defect. Every deadline is
  declared with `deadline(name, ms, why)` in the file that owns the wait, never as a bare number
  and never in a table beside it. A suite's budget is derived with `budgetFor(...)` from the
  deadlines its case can spend, because a budget under one of them abandons the callback with its
  subject still running, and every file loaded afterwards then reports an error naming neither.
  `bun run check:deadlines` holds both: that no bare span sits in a wait position, and that a
  budget names every deadline its own import closure declares.

## Debt

**A debt is paid, or made loud, before it is written down.** [`DOUBTS.md`](./DOUBTS.md) states
what counts as one and where the records that are not prose live: a reason-carrying map beside
its gate, a suite assertion, a normative `AGENTS.md`, a component's `.prompt.md`. Prefer any of
those to a paragraph: each of them fails when it stops being true, and a paragraph does not.

**A claim about a file you have not READ is how a document goes quietly false**, and "I grepped
it" is not sufficient evidence, because a query answers where a name appears and never what the
file around it says. [`DOUBTS.md`](./DOUBTS.md) has the three shapes that recur, none of them
findable by a keyword query, and the change-time greps that surface them.
