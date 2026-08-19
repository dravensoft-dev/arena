# The framework layers

> **For whoever changes a layer.** Building an app with Arena instead? This is the wrong branch:
> start at the root `SKILL.md`, then `frameworks/INDEX.md`, then your layer's index beside it.

Three layers implement one language. `react/` and `angular/` each ship a component library;
`tailwind/` is authored once and consumed by both. Each has its own `AGENTS.md`; this page is
what binds them, and every rule here binds more than one of them.

| I want to | Read |
|---|---|
| add a component | the route below, then the layer's own `AGENTS.md` |
| change what a component presents | [`../contracts/api/AGENTS.md`](../contracts/api/AGENTS.md) first, because the contract decides and the layers follow |
| change how a component looks | [`tailwind/AGENTS.md`](./tailwind/AGENTS.md), because appearance is authored there and compiled into both |
| understand what a layer holds | that layer's `AGENTS.md`: [`react/`](./react/AGENTS.md), [`angular/`](./angular/AGENTS.md), [`tailwind/`](./tailwind/AGENTS.md) |
| seed a component's playground | [`demos/AGENTS.md`](./demos/AGENTS.md) |
| arrange the page a style plugin is compared on | [`kitchen-sink/AGENTS.md`](./kitchen-sink/AGENTS.md) |
| change a chart | [`CHARTS.md`](./CHARTS.md), beside this page, because a chart's arithmetic is one thing both layers hold byte for byte |
| publish a package | [`PACKAGING.md`](./PACKAGING.md) |

## The layers are peers, and no layer is any other's authority

A file under `frameworks/<A>` may not name layer B nor any of B's source files, by import or in
prose. `check:layer-independence` fails one that does, judging a reference by where it **lands**,
so a relative `../../../tailwind/` in an `href` is caught as surely as prose naming the layer.
`ALLOWED`, `ALLOWED_SPECIFIERS` and `EXEMPT` are all empty, and **that emptiness is the claim**:
no layer takes an authorised edge to another, and a pattern authorising one nobody takes fails
as a stale allowance rather than sitting there licensing it.

Where two layers answer the same question differently, **the contract is what makes the answers
comparable**. A cross-layer *gate* under `scripts/check/arena/` reading several layers is that
mechanism rather than an instance of the coupling, which is why `scripts/` is outside the gate's
scope. **A fact only recorded as "matching the other layer" is a fact missing from a contract.**

This page sits at the `frameworks/` root rather than inside a layer, which is why it may name
all three. So does `Components.json`, and so do `demos/` and `kitchen-sink/`: each is a fact
about the layers that belongs to none of them, and a copy per layer is a copy that can disagree.

## Adding a component

The order is not arbitrary: each step produces what the next one reads, and skipping one leaves
a gate with nothing to check rather than something to fail.

1. **Declare its category** in `Components.json`, once, for every layer. The kebab directory name
   is **derived** from the PascalCase name by `kebab()`, a function and never a table.
2. **Write the API contract**, `contracts/api/components/<Name>.json`, and settle the members
   before any layer has an implementation to defend. That document's audit protocol is how, and
   it is a conversation rather than an inference.
3. **Write the behaviour binding** beside each layer's source, `<Name>.behaviour.json`, naming a
   pattern `contracts/behaviour/` declares.
4. **Implement it in each layer**, to that layer's shape: React's trio, Angular's quartet.
5. **Author its appearance** as a Tailwind manifest, unless it draws geometry rather than a
   surface, which is what puts every chart drawing geometry outside.
6. **Seed its playground fixture** in `demos/`, or `check:playgrounds` fails the contract that
   has none.
7. **Run the generators**, `bun run build`, which writes the demo pages, the API types, the
   prompt tables and the consumer index tree, and commit what it writes under `frameworks/`
   only where the tree tracks it.

**Changing an existing component's members starts at step 2 and it obliges every layer.** A
member is a contract fact rather than a layer's, so there is no such thing as adding one to one
layer: `check:api` fails a layer declaring a member no contract names AND a layer failing to
declare one a contract does, which is the same gate refusing the two halves of the same shortcut.
The doc comment above the member is not yours either; [`../GENERATED.md`](../GENERATED.md) says
which parts of a file under this tree a generator writes.

