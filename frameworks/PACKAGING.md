# Packaging Arena for npm

> **For whoever builds or publishes a package.** Installing one instead? Read [`react/PACKAGE.md`](./react/PACKAGE.md) or
> [`angular/PACKAGE.md`](./angular/PACKAGE.md), which is the page npm shows.

Arena ships three ways from one tree. Two of them assume the consumer has this repository:
the Claude Code plugin, served from the git tag, and the Agent Skill. The third does not,
and this document is that one: **the npm packages a project installs with `bun add`**.

| package | assembled into | from |
| --- | --- | --- |
| `@dravensoft/arena-react` | `frameworks/react/dist/` | `frameworks/react/` |
| `@dravensoft/arena-angular` | `frameworks/angular/dist/` | `frameworks/angular/` |
| `@dravensoft/arena-contracts` | `dist/contracts/` | `contracts/` |

**The third is not a layer and its consumer is not a web project.** It carries the three contract
levels as JSON and nothing else: no code, no stylesheet, no dependency, and a manifest that declares
no `bin` and no `engines`, because whoever installs it is a Gradle or SwiftPM build fetching a
tarball over HTTPS and leaning on no npm semantics at all. It exists so a platform target outside
this repository consumes the same values rather than re-typing them, and everything in the rest of
this page about the other two, the CSS chain, the CLI, the peer dependencies, the skin a package
never carries, is about a web package and none of it applies to that one.

```bash
bun run build:release   # every source, and both packages assembled from them
bun run check:packages  # the manifests, and the CLI against the token pipeline
```

Each package's own `README.md` is what a consumer reads. They are authored here as
[`react/PACKAGE.md`](./react/PACKAGE.md) and [`angular/PACKAGE.md`](./angular/PACKAGE.md),
and the assembly copies each into its `dist/` as `README.md`. They live in the tree rather
than being written into `dist/` directly for one reason: `check:docs` reads them, so the
page npm shows holds to the same size, punctuation and comment rules as everything else.

**The half of that page which is the same page in both packages is written once**, in
`scripts/generate/arena/generate-npm-pages.ts`, and emitted into the `@shared` regions per file:
what the repository is, how a skin is declared, and the tail.
A person places the markers, so where a section sits on the page stays the page's decision and
only what it says belongs to the script; `check:skills` holds every region equal to a fresh emit.
What a layer decides stays hand-written in each: the import idiom, what the package exports, and
how a layout is composed. The rule is the one `check:duplication` states for any pair of documents
sharing a file name, applied to the pair a reader is most likely to meet: they are one page
rendered per package, and a sentence said twice by hand goes stale in one of them.

## The one decision everything else follows from

**A published Arena carries the language and never the skin.**

This repository's `contracts/design/palette.{dark,light}.json` is the Dravensoft skin. It is
the source Style Dictionary reads, and `check:ramp` and `check:text-contrast` measure it. It
is also the last thing a consumer wants: they are installing a design system to wear their
own brand, not Dravensoft's.

So the packages ship everything that is invariant, and the consumer declares the rest:

- **Invariant, in the package**: the reset, the type scale, the spacing and density scales,
  the effects, the layering, and `colors.css`, which never defines a skin value and only
  derives the muted text levels from `--color-base-content`.
- **The consumer's, in `arena.config.json`**: the palettes and the fonts.

One command travels in each package, `arena-to-prod`, and `CLI_BINS` in
[`scripts/lib/arena/package-assembly.ts`](../scripts/lib/arena/package-assembly.ts) is the
list both manifests take their `bin` from. Its source is its own directory under
`scripts/generate/core/`, described in
[`scripts/generate/core/AGENTS.md`](../scripts/generate/core/AGENTS.md), copied whole into
`dist/bin/`. **That copy is flat**, so two CLI trees may not share a filename and a command may
only import a sibling of its own; `copyCli` refuses either.

It does the two jobs a project always did together, and a failure in the first stops the second:

