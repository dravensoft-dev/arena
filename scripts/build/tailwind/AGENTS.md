# scripts/build/tailwind/

| script | emits | why it exists |
| --- | --- | --- |
| `build-tailwind.ts` | `Utilities.generated.css`; into `consume/`, one `<Component>.styles.generated.css` per manifest plus `Prelude.generated.css`, `Preflight.generated.css` and `Components.generated.css`; and a `<Component>.classes.generated.ts` and `ArenaStyles.generated.ts` mirrored into each layer | Compiles the `@theme` preset with the manifests as content, so every utility a manifest names is a real rule; then translates each manifest into `@apply` rules under Arena class names, compiles those, strips Tailwind's theme indirection back to the Arena token, and cuts the result into one stylesheet per component plus the prelude they share. |

**Every output is git-ignored, and each has its own reader here.** A class module is what a
`<Component>.variants.ts` imports, so `ngc` needs it on disk before the test surface will
compile at all. The component stylesheets and the barrel are what every specimen, every
playground, the Console and both packages load, and they exist **once**: `consume/` is the
whole consumption surface, so a page links a sheet from there rather than from a copy of it,
and no two copies can disagree. `sheetPath()` is the one place a manifest's path becomes its
stylesheet's, and the gates and the package builds all go through it.
`Utilities.generated.css` is published nowhere and survives because the package assembly cuts
it into the per-component sheets a package ships. `check:generated` carries a reason for each; `check:tailwind-generated` compares all of them against a fresh compile.

Every `X.test.ts` beside a script covers that script.
