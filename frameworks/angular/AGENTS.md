# Arena, the Angular layer

> **For whoever works on this layer.** Building an app with it instead? Read [`PACKAGE.md`](./PACKAGE.md) to install it,
> [`INDEX.md`](./INDEX.md) to find a component, and that component's `.prompt.md` to use it.

**Published as `@dravensoft/arena-angular`.** [`PACKAGE.md`](./PACKAGE.md) is what a consumer
reads, and the assembly copies it into `dist/` as the package README;
[`../PACKAGING.md`](../PACKAGING.md) is how the package is built and what it leaves out.

Arena for an Angular and Tailwind v4 app, in two kinds of artifact: the components this layer
draws, and the files beside them that carry the theme, the icon map and the CDK bridge. The
versions it is built and typechecked against are the ones `package.json` pins.

## This layer stands on the contracts alone

**It names no other framework layer and imports from none.** What a component is and
what members it presents is `contracts/api/components/<Name>.json`; what it must do is
`contracts/behaviour/`; what a value is, `contracts/design/`. Styling is no exception, which it
would be if a `<Component>.variants.ts` reached four directories up into `frameworks/tailwind/`
for a manifest and a recipe: the class names a component composes are emitted into this layer
beside the component, the way the contract types and the script tokens are. `bun run check:layer-independence` holds it, and `ALLOWED` is empty.

**Beside the components, the files that carry the theme, the icons and the CDK bridge:**
- `theme/arena-tailwind.css`: one import that pulls Arena's tokens (including the self-hosted
  fonts declared in `contracts/design-generated/fonts.generated.css`, binaries in `assets/fonts/`)
  plus the shared `frameworks/tailwind/Theme.css` `@theme` preset into scope. It reaches those
  through repository paths, so its readers are here and not in a consuming project.
