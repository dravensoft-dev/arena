# plugin-style-store/catalogue/

**A catalogue entry is a starting point measured on a real product, and it is the one thing in this
store that exists to be copied.** The two plugins a level up are Arena's own answers, rendered by
the site and measured by gates, and a second copy of one of those would be a second answer to a
question the kernel asks once. An entry here is the opposite claim: a project that has not decided
what it looks like takes one, puts it in its own tree, and edits it from there.

**Nothing here is compiled.** No entry has a row in `FILES` in
`scripts/generate/arena/generate-tokens.ts`, so no sheet is emitted, no class exists and the site's
style plugin control never offers one. That is the line that keeps the store's own claim true: what
this repository renders is `default` and `complete`, and what it publishes for somebody else to run
is this directory.

`bun run check:catalogue` is what holds an entry to being usable, which matters more here than
anywhere else in the store: an entry that stopped answering a role the kernel gained is a broken
build in every project that took it, and none of those projects is in this tree to report it.

## What an entry carries

Four files, and a gate fails an entry missing any of them.

- **`plugin.tokens.json`**, answering every role in `contracts/design/roles.json`. It is a root
  plugin, since a project taking an entry names it first, so a role left unanswered is a missing
  border rather than a plainer appearance.
- **`plugin.css`**, selecting only through the `data-arena-part` hooks, unscoped by any class for
  the reason above, and never spelling `@layer`.
- **`arena.config.json`**, carrying both polarities, the whole colour set and the three font slots,
  with `stylePlugins` naming `./design/<entry>` so the file works where a consumer puts it.
- **`ENTRY.md`**, which is the half a person reads.

## What `ENTRY.md` says, and in this order

**The preamble carries a line beginning `Take this entry when`**, and it is the only part of an
entry a cold start reads before it has chosen one. Node 4 of
[`skills/design/references/cold-start.md`](../../skills/design/references/cold-start.md) matches a
description against that line across the whole catalogue and then opens a single entry, which is
what keeps choosing as cheap as the catalogue grows: an index would be a second answer to a question
the entries already answer, and it would go stale where the entry it describes does not.
`check:catalogue` fails an entry that carries no such line.

**The line names the SHAPE of the screen and not only what the product is about**, because the
domain is what collides. A support desk and a project tracker are both a tool somebody keeps open
all day, and what separates them is that one is a list against a reading column and the other is a
board that has to hold more than it fits. A line that stops at the domain hands a cold start two
entries and no way to choose.

The order below is what a cold agent needs rather than what is easiest to write.

1. **What this register answered**, over the role groups
   [`skills/design/references/style-kernel.md`](../../skills/design/references/style-kernel.md)
   measured as the ones that separate one product from another, with the reason the register asks
   for each. Derive the answers by reading the entry's own `plugin.tokens.json`, never from memory
   of the product.
2. **The page it assumes**: the shape, the rhythm steps between components, the column, the
   density class. Arena ships no page shape, and this is the part a cold start misses hardest.
3. **The components it leans on**, and what falls outside the component list into markup of your
   own.
4. **What it does not bring**: the palette, the copy, the mark, the metadata. An entry settles how
   a product looks and settles nothing about what it is.

## Naming

**A directory is named for the register, never for the product it was measured on.** The name
becomes the plugin's name and a class in the consumer's build, and a register generalises where a
product does not: a second measurement of the same register is a sibling entry rather than a
contradiction. The product is named in the entry's prose as the measurement, which is a fact about
where the numbers came from.

## How an entry is added

Build the product against Arena first, as a consumer, with its own config and its own plugin, and
look at it. What lands here is the result of that, not a plugin authored against a screenshot. The
measurement is the whole value of the catalogue: an entry nobody ran is a guess with a directory.
