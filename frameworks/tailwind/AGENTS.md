# Arena, the Tailwind layer

> **For whoever authors a manifest or a utility.** Styling an app instead? A component already carries its own appearance;
> reach for the utilities only where you are drawing something Arena does not.

A framework-neutral Tailwind v4 consumption layer for Arena. It is **shared**,
not per-framework: the token→utility mapping is pure CSS and a component's
Tailwind recipe is data, meaning slots, variants and class strings, so every consumer
reads the same files whatever it is written in. The thin binding, how a class
string reaches an element, belongs to the consumer and never to this layer.

**This layer names no other framework layer, and none of them is its authority.**
What a component is, and what it presents, is stated once in `contracts/api/` and
`contracts/behaviour/`; what a value is, in `contracts/design/`. A manifest is
written by reading those, and `bun run check:layer-independence` fails a file here
that cites a sibling layer instead.

## It derives from tokens; it adds no value

Every utility here resolves to an existing Arena token via `var()`. There is no
new hex and no new value in this folder. Re-skin Arena by swapping
`contracts/design-generated/palette.generated.css`; these utilities re-skin with it.

## What the preset exposes

Every token in `contracts/design-generated/palette.generated.css`, `typography.generated.css`, `spacing.generated.css` and
`effects.generated.css` reaches a utility, except the ones that cannot. Each of those is
listed with its own reason in `EXCLUDED` in
`scripts/check/tailwind/check-tailwind-coverage.ts`, and the gate fails the build if a
token is added and reaches nothing, so **run `bun run check:coverage` for the count rather
than trusting one here**. The reasons fall into three kinds: v4 has no namespace for that
property (`--dur-*`, `--loop-*`, `--bw-*`, `--focus-*`), the token is script-readable and JS
consumes it as a number (`--chart-*`, `--tint-*`), or the utility v4 would emit is a literal
that ignores the theme (`--sp-0`, where `p-0` compiles to `0px`).

`contracts/design/colors.css` is excluded as a category. Its aliases (`--crimson`,
`--mute`, `--danger-soft`, `--text-strong`…) alias tokens the preset already
exposes; a second utility name for the same colour is a second way to be
wrong. Reach one as `bg-[var(--danger-soft)]` when you genuinely need it.

Two naming notes: the density keys take the token's suffix verbatim, so
`--dz-row-py` is `py-row-py`; and `--container-max` is exposed as
`--container-page` (`max-w-page`) because a key named `max` shadows
Tailwind's built-in `max-w-max`.

A theme key is not bound to one axis. `--dz-ctl-h` is exposed as the `--spacing-ctl-h`
key, so it reaches `h-ctl-h` **and** `w-ctl-h` / `min-w-ctl-h`, so an icon-only control can
combine all three to come out exactly square at the control height. That is one
token reaching three utilities, not a new value; the coverage gate counts the token,
not the utilities it reaches.

## The breakpoints are the one value spelled twice, and a script spells both

`--bp-sm`, `--bp-md` and `--bp-lg` are read by JS through `getComputedStyle`, which is what
a component needs, because a component branches on the width of its own CONTAINER and no
media query can ask about that. A consumer writing their own page CSS needs the other
half: a threshold they can name instead of inventing one.

They cannot be the same custom property. **A media query condition holds no `var()`**, and
Tailwind resolves a `--breakpoint-*` key at build time to write the variant's `@media`, so
`--breakpoint-md: var(--bp-md)` compiles to nothing. So the value is spelled twice, and
`Breakpoints.generated.css` is generated from the `bp` group by `bun run generate:tokens` so
the two cannot drift; `check:tokens` fails a stale one. `Theme.css` imports it, and a
consumer writes `sm:`, `md:` and `lg:`.

Tailwind's own breakpoint defaults are cleared first, the way every namespace in `Theme.css`
clears its own. Arena has three thresholds, so there is no `xl:` and no `2xl:`: a fourth
would be a value Arena never chose.

## The animations that live in CSS, and why

`Animations.css` holds the `@keyframes` and the utilities that ride them:
`arena-shimmer` (ArenaSkeleton), `arena-pop` (ArenaDialog), `arena-menu` (ArenaMenu),
`arena-fade` (ArenaTooltip), `arena-prog-indeterminate` (ArenaProgressBar),
`arena-btn-spin` (ArenaButton) and `arena-spinner`, because a manifest holds class
names and keyframes are not one. That file's own header is the normative list;
if it and this paragraph ever disagree, the file wins. Every value in it is a
`var()` into a token, and each animation answers `prefers-reduced-motion` on its
own terms: decorative motion stops, motion that reports work slows.

## The two hand-authored treatments, and why neither is a manifest slot

