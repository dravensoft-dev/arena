# scripts/check/react/

| gate | fails when |
| --- | --- |
| `check-demos-generated.ts` | a `.tsx` under `frameworks/react/components/` or `ui-kits/console/` has no compiled `.generated.js` sibling, or the sibling differs from a fresh compile, and, in the other direction, when a `.generated.js` is orphaned because the source that produced it is gone. Needs `Bun.Transpiler`, so it cannot run under plain node, which the repository's declared strict setting makes a failure rather than a skip; see [`../AGENTS.md`](../AGENTS.md). |
| `check-vendor-generated.ts` | one of the three `frameworks/react/vendor/*.generated.js` bundles differs from a fresh `Bun.build` of the pinned React devDependency, or is missing. Needs `Bun.build`, so it cannot run under plain node, on the same terms. |
| `check-react-barrel.ts` | `frameworks/react/Index.generated.ts` differs from a fresh run, a component directory holds no source at all, two components export one name so `export *` would shadow one, or a module named in `ROOT_PRIVATE` turns up exported after all. An empty barrel is an explicit failure rather than a clean pass. Pure node. |
| `check-react-types.ts` | `frameworks/react/tsconfig.check.json` does not typecheck. It is the only gate that can catch a component disagreeing with the interface declared beside it, which is what a hand-written declaration never could. `tsc` runs under plain node, so unlike the two above this gate has no skip path. |

The compiled siblings, the vendor bundles and the barrel are all git-ignored, so on a clone
with no build those three gates report their subject *missing* and name the command to run.
That is the intended signal; see [`../../build/AGENTS.md`](../../build/AGENTS.md).

Every `X.test.ts` beside a gate covers that gate.
