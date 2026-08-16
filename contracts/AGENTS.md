# Arena's contracts

Three levels, one roof. Each states, once and neutrally, something every platform
target implements, and each level's normative statement starts at the `AGENTS.md`
in its directory.

| Level | Governs | Normative statement |
|---|---|---|
| [`api/`](api/AGENTS.md) | the members a component's API presents | `api/AGENTS.md`, plus [`api/MemberForms.md`](api/MemberForms.md) |
| [`behaviour/`](behaviour/AGENTS.md) | what a kind of component must do: roles, keys, focus, dismissal | `behaviour/AGENTS.md` |
| [`design/`](design/AGENTS.md) | what a value is | `design/AGENTS.md`, plus [`design/Scales.md`](design/Scales.md), [`design/StylePlugins.md`](design/StylePlugins.md) and [`design/TokenTypes.md`](design/TokenTypes.md) |

**A level's statement is one file or several, and where it is several the split is by AUDIENCE
rather than by topic.** The `AGENTS.md` is always the half that **decides**, and a sibling is
what a reader **consults** while doing the work:

- `api/AGENTS.md` decides whether a member should exist, what required means and what the gate
  can hold; `api/MemberForms.md` is the vocabulary you write it in, the nine forms, the six
  derived rules, the binding table and the file format.
- `design/AGENTS.md` says what a value MEANS; `design/Scales.md` is every scale step by step and
  which role each step plays; `design/StylePlugins.md` says what the kernel exposes and what a
  style plugin may answer with, which is what a consumer replacing the appearance reads;
  `design/TokenTypes.md` says what DTCG `$type` it carries and what shape it is authored in, which
  only somebody authoring a token or targeting a new platform needs.
- `behaviour/` is one file, because it has no second audience to separate: nobody reads a
  pattern without intending to implement it.

**Every one of those files is named in `SHAPE`**, in `scripts/check/arena/check-contracts.ts`,
so a sibling nobody declared fails rather than sitting invisible to every gate that reads a
level by file extension. **Splitting a level is therefore a two-file change**, the document and the
declaration, and the gate is what makes it one.

Read the one for the level you are implementing. None of the three is a summary of
another: `design/` answers *what is this value*, `behaviour/` answers *what must this
component do*, and `api/` answers *what does a consumer write*. A component can satisfy
any one of them while failing the other two.

## Which level does a fact belong to

**The question is what kind of thing it is, never which component prompted it.**

- **Is it a value?** A colour, a spacing step, a duration, a delay before a tooltip opens. That
  is `design/`, as DTCG JSON. **Behaviour has values and they are tokens like any other**:
  `design/behaviour.json` holds `delay`, `dismiss` and `limit`. Two rules govern what belongs
  there. A behaviour value is **a decision the system makes, not a mechanism**: how long a
  tooltip waits is a design decision, a debounce interval on a synchronous in-memory filter is
  not. And **a value is not a contract**.
- **Is it something a kind of component must DO?** Which keys it answers, where focus lands,
  what dismisses it, which role it carries. That is `behaviour/`, one file per pattern. DTCG
  models colours, dimensions and durations, and does not model "Escape closes this", so putting
  a pattern under `design/` would mean relaxing `check:dtcg`, one of the cleanest gates here.
- **Is it a member a consumer writes?** That is `api/`, one file per component, stated once and
  neutrally, and every layer implements exactly those members.

**A fact that is none of the three is not a contract.** How a compound family coordinates, which
element a layer renders, what an idiom forces: all of that belongs beside the source, in the
layer's own document or the component's `.prompt.md`.

## The three levels are firm in one direction

`design/` and `behaviour/` are settled and **not reopened by `api/`**, which is orthogonal and
additive: bringing a component under an API contract may not weaken, remove or contradict its
behaviour binding or the tokens it renders from.

