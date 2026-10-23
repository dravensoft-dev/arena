# .github/workflows/

One verifies, one guards a pull request, one guards `main`, one guards `develop`, one per package
publishes it, one writes a release page and one serves the site. `ls .github/workflows/*.yml` is
what says how many, because a figure written here is a number no assertion holds. `Arena verify` is
the workflow the guards call, and `Arena main` verifies and then saves the build.

```
pull_request -> main|develop  Arena PR              calls Arena verify
push to develop               Arena develop         calls Arena verify, and the operating system matrix
push to main                  Arena main            calls Arena verify, then saves that build
   |
   +-- on success             Publish arena-react      restores it
   +-- on success             Publish arena-angular    restores it
   +-- on success             Publish arena-contracts  restores it
   +-- on success             Publish arena-mcp        restores it
   +-- on success             Publish the site         restores it
   +-- on success             Release notes            describes the tag this commit reaches
```

## Arena verify

Called by the guards and run by no event of its own. It takes the inputs `domains`, the
`check-all` domains the caller selects, comma-separated, and `name-browser`, a boolean only
`Arena main` sets and false for the rest. They are inputs because a called workflow takes none of
its caller's `env:`.

```
build                bun run build:release, the idempotency check, then the artifact
   |
   +-- gates             every gate of the selected domains, side by side
   +-- audit             always            the trace of each node against what it declares
   +-- suites-scripts    always            the suites under scripts/
   +-- suites-react      if react          the React invocations
   +-- suites-angular    if angular        the emit, then the suites off it
   |
summarize            joins the reports the suite jobs wrote
```

**`build` is one job because the build is one thing.** The steps run in an order the graph derives
and the order is not decorative: the Tailwind preset compiles against the token CSS, and every
layer's components read the class names that step writes. A build job per layer would have each of
them redoing most of what the others did.
[`../../scripts/build/AGENTS.md`](../../scripts/build/AGENTS.md) carries how the order is decided.

It runs `bun run build:release`, proves the build idempotent with `git diff --exit-code`, and
uploads the tree as `arena-build-<run id>`, the paths of
`scripts/graph/handoff.ts:BUILD_HANDOFF_PATHS`. The upload sets `include-hidden-files: true`,
because the Angular package's `.npmignore` and the emit's stamp open with a dot and
`upload-artifact` leaves such files out otherwise; `check:graph` holds that flag. Retention is one
day, and `overwrite` lets a re-run of every job replace the first attempt's build rather than fail
on its name. Every job that runs the tree downloads that artifact after it installs, and a missing
one is a defect of the run, so the job fails rather than testing an unbuilt tree.

**A workflow that verifies or publishes builds with `--force --assert-full`, never with
`bun run build`.** Locally the build keeps what nothing has moved under, which is the point of
it. In a workflow that would be the wrong kind of green. The `build` job of `Arena verify` runs
`bun run build:release`, every step, and the step after it proves the build idempotent with
`git diff --exit-code`, which a build that did nothing satisfies by doing nothing. The `portable`
legs of `Arena develop` run `bun run build:packages` instead, and that section says why. A publish
workflow or the site, on a cache miss, runs `run-build.ts --force --assert-full --target=<its step>`,
that step and every step it reads from, so what it packs or serves is what this run built. The mcp
publish adds the playground and kitchen-sink generators as targets, because `check:mcp` holds every
page the prompts name. A publish never assembles a package it does not ship.

**`.cache/` is not in the paths a build hands over, and that is the load-bearing part.** The list
is `scripts/graph/handoff.ts:BUILD_HANDOFF_PATHS`, the generated sources and every built tree a
clone lacks, and `check:graph` holds every `arena-build-` cache or artifact step in every workflow
to it, path for path and in order, because `actions/cache` derives an entry's version from its
path list and a restore naming another list misses on the right key. The same gate holds the
list to every artifact a clone does not carry:
[`../../scripts/graph/AGENTS.md`](../../scripts/graph/AGENTS.md) says how. Adding `.cache` there
would hand the next job the graph's recorded state and turn the whole gate from a full run into an
incremental one, in silence. `--assert-full` is what would catch it; this
paragraph is what explains the failure to whoever added the path. **Caching a build's inputs is a
non-goal, and carrying its outputs is not the same thing**: `.cache/` is restored nowhere in this
directory, so no workflow here ever builds incrementally. What a restore hands over is a finished
tree, and a job that takes one either uses it whole or builds the whole thing itself.

