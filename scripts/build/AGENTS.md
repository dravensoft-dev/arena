# scripts/build/

**Build compiles an existing source into another form.** The input is already something a
person wrote, a `.tsx`, a `.ts`, a Tailwind preset or a CommonJS package, and the output says
the same thing in a form a browser or a test runner can load. Nothing here decides a value;
that is [`../generate/`](../generate/AGENTS.md).

Every output is named `<stem>.generated.<ext>`, so the name says a script writes it. Which of
those are tracked and which are not is the separate question `.gitignore` answers, for one of
two reasons: the git tag has to serve it to a browser directly, true of
`contracts/design-generated/` and the `assets/fonts/` binaries; or a clone cannot reproduce
it, true of `assets/fonts/Fonts.generated.json`, whose rebuild needs the network. Everything a
script writes under `frameworks/` is ignored. `check:generated` holds both halves.

## What the machine needs

The table below is the list, and it is declared in `../lib/arena/host-binaries.ts` rather than only
here, so `check:portability` fails when this section and that file disagree. Each entry has one
place that names it, whichever gate or build step spawns it.

| needs | probe | why |
| --- | --- | --- |
| `bun` | `bun --version` | the runtime and the package manager. `package.json` pins the version and every workflow pins the same one. |
| `git` | `git --version` | `check:generated`, `check:skills` and `check:citations` ask it what the tree tracks, which no other tool can answer. |
| `node` | `node --version` | `check:consumer` runs the shipped CLI the way a consumer runs it, under node rather than bun. It is the one place the two are not interchangeable. |
| a Chromium-family browser | `bun run check:focus-trap` | the gates that measure a real render (`check:focus-trap`, `check:anchoring`, `check:target-size`, `check:pixel-parity`, `check:proximity`, `check:palette-islands`, `check:consumer`) drive Chrome, Chromium or Edge over CDP. Discovery is keyed by platform, so an install in the usual place needs no configuration; `CHROME_PATH` names one anywhere else and is **terminal**, so pointing it at nothing reports that rather than falling back. |
| the network, once | `bun scripts/generate/core/fetch-fonts.ts` | only to rebuild the webfonts. Their outputs are tracked precisely because a clone cannot reproduce them, so a normal build never needs it. |

**On macOS** that is the whole list: nothing here is Linux-shaped.

**On Windows the supported path is WSL2, and the clone belongs in the Linux filesystem.** A tree
under `/mnt/c` costs a coarser mtime through the 9p layer, which widens the build cache's one
blind spot from "takes a deliberate mtime restore" to "happens"; it is slow to walk; and it is
reachable by two operating systems in turn over one `.cache/`, which is why that cache records
the machine that wrote it. **Install a Linux browser inside the distribution.** A Windows one
under `/mnt/c` launches and then reports a clean console over a page it never loaded: the gates
serve on the WSL loopback, and a Windows-side browser resolves `127.0.0.1` to Windows's own.
`findChromium` says so in its failure message when `WSL_DISTRO_NAME` is set.

**Windows natively gates, the same as Linux and macOS.** Its branches are written -- `PATHEXT`
resolution, junctions instead of directory symlinks, `taskkill` instead of a process group,
backslashes through every path comparison -- and covered by unit tests with the platform
injected, which is why they can be covered from a Linux runner at all. What only a runner
confirms is the whole of it running together, and that is the one thing the leg buys. Which
platforms gate lives where `DOUBTS.md` says such a claim belongs, in a reason-carrying map a gate
holds rather than in prose: `../ci/arena/supported-os.ts` carries a `blocking` flag per platform
with its reason, and `check:portability` fails if the matrix in `develop.yml` and that list disagree
about either the names or the flags. **A `blocking: false` leg reports and does not gate**, which
is the single place a platform stops gating and the reason the gate holds no clause of its own.

## Compile Arena for the first time

```bash
bun install
bun run build
```