**When an API reshape appears to require dropping something a behaviour binding depends on, the
reshape is what is wrong.** `ArenaConfirmDialog` is the worked example: its `cancel` event is how the
dialog reports an Escape-key dismissal, which `dialog-modal` requires, so a contract that
omitted it to look tidier would leave the Escape handler with nothing to emit and silently void
that requirement.

## Emission, and why it is per layer

`design/` emits CSS into `design-generated/`, which ships to a browser directly, which is why it
is the one level with a generated sibling directory. `api/` and `design/` both also emit
**per framework layer**, `Api.generated.*` and `Tokens.generated.*`, so that a component's
import never crosses the `contracts/` ↔ `frameworks/` boundary. `behaviour/` emits nothing.

**A value reaches both layers as a custom property and by no per-layer step at all**, which is
the reading the paragraph above is most often given the other way round. The generated CSS is
tracked, every page links it, and a layer that wants a value writes `var(--name)`: there is no
file under `frameworks/` to edit and nothing to add. `Tokens.generated.*` is the exception below
and never the route, so a contributor asked to make both layers reach a new value and reading
only the paragraph above reaches for the flag, which is the one move that cannot be undone
cheaply.

**A token whose consumer is JavaScript emits twice.** One flagged
`$extensions["com.dravensoft.arena"].script: true` gets the custom property it always would have
**and** a bare number in each layer's `Tokens.generated.*`. Flag one only when JS arithmetic must
consume it to produce a position: an SVG `y` from a data value, a clamp against
`window.innerWidth`. **The price is not negotiable**: a value bound at import time cannot
re-theme and cannot re-densify.

**One type ties the API level back to the design one, and it is deliberately one case rather
than a mechanism.** `api/types/cat-slot.json` declares `ArenaCatSlot` as a literal set whose bound is
not authored there: it is the count of `--color-cat-*` slots in `design/palette.dark.json`,
reaching the layers as the derived `catSlots` constant. `check:script-tokens` asserts the set is
exactly `1..catSlots` **in order**, so a further colour in the ramp fails the build until the
contract type follows. **A second such type would need its own tie before it may be an enum at
all**, and `api/AGENTS.md` states that rule in full.

## What holds each level, and what nothing holds

`check:dtcg`, `check:tokens`, `check:api`, `check:behaviour` and `check:script-tokens` each fail
on an **empty directory** rather than reporting zero violations over a tree they never opened;
`zeroContractProblems`, `zeroPatternProblems`, `zeroGeneratedCssProblems` and their siblings are
the guards, by name. `check:contracts` holds the shape this page describes: a stray file in a
level, a level missing its normative document, an undeclared inner directory, or a fourth
directory beside the three.

**None of them is a claim that a component is correct.** `check:behaviour`'s green run is a
coverage claim and never an accessibility one, and `check:api` says nothing about what any
component *does*. What proves a component behaves as it declares is a render suite, and that
record is `check:compliance`'s `COVERED`, partial by design.

## Audience and scope
- **Audience of the language: general public.** Arena is meant to give identity to **every kind of Dravensoft software**, regardless of who the end user is, from consumer apps to internal tools. Its foundations (color, typography, spacing, accessibility, voice) are general-purpose and don't assume a technical profile.
- **Arena ships no example application, and the omission is the point.** An app illustrates one product's audience, and a reader calibrates the language against whatever that app happens to be: a console aimed at engineers reads as though data density, jargon and keyboard accelerators were Arena's, when each of them belongs to that product. What the tree shows instead is every component at once, once per style plugin, in `frameworks/react/kitchen-sink/` and its Angular pair. Those pages carry no product and no audience, so a finding on one is a finding about the language. `intro/Arena - Overview.html` is the other end of the same idea: the framework-agnostic token language, deliberately showing no component at all.
- **Implication for audits and evaluations:** calibrate against the general audience the first bullet names. A finding that a component is dense, terse or shortcut-heavy is a finding about a product built with Arena rather than about Arena, and a product for a general audience would answer it with plain copy, comfortable density and fewer accelerators.