**The gates run in one job, side by side.** `check-all --no-tests` takes the domains the caller
selects and runs every gate of them at once, and `scripts/graph/scheduler.ts:slotsFor` sizes the
slots from the runner, so no `--jobs` is written here. Gates and suites are split, and a job per
domain is not the shape: a job per domain repeats the checkout, the install and the download to run
a few seconds of gates.

**`audit` runs the tree the build made against what each traced node declares.** It downloads the
build artifact, runs `bun scripts/check/arena/check-graph.ts --audit`, then `git diff --exit-code`.
It fails when a node opens a file its declaration omits, because a change to that file would then
rerun nothing, and when the audit leaves a tracked file changed.
`scripts/ci/arena/verify-workflow.ts:verifySelection` holds that one job audits, waits for `build`
alone, carries no `if`, downloads the build first and diffs after, spells the command exactly as
above, and puts no `if:` or `continue-on-error:` on those steps. No job of `Arena verify`
carries a `continue-on-error:` of its own, because a red job would then report green to its caller.

**Each suite runs in a job of its own.** A suite job runs `bun run ci:summarize --suite=<name>`,
and the Angular one runs the emit first, which the restored stamp answers without compiling. A
suite job whose `if` names a domain runs only when its caller selects that domain, and each uploads
the reports it wrote as `junit-<name>`.

**`summarize` downloads every `junit-*` report and joins them** with
`bun run ci:summarize --join --domains`, so the run summary carries a table of passes per domain.

A domain that owns suites and reported no case fails the run, as does a tree that
contributed nothing and a case belonging to no domain. A selected suite with no report fails it, and
so does a report nothing selected. A reporter that quietly dropped a suite would otherwise print a
confident table of zeros.

**`scripts/ci/arena/verify-workflow.ts` reads this file and its callers**, so no list of CI jobs is
kept beside it. `check-all.test.ts` holds through it that one job runs the gates, that every domain
is selected by some caller, and that each suite runs in one job gated by its domain.

## Arena PR

`changes` routes, `verify` is a call to `Arena verify`, and `pr-gate` is the one check branch
protection requires.

```
changes            which layers this diff reaches, as the domains verify takes
   |
verify             Arena verify, with the domains from changes
   |
pr-gate            the only required check, and it waits for every job above
```

**The operating system matrix is not here**, and `Arena develop` carries it. The reason is the
event: this one fires on every push to an open pull request, and Arena takes pull requests from
anyone, so a matrix here bills every operating system per revision of every contribution rather
than once per accepted change.

**`core` and `arena` run on every change, and that is not caution.**
`scripts/ci/arena/changed-layers.ts:domainsOf` keeps every domain that is no layer, so a pull
request selects both of them and each layer its diff reaches. The `arena` domain is where the
cross-layer gates are: `check:api`, `check:behaviour`, `check:compliance`, `check:structure`,
`check:dimensions`, `check:layer-independence`, `check:focus-trap`. Each of them reads more than
one layer, so none of them is a React question or an Angular question. And
`scripts/lib/arena/behaviour-contracts.test.ts` asserts the React component count by literal
value: a change confined to `frameworks/react/` breaks a suite under `scripts/`.

**Which layers a diff reaches is decided by `scripts/ci/arena/changed-layers.ts`**, not by
a path filter written here, because that module has a suite and a YAML filter does not. Its
least obvious rule is the one worth reading: a Tailwind edit routes to both other layers,
because each compiles something that layer emits. The route prints the `domains=` line that
`verify` takes as its input, next to a `layer=` line for each layer.

**`pr-gate` is the single required check.** A job skipped by an `if` inside `Arena verify` reports
success, so requiring `verify / suites-react` directly would be satisfied by a change that failed
to route. `pr-gate` runs with `always()` and reads `needs.*.result`, which no routing decision can
skip, and `verify` reports failure when any job inside it fails. It is green when every result is
`success` or `skipped`, and red on `failure` or `cancelled`.

**Being the single required check makes its `needs` list the whole gate**, and a job missing from
it is a job whose failure branch protection never hears about. `needs` cannot name a job in another
workflow, so the operating system matrix, which lives in `develop.yml`, is not in this list, and
`check:portability` holds the list to **every other job in this file** rather than to a copy of it
kept in step by hand.

## Arena main

`verify` calls `Arena verify` with every domain and `name-browser: true`. `cache` downloads the
artifact that run uploaded and saves it.

**It saves its build, and that is the only reason the publish workflows and the site are cheap.**
Each fires on this workflow's success and would otherwise build the same commit for itself. The
key is `arena-build-<os>-<sha>`, the commit rather than the run, because the run that reads it is
not this one and does not know its number. The save happens after every gate and suite passed, on
the tree the build job uploaded straight after its idempotency check, which is the last moment the
tree is known to be exactly what the build wrote and nothing a gate has touched after it.

