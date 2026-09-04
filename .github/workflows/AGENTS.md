# .github/workflows/

One guards a pull request, one guards `main`, one guards `develop`, three publish a package, one
writes a release page and one serves the site. `ls .github/workflows/*.yml` is what says how
many, and this page carried the figure instead until the count and the directory disagreed:
`portability.yml` ran the operating system matrix, was named in no diagram here, and is now a job
of `Arena develop`, which is the same omission read twice. A number no assertion holds is the
defect that rule exists to stop.

```
pull_request -> main|develop  Arena PR
push to develop               Arena develop         and the operating system matrix
push to main                  Arena main            builds, and saves that build
   |
   +-- on success             Publish arena-react      restores it
   +-- on success             Publish arena-angular    restores it
   +-- on success             Publish arena-contracts  restores it
   +-- on success             Publish arena-mcp        restores it
   +-- on success             Publish the site         restores it
   +-- on success             Release notes            describes the tag this commit reaches
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
pr-gate            the only required check, and it waits for every job above
```

**The operating system matrix is not here**, and `Arena develop` carries it. The reason is the
event: this one fires on every push to an open pull request, and Arena takes pull requests from
anyone, so a matrix here bills three operating systems per revision of every contribution rather
than once per change that was accepted.

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
list is `frameworks/**/*.generated.*`, the two layer `dist/` trees, `frameworks/angular/build`,
`dist/contracts` and `dist/site`, and `check:graph` holds it to every artifact a clone does not carry:
[`../../scripts/graph/AGENTS.md`](../../scripts/graph/AGENTS.md) says how. It was a list nothing
held until `check:site` ran here over a `dist/site` no job had handed it. Adding
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

**It saves its build, and that is the only reason the three publish workflows and the site are
cheap.** All four fire on this workflow's success, and each would otherwise build the same commit
again, which is one push to `main` building Arena five times. The key is `arena-build-<os>-<sha>`, the commit rather than the
run, because the run that reads it is not this one and does not know its number. The save sits
directly after the idempotency check, which is the last moment the tree is known to be exactly
what the build wrote and nothing a gate has since touched.

The eviction rule is what makes the commit the right key rather than a happy one. A cache goes
unread for seven days and is gone, so a release cut long after its push finds nothing, and a key
naming anything looser would have found something to hand over instead. On a re-run of this
workflow the key already exists and `actions/cache/save` reserves it, fails, and logs a warning,
so a re-run keeps the first run's build and stays green.

## Arena develop

Two jobs. `verify` is the same five steps as `Arena main`, in the same order, and it is the only
job here that is a copy of another. It exists because work lands on `develop` before it lands on
`main`, and what lands there is not always what a pull request tested. `Arena PR` runs on pull
requests into `develop` as well as into `main`, and each run tests the head at that moment; a
merge commit resolved afterwards, and a push straight to the branch, are verified by this
workflow and by nothing else.

**`portable` is the operating system matrix**, three legs on their own `bun run build`, and this
is where the question is asked. `check:portability` holds the legs equal to
[`../../scripts/ci/arena/supported-os.ts`](../../scripts/ci/arena/supported-os.ts) and reads this
file to do it. A merge request from `develop` to `main` is opened on a green `develop`, so a
platform this matrix reddens is one that never reaches the branch the packages publish from.

It is a separate file rather than a second branch on `Arena main`'s trigger, and the reason is
the name. Every workflow downstream of a release fires on `workflow_run` of the workflow named
`Arena main`, so a `develop` push carrying that name would raise the publish question about a
branch that is not `main`. Their `branches: [main]` filter refuses it, but the refusal is one file away from the
event; a name of its own puts the answer in the workflow that asks.

**`verify` caches nothing**, so `bun install` is cold on every run, and it saves nothing either.
`Arena PR` caches because a pull request is pushed to repeatedly and its four test jobs each need
the one build, and `Arena main` because four later workflows read what it built. `verify` runs
once per merge and is read by nobody, where a cache saves a fraction of a run it would also have
to be kept honest across. `portable` restores a bun install cache per operating system and saves
none of the build, because what it is asking is whether a fresh tree builds on that platform.

**Assembling is part of the build rather than a step of its own.** `bun run build:release` passes
`--assemble`, so all four packages are part of the run the workflow already makes. Dropping the
assembly would not skip package work: `check:packages` reads no manifest and passes while saying so,
which is a quieter green rather than a faster one, and `check:consumer` assembles a missing `dist/`
itself. Assembling nothing is not publishing nothing, and nothing here publishes.

## Publish arena-react, Publish arena-angular, Publish arena-contracts, Publish arena-mcp

**A release moves the version in several places and the tag is the one the rest are pinned to.**
It lives in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and the README's
artifact list; because the plugin is served from the tag, `source.ref` must name it and the tag
must exist on the release commit. **Forgetting the `ref` fails silently**: the marketplace
advertises a new version while Claude Code keeps fetching the old tag and resolves the old
version, so nothing errors and the update is never offered.
`bun scripts/check/arena/check-release.ts` is what refuses that combination, and
`versioning_steps.md` is the order the moves are made in.

