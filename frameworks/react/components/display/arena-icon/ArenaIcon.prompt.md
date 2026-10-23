Arena's glyph, one Phosphor icon drawn from the sprite the project serves. The `<svg>` is the component's own box, sized by the text around it, and hidden from assistive technology: the component that draws a glyph owns its name.

```tsx
<ArenaIcon icon="ph-bold ph-plus" />
<ArenaIcon icon="ph ph-bell" />
```

```tsx
<ArenaIconsProvider href="/assets/icons-3f9a2c.svg"><App /></ArenaIconsProvider>
```

<!-- @api GENERATED from contracts/api/components/ArenaIcon.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `icon*` | primitive | `string` |  | Phosphor class names, a weight and a glyph such as ph-bold ph-plus. The weight defaults to regular. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**The sprite is the project's.** `arena build` writes `icons-<hash>.svg` with the glyphs the project's sources name, and `ArenaIconsProvider` hands its URL to every `ArenaIcon` below it. `useArenaIcons()` reads it, and answers `null` until a provider sets it. Nothing reads a document, a window or a fetch, so a server render is as safe as the browser one.

**The class list names the symbol.** A weight is one of `ph-thin`, `ph-light`, `ph`, `ph-bold`, `ph-duotone` or `ph-fill`, and `ph` alone is regular. The glyph is the one other `ph-<name>` token. `ph-bold ph-plus` draws the bold weight of the plus glyph, and `ph ph-bell` the regular bell.

**Size follows the text.** The svg is `1em` square and takes the colour of the text around it, so a `font-size` on the parent sizes it.

**No glyph or no sprite draws nothing.** A string with no `ph-<name>` token, or a project that provides no sprite, renders no svg and warns once.

**Do**
- Keep the `ph-*` literal in your source, so `arena build` finds the glyph and writes it into the sprite.
- Name the control around the glyph. The glyph itself is silent.

**Don't**
- Don't build the class list at runtime from pieces. The build scans for whole `ph-*` names.
- Don't give it a `className`, a size or a tone. The text around it sizes and colours it.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