The eviction rule is what makes the commit the right key rather than a happy one. A cache goes
unread for seven days and is gone, so a release cut long after its push finds nothing, and a key
naming anything looser would have found something to hand over instead. On a re-run of this
workflow the key already exists and `actions/cache/save` reserves it, fails, and logs a warning,
so a re-run keeps the first run's build and stays green.

## Arena develop

`verify` calls the same workflow as `Arena main` with every domain. It exists because work lands on
`develop` before it lands on `main`, and what lands there is not always what a pull request
tested. `Arena PR` runs on pull requests into `develop` as well as into `main`, and each run tests
the head at that moment; a merge commit resolved afterwards, and a push straight to the branch, are
verified by this workflow and by nothing else.

**`portable` is the operating system matrix**, one leg per platform on its own
`bun run build:packages`, and this is where the question is asked. A leg assembles the packages:
`check:consumer` judges one, never builds it. `check:portability` holds the legs equal to
[`../../scripts/ci/arena/supported-os.ts`](../../scripts/ci/arena/supported-os.ts) and reads this
file to do it. A merge request from `develop` to `main` is opened on a green `develop`, so a
platform this matrix reddens is one that never reaches the branch the packages publish from.

It is a separate file rather than a second branch on `Arena main`'s trigger, and the reason is
the name. Every workflow downstream of a release fires on `workflow_run` of the workflow named
`Arena main`, so a `develop` push carrying that name would raise the publish question about a
branch that is not `main`. Their `branches: [main]` filter refuses it, but the refusal is one file
away from the event; a name of its own puts the answer in the workflow that asks.

**`verify` saves no build.** The jobs of `Arena verify` restore the bun install cache
the way a pull request's do, and the build travels inside the run as an artifact, but `develop`
saves no build for any later run. `Arena main` saves one because the publish workflows and the site
read what it built, and nothing reads what a push to `develop` built. `portable` restores a bun
install cache per operating system and saves none of the build, because what it is asking is
whether a fresh tree builds and assembles on that platform.

**`portable` is the one job that does not take the build artifact**, and it must not. It asks
whether a fresh tree builds and assembles on a machine that is not this one, so a job handed the
Linux build would be answering a question nobody asked. A fresh runner has no `.cache`, so the plain
`bun run build:packages` of a leg is a full build without `--force`. It builds on each of its
runners and then compares the result to what the Linux tree committed, which is what
`git diff --exit-code` is doing in a matrix leg.

**A leg that fails without failing the gate is `continue-on-error`, and the flag comes from one
place.** `scripts/ci/arena/supported-os.ts` declares `blocking` per platform with its reason, the
matrix sets `continue-on-error: ${{ !matrix.blocking }}`, and a failing leg with that flag hands
`needs` a result of `success`. So the flag is the single edit that decides whether a platform
gates, and the matrix needs no clause of its own about any of them: a leg declared blocking turns
a red operating system into a merge request that cannot land.

**Assembling is part of the build rather than a step of its own.** The `build` job of
`verify.yml` runs `bun run build:release` and `portable` runs `bun run build:packages`; both pass
`--assemble`, so every package is part of a run the workflow already makes. Dropping the
assembly would not skip package work: `check:packages` refuses an unassembled tree through `cannotRun`,
which is a red rather than a faster green, and `check:consumer` fails on a missing
`dist/`, because it judges an assembled package and never builds one. Assembling nothing is not
publishing nothing, and nothing here publishes.

## Publish arena-react, Publish arena-angular, Publish arena-contracts, Publish arena-mcp

**A package job holds the one package it assembles.** On a cache miss `npm-publish-react-package.yml`
builds only the React package and `npm-publish-angular-package.yml` only the Angular one, so each
runs `bun run check:packages --layer=react` or `--layer=angular`: the flag requires and judges that
package alone. Without it the gate requires both, which is how `bun run check` and the verify
workflow run it.

**A release moves the version in several places and the tag is the one the rest are pinned to.**
It lives in `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json` and the README's
artifact list; because the plugin is served from the tag, `source.ref` must name it and the tag
must exist on the release commit. **Forgetting the `ref` fails silently**: the marketplace
advertises a new version while Claude Code keeps fetching the old tag and resolves the old
version, so nothing errors and the update is never offered.
`bun scripts/check/arena/check-release.ts` is what refuses that combination, and
`versioning_steps.md` is the order the moves are made in.