- **The theme** turns the consumer's JSON into the missing stylesheet, `arena.generated.css`.
  When their config carries a `stylesheet` key it writes the layer chain and the named component
  sheets in place of the `arena.css` barrel, reading both lists off the package it is running
  from rather than from a copy of them that could age. `"components": "auto"` resolves that list
  from their own sources against `components.json`, which each package carries and
  [`scripts/lib/arena/component-map.ts`](../scripts/lib/arena/component-map.ts) derives from the
  layer: what a consumer writes is not what dresses it, since there are fewer sheets than components, and
  the closure matters more than the mapping because Arena draws components nobody named.
- **The icons** write the Phosphor subset a project draws, `icons.generated.css`, reading the
  consumer's sources and the package it ships in, since a component renders icons the consumer
  never names.

**Import order is what makes it work.** The consumer's generated file comes last, and its
first line is an `@import` of the package's own `arena.css`. Both files declare into `:root`,
equal specificity, so source order decides and the consumer's values win.

**Phosphor is never bundled.** Arena's single-icon convention is a class name a component
renders, so the icons are a peer dependency in both packages. Bundling them would ship a
font the consumer may already have and cannot swap.

## One coupling, and it is part of the contract

**A package's iconography is Phosphor.** It is not an implementation detail a future version
quietly swaps, and it is worth saying plainly, because an adopter budgets for a dependency they
were told about and resents one they find.

- **Phosphor** travels as a **peer dependency** of both packages. Every `icon` member is a
  class name the consumer supplies and a component renders, so the font has to be installed
  and the names have to be Phosphor's. `check:icons` holds the names Arena itself writes.

**A second peer exists and it is optional, which is a different kind of thing.** The Angular
package declares `@angular/router` under `peerDependenciesMeta` as optional, and an adopter who
never installs it installs cleanly and is told nothing. It is reachable only through the
**secondary entry point** `@dravensoft/arena-angular/metadata`: the primary entry point names it
nowhere, which is a claim `grep '@angular/router' frameworks/angular/dist/fesm2022/dravensoft-arena-angular.mjs`
re-derives against the assembled package. That separation is the whole reason the entry point
exists rather than the provider sitting in the root barrel: a bundler **resolves** an import
before it eliminates it, so a router named anywhere in the primary graph is a router every
adopter has to have installed, whether or not they call the thing that needs it. So the coupling
is opt-in at the import site, and an adopter pays for it by asking for it.

**That claim is held at both ends now, and the two halves fail at different times.** The grep above
re-derives it against the assembled package, which is what a released tarball actually promises;
`check:architecture` holds it against the sources, failing an import of the router from anywhere
outside `frameworks/angular/metadata/` and failing the optional declaration being withdrawn from
`OPTIONAL_PEERS`. The source half is the one that reports the mistake on the change that made it,
before an assembly exists to grep. **A dependency is the one part of a design system an adopter
cannot route around**, so what either half prevents is a project that answered no to being found
from outside installing a router in order to use a button.

**A secondary entry point is a directory holding its own `ng-package.json`**, which
`build-angular-package.ts` writes into the staging tree from `SECONDARY_ENTRY_POINTS`. ng-packagr
finds it, compiles it into its own FESM module and its own types, and adds the subpath to the
package's `exports` map.

**Tailwind is not one.** It is how Arena's CSS is *authored*, and it stops there: a
manifest's class string is compiled through `@apply`, stripped of every Tailwind theme
indirection, and emitted as plain declarations under Arena's own class names. Nothing a package
ships names a Tailwind utility, and neither package declares a runtime dependency of any kind
except `tslib`, which is Angular's own helper import. A project that runs its own Tailwind can
declare whatever `--spacing` it likes and nothing of Arena's moves.

**That indirection is the reason the strip exists rather than an optimisation.** `@apply` emits
`gap: calc(var(--spacing, var(--sp-1)) * 1.5)`, not the Arena token: the adopter's own
`--spacing` on an unlayered `:root` wins, the fallback is never reached, and every component
rescales with nothing in the DOM to point at. Compiling to CSS without stripping would move the
collision from class names to custom properties rather than remove it.

