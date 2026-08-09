# .github/workflows/

Five workflows: one guards a pull request, one guards `main`, one guards `develop`, and two
publish a package.

```
pull_request -> main          Arena PR
push to develop               Arena develop
push to main                  Arena main
   |
   +-- on success             Publish arena-react
   +-- on success             Publish arena-angular
```

## Arena PR

Two stages, `build` then `test`, and the fan-out is in the second one.

```
changes            which layers this diff reaches
   |
build              bun run build:release, which assembles too, then one cache entry
   |
   +-- test-core       always            the core and arena gates + the suites under scripts/
   +-- test-react      if react          the react gates + the two React invocations
   +-- test-angular    if angular        the angular gates + the suites off the ngc emit
   +-- test-tailwind   if tailwind       the tailwind gates
   |
pr-gate            the only required check
```

**`build` is one job because the build is one thing.** The steps run in an order the graph derives
and the order is not decorative: the Tailwind preset compiles against the token CSS, and every
layer's components read the class names that step writes. A build job per layer would have each of
them redoing most of what the others did.
[`../../scripts/build/AGENTS.md`](../../scripts/build/AGENTS.md) carries how the order is decided.

**Every workflow runs `bun run build:release`, never `bun run build`.** Locally the build keeps
what nothing has moved under, which is the point of it. In a workflow that would be the wrong kind
of green: the step after it proves the build idempotent with `git diff --exit-code`, and a build
that did nothing satisfies that by doing nothing. `build:release` passes `--force --assert-full`,
so every step runs and a run that kept anything fails on its own.

**`.cache/` is not in the paths `actions/cache` restores, and that is the load-bearing part.** The
list is `frameworks/**/*.generated.*`, the two `dist/` trees and `frameworks/angular/build`. Adding
`.cache` there would hand the next job the graph's recorded state and turn the whole gate from a
full run into an incremental one, in silence. `--assert-full` is what would catch it; this
paragraph is what explains the failure to whoever added the path. **Caching between runs is a
non-goal**: incrementality is a local development feature, and a workflow starts from a clean
checkout on purpose.

**The four names are on the test stage, where the layers are genuinely disjoint.** A gate
belongs to exactly one of the five domains `check-all.ts` sorts by, and the jobs partition
that set: `core` takes the `core` and `arena` domains, and the other three take their own.
`check-all.test.ts` asserts the partition, so a gate cannot join `GATES` and run in no job.

**`core` runs on every change, and that is not caution.** The `arena` domain is where the
cross-layer gates are: `check:api`, `check:behaviour`, `check:compliance`, `check:structure`,
`check:dimensions`, `check:layer-independence`, `check:focus-trap`. Each of
them reads more than one layer, so none of them is a React question or an Angular question.
And `scripts/lib/arena/behaviour-contracts.test.ts` asserts the React component count by
literal value: a change confined to `frameworks/react/` breaks a suite under `scripts/`.

**Which layers a diff reaches is decided by `scripts/ci/arena/changed-layers.ts`**, not by
a path filter written here, because that module has a suite and a YAML filter does not. Its
least obvious rule is the one worth reading: a Tailwind edit routes to both other layers,
because each compiles something that layer emits.

**`pr-gate` is the single required check.** A job skipped by an `if` reports success to
branch protection, so requiring `test-react` directly would be satisfied by a React change
that failed to route. `pr-gate` runs with `always()` and reads `needs.*.result`, which no
routing decision can skip.

## Arena main

One job, and deliberately not the fan-out. It runs every gate and then the whole suite
through `bun run ci:summarize`, which takes the invocation from `testStep()` in
`check-all.ts` and appends the two junit flags. `check-all.ts` stays the one place the
test invocation is written down, and the run summary carries a table of passes per domain.

A domain that owns suites and reported no case fails the run, as does a tree that
contributed nothing and a case belonging to no domain. A reporter that quietly dropped a
suite would otherwise print a confident table of zeros.

## Arena develop

The same single job as `Arena main`, running the same five steps in the same order, and the
only workflow that is a copy of another. It exists because work lands on `develop` before it
lands on `main`, and a merge into `develop` would otherwise be verified by nothing but whichever
pull request preceded it: `Arena PR` is scoped to pull requests targeting `main`.

It is a separate file rather than a second branch on `Arena main`'s trigger, and the reason is
the name. Both publish workflows fire on `workflow_run` of the workflow named `Arena main`, so a
`develop` push carrying that name would raise the publish question about a branch that is not
`main`. Their `branches: [main]` filter refuses it, but the refusal is one file away from the
event; a name of its own puts the answer in the workflow that asks.

**It caches nothing**, so `bun install` is cold on every run. `Arena PR` caches because a pull
request is pushed to repeatedly and its four test jobs each need the one build; `develop` is one
job that runs once per merge, where the cache saves a fraction of a run it would also have to be
kept honest across.

**Assembling stays, and it is no longer a step of its own.** `bun run build:release` passes
`--assemble`, so the two packages are part of the run the workflow already makes. Dropping the
assembly would not skip package work: `check:packages` reads no manifest and passes while saying so,
which is a quieter green rather than a faster one, and `check:consumer` assembles a missing `dist/`
itself. Assembling nothing is not publishing nothing, and nothing here publishes.

## Publish arena-react, Publish arena-angular

Each fires on a green `Arena main`, guards, and usually does nothing.