## Why a language of our own (and not Material/Fluent as-is)
Established systems (Material 3, Fluent, Carbon, Polaris) are **light-by-default, rounded and neutral in tone**. Dravensoft's identity is the opposite: **dominant warm black, crimson/gold accents, sharp geometry and a bold voice**. Forcing the brand onto Material would produce a "generic with a skin" app. Instead, Arena:
- **Adopts proven structural principles**: token discipline and a typographic scale (Carbon/IBM-inspired), clear states and density (Material-inspired), visible and accessible focus.
- **Rewrites the aesthetic decisions** for the identity: dark-first, contained radii, deep warm shadows, crimson as the voice and gold as distinction, and the **Rotor** as the signature mark.

## Sources
- Approved identity manual: `intro/Dravensoft Identity.dc.html`.
- Brand: Dravensoft, custom software development and B2B consulting.
- Concept: pride, spectacle, mastery. Motto: *"Software worthy of being exalted."*

## Why only design has a `-generated` sibling

`design-generated/` holds the five CSS files built from `design/`: four by Style
Dictionary (`bun run generate:tokens`) and `fonts.generated.css` by `scripts/generate/core/fetch-fonts.ts`, which can
also rebuild that one file alone, from the binaries already committed under `assets/fonts/`
and with no network involved, via `--css-only`. Never edit any of the five directly; edit
the source and rebuild.

The other two levels have no such directory because they emit nothing outside
`frameworks/`. `api/` generates `Api.generated.*` and `design/` also generates
`Tokens.generated.*`, but those are emitted **per layer**, into the layer that consumes
them, so a component's import never crosses a contract boundary. What makes `design`
different is that its CSS ships to consumers directly: `intro/styles.css` imports all
five, plus the hand-authored `design/colors.css` and `design/environment.css`.

So `design-generated/` is a fact about what this one level emits, not a convention
waiting to be applied to the other two. `contracts/api-generated/` would be empty.

## Two shapes, on purpose

`api/` keeps `components/` and `types/`; `behaviour/` and `design/` are flat. An inner
directory earns its place when it separates two different vocabularies: a component
contract and a shared type are different things, and `check:api` reads them as two sets.
`behaviour/` is flat because a pattern file and the `AGENTS.md` describing patterns are one
vocabulary, not two. `design/` is flat because the job an inner directory would do, keeping
the DTCG sources apart from Style Dictionary's output, is done at the top level by the
`design/` / `design-generated/` split instead.

So an inner directory is earned, never assumed. Add one only when it separates two
vocabularies a gate reads as two sets.

## The zero-result guards, by name

`zeroContractProblems` in `check-api.ts`, `zeroPatternProblems` in `check-behaviour.ts` and
`zeroGeneratedCssProblems` in `check-script-tokens.ts`. `design/` carries the same guard under
a different name: `check:dtcg` walks `contracts/design/` itself and fails the same way on zero
token files.

**`check:tokens` alone walks no directory**, so it has no result set discovery could find empty.
It compares the committed generated CSS against what `generate-tokens.ts`'s hardcoded file list
builds, and a source file gone missing still fails it, just not silently: the build it depends
on has nothing to read and stops rather than reporting a clean pass.

## Where everything lives

Arena's pure design language, meaning `contracts/` (all three levels plus `design-generated/`),
`assets/`, `scripts/`, and `intro/` (the entry stylesheet, the specimen cards and the two
browsable pages), sits at the repository root and is framework-agnostic. Everything framework-bound sits under `frameworks/`, so a new
framework is added without touching the language.

**The language**

- `intro/styles.css`: the global entry point, `@import`s only. Consumers link this file.
  Its eight `@import`s resolve as `../contracts/…`, so it stays one directory below that parent.