**The fourth is where the language publishes.** `@dravensoft/arena-mcp` is a server, and it is the
one package here whose code imports a runtime dependency: no component of the libraries does (they declare three that their `arena` command reads at build), and a
server nobody imports into a screen has no business putting one inside them. It carries the corpus,
one per layer, which `check:mcp` asserts. So a prompt moving republishes this package and no other.
Packed from `dist/mcp` for the same reason the contracts package is: nothing is assembled under
`frameworks/` for it.

**The fourth also publishes an entry that is not a tarball.** The MCP registry hosts metadata and
points at npm, and it proves the entry by reading `mcpName` out of the `package.json` npm serves, so
the step that sends it runs after `publish` in the same job and under the `id-token: write` that job
already declares: the identity that attests the tarball is the one that owns the
`io.github.dravensoft-dev` namespace, which is why that namespace was chosen over one a DNS record
would have had to prove a second time. `server.json` is what is sent, `check:mcp` holds it to
`.claude-plugin/plugin.json`, and `scripts/ci/arena/package-inputs.ts` names it so an edit to it
reaches the guard. The publisher binary is pinned to a release and its checksum verified in the
step, because a publishing job is the last place a moving dependency belongs.

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
script died answers "everything moved" and republishes a tree nothing touched. A job that installs
nothing resolves a bare import at whatever major the registry serves, and `package-inputs.ts`
reaches `typescript` through the assembler, so an import of that kind kills the script. A call in
`< <(...)` would hide the death, because `set -e` never sees a command inside a process
substitution. The list is read into a variable whose failure is checked, and
`check:workflow-scripts` refuses the import that makes it fail.

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
A cache nobody reads is evicted, as the `Arena main` section says, and the hand dispatch above can
ask about a commit whose run is long past. There are no `restore-keys`, so a miss is a miss: a
prefix fallback would hand this job the assembled tree of a different release and pack it under
this version. What a miss costs is the package's own build step, every step it reads from and any
step whose output its gate reads, through `--target`, rather than the whole release: the Angular
publish never assembles React, and the other way round.

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
one explicitly selected allowed action; a configuration created before that date is set to
`npm publish` alone and need not choose. Whether npmjs.com accepts a publisher for a name with no
versions on it is not documented either way, so the fallback is worth knowing before starting rather
than halfway through: publish the first version by hand with a token, then configure the publisher
and delete the token.

The one error tolerated is `cannot publish over the previously published versions`. The
registry read path the guard uses lags a successful publish by several minutes, so a re-run
inside that window sees a version that is published and reports it as absent. Any other
failure is red.

## Publish the site

**The site is build output, so publishing from a branch is not an option**: the kitchen sinks and
every playground are what `.gitignore` keeps out of the tree on purpose. It restores what
`Arena main` saved for the same commit, the same hand-off the package workflows use, and
on a miss builds `--target=build:site`, the site and every step it reads from.

`bun run build:site` copies rather than rewrites, so a page served from the domain is the page a
clone serves, and `bun run check:site` holds every href and src in the output to a file that is
there. **It needs a browser**, because the card a link preview reads is rendered from the site's
own tokens rather than exported by hand, and it takes the one the `portable` legs of
`develop.yml` take too: the `browser-actions/setup-chrome` step with `CHROME_PATH` deliberately
unexported, because `check:portability` fails when a second workflow names it.

**It is also the only job here that builds a second repository, and it builds one adopter.** The
adopter is checked out at its main into `adopter/`, and it is published only when its
`arena-adopter.json` declares this tree's version: a gate step asks the same function `build:site`
calls, and nothing is installed or built when the answer is no. When it is, the job installs and
builds it and hands the directory it wrote to `build:site` as `ARENA_ADOPTER_BUILD`. Those steps
sit before `build:site` because it copies what is there when it runs.
[`../../scripts/check/AGENTS.md`](../../scripts/check/AGENTS.md) is where that variable is
declared and where an unset one is answered.

**What is built there is that repository's default branch at the moment this runs, and not a
commit pinned here.** So a push to it changes what this publishes with no commit in this
repository saying so, and a hand dispatch aimed at an older commit here does not reproduce the
site that commit published. The alternative is a revision written into this file, which buys that
reproducibility with a second place to move on every adopter change and a published site that is
stale between the two moves. **Nothing here fires on a push to that repository**, so an adopter
change reaches the domain at the next `Arena main` or at a hand dispatch of this workflow, and at
no other moment.

**An adopter that does not arrive or does not hold never stops the publication.** A checkout, an
install or a build that fails publishes the site without it and a warning, and so does an
adopter `build:site` refuses (a build whose own manifest declares another version, a path the
site already holds, an `index.html` of its own, a copy that fails): `build:site` says which in
the step's `adopter` output, and the warning and the next step read it. So does a `check:site`
that fails with the adopter in: the site is assembled again without it and held to the same gate,
and a red there stops the run. A site with no adopter is a reachable state and the one a clone
builds: it is what an unset `ARENA_ADOPTER_BUILD` publishes.