**What ships is a tree, and an adopter picks their depth.** `css/prelude.css` carries the layer
order, the `@property` registrations and the keyframes; `css/base.css` is Tailwind's preflight
and nothing of Arena's; `css/components/<name>.css` is one component, and each imports the
prelude itself, so importing one alone is safe; `css/components.css` is all of them.
`arena.css` imports the token chain and then all of that, which is the zero-friction path.

**The prelude is not optional and its absence is silent.** Without the `@property --tw-*`
registrations, `border-style: var(--tw-border-style)` is invalid at computed-value time and
every border disappears, and the `box-shadow` chain takes the focus ring with it. That is why a
component sheet imports the prelude rather than documenting the dependency. The preflight is
the same shape one level up: it is where the `font: inherit` a form control needs lives, so a
package that shipped the components and not the preflight renders every control at the
browser's own size and reports nothing.

**A project that already runs Tailwind ships an equivalent preflight**, so it may import
`css/components.css` alone instead of `arena.css` and avoid a second copy of every rule in it.
Doing that makes the order yours to get right: the preflight must come before Arena's
components.

## The class name is not the API, and that is a versioning statement

Every component renders `arena-<manifest>__<slot>` class names, so they are in the DOM and a
consumer's own rule reaches them by specificity. That is not a hole to be closed. It is what
rendering classes means, and the alternative, an inline style object that beats every author
rule short of `!important`, was worse in every way that matters. What has to be written down
is the promise, because the observable thing and the promised thing are not the same thing.

**A name that reads like an API is not one.** `arena-badge__root--tone-error` looks like a BEM
surface somebody meant you to target, and it is not: it is the compiler's output, and it is
named for a human reading a devtools pane rather than for a consumer writing a selector.

**No contract names a class.** `contracts/api/components/<Name>.json` states members, and
`check:api` reads the implementations for those members and cannot see a class at all. Nothing
in the tree ties a slot's name, its class list, or the order those classes appear in to
anything an adopter can rely on.

So the policy is the short one: **a manifest may rename a slot, split it, merge it, re-order
its classes or change which utility draws a value, in any release, and none of that is a
breaking change** even though a class name in the DOM moves with it. It is an implementation
moving. A consumer who wrote a rule against `.arena-badge__root--tone-error` on Arena's own
element gets no deprecation and no warning, because there was never anything to deprecate.

What IS the API is the list every gate already holds: the members in `contracts/api/`, the
symbols each package exports, the files under `css/`, and the shape of `arena.config.json`.
Re-skinning goes through the last of those, which is what it is for; content a consumer draws
themselves is theirs, and their rules on their own elements are theirs too.

**This is where the statement lives rather than only in each `PACKAGE.md`**, because the two
say different things to different readers. A package's README tells an adopter what they may
lean on. This tells us what we are free to change, and it is the reason a manifest edit ships
in a patch. It is also the reason prefixing Arena's utilities, if that is ever worth doing,
would be an implementation change and not a break: without this paragraph it would be a break
nobody announced.

**The Tailwind layer is still not a third package.** It is where a component's appearance is
authored, and it is compiled away before anything ships: no consumer of either package imports
it, or can name it. `check:layer-independence` declares `ALLOWED` and `EXEMPT` empty, and the
one authorised edge lives in `ALLOWED_SPECIFIERS`: a page **linking** the compiled CSS under
`frameworks/tailwind/consume/`, which is generated, identical whoever renders it, and read by
nobody as a source.

## An Arena element is not a layout target, and that is the same kind of statement

The section above says a class name is not API. This one says it about a **box**, and it is the
more expensive of the two to find out, because this failure is silent.

