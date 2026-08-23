# DOUBTS

**A debt is paid, or made loud, before it is written down.**

This file is not a ledger. Arena keeps no prose register of defects: what is actionable is paid,
and what is a standing limit or a settled decision lives in a place that fails when it stops
being true. What this page holds is the definition of a debt in Arena, and where the records
live.

## What counts as a debt

Something that is **wrong, incomplete, or unverified**, and that a reader would otherwise have
to rediscover. Three tests separate one from an ordinary imperfection:

1. **It is a claim about the tree**, not a preference. "The crosshair snaps a left pad early" is
   a debt; "this component could be shorter" is not.
2. **It survives the person who found it.** If reading the code answers it, the code is the
   record and there is nothing to file.
3. **It costs something specific**, and the cost is stated. A limit with no consequence is a
   fact, and a fact belongs in the normative document that describes the thing.

A **decision** is the other admissible shape: an option that was weighed and refused, recorded so
the next reader does not re-propose it. A decision without its reason is worthless, because the
reason is the whole entry.

## Where a debt goes, in order of preference

**Prefer any of these to a paragraph.** Each of them fails when it stops being true, and a
paragraph does not. That is the entire argument for this order:

1. **Pay it.** A defect that can be fixed is not debt; it is work.
2. **A gate, with a reason-carrying map.** `EXEMPT`, `EXCLUDED`, `COVERED`, `UNTRACKED`,
   `PASSTHROUGH`, `MANIFEST_COVERS`, `EXTERNAL_PROPERTIES`, `NOT_QUANTIFIED`, `PROSE_EXEMPT`: each entry
   names a case and says why, as a string value rather than a comment, and each gate's paired
   suite asserts on the map by name. **A stale entry fails its own gate.** See
   [`scripts/check/AGENTS.md`](./scripts/check/AGENTS.md).
3. **A suite assertion.** A limit a test can pin is pinned. An assertion that a collision does
   *not* happen is worth more than a sentence saying it does not.
4. **The normative document for that layer.** A structural limit belongs where the rule it
   qualifies is stated: [`contracts/api/AGENTS.md`](./contracts/api/AGENTS.md),
   [`contracts/behaviour/AGENTS.md`](./contracts/behaviour/AGENTS.md),
   [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md), or the layer's own `AGENTS.md` under
   `frameworks/`.
5. **The component's `.prompt.md`.** A measured limit of one component, and every check only a
   person can run, such as whether a name is a good name, whether motion reads as intended or
   whether a colour carries the meaning it should, belongs beside the component, in the by-hand
   checklist the prompt already carries.
6. **The one header `scripts/` and test files are allowed**, at most ten lines: a measurement, a
   vendor's behaviour, a pinned version, a constraint of a test environment.

Framework sources under `frameworks/` carry **no** comments at all, and `check:docs` enforces it,
so a fact about one of them goes to its layer's `AGENTS.md` or its prompt, never into the file.

## What this file is not

**It is not a changelog.** A fixed defect is neither wrong, incomplete nor unverified, and a
paragraph explaining how it was fixed is history. The commit log already holds that, and it
holds it better, because it is dated.

**It is not a home for prose that could be a check.** Prose is the cheapest place to put
something, which is exactly why it accumulates: nothing ever fails because a paragraph goes
false. An entry can be wrong for as long as nobody reads it, and having been corrected is no
evidence of being correct, because nothing checks the correction either.

**It is not a substitute for reading.** An entry is a claim, and a claim about a file you have
not read is how any record goes quietly false.

## The three shapes a false claim takes

None of them is findable by a keyword query, which is why "I grepped it" is not evidence:

- **A document describing ITSELF**: one naming its own directory layout, a clause excluding a
  path that a move has since merged into the path two sentences above it. Only an end-to-end read
  finds these.
- **A component name written into ANOTHER file's prose**, which rots while every gate stays
  green. A *structural* reference is fine and should not be hunted, meaning this component's own
  render naming what it draws. What rots is a citation asserting **another** component's current
  state.
- **A sibling cited by its bare filename**, which a refactor rewrites in every import specifier
  and nowhere in a sentence.

When you change component `X`, read every hit of:

```bash
X=ArenaSkeleton   # the component you just changed
grep -rn --binary-files=without-match "\b$X\b" \
    --include='*.md' --include='*.json' --include='*.mjs' --include='*.tsx' --include='*.ts' \
    AGENTS.md DOUBTS.md contracts/ docs/ frameworks/ scripts/
```

Drop by hand the hits under `X`'s **own** files. **Scope a worklist by its path list and never by
piping `grep -n` through `grep -v`**: `-n` prints `path:line:CONTENT`, so a filter after it drops
hits by their *text*, which silently excludes any directory whose name the filter happens to
match.

## If you must file one here

Write what is wrong, what it costs, and the command that re-derives it. **Prefer no exemplar, or
a command.** Both are stale-proof, and a present-tense component name is not. Then ask once more
whether a gate, a suite or a normative `AGENTS.md` would hold the same claim, because one of them almost always
will.