`Numerals.css` holds `.arena-num`: the mono face and `tabular-nums`, and no colour. It is here
for the same reason the keyframes are, that it belongs to no surface. A manifest mirrors a
surface and this is a treatment, applied to whatever figure a consumer is drawing themselves,
in a definition list, a KPI or a cart line.

It exists because `ArenaTableColumn.mono` does two things, the mono face **and** the gold ink, and
the ink is what stops the treatment travelling: gold reads as an identifier, so a sale total in
gold inside a card says the wrong thing. `mono` is this utility plus the ink, and
`ArenaTable.manifest.json`'s mono slots carry the same `tabular-nums`, so a column of figures aligns
by digit in both places.

**A second one is not free.** Every rule here is a class nothing gates against a contract, so
the bar for adding another is that it belongs to no surface at all and that some component's
own treatment is defined as it plus something.

`Rhythm.css` is the second, and it is here because it clears both halves of that bar rather
than because a page wanted a shortcut. It holds `.arena-stack` and `.arena-row`, the air
BETWEEN components, and it belongs to no surface because Arena draws no outer margin anywhere:
the only root-level margin in the library is `ArenaGrid`'s own centring. The second half is
`ArenaGrid`, whose `gap` variant is these same three rhythm tokens spent on the two axes of a
grid instead of on a column, so a grid is this treatment plus a grid. It carries what the token
family alone could not: a length nothing applies is a length every consumer re-decides.

Its classes go on an element the consumer wrote, never on an Arena element, and that is a
property of the system rather than a preference. A component's host element may declare
`display: contents` and carry no box, and `ArenaTabs` renders no element of its own at all, so a
rule aimed at an Arena element can be discarded with nothing to report it. The statement lives
in [`../PACKAGING.md`](../PACKAGING.md), which is the document that owns what an adopter may
lean on and the one place allowed to say it of every target at once.

## Arbitrary values are a build failure

`bun run check:arbitrary` fails on any bracket carrying a raw literal such as
`text-[13px]` or `bg-[#b52a20]`.

Three shapes are legal, and nothing else. A `var()` into a token
(`border-[length:var(--bw)]`). A **derivation** of tokens, meaning a `calc()`, `min()`,
`max()` or `clamp()` whose operands are tokens, zeros and multipliers
(`text-[length:calc(var(--avatar-md)*0.4)]`), which is the same rule
`frameworks/AGENTS.md` states for a dimension anywhere in a framework layer: a token *or a
derivation of tokens*. And a single value in a unit the token layer does not model,
such as `max-w-[42ch]`, `max-w-[92vw]`, `w-[62%]` or `rotate-[120deg]`, because DTCG
admits only `px` and `rem` in a dimension, so there is no token to reference and
inventing one would be worse than the literal.

`px`, `rem`, `ms` and `s` are **not** in that set: tokens model those, so
`text-[13px]`, `duration-[200ms]` and `w-[calc(var(--sp-4)+8px)]` all still fail.
If a manifest needs a value with no token behind it, the token is what is
missing: add it to `contracts/design/` first.