**Each is also dispatchable by hand**, and that path exists because the automatic one has a
gap nothing in this repository can close: `workflow_run` reaches only a workflow already
registered on the default branch, so the push that first puts one there cannot dispatch it,
and re-running that push replays the original event rather than asking the question again.
A release whose event is missed that way has no other way through. A manual run is safe for
the same reason an automatic one is: the guard and `check-release.ts` both run, so the
answer to "is there anything to publish" is reached identically whoever asked.

The guard asks two questions in order. Is `plugin.json`'s version already on the registry?
Then there is nothing to do, which is almost every push. Otherwise, has anything this
package carries moved since the tag of the version that **is** on the registry? If not, this
package keeps its version while Arena moves on.

The baseline is that tag rather than the previous commit, and that matters: a layer can
change in one commit and the version bump land in another, so asking only about this push
would mean the change is never published at all. What each package carries is
`scripts/ci/arena/package-inputs.ts`, whose suite holds the list to what the assemblers
actually read.

**Whatever it answers, the guard writes that answer to the run summary**: the version on the
registry, the version in this tree, the decision, and the reason for it. The common answer is
that there is nothing to publish, and an answer readable only by opening a log is one nobody
reads. These runs are not jobs of `Arena main` and never appear in its panel, because a
`workflow_run` workflow is a separate run; each publish job is on its own workflow's page, and
the summary is what that page says without being unfolded.

When the guard says yes, the publish job runs `check-release.ts` first, so a version bump
pushed without its tag is refused loudly rather than published quietly. Then it builds,
assembles, holds the manifests, and packs. The tarball and a small record of what was
published go up as an artifact, because a packed tarball is byte-identical to what leaves
the machine and is the only account of "what shipped at this version" that does not require
trusting the registry.

Authentication is a trusted publisher over OIDC: no token lives in this repository, and
provenance is attested automatically, with no `--provenance` flag. **The file name of each
workflow is its identity**, exactly and case-sensitively, because that is what the publisher
configured on npmjs.com names. Renaming one revokes that package's right to publish.

The one error tolerated is `cannot publish over the previously published versions`. The
registry read path the guard uses lags a successful publish by several minutes, so a re-run
inside that window sees a version that is published and reports it as absent. Any other
failure is red.

## Why are the published package versions not identical?

**Because a package is published only when something it carries has changed.**

Arena's version lives in one place, `.claude-plugin/plugin.json`, and both packages are
stamped from it at assembly. They are never hand-versioned, so a published package can never
disagree with the tag it was cut from. What differs is not the number but **which numbers
exist**.

Suppose both packages are published at the version Arena currently carries. The next release
changes the React layer and nothing in Angular: `@dravensoft/arena-react` is published at the
new version, and `@dravensoft/arena-angular` keeps the one it has, because republishing it
would ship an identical tree under a new number. The release after that touches Angular, so
it goes to the version current by then and skips the one in between, which never existed for
that package.

So the newest version of a package is the version of the last Arena release that changed it.
A gap in the sequence is the record of a release that left it alone, and two packages at
different versions are two packages that last changed at different times. Both are always
built from the same tree.

## Notes on the runner

**Every action here runs on `node24`.** That is the runtime GitHub executes the action's own code
in, declared as `runs.using` in its `action.yml`, and the only other value is `node20`. A `node20`
action is warned about on every run, forced onto `node24` anyway, and will eventually be refused,
so an action's major is bumped when the new one moves the runtime rather than when it merely
exists. It is unrelated to `node-version` in the publish workflows, which is the Node those jobs
install to run `npm`. Versions live in these `.yml` files and nowhere else, and nothing generates
them, so the whole rule is `grep -n 'uses:' .github/workflows/*.yml` against each major's
`runs.using`.

Two of those majors carry a guard worth reading before the next bump. `actions/checkout` from v7
refuses to check out fork pull request code under `pull_request_target` or `workflow_run`, which
the publish workflows escape only because the run they follow is a push to `main`; a `workflow_run`
whose upstream event began with `pull_request` would need `allow-unsafe-pr-checkout`, which is a
question to answer rather than a flag to set. `actions/setup-node` from v6 caches automatically
only when `packageManager` names npm, and this repository's names bun, so a jump to v5 rather than
past it would have switched on a cache nobody asked for.

**Chromium.** Four gates drive a real browser, and `CHROME_PATH` is terminal: set and pointing
at nothing, they report that rather than falling back to the candidate list. **Only `main.yml`
sets it**, to `/usr/bin/google-chrome`, which the image documents. `pr.yml` and `develop.yml`
name no browser on purpose, so every pull request proves the candidate list finds one, and the
single workflow that does name one keeps the terminal-override branch exercised. Exporting it
everywhere is what made that list unreachable in the first place, and a runner is the last place
that should be re-established.

**Strictness is automatic.** GitHub sets `CI=true`, which `skipExitCode()` reads, so a gate
whose dependency is missing fails instead of skipping. There is nothing to configure and
nothing to remember; a missing browser is a red run.

**The cache is not an artifact.** `actions/cache` carries the build from the `build` job to
the four test jobs, keyed by run and attempt so it is never stale, and with no `restore-keys`,
because a prefix fallback would hand a test job the build of another pull request. A restore
that misses fails the job rather than testing an unbuilt tree. `upload-artifact` appears only
in the two publish workflows, where the artifact is a release record rather than a hand-off.

**`check:docs` reads this directory.** Every `.md` here is held to the size limit and to the
punctuation rule, the same as anywhere else in the tree. It does not read `.yml`: nothing
does, so the workflows themselves are held only by GitHub.
