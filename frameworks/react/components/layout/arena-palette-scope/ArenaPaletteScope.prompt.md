A palette island: a subtree drawn in one palette while the page keeps another. The component returns a `<div>` carrying the palette's class, the palette's ground and its ink, and it gives every reader below it the palette's name.

```tsx
<ArenaPaletteScope palette="light">
  <ArenaCard title="Receipt">Rendered in the light palette.</ArenaCard>
</ArenaPaletteScope>
```

<!-- @api GENERATED from contracts/api/components/ArenaPaletteScope.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `palette*` | primitive | `string` |  | The name of a palette the theme config declares or one registered at runtime, such as `light`. A name that is neither renders pending: no palette class and no properties, so the children inherit the page's palette, and a one-time console warning names it. The scope paints the palette as soon as that name is registered, and goes back to pending when that name is removed. The scope draws the class `arena-<palette>` on its element, or for a registered palette its polarity hook and its properties, and gives every reader below it this name. |
| `children` | slot |  |  | What is drawn in the palette. The slot is optional and unguarded, because a scope holding nothing yet is still a valid island. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**The scope paints the ground, and the class alone does not.** A palette class such as `arena-light` sets variables and paints nothing, which is what lets it sit on `<html>` or on a component. The scope adds `base-100` as the ground and `base-content` as the ink, so an island reads as its own palette whatever the page is. Nest one inside another and the inner one wins for everything below it.

**Read the palette with `useArenaPalette()`.** The hook returns the nearest `ArenaPaletteScope` above the caller, and the page theme (`getArenaTheme()`) where there is none, before `initArenaTheme` has run and with no `document`. A chart or a canvas that resolves a colour reads it, so the island redraws on its own palette. `useArenaTheme` stays page-wide.

**A bare palette class is a valid island for styling and it is not a scope.** An element with `arena-light` on it takes the light variables, and the readers above do not see it. Use the component wherever something below needs to know the palette.

**A name that is neither declared nor registered renders pending.** The scope's element wears no palette class and no properties, so everything below it inherits the page's palette, and `console.warn` names the missing palette once. The scope paints the palette as soon as `registerArenaPalette` registers that name, and renders pending again when `unregisterArenaPalette` removes it. `useArenaPalette()` below it answers the scope's name meanwhile. Nothing throws, so the scope may mount before the user's palette has been fetched and registered. The scope judges the name once `initArenaTheme` has run. Before that it draws `arena-<palette>` and judges on init, so a scope may mount ahead of the call.

**A palette `registerArenaPalette` registered** has no class of its own name. The scope's element wears its polarity hook, `arena-polarity-dark` or `arena-polarity-light`, and its `--color-*` and `--level-*` properties.

**Do**
- Put it around the part of a screen that must keep its own palette, such as a receipt that prints light on a dark page.
- Name a palette your theme config declares or one `registerArenaPalette` registered.

**Don't**
- Don't treat the scope as a card. The scope is the ground of a region, and its corners take the surface radius so that a scope around one card shows no corner of the other palette.
- Don't use it to switch the page's theme. Page themes belong to `setArenaTheme` or `ArenaThemeService`, which write `<html>`.
- Don't nest one only to repeat the palette the page already has.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/layout/arena-palette-scope/ArenaPaletteScope.demo.generated.html`:
- The island has its own background and text colour, distinct from the page's when the palette differs.
- Switching the page theme leaves the island's palette alone.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
