# scripts/check/angular/

| gate | fails when |
| --- | --- |
| `check-angular.ts` | the layer stops typechecking under `ngc --strictTemplates`. A green compile is a claim about **types**, and never about behaviour. |
| `check-angular-demos.ts` | a primitive whose behaviour only a browser can show has no `<Component>.card.html` + `.card.entry.ts` beside it, or `PAGED` names one that is gone. Structural and portable, needing no browser and no bundler, because the pages' script is git-ignored build output, and a blank page would pass a viewport check by having nothing to overflow. |
| `check-assertions.ts` | an Angular suite compares DOM nodes with an equality assertion. `node:assert` renders both operands into its diff, and a **connected** happy-dom node reaches the whole document from there. With one document shared across the run, a failing identity assertion is what exhausts the run rather than what reports the defect. |
| `check-cdk.ts` | the CDK overlay bridge overrides a rule that overrides nothing, names a token that resolves to nothing, or targets a class the CDK has renamed upstream. It examines the selectors, which it can because the prebuilt sheet is the oracle; what it still cannot check is whether the override is the **right** value. |
| `check-boolean-inputs.ts` | a boolean signal input is declared without `transform: booleanAttribute`, so the bare-attribute spelling every other boolean in the layer answers to fails to compile against that one. An input is boolean by its type argument **or** by a default of `true`/`false`, because the layer declares it both ways. `NOT_AN_ATTRIBUTE` names what is boolean by type and is deliberately not an attribute, with its reason, and an entry fails once it stops being needed, whether the input gained the transform or went away. |
| `check-optional-inputs.ts` | a defaulted signal input carries no transform, so its write type excludes `undefined` and a consumer holding an optional value has to restate the default the component already owns. The remedy is one shape, `{ transform: (value) => value ?? <default> }`, which widens what may be bound and leaves what is read alone. `TAKES_NO_ABSENCE` is empty, and that emptiness is the claim: no member in the layer needs a bound absence to mean something other than its default. |

Every `X.test.mjs` beside a gate covers that gate.