**A family of literal inventories moves outside the layer you touched, and no layer suite can
see any of them.** `scripts/lib/arena/behaviour-contracts.test.ts` asserts an inventory **per
layer** by literal value, one for React and one for Angular, so a new component **directory**
moves the one for that layer and a component landing in both moves both. It is not alone, and
treating it as the only one is how a green layer run sits in front of a red merged one. The rest,
found by adding a component and reading what went red rather than by a list anybody maintained:
`scripts/check/arena/components-categories.test.ts` totals the declaration,
`scripts/lib/tailwind/manifest-surfaces.test.ts` holds both the `HAND_DRAWN` roster and the count
of everything else, `scripts/check/arena/check-manifest-states.test.ts` holds that roster a second
time, `scripts/check/arena/check-playgrounds.test.ts` counts emitted pages once in total and once
per layer, and `frameworks/angular/test/HostClassBinding.test.ts` carries `NO_MANIFEST`, which is
the one nothing points at from anywhere.

**Two of those assert an ORDER and not a number, which fails in a shape that reads like a
regression.** `unaskedHandDrawn` reports in `HAND_DRAWN` order, so a suite matching
`problems[0]` against a component name breaks when a new entry sorts ahead of it, and the message
says a component was never opened rather than that a test hard-coded a position. Assert the set.
Find them all with `bun test scripts` before assuming a count is a count. Verify with the merged
process, the args array in `testStep()`, because `bun test frameworks/react` never matches
`scripts/` and reports green over a tree whose run is red.

**The consumer index tree moves too**, `frameworks/INDEX.md` and one `INDEX.md` per layer. It is
generated, so nothing is written by hand: `bun run generate:skills`, which `bun run build`
already does. Those three are **tracked**, unlike everything else a generator writes under
`frameworks/`, because the plugin is served from the git tag where nothing runs a build, so an
uncommitted index is a wrong answer handed to every reader of that tag. `check:skills` fails a
stale one and an untracked one.

## What each layer's shape is

**React is a trio, in the component's own directory**,
`react/components/<category>/<component-kebab>/`: `<Name>.tsx` (implementation and its exported
`<Name>Props`), `<Name>.prompt.md` (its prose, its examples and its Do/Don't around a generated
member table) and a fixture at `demos/<Name>.demo.json`. **The layer carries no hand-written `.d.ts`**: the
published one is emitted from the source, so the two cannot disagree.

**Angular is a quartet**, the same three plus its recipe, in
`angular/components/<category>/<component-kebab>/`: a standalone `OnPush` component with an
`arena-` selector and no component `styles`, its recipe, its prompt and an `index.ts` barrel,
plus its behaviour binding and its own suites beside them. **A primitive binds its root slot to
the host rather than rendering a wrapper div**, with a growing carve-out set that layer's own
document derives.

**The demo page is one of neither.** It is generated into every layer from the API contract and
the fixture, which is what makes two layers' pages comparable at all.

**A prompt's API table is generated too, and only that region of it.** Between the `@api`
markers, `bun run generate:api` writes every contracted member under the names that layer binds,
with its form, type, default and `description`; the prose around it stays hand-written.
`check:prompts` holds each region to a fresh emit, so a member renamed or retyped surfaces as a
stale table rather than as silence, **and the fix is always the contract**.

## A compound family, and where each layer pays for it

**When a consumer needs their own content inside ONE item of something Arena draws, make the
item a component.** Per-item projection stops applying the moment the consumer instantiates one
element per item instead of handing Arena a render function, so Angular's missing
`ngTemplateOutlet` binding stops being the obstacle. `ArenaRadioGroup`/`ArenaRadio`,
`ArenaCalendar`/`ArenaCalendarEvent` and `ArenaTable`/`ArenaTableRow`/`ArenaTableCell` all follow it.

The parent owns **where** an item goes and the item owns **what** it looks like. React's parent
reads its children's props and injects the rest with `cloneElement`; Angular has no
`cloneElement`, so the item injects the parent and pulls its signals instead, and nothing is
pushed at all. **That is why the fragment and wrapper hazards are React's alone**, and why the
`ArenaSideNav` recursion is solved in opposite directions in the two layers, each in its own
document. **Neither layer's coordination is a member of any contract.**

