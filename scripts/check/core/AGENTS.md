# scripts/check/core/

| gate | fails when |
| --- | --- |
| `check-dtcg.ts` | a file under `contracts/design/` is not strictly-conformant DTCG 2025.10: a missing `$type`, a colour that is not a structured sRGB object, a dimension that is not a `{value,unit}` pair. |
| `check-role-contract.ts` | `contracts/design/roles.json` stops being a declaration: a role carrying a `$value`, which is an answer and belongs to a style plugin; one declaring no `$type`, so nothing can check an answer to it; one with no `$description`, which is a question nobody can answer on purpose; or a keyword declaring no closed set, since the set is the whole of what earns that type. It is the gate `check-dtcg.ts` cannot be, and why that one excludes this file by name: a DTCG token without a `$value` is not a DTCG token, so a conformance walk would measure the file against a claim it never made. |
| `check-style-plugin.ts` | the root style plugin leaves a declared role unanswered, or a scope this build emits closes the reading floors below what a reader is owed: prose leading under 1.5, a heading's leading under 1, or a prose measure outside 45 to 90 characters. Totality is the sharper half: a custom property with no value is invalid at computed-value time, so the declaration reading it is dropped and the whole property disappears, and an unanswered role is a missing border rather than a plainer appearance. The floors are measured against the values the generated sheets actually resolve to rather than against the file that authored them, in the base scope and in every theme scope beside it, because a value restated under a theme can close a paragraph up in the one scope nobody measured. |
| `check-style-plugin-coverage.ts` | a role `complete` answers the way `default` does, or a part no rule in `plugin-style-store/complete/plugin.css` paints. **A role nothing can reach is a role that does not exist**, and a part nothing can paint is a hook that was emitted and wired to nothing, so the question it asks is whether the surface the kernel advertises is the surface it exposes. `complete` is the witness: it is not coherent as a design and does not try to be. The parts are read from the manifests rather than from the generated modules, so a manifest that gained a slot and never rebuilt is caught, and the painted set comes from `paintedParts` in the shipped audit rather than from a selector parsed a second time. |
| `check-tokens-generated.ts` | the committed `contracts/design-generated/*.generated.css` drifts from what the DTCG source would emit: a missing selector, a changed value, or a custom property that is committed but no longer generated. |
| `check-token-collisions.ts` | two of the generated stylesheets declare the same custom property on the same selector, so source order silently decides which one a page gets. It is the gate `check-tokens-generated.ts` cannot be: each file is in sync with its own source and the collision only exists where they meet. A role named after a scale step is the usual cause, which is why the tracking roles are `track-*` and the size roles `step-*`. |
| `check-fonts-generated.ts` | a family declared in `contracts/design/typography.json` has no `@font-face` in `fonts.generated.css`, so a token names a font nothing loads. |
| `check-ramp.ts` | the 8-slot categorical chart ramp stops clearing its contrast and colour-vision-deficiency gates on either surface. |
| `check-boundary-contrast.ts` | the answer this build ships sets a control's or a field's border to zero and the fill it sits on does not carry the 3:1 WCAG 1.4.11 asks of a component's boundary, measured in both themes. A surface's border is deliberately not asked about: 1.4.11 is about components and a card is not one. |
| `check-text-contrast.ts` | a text token fails contrast against the surface it is declared for, or a retired token reappears in `colors.css`; `REMOVED` names each one with the token that replaces it. |

`core` because every one of these reads `contracts/` and `assets/` alone, and no framework
layer.

**Each of these reads its sheets inside `main()`, and none of them at module top level.** The
graph collects a node by importing the script that declares it, so a gate doing its work where
an import reaches it cannot be collected, and three of these exited the process outright.
`check/arena/script-imports.test.ts:importTimeEffects(path)` holds that over every script under
`build/`, `generate/` and `check/`.

Every `X.test.ts` beside a gate covers that gate.