**Arena promises that a component renders. It does not promise that the element you write
carries a box.** In the Angular package a primitive binds its root slot to its host wherever it
can; where it cannot, because the root has to be a real `<button>`, `<input>`, `<label>`, `<ul>`,
`<nav>` or a `<div role="tablist">`, the host declares `display: contents` and the styled element
sits inside it. In the React package there is no host element to begin with, and `ArenaTabs` goes
one step further and returns a fragment, so there is nothing in the DOM to reach at all.

One rule follows, and it is the same rule on both layers: **put your layout on a container you
own, and let the Arena element be its child.** A `margin`, a `flex`, a `min-width` or a `> *`
rule aimed at an element with no box is discarded, and nothing reports it. The rule parses, the
selector matches, and the declaration applies to a box the browser never made.

**A wrapper inherits the job the host would have done, and half a wrapper is its own bug.** The
wrapper becomes the flex or grid item, so it is the thing that stretches, and a component that
sits inside it as a plain block does not grow with it: the sizing lands and the component still
looks short. Give the wrapper the display its child needs, which for a single child is usually
`display: grid`. Measured on a real page: wrapping alone fixed the width and left the card 60px
shorter than the one beside it, and the grid closed both.

**Which elements carry a box is not API either**, for the reason the class name is not. The
carve-out set grows as components arrive, so a rule that lands today can stop landing in a patch,
and nothing in the tree ties an element's display to anything an adopter can name. Neither
package takes a class or a style from its consumer on any component, so there was no supported
route into that box to withdraw.

**This is the statement's home rather than each `PACKAGE.md`**, on the same split as the section
above: a README tells an adopter what to do, and this says what we are free to change. Until now
the consequence was written three times, once each in `ArenaPagination`'s, `ArenaCalendarEvent`'s
and `ArenaBreadcrumbs`' own prompt, and the other components that pay it said nothing. A rule
recorded per component is a rule that is missing wherever nobody thought to repeat it.

**`css/rhythm.css` is the rule with something behind it.** Telling an adopter to put the layout
on a container of their own is only half an answer while the system ships the spacing scale and
nothing that applies a step from it, because the remaining decision, how far apart two
components go, is then theirs to invent. That sheet holds `.arena-stack` and `.arena-row`, the
three named steps of the page rhythm scale, and it is meant for exactly the container this
section says to write.

## Assembly, not restructuring

Nothing moves. Assembling reads the tree as it stands and writes two directories that were not
there before. The two other channels keep working on the same
files, byte for byte.

The shared half is [`scripts/lib/arena/package-assembly.ts`](../scripts/lib/arena/package-assembly.ts):
the exclusion list, the copy that honours it, the CSS chain and the manifest template.
Neither half compiles anything, because the two layers need different compilers.

**React** goes through `Bun.Transpiler`, the same path `build-demos.ts` already uses, and
each declaration is EMITTED by `tsc` rather than copied, so it cannot disagree with the
implementation it describes. There is exactly one rewrite, and it normalises every relative
specifier to `.js`: one carrying `.ts`, `.tsx`, `.jsx` or `.js` is retargeted, and one carrying
no file extension gains it. Inside the package only the compiled `.js` resolves, and a consumer
on `node16` infers no file extension from a declaration, where this layer's own `bundler` resolution
makes it optional. Neither half is taken on trust: `unresolvedProblems` resolves every specifier
in every emitted module and declaration against what the package holds, so one naming nothing
fails the build rather than the consumer's editor. The entry point is
`Index.generated.ts`, the barrel `build:react-barrel` derives from the component
directories, and it goes through that same compile, so the package exports
`Index.generated.js` beside the declaration `tsc` emits for it.

**Angular** goes through `ng-packagr` into Angular Package Format. That needs a staging tree at
`frameworks/angular/build/package/`, and the reason is narrow: ng-packagr wants its own
`ng-package.json`, `tsconfig.lib.json` and `package.json` at the root it compiles from, and
writing those into the tracked layer would leave build files beside the source.