**The fourth is where the language publishes.** `@dravensoft/arena-mcp` is a server, and it is the
one package here that declares a runtime dependency: the component libraries promise none, and a
server nobody imports into a screen has no business putting one inside them. It carries the corpus,
one per layer, which `check:mcp` asserts. So a prompt moving republishes this package and no other.
Packed from `dist/mcp` for the same reason the contracts package is: nothing is assembled under
`frameworks/` for it.

**The third of them publishes no layer.** `@dravensoft/arena-contracts` carries the three contract
levels as JSON and nothing else, for a platform target outside this repository, and its consumer is
a Gradle or SwiftPM build with no Node at all. That is why its manifest declares no `bin` and no
`engines`, and why it is packed from `dist/contracts` rather than from a layer: nothing is
assembled under `frameworks/` for it. Its guard entry in `package-inputs.ts` deliberately inherits
none of `SHARED_INPUTS`, because five of those eight are false for a package with no stylesheet, no
CLI and no component map, and inheriting them would republish it whenever a Tailwind manifest moved.

**A build on another platform needs no npm client to consume it.** A published tarball is a plain
HTTPS URL under `registry.npmjs.org`, which is the whole reason a registry was chosen over an asset
attached to a tag: an asset carries no version of its own, so the guard's first question, is this
version already published, cannot be asked at all.

Each workflow fires on a green `Arena main`, guards, and usually does nothing.

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

**A spec names a directory, and the guard asks the assembler which of it ships.** The suites
beside the sources, the prompts, the demo entries and the prose about a directory all sit inside
`frameworks/react/`, and none of them reaches a tarball, so `--carried` puts `excluded()` -- the
assembler's own predicate, in `../../scripts/lib/arena/package-exclusions.ts` -- to every path git
hands back. The question is asked of the part of a path **inside** the spec that reached it: a spec
naming a file is read rather than walked, and `scripts/build/react/build-react-package.ts` is the
assembler of the package it belongs to, sitting under a directory called `build`, which is one of
the names that walk skips.

**An empty list of paths stops the run.** `git` reads no pathspec as every path, so a guard whose
script died answers "everything moved" and republishes a tree nothing touched -- which is what
happened at 10.0.1 and 10.1.0, where `package-inputs.ts` reached `typescript` through the assembler
and a job that installs nothing resolved a major the tree does not pin. It was silent because the
call sat in `< <(...)`, and `set -e` never sees a command inside a process substitution. The list is
now read into a variable whose failure is checked, and `check:workflow-scripts` refuses the import
that made it fail.

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
more. That is exactly the shape this needs: `Arena main` is a push and writes, and every workflow
that follows it reads.

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

**The publish step is the one thing here that is npm and not Bun**, and that is a capability and
not a preference: `bun publish` does not speak OIDC, so a tarball leaving through it would be
unattested. Every job installs, builds, gates and packs with Bun, then takes Node and an npm the
step itself refuses to run below, because provenance from an npm older than that is attested by
nothing.

**Configuring a publisher for a name that has never been published is where a new package starts,
and it is the step this repository cannot do.** npm requires the organisation or user, the
repository, the workflow filename and, for any configuration created after 20 May 2026, at least
one explicitly selected allowed action; earlier ones were set to `npm publish` alone and did not
have to choose. Whether npmjs.com accepts a publisher for a name with no versions on it is not
documented either way, so the fallback is worth knowing before starting rather than halfway
through: publish the first version by hand with a token, then configure the publisher and delete
the token.

The one error tolerated is `cannot publish over the previously published versions`. The
registry read path the guard uses lags a successful publish by several minutes, so a re-run
inside that window sees a version that is published and reports it as absent. Any other
failure is red.

## Publish the site

**The site is build output, so publishing from a branch is not an option**: the kitchen sinks and
every playground are what `.gitignore` keeps out of the tree on purpose. It restores what
`Arena main` saved for the same commit, the same hand-off the three package workflows use, and
falls back to a build of its own on a miss.

`bun run build:site` copies rather than rewrites, so a page served from the domain is the page a
clone serves, and `bun run check:site` holds every href and src in the output to a file that is
there. **It needs a browser**, because the card a link preview reads is rendered from the site's
own tokens rather than exported by hand, and it takes the one `pr.yml` already takes:
`browser-actions/setup-chrome` with `CHROME_PATH` deliberately unexported, since
`check:portability` fails when a second workflow names it.

**It is also the only job here that builds a second repository.** The benches are written in
`dravensoft-dev/arena-web-benches`, and this job checks that repository out into the workspace,
installs it, builds every half and hands the directory it wrote to `build:site` as
`ARENA_BENCHES`. Those steps sit before `build:site` because it copies what is there when it runs.
[`../../scripts/check/AGENTS.md`](../../scripts/check/AGENTS.md) is where that variable is
declared and where an unset one is answered.