- `theme/arena-cdk.css`: the `@angular/cdk` overlay's structural stylesheet, re-based onto
  Arena's `--z-*` scale, needed once the app uses a primitive that positions itself with
  `@angular/cdk/overlay`. The file states why the container's z-index is overridden and why
  the four other hardcoded ones are left alone. **It is verified against the installed
  `@angular/cdk`; read [CDK bridge](#cdk-bridge-supported-and-verified) for what that
  means and what it does not.**
- `icons/IconManifest.ts`: the canonical Phosphor role→glyph map.

**The files under `theme/` keep their lowercase names, and they do not share one reason.**
`arena-cdk.css` is named **inside an adopter's own source, verbatim**, as
`@dravensoft/arena-angular/css/arena-cdk.css`: the assembly copies it under that name and the npm
page tells a reader to `@import` it, so the lowercase stem is load-bearing outside this tree.
**`arena-tailwind.css` and `no-fouc.html` are not instances of that, and neither reaches an
adopter at all**: the assembly copies neither, `arena-tailwind.css` imports this repository's own
`intro/styles.css` and so resolves nowhere else, and the pre-paint script a consumer pastes is
carried inline on the npm page rather than read from here. **Nothing in this tree imports
`arena-tailwind.css` either**, which makes it a file with no reader on either side. **Not
exempt:** `theme/ArenaThemeService.ts` and `icons/IconManifest.ts` are reached through
`frameworks/angular/index.ts`, which no adopter writes.

- `theme/ArenaThemeService.ts` and `theme/no-fouc.html`: the signal theme service and the
  pre-paint snippet. It switches between **any number of named palettes**, because a
  consumer's `arena.config.json` declares as many as they like: the default palette sits on
  `:root` and wears no class, and every other one wears `.arena-<name>`. Declare them with
  `provideArenaThemes({palettes, default})`; with no providers it answers `dark` and
  `light`, which is what an adopter on the package has. `set()` **throws** on a name no
  palette declares, since a silently ignored theme switch looks like a broken toggle.

**Primitives are Arena's own token-styled components**, and the whole of this layer's
rendering surface: Arena writes the markup, the ARIA and the styling for every control it
ships, so every one of them is in reach of `check:dimensions`, `check:tailwind`,
`check:compliance` and the Angular arm of `check:api`, where a control drawn by somebody
else's library is in reach of none of them. Each lives in
`components/<category>/<component-kebab>/` and is a
quartet: `<Component>.ts` (standalone, `OnPush`, signal I/O, `arena-` selector),
`<Component>.variants.ts` (the class-name table, composed by the shared `arenaStyles`),
`<Component>.prompt.md` (usage and Do/Don't), and an `index.ts` barrel.
`components/display/arena-tag/` is the
reference shape. **A directory with no `<Component>.variants.ts` is one of two declared cases
rather than one**; derive the set rather than trusting a list here:

```bash
comm -23 <(find components -mindepth 2 -maxdepth 2 -type d -printf '%f\n' | sort) \
         <(find components -name '*.variants.ts' -printf '%h\n' | xargs -n1 basename | sort)
```

A chart that draws geometry has no recipe at all, for the reason below. **A compound family's
children have none either, because they import the parent's**: each `ArenaSideNav*` child imports
`arenaSideNavStyles` from `side-nav/ArenaSideNav.variants`, which is the recipe mirror of the rule
`frameworks/tailwind/AGENTS.md` states for manifests, that a manifest mirrors a *surface* and a
family draws one. The category is the one
`frameworks/Components.json` declares, and the file-naming rule is the repo-wide one
`frameworks/AGENTS.md` states: directories kebab-case, file names capital-initial. Each component's
own tests sit in that same directory as `<Component>.<facet>.test.ts`.

**A primitive whose native element carries the semantics is an attribute on that element, not an
element of its own.** The default is an element selector, `arena-x`; the exception is decided by one
question and not by taste: would wrapping the native element in `<arena-x>` break what the element
means? It does whenever the element is only itself as a **DOM child** of a particular parent, which
is every internal table element -- `display: contents` fixes the box tree and not the DOM tree, and a
server render makes it worse rather than better, because the markup is serialized and re-parsed and
the HTML parser foster-parents a non-table element straight out of the table. So `ArenaTableRow` is
`tr[arena-table-row]` and `ArenaTableCell` is `td[arena-table-cell]`, the prefix is unchanged, and the
role the element already maps to is not written back onto it. Two consequences travel with the shape.
An **output named after a native DOM event cannot be listened to from the `host` block**: the listener
is wired to that output and `emit()` re-enters its own handler, so the listener is added to the host
element in the constructor, which also puts it ahead of the one Angular adds for the consumer's
binding and lets `stopImmediatePropagation()` refuse the duplicate. And **the demo emitters read the
declared selector** from the layer's own source, so a tag opens with its element and its hook and
closes with the element alone, with nothing to list anywhere.

**A compound family pushes nothing, so its recursive case costs no helper.** `ArenaSideNav` nests to
any depth because each container re-provides `ArenaSideNavState` at `depth + 1` and a row **pulls**
the nearest, which is the whole mechanism: an item reads its own indent from the injector rather
than being handed one. A consumer's own wrapper component between two levels is therefore
harmless here, since it interrupts nothing that travels. **The coordination is a member of no
contract**, the way `ArenaTable`/`ArenaTableRow` and `ArenaRadioGroup`/`ArenaRadio` are not.

The layer spans every category the layout rule allows: `brand`, `charts`, `display`,
`feedback`, `forms`, `layout` and `navigation`. **Read the set from the tree
rather than from a list here**, because a list here rots and nothing checks it:
`find frameworks/angular/components -mindepth 2 -maxdepth 2 -type d | sort`, and count it
with the same command piped to `wc -l`.

**A chart that draws geometry is the declared exception to having a MANIFEST**, and a missing
chart manifest is a decision rather than an omission: a chart's visual identity is path data and
attribute bindings, not class strings, so it has no recipe of its own and none to inherit either.
`HAND_DRAWN` in `scripts/lib/tailwind/manifest-surfaces.ts` is the roster, held by
`check:appearance`, and every entry there is a chart. They style themselves with token-valued
style **objects**, meaning the camelCase
`[style]` form, never a kebab-case string or attribute, because that is the only shape
`check:dimensions` can actually read. `chart-card` is not one of them: it is a bordered
tile with a microlabel, so it has a manifest like every other expressible component.

Some files at the layer root are not components, and each sits at the narrowest level that
contains all of its consumers rather than in one shared bucket. **List them rather than trusting
this paragraph**, with `ls *.ts | grep -v generated`; what follows is why the interesting ones
are where they are:
`ContainerSize.ts` (the host element's width as a signal, plus `arenaReadBreakpoint`, which **warns
once per name when a breakpoint token does not resolve and never caches the failure**: every
comparison against `NaN` is false, so a silent one leaves `ArenaTable`, `ArenaCalendar` and `ArenaPageHead` on
their wide branch on a phone with nothing reported, plus `forgetArenaBreakpoints`, which drops what
was cached for the two callers that need it, a document that swapped its stylesheet at runtime
and a suite whose subject is the cache, and `arenaViewportBelow`, below),
`AnchorActivation.ts` (the predicate behind the anchor convention: an anchor Arena draws cancels
a primary click with no modifier and reports through its own navigation event, and everything
else is the browser's, which `ArenaCard`, `ArenaBreadcrumbs`, `ArenaSideNavItem` and `ArenaCommandPalette` all read
and `test/AnchorActivation.test.ts` holds one activation at a time),
`FocusTrap.ts` (the shared overlay focus trap, generalized out of `confirm-dialog` and
used by it, `command-palette` and `onboarding`) and `ProjectionMarkers.ts` (the `[action]`,
`[actions]`, `[brand]` and `[footer]` marker directives that let a component
detect whether an optional slot was projected, so its spacing wrapper can be gated, each
bare with no `arena-` prefix, because the attribute is the contract member's
name, per `contracts/api/AGENTS.md`'s binding table) all have consumers in more than one category,
so they sit at the layer root and `frameworks/angular/index.ts` names each of them
directly. `ProjectedInputs.ts` sits there too and is the one root module `index.ts` does **not**
name: `arenaPublished` is the single answer to the ordering law below, [A projected child's inputs
are not readable while a sibling is
rendering](#a-projected-childs-inputs-are-not-readable-while-a-sibling-is-rendering), and it is
wiring between a component and its own projected child rather than anything an adopter stands
between; `test/Barrels.test.ts` carries the reason in `ROOT_PRIVATE`. `DataVisuals.ts` (the identity-or-meaning colour contract, the number writer and the
axis domain) sits at the layer root beside them, and the rule puts it there in both layers now:
its consumers are every chart **and** `arena-calendar-event`, which reads `arenaCatColor` for a
chip's identity colour. The name matches the placement: a module a schedule grid consumes is
not "chart internals". The geometry that only the charts read went the other way, down to
`components/charts/`, and `frameworks/AGENTS.md` records why.

`kitchen-sink/<arrangement>/` is emitted, never written: one page per arrangement holding
every component at once, arranged in `frameworks/kitchen-sink/` and emitted into every layer
from there. Its whole purpose is that the pages a single arrangement gets differ in what mounts
them and in nothing else, so `check:pixel-parity` can capture them and fail on one differing
pixel. Edit the arrangement, never the page.

`playground/` sits beside them and never ships either: the package
build stages nothing under it and `index.ts` names none of it. It holds the harness every
generated demo page mounts, `Playground.ts` for the panel and the event log and
`PlaygroundState.ts` for the store behind them. Its classes are `intro/playground.css`'s, which
sits outside every layer so each harness draws the same frame from the same bytes, and a
difference seen between two layers is then a difference in the component rather than in the
furniture around it.

**`PlaygroundCodec.generated.ts` beside them is a copy, not a source.** What a knob holds,
whether it is bound and how both round-trip through a query string is authored once in
`frameworks/demos/PlaygroundCodec.ts` and emitted into every layer, because two hand-written
copies of `decode()` that drift render the **same URL** differently in each layer, which is the
one failure the arrangement exists to prevent and the one nothing else would catch: each layer
would compile, each suite would pass, and only a person holding two pages side by side would
see it. `check:playgrounds` holds each copy to the source and to the other copy.
`Playground.test.ts` asserts the codec again here rather than trusting the other layer's suite,
because this copy is what this layer compiles.

**`arenaViewportBelow(name)` answers the other half of the breakpoint question, and it is a
different question.** `arenaContainerWidth` measures a box, which is what a component needs, because
a component may be rendered anywhere and the viewport says nothing about how much room it was
given. `arenaViewportBelow` measures the viewport, which is what a page layout needs and what an app
writing CSS in a `styles:` block cannot get any other way: a media query condition holds no
`var()`, so the threshold cannot be named from a stylesheet at all. It returns a signal over
`not all and (min-width: N)`, the exact complement of the `md:` variant rather than a
`max-width` an epsilon short of it, and it warns through the same `arenaReadBreakpoint` when the
token does not resolve. **Reach for it for a page's own layout and never for a component's**: a
component that branches on the viewport is wrong the first time somebody puts it in a narrow
column.

**One component exposes a method, and it is the only one.** `arena-input` has `focus()` and
`select()`, because none of the nine contract forms is imperative and returning focus after each
completed transaction is what lets a till chain sales without the mouse; `autoFocus` fires once
at mount and answers a different question. `IMPERATIVE_HANDLES` in
`scripts/lib/arena/api-surface.ts` is what lets `check:api` read a public method on a component
class at all, it names these two and no others with a reason each, and any other public method
still fails the gate as an undeclared surface.

A primitive defines no styling of its own. Its appearance is authored one layer over, as
`frameworks/tailwind/components/<category>/<component-kebab>/<Component>.manifest.json`, and
compiled from there into a stylesheet and a table of the class names that stylesheet defines.
The TABLE is emitted into THIS layer, beside the component, so nothing here imports across a
boundary. The stylesheet is not: it is the same bytes whoever renders it, so it exists once,
under `frameworks/tailwind/consume/`, and a page links it there rather than carrying a copy
that can go stale while the gates read another one.

```ts
import { arenaStyles } from '../../../ArenaStyles.generated';
import manifest from './ArenaTag.classes.generated';

export const arenaTagStyles = arenaStyles(manifest);
```

The import is extensionless and names a stem nothing else claims. An extensionless import of
`ArenaTag.classes` would resolve to the `.ts` **only because** TS and bun probe `.ts` before
`.json`, so a bundler configured `.json`-first could resolve something else entirely. The
`.generated` infix is what removes the ambiguity, and it says the same thing to a reader: this
file is written by `bun run build:tailwind` and editing it is editing the wrong file.

## Conventions

Standalone (no `NgModule`), `OnPush`, `input()`/`output()`/`model()`, `inject()`
for DI, capital-initial filenames with no type suffix, `arena-` selector prefix, no
component `styles` (recipe owns styling), no comments beyond one JSDoc line,
barrels with no `../` imports inside the layer. Dark-first (`.arena-light` for
light). Danger is outline. Icons are Phosphor (Bold default). No gradients, no emoji.

## What Arena implements

Parity here is parity of **outcome**, not of inventory: a consumer of this layer can build
every interface `frameworks/Components.json` declares a component for, and builds all of it
from Arena's own primitives. No control in this layer is delegated to a third-party component
library.

**There are no exceptions left, and `BehaviourDelegated.json` is the only trustworthy
statement of that**: `check:behaviour` fails the moment a component this layer lacks goes
unrecorded, where a list written here would rot in silence. **The file does not exist**,
because this layer implements every component `frameworks/Components.json` declares. The
mechanism stays regardless, so the next component this layer lacks fails loudly until it is
written down there binding `absent`.

**Arena writes the markup, the ARIA and the styling, and `@angular/cdk` supplies only what
Arena should not hand-roll**: overlay positioning for a surface anchored to a trigger, and
the roving-focus key managers. Focus trapping stays Arena's own `FocusTrap.ts`, which implements
`contracts/behaviour/dialog-modal.json` for this layer, and `arena-dialog` consumes it rather
than `cdk/dialog`.

**The CDK earns its place on an anchored surface and nowhere else, so count its users rather
than assuming.** `grep -rl "@angular/cdk/overlay" frameworks/angular/components` is the answer;
a modal centres in flow and a toast is a card the host places, and neither goes near an overlay.
A styled **native** control does not either: `arena-select` is a real `<select>`, so the popup,
its keyboard and its type-ahead are the user agent's.

**Writing the control is what puts it inside the gates, and that is the standard every
component here meets.** A component whose DOM and CSS belong to somebody else sits outside
`check:dimensions` and `check:tailwind`, because a compiled third-party stylesheet is
invisible to both; outside `check:compliance`, because there is no Arena render to verify;
and outside the Angular arm of `check:api`, which skips a contract no layer implements
there. A primitive is inside every one of them the day it is written, which is the whole of
the argument: a control Arena does not write is a control no gate here can read.

### CDK bridge: supported and verified

**`@angular/cdk` is a declared dependency rather than an optional one**, and it is the only
package a primitive's own source imports besides `@angular/core`; measure it rather than
trusting this, with `grep -rho "from '@[a-z@/-]*'" --include='*.ts' --exclude='*.test.ts'
--exclude='*.demo.entry.generated.ts' frameworks/angular/components/ | sort -u`. A primitive that
positions an overlay imports it, so it is pinned in the root `package.json` at an exact
version, and the app must import `theme/arena-cdk.css` once.

**The bridge is verified, not rendered.** `bun run check:cdk` reads the bridge with
`scripts/lib/arena/css-decls.ts` and asserts that every Arena token it references exists and that
every `cdk-*` class it overrides is one the installed `@angular/cdk` really defines. It
checks the **selectors** as well as the values, which it can because
`@angular/cdk/overlay-prebuilt.css` ships installed and is the oracle: a class renamed
upstream leaves the override matching nothing, and that is decidable against the sheet. It
also carries four zero-result guards (no rule, no `cdk-*` class, no `var()`, no `@import`)
so a bridge that has stopped being a bridge cannot pass by having nothing left to check.

**What the gate does not cover** is whether an override's *value* is the right one for the
class it lands on: the gate reads names and selectors, never paint, so only a real render
catches that. `ArenaTooltip.demo.generated.html` and `ArenaMenu.demo.generated.html` are that render: both open a real CDK
overlay in a real browser, which is where a z-index that stacks wrongly is visible at all.
`check:cdk` fails the moment the bridge and the installed package disagree.

## Verifying the layer

`bun run check:angular` compiles every primitive with `ngc` under `strictTemplates`
(`tsconfig.check.json`), and it reaches a primitive **through the barrel**, so a
primitive missing from its own `index.ts`, its category's, `components/index.ts` or the
layer's `index.ts` is not typechecked, and no adopter can import it from the layer root
either. `test/Barrels.test.ts` walks that chain and fails on a gap; what a barrel
deliberately withholds is named in its `PRIVATE`/`ROOT_PRIVATE` maps with a reason each,
under the same bidirectional staleness rule the other records carry. Each manifest-backed
primitive also has a static specimen at
`frameworks/tailwind/components/<category>/<component-kebab>/<Component>.card.html`,
which renders the real markup
with the real recipe and no Angular executed. A specimen therefore proves the *recipe*,
never the *component*: it hand-builds the DOM from the manifest, so a component-logic
bug can render correctly in the card while being broken in the primitive. A chart drawing
geometry has no specimen at all, by the same exception that gives it no manifest.

**What proves the component is a demo page, and there is one per primitive rather than one per
primitive that earned it.** `<Component>.demo.generated.html` beside the component runs the real
primitive in a real browser, which is where motion, focus rings and layout live, none of them
observable in happy-dom. It is generated from the component's API contract and its
`frameworks/demos/` fixture into this layer and into every other, so the page for a component
differs from another layer's by one path segment and takes the same query string. That is what
makes a difference between two pages a difference in the component.
`bun run demos` builds the pages and serves them; the build is `bun run build:angular-demo`,
two steps because neither tool does the other's job: `ngc -p tsconfig.demo.json` compiles the
templates AOT, and `Bun.build` bundles that output for a browser, one shared Angular chunk
across every page. An entry imports `@angular/compiler` because `@angular/*` ships partially
compiled and its injectables need the JIT fallback; without it the page throws before mounting.

The bundle is git-ignored build output, which is why **no Angular page declares `@dsCard`**:
on a fresh clone the page renders blank. `check:angular-demos` is the portable gate instead: it needs no browser and no
bundler, and it holds the three lines without which a page mounts nothing and says nothing. It
carries **no coverage list**, because the inventory is the component tree: every component has
a page, so a page cannot go missing and a list cannot go stale.

**`check:angular-demos` is structural only**, and the distinction is what the pages are for: it
proves a page exists, loads its own bundle and mounts a zoneless app, never that what it renders
is right. What the pages catch is what a suite cannot. A carve-out host that blockifies as a flex item
leaves an inner button's `w-full` measuring the shrunk host rather than the row, so a `full`
variant renders as nothing at all, and happy-dom has no layout to see it.
**A checklist line a real browser can decide belongs in a gate rather than in a checklist**,
which is what `check:focus-trap` took over for the one it covers. What is left for a
person is what needs their **judgement**: whether a name is a good name, whether motion reads as
intended, whether a colour carries the meaning it should. A green `bun run check` says nothing
about whether anyone did that.

## A projection marker the consumer forgets to import drops the whole slot in silence

Every gated `<ng-content select="[x]">` is paired with a `contentChild(ArenaX)` from
`ProjectionMarkers.ts`, because that query is the only way an `ng-content` slot can report
whether anything was projected. The query resolves the **directive**, so it finds nothing unless
the consumer's own component lists `ArenaX` in its `imports`, and with the query null the `@if`
never renders, the `<ng-content>` is never instantiated, and the projected content vanishes. No
error, no warning, no failing gate: `ngc --strictTemplates` is happy, because a bare `footer`
attribute on a `<div>` is valid HTML whether or not a directive matches it. Only opening a page
finds it.

**The component still cannot detect it**, because it cannot distinguish "the marker was not imported"
from "nothing was projected", which is the case the query exists for. What is checked is every
consumer *inside this repository*: `test/ProjectionMarkers.test.ts` walks the layer, pairs each
marker use with the **nearest enclosing** `arena-*` element, and fails when that host gates the
slot by a `contentChild` query and the consumer does not import the directive. Two refinements answer real false
positives and both make the rule more honest: marker words inside an
**attribute value** are stripped before matching, and a slot gated by an **input** rather than by
a query owes no import. The real rule is *"you projected into a slot whose host gates it on a
query"*, not *"you used a marker attribute"*, and the nearest-enclosing walk is what expresses
it, since `contentChild` reaches direct content only.

**What stays uncovered is every consumer outside this repository.** A gate here cannot reach an
adopter's app; it can only stop Arena's own pages from shipping the example.

## A projected child's inputs are not readable while a sibling is rendering

**A parent may not read a projected child's input from a computation that a CHILD's own render can
pull.** `ɵɵrepeater` creates every embedded view of a `@for` before any of them updates, so the
parent's `contentChildren` query is already full while only the first child's bindings have run.
Reach for a sibling from there and a **required** input throws NG0950, which takes the whole
change-detection pass with it: every `[class]` binding in the parent's template goes unapplied and
the component renders as bare unstyled elements. An **optional** input is worse, because it reads as
its default and nothing says so.

The shape is easy to write and invisible from here. A `placed` that maps `chips()` through
`chip.id()` reads a projected child's input from the parent, and a consumer writing their events
the way a list is written gets a toolbar, no grid, no chips and no styling, out of one thrown
error no fixture in this repository is positioned to see.

**The child publishes; the parent never pulls.** `arenaPublished` (`ProjectedInputs.ts`) is the one
spelling: called in the child's own injection context, its effect runs during the CHILD's change
detection, where that child's inputs are set. The parent reads a plain signal, gets `null` for a
child that has not published yet, and skips it: a value it can survive rather than an exception it
cannot. The write happens during the tick, so the views that read it are marked dirty and Angular
runs them again: the cost is a second pass over the family, not one per child, and the DOM it
settles on is the one a static fixture produces. `effect()` and not `afterRenderEffect()`, because
afterRender hooks never run on the server. **The published signal travels the route the family
already has**, so `ArenaCalendarEvent` keeps it private and hands it to `ArenaCalendarState`
through the `register` call it was already making, and `ArenaCalendar` reads `state.timesOf(chip)`.
A public member would have been a member of nothing: `check:api` holds every public member of a
component equal to its contract, and this is plumbing rather than surface.

**Not every content query is exposed to this, and the difference is which view does the reading.**
`ArenaTabs` reads `tab.value()` from its own template and its own query, and its view is refreshed
*after* the consumer's embedded views, by which time every tab is bound; `ArenaTable` and
`ArenaTableRow` read only `.length`. What made the calendar different is that the CHIP's template
pulled a chain, `across` to `placementOf` to `placements` to `days` to `placed`, that ends in the
parent's query, so the read happened from inside an embedded view mid-refresh.

**Which is exactly why the rule is machine-checked rather than reasoned about per component.**
Every fixture and every generated playground in this repository declares projected children with
**static attributes**, which Angular sets at element creation, so the values are there before
anything renders and the failing shape never appears. `test/ProjectedUnderRepeat.test.ts` writes
them the way a consumer does, property-bound inside a `@for`, once bound before the first render
and once grown into a tree already built, and pins the result against the static spelling of the
same tree. Its walk is bidirectional: a new component owning a `contentChildren` query cannot ship
without a fixture there, and a name left behind once a query is gone fails as stale.

## The test harness

**It compiles ahead of the run, AOT rather than JIT, and that is a different guarantee rather
than merely a faster one.** The suites render real zoneless Angular trees under `bun test` via `happy-dom`,
which needs three test-only devDependencies beyond the `node:test`/`node:assert` baseline:
`@angular/platform-browser`, `happy-dom` and `@happy-dom/global-registrator`. **Most suites sit
beside the component they cover**; what stays in `test/` is the harness and the suites about no
single component, and two of those files carry no `.test.` infix on purpose, because `bun test`
collects by that infix and a shared module must not be collected as a suite.

`bun run build:angular-tests` compiles everything `tsconfig.test.json` includes under
`ngc --strictTemplates`, into git-ignored `frameworks/angular/build/test/`; `test:angular`, `test` and
`testStep()` all run `bun test` over that emitted output, never over the `.ts` sources. A type
error anywhere in the test surface, a template diagnostic in an inline `template:` string
included, fails the *build* step, and no test in that run executes at all. Staleness is prevented
by the build always running ahead of the tests that read it, and `build-angular-tests.ts` prunes
output whose source is gone, because `ngc` does not. **The compile itself is skipped when no input
has moved since the last one**, which is what keeps a step that costs around seventeen seconds
ahead of suites that cost around twelve; `--force` compiles anyway, and the rule it decides by is
its own document's.

**A green compile is a claim about TYPES, and never about behaviour.**

`test/HarnessCapabilities.test.ts` pins what the harness supports: a template property binding
reaches a required signal input; `contentChild()` resolves against real projected content; and
`componentRef.setInput()` drives a required input, both a plain string and a boolean carrying a
`booleanAttribute` transform, as well as an *optional* boolean input of the same transformed
shape, displacing its default. **Never write to a component's instance field directly** to stand
in for an input: `grep -rn "\w\+\['[a-zA-Z]*'\] = " --include='*.ts' frameworks/angular/` must
stay empty.

A suite file that fails to *load* from the emit does not fail quietly: the run goes red, not
merely one failing assertion. What stays silent is *which* tests or suite files never loaded, so
a reader sees a failing run and has to go find what else it dropped.

### One document and one TestBed per process

`bun test` runs every file a single invocation matches in ONE process, which means the whole
layer, and both happy-dom's document and Angular's `TestBed` environment can each be claimed
only once per process: `GlobalRegistrator.register()` throws if already registered, and
`TestBed.initTestEnvironment()` throws the second time it runs across files that share a process.
`test/TestbedEnv.ts` claims both, once, for the whole run: `ensureDom()` and
`useTestEnvironment()` are plain `if (claimed) return` guards rather than a reset, because
`TestBed.resetTestEnvironment()` measurably does not work: because
`BrowserDomAdapter.makeCurrent()` installs a process-wide DOM adapter on the FIRST platform
creation that nothing resets, so a second document would render into one the adapter no longer
points at.

So every suite shares one real document and one TestBed environment for the whole run; any suite
needing a real component render calls `useTestEnvironment()` (or `ensureDom()` alone, for a suite
that needs a DOM but not TestBed). **The shared document means state written onto it outlives the
file that wrote it**, whether a custom property on `documentElement.style` or an element
appended to `document.body`, unless that file clears it, typically in a `finally`. Every directly-created
fixture must still be `destroy()`-ed, because zoneless change detection sweeps all attached views,
so a fixture left dirty throws out of an unrelated later test, and with one shared document that
hazard crosses files.

## A host-bound root is the default, and its carve-outs are a growing set

A primitive binds its root slot to the host (`host: { '[class]': 'styles().root()' }`) rather than
rendering a wrapper div, so the host is the flex item its parent lays out and the measured element
is the styled element. The rule targets elements that exist only to carry styling; when the root
must be a specific semantic or interactive element, keep it and leave the host bare.
`activity-feed` needs a real `<ul>`; a form control needs its own `<button>`, `<input>` or
`<label>`, or it forfeits the activation, labelling and `:disabled` semantics the browser already
supplies. **A bare host still declares `display: contents`**, or as a flex item it shrinks to fit
and a `w-full` inside measures the host, not the row. **A host-bound root must carry a display
utility**, because `<arena-x>` is an unknown element defaulting to `display:inline`, where width and
height do not apply, so a root slot without one renders a zero-area host. That is machine-guarded
by a manifest-driven assertion in `test/HostClassBinding.test.ts`. Count the carve-outs rather
than trusting a figure here:

```bash
grep -Lr "'\[class\]':" --include='[A-Z]*.ts' frameworks/angular/components/*/*/ \
  | grep -vE '\.(test|variants|card\.entry)\.ts$|(State|Window)\.ts$'
```

They fall into **four** groups, each with its own reason. The **SVG charts** have no manifest and
no recipe, so there is no `root` slot to bind. The **form controls** each need their own
`<button>`, `<input>` or `<label>`. Some **keep a specific semantic or structural element**: a
real `<ul>` for a feed, a `<div role="tablist">` whose panels are siblings outside it, a real
`<nav>` for a navigation landmark, since the `navigation` pattern offers `role="navigation"` only
for when a `<nav>` cannot be used. The fourth group has a reason unlike the other three:
**a component that owns an output named after a DOM event it must be able to refuse needs an inner
element to stop the event at.** An Angular output named after a native DOM event is
delivered twice, once as the output and once as the bubbled DOM event Angular also listens for
on the host, so with `stopPropagation()` removed one pointer click reaches the consumer twice and a
disabled row activates. A host listener cannot fix it: `stopPropagation` does not reach a sibling
listener on the same element, and `stopImmediatePropagation` would depend on registration order.
So the rule has a second clause: **host-bind unless the root must be a specific element, or unless
the component owns an output named after a DOM event it must be able to refuse.** The suites
assert the delivery count, so a wrapper cannot be optimised away without a red run.

**`arena-card` is in that fourth group and shows how far the defect goes.** A host that both
listens for `click` and emits an output of that name does not merely double-deliver: each emission
re-enters the host's own listener, and one measured press reached the consumer 7609 times before
the run gave up. So the wrapper is not a tidiness question there either.

**The consequence a carve-out pays** is that a consumer attribute written on `<arena-x>`, a
static `class` or an ARIA attribute, lands on the inert host and never on the styled element
inside it, and neither layer offers a second route to it. That follows from the carve-out, not
from anything a contract could restate, and it is the argument for host-binding being the default.

## Three traps this layer's idiom sets

All three are layer-wide and silent.

**A bare boolean attribute resolves to `true`.** Every boolean input here is a signal
`input(false, { transform: booleanAttribute })`, so `<arena-alert dismissible>` is `true`.
The equivalence to a native HTML boolean attribute stops there: `booleanAttribute`
special-cases the literal string `"false"` as `false`, where a native attribute stays set
on any present value. Binding (`[dismissible]="true"`) is the clearer form.

**An input named after a native attribute leaves the native attribute behind, and every
primitive that takes one clears it.** Angular writes a static attribute to the DOM during
the creation pass whether or not it also matches an input, so an uncleared
`<arena-page-head title="Projects">` leaves a real `title` on the host and the browser draws a
tooltip over the whole header. Each affected primitive carries `'[attr.title]': 'null'` (or `'[attr.name]': 'null'`) in its host
block, and `HostClassBinding.test.ts` asserts it both ways: a primitive that takes the input and
does not clear it fails, and so does one that clears an attribute it takes no input for. **Read
the guard, not a count**: the defect does not depend on host-binding, so any figure derived from
the host-bound primitives alone undercounts.

**`(click)` on an element of a primitive fires for the DOM event AND for the primitive's `click`
output.** Angular installs both: a native listener on the host element, and a subscription to the
`output()` of the same name. The counts below are **measured with a probe component** across all four
combinations, because the reading that Angular binds one or the other is equally plausible and
being wrong about which is undetectable by eye:

| the primitive | what a consumer's `(click)` counts |
| --- | --- |
| emits and stops propagation | 1 |
| emits, does not stop propagation | **2** |
| does not emit, does not stop propagation | **1, a phantom** |
| does not emit and stops propagation | 0 |

**So a primitive declaring a `click` output stops propagation on every click it handles**, or a
consumer's handler is called twice for one press. Every primitive that declares one does, in every
branch, including the ones that deliberately do not emit, which is what turns the third row into
the fourth and keeps a chip the consumer declared non-interactive from reporting an activation
nobody made. Derive the set with the command below rather than reading a list here.

**And a suite counting activations through a `(click)` binding is measuring the sum**, so it
cannot tell an emit from a bubble and would read a doubled call as a passing one. Their suites
assert **both** numbers, the output on the component instance and what a template
binding hears, because either alone is blind: the instance count cannot see a native event
escaping to the consumer, and the binding count cannot see the output going silent.
`ArenaCalendarEvent.cases.test.ts` is the shape.

**`click` is not the only output named after a native event, and the rest are unaudited.**
Derive the set rather than trusting a list:

```bash
grep -rhoE 'readonly (blur|cancel|change|click|close|focus|input|select|submit|toggle) = output<' \
    --include='*.ts' components | sort | uniq -c
```

Every one of them carries the same double-fire risk, and only the `click` ones are measured.
`change` is the widest family, and `ArenaCheckbox.compliance.test.ts` and
`ArenaRadioGroup.compliance.test.ts` assert their consumer hears it exactly once, which is half
the pair above; the rest of that family asserts nothing about it.

## Two roots, two projections, one template

Angular hands projected content to the **first matching** `<ng-content>`, so a component with
two root branches cannot give each its own. `ArenaTable.prompt.md` records what that cost the table:
its wide and card shapes are one projection into a box whose display and role change, and the
empty state is a block beside the grid rather than a cell spanning it.

`ArenaCard` is the one place in this layer that pays for both roots instead. `href` has to render a
real `<a>`, because openable in a new tab, address copyable and announced as a link cannot be
rebuilt on a div, and a card projects into two slots. So both `<ng-content>` elements live in
one `<ng-template>`, and whichever branch renders stamps it with `ngTemplateOutlet`:

```html
<ng-template #body>… <ng-content select="[action]" /> … <ng-content /> …</ng-template>
@if (href(); as url) {
  <a [href]="url"><ng-container *ngTemplateOutlet="body" /></a>
} @else {
  <div …><ng-container *ngTemplateOutlet="body" /></div>
}
```

**The limit is what nothing documents**: whether the content survives when the branch changes
and the template is re-instantiated. Angular projects content nodes once, so an emptied card
would be a silent failure. `CardProjection.test.ts` toggles `href` at runtime in both
directions and asserts both slots arrive, exactly once, inside the new root. **Any component
copying this shape owes the same suite**, because the answer is a property of the framework
version rather than of the pattern, and it is the only thing standing between the idiom and a
card that renders nothing.

`ArenaSideNavItem` splits on `href` too and needs none of this: it projects nothing, so its two
branches carry only interpolated inputs.

## Adopting it is the package's question and not this document's

**A project adopting Arena installs `@dravensoft/arena-angular` and reads
[`PACKAGE.md`](./PACKAGE.md)**, which is the page npm shows: the install, the config file, the
one command, the theme surface and the script that keeps a palette from flashing on first paint.
Nothing under `theme/` reaches them, because the assembly copies `theme/arena-cdk.css` in as
`css/arena-cdk.css` and copies neither of the other two: `arena-tailwind.css` imports this
repository's own `intro/styles.css`, and the FOUC script is carried inline on the npm page where
its reader is.

What belongs here is the half a contributor needs, and it is one sentence: the theme surface is
authored in `theme/`, beside the service that reads it, so a palette rule and the service that
switches it are one directory rather than two.