**The order is derived, not written down.** `scripts/graph/run-build.ts` sorts the steps by what
each declares in its own `node`, so `generate:tokens` runs before `build:tailwind` because the
Tailwind preset reads the token CSS and the edge says so, rather than because a chain in
`package.json` happens to list it first. Ties fall in the order the scripts are collected, so the
order is stable. A step starts once every step it reads from has ended, beside any other that is
ready, and prints as one block when it ends, with why it ran; the summary lists the steps in the
derived order, each with what it took, and there is no second copy of it to go stale.
`scripts/graph/AGENTS.md` carries how a step declares itself, and `check:graph` refuses a step whose
declaration and edges disagree.

**Until it has run once, part of the tree does not exist.** These are git-ignored, so a fresh
clone has none of them:

| missing until you build | what notices |
| --- | --- |
| `frameworks/react/Api.generated.ts` and `frameworks/angular/Api.generated.ts` | every component importing a contract type; `check:api` |
| `frameworks/react/Tokens.generated.js` and `frameworks/angular/Tokens.generated.ts` | every component doing arithmetic on a token; `check:script-tokens` |
| `frameworks/react/Index.generated.ts` | the layer's entry point, which the package build compiles; `check:react-barrel` |
| `frameworks/react/vendor/*.generated.js` | every React demo page's importmap; `check:vendor` |
| `frameworks/react/**/*.generated.js`, one per component and demo entry source | every React demo page; `check:demos` |
| `frameworks/tailwind/components/**/*.manifest.generated.ts`, one per `<Name>.manifest.json` | every Angular `<Component>.variants.ts`; `check:tailwind-generated` |
| `frameworks/tailwind/Breakpoints.generated.css` | `Theme.css` imports it, so `build:tailwind` fails outright without it; `check:tokens` |
| `frameworks/tailwind/Utilities.generated.css` | the sheet the package assembly cuts into per-component files; never published |
| `frameworks/tailwind/consume/`: one `<Component>.styles.generated.css` per manifest, plus `Prelude`, `Preflight` and the `Components` barrel | every specimen and playground, the Console, and both packages |
| `frameworks/angular/build/demo/` | the Angular demo pages; `check:angular-demos` |
| `frameworks/**/*.demo.generated.html` and its entry, one per component per layer | the demo pages themselves; `check:angular-demos` for the Angular half |

So on a clone with no build, `bun run demos` serves unstyled or blank pages, neither framework
layer compiles, because a component's import of `Api.generated` or `Tokens.generated` resolves
to nothing, and every gate in that table reports its subject missing. **That is the intended
signal, not a failure**: the message each prints names the command to run. `bun run demos`
builds first for exactly this reason.

**A fresh clone runs `bun run build:packages`, or `bun run build:release`, before `check:consumer`
and `check:graph`.** `bun run build` assembles no package: `check:consumer`, `check:packages` and
`check:mcp` refuse a package that is not assembled, and `check:graph` reads what the package steps
write, so on a clone that ran only `bun run build` each reports its subject missing. The commands
of a CI job run on a clone built like the job are in [`../ci/arena/AGENTS.md`](../ci/arena/AGENTS.md).

`bun run build` is idempotent: running it on a clean tree leaves `git status` empty. If it does
not, a generator and a committed file disagree, which is what `check:tokens` and `check:fonts`
exist to say out loud.

**A step whose inputs have not moved keeps the answer it had**, and the run says so and at what
fingerprint. A `touch` keeps it, and so does checking out another branch and coming back: the stat
filters and the content hash arbitrates. What invalidates a step is a changed byte in what it
reads, a script it imports moving, an upstream having run, or one of its own artifacts being gone.

**A failure stops what depends on it, and nothing else.** The step that failed is reported FAIL,
every step that reads what it writes is reported BLOCKED with the upstream named, and the rest of
the graph runs and reports. A step compiled against a failed upstream would report a second error
over the real one, which is why the dependents stop; a step in another part of the graph has no
reason to wait, which is why they do not. The tail counts the three apart, so a step that never ran
cannot be read as one that passed.

The blocking is transitive. `generate:tokens` does not feed `build:demos` directly, it reaches it
through `build:tailwind`, and a single hop would let a step compile against tokens that were never
written. A blocked step records nothing: it did not run, so there is no green to write down.

