Arena's key, or combination of keys, for running text such as a help line, an empty state or a tooltip. The element is one `<kbd>` for the combination with one `<kbd>` inside it per key, which is how HTML spells a key on a keyboard.

```html
<p>Press <arena-kbd [keys]="['Esc']" /> to close the panel.</p>
<p>Open the palette with <arena-kbd [keys]="['⌘', 'K']" label="Command K" />.</p>
<arena-kbd [keys]="['⌘', '⇧', 'P']" separator="" />
```

**The host draws no box.** `<arena-kbd>` is `display: contents` around the real `<kbd>`, the carve-out a specific semantic element takes. An attribute written on the host lands on the inert element and never on the keys.

<!-- @api GENERATED from contracts/api/components/ArenaKbd.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `keys*` | array | `readonly string[]` |  | One entry per key, in the order pressed, each spelled as the keyboard prints it: "Ctrl", "K", the command glyph. Required, and guarded at runtime after trimming: an empty list, or an entry with nothing on it, is a cap with no key, so the component throws. |
| `separator` | primitive | `string` | `"+"` | Drawn between caps, never before the first. An empty string glues the caps together, as a Mac shortcut is printed. Arena draws it in its own aria-hidden span. |
| `label` | primitive | `string` |  | What a reader hears instead of the caps, for a combination whose glyphs a screen reader reads badly, such as the command glyph. Present and not blank, the caps are hidden from assistive technology and the label is the one spoken text. Arena maps no glyph to a word, so a cap holding a symbol wants one. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none.
<!-- @keys end -->

**Symbols are text, never icons.** The command glyph, an arrow and the return glyph are characters in `keys`. No icon slot exists, because a glyph in a cap is the key's own spelling and the vetted icon set holds no modifier.

**A glyph needs a label.** A screen reader announces a symbol however it decides, often as a place-of-interest sign. Pass `label` with the words a reader should hear, such as "Command K". The caps are then hidden from assistive technology and the label is the one spoken text. Arena maps no glyph to a word.

**Two registers print a key, and one plugin answers both.** A cap is an enclosed key, drawn like the escape cap of `ArenaCommandPalette`. A trailing hint at the edge of a menu row or a palette row is the bare key, printed as its string. Every one of them is a `<kbd>` that reads the key roles. A style plugin therefore moves the face, the case, the ink and the cap's air of every key at once.

**Do**
- Spell each key the way the keyboard prints it: "Ctrl", "Shift", "Esc".
- Keep the caps on one line: the combination does not wrap between caps.

**Don't**
- Don't bind a key. ArenaKbd listens for nothing, and the shortcut stays the host's.
- Don't draw an icon in a cap. A symbol is text in `keys`.
- Don't parse a string such as "Ctrl+K" into caps, here or in a menu or a palette.
- Don't ask for a size, a tone or an emphasis. A cap is one outline in the key register.
- Don't use it as inline code. Code is a different element, `<code>`.
- Don't detect the platform to swap Ctrl for the command glyph. The host knows its user.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/display/arena-kbd/ArenaKbd.demo.generated.html`:
- At 390px a combination does not wrap between caps.
- The command glyph renders in the key face rather than a substituted one.
- With a label set, a screen reader reads the label once and no glyph.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
