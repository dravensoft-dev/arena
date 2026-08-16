# scripts/

Arena's tooling, sorted so the path answers two questions before the file is opened: **what
phase** the script belongs to, and **what it is allowed to know about**.

```
scripts/
  serve.ts   the dev server; neither a phase nor a library
  utils/      pure functions that name nothing of Arena: a directory walk, a JSON read
  lib/        shared modules, and every test that covers one, beside it
  build/      compiles: JSX to JS, TypeScript to ESM, a CSS layer, a vendor bundle
  generate/   emits source from data: DTCG JSON to CSS, contracts to types, fonts
  check/      the gates
  ci/         what a runner asks: what to run, what the suite reported, what to publish
  graph/      what decides whether a step runs at all
```

Each phase has its own `AGENTS.md`, and each `<phase>/<domain>/` that holds scripts has a table
saying why every file in it exists. `utils/` and `graph/` have one too, and no domain
directories under either.

- [`build/AGENTS.md`](./build/AGENTS.md): **and how to compile Arena for the first time.**
  A fresh clone must build before `bun run demos` or `bun run check` mean anything.
- [`generate/AGENTS.md`](./generate/AGENTS.md): why generate is not build.
- [`check/AGENTS.md`](./check/AGENTS.md): the shape of a gate, and the SKIP protocol.
- [`ci/AGENTS.md`](./ci/AGENTS.md): what a runner asks, and why the answers carry suites.
- [`graph/AGENTS.md`](./graph/AGENTS.md): what decides whether a step runs, and how a file is fingerprinted.
- [`lib/AGENTS.md`](./lib/AGENTS.md): the bottom of the graph, and how a module is placed.
- [`utils/AGENTS.md`](./utils/AGENTS.md): what a util is, and the import boundary keeping it one.

`lib/` and the phases holding domain directories all hold the same five, and **all five exist
even when empty**: a `.gitkeep` marks a combination nothing occupies yet, so the shape stays
legible rather than implied. Two directories sit outside that grid and are flat, for opposite
reasons. `utils/`, because a domain states the vocabulary a module speaks and a util speaks
none. `graph/`, because a graph module speaks every one at once: what a node reads is
`contracts/`, both framework layers, the Tailwind preset and the repository root together, so
its domain would be `arena` throughout and the directory would say nothing. Both reasons are
written where they apply, because an exception with no argument beside it is how a grid stops
meaning anything:

| domain | what a script there is allowed to read and write |
| --- | --- |
| `core` | `contracts/` only (and `assets/`, which the design layer owns) |
| `react` | the `frameworks/react/` layer |
| `angular` | the `frameworks/angular/` layer |
| `tailwind` | the `frameworks/tailwind/` layer |
| `arena` | two or more layers at once, or the repository root |

The domain is decided by what a script **touches**, never by what it is about.
`generate/arena/generate-tokens.ts` reads `contracts/design/` but writes
`Tokens.generated.*` into both framework layers, so it is `arena` and not `core`.

**A library that touches nothing is placed by the vocabulary it speaks**, because most of
`lib/` is pure functions and the reads-and-writes test cannot separate them.
`core/serialize-token.ts` opens no file, but every name in it is a DTCG one, so it is `core`;
`core/behaviour-compliance.ts` is the same, in `contracts/behaviour`'s vocabulary of
requirement keys. What is left over is `arena`, meaning the parsers, the browser harness, `layers.ts`
and `repo-root.ts`, because it belongs to no layer in particular. Never place a library by
**who imports it**: `behaviour-compliance.ts` is read from both framework layers' harnesses
and is still `core`.

**A module that speaks no vocabulary at all is not a library, it is a util**, and it goes in
flat `utils/`. `walkFiles` takes a directory and a predicate, `readJson` takes a path, and
neither names a layer, a contract, a token, a phase or a repository. The test is what the module
would have to import: a util imports `node:` builtins and another util and nothing else, so one
reaching for `repo-root.ts` or `layers.ts` is a `lib/` module in the wrong directory.
`check/arena/script-imports.test.ts` holds that boundary over every file there, suites included.

**An npm script's prefix names its phase directory.** `bun run generate:tokens` runs something
under `generate/`, `bun run build:demos` something under `build/`. The reverse does not hold:
a script worth running only from a workflow needs no entry. `check-release` is the one gate
run by path, and under `ci/` only `summarize-tests` has a script, because the other two read
stdin or are imported.

## Rules a script here holds to

**Never count `..` to find the repository root.** Import `repoRoot` from
`lib/arena/repo-root.ts`. A script deriving the root from its own location breaks on a move,
silently, because the wrong path still exists. That module is
the one place that counts, which is why moving *it* is the one move needing care.

