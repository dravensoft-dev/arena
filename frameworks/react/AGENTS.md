# Arena, the React layer

> **For whoever works on this layer.** Building an app with it instead? Read [`PACKAGE.md`](./PACKAGE.md) to install it,
> [`SKILL.md`](./SKILL.md) to find a component, and that component's `.prompt.md` to use it.

The React primitives, the kitchen-sink page one design extension gets, and the shared modules both of them read.
Every value here comes from `contracts/design/`; this layer introduces no design decision
of its own. For what those values mean, read
[`contracts/design/AGENTS.md`](../../contracts/design/AGENTS.md).

**Published as `@dravensoft/arena-react`.** [`PACKAGE.md`](./PACKAGE.md) is what a consumer
reads, and the assembly copies it into `dist/` as the package README;
[`../PACKAGING.md`](../PACKAGING.md) is how the package is built and what it leaves out.

## This layer stands on the contracts alone

**It names no other framework layer and imports from none.** What a component is and what
members it presents is `contracts/api/components/<Name>.json`; what it must do is
`contracts/behaviour/`; what a value is, `contracts/design/`. Where another layer solves the
same problem differently, the contract is what makes the two answers comparable, and neither
implementation is the other's record. `bun run check:layer-independence` fails a file here that
cites a sibling layer, by import or in prose.

## Components compose their own class names

Each component draws its appearance from the manifest that describes its surface, but never
from that manifest's class string: the string is compiled into a stylesheet of
`arena-<manifest>__<slot>` rules, and what a component composes at runtime is those names.
The table and the twenty-line composer are both emitted **into this layer**, so the import
crosses no boundary:

```tsx
import { arenaStyles } from '../../../ArenaStyles.generated.ts';
import manifest from './ArenaTag.classes.generated.ts';

const arenaTagStyles = arenaStyles(manifest);
const styles = arenaTagStyles({ tone, disabled });
<span className={styles.root()}>
```

`components/display/arena-tag/ArenaTag.tsx` is the reference shape. A compound child reaches the parent's
table the same way, by importing the composer and the parent's generated module rather than a
sibling component's exported recipe, so no component depends on another's module:
`components/display/arena-calendar-event/ArenaCalendarEvent.tsx` is that shape.

**Nothing here merges classes, and nothing needs to.** A variant is additive and its rule is
emitted after the base at equal specificity, so source order decides; that is what
`tailwind-variants` and `tailwind-merge` used to do at render time, and both left the package
with this arrangement.

Both layers compose the same names, and neither is the other's authority: the manifest is.
Where a manifest and a component disagreed, the manifest won, which is how `ArenaCard` came to draw
a focus ring rather than an outline. `check:appearance` holds the arrangement.

**What stays an inline `style` is a value computed at runtime**, from data or from a
measurement: a chip's position from an hour, a fill's width from a percentage, a coachmark's
top clamped against `window.innerHeight`, a consumer's own width string. The operative rule is
the gate's, and it needs no list of properties: *if every branch of the value is a literal it
belongs in the manifest; if any branch reads an identifier or an interpolation it is a
computation and stays*. A hover or focus colour is never a computation, and no component here
keeps a `useState` to paint one.

**A variant key the manifest does not declare resolves to no classes at all**, where a lookup
table used to fall back through `|| TONES.neutral`. Where a member can carry a value the
manifest has never heard of, the guard that answers it is **derived from the manifest** rather
than written out beside it; `ArenaActivityFeed`, `ArenaBadge`, `ArenaAlert`, `ArenaToast`, `ArenaAvatar`, `ArenaToastHost`
and `ArenaGrid` all carry one.

**What a component inherits is not the browser's.** The layer's pages and its package carry the
compiled utility sheet, which is both the utilities the manifests resolve to and the `@layer
base` where `button, input, select, textarea { font: inherit }` lives. Without that base a form
control fell back to 13.33px Arial with `line-height: normal`, so an `<i>` inside a `<button>`
drew the same glyph at 13.33px where the other layer drew 16px, and a row whose height came
from its label's line box stood 4px shorter per row. Neither showed up in a suite, because
happy-dom has no layout.

**Nothing injects a `<style>` tag, and that is a claim rather than an accident.** Every
keyframe animation is a utility in the compiled sheet this layer loads, carrying its own
`prefers-reduced-motion` branch, so `arena-menu`, `arena-pop`, `arena-fade`, `arena-shimmer`,
`arena-spinner` and `arena-prog-indeterminate` are classes a manifest names.
Every vendor pseudo-element and sibling selector is an arbitrary variant on a slot, so
`ArenaInput`'s `::-webkit-calendar-picker-indicator` and `ArenaCheckbox`'s `:has(~ input:focus-visible)`
are in the manifest too. A component that reaches for an injected sheet is a component whose
manifest is short: grow the manifest, which moves both layers, rather than adding a rule only
one of them can see.