**What is built there is that repository's default branch at the moment this runs, and not a
commit pinned here.** So a push to it changes what this publishes with no commit in this
repository saying so, and a hand dispatch aimed at an older commit here does not reproduce the
site that commit published. The alternative is a revision written into this file, which buys that
reproducibility with a second place to move on every bench change and a published site that is
stale between the two moves. **Nothing here fires on a push to that repository**, so a bench
change reaches the domain at the next `Arena main` or at a hand dispatch of this workflow, and at
no other moment.

**A half that does not build stops the publication.** The build step leaves nothing behind when it
fails, so the alternative to every pair being served is none of them being served rather than a
site quietly listing fewer than the manifest declares, which `check:site` would refuse anyway. A
site carrying no benches at all is a different state and a reachable one: it is what an unset
`ARENA_BENCHES` publishes, and it is what a clone builds.

## Release notes

**It follows a green `Arena main`, like the four workflows above it**, so a page announcing a
release is never written over a tree the gates have not passed. It followed the push of the tag
until a red `test core` on the merge request that carried 10.2.0 sat next to a release page that
was already up: the page describes a tag, but what a reader takes from it is that the tree is
good, and the only run that answers that is the one on `main`. It checks out the whole history and
every tag, since the page is the commit log between this tag and the one below it in version
order, and a shallow clone carries neither.

**The tag is the one this commit reaches, not the one pointing at it.** A release arrives on
`main` as one merge of `develop` and the tag sits on the merged commit, so `--points-at HEAD`
would find nothing on every release there has been. The guard asks for `v` and the version in the
`plugin.json` this build hands out, then whether the commit reaches it, and it says which answer
it got in the run summary the same way the publish guards do. Almost every answer is that the tag
already has a page, which is the shape of "nothing to do" here.

**A hand dispatch is the way to write a page again**, and it is also the way through the gap this
event carries: `workflow_run` fires when `Arena main` finishes, so a tag pushed after that run is
seen by nothing. `main` takes no push of its own, so the tag rides `develop` with `--follow-tags`
and is in the repository before the merge that starts the run describing it, which is the order
`versioning_steps.md` is written around.

`../../scripts/ci/arena/release-notes.ts` writes the page. **GitHub's own `--generate-notes` is
what it replaces**, and the reason is the shape of this history: every release arrives on `main`
as one merge of `develop`, so the generated page would say `Merge pull request #19` and stop.
What carries a release here is the commit subjects, which are written as a sentence naming the
defect, so the script groups them by the area each one names and prints them as they were
written. An em dash becomes a comma on the way out, because prose here punctuates without one
and a release page is read by more people than any document in the tree.

**A page that exists is edited rather than replaced**, so the dispatch repairs a release whose
notes were written before a subject was corrected, and the assets uploaded to it afterwards stay
where they are. That input is also how the releases older than this workflow got their pages.

It names no `CHROME_PATH`. `check:portability` fails when more than one workflow does, and
`Arena main` is the one that may.

## Why are the published package versions not identical?

**Because a package is published only when something it carries has changed.**

Arena's version lives in one place, `.claude-plugin/plugin.json`, and every package is
stamped from it at assembly. They are never hand-versioned, so a published package can never
disagree with the tag it was cut from. What differs is not the number but **which numbers
exist**.

Suppose the two layer packages are published at the version Arena currently carries. The next release
changes the React layer and nothing in Angular: `@dravensoft/arena-react` is published at the
new version, and `@dravensoft/arena-angular` keeps the one it has, because republishing it
would ship an identical tree under a new number. The release after that touches Angular, so
it goes to the version current by then and skips the one in between, which never existed for
that package.

So the newest version of a package is the version of the last Arena release that changed it.
A gap in the sequence is the record of a release that left it alone, and two packages at
different versions are two packages that last changed at different times. All of them are
always built from the same tree.

## A job that runs a script installs, or the script imports nothing outside the tree

Either half satisfies it. Bun answers a bare specifier in a job with no `bun install` by fetching
it at whatever major the registry serves rather than the one `bun.lock` pins, so a script that
reaches one is a script whose behaviour is decided elsewhere and can change with no commit here.
The guard jobs of the three publish workflows, the routing job of `pr.yml` and the whole of
`release.yml` deliberately skip the install, because what each asks costs less than it would; their scripts therefore
import only `node:` builtins and files in this tree. `check:workflow-scripts` reads a job rather
than a workflow and refuses the other combination.

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
rather than testing an unbuilt tree. From `Arena main` to the four that follow it the key is the
commit, because the reader is a separate run, and a restore that misses builds instead,
because there is a real commit whose build has simply aged out. Both keys are exact for the same
reason: a prefix fallback would hand a job somebody else's build.

`upload-artifact` appears only in the three publish workflows, where the artifact is a release
record rather than a hand-off. The two never trade places. A cache is evicted at seven days
unread and is addressed by a key nobody keeps; an artifact is kept for ninety days and is the
account of what shipped.

**`check:docs` reads this directory.** Every `.md` here is held to the size limit and to the
punctuation rule, the same as anywhere else in the tree. It does not read `.yml`: nothing
does, so the workflows themselves are held only by GitHub.