## Filed

**No editor ever speaks to the MCP server.** A suite starts the process an editor starts, speaks
the protocol at it and reads the answers back, so initialize, tools/list, tools/call,
resources/list and resources/read are exercised against a real payload. What is not exercised is
any client but that one: no editor's own handshake, no protocol version but the one the suite
sends, and none of the methods the server does not implement.

What it costs: a client that negotiates differently, or that calls a method this server answers
badly rather than not at all, fails in the editor with nothing here in red. The failure lands as
a broken configuration in somebody's editor, which is the point at which they have least reason
to blame Arena and least ability to diagnose it.

Re-derive what is exercised with `bun test scripts/check/arena/check-mcp-protocol.test.ts`, and
what the server offers at all with `bun run check:mcp`.

**No install of Arena is ever run.** The consumer branch names four package managers and
several bundlers, and `check:consumer` runs what a consumer runs by symlinking the assembled
package into a fixture and calling the command with Node. Nothing installs the tarball with npm,
pnpm, bun or yarn, and nothing puts it through a bundler, so the rows on the repertoire page that
say a tool works say it because somebody once did it by hand or because the manifest resolves.

What it costs: a manifest change that breaks under one layout ships green, and the failure lands
in a consumer's first install, which is the point at which they have least reason to blame the
package and least ability to diagnose it. It is also what holds several rows of
`skills/design/references/stack.md` at "verified by hand once" and "allowed by the manifest, not
exercised": an install matrix is the only thing that would move them, and promoting a row without
one is the failure the evidence column exists to prevent.

Re-derive what is claimed with `bun run check:support`, and what is actually exercised with
`bun run check:consumer`.

**The discovery record is the one artefact no gate here can observe.** `arena-to-prod --skill`
writes into a consumer's own tree, and this repository holds no consumer tree. What runs here is
the payload it writes from, held by `check:packages`, and a render of the record it would produce,
held to the Agent Skills specification the same way.

What it costs: a record that stops matching the package it came from is read by an agent anyway,
which writes against a language one version old and reports nothing. `--skill-check` is the only
instrument over it and the consumer is the only one who can run it, so a release moves the number
and nothing here proves the record moved with it.

Re-derive it by installing the packed package into a scratch project and running
`npx arena-to-prod --skill && npx arena-to-prod --skill-check --strict=skill`.

**Nothing server-renders an Angular page.** The consumer branch tells a project it may
server-render or prerender, and both layers are written for it: neither reads a browser global
while a module evaluates, and `check:architecture` fails one that starts to. What separates the
two layers is the evidence under that claim. Much of the React suite renders through
`react-dom/server`, so a regression there fails a run. Angular's suites go through a DOM instead,
so its half rests on the code being right: the injected `DOCUMENT` token instead of the global, and
`afterNextRender` for anything that measures.

What it costs: a component that reaches the document in a way no gate models ships green and
throws in the consumer's server build, where the stack names an import rather than the component,
which is the hardest shape to trace back. A prerendered page is the same failure at build time.

Re-derive what the gate covers with `bun run check:architecture`, and find what would have to
change with `grep -rn "afterNextRender\|inject(DOCUMENT)" frameworks/angular/components`. Smoke-test
a server render by hand when a change touches how a component reaches the document.

**Nothing verifies that a component's emitted stylesheet paints what its manifest paints.** A
manifest's class string and the per-component sheet compiled from it are two spellings of one
appearance, and every check over them is a claim about text: which utility a manifest names,
which declaration the sheet carries, which token a property resolves to.

What it costs: a slot that computes a different value from its own recipe ships with every gate
green, because the disagreement exists only once both are painted, and no suite paints either.
The axis most likely to move unseen is the one a default `getComputedStyle` cannot reach anyway,
a `motion-reduce:` variant, since it is hoisted to a sibling `@media` block rather than
interleaved the way `@layer utilities` orders it.

Re-derive the surface with `ls frameworks/tailwind/components/*/*/*.manifest.json`, and read a
sheet against its manifest with `bun run check:component-css`.

**Almost nothing verifies that a browsable page renders.** Every specimen, playground and demo
page in the tree is emitted and then compared as source: against the fixture that seeds it,
against a fresh run of its generator, against the sheets it links. The kitchen-sink pages are
opened, by `check:pixel-parity`, which fails one that paints nothing or raises anything on its
way there. Every other page in the tree is opened by nobody.

What it costs: a page that compiles and mounts nothing is invisible, and so is one that throws on
its first render, says something on the console, or draws a class no stylesheet it links defines.
A specimen declaring a `@dsCard` viewport is cropped to it, so content over-running that box is
lost with nothing to say so, and the declaration cannot be derived by arithmetic.

Re-derive the surface with `find frameworks intro -name '*.demo.generated.html' -o -name '*.card.html'`,
and open it with `bun run demos`.
