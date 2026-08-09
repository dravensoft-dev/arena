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
   [`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md), or the layer's own README under
   `frameworks/`.
5. **The component's `.prompt.md`.** A measured limit of one component, and every check only a
   person can run, such as whether a name is a good name, whether motion reads as intended or
   whether a colour carries the meaning it should, belongs beside the component, in the by-hand
   checklist the prompt already carries.
6. **The one header `scripts/` and test files are allowed**, at most ten lines: a measurement, a
   vendor's behaviour, a pinned version, a constraint of a test environment.

Framework sources under `frameworks/` carry **no** comments at all, and `check:docs` enforces it,
so a fact about one of them goes to its layer README or its prompt, never into the file.

## What this file is not

**It is not a changelog.** A fixed defect is neither wrong, incomplete nor unverified, and a
paragraph explaining how it was fixed is history. The commit log already holds that, and it
holds it better, because it is dated.

**It is not a home for prose that could be a check.** Prose is the cheapest place to put
something, which is exactly why it accumulates: nothing ever fails because a paragraph goes
false. An entry can be wrong for as long as nobody reads it, and having been corrected is no
evidence of being correct, because nothing checks the correction either.

**It is not a substitute for reading.** An entry is a claim, and a claim about a file you have
not read is how any record goes quietly false. `AGENTS.md` carries that rule, the three shapes it
takes, and the change-time greps that find them.

## If you must file one here

Write what is wrong, what it costs, and the command that re-derives it. **Prefer no exemplar, or
a command.** Both are stale-proof, and a present-tense component name is not. Then ask once more
whether a gate, a suite or a README would hold the same claim, because one of them almost always
will.

## Filed

**Nothing verifies that a component paints the same thing in every framework layer.** Each layer
carries one playground page per component, generated from the same model, and the pages differ in
one path segment and take the same query string precisely so that a difference between them is a
difference in the component. Nothing compares what they paint.

What it costs: a divergence in geometry, in inherited typography or in a computed colour reaches
an adopter with every gate green, because no suite can see one. The suites render under happy-dom,
which has no layout, so both layers pass while they draw differently, and the only thing standing
behind the claim that they agree is a person opening the pair side by side, which is not done per
change and covers whichever components that person thought to open.

Re-derive the surface with `find frameworks -name '*.demo.generated.html'`, and serve it with
`bun run demos`.

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

**Nothing verifies that a browsable page renders.** Every specimen, playground and demo page in
the tree is emitted and then compared as source: against the fixture that seeds it, against a
fresh run of its generator, against the sheets it links. None of them is opened.

What it costs: a page that compiles and mounts nothing is invisible, and so is one that throws on
its first render, says something on the console, or draws a class no stylesheet it links defines.
A specimen declaring a `@dsCard` viewport is cropped to it, so content over-running that box is
lost with nothing to say so, and the declaration cannot be derived by arithmetic.

Re-derive the surface with `find frameworks intro -name '*.demo.generated.html' -o -name '*.card.html'`,
and open it with `bun run demos`.
