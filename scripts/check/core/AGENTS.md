# scripts/check/core/

| gate | fails when |
| --- | --- |
| `check-dtcg.ts` | a file under `contracts/design/` is not strictly-conformant DTCG 2025.10: a missing `$type`, a colour that is not a structured sRGB object, a dimension that is not a `{value,unit}` pair. |
| `check-extensions.ts` | a design extension moves something that is not a role in `contracts/design/roles.json`, declares a `$type` its role disagrees with, moves a token without a `$description`, carries a name that is not kebab-case, moves nothing at all, or is not joined to a block in `FILES`. Both halves of that join fail: a file the generator does not emit paints nothing, and a block naming no file emits nothing, and each looks complete on its own. |
| `check-tokens-generated.ts` | the committed `contracts/design-generated/*.generated.css` drifts from what the DTCG source would emit: a missing selector, a changed value, or a custom property that is committed but no longer generated. |
| `check-fonts-generated.ts` | a family declared in `contracts/design/typography.json` has no `@font-face` in `fonts.generated.css`, so a token names a font nothing loads. |
| `check-ramp.ts` | the 8-slot categorical chart ramp stops clearing its contrast and colour-vision-deficiency gates on either surface. |
| `check-text-contrast.ts` | a text token fails contrast against the surface it is declared for, or a retired token reappears in `colors.css`; `REMOVED` names each one with the token that replaces it. |

`core` because every one of these reads `contracts/` and `assets/` alone, and no framework
layer.

**Each of these reads its sheets inside `main()`, and none of them at module top level.** The
graph collects a node by importing the script that declares it, so a gate doing its work where
an import reaches it cannot be collected, and three of these exited the process outright.
`check/arena/script-imports.test.ts:importTimeEffects(path)` holds that over every script under
`build/`, `generate/` and `check/`.

Every `X.test.ts` beside a gate covers that gate.
