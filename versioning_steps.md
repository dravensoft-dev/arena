# Releasing a version of Arena

The order the moves are made in. `frameworks/PACKAGING.md` says what a package is and how it is
assembled; `.github/workflows/AGENTS.md` says what CI does with it once the tag is pushed. This
page is neither: it is the sequence, and every step below is a step because skipping it fails
something or, worse, fails nothing.

## 1. Change the version everywhere it is stated

**This comes first, before any build**: the packages are stamped from `.claude-plugin/plugin.json`,
so a build that runs before the bump writes the OLD version into `frameworks/*/dist/package.json`
and `check:packages` reports the difference in the next step. Each place is named by what it says
rather than by a line number, because a line moves under the next edit and takes the pointer with
it in silence.

| File | What to change |
|---|---|
| `.claude-plugin/plugin.json` | the `version` member, which is the authority every other surface is compared against |
| `.claude-plugin/marketplace.json` | the `version` member |
| `.claude-plugin/marketplace.json` | the `ref` member, which names the tag as `vx.x.x` |
| `README.md` | the `- **Repo/Claude Code plugin**: x.x.x` line under the `## Latest project artifacts` heading |

`check-release.ts` finds the README pair by exact regex, so the heading and the label are the
parts that must not be reworded.

**Two rules that gate live only in the gate**, so they are stated here rather than discovered:
the `homepage` of the plugin and of the marketplace entry must both be the site's own URL, and
**a package version in the README's artifact list is linked and never restated**, because a
number written there goes stale the next time a package publishes without the plugin.

Verify with:

```bash
bun scripts/check/arena/check-release.ts
```

Expected: every other check PASS, and `tag exists` FAIL with the `git tag -a` line, because the
tag is two steps away. This gate reads the manifests, the README and git, and never the built
packages, so it is answerable here. It is run by path and has no npm script on purpose: between
releases the tag for the current version does not exist yet, so adding it to `GATES` would redden
every push that is not a release.

## 2. Rebuild the packages

```bash
bun run build:release
```

Then run every gate the same way:

```bash
bun run check --release
```

That runs all of them and also reports any gate that failed while the graph would have kept it,
which is a defect in what that gate declares rather than in the gate. A release is the one run
where a wrong declaration has to surface, because it is the run nothing downstream re-checks.

`dist/` is git-ignored and no other build touches it, so it holds whatever was last built there,
which after any component work is not what the tree says. `check:packages` reads both the version
stamp and whether every component `Components.json` declares is in the emitted `.d.ts`, so a
skipped rebuild reports itself rather than shipping. It compares the manifest it just assembled
against `plugin.json`, which is why the bump is step 1: run in the other order and this gate fails on the
version you just wrote, and the only fix is to build again.

## 3. Tag it, and land it on `main`

```bash
git tag -a vx.x.x -m "Arena vx.x.x"

bun scripts/check/arena/check-release.ts
```

Expected: all PASS.

```bash
git push origin main --follow-tags
```

**You never run `npm publish`.** Both packages are published by CI from the tag, so a release
where the two npm versions moved and nobody ran a publish command is the release working. Confirm
it on the npm page rather than in a terminal.

**The branch is not incidental.** Every publish workflow hangs off a run of the workflow named
`Arena main`, which fires on a push to `main`, so a release arrives there as one merge of
`develop`. A tag pushed to any other branch is verified by nothing downstream and publishes
nothing, and no step in CI reports the omission: the release simply does not happen.

## 4. Pack the benches and attach them to the release page

In the bench repository, `~/Dravensoft/arena-web-benches`, run its own `pack` script with the
version, then upload what it wrote:

```bash
gh release upload vx.x.x -R dravensoft-dev/arena dist/*.tar.gz
```

That script belongs to that repository and not to this one, which is why it is described here
rather than spelled: a command copied out of this page and run from this tree answers that no
such script exists.

One tarball per twin pair, and one asset on the page for each. Count what was produced with
`ls dist/*.tar.gz | wc -l` rather than against a number written here, because how many pairs
exist is the bench repository's answer and not this page's.

The benches consume the published package, so they are packed AFTER the tag: one packed before it
is a pair measured against a version that is not out, and the tarball is named for the release it
hangs on. `pack` refuses a dirty tree, because a tarball matching no commit cannot be produced
again, and it reads `git archive`, so each bench's own `.gitignore` is the whole of what packed
means and no second exclusion list exists here to go stale.

The release page itself is written by `.github/workflows/release.yml` from the commit log, and it
is edited rather than replaced on a re-run, so uploading after it exists adds the assets without
touching the notes.