**It stages nothing of another layer**, and that is the property to check rather than assume,
because the failure it prevents is silent: a `.variants.ts` importing a Tailwind manifest four
directories up is a reach ng-packagr refuses, since it infers `rootDir` from the entry file's
directory. A component composes its own class names from a table emitted beside it, so nothing
reaches out and the staging tree is a compiler's requirement rather than the shape of a coupling. `build-angular-package.ts` fails on a staging run that copies zero files, so a layer
that moved is loud rather than silently empty.

### What never ships

Tests in any file extension, demo pages, `.card.html` specimens, `.demo.` playgrounds, behaviour
bindings, component prompts, the vendored React bundles, the test harnesses, the tsconfigs,
and the font binaries. `EXCLUDED_NAMES` and `EXCLUDED_PATTERNS` are the record, and the
suite beside them asserts both by name.

The absent tests are deliberate. A consumer installs components, not suites, and every claim
those suites make is already proven in this repository before a package is cut.

The absent prompts are the same decision one level up. A component package is what a screen
imports; the prose an agent reads is a package of its own, `@dravensoft/arena-mcp`, and
`copyAgentPayload` in `scripts/lib/arena/package-assembly.ts` is what writes it there, one corpus
per layer under `agent/<layer>/`. `check:packages` fails a component package that carries one, and
`check:mcp` fails an MCP package that does not.

## `dist/` is git-ignored, and every gate skips it

A package is served from the registry and rebuilt from the tagged sources, so committing it
would put thousands of generated lines into every diff for no gain. That is the opposite call
from `contracts/design-generated/`, and the difference is audience: the plugin is served
**from the git tag**, so ignoring the token CSS would ship a tag whose `intro/styles.css`
`@import`s resolve to nothing, unstyled and silent.

The consequence is the one real hazard here: `dist/` puts a copy of each layer inside the
tree several gates walk, and a gate reading that copy as source sees duplicate constants, a
second declaration of every script token, and components whose dimensions were judged once
already. A gate that walks the tree skips a directory named `dist`, and these assert the exclusion in
their own suite against a fixture holding exactly the file that would otherwise fail:
`check:docs`, `check:dimensions`, `check:duplicate-constants`, `check:script-tokens`,
`check:layer-independence` and `check:generated`.

## The version

`.claude-plugin/plugin.json` is the authority, as it already is for the plugin, the
marketplace, the README's artifact list and the tag. `baseManifest()` stamps it into both packages,
so no manifest is ever hand-versioned and the two cannot drift apart.

What makes a number a major is the API, and a class name is not part of it: see "The class
name is not the API" above before treating a manifest edit as a break.

## What `check:packages` holds

**That the two palette emitters agree.** There are now two things that turn a palette into
CSS: Style Dictionary, which serves this repository, and `arena-to-prod`, which serves a
consumer who has no repository. The gate builds a config out of Arena's own skin, runs the
CLI over it, and asserts every `--color-*` declaration matches
`contracts/design-generated/palette.generated.css` in both blocks. A comparison that looked
at nothing is an explicit failure, not a vacuous pass.

**That an assembled package is registry-standard.** The version comes from `plugin.json`,
every `exports` target was actually emitted, there is no install script, there is a README,
and Phosphor is a peer rather than a dependency. `dist/` is ignored, so on a fresh clone that
half is skipped and the run says which.

The palette half runs anywhere. Neither half says anything about whether a component behaves
correctly; that is `check:compliance`, and it runs against the sources.

## Publishing

**Both packages are on npm, under the `@dravensoft` scope, and a workflow publishes them.**
What a release does by hand is move the surfaces and push the tag; everything after that is
`.github/workflows/npm-publish-react-package.yml` and its Angular twin, each firing on a
green run of `Arena main`.

```bash
# the surfaces, in one commit, then the tag on it
#   plugin.json (the authority), marketplace.json version AND source.ref,
#   and the README's artifact list
git tag -a vX.Y.Z -m "Arena vX.Y.Z"
git push origin main --follow-tags
```

`--follow-tags` matters here for a second reason now: the workflow runs `check-release.ts`
before it publishes anything, and that gate refuses a version whose tag does not exist and
does not serve it. A version bump pushed without its tag is rejected loudly rather than
published quietly.