## Release notes

**It follows a green `Arena main`, like the publish workflows and the site**, so a page announcing
a release is never written over a tree the gates have not passed. A trigger on the push of the tag
would leave a red `test core` on the merge request next to a release page that is already up: the
page describes a tag, but what a reader takes from it is that the tree is good, and the only run
that answers that is the one on `main`. It checks out the whole history and
every tag, because the page is the commit log between this tag and the one below it in version
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

**A page that exists is edited rather than overwritten**, so the dispatch repairs a release whose
notes carry a subject the log has corrected, and the assets uploaded to it stay where they
are. A release with no page gets one the same way.

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
The guard jobs of the publish workflows, the routing job of `pr.yml`, the `summarize` job of
`verify.yml` and the whole of `release.yml` deliberately skip the install, because what each asks
costs less than it would; their scripts therefore import only `node:` builtins and files in this
tree. `check:workflow-scripts` reads a job rather than a workflow and refuses the other
combination.

## Notes on the runner

**Every job that runs steps declares a literal `timeout-minutes`.** A step that hangs otherwise
holds a runner until GitHub ends the job at six hours. `check:portability` holds it in every
workflow through `scripts/check/arena/check-portability.ts:timeoutProblems`, and a job that calls a
reusable workflow with `uses:` is exempt because the jobs it calls carry their own.
[`../../scripts/ci/arena/AGENTS.md`](../../scripts/ci/arena/AGENTS.md) says how to run a job's
commands on a clean clone.

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

**The tools are pinned to the exact versions Arena runs on.** `BUN_VERSION`, `NODE_VERSION` and,
where a job installs a browser, `CHROME_VERSION` sit in each workflow's `env`, and `packageManager`
names the same Bun. Every job that runs Arena's tooling installs Node through `actions/setup-node`,
because the gates read what Node and Bun do (the brotli dictionary `check:weight` measures with, the
bytes `bun build` emits) and an image's Node moves without a commit. Chrome for Testing serves the
exact build on every runner, and the three `verify.yml` jobs that launch a browser install it.

An action runs on GitHub's own `node24`, whatever `NODE_VERSION` gives the tooling.

**Chromium.** The gates that measure a real render drive a browser, and `CHROME_PATH` is terminal:
set and pointing at nothing, they report that rather than falling back to the candidate list.
**Only `main.yml` names a browser**: it passes `name-browser: true` to `verify.yml`, and each of
its three browser jobs writes the pinned path `setup-chrome` reports (`outputs.chrome-path`) to
`$GITHUB_ENV` as `CHROME_PATH`. Unwritten, `findChromium` sees no value, so `pr.yml` and
`develop.yml` prove the candidate list finds one, and `main.yml` keeps the terminal-override branch
exercised. `check:portability` holds that exactly one workflow names one; naming it everywhere
would leave the list unreachable.

**Strictness is automatic.** GitHub sets `CI=true`, which `skipExitCode()` reads, so a gate
whose dependency is missing fails instead of skipping. There is nothing to configure and
nothing to remember; a missing browser is a red run.

**The cache is not an artifact.** Inside one run the build travels as an artifact: `verify.yml`
uploads it for one day, and a download that misses fails the job rather than testing an unbuilt
tree. From `Arena main` to the workflows that follow it the build travels as a cache keyed by the
commit, because the reader is a separate run, and a restore that misses builds instead, because
there is a real commit whose build has simply aged out. There is no `restore-keys` anywhere, for
the same reason in both: a prefix fallback would hand a job somebody else's build.

`upload-artifact` appears in `verify.yml` and in the publish workflows. In `verify.yml` the artifact
is a hand-off inside the run, kept one day, and in the publish workflows it is a release record. A
cache is evicted at seven days unread and is addressed by a key nobody keeps; a release record is
kept for ninety days and is the account of what shipped.

**`check:docs` reads this directory.** Every `.md` here is held to the size limit and to the
punctuation rule, the same as anywhere else in the tree. It does not read `.yml`; `check:graph`,
`check:portability` and `check:workflow-scripts` do, each for the part of a workflow it holds.
`check-all.test.ts` reads them through `scripts/ci/arena/verify-workflow.ts`,
`scripts/graph/run-build.test.ts` reads the publish workflows and `pages.yml`, and
`scripts/ci/arena/run-portability.test.ts` reads `develop.yml`.
