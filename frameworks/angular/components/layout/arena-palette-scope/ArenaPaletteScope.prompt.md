A palette island: a subtree drawn in one palette while the page keeps another. Standalone, `OnPush`, with the attribute selector `[arenaPalette]`, so it sits on your own element rather than inside a wrapper of its own. The host carries the palette's class, the palette's ground and its ink, and every reader below it gets the palette's name.

```html
<section arenaPalette="light">
  <arena-card title="Receipt">Rendered in the light palette.</arena-card>
</section>
```

<!-- @api GENERATED from contracts/api/components/ArenaPaletteScope.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `palette*` | primitive | `string` |  | The name of a palette the theme config declares, such as `light`. A name the theme config does not declare throws, listing the declared ones. The scope draws the class `arena-<palette>` on its element and gives every reader below it this name. |
| `content` | slot |  |  | What is drawn in the palette. The slot is optional and unguarded, because a scope holding nothing yet is still a valid island. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**The scope paints the ground, and the class alone does not.** A palette class such as `arena-light` sets variables and paints nothing, which is what lets it sit on `<html>` or on a component. The scope adds `base-100` as the ground and `base-content` as the ink, so an island reads as its own palette whatever the page is. Nest one inside another and the inner one wins for everything below it.

**Read the palette with `injectArenaPalette()`.** The function returns a signal of the nearest `[arenaPalette]` above the caller, over the token `ARENA_PALETTE`, and `ArenaThemeService.theme` where there is none. An overlay opened from inside the island takes the island's palette, so a tooltip over a light island is light. `ArenaThemeService` stays page-wide.

**A bare palette class is a valid island for styling and it is not a scope.** An element with `arena-light` on it takes the light variables, and the readers above do not see it. Use the component wherever something below needs to know the palette.

**A palette the theme config does not declare throws**, with the message `ArenaPaletteScope: no palette named "x"; the declared palettes are dark, light`. The declared names come from the same config `setArenaTheme` checks.

**Do**
- Put it around the part of a screen that must keep its own palette, such as a receipt that prints light on a dark page.
- Name a palette your theme config declares.

**Don't**
- Don't use it to switch the page's theme. Page themes belong to `setArenaTheme` or `ArenaThemeService`, which write `<html>`.
- Don't nest one only to repeat the palette the page already has.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/layout/arena-palette-scope/ArenaPaletteScope.demo.generated.html`:
- The island has its own background and text colour, distinct from the page's when the palette differs.
- Switching the page theme leaves the island's palette alone.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