## Every animation answers `prefers-reduced-motion`

The answer depends on what the motion means:

- Motion that reports work in progress **slows** rather than stops (`ArenaSpinner`,
  `ArenaProgressBar`, `ArenaButton`), because a frozen spinner reads as a hung process.
- Decorative motion **stops** outright (`ArenaSkeleton`).
- An entrance **keeps its fade and drops its travel** (`ArenaDialog`, `ArenaMenu`): the movement is
  the vestibular trigger, the fade is the meaning.
- An opacity-only animation needs no clause at all (`ArenaTooltip`): there is no motion to
  reduce.

## Layout

A component is a directory: `components/<category>/<component-kebab>/`. Everything
belonging to one component lives in it: its source, its types, its binding, its prompt,
its demo page and its suites.

**Read the categories and their contents from the tree rather than from a list here**, because
a list here rots and nothing checks it: `ls components` for the set, and
`frameworks/Components.json` for which component each holds, which is the declaration
`check:structure` reads.

A file that is not one component's rises to the narrowest level containing all of its
consumers, and a compound family counts as its parent rather than as the category. The
layer root holds the generated modules plus the shared internals, which
`ls *.ts *.tsx | grep -v generated` lists. `UseDialogModal.ts` is the one whose placement needs
explaining: its three component consumers are all in `feedback/`, so the rule would put it
there, and its suite counts as a consumer too.

`playground/` sits beside them and is the one directory here that is **not** part of the
package: `tsconfig.dist.json` excludes it and no barrel exports it. It holds the harness every
generated demo page mounts, `Playground.tsx` for the panel and the event log and
`PlaygroundState.ts` for what a knob holds, whether it is bound and how that round-trips
through the query string. It is page furniture rather than a component, which is why it is the
one thing here that renders classes: the classes are `intro/playground.css`'s, which sits
outside every layer so that each one's harness draws the same page from the same bytes, and a
difference seen between two layers is a difference in the component rather than in the frame
around it. **What the suite beside it
cannot prove is that the browser honours the URL write-back**: happy-dom's
`history.replaceState` is a no-op, so the suite asserts the call and the real write is the
smoke pass's.

**`UseArenaContainerWidth.ts`'s `arenaReadBreakpoint` warns once per name when a breakpoint token does not
resolve, and never caches the failure.** Every comparison against `NaN` is false, so a silent one
leaves `ArenaTable`, `ArenaCalendar` and `ArenaPageHead` on their wide branch on a phone with nothing reported,
and a cached one pins that for the life of the process. `test/UseArenaContainerWidth.dom.test.tsx`
holds both halves. `forgetArenaBreakpoints()` drops what was cached, for the two callers that need
it: a document that swapped its stylesheet at runtime, and a suite whose subject is the cache,
which would otherwise depend on which file the runner reached first.

**`useArenaViewportBelow(name)` answers the other question, and it is a different one.**
`useArenaContainerWidth` measures a box, which is what a component needs, because a component may be
rendered anywhere and the viewport says nothing about how much room it was given.
`useArenaViewportBelow` measures the viewport, which is what a page layout needs and what a consumer
writing their own stylesheet cannot get any other way: a media query condition
holds no `var()`, so the threshold cannot be named from CSS at all. The query is
`not all and (min-width: N)`, the exact complement of the `md:` variant rather than a
`max-width` an epsilon short of it. **Reach for it for a page's own layout and never for a
component's**: a component that branches on the viewport is wrong the first time somebody puts
it in a narrow column.

**`AnchorActivation.ts` is the predicate behind the anchor convention**: an anchor Arena draws
cancels a primary click with no modifier and reports through its own navigation event, and
everything else is the browser's. `ArenaCard`, `ArenaBreadcrumbs`, `ArenaSideNavItem` and `ArenaCommandPalette` all
read it, `contracts/api/AGENTS.md` states the rule, and `test/AnchorActivation.dom.test.tsx`
holds each activation separately.

**A compound family injects downward, direct children only, one hop**, and that is what makes
`ArenaSideNav` nest to any depth with **no context anywhere**: a section or a collapsible re-injects
into its own children with `depth + 1`. The shared helper is
`components/navigation/arena-side-nav/SideNavInject.tsx`, which covers that family and no more, so the
placement rule sends it to the family's parent directory. **Its `.tsx` extension is
load-bearing**: `check:dimensions` never opens a `.js`, and its `arenaIndentFor()` produces a governed
`padding-inline-start`. It is a `.tsx` under `components/` that is **not a component**, since a
component is a **directory**, in `reactComponents()` and in every count of the set.

**One hop is also the limit, and a consumer's own wrapper component between two levels breaks
the chain. So does a fragment.** `React.Children.toArray` flattens a nested array and does *not*
flatten a `<>…</>`, so a fragment arrives as one opaque child that `cloneElement` decorates
uselessly. Items go as siblings or in an array, never wrapped, and the fragment half is easy to
miss because the array half works.

