# scripts/check/tailwind/

| gate | fails when |
| --- | --- |
| `check-tailwind.ts` | a class some manifest names emits no rule, a `@theme` key resolves to no real token, a slot transitions `transform` while painting `translate`, `scale` or `rotate`, which v4 emits as individual properties that `transform` does not cover so the change never animates, **or the gate found no manifests at all**, because one iterating zero manifests finds zero violations by construction. |
| `check-tailwind-generated.ts` | `Utilities.generated.css` or a `*.manifest.generated.ts` differs from a fresh compile of the preset and the `.manifest.json` sources. |
| `check-tailwind-coverage.ts` | a token reaches no utility and is not named in `EXCLUDED` with a reason, or an `EXCLUDED` entry names a token that no longer exists. |
| `check-arbitrary-values.ts` | a Tailwind bracket carries a raw literal instead of `var(--token)`, a `calc()`/`min()`/`max()`/`clamp()` over one, zero, or a unit the token layer does not model. It reads the hand-written tree only: `dist/` and `vendor/` are skipped by name, as three neighbouring gates already skip them, and the Angular emit by its **anchored** path rather than by the name `build`, since a walker skipping that name would also take `scripts/build/`. Until the CLI shipped as TypeScript nothing under `dist/` matched an extension it reads, so it had been scanning 414 generated copies unnoticed. |
| `check-radius-tokens.ts` | a manifest writes `rounded-full` where `rounded-pill` belongs. Deliberately that one class: it is the only utility in a cleared `--radius-*` namespace that still resolves without an Arena token behind it. |
| `check-role-tokens.ts` | a manifest writes a scale where a role belongs: a radius step, a depth step, `--bw` or a `dur` step standing in for the `r-*`, `shadow-*`, `bw-*` and `dur-*` roles in `contracts/design/roles.json`. A scale says how round, how deep, how thick or how long; a role says WHICH corner, depth, edge or transition is being asked about, and only a question can be answered differently by a design extension. Radius and depth are banned by utility name because they have a Tailwind namespace; a border width and a duration are banned by TOKEN name, which catches `border-[length:var(--bw)]` and the `var(--dur-fast)` buried inside an arbitrary `[transition:...]` property with one entry instead of one per spelling. `SCALE_USES` records the places that genuinely mean the length, and a stale entry fails the gate. |
| `check-component-css.ts` | a class a manifest names has no rule, a rule no manifest derives has one, an emitted sheet still reads a Tailwind theme property (so the strip did not run and an adopter's own `--spacing` reaches in), a property resolves to no Arena token, or the prelude has lost the `@property` registrations without which every border and the focus ring are invalid at computed-value time. |

Every gate here is a claim about **text**: what a manifest names, what the emitted sheet
declares, which token a property resolves to. Nothing here compares what the two actually paint;
[`../../../DOUBTS.md`](../../../DOUBTS.md) carries what that leaves open.

The last is the converse of `check-tailwind-coverage` and just as narrow: it does not attempt
"every utility traces to a token" in general, only this one verified case.

**No gate here compares a manifest against the component it mirrors.** The mapping is not
one-to-one, because a manifest mirrors a React component and an `arena-*` primitive at once and a
compound family's one manifest mirrors several of each, so that check is by hand. The one
narrow slice that is machine-checked lives elsewhere, as `check:states` in `../arena/`.

Every `X.test.mjs` beside a gate covers that gate. Three suites here name no gate:
`manifest-classes.test.ts` covers `frameworks/tailwind/ManifestClasses.js`,
`arenaTv-merge.test.mjs` covers the shared `Tv.ts`, and `theme-namespaces.test.ts` covers
`Theme.css` itself, asserting that every namespaced property in it is attributed to a
namespace or listed with a reason. All three are claims about the layer this domain gates
rather than about any one gate, and the third is deliberately independent of the other two:
it holds the preset whether or not anything still merges a class string.
