# scripts/lib/

**The bottom of the graph.** A module is here because more than one script reads it, and the
only direction allowed is downward: a gate imports a library, and **a library never imports a
gate**. Across domains the same holds in both directions: `core/arena-tokens.ts` imports
`../arena/css-decls.ts` and nothing forbids it, because a domain is a statement about subject
matter, not a visibility boundary.

## ArenaPlacement

Everywhere else under `scripts/`, the domain is decided by what a script **touches**. Most of
`lib/` touches nothing, being pure functions, so the reads-and-writes test cannot separate
them, and **a library that touches nothing is placed by the vocabulary it speaks**. A module
that speaks no vocabulary at all is neither, and lives in flat [`../utils/`](../utils/AGENTS.md)
rather than here.

`core/serialize-token.ts` opens no file, but every name in it is a DTCG one, so it is `core`.
`core/behaviour-compliance.ts` is the same, in `contracts/behaviour`'s vocabulary of
requirement keys. What is left over is `arena`, meaning the parsers, the browser harness,
`layers.ts` and `repo-root.ts`, because it belongs to no layer in particular.

**Never place a library by who imports it.** `behaviour-compliance.ts` is read from both
framework layers' test harnesses and is still `core`, because what it speaks is the contract
vocabulary, not either layer's.

## Runtime reach

Three modules here run somewhere `scripts/` does not. `core/behaviour-compliance.ts` is
consumed from three runtimes (plain node, happy-dom under Bun, and the Angular AOT emit), which
is why it touches only `tagName`, `getAttribute`, `hasAttribute` and `textContent`, and takes
its id resolver from the caller instead of reaching for a `document` it may not have.
`arena/comments.ts` is kept dependency-free for the same reason. Both are also why **a test
under `scripts/` may not import a framework layer's `.ts` or `.tsx`**: `check-all.ts` runs
these suites under plain node too, which cannot resolve the extensionless imports those
toolchains expect.

## The five domains

| domain | what a module there speaks |
| --- | --- |
| [`arena/`](./arena/AGENTS.md) | belongs to no one layer: parsers, the browser harness, the tree's own facts |
| [`core/`](./core/AGENTS.md) | speaks `contracts/`: DTCG, behaviour requirements, colour science |
| [`tailwind/`](./tailwind/AGENTS.md) | compiles the Tailwind layer, for the gates that read it |
| [`react/`](./react/AGENTS.md) | emits that layer's half of a playground, in that layer's idiom |
| [`angular/`](./angular/AGENTS.md) | the same, for the other layer |

**Count them rather than reading a figure here**, which rots the first time a module lands:

```bash
for d in angular arena core react tailwind; do
  printf '%-9s %s\n' "$d" "$(find scripts/lib/$d -name '*.ts' ! -name '*.test.ts' -o -name '*.mjs' | wc -l)"
done
```

`repo-root.ts` is the one module whose own move needs care: it is the single place that counts
`..` segments to find the repository root, so that no other script's depth is part of what it
has to get right.
