Arena copy button, an icon button that writes a string to the clipboard and confirms in place. Standalone, `OnPush`, signal I/O. The host is an inline wrapper holding an `arena-icon-button` and a live region, and the component runs the clock that reverts them.

```html
<arena-copy-button [text]="apiKey()" label="Copy the API key" (copied)="track('key-copied')" />
<arena-copy-button [text]="inviteUrl()" label="Copy the invite link" showLabel class="arena-emphasis-solid" />
```

<!-- @api GENERATED from contracts/api/components/ArenaCopyButton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `text*` | primitive | `string` |  | What is written to the clipboard, exactly as given. A blank text draws the button disabled, because there is nothing to copy. The text is data, so it is not guarded. |
| `label` | primitive | `string` |  | The button's accessible name, the same in every state. Absent or blank, the provided locale's copyButtonLabel answers it, which reads Copy by default. Name what is copied when a page holds more than one. |
| `showLabel` | primitive | `boolean` | `false` | Draws the name beside the glyph, as ArenaIconButton.showLabel does. |
| `disabled` | primitive | `boolean` | `false` | Blocks the copy. |
| `copied` | event |  |  | The clipboard took the text. No payload, because the consumer already holds the text. |
| `copyFailed` | event |  |  | The clipboard refused the text, or the page has none, as on an insecure origin. No payload and never an error object. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`emphasis`](../../../../VOCABULARY.md#emphasis): `arena-emphasis-ghost` (default), `arena-emphasis-solid`. Write one as `class="arena-emphasis-solid"` on the component, or on a container whose components should all take it.

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `class="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`button`](../../../../../contracts/behaviour/button.json):
- `Space`: activate.
- `Enter`: activate.
<!-- @keys end -->

**The glyph confirms, the region speaks, and the clock reverts both.** When the clipboard takes the text, the check shows and the region says `copyButtonCopied`. When the write is refused, or the page has no clipboard, the warning shows and the region says `copyButtonFailed`. Both last the `--dismiss-confirmation` window, which a second press restarts.

**The accessible name holds still.** `label` reaches the inner button unchanged in every state, so a reader meets one control throughout. When two copy buttons share a page, give each a label that says what it copies.

**Listen to the two outputs, never to a click.** The component reports through `(copied)` and `(copyFailed)`, and neither is a DOM event name, so a press fires one of them, once. The inner button's native click reaches the page, and the two outputs report the copy.

**The failure is said aloud, and nothing falls back.** The clipboard exists only in a secure context. On plain HTTP from another host the button shows the warning and emits `copyFailed`.

**A code readout composes from parts Arena already ships.** No code block component exists. Wrap a `<pre>` in an `arena-scroller` with `behaviour="flow"`, and place this button after the scroller as its sibling. An element of yours around both carries the sunken ground and the mono face.

```html
<div class="install-command">
  <arena-scroller label="Install command" behaviour="flow">
    <pre>bun add @dravensoft/arena-angular</pre>
  </arena-scroller>
  <arena-copy-button text="bun add @dravensoft/arena-angular" label="Copy the install command" />
</div>
```

```css
.install-command {
  display: flex;
  align-items: start;
  gap: var(--gap-control);
  padding: var(--pad-surface);
  border-radius: var(--r-surface);
  background: var(--fill-surface-sunken);
}
.install-command pre {
  margin: 0;
  font-family: var(--font-mono);
}
```

**Do / Don't**
- **Do** pass the exact string a reader should paste. A command with a trailing newline runs on paste in many terminals.
- **Do** use `(copied)` for analytics or a next step. The button has already confirmed, so a toast on top repeats it.
- **Don't** look for an `icon` input. Arena owns the three glyphs, so the check and the warning mean one thing everywhere.
- **Don't** confirm by setting `pressed` or renaming the button. Either one is announced as a different control.
- **Don't** send the confirmation to `arena-toast`. A toast speaks away from the press, and the region speaks beside it.
- **Don't** hand it markup or an image. The clipboard receives the plain string in `text`.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/angular/components/forms/arena-copy-button/ArenaCopyButton.demo.generated.html`:
- Press it on `localhost` and paste the result. The check appears, and the copy glyph comes back unaided.
- Open the demo over plain HTTP from another host and press it. The warning glyph and the failure word appear.
- Run a screen reader and press once. "Copied" is spoken once, and the button's name is unchanged.
- Press twice within the window. The check holds for a full window after the second press.
- Place it in an `arena-fill` container. The button stays the width of its glyph.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