- `contracts/design/`: the DTCG 2025.10 source of every token value (`*.json`),
  `AGENTS.md` (the normative design specification), `TokenTypes.md` (the `$type` map and the
  strict 2025.10 value formats), and three hand-authored
  stylesheets: `colors.css` (aliases and `color-mix` derivations), `environment.css` (the
  `env()` safe-area insets composed with the spacing scale) and `reset.css`
  (`box-sizing: border-box`, the box model both layers share). None is a value, which is why
  none is DTCG: values are what `design/` governs, and how a value is combined at runtime
  belongs to each platform's own idiom.
- `contracts/design-generated/`: the five built CSS files, `fonts.generated.css` (from
  `fetch-fonts.ts`), plus `palette.generated.css`, `typography.generated.css`, `spacing.generated.css` and
  `effects.generated.css` (from `generate-tokens.ts`). Never edit any of them.
- `assets/`: `rotor-crimson/bone/ink.svg`, `app-icon.svg`, and `fonts/` (the bundled
  self-hosted `.woff2` binaries).
- `intro/guidelines/`: specimen cards (`@dsCard`) for typography (`type-display`, `type-body`,
  `type-mono`), color (`colors-neutrals`, `colors-accents`, `colors-status`,
  `colors-categorical`), spacing (`spacing-scale`, `spacing-density`), effects
  (`effects-radius`, `effects-shadow`), iconography (`icons`), brand (`brand-logo`) and
  the **danger convention** (`components-danger`).
- `scripts/`: the build steps and the gates. `generate-tokens.ts` generates the four token
  CSS files from `contracts/design/`; `check-dtcg.ts` asserts the source conforms to
  2025.10; `check-tokens-generated.ts` asserts the committed CSS matches the source;
  `check-ramp.ts` asserts the shipped ramp clears every gate in both themes;
  `check-text-contrast.ts` measures every text level against the real surfaces in both
  themes; `validate-palette.mjs` is the vendored data-viz palette validator;
  `check-release.ts` asserts the version, the marketplace `ref` and the tag agree; and
  `serve.ts` backs `bun run demos`.

**The framework layers**

- [`frameworks/react/`](../frameworks/react/AGENTS.md): the React primitives, the
  kitchen-sink page, and the shared layer-root modules.
- [`frameworks/angular/`](../frameworks/angular/AGENTS.md): the Angular layer for an
  existing Angular 20+/Tailwind-v4 app, meaning Arena's own primitives, with `@angular/cdk`
  positioning the two that anchor an overlay to a trigger.
- [`frameworks/tailwind/`](../frameworks/tailwind/AGENTS.md): a **shared**,
  token-derived Tailwind v4 layer, authored once rather than per framework because the
  token→utility mapping is pure CSS and a component's Tailwind recipe is data.
- [`frameworks/PACKAGING.md`](../frameworks/PACKAGING.md): the npm channel, which belongs to
  no one layer. Two packages, assembled from the two framework layers in place into a
  git-ignored `dist/`, carrying the language and never the skin.

Pick the layer you need: raw tokens, a framework's primitives, or the Tailwind layer on
top.

**In `intro/`**

- `Arena - Overview.html`: the token language, generated at runtime from
  `contracts/design/` and `contracts/design/colors.css`. Serve it with `bun run demos`.
- `Dravensoft Identity.dc.html`: the approved identity manual.
- Both load `styles.css`, `toggle.css` and their runtime as siblings, and reach `assets/`,
  `node_modules/` and `contracts/` with a single `../`, which is why neither may leave this
  directory. **Neither may take the directory with it either**: every generated playground
  page, in every framework layer, reaches back here for `playground.css` and `density.js`, so
  the two pages are not the only thing a move breaks. List the runtime with
  `ls intro/*.js intro/*.css` rather than from a list here.

**At the root**

- `skills/design/`: the Agent Skill the plugin registers, also usable standalone.
- `.claude-plugin/`: the Claude Code plugin manifest and marketplace catalog.
- `DOUBTS.md`: what counts as a debt in Arena, and where the records live.