**And a guard must count what the render path counts.** `React.Children.count()` counts a bare
`false` as one child where `toArray()` drops it, so a `count()`-based "this must not be empty"
guard passes the commonest conditional-render idiom, `{isAdmin && <ArenaSideNavItem …/>}` with the
condition false, straight through to the empty render the guard exists to refuse. Use
`toArray().length`.

**`UseDialogModal.js` implements `contracts/behaviour/dialog-modal.json` for this layer, and
that contract is its only authority**, covering `focus.trap`, `focus.onOpen`, `focus.onClose` and
`keyboard.Escape`, in one hook because all three consumers need all four. Escape always reports
through the component's **own** dismissal channel (`onClose`, `onCancel`, `onSkip`), so meeting
the pattern adds no member to any contract.

**Every natively-focusable clause in the selector carries its own `:not([tabindex="-1"])`**,
because a selector list is OR'd: `button:not([disabled])` alone would pull a real
`<button tabindex="-1">` back into the tab order. **Never cache the focusables**, because a dialog's
content changes under it, and a cached list wraps to an element that has gone. **The rule that a
component is self-contained is about CSS classes, not about JS helpers.**

**What a suite can prove about the trap, and what it cannot.** The boundary wrap is Arena's own
`.focus()` call and happy-dom honours `.focus()`, so it is asserted for real. The **interior**,
meaning that Tab from a control in the middle reaches the next one, is the browser's native sequential
focus navigation, which nothing here implements and happy-dom does not have; a test asserting it
would pass identically against a perfect trap and against none. `bun run check:focus-trap` is
what covers it: real Chromium over each declared page, one real Tab press per stop.

- `kitchen-sink/<extension>/`: one page per design extension holding every component at once,
  emitted into this layer from the fixture under `frameworks/kitchen-sink/` that every layer is
  emitted from. Nothing here is hand-written: the pages one extension gets differ in what mounts
  them and in nothing else, which is what lets `check:pixel-parity` capture them and fail on one
  differing pixel. Edit the fixture, never the emitted page.
- `vendor/`: a generated CommonJS→ESM bundle of React for the demo pages'
  importmap (`build-vendor.ts`, guarded by `check:vendor`).
- `test/`: the harness (`Harness.tsx`, `Preload.js`, `AssertPattern.tsx`) and the suites
  that belong to no one component.

## Every component is a trio

`<Name>.tsx` (implementation and its exported `<Name>Props`), `<Name>.prompt.md` (usage and
examples) and a fixture at `frameworks/demos/<Name>.demo.json`. **Those three are what this
layer contributes, and they are not the whole of adding a component**: the behaviour binding
beside the source and the manifest one layer over are the rest of it, and
[`../AGENTS.md`](../AGENTS.md) carries the ordered list. The demo **page** is not one of them: it is generated from the API contract and that
fixture, into this layer and into every other, which is what makes two layers' pages comparable
at all.

**There is no hand-written `.d.ts`, and that is the point.** The interface sits in the file
it describes, so it cannot disagree with the implementation beside it, and the declaration a
consumer installs is emitted from that source at assembly time rather than maintained by
hand. The layer whose recipe is a separate file carries one more.

**A demo page is one per component and never per category.** `<Name>.demo.generated.html` and
its `<Name>.demo.entry.generated.tsx` sit in the component's own directory, so the page for a
component differs from the other layer's by exactly one path segment and the same query string
reproduces the same view in both. `bun run generate:playgrounds` writes them and
`check:playgrounds` holds them to a fresh run, to the fixture that seeds them, and to the other
layer's model.

**They declare no `@dsCard`**, because a playground's height moves with every knob, so there
is no fixed box to declare. Nothing loads one either; [`../../DOUBTS.md`](../../DOUBTS.md)
carries what that leaves open.

**Every `.prompt.md` carries examples and, where it adds value, a Do / Don't section.**

## The layer answers to a compiler

`bun run check:react-types` runs `tsc` over `tsconfig.check.json`, strict, across every
component, helper and suite. It is the only thing that can catch a component disagreeing
with the interface declared beside it, and until the layer was TypeScript nothing could.
`tsc` runs under plain node, so unlike `check:demos` and `check:vendor` this gate never
skips a run.

**Two compiler options are load-bearing rather than stylistic, and both look deletable.**

`verbatimModuleSyntax` is on because Bun's `tsx` loader elides an `import type` and *keeps*
a value-form import used only as a type. `Api.generated` has no runtime counterpart, so
such an import survives into the compiled demo sibling and the browser asks for a module
that does not exist: a 404 on the page, with every gate green. With the option on it is a
compile error instead.