**A compound parent's content slot is OPTIONAL, and the one exception is a named group.**
Measure it rather than trusting this: `grep -rn '"form": "slot"' ../contracts/api/components/`
and read the `required` flags. Every compound ROOT declares its children optional and guards
nothing, and so does a container that merely nests. Only a section that renders a **heading
naming the group** requires and guards, because a childless one renders a label for nothing.

**What a root must still not do is ship an invalid degenerate render.** With no children `ArenaTabs`
draws an empty tablist and **no** tabpanel, because a panel whose `aria-labelledby` points at a
tab that does not exist is worse than an absent one.

## A component draws its own appearance, and no layer targets another's markup

Both layers compose their own `arena-<manifest>__<slot>` class names, which the manifest's class
string is compiled into. **A component's class TABLE is emitted per layer; its STYLESHEET is
not**: a component *imports* the table, so the copy keeps that import inside the layer, and a
page only *links* the CSS, which is identical whoever renders it, so it lives once under
`tailwind/consume/`.

**What survives inline is a value computed at runtime**, from data or a measurement.
`check:appearance` fails a component that writes its appearance by hand, and `HAND_DRAWN`, in
`scripts/lib/tailwind/manifest-surfaces.ts`, names the ones that still do with a reason each.

**No gate compares a manifest against a rendered component, and the mapping is not one-to-one**:
a manifest mirrors a *surface*, so a compound family's members share the parent's and the three
SVG charts have none. `check:tailwind` proves every class resolves; nothing proves a manifest
still matches the contract it was written from, **so check by hand when either has moved**. One
narrow slice is machine-checked: `check:states` fails a `hover:`/`focus:`-family modifier no
contract the manifest covers declares. It checks states only, and nothing about colors, sizes or
slot structure.

**A dimension is a token or a derivation of tokens, and a bare literal is a bug.**
`bun run check:dimensions` scans `frameworks/` for literals in the properties the token layer
governs and fails on each. What the scan reaches, what it does not and its two known blind spots
are beside the gate, in [`../scripts/check/arena/AGENTS.md`](../scripts/check/arena/AGENTS.md);
read it before assuming a site is covered.

**Every animation answers `prefers-reduced-motion`**, and what it answers depends on what the
motion means. [`../contracts/design/AGENTS.md`](../contracts/design/AGENTS.md) states the four
cases and the reason for each, there rather than per layer because it is a design decision, and
a layer that disagrees with it is wrong.

## Two rules a component author reaches for constantly

**The single-icon convention.** A component's icon is a Phosphor class-name string Arena draws,
never a slot, so `ArenaIconButton` presents no slot at all and a per-item or single icon is one
system across the library. The price is recorded rather than hidden: flattening each
`<button>`'s heritage clause drops the five `form*` overrides and every global or ARIA attribute
a `{...rest}` spread would forward, with no gate behind the loss. `check:api` reads the `.tsx`,
so a restored spread fails, but **nothing re-derives which native members the flattening
dropped**.

**A member only a human can supply is required and guarded at runtime**, never defaulted.
`ArenaTable.label` names the grid for assistive technology; `ArenaSegmentedControl.ariaLabel` is the same
shape. A constant fallback is rejected on the charts' own evidence: a name that is present but
only says what the component *is* satisfies `roles.label` mechanically while telling a
screen-reader user nothing, and nothing can derive it, because a data table's subject is
editorial.

## The modal focus contract, implemented once per layer

`contracts/behaviour/dialog-modal.json` is the only authority either layer answers to. **Every
focusable selector repeats `:not([tabindex="-1"])` on every clause**, because a selector list is
OR'd and `button:not([disabled])` alone would pull a real `<button tabindex="-1">` back into the
tab order. **None of them caches the focusables**, because a dialog's content changes under it
and a cached list wraps to an element that has gone. Escape always reports through the
component's **own** dismissal channel, so meeting the pattern adds no member anywhere.

**The rule that a component is self-contained is about CSS classes, not about JS helpers.**

