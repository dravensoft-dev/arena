# What a machine writes, and what you do

**Before you edit a file in this tree, know which half of it is yours.** An edit to a generated
region survives until the next `bun run build` and then goes, and nothing fails in between: the
suites read the source you edited, the gates compare copies that still agree with each other, and
the page you open is drawn from the file the build rewrote. A green board is not evidence that
your edit is still there.

This page is the answer to that question and to nothing else. What a value means is
[`contracts/design/AGENTS.md`](./contracts/design/AGENTS.md); what a component presents is
[`contracts/api/AGENTS.md`](./contracts/api/AGENTS.md); how a change is proved is
[`scripts/AGENTS.md`](./scripts/AGENTS.md).

## A file is one of three things

**Written by a machine, and its name says so.** `<stem>.generated.<ext>`. Never edit one, never
review one as though a person chose its wording, and never fix a defect in one: the defect is in
its source, and the next build restores it. `check:generated` holds the naming.

**Written by a machine, and its name does not say so.** Two reasons a file lands here, and both
are recorded rather than assumed. A file a generator writes whole carries a banner on its first
line naming the command that writes it, which is what `frameworks/react/INDEX.md` and every
`INDEX.md` beside it carry. A file that can carry neither the name nor the banner is named in
`UNMARKED` in `scripts/check/arena/check-generated.ts`, with the reason it can carry neither: one
is binary and one is built by a tool this repository does not contain.

**Written by a person, with a region a machine writes inside it.** This is the shape that costs,
because the file is yours, the surrounding prose is yours, and one part of it is not. There is no
convention that reveals it from outside. Read the file.

## The regions inside an authored file, and how each marks itself

Each marks its boundary differently, and the third does not mark it at all.

- **A component's `.prompt.md`** carries `<!-- @api ... -->` and `<!-- @rules ... -->` regions,
  opened and closed by markers the generator writes. The prose around them is authored, and it is
  most of the file. A prompt is not emitted from its contract; a prompt has regions emitted from
  its contract, and reading the first sentence as the second is how a reader concludes the whole
  file is untouchable.
- **A layer's `PACKAGE.md`** carries `@shared` regions, and here the **markers are placed by a
  person** while the text between them is not. Where a shared section sits on the npm page is the
  author's decision; only what it says belongs to the generator, and
  `scripts/generate/arena/generate-npm-pages.ts:applyRegion(source, key, region)` throws rather
  than guesses when a marker it expects is absent.
- **A component's source**, in either layer. Above every contracted member sits a `/** … */`
  whose text is that member's `description` from `contracts/api/`, and **nothing in the file says
  so**. There is no marker, no banner and no infix. `generate:member-docs` writes it, `check:api`
  fails one whose text is not the contract's and fails one on a member no contract names, and the
  rule that a comment is a defect everywhere else under `frameworks/` is what makes this shape
  legible once you know it exists. Editing the text there edits the wrong file: the fix is the
  contract's `description`, and the comment follows on the next build.

## Derive it rather than trusting this page

Which generators write where is declared by each generator in its own `node`, so the tree answers
the question and no list here can go short:

```bash
bun -e "
import { allNodes } from './scripts/graph/nodes.ts';
const nodes = await allNodes();
for (const node of Object.values(nodes).flat())
  for (const written of node?.writes ?? [])
    if (!/\.generated\./.test(written)) console.log(node.name.padEnd(30), written);
"
```

Everything that command prints is a file whose name does not announce its generator. What it does
not print is either authored or named. Run it when a generator lands, when one moves, and the
first time you touch a directory you have not touched before.

## What it costs to guess wrong

Each of these ships green, which is why the question is worth asking before the edit rather than
after the gate:

- **Editing a member's `/** … */` by hand.** If your wording differs from the contract's,
  `check:api` catches it. If it happens to match, nothing does, and you leave believing that
  comment is yours to maintain until the day a contract edit silently reverts your next one.
- **Editing a generated region of a prompt.** `check:prompts` fails it, so this one is loud. What
  is quiet is the opposite mistake: treating the authored prose as generated and refusing to
  correct it, which leaves a component's own rules wrong forever because nobody believes they may
  be touched.
- **Reading a stale compiled sibling.** A component's `.generated.js` is compiled from its source
  and is what a demo page loads. The suites import the source, so they prove the new component
  while the page draws the old one, and the two disagree until `bun run build` runs.
- **Writing a gate over a whole file whose regions have different owners.** A gate that judges an
  authored file's generated region reports a defect whose fix is somewhere the message does not
  name, and the reader repairs the wrong file.

## After you change anything a generator reads

`bun run build` runs every generator, and `git status --short` afterwards is the list of what it
decided to write. Two rules about that list, and both are load-bearing:

**A file you did not expect means a generator you did not know reads what you edited.** Read it
before committing; the surprise is the point of looking.

**A file you expected and did not get means the generator never saw your edit.** That is nearly
always a source in the wrong place rather than a generator at fault.

Some generated outputs are tracked and some are ignored. `UNTRACKED` in
`scripts/check/arena/check-generated.ts` names each ignored one with the reason it is ignored, so
commit what the tree tracks and let the rest be rebuilt.