**A package is published only when something it carries has moved.** The workflow asks
whether `plugin.json`'s version is already on the registry, and if it is not, whether
anything in `scripts/ci/arena/package-inputs.ts` has changed since the tag of the version
that is. So a release touching only React publishes only React, and the Angular package
keeps its number rather than shipping an identical tree under a new one. That is why the two
packages can sit at different versions, and both `PACKAGE.md` files point a reader at
[`../.github/workflows/AGENTS.md`](../.github/workflows/AGENTS.md) for the explanation.

Three things about the publish itself, each of which has a way of going wrong:

- **Publish from inside `dist/`.** The root `package.json` is private and npm would refuse it.
  The workflow packs inside `dist/` and publishes the tarball.
- **Do not pass `--access public`.** Both manifests already carry it in `publishConfig`.
- **Do not pass `--provenance`.** Under a trusted publisher the attestation is generated
  automatically, and the flag is not what turns it on.

### Publishing by hand

Still possible, and the fallback when the workflow cannot run. **It is the publish and not the
release**: the version bump that has to precede the build, the tag, the branch the tag lands on
and the benches that are packed after it are all in
[`../versioning_steps.md`](../versioning_steps.md), and this block replaces none of them. Its
first command **fails by design** on a tree whose tag does not exist yet, which is the expected
output there and a red herring here, so read that page's step 1 before running anything below:

```bash
bun scripts/check/arena/check-release.ts
bun run build:release       # every source, and both packages assembled from them; the
                            # manifests take the version from plugin.json here
bun run check:packages      # and this fails if they did not

npm login                       # a two-hour session; 2FA is enforced on publish
cd frameworks/react/dist   && npm publish --dry-run && npm publish
cd ../../angular/dist      && npm publish
```

React first: if something is wrong, find it in the smaller package rather than halfway
through. A publish by hand carries no provenance, because that needs the OIDC token only a
runner has.

### A 404 right after publishing is not a failure

**The registry has two read paths and they do not move together.** For several minutes after
a successful publish, `npm view` and `npm owner ls` answer 404 while the package is perfectly
published, because those read a CDN that has not caught up. Measured on a release: five
minutes, with the two packages appearing a minute apart from each other.

This is why the publish workflow tolerates exactly one error. Its guard reads `npm view`, so
a re-run inside that window is told the version is absent, builds, and then meets
`cannot publish over the previously published versions`. That message alone exits green;
every other failure is red. It is safe because the scope is ours, so the only way that
version can already exist is that we published it.

Read the publish log rather than the next command's output. A publish that worked ends with
`PUT 200`, `exit 0` and `info ok`. By hand, the `401` above it is not an error either: it is
the 2FA handshake starting, before npm retries with the validated session.

Nothing verifies after publishing. `npm access list packages @dravensoft` lists what exists
whatever the CDN says, and it is the right check from a laptop, where there is a session. A
runner has no long-lived credential and its token is scoped to the publish, so there the exit
code is the check.

### What trusted publishing needs

`permissions: id-token: write` on a GitHub-hosted runner, npm 11.5.1 or newer on Node 22.14
or newer, and a trusted publisher configured in **each package's** settings on npmjs.com.
Self-hosted runners are not supported. The image ships an older npm, so each publish job
installs a current one and asserts the version rather than assuming it.

**The workflow file name is the package's identity to npm**, exactly and case-sensitively:
the publisher on npmjs.com names `npm-publish-react-package.yml` or
`npm-publish-angular-package.yml`. Renaming one revokes that package's right to publish, and
nothing in this repository would notice.

The mechanism inherits the release rule it always had: the version moves in `plugin.json`,
`marketplace.json` and the README's artifact list together, `source.ref`
names the tag, and `check-release.ts` refuses the combination that fails silently. The two
manifests take that same version from `plugin.json` at assembly, so a published package can
never disagree with the tag it was cut from.