**What a suite can prove about a trap, and what it cannot.** The boundary wrap is Arena's own
`.focus()` call, and happy-dom honours `.focus()`, so it is asserted for real. The **interior**,
meaning that Tab from a control in the middle reaches the next one, is the browser's native
sequential focus navigation, which neither layer implements and happy-dom does not have; a test
asserting it would pass identically against a perfect trap and against none. So the interior is
`check:focus-trap`'s: real Chromium, one real Tab press per stop, one page per layer that binds
the pattern.

**A grid is verified by walking its cells, one key press per step.** A grid suite asserts at
every cell that focus landed where the arrow should take it and that exactly one `tabindex="0"`
exists and is that cell; each edge clamp is one extra press, never a blind loop. **The bill is
the press count, not what is asserted**, because each press re-renders the grid, so the fixture
stays small and explicitly sized: three rows by two columns.

## Layout and naming

**One shape for every layer**: directories are `kebab-case` and lowercase; a file name begins
with a capital, and a multi-word stem is `PascalCase` with hyphens removed; a secondary dotted
segment stays `lowerCamelCase`, as in `ArenaBadge.manifest.json`. Capital-initial is the rule and
PascalCase is how a multi-word stem is *formed* under it, which is why a conventional all-caps
document name needs no dispensation.

A layer lays its components out as `<layer>/components/<category>/<component-kebab>/`, and
everything belonging to one component lives in that one directory: its source, its types, its
binding, its prompt, its demo page, its tests. **A file that is not one component's rises to the
narrowest level containing all of its consumers**, and a compound family counts as its parent
rather than as the category.

`components/charts/` carries the worked example of that rule, and the largest body of cross-layer
arithmetic in the tree: three modules sit in the category rather than inside a chart or at the
layer root, because every chart reads them and nothing outside the category does.
What each one holds, what a scale may not do, why a curve is monotone and why a bubble maps onto
area are [`CHARTS.md`](./CHARTS.md), beside this page and for the same reason this page is not
inside a layer.

**Every exception to the naming rule is mechanical rather than stylistic**: a toolchain, a
reader, or somebody else's source recognises the literal name, so capitalising it breaks or
obscures something. All of them are cases the rule cannot cover, a name beginning with a
lowercase letter or one with no stem to capitalise. **Measure the set rather than trusting a
list**, with `find frameworks -type f -printf '%f\n' | grep -E '^[^A-Z]' | sort -u`, and read
each reason in the layer document that owns it.

**`Components.json` is the declaration and `check:structure` is the gate.** It fails a component
declared in two categories at once, a directory in a category the file assigns elsewhere, a
directory the file does not name, a directory name that is not kebab-case, and a declared
component present in no layer. **It says nothing about whether the category is the RIGHT one**,
which is editorial judgement and no gate has it. Nor does a directory existing prove the
component inside it is complete: `check:api` and `check:behaviour` hold that.

`LAYERS` in `scripts/lib/arena/layers.ts` is an exhaustive enumeration, deliberately **not** a
walk of `frameworks/`, so a layer renamed or removed wholesale becomes loud rather than quietly
leaving a gate's scope.

## A component is compiled ahead of time, in every layer

**Editing a component means running `bun run build` in the same tree.** The suites import the
source directly and stay green with the compiled sibling stale, but a demo page loads the
sibling, so `bun run demos` shows the pre-fix component while the suites prove the fix, which is
exactly the by-hand check every `.prompt.md` checklist depends on. How each layer compiles is
its own document's.

**A demo page is generated, one per component per layer, and never hand-written.** The two
layers' pages differ in one path segment and take the same query string, so **a difference
between them is a difference in the component**, which is the whole reason to generate them.
`check:playgrounds` holds every fixture to its contract, every emitted file to a fresh run, and
each layer's knob model to the other's. It opens none of them.

## What holds what, and what nothing holds