<!-- check-arbitrary-values allow: text-[13px] bg-[#b52a20] duration-[200ms] w-[calc(var(--sp-4)+8px)] -->

**A fourth shape exists, and it is earned rather than general: an arbitrary
PROPERTY, with no `utility-` prefix.** A `transition-[...]`/`duration-[...]` pair
sets one duration for every listed property, because Tailwind's `duration-` utility
writes a single `transition-duration` for the whole `transition-property` list and
there is no second one to layer on for just one property. `ArenaButton` needs
`background` and `transform` at `--dur-fast` and `box-shadow` at the slower
`--dur-mid`, which is three properties and two durations, something the CSS `transition` shorthand
expresses freely by giving each property its own clause and a utility pair cannot
express at all. `ArenaButton.manifest.json` writes the whole declaration as one bracket
instead:

```
[transition:background_var(--dur-fast)_var(--ease-out),transform_var(--dur-fast)_var(--ease-out),box-shadow_var(--dur-mid)_var(--ease-out)]
```

Every operand is a `var()` into a token, so `check:arbitrary` holds over it exactly
as it does over the other three shapes: the escape is the *property*, never the
literal. **Reach for it only when a utility cannot express the declaration at all**,
which here means a per-property duration; a value a normal utility could carry
belongs in a normal utility. Writing the shape down is what keeps reaching for it from
being quiet.

The gate scans `.md` too, because a `.prompt.md`'s Don't block is exactly
where a bad example belongs, and an unflagged one is a bad example someone
copies into a manifest. The marker above is the one legal escape: an HTML
comment, invisible in rendered markdown, naming exactly the classes it
exempts: `text-[13px]`, `bg-[#b52a20]`, `duration-[200ms]` and
`w-[calc(var(--sp-4)+8px)]`, the counterexamples this section uses. A class
this file carries that no marker names still fails;
a marker naming a class the file no longer carries fails too, as a stale
allowance. The marker is honoured in `.md` only, and found in any other
style plugin it is itself a failure.

## A scale where a role belongs is a build failure

A scale says how round a corner is, how thick an edge is, how deep a shadow is and how long a
transition takes. A role says WHICH corner, edge, depth or transition is being asked about. The
roles live in `contracts/design/roles.json`, every one an alias of the scale step it names, so
the default appearance is the same pixel it always was.

A manifest writes the role, and `check:roles` fails one that writes the scale:
`rounded-surface`, `rounded-surface-floating`, `rounded-control`, `rounded-control-sm`,
`rounded-field` and `rounded-marker` rather than `rounded-lg` and its siblings;
`shadow-surface-floating`, `shadow-surface-deep` and `shadow-control-raised` rather than
`shadow-2` and its siblings; `--bw-surface`, `--bw-control`, `--bw-field`, `--bw-marker` and
`--bw-separator` rather than `--bw`; `--dur-hover` and `--dur-state` rather than `--dur-fast`
and `--dur-mid`; `ease-hover` and `ease-state` rather than `ease-out`, paired with the duration
the same transition names, because a curve is half of what a transition feels like and a manifest
that named a role for the length and a scale step for the shape would have answered half the
question.

**Why it is a rule and not a preference**: a style plugin is a scope class that re-values
role tokens, so a manifest that resolved a role to a scale step at build time cannot answer to
one. Re-valuing the scale instead is not a repair, because a step is shared by every use that
happens to want that length, and a card and a tooltip do not stop being different things by
agreeing on 14 pixels.

**The five kinds a role names.** A SURFACE has things placed inside it. A FLOATING surface is
one that sits over the page rather than in it. A CONTROL is pressed. A FIELD is typed into. A
MARKER encloses a label and nothing else, so it is none of the other four. A SEPARATOR is the
sixth and it is not a kind of thing but a kind of edge: the line dividing one thing from the
next INSIDE a surface. It is a separate role from `--bw-surface` for the reason that matters
most to this whole tier, which is that a style plugin grouping by elevation removes the enclosure
and a table whose row rules vanished with it would stop being readable.

**Radius and depth are banned by utility name; a border width and a duration by TOKEN name; an
easing by both.** The first two have a Tailwind namespace and the next two do not, so those are
reached as the token itself. Banning the token catches `border-[length:var(--bw)]` and the
`var(--dur-fast)` buried inside an arbitrary `[transition:...]` property with one entry rather
than one per spelling, which is the shape `ArenaButton`'s four-property transition takes. An
easing is the one family a manifest writes both ways, as `ease-out` beside a duration and as
`var(--ease-out)` inside that same arbitrary property, so it is banned under both spellings and
they cannot double-count: the utility pattern refuses a match preceded by a hyphen, which is
every occurrence inside `var(--ease-out)`.

`SCALE_USES` in `scripts/check/tailwind/check-role-tokens.ts` records the places that genuinely
mean the length: a placeholder faking the shape of what it stands in for, a tooltip whose corner
follows its label, a `calc()` adding a hairline up rather than drawing one. Each entry names one
case and says why, and an entry no manifest carries fails the gate as a stale allowance.

## A slot paints the expressive properties even when they are neutral

A token re-values a declaration a slot already makes and cannot add one. A card that declared no
`box-shadow` could therefore never be given depth by a style plugin, however that style plugin was
written, so the flat surfaces and the flat controls carry `shadow-surface-rest` and
`shadow-control-rest`, and `ArenaButton` carries `hover:-translate-y-[var(--lift-control)]`. All
three default to nothing: the two shadows are fully transparent, because DTCG 2025.10 types a
shadow as offsets, blur, spread and a colour and has no way to spell the absence of one, and the
travel is `0px`.

**A variant branch that restates a role as a literal un-paints it, and that is the same defect
seen from the other end.** A root painting `shadow-surface-rest` whose `floating` variant writes
`shadow-none` on the false branch, which is the DEFAULT, resolves every ordinary card to a
transparent literal instead of the role: the one token authored to let a style plugin trade
hairline grouping for elevation then reaches nothing on the component it was written for. A branch meaning "the value the slot already paints" says nothing at all, because the base
rule is already the answer. `shadow-none` is therefore in `SCALE_UTILITIES` beside `shadow-1`,
with `ArenaTabs`'s tab on the record in `SCALE_USES`: that slot paints no depth role, so its
literal cancels the selected branch's inset rule rather than overriding a role.

**Rest and raised compose by source order, not by merging.** A slot's resting depth sets
`--tw-shadow` in the base rule and its hover sets the same variable in a rule emitted after it,
which is the ordinary arrangement described above rather than anything new. A slot that already
paints a shadow does not also take a resting role: `ArenaMenu`'s panel floats, `ArenaDialog`'s
panel is deep, `ArenaCheckbox`'s box spends its shadow on the focus ring, and
`ArenaSegmentedControl`'s selected segment on its lift.

**A transition names the property Tailwind emits, and v4 emits `translate`, `scale` and `rotate`
rather than `transform`.** Those are separate animatable properties, so a transition listing
`transform` animates none of them and the change lands in one frame, silently: a press that never
eases, a knob that jumps to its other end, and nothing anywhere reporting it. `check:tailwind` fails a slot that transitions `transform` while painting any of the
three, which is why the rule needs no vigilance.

## Consumption order

1. Bring Arena's tokens into scope with `@import "../../intro/styles.css";` (or the
   individual `contracts/design-generated/*.css`).
