# scripts/check/

**A gate states one claim about the tree and fails when it stops being true.** They are
registered in `GATES` in [`arena/check-all.ts`](./arena/check-all.ts), which `bun run check`
runs unconditionally: one failure never stops the rest, so a full sweep reports every problem
in one pass rather than the first. That array is the count, and its suite asserts the number by
literal value; a figure written here instead would rot the next time a gate lands.

## The shape of a gate

Each is a `.mjs` under `check/<domain>/`, with an npm script whose prefix names the phase
directory, and a `.test.mjs` sibling covering it. It exports its logic as pure functions
returning problem strings, and its `main()` prints them and exits non-zero. That is why the
suites can assert on a gate's exception map by name without running the gate.

**A reason-carrying map is part of the gate, not documentation of it.** `EXEMPT`,
`PASSTHROUGH`, `EXCLUDED`, `COVERED`, `UNTRACKED`: each entry names a case and says why, and a
**stale entry fails the gate itself**. That is what keeps the exception list from outliving the
exception, and it is why a debt lives beside its gate rather than in prose.

## A green run is only as good as what the gate looked at

**A gate that finds nothing reports zero violations either way**, and it does so behind a
plausible line of output. Four mechanisms produce it: a walk that iterates zero files because
the tree moved under it, a per-component path probe that wraps `existsSync` and returns `null`
so `if (!path) continue` skips a whole layer, a verification command naming a directory that
holds a fraction of the suites it claims, and a gate that is complete, passing, and registered
nowhere.

The shape is always one of two: **a lookup that cannot tell "absent" from "not found"**, or **a
path that narrows a run without narrowing what the run claims**. Both have a remedy, and both
are rules a new gate holds to:

- **Decide absence by walking the tree**, so "this layer does not implement it" and "this gate
  cannot find it" stop being the same value. Resolving by constructed path is what makes the
  per-component probe silent.
- **Make a zero-result count an explicit failure** rather than a vacuous pass. `check:tailwind`,
  `check:radius`, `check:roles`, `check:extensions`, `check:structure`, `check:api`, `check:behaviour`, `check:dtcg`,
  `check:icons`, `check:docs`, `check:playgrounds` and
  `check:script-tokens` each carry one, as an exported pure function with a suite.
- **A gate has two existences, the file and every place that invokes it, and only the second
  is worth anything.** Adding a gate means adding it to `package.json` **and** to `GATES`.
  Citing a gate as evidence means confirming it is in `GATES` first.

When you write or move anything a gate resolves by path, the question is not "does it still
pass" but "how many things did it look at, and is that the number I expect".

## CACHED is a fourth label, and a skip is never recorded green

A gate that declares a node in `scripts/graph/` is kept when nothing it reads has moved since its
last **passing** run, and the summary says so at what fingerprint:

```
  CACHED  check:dtcg  (1c289ae16237, unchanged since the previous run)
  PASS    check:text-contrast

check-all: all 5 step(s) passed, 2 ran, 3 came from the cache
```

**The tail never collapses the count.** A run of five that did one is not a run of five, and the
line has to make that impossible to misread.

**Only a pass records.** A failure and a SKIP both delete the entry, so a gate that failed runs
again next time, and a gate that could not run here is honest about it for ever rather than once.
That is what keeps the cache from turning exit 2 into a permanent green.

**A gate that declares no node runs every time**, and nothing has to be written down for that to be
true. That is what makes the adoption safe: `scripts/graph/nodes.ts` says which gates never will and
why, and which have not yet.

**`--release` is a full run that also compares.** It runs every selected gate, and then reports a
gate that failed while the graph WOULD have kept it, separately from the failure count and exiting
non-zero on its own account:

```
check-all: check:ramp failed and the graph would have kept it -- that is a defect in the declared
graph, not only in the gate: something it reads is not something it says it reads
```

That is the only defence against a declaration that omits a file the gate opens. `check:graph` holds
the edges between declarations and cannot see it, and `check:graph --audit` sees it only where a
tracer can follow the gate, which is not the twelve that spawn `tsc`, `ngc`, `ng-packagr` or a
browser. A plain failure of a gate the run would have executed anyway says nothing about the graph
and is not reported here.

**A declaration WIDER than the walk is the mirror defect, and nothing catches it at all.** A gate
whose walk skips a directory has to exclude that directory in `reads`, because a spec covering a
tree the gate never visits invents an edge: whatever writes into it becomes an upstream, and the
edge holds or breaks depending on whether that tree happens to be on disk. `check:generated` and
`check:icons` both skip any directory named `build`, and `check:icons` skips `vendor` as well, so
each excludes what it skips. A gate that grows a skip grows the matching `!` spec with it.

`--force` runs every selected gate and rewrites what it records. `stepStatus` is untouched by any of
this: it maps a child's exit code, and a kept gate spawns no child, so three of the four labels come
from a process and the fourth comes from the graph.

## A gate judges and does not emit

**A gate declares no `writes`, and `check:graph` fails one that does.** A gate that emits is an
artifact another gate can read, and a reader of a failed writer either runs against a stale file or
has to be stopped; either way a sweep stops reporting every problem in one pass, which is the first
thing this runner promises.

## Exit 2 means SKIP, and a skip is never green

**Three** gates need a runtime dependency that plain node does not have: `check:focus-trap`
needs a headless browser, `check:vendor` needs `Bun.build`, `check:demos` needs
`Bun.Transpiler`. Where the dependency is missing the gate exits **2**, `check-all` marks it
`SKIP`, and the whole run reports **INCOMPLETE** rather than passing.