**A library never imports a gate.** `lib/` is the bottom of the graph: `arena/layers.ts`,
`core/arena-tokens.ts` and the rest are there because more than one gate reads them, and a
gate reaching down is the only direction allowed. Across domains the same holds in both
directions: `core/arena-tokens.ts` imports `../arena/css-decls.ts` and nothing forbids it,
because a domain is a statement about subject matter, not a visibility boundary.

**Never read a spawned child's output through a pipe.** Take it from
`lib/arena/child-output.ts`, which reads it from a file. A child that writes its results and
then calls `process.exit()` -- tsc, ngc, and every JavaScript compiler here -- exits before
the tail of stdout has drained, and `spawnSync` reports that short read as a whole one: status
0, no error, output simply missing its last lines. The loss is a race, so it survives local
runs and lands in CI, where it has `check:script-types` name files as unreached by globs that
reach them. A gate that parses what it captured is the dangerous case, because a
truncated read there is a wrong answer rather than a failure. Spawning with `stdio: 'inherit'`
is unaffected and stays as it is: a runner that only relays a child's output reads none of it.

**No script assumes one operating system, and `check:portability` holds it.** Every rule is a
ban with a named owner, so the question is never whether a construct is correct but where it
may live. The count lives in `RULES` and not in this sentence, a number here being one more
thing to hold true:

- **`process.platform` belongs to `lib/arena/platform.ts`.** Everywhere else takes the answer as
  a parameter, which is what makes a branch written for Windows testable from Linux: the machine
  a contributor happens to own stops deciding which half of the tooling is covered.
- **A path that leaves this process goes through `toPosix`, a repo-relative one through
  `relPosix`, and one compared against another through `isInside`.** All three are in
  `utils/posix-path.ts`, and all three take the path module. A string prefix is wrong in one of
  two directions: without a separator boundary it lets `/repo-evil` pass as `/repo`, and with a
  hardcoded `'/'` it refuses every nested path on Windows. `relative` answers in the host
  separator, so its result is native until something says otherwise; spelling that as two calls
  is what let a manifest key reach five readers that split it on `'/'`. **Nothing else writes the
  host separator down, computes a relative path by slicing the base's length off an absolute one,
  or hunts a path's last slash by hand.** Each of those reads a native path as one segment on
  Windows and as a correct answer here, which is a gate that passes by finding nothing: a chart
  excused by a directory nobody matched, a header allowance a file never got, a page a citation
  could not resolve. `basename` and `dirname` read a forward slash on every host and are how a
  path is taken apart. A key a suite writes as an expected value is held to the same rule, since
  a native path in an assertion passes only on the machine that wrote it.
- **A binary is spawned by resolved path**, never a bare name and never a `node_modules/.bin`
  shim. `lib/arena/host-binary.ts` for one the host supplies and `lib/arena/node-bin.ts` for one
  this tree installs. There is no `git` on Windows, there is `git.exe`, and `.bin` holds a `.CMD`
  and a `.ps1` there rather than anything named plainly.
- **Ordering that reaches a file is by code unit**, through `utils/compare.ts`. `localeCompare`
  puts `a` before `B` under en-US and after it by code unit, so a generator emits two different
  files on two machines and the `git diff --exit-code` in every workflow calls the second one a
  generator out of step. That rule's owner list is **empty**, and the emptiness is the claim.
- **A directory link is `linkDir`**, a junction on Windows, which needs neither Developer Mode
  nor elevation where a symlink needs both.
- **A gate that cannot run FAILS, in one spelling.** `cannotRun` in `lib/arena/arena-scripts-vars.ts`.
  A rule spelled once per gate is a rule that holds for some of them: with each gate spelling its
  own answer, the same missing dependency fails one and skips the next on identical settings.
  Derive the set that can skip with
  `grep -rl 'cannotRun\|skipExitCode' scripts/check/*/check-*.ts` rather than counting here.
- **A case a host cannot run declares its skip and never calls one**: `{ skip: WHY_NOT }` beside
  the timeout, where `WHY_NOT` is `false` or the sentence. Bun answers `t.skip()` with
  `NotImplementedError`, so the machine lacking the browser, the symlink or the signal is the one
  that gets a runner error in place of the reason written for exactly that moment.

Most rules are enforced over scripts and **not** suites: a suite naming `win32` and a `C:` path is
doing its job, and every win32 branch above is covered from a Linux runner precisely because it
does. **The separator rules read suites as well**, and each one says so where it is declared: a
native path compared against a posix literal is the same defect wherever it sits, and a suite is
where it lands as an assertion that passes on the machine that wrote it and on no other.

**A test lives beside what it tests**, in the same directory, which for a `lib/` module means
the same domain, not merely somewhere under `lib/`.

