# scripts/generate/arena/

| script | emits | why it exists |
| --- | --- | --- |
| `generate-tokens.ts` | `contracts/design-generated/*.generated.css`, `Tokens.generated.*` in both framework layers, and `frameworks/tailwind/Breakpoints.generated.css` | DTCG JSON is the only place a design value is authored. This turns it into the four CSS files `intro/styles.css` imports, and, for a token flagged `$extensions["com.dravensoft.arena"].script`, into a bare number each layer can do arithmetic with. The breakpoints go a third way, as Tailwind `--breakpoint-*` literals, because a media query condition holds no `var()`. It also derives `catSlots` from the `--color-cat-*` ramp, which is the count `contracts/api/types/arena-cat-slot.json` must agree with. |
| `generate-api-types.ts` | `Api.generated.*` in both framework layers | A shared object or enum is declared once in `contracts/api/types/` and emitted per layer, so a component's import never crosses the `contracts/api/` ↔ `frameworks/` boundary. |
| `generate-playgrounds.ts` | `PlaygroundCodec.generated.ts` in every layer with a playground | What a knob holds, whether it is bound and how both round-trip through a query string are authored once in `frameworks/demos/PlaygroundCodec.ts` and emitted per layer, for the same reason the API types are: a copy per layer is a copy that can disagree. Here the disagreement is worse than a type error, because two `decode()` implementations that drift render the SAME URL differently in each layer while both compile and both suites pass, and comparing two pages side by side is the whole point of the pages. `check:playgrounds` holds each copy to the source and to the other copy. |
| `generate-member-docs.ts` | a `/** … */` above every contracted member, in both framework layers | A member's `description` is authored once in its contract and belongs in the source a compiler carries into what a consumer's editor reads. Nothing here transforms an emitted declaration: the fix is source, and `check:api` then holds every block equal to its contract, so the copy cannot rot. |
| `generate-skills.ts` | `frameworks/SKILL.md` and one `frameworks/<layer>/SKILL.md` | The consumer branch's index tree, and the whole route from the router to a component: the first says what exists and how it is classified, each layer's says what the same members are called there and links the prompt beside the component. Every column is derived, from `frameworks/Components.json`, each component's API contract, each layer's directory and each layer's behaviour binding, so no page can disagree with the contracts. A hand-written index would be the one shape `DOUBTS.md` refuses: nothing fails when it stops being true. |
| `generate-voices.ts` | the `@voices` region in the root `SKILL.md` | The voice an application takes is the first decision on the consumer route, before any component, and the catalogue it is picked from is `contracts/design/extension.*.json`: each voice declares the `job` it is for beside the `grouping` principle `check:extensions` measures it against. Generated because a third voice has to reach a reader without anybody remembering, and because a page saying how many ship goes false the day one lands. The base voice is the one row with no contract, since it is not an extension: it is what the token layer already is. The region is written into markers a person placed, because where the catalogue sits on the route is the router's decision. |
| `generate-npm-pages.ts` | four `@shared` regions in each layer's `PACKAGE.md` | The half of an npm page that is the same page in both packages: what the repository is, how a skin is declared, the voice catalogue and its prose, and the tail. It was 8,700 characters written twice by hand, and the two pages had already drifted in wording elsewhere. What a layer decides, the import idiom, what the package exports and how a layout is composed, stays hand-written in each. |
| `generate-prompt-api.ts` | the `@api` region inside every `.prompt.md`, in both framework layers | A prompt is where a consumer stops reading, so the members have to be stated there, and a hand-typed table is a second copy of the contract that nothing holds. This writes one region per prompt, under the names that layer binds, and `check:prompts` holds each equal to a fresh emit; the rest of the prompt stays hand-written prose. |

They are `arena` rather than `core` because each **writes into a framework layer or across
two**, however much its input lives under `contracts/`. The domain is decided by what a script
touches.

What they emit is tracked or ignored for one reason, audience: the git tag the Claude Code
plugin is installed from hands some of these to a reader directly, and nothing runs a build
there. `contracts/design-generated/` is served to a browser, and the `SKILL.md` tree with the
prompts it links is what an agent reads to decide which component to reach for. Everything else
these scripts write under `frameworks/` is git-ignored and rebuilt by `bun run build`.
`check:tokens`, `check:script-tokens`, `check:api`, `check:skills` and `check:prompts` compare
what is on disk against a fresh emit. `check:skills` carries the three that are regions inside a
hand-written page rather than whole files: a region is emitted between markers a person placed,
so the page decides where a section sits and the script decides only what it says.

Every `X.test.ts` beside a script covers that script.
