# Arena, for whoever changes it

Arena is Dravensoft's design system: a token layer, React and Angular component libraries built
on it, and a shared Tailwind layer. **The repository itself is not an npm package**, and its root
`package.json` is dev-only and private; what npm gets is two packages *assembled* from this tree.

**This file routes. Read only what your task needs.**

## Which job is this?

**Building something with Arena** (a screen, a prototype, an integration): read
[`SKILL.md`](./SKILL.md) instead. It is the root of that branch and this file is not, and the
two are almost disjoint by design.

**Changing Arena itself**: stay here. Everything below is reached through this page.

## Where each decision goes

| I am changing | Start at |
|---|---|
| a value: a colour, a spacing step, a duration, a delay | [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md), and [`TokenTypes.md`](./contracts/design/TokenTypes.md) for the shape it is authored in |
| what a kind of component must DO: roles, keys, focus, dismissal | [`contracts/behaviour/AGENTS.md`](./contracts/behaviour/AGENTS.md) |
| what a component PRESENTS: its members | [`contracts/api/AGENTS.md`](./contracts/api/AGENTS.md) |
| which of those three a fact belongs to | [`contracts/AGENTS.md`](./contracts/AGENTS.md), the roof |
| a component, in one layer or both | [`frameworks/AGENTS.md`](./frameworks/AGENTS.md), then that layer's own |
| how a component LOOKS | [`frameworks/tailwind/AGENTS.md`](./frameworks/tailwind/AGENTS.md) |
| a playground's seed | [`frameworks/demos/AGENTS.md`](./frameworks/demos/AGENTS.md) |
| a script, a gate, a generator | [`scripts/AGENTS.md`](./scripts/AGENTS.md) |
| a browsable page or a specimen | [`intro/AGENTS.md`](./intro/AGENTS.md) |
| the npm channel, or a release | [`frameworks/PACKAGING.md`](./frameworks/PACKAGING.md) and [`.github/workflows/AGENTS.md`](./.github/workflows/AGENTS.md) |
| documentation | this page, the two sections below it |
| nothing yet, and something looks wrong | [`DOUBTS.md`](./DOUBTS.md), which says what counts as a debt and where the records live |

**A fresh clone builds first.** `bun install && bun run build`, or part of the tree does not
exist and every gate that reads it reports its subject missing.
[`scripts/build/AGENTS.md`](./scripts/build/AGENTS.md) is the first-compile document.

## What this repo ships

Three things at once, from the same tree:

- a **Claude Code plugin**, `.claude-plugin/`, registering the `design` skill the root
  `SKILL.md` defines, **served from the git tag**;
- two **npm packages**, `@dravensoft/arena-react` and `@dravensoft/arena-angular`, assembled by
  `bun run build:packages` into `frameworks/<layer>/dist/`;
- a standalone **Agent Skill**, `SKILL.md`.

**A published Arena carries the language and never the skin**, which is the decision the whole
npm channel follows from: the palettes and the fonts arrive as an `arena.config.json` the
consuming project writes, and the `arena-to-prod` command each package ships turns it into the one
stylesheet a package cannot carry. Two couplings are part of the adoption contract: Phosphor for
iconography, and Tailwind, whose compiled sheet both packages carry inside `arena.css`.

**`dist/` is git-ignored, and several gates skip a directory of that name**, because it puts a
copy of each layer inside the tree they walk; each asserts that exclusion in its own suite.

**A release moves five things, and the tag is the one the other four are pinned to.** The version
lives in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and the README's
artifact list; because the plugin is served from the tag, `source.ref` must name it and the tag
must exist on the release commit. **Forgetting the `ref` fails silently**: the marketplace
advertises a new version while Claude Code keeps fetching the old tag and resolves the old
version, so nothing errors and the update is never offered. `bun scripts/check/arena/check-release.ts`
is what refuses that combination. **Because a published tag is a promise about the tree it
resolves to, history is never rewritten**, and `git filter-repo` and every equivalent are
refused outright whatever a repository-size argument says.

## Where a new document goes

**Two branches, and a fact belongs to exactly one.** `SKILL.md` roots the *consumer* branch the
way this file roots the contributor one. The cost of the consumer branch is paid on every build:
an agent building with Arena reads the router, where it picks the voice, then its own layer's
`SKILL.md`, then one component's `.prompt.md`, and reaches `contracts/api/components/` only for
the reasoning behind a member. **Everything on that route after the router is under
`frameworks/`**, and each stop narrows. It reads no `AGENTS.md`, which is why the router names
them and says not to. `frameworks/SKILL.md` sits beside that route rather than on it: it answers
whether a component exists at all and which layers ship it, which is a question a builder who
knows what they are reaching for never asks. **`check:routes` is what holds the route to a
budget**, and `ROUTES` in `scripts/check/arena/check-routes.ts` is where the stops are declared;
no document carries the figure.

**A rule written into both branches goes stale in one of them.** The design rules are the one
place that reads like an exception and is not: they are DECIDED in `contracts/design/AGENTS.md`
and HANDED OVER in `SKILL.md`, which are two different acts and two different readers. A third
statement, restating either, is what goes stale.

**The question that decides the branch is who has to act on the fact**, never which directory the
code sits in. A helper under `frameworks/react/` that a consumer imports is a consumer fact; a
token under `contracts/design/` that only a generator reads is a contributor one.