**A file here may carry one header comment, at most ten lines**, the exception `check:docs`
grants `scripts/` and test files. Anything that will not fit goes in the gate's own reason
strings, which its paired suite already asserts by name.

**A test that spawns a compiler or drives a browser states its own deadline.** `node:test`
defaults to five seconds, and spawning `tsc`, compiling the Tailwind layer, importing every
collected script or launching Chromium is not a five-second operation by nature. **A test that
outruns its deadline is worse than a slow one**: the callback is abandoned with its child still
running, and the next FILE to call `test()` reports `test() inside another test() is not yet
implemented in Bun`, which names neither the slow test nor the real cause. That is how a timing
failure arrives disguised as an unrelated file. The budget is a named constant, **derived where
there is something to derive it from** -- `chromium.test.ts` computes it from the grace and exit
timeouts teardown allows itself, so the two cannot drift apart -- and a measurement is written
beside it, because "it is fast here" is the claim a shared runner disproves.

**A test under `scripts/` may not import a framework layer's `.ts` or `.tsx`.** `check-all.ts`
also runs these suites under plain node, which cannot resolve the extensionless imports those
toolchains expect.

**A file a script writes is named `<stem>.generated.<ext>`**, so the name says so and no
reader has to open it. Whether it is tracked is the separate question `.gitignore` answers,
for one of two reasons: the git tag has to serve it to a browser directly, true of
`contracts/design-generated/` and the `assets/fonts/` binaries, because the Claude Code plugin
is served from that tag; or a clone cannot reproduce it, true of
`assets/fonts/Fonts.generated.json`, whose rebuild needs the network. Everything a script
writes under `frameworks/` is ignored. `check:generated` holds both halves, and records the
two generated outputs that can carry neither the infix nor a header: the font binaries under
`assets/fonts/` and `intro/support.js`.

**The consumer index tree is not a hole in that naming rule.** The pattern reaches a
`.generated.` name, `INDEX.md` is not one, and so the three are tracked by default under the
first reason above. `check:generated` scans no `.md` at all, and `check:skills` holds their
freshness and their tracking instead.

So **a fresh clone runs `bun run build` first**, and until it has, part of the tree does not
exist. [`build/AGENTS.md`](./build/AGENTS.md) is the first-compile document and names what
notices each missing piece.

## Adding a gate

Put it in `check/<domain>/`, add it to `GATES` in `check/arena/check-all.ts` with its domain
in the path, give it an npm script, add a row to that domain's table, and either declare its
node or name it in one of the two lists in `graph/nodes.ts`. `check-all.test.ts` asserts every
gate names one of the five domains and `check:graph` asserts the fifth, so a gate landing
outside the grid, or outside the graph without saying so, fails rather than running unnoticed.

**A script under `build/`, `generate/` or `check/` does no work when it is imported.** The
graph collects a node by importing the script that declares it, so the work goes in `main()`
behind `isMainModule(import.meta.url)`; `check/arena/script-imports.test.ts` holds it.

**A gate has two existences, the file and every place that invokes it, and only the second is
worth anything.** Citing a gate as evidence means confirming it is in `GATES` first.
[`check/AGENTS.md`](./check/AGENTS.md) carries the shape of a gate, the four ways one passes
over a tree it never opened, and the SKIP protocol.

## Running them

`bun run check` runs every gate plus the test suite, without stopping at the first failure, so
one sweep reports every problem rather than the first.

**When it is expected: once, when a plan's implementation is finished, and not before every
commit.** The individual gates are cheap and stay available per commit, `check:dimensions` after
touching a framework layer, `check:tokens` after a rebuild, and a task that widens a gate should
still watch that gate fail and then pass. But the full sweep is a **completion** gate, not a
per-commit toll. Stating that is what lets a gate be expensive enough to be worth having: `check:pixel-parity`
opens two real pages per component per arrangement in Chromium and compares them pixel for pixel, which
no repository can afford once per commit.

**Some gates are not runtime-portable**, needing a headless browser, `Bun.build` or
`Bun.Transpiler`. Where the dependency is missing the gate exits 2 and is reported `SKIP`,
**except that the repository declares itself strict**, so it fails instead. Count them and read
each one's dependency in [`check/AGENTS.md`](./check/AGENTS.md), which also has the table of
every environment variable the scripts read; all of them are declared in
`lib/arena/arena-scripts-vars.ts`, and a real one wins over the declared value.

**CI narrows that run by domain, never by gate name.** `check-all.ts` takes `--domain=` and
`--no-tests`, four jobs partition `GATES`, and `check-all.test.ts` asserts the partition, so a
gate cannot join `GATES` and then run in no job.
[`../.github/workflows/AGENTS.md`](../.github/workflows/AGENTS.md) has the four workflows.