`erasableSyntaxOnly` is on because two transpilers compile this layer: `tsc` emits the
declarations and `Bun.Transpiler` emits the JavaScript. The option forbids `enum`,
`namespace` and parameter properties, which are the constructs that emit runtime code and
so the only ones where the two could disagree about what the module does.

**A test that violates a contract on purpose says so with `@ts-expect-error`.** A suite that
renders without a required member, to prove the runtime guard throws, is passing something
the contract refuses, and the directive is what tells the compiler that is the point. It
also expires by itself: when the error stops happening the directive becomes the error, so
the claim cannot go stale. `check:docs` reads it as a directive rather than as the file's
one allowed comment.

## Demos are compiled ahead of time

Each demo page's script is a real sibling source file (`<Name>.demo.entry.generated.tsx` beside
`<Name>.demo.generated.html`), and every component `.tsx` plus every entry has a compiled
`<Name>.generated.js` sibling, same directory and same stem, that
the page loads with a plain `<script type="module">`. `bun run build:demos` compiles them with
Bun's own transpiler and rewrites each relative import's `.tsx` extension to `.generated.js`;
`check:demos` guards drift and orphaned output.

**Those siblings are git-ignored**, along with the `vendor/` bundles: only demo pages read
them. A fresh clone runs `bun run build` once; see
[`../../scripts/build/AGENTS.md`](../../scripts/build/AGENTS.md).

**Editing a component `.tsx` means running `bun run build:demos` in the same tree.** The
React DOM suites import the `.tsx` directly, so every test stays green with a stale `.js`
sibling while the demo pages render the old component.

## Two test invocations that must not merge

A `.dom.test.` suite renders into a real DOM; every other `*.test.tsx` asserts on
`renderToStaticMarkup` with no DOM, by design, because those suites prove those components
render correctly server-side.

**What decides which invocation a suite belongs to is its filename, wherever the file
sits**, meaning the `.dom.test.` infix. The first invocation passes `frameworks/react` with
`--path-ignore-patterns='**/*.dom.test.*'`; the second passes the bare string
`.dom.test.`, which `bun test` matches as a path substring. Neither names an extension, so
the split survives a rename of the layer's sources.

They cannot merge because the DOM is installed by `--preload ./test/Preload.js`, which
registers happy-dom **process-wide**, and `bun test` shares one process across every path a
single invocation matches. A DOM registered in the DOM-free invocation's process would
quietly change what its suites prove with nothing failing to say so.

`test/` holds the harness plus the suites that are about no one component, and **those
include DOM ones**, so that directory's contents answer nothing about which invocation a
suite belongs to. Only the infix does.

**The split reaches past this layer**, because a process-wide happy-dom also replaces Bun's own
`fetch` and so decides which invocation `scripts/` may ride in. **The single authority for the
whole command is `testStep()` in `scripts/check/arena/check-all.ts`**, whose header carries
that reasoning and whose `.test.ts` sibling asserts the args array by literal value; read it
there rather than reconstructing one.

**The preload is not a convenience.** `react-dom` decides once, at its own module
evaluation, whether the browser supports the `input` event. If a DOM is not already
installed the flag latches false and React falls back to its legacy change-detection
polyfill, under which a dispatched `input` or `change` reaches an `onChange` handler
**zero** times, silently. Registering happy-dom from a module body is too late, because ES
imports evaluate first, and so is registering it from a separate module imported ahead of
`react-dom/client`. Only a preload is early enough: both alternatives are measured and
neither works, so do not retry them. All three invocation sites pass it (`test:react-dom`, `test`, `testStep()`),
and `Harness.tsx` **throws** when `document` is missing rather than installing a fallback,
which would silently run those suites under the legacy semantics. The preload must never
reach the DOM-free invocation.

## Running it

```bash
bun run demos          # serves the repo root on :8000 and prints the entry points
bun run test:react     # the DOM-free suites
bun run test:react-dom # the DOM suites, with the preload
```

`bun run check` runs every gate and the full suite; run it once when an implementation is
finished rather than before every commit.

## A dimension is a token or a derivation of tokens

A bare literal is a bug, and `bun run check:dimensions` fails on each one. A value passes
when it is `var(--token)`, a `calc()`/`min()`/`max()`/`clamp()` over one, zero, or a unit
the token layer does not model. A handful of sites are exempt by name with a reason each;
read `EXEMPT` in `scripts/check/arena/check-dimension-literals.ts` for the current set.

Responsive branches are JS rather than media queries, and they measure the **container** via
`useArenaContainerWidth`: a media query can only ask about the viewport, and the box that decides
whether a component narrows is the one containing it. The hook owns a
ref and returns it, and takes one when the caller already holds the box to measure, so an
inner panel does not have to become a component to be measured. It reports `null` until it
has measured, which is the wide branch: a component renders wide first and narrows when it
knows.