**`bun run build:release` is the full run**, and it is what the `build` job of `verify.yml` runs. It
passes `--force --assert-full`: every step runs, and a run that kept anything fails on its own.
That is not belt and braces. The step after the build in that job proves it idempotent with
`git diff --exit-code`, and a build that skipped everything satisfies that by doing nothing, which
is the one way this whole arrangement could turn a real failure green.

`build:react-package` and `build:angular-package` are **not** part of `bun run build` either, and
each says so in its own node through `releaseOnly`, with the reason: ng-packagr and the declaration
emit cost more than a development loop should pay for an artefact only a release ships.

**`--assemble` is what includes them**, so each way to run this graph says what it is for.
`bun run build` is the loop, keeping what has not moved. `bun run build:packages` is the same plus
the packages, still keeping what has not moved. `bun run build:release` is
`--assemble --force --assert-full`: every step run, and a run that kept anything fails on its own.
The `build` job of `verify.yml` uses the last one, the `portable` legs of `develop.yml` run
`bun run build:packages`, and a publish workflow or the site that misses its cache runs
`--force --assert-full` over its own `--target`.

**`--jobs=<n>` caps every pool at `n`, and `--jobs=1` runs one step at a time in the derived
order**, which is how a failure that shows only beside another step is told from one that shows
alone. Without it the build takes the slots the machine allows, the compiling steps sharing the
heavy slots, longest first, and prints what bounded them. An interrupt ends every running step,
starts none of the rest, names them in the tail and exits 130. A step that spawns a compiler runs it
through `scripts/lib/arena/spawn-forwarding.ts:spawnForwarding`, which sends the interrupt on to the
compiler, so no compiler outlives the run that ended its step.

**`--target=<step>` replaces the selection of any of them with that step and every step it reads
from**, transitively, release-only steps included with or without `--assemble`, and it repeats;
`--force` and `--assert-full` keep their meaning. It is how a publish workflow that missed its
cache builds its own package and no other: `--target=build:angular-package` never assembles React.
A step whose output a gate reads is named beside it, as the mcp publish names the generators of the
pages `check:mcp` holds. A name that is not a build step is refused, because a gate judges rather
than builds.
`scripts/graph/run-build.ts:selectSteps(nodes, declaredIn, options)` decides the list.

`build:angular-tests` is a build step like the others. It runs in `bun run build`, in the compiler
pool, and feeds `build:angular-demo`, which bundles the page entries from
`frameworks/angular/build/test/` and spawns no compiler, so `--target=build:angular-demo` builds the
emit first and `--target=build:angular-tests` builds its own upstream and nothing downstream. Its
output travels in `BUILD_HANDOFF_PATHS` with every other artifact. The emit reads neither the
package in `dist/` nor the layer's Markdown pages, so `build:angular-package` is not in the closure
of `build:site`. The step skips itself by a stamp of each input's size, mtime and content hash, which
is what lets `bun run build`, `bun run test` and `bun run check` share one compile per input change.

## The five domains

A script's domain is decided by what it **touches**, never by what it is about.

| domain | what a build there compiles |
| --- | --- |
| [`angular/`](./angular/AGENTS.md) | the layer's one emit, the demo bundles over it and the package |
| [`arena/`](./arena/AGENTS.md) | the `intro/` page bundles, which are what let those pages read `scripts/lib/` |
| [`react/`](./react/AGENTS.md) | JSX to JS, the barrel, the package, and the CommonJS→ESM vendor bundle |
| [`tailwind/`](./tailwind/AGENTS.md) | the utility layer and the manifest modules |
| `core/` | empty; `.gitkeep` marks the combination as unoccupied |

**Count them rather than reading a figure here.** The empty domain is the claim, so an answer
other than zero for `core` is a domain that gained an occupant without gaining a reason:

```bash
for d in angular arena core react tailwind; do
  printf '%-9s %s\n' "$d" "$(find scripts/build/$d -name '*.ts' ! -name '*.test.ts' | wc -l)"
done
```

`core` exists even while empty so the grid stays legible rather than implied. See
[`../AGENTS.md`](../AGENTS.md) for what each domain is allowed to read and write.
