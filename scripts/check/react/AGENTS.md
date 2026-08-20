# scripts/check/react/

| gate | fails when |
| --- | --- |
| `check-demos-generated.ts` | a `.tsx` under `frameworks/react/components/` or `ui-kits/console/` has no compiled `.generated.js` sibling, or the sibling differs from a fresh compile, and, in the other direction, when a `.generated.js` is orphaned because the source that produced it is gone. Needs `Bun.Transpiler`, so it cannot run under plain node, which the repository's declared strict setting makes a failure rather than a skip; see [`../AGENTS.md`](../AGENTS.md). |
| `check-vendor-generated.ts` | one of the three `frameworks/react/vendor/*.generated.js` bundles differs from a fresh `Bun.build` of the pinned React devDependency, or is missing. Needs `Bun.build`, so it cannot run under plain node, on the same terms. |
| `check-react-barrel.ts` | `frameworks/react/Index.generated.ts` differs from a fresh run, a component directory holds no source at all, two components export one name so `export *` would shadow one, or a module named in `ROOT_PRIVATE` turns up exported after all. An empty barrel is an explicit failure rather than a clean pass. Pure node. |
| `check-text-runs.ts` | a render hands the browser a run of text built out of pieces: literal text beside an expression, where Angular's interpolation compiles the whole run into one text node whatever the template spells. React makes a node per child, so the shaper is handed several short strings where the twin gives it one, and the same sentence rasterises differently at some sizes and not at others. Found on the `complete` kitchen sink, where it moved 157 pixels across two components with every other gate green; the appearance the package installs with drew both of them identically. `SPLIT_RUN` is empty and is meant to stay that way. **It holds the half a parser can decide**: two adjacent expressions are the same defect and are not detectable here, because whether a call returns a string or an element is not a fact about source text. |
| `check-react-types.ts` | `frameworks/react/tsconfig.check.json` does not typecheck. It is the only gate that can catch a component disagreeing with the interface declared beside it, which is what a hand-written declaration never could. `tsc` runs under plain node, so unlike the two above this gate has no skip path. |

The compiled siblings, the vendor bundles and the barrel are all git-ignored, so on a clone
with no build those three gates report their subject *missing* and name the command to run.
That is the intended signal; see [`../../build/AGENTS.md`](../../build/AGENTS.md).

Every `X.test.ts` beside a gate covers that gate.