2. `@import "./Theme.css";`, the Tailwind `@theme` preset.
3. Consume a component manifest from
   `./components/<category>/<component-kebab>/<Component>.manifest.json`.

**A page rendering Arena's own components consumes `consume/` instead, and consumes nothing
else.** That directory holds the compiled CSS, once, for every layer: `Preflight.generated.css`,
`Prelude.generated.css`, one
`consume/components/<category>/<component-kebab>/<Component>.styles.generated.css` per surface,
and `Components.generated.css`, the barrel over all of them. Link the preflight plus the sheets
for the surfaces the page actually draws, which is what a generated playground does; link the
barrel when the page draws most of the library, which is what the Console does. Each component
sheet `@import`s the prelude itself, so one alone is safe.

**A surface a component renders inside ITSELF is one it draws**, and it is the half a page is
most likely to miss, because nothing on the page names it: `ArenaTable` renders an `ArenaPagination`
whoever implements it, and `ArenaUnauthCard` renders an `ArenaCard` in one implementation and draws the
same frame from its own manifest in another. `scripts/lib/arena/composed-surfaces.ts` reads that
from every implementation and **unions** it, so a page carries the same list wherever it is
served. Nothing fails a page rendering an `arena-*__*` class no sheet it links defines, since
a real browser is the only place that question has an answer.

## How this layer is laid out

**Directories are `kebab-case` and lowercase; a file name begins with a capital, and a
multi-word stem is `PascalCase` with hyphens removed; a secondary dotted segment stays
`lowerCamelCase`.** List the layer root's own source rather than trusting a count here, with
`ls frameworks/tailwind/*.ts frameworks/tailwind/*.js frameworks/tailwind/*.css | grep -v generated`.
This file sits beside them and complies as it stands, `AGENTS.md` being a
capital-initial name like any other, and a component's files sit together in one
directory:

```
components/display/arena-badge/
    ArenaBadge.manifest.json          the source of truth
    ArenaBadge.manifest.generated.ts  generated by `bun run build:tailwind`
    ArenaBadge.card.html              the specimen
```

**The compiled stylesheet is the one thing that does not sit there**, because it is what every
layer links rather than what one directory owns: it is emitted to
`consume/components/display/arena-badge/ArenaBadge.styles.generated.css`, at the same category and
directory. `sheetPath()` in `scripts/build/tailwind/build-tailwind.ts` is the single place that
mapping is written, and the gates and both package builds go through it.

The category comes from `frameworks/Components.json`, which declares it once for all three
framework layers, and `bun run check:structure` fails a component directory that sits
anywhere else. That gate says nothing about whether the category is the *right* one, which
is editorial judgement and no gate has it. **All three framework layers share this shape**,
so the gate reads every layer unconditionally; `LAYERS` in `scripts/check/arena/check-structure.ts` is
the exhaustive enumeration, deliberately not a walk of `frameworks/`, so a layer renamed or
removed wholesale becomes loud rather than quietly leaving the gate's scope. The root
`frameworks/AGENTS.md` carries the naming rule and its mechanical exceptions in full; count them there
rather than here.

A specimen sits three directories below the layer root, so every reference it makes to the layer
root, whether `Specimen.css`, `Specimen.js` or `consume/Preflight.generated.css`, carries three
`../` segments, and `intro/styles.css` carries five. Its own stylesheet is one of those root
references and not a sibling: `../../../consume/components/<category>/<component-kebab>/`,
which is the specimen's own directory read back under `consume/`.