| Claim | Held by |
|---|---|
| a layer names no other layer | `check:layer-independence`, `ALLOWED` and `EXEMPT` empty |
| a component's members match its contract, in both layers | `check:api`, with no exception map at all |
| a component declares a behaviour pattern | `check:behaviour`, a coverage claim and never an accessibility one |
| a component behaves as it declares | `check:compliance`, over `COVERED` only, which is partial by design |
| a component's directory sits where it is declared | `check:structure` |
| a dimension is a token | `check:dimensions`, with two declared blind spots |
| a component renders its manifest rather than hand-drawing | `check:appearance`, `EXEMPT` empty |
| a manifest's states are contracted | `check:states`, states only |
| a modal traps Tab in a real browser | `check:focus-trap` |
| **a manifest's colors, sizes or slot structure still match its contract** | **nothing. Read both when either moves** |
| the emitted pages match a fresh run, and each layer's knob model matches the other's | `check:playgrounds`, over source |
| **that any page mounts and draws** | **nothing. Open it** |
| **the two layers paint the same thing** | **nothing. The paired playground pages exist for a person to compare** |
| **whether a category is the right category** | **nothing. It is editorial judgement** |
| a layer imports only what its envelope declares | `check:architecture`, `ENVELOPES` |
| no source reads a browser global while the module evaluates | the same gate, with two escapes it names |
| no source reaches an API a server render cannot answer | the same gate, `SSR_HOSTILE` |
| the router peer stays optional, and stays inside the metadata entry point | the same gate, both halves |
| **that a server render of a real page actually succeeds** | **nothing under Angular. React's suites render through `react-dom/server`; Angular's run through a DOM, so its half is held by the code and not by a run** |

## The architecture envelope is a promise a consumer already acted on

**Arena is adopted through a decision tree**, and its last nodes tell a project it may build a
single-page application, server-render, prerender or embed as a fragment in somebody else's host,
and which dependencies each of those answers costs. Nothing about that is policy: **every one of
those answers is a property of the sources in this directory**, so it can be withdrawn by a change
that was solving something else, and the consumer finds out at their own build.

- **Neither layer ships a router, a store, a data client or an application shell**, and this is what
  architecture neutrality actually consists of. A capability that seems to need one is reached
  through a member the consumer answers: that is why an anchor Arena draws splits its activations
  and reports through its own event instead of navigating.
- **A browser global read while a module evaluates runs on a server too.** It throws during a server
  render and a prerender, at import time rather than at paint, so the stack names the import and not
  the component. Read it inside a function, an effect or an after-render hook, or guard it with a
  `typeof` check; Angular's answer is the injected `DOCUMENT` token, and both layers already do
  this everywhere.
- **What each layer may reach, and the peer each one keeps optional, is that layer's own page.**
  `ENVELOPES` is where the two lists are declared, and the reason a package is in one belongs
  beside the layer that reaches it.
- **The one thing no gate can hold is a real server render of a real page.** Much of the React
  suite renders through `react-dom/server`, so that half is exercised on every run; Angular's suites
  run through a DOM instead, so its half rests on the code alone. **Smoke-test Angular first**
  when a change touches how a component reaches the document.

**What the stylesheet does NOT promise is the same isolation**, and a contributor should not read
the list above as covering it: the tokens are declared on `:root` and the reset sets the box model
on `*`, so a fragment embedded in a host changes that host. That is stated where a consumer decides
it, and the layer that owns the box model is [`tailwind/AGENTS.md`](./tailwind/AGENTS.md).

## Anti-patterns, and what each one costs

**A manifest written by reading the neighbouring manifest instead of the contract.** It is how a
state nobody declared enters the layer, and `check:states` fails that one slice. Everything
else a copy brings with it, the colors, the sizes, the slot structure, is caught by nobody and
stays until someone reads both side by side.

**Reasoning about a box model from what a source does not say.** A UA stylesheet has already made
some elements border-box, so the reasoning is wrong in both directions at once: it invents
divergences and it misses real overruns. **Measure the rendered box.** The layer that owns the
box model states what it is and where it comes from, in
[`tailwind/AGENTS.md`](./tailwind/AGENTS.md).

**A guard that counts what the render path does not.** `React.Children.count()` counts a bare
`false` as one child where `toArray()` drops it, so a `count()`-based "this must not be empty"
guard passes `{isAdmin && <Item/>}` with the condition false, straight through to the empty
render the guard exists to refuse.

**A citation of the other layer, in prose.** An import graph stays clean while prose makes one
layer normative for another, a sentence at a time. That is why `check:layer-independence` reads
prose as well as imports, and why a reference is judged by where it lands rather than by how it
is spelled.
