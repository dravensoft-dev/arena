# .github/workflows/

Five workflows: one guards a pull request, one guards `main`, one guards `develop`, and two
publish a package. That count was right and this directory held six: `portability.yml` ran the
operating system matrix, was named in no diagram here, and is now a job of `Arena PR`, which is
the same omission read twice.

```
pull_request -> main          Arena PR
push to develop               Arena develop
push to main                  Arena main            builds, and saves that build
   |
   +-- on success             Publish arena-react      restores it
   +-- on success             Publish arena-angular    restores it
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
portable           always, and off the build above: three operating systems, its own bun run build
   |
pr-gate            the only required check, and it waits for every job above
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
paragraph is what explains the failure to whoever added the path. **Caching a build's inputs is a
non-goal, and carrying its outputs is not the same thing**: `.cache/` is restored nowhere in this
directory, so no workflow here ever builds incrementally. What a restore hands over is a finished
tree, and a job that takes one either uses it whole or builds the whole thing itself.

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
routing decision can skip. It is green when every result is `success` or `skipped`, and red on
`failure` or `cancelled`.

**Being the single required check makes its `needs` list the whole gate**, and a job missing from
it is a job whose failure branch protection never hears about. That is not hypothetical: the
operating system matrix was a workflow of its own, `needs` cannot name a job in another workflow,
and `pr-gate` was therefore green over a red macOS for as long as the arrangement lasted. The
matrix is a job here now, and `check:portability` holds the list to **every other job in this
file** rather than to a copy of it kept in step by hand.

**`portable` is the one job that does not take the `build` cache**, and it must not. It asks
whether `bun run build` works on a machine that is not this one, so a job handed the Linux build
would be answering a question nobody asked. It builds on each of its three runners and then
compares the result to what the Linux tree committed, which is what `git diff --exit-code` is
doing in a matrix leg.

**A leg that fails without failing the gate is `continue-on-error`, and the flag comes from one
place.** `scripts/ci/arena/supported-os.ts` declares `blocking` per platform with its reason, the
matrix sets `continue-on-error: ${{ !matrix.blocking }}`, and a failing leg with that flag hands
`needs` a result of `success`. So the flag is the single edit that decides whether a platform
gates, and `pr-gate` needs no clause of its own about any of them: a leg declared blocking turns
a red operating system into a merge request that cannot land.

## Arena main

One job, and deliberately not the fan-out. It runs every gate and then the whole suite
through `bun run ci:summarize`, which takes the invocation from `testStep()` in
`check-all.ts` and appends the two junit flags. `check-all.ts` stays the one place the
test invocation is written down, and the run summary carries a table of passes per domain.

A domain that owns suites and reported no case fails the run, as does a tree that
contributed nothing and a case belonging to no domain. A reporter that quietly dropped a
suite would otherwise print a confident table of zeros.

**It saves its build, and that is the only reason the two publish workflows are cheap.** Both of
them fire on this workflow's success, and each would otherwise build the same commit again, which
is one push to `main` building Arena three times. The key is `arena-build-<os>-<sha>`, the commit rather than the
run, because the run that reads it is not this one and does not know its number. The save sits
directly after the idempotency check, which is the last moment the tree is known to be exactly
what the build wrote and nothing a gate has since touched.

The eviction rule is what makes the commit the right key rather than a happy one. A cache goes
unread for seven days and is gone, so a release cut long after its push finds nothing, and a key
naming anything looser would have found something to hand over instead. On a re-run of this
workflow the key already exists and `actions/cache/save` reserves it, fails, and logs a warning,
so a re-run keeps the first run's build and stays green.

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

**It caches nothing**, so `bun install` is cold on every run, and it is the only workflow here
that saves nothing either. `Arena PR` caches because a pull request is pushed to repeatedly and
its four test jobs each need the one build, and `Arena main` because two publish workflows read
what it built. `develop` is one job that runs once per merge and is read by nobody, where a cache
saves a fraction of a run it would also have to be kept honest across.

**Assembling is part of the build rather than a step of its own.** `bun run build:release` passes
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
pushed without its tag is refused loudly rather than published quietly. Then it takes the
build `Arena main` already made of this commit, holds the manifests, and packs. The tarball
and a small record of what was published go up as an artifact, because a packed tarball is
byte-identical to what leaves the machine and is the only account of "what shipped at this
version" that does not require trusting the registry.

**Restoring that build is a read, and a `workflow_run` run is allowed nothing else.** Only
`push`, `workflow_dispatch` and a handful of their kind may write to the default branch's cache
scope; every other event that resolves there, `workflow_run` among them, gets read access and no
more. That is exactly the shape this needs: `Arena main` is a push and writes, both of these
follow it and read.

**A miss is expected rather than exceptional, so the build stays in the file behind an `if`.**
Seven days unread evicts the cache, and the hand dispatch above can ask about a commit whose run
is long past. There are no `restore-keys`, so a miss is a miss: a prefix fallback would hand this
job the assembled tree of a different release and pack it under this version. What a miss costs
is the build this change was written to avoid, which is the right price for the rare case and the
wrong one for every push.

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

**Chromium.** The gates that measure a real render drive a browser, and `CHROME_PATH` is terminal: set and pointing
at nothing, they report that rather than falling back to the candidate list. **Only `main.yml`
sets it**, to `/usr/bin/google-chrome`, which the image documents. `pr.yml` and `develop.yml`
name no browser on purpose, so every pull request proves the candidate list finds one, and the
single workflow that does name one keeps the terminal-override branch exercised. Exporting it
everywhere is what made that list unreachable in the first place, and a runner is the last place
that should be re-established.

**Strictness is automatic.** GitHub sets `CI=true`, which `skipExitCode()` reads, so a gate
whose dependency is missing fails instead of skipping. There is nothing to configure and
nothing to remember; a missing browser is a red run.

**The cache is not an artifact.** `actions/cache` carries a build to the jobs that need it and
nothing else, and it does that twice, with no `restore-keys` either time. Inside `Arena PR` the
key is the run and its attempt, so it is never stale, and a restore that misses fails the job
rather than testing an unbuilt tree. From `Arena main` to the two publish workflows the key is
the commit, because the reader is a separate run, and a restore that misses builds instead,
because there is a real commit whose build has simply aged out. Both keys are exact for the same
reason: a prefix fallback would hand a job somebody else's build.

`upload-artifact` appears only in the two publish workflows, where the artifact is a release
record rather than a hand-off. The two never trade places. A cache is evicted at seven days
unread and is addressed by a key nobody keeps; an artifact is kept for ninety days and is the
account of what shipped.

**`check:docs` reads this directory.** Every `.md` here is held to the size limit and to the
punctuation rule, the same as anywhere else in the tree. It does not read `.yml`: nothing
does, so the workflows themselves are held only by GitHub.