**Be exact about what catches a miscount, because nothing loads the page.** A broken **script**
path (`Specimen.js`, or the page's own manifest `fetch`) leaves `#root` empty, which
`classify()` reports as `unrendered`; `main()` routes that to `skip()`, which the repository's
declared strict setting turns into a failure, and which an environment exporting
`ARENA_CHECK_STRICT` as anything but `1` turns back into a SKIP and an INCOMPLETE run,
**not a failure**. And a broken **stylesheet** path (`intro/styles.css`,
`Utilities.generated.css`, `Specimen.css`) is not caught at all: the page still renders, so an
unstyled specimen that happens to fit its declared box passes outright, and one that
under-runs only warns. What actually stands behind a correct specimen is the by-hand
check: run `bun run demos` and open the page.

**One shape of that IS caught, and it is the one a page adds by composing.** A specimen that
`fetch`es a second manifest, as `ArenaUnauthCard` does `ArenaAppLogo` and `ArenaToastHost` does `ArenaToast`, renders
a second component's classes and needs that component's sheet as well. `check:component-css`
reads every `fetch` in the page and fails a missing link, which is the whole of what is held
here. It still says nothing about a link that is present and points at nothing.

## What ships here

`components/` holds one manifest per surface. Count them with `find components -name
'*.manifest.json' | wc -l`, and the components with none with the command below. Each has a specimen page
beside it that renders the real markup from the real recipe with no build step. **A manifest
is held up by its own gates and never by having a consumer**: `bun run check:tailwind` demands
that every class it declares produce a rule, so one nothing reads yet cannot rot silently, and
the specimen renders it either way.

**`check:tailwind` also fails when it finds no manifests at all**, and that guard is what
stands between the gate and a vacuous pass. A gate iterating zero
manifests finds zero violations by construction, so a discovery step that reads the wrong
directory prints `0 manifest(s) … all resolve` and exits 0 over a layer it never looked at.
Discovery is one shared recursive walk, `manifestFiles()` in `scripts/lib/tailwind/tailwind-compile.ts`, and
an empty result is an explicit failure rather than a clean pass. Every site that needs to
find manifests calls it: `compileLayer()` in that same file, which `check:tailwind` and
`build:tailwind` go through; `check:radius` and `check:states` directly; and a consuming
layer's own suite, which reaches it by dynamically importing a file URL so the specifier
resolves from a source tree and from a compiled emit alike, so nobody has a reason to write
a fifth spelling of the walk.
`compileLayer()`'s returned `manifests` map is keyed by **repo-relative path**
rather than by basename, which is what a message naming a manifest in a nested tree needs;
a consumer wanting the bare name calls `basename()`.

**A manifest mirrors a SURFACE, not a component, so some contracted components have none.**
Derive the set rather than trusting a list:

```bash
comm -13 <(find components -name '*.manifest.json' -exec basename {} .manifest.json \; | sort) \
         <(python3 -c "import json;print('\n'.join(sorted(n for v in json.load(open('../Components.json')).values() for n in v)))")
```

Two reasons put a component in it. **A compound family draws one surface**, so the parent's
manifest holds every level of it and its members have none of their own. `MANIFEST_COVERS` in
`scripts/lib/tailwind/manifest-surfaces.ts` is the mapping, read it there rather than from a list
here. **And a chart drawing geometry has no surface a class string can describe**: a chart is SVG
geometry driven by measured container width, its identity is path data and attribute bindings, and
a manifest holding it would be a lie about where the styling lives. `HAND_DRAWN` beside
`MANIFEST_COVERS` is that roster. `ArenaChartCard` is in neither and does have a manifest, since
it is a bordered tile.

`Utilities.generated.css` is **generated** and **git-ignored**: `bun run build:tailwind`
compiles the preset with the manifests as content, and `bun run check:tailwind-generated` fails
when the file on disk and the source disagree, or when it is missing because the clone has not
been built. Only the specimen pages link it; an adopter compiles their own against this
preset. The same build also emits a `<Component>.manifest.generated.ts` (`as const`) beside
each `<Component>.manifest.json`, git-ignored the same way, and a consuming layer's recipe
imports it, so a typed build needs it on disk before it will compile at all. The JSON stays
the single source of truth either
way, so a new manifest needs a `bun run build:tailwind` before the gates pass.

**A variant name is scanned as a class name.** Tailwind reads a manifest as raw text, so
a variant *name* that collides with a utility (`visible`, `block`, `line`, `fixed`,
`static`…) leaks a dead rule into `Utilities.generated.css`. It is harmless per instance and
accumulates across the set. `visible` is one such collision, which is why the layer's shared name
for a shown/hidden boolean is `open`. Name variants with that in mind.

**`compoundVariants` work and one manifest uses them.** `ArenaPageHead` needs a class that depends
on two variants at once, `classesFor()` resolves them after every single-variant slot, and
`arenaStyles` applies one only when every condition it names holds. They compile to a
`--cv<n>` class in declaration order. Prefer a plain boolean variant where one will do: a
compound is harder to read and the emitted name says less.

## A slot name is a public contract

A manifest's slot names leave the repository twice: as the `arena-<manifest>__<slot>` class the
compiler writes, and as the `data-arena-part="<component>.<slot>"` attribute every element drawing
that slot carries. The attribute is what a style plugin selects, so **renaming a slot is a break**,
in the same sense that renaming a component's input is one. The name is the whole cost of the
escape hatch, and it is stated here, where slots are defined, rather than discovered at a
consumer's build.

`slotPart` in [`ManifestClasses.js`](./ManifestClasses.js) spells the part the way `slotClass`
spells the class, from one module, because the generator and the browser specimen harness both
read it. [`check:parts`](../../scripts/check/arena/check-parts.ts) fails an element that carries a
slot class and no hook, in either layer.

**A slot that is a second class on another slot's element declares that in `partOf`.** Some slots
are not a part of the DOM at all: `tdMono` is the `td` element set in the mono face, `pageCurrent`
is the `page` a pager marks as current, `indeterminate` is the `track` while it sweeps. A
component composes those classes onto the base slot's element, so the element carries the base
slot's hook and there is nothing for a hook of the variant's own to sit on. `partOf` maps the
variant to its base and `classesManifest` resolves the part through it, so what the kernel
advertises is what an element carries.

**Without it the surface over-claims and nothing notices**, which is the failure this key exists
to close: `check:parts` sees a hook on the element and passes, and a plugin's rule against the
variant's name matches nothing on any page while still reading as coverage.
[`check:style-plugin-coverage`](../../scripts/check/core/check-style-plugin-coverage.ts) now asks
the question both ways, so a part painted and never emitted fails as loudly as one emitted and
never painted. The cut is which decision a state is: a variant painted through a `variants` block
needs no entry, because a variant class already belongs to the slot it modifies.

## What a manifest is compiled into

A manifest is authored as Tailwind and never shipped as Tailwind. `bun run build:tailwind`
translates each slot and each variant branch into an `@apply` rule under an
`arena-<manifest>__<slot>` class name, compiles the lot, strips Tailwind's own theme
indirection back to the Arena token behind it, and cuts the result into one stylesheet per
component plus the prelude they share, all of it under `consume/`. What a component composes at
runtime is the class names, never the utilities.

**That output exists once and is linked, never copied.** A stylesheet emitted per consuming
layer is a stylesheet that can be stale in one of them while the gates read another, and the
copies were byte-identical anyway, since the class names a manifest compiles to say nothing
about who renders them. The class TABLE is still emitted per layer, for the opposite reason: a
component *imports* it, and an import that crosses a layer boundary is the coupling this
repository does not have.

## Invariants the manifests must reproduce

- **Danger is outline:** `border` and `text` in `--error`, transparent fill; a
  filled danger surface is reserved for `ArenaConfirmDialog`'s final confirmation.
- **Focus is the gold ring.** No gradient utilities. Uppercase is reserved for
  micro-labels. Charts carry identity (`--color-cat-*`) or meaning (status),
  never both.

Authoring a manifest that needs a value no token holds is a spec violation: add
the token to `contracts/design/` first, then reference it here.

## A state modifier always outranks a variant on the same property

Hover, focus and disabled are Tailwind state modifiers (`hover:`, `focus-within:`,
`disabled:`), never variants, which is what lets a static specimen render one
variant combination and be right without a browser interaction driving it.

The corollary matters just as much: **a state modifier beats a plain variant
class on the same property, always**, both on specificity, since a pseudo-class adds
a selector so `focus-within:border-secondary` compiles to `(0,2,0)` against a
variant's plain `border-error` at `(0,1,0)`, and on source order. A state
modifier left on a slot's **base** string therefore leaks through every variant
built on that slot, including the ones that must lose to it. The failure is concrete:
put `focus-within:border-secondary` / `focus-within:ring-secondary/16`
on `ArenaInput`'s base `field` slot and all three `state` values (`neutral`, `error`,
`valid`) inherit it. `error`'s own `border-error`/`ring-error` are plain classes
with lower specificity, so focusing an errored field turns it gold and
the validation signal disappears exactly when the user tries to fix it, and
`contracts/api/components/ArenaInput.json` states the opposite in as many words: the
four states are ordered **error, focus, valid, neutral**, and error must win.