**Anything a package ships needs a home on the consumer branch**: an exported symbol, a file
under `css/`, a class a consumer writes. That home is the layer's `PACKAGE.md`, which is the page
npm shows; the layer's `SKILL.md` beside it is generated and indexes components alone. **A
layer's `AGENTS.md` is neither**, because the router forbids reading it, so a shipped thing
documented only there is a thing nobody can find. Derive what ships rather than trusting a list:
`ROOT_TS` in `scripts/build/react/build-react-package.ts`, and every `copy(` in
`scripts/build/angular/build-angular-package.ts`.

**A rule binding more than one component is the router's, stated once**; a rule binding one
component is that component's `.prompt.md`, in each layer's own idiom. **A consumer document
cites no contributor one**: `check:docs` fails a prompt, or a `SKILL.md` under `frameworks/`,
naming a path under `scripts/`, an `AGENTS.md` under `contracts/` or `frameworks/`, or
`frameworks/PACKAGING.md`. The root `SKILL.md` is the one carve-out, since naming this branch is
how it redirects. **Telling a consumer to import something names the package, never a path.**

**A `description` in `contracts/api/` is layer-neutral prose that reaches every layer's generated
types.** One naming a class, a package path or a single layer's idiom is emitted into the other
layer as a sentence that is false there, with every gate green, because `check:api` compares the
two copies and never reads either for meaning. Verify with
`grep -n '<phrase>' frameworks/*/Api.generated.ts` and put the layer's half in that layer's
`.prompt.md`.

## Documentation rules

- **Every `.md` file stays under 60,000 characters.** `SIZE_EXEMPT` in `check-docs.ts` names
  what is exempt by charter, and `SIZE_ALLOWANCE` beside it names what holds to a **higher**
  limit instead, with its reason. **An allowance is not an exemption**: the document is still
  measured, and one that falls back inside the shared limit **fails as a stale allowance**, so
  the pressure to decompose it returns rather than ending. Measure the way the gate does, with
  `node -e "console.log(require('fs').readFileSync('X','utf8').length)"`, and never with `wc -m`,
  which counts bytes: a file of multi-byte characters reads hundreds over a limit it is
  comfortably under. **The way a budget is bought back is always the same**: move a level's own
  tour into that level's `AGENTS.md` and leave the cross-level rule with a pointer. What spends
  the budget is a new **rule**, not a new component.
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
  directory layout and a batch number belong in that log. The reason a rule exists is not history
  and stays: state it as a property of the thing, not as an incident.
- **A debt is written in the present tense as well, and it goes to [`DOUBTS.md`](./DOUBTS.md).**
  Anything tracked, ambiguous, or implemented only in part is stated there as what the tree
  currently is, never as what went wrong or what is left over. That page says what counts as one
  and which records beat a paragraph, and every one of those records is a present-tense claim
  that fails the day it stops being true.
- **A document cites code as `path/to/file:member(parameters)` and never by line number.** A line
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

`bun run check:docs` holds the size rule, the punctuation rule and the comment rule, reading both
by **lexing** rather than by matching: a `//` inside a string, a regex or a template literal is
never mistaken for a comment, a `@ts-`/`eslint-` directive is a directive rather than the file's
one allowance, and a Markdown fence closes only on a run of its own character at least as long as
the one that opened it. `bun run check:citations` holds every path a document names to existing.
**The present-tense rule is the one no gate holds**, because nothing mechanical can judge it.

## Conventions

- **English only.** All code, comments, docs and UI copy are in English.
- **Specs and implementation plans live under `docs/superpowers/`** (`specs/`, `plans/`), dated
  `YYYY-MM-DD-<name>.md`. **A spec written ahead of its plan carries a `-pending-N` suffix until
  that plan exists**, because an unsuffixed spec sitting in `specs/` reads as work in flight;
  drop the suffix when the plan lands. **They are deleted once executed**, which is why debt filed
  in one dies with it, and why a document citing one is a citation that was condemned when it was
  written.
- **The design rules themselves are not here.** No gradients, no emoji, danger as an outline, one
  primary accent, a chart carrying identity or meaning: every one of them is decided in
  [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md) and handed to a builder by
  [`SKILL.md`](./SKILL.md). A third copy on this page is the one with no owner, and it is the copy
  that goes stale: the two that are left each fail something, the contract through
  `check:extensions` and the router through `check:docs`, while a router's restatement fails
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

**A claim about a file you have not READ is how a document goes quietly false.** "I grepped it"
is not sufficient evidence, because a query answers where a name appears and never what the file
around it says. Three shapes recur, and none is findable by a keyword query:

- **A document describing ITSELF**: one naming its own directory layout, a clause excluding a
  path that a move has since merged into the path two sentences above it. Only an end-to-end read
  finds these.
- **A component name written into ANOTHER file's prose**, which rots while every gate stays
  green. A *structural* reference is fine and should not be hunted, meaning this component's own
  render naming what it draws. What rots is a citation asserting **another** component's current
  state.
- **A sibling cited by its bare filename**, which a refactor rewrites in every import specifier
  and nowhere in a sentence.

When you change component `X`, read every hit of:

```bash
X=ArenaSkeleton   # the component you just changed
grep -rn --binary-files=without-match "\b$X\b" \
    --include='*.md' --include='*.json' --include='*.mjs' --include='*.tsx' --include='*.ts' \
    AGENTS.md DOUBTS.md contracts/ docs/ frameworks/ scripts/
```

Drop by hand the hits under `X`'s **own** files. **Scope a worklist by its path list and never by
piping `grep -n` through `grep -v`**: `-n` prints `path:line:CONTENT`, so a filter after it drops
hits by their *text*, which silently excludes any directory whose name the filter happens to
match.

**Prefer no exemplar, or a command.** Both are stale-proof, and a component name in prose is not.