**The repository declares itself strict, so that is not the default here**: a gate that cannot
run **fails**. The soft skip is what an environment has to ask for, by exporting
`ARENA_CHECK_STRICT` as anything other than `1`. **`cannotRun` is the one spelling of that
decision**, and it is one because the skippable gates had each spelled it their own way: one read
`skipExitCode()`, one *threw* where the browser was missing, and one exited `2` outright, so on
this repository's own declared settings some failed where others skipped. A rule spelled once per
gate is a rule that holds for some of them. Note that `check-all` exits 0 on a run that
only skips, so a skip is loud in the summary and quiet in the exit status, which is the second
reason strict is the declared value rather than the opt-in one.

## Where the variables live

`scripts/lib/arena/arena-scripts-vars.ts` declares every environment variable the scripts
read, so a test run or a CI run needs no exports. There are four, and no gate reads any other:

| variable | what it decides |
| --- | --- |
| `CHROME_PATH` | The browser `check:focus-trap` drives. **Recognised and never declared**, for the reason `CI` is: a declared value here is not an override but a claim that a person named a browser, and `findChromium` treats that claim as terminal. It was declared as `/usr/bin/chromium` once, and because `arenaEnv()` lays the declared values under the real environment, every machine carried it. That made `CANDIDATES.find(exists)` **unreachable**, so the candidate list behind it never ran and its two macOS entries were dead from the day they were written. |
| `ARENA_CHECK_STRICT` | Whether a missing dependency fails or skips. Compared against the exact string `1`. |
| `CI` | The same, compared against the exact string `true`. Recognised and never declared: claiming it would tell the scripts they run on a runner. Note that a runner setting `CI=1` rather than `CI=true` buys nothing here. |
| `PORT` | The port `bun run demos` serves on. The gates' own server binds an ephemeral port and ignores it. |

**A real environment variable wins over a declared one**, so an override stays a shell prefix
rather than an edit to a versioned file: `CHROME_PATH=/opt/chrome bun run check:focus-trap`. The one
trap is that `CHROME_PATH` is terminal. Pointing it at nothing does not fall back to the
candidate list, it reports the dangling path, and under the declared strict setting that is a
failure rather than a skip. That is right and it is why it may not be declared: silently
driving a browser other than the one a person named is worse than saying so, but a *default*
making every machine look like that person is how the fallback stopped existing.

**With no `CHROME_PATH`, the list is keyed by platform**, and on Windows it is built from
`ProgramFiles`, `ProgramW6432`, `ProgramFiles(x86)` and `LOCALAPPDATA` rather than hardcoded,
because a program directory is not a path anyone can write down. Edge is in every list: it is
Chromium, it speaks CDP with these flags, and on Windows it is already there. The suites assert
all three lists **with the platform injected**, so the win32 and darwin halves are covered from
a Linux runner, which is the only place they will be covered for a while.

## What a generator-comparing gate claims

`check:tokens`, `check:fonts`, `check:vendor`, `check:demos` and `check:tailwind-generated` all
compare what a generator *would* emit against what is on disk. For the first two the file is
committed, so the claim is "the committed copy is in sync with `contracts/`". For the last
three the file is **git-ignored**, so the claim is narrower: *your working tree is built and
current*. On a clone with no build they report their subject missing and name the command to
run. See [`../build/AGENTS.md`](../build/AGENTS.md).

## The five domains

**These counts are the one set in the repository written in prose and held by an assertion**, so
they are numbers rather than a command: `check-all.test.ts` derives each from `GATES` and fails
this table when the two disagree. That is why they may be read, and why nobody should replace
them with a `find`, which would trade a held claim for an unheld one.

Counts are of **registered gates**; `arena/` alone holds two files that are not one:
`check-release.ts`, run by path rather than registered, and `check-all.ts`, the runner
rather than a gate. The distinction is the section above: a gate on disk that is registered
nowhere runs in no job and is worth nothing, so the directory is not the authority here.

| domain | gates | |
| --- | --- | --- |
| [`arena/`](./arena/AGENTS.md) | 31 | two or more layers at once, or the repository root |
| [`tailwind/`](./tailwind/AGENTS.md) | 8 | the shared Tailwind layer |
| [`angular/`](./angular/AGENTS.md) | 6 | the Angular layer |
| [`core/`](./core/AGENTS.md) | 7 | `contracts/` and `assets/` only |
| [`react/`](./react/AGENTS.md) | 4 | the React layer |

`check-all.test.ts` asserts every gate names one of the five domains and points at
`<domain>/<gate>.mjs`, so a gate landing outside the grid fails rather than running unnoticed.

The domain is also what a narrowed run selects on. `check-all.ts` takes `--domain=core,arena`
and `--no-tests`, and `gatesFor()` refuses a name outside `DOMAINS` and a selection matching no
gate, because a run of nothing reports nothing wrong with everything. CI is its only caller,
and its four jobs partition this table: `core` takes `core/` and `arena/`, since every
cross-layer gate is a question no single layer can answer. That partition is asserted too, so
a gate cannot join `GATES` and then run in no job.

## Adding a gate

Put it in `check/<domain>/`, add it to `GATES` with its domain in the path, give it an npm
script, and add a row to that domain's table. `check-all.test.ts` asserts the gate list by
literal value, so the count and the order move in the same commit.

`check-release` is the one script with no npm entry and no place in `GATES`: it is run by path
before publishing, because it asserts what the *tag* hands out and there is nothing to assert
until one exists. Each publish workflow runs it first, so a version bump pushed without its tag
is refused rather than published.