The fix: move the `focus-within:` classes off the base and into the specific
variant branches that are allowed to lose to them (`neutral` and `valid`, which
both correctly turn gold on focus), and leave the branch that must win (`error`)
with no focus-within rule to compete against, so its plain class holds regardless
of focus. **Read the contract's state order before writing the manifest**: that
order **is** the override order a state modifier is allowed to have, and the base
slot is only a safe place for a modifier every variant branch is willing to lose to.

## Two classes at equal specificity are ordered alphabetically, not by manifest order

Tailwind emits same-specificity utilities sorted by value inside each property
bucket, so `bg-transparent` always compiles after `bg-primary/14` and
`text-base-content/82` always compiles after `/62`, whatever order the
manifest declares them in or however sensible the manifest's own ordering
looks. When a base slot and an additive modifier slot both set one property,
the alphabetically-later value wins the cascade, which is arbitrary with
respect to intent rather than a rule anyone chose, and unpredictable from reading the
manifest alone. Never rely on it, and never "fix" it by reordering the class
string: reordering does nothing, because this is the *compiled stylesheet's*
order rather than the string's. A property a modifier slot overrides does not belong
on the base slot at all; put it in every modifier branch instead, so the base
slot only ever carries a property no sibling modifier touches.

This is a different failure from the one above: a state modifier (`hover:`,
`focus-within:`) always wins on *specificity*, a real, deterministic ordering
axis. Two *plain* classes for the same property, from a base slot and a named
modifier slot, share one specificity band, and Tailwind's own sort order
inside that band is what decides, which is what makes it look "correct" far
more often than it should. `ArenaMenu`'s `item`/`itemDefault`/`itemDestructive`/
`itemDisabled` is the reference shape: `item` carries only what no modifier
branch overrides (layout, no color, no cursor), and every color and cursor
value lives in exactly one of the three modifier slots, never on `item`
itself. `ArenaCommandPalette`'s `row`/`rowDefault`/`rowActive` and
`rowLabel`/`rowLabelDefault`/`rowLabelActive` follow the same shape for the
same reason: a resting row needs its own explicit background and text color,
not an absence that happens to lose to the active row's tint by alphabetical
luck. A `arenaTv()` `variants` block does not carry this risk the same way: each of
its slot's classes resolves through one `slot()` call, and the configured
`arenaTv` (`frameworks/tailwind/Tv.ts`) merges that call's own base and chosen
branch with `tailwind-merge`, which resolves same-property conflicts by
config, not by generation order. The risk above is specifically about **named
sibling slots**, meaning extra `slots` keys outside any `variants` block that a
consumer string-concatenates onto a base slot by hand (a specimen's `el()`
call, or a consumer's own template interpolation), because that
concatenation never goes through `tailwind-merge` at all, in the specimen
*or* in the real component.

One shape of copy is worth naming. `ArenaSegmentedControl.manifest.json`'s `selected`
variant carries a hover affordance its contract declares, and `ArenaTabs`' visually
near-identical `selected: false` branch must not, because neither `ArenaTabs.json` nor
`ArenaTab.json` declares one. **A modifier copied that way is caught**:
`bun run check:states` reads `affordances` in `contracts/api/` and fails a
modifier no covered contract declares. What is still not caught is everything
else a copy brings with it: no gate compares a manifest's colors, sizes or slot
structure against anything. A manifest written by reading a neighbouring
manifest rather than the contract is how such a divergence enters the layer and
stays, undetected, until someone reads both side by side.

## A co-varying value belongs in the variant it co-varies with

A value that must track another member can look, briefly, like a constant, so do not
flatten it to the constant of the "middle" case. `ArenaIconButton` is the worked example: an
icon-only width looks like one number, but it is the *size-specific* control height,
`--dz-ctl-h-sm` (32), `--dz-ctl-h` (40) or `--dz-ctl-h-lg` (48), because an icon-only
control is square at whatever height its size sets. Pinning the `md`
value as `w-ctl-h` on the `showLabel: false` compound would render `sm` at 40×32, and
only `lg` would look square, by accident, because its own `min-w-ctl-h-lg` (48)
outranks the wrong 40px width.

So the compound carries no `w-*` at all. `size` already carries the correct
`min-w-ctl-h-{sm,md,lg}` per size, and with `p-0` alongside it, an icon glyph narrower
than every size's minimum floors the box at exactly the control height: square, at all
three sizes, with no second width class to conflict with it. Before flattening a value that varies with a
prop to one class, ask which *other* variant group it actually co-varies with,
and put it there instead.

## This layer is border-box, and it relies on no other layer for it

It gets it from `Utilities.generated.css`'s preflight, which sets
`box-sizing: border-box` on every element inside `@layer base`. `contracts/design/reset.css`
sets the same thing for anything that imports `intro/styles.css` instead. Two files, one box
model, and a slot's declared size is its outer edge either way.

**Never derive a box model by reading a source and reasoning about what it does not say.**
"No `box-sizing` is declared, therefore content-box" is wrong in both directions at once,
because Chromium's UA stylesheet has already made `<button>` and `<select>` border-box and
has not touched `<textarea>` or `<input type="text">`. A conclusion drawn that way claimed
divergences that did not exist for every slot that happened to be a `<button>` and missed a
real 26px overrun. Measure the rendered box.

**Corollary, and it has two independent reasons:** never add a `box-border` class
to a manifest slot expecting it to change anything. Every slot is already border-box from
the preflight, so the class is a no-op that only reads as if some *other* slot were missing
it.

**Both of those files reach the whole document, and that is the one architecture promise the
stylesheet does not make.** The reset selects `*` and sets a line height on `html`, and the tokens
are declared on `:root`, so a project embedding Arena as a fragment inside somebody else's page
changes that page and not only its own subtree, and two Arena versions in one document collide on
`:root` with the last sheet loaded winning. **This is stated so nobody widens the reach further
believing it is already document-wide anyway**, and so nobody narrows it to fix an embedding
without knowing what it costs: every slot's declared size is its outer edge BECAUSE of that
preflight, so scoping it to a container is a different box model for every component at once. What
does work in a fragment's favour is that a palette other than the default emits as a plain class,
which a subtree can carry. The consumer branch says the same thing where a project chooses that
architecture, and this is where the reach is authored.

## P1: invented states

Before adding any state modifier a brief does not contain, read
`contracts/api/components/<Name>.json` and check that its `affordances` array
declares that family. "Every other component has one" is not evidence; it is the
failure mode.

A manifest authored by reading a neighbouring manifest instead of the contract is
how this defect arrives, and prose alone does not prevent it. `bun run check:states`
(`scripts/check/arena/check-manifest-states.ts`) is what holds it: a modifier no contract
the manifest covers declares fails the build. Read the contract anyway, because the gate
knows only that the affordance exists somewhere on the covered surface, never that
this slot is where it belongs.

The gate's other half asks a layer's own source the same question, and there is now almost
nobody left to ask. A layer that realises an affordance by rendering the manifest's class has
no answer of its own to give, because the answer is the manifest, and both layers do that
wherever a component renders its recipe. So that half reads `HAND_DRAWN`, in
`scripts/lib/tailwind/manifest-surfaces.ts`, which is the set of components drawing their own
appearance: every chart, whose geometry no class string can describe. An empty
`HAND_DRAWN` fails rather than passing over nothing, so retiring that half would be a decision
somebody has to write down.

## P2: hover on a disableable slot

Any `hover:` on a slot that can also be `:disabled` must be guarded
(`not-disabled:hover:`) or paired with a disabled property that neutralizes
it. `:hover` matches a disabled element's pseudo-class in Chrome and Firefox, which
suppress the *events* a disabled control would otherwise dispatch rather than
selector matching, so an unguarded `hover:bg-*` still paints on a disabled
button: a disabled prev/next arrow, rendered dim and `not-allowed` by design,
tints on hover anyway.

`ArenaIconButton.manifest.json` gets away with an unguarded `hover:bg-base-200`
only because its `disabled:opacity-45` mutes *everything* the element renders,
tint included. The hover still technically fires, but nothing shows through
the reduced opacity that a sighted user would read as feedback. A bare
`hover:bg-*` with no such blanket disabled treatment does not get this for
free; guard it explicitly.

## P3: border-box arithmetic is computed, never summarised

`contracts/design/reset.css` sets `box-sizing: border-box` on everything, in every layer, so an
explicit size is the OUTER edge and border and padding carve out of it. **Padding carves out of a
border-box total exactly the way a border does**, and a prose summary is exactly where that term
goes quietly missing: reasoning in sentences drops padding from the computation, and the
resulting numbers are wrong in a way that reads as plausible.

So for every slot combining an explicit size with a border or a padding, compute the content box
from the actual utility values and the actual component source **before** writing the sentence
that describes it, and state the arithmetic rather than the conclusion. A verdict of "does not
apply" needs the same computation, not an assertion.

**The reset is what makes this one rule instead of one per layer**, and it is also the trap: a
repo-wide reset invalidates every argument that rested on the default it replaced, and those
arguments live in prose that no gate reads. An argument about a box model is only as current as
the reset it assumes, so state which one, or measure.
