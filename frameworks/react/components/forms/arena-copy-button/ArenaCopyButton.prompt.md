A button that copies a string and confirms in place. Arena draws an `ArenaIconButton` with its own copy glyph, a live region beside it, and the clock that reverts both.

```tsx
<ArenaCopyButton text={apiKey} label="Copy the API key" onCopied={() => track('key-copied')} />
<ArenaCopyButton text={inviteUrl} label="Copy the invite link" showLabel className="arena-emphasis-solid" />
```

<!-- @api GENERATED from contracts/api/components/ArenaCopyButton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `text*` | primitive | `string` |  | What is written to the clipboard, exactly as given. A blank text draws the button disabled, because there is nothing to copy; it is data, so it is not guarded. |
| `label` | primitive | `string` |  | The button's accessible name, the same in every state. Absent or blank, the provided locale's copyButtonLabel answers it, which reads Copy by default. Name what is copied when a page holds more than one. |
| `showLabel` | primitive | `boolean` | `false` | Draws the name beside the glyph, as ArenaIconButton.showLabel does. |
| `disabled` | primitive | `boolean` | `false` | Blocks the copy. |
| `onCopied` | event |  |  | The clipboard took the text. No payload, because the consumer already holds the text. |
| `onCopyFailed` | event |  |  | The clipboard refused the text, or the page has none, as on an insecure origin. No payload and never an error object. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`emphasis`](../../../../VOCABULARY.md#emphasis): `arena-emphasis-ghost` (default), `arena-emphasis-solid`. Write one as `className="arena-emphasis-solid"` on the component, or on a container whose components should all take it.

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `className="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`button`](../../../../../contracts/behaviour/button.json):
- `Space`: activate.
- `Enter`: activate.
<!-- @keys end -->

**A press swaps the glyph, says one word and reverts on its own.** A write that lands shows a check and says `copyButtonCopied` in the region. A refused write, or a page with no clipboard, shows a warning and says `copyButtonFailed`. The glyph returns after the `--dismiss-confirmation` window, and a second press starts that window again.

**The name never changes.** The button keeps its `label` before, during and after the confirmation, so a reader hears the same control in every state. Name what is copied, such as "Copy the API key", whenever a page holds more than one.

**A failure is reported, never worked around.** The clipboard needs a secure context, so a page served over plain HTTP from another host has none. The button then says the failure word and fires `onCopyFailed`.

**A code readout is a scroller, a pre and this button.** Arena ships no code block component. Put the command in a `<pre>` inside an `ArenaScroller` with `behaviour="flow"`, and set this button beside the scroller rather than inside it. The sunken ground and the mono face belong to an element of yours around the two.

```tsx
<div className="install-command">
  <ArenaScroller label="Install command" behaviour="flow">
    <pre>bun add @dravensoft/arena-react</pre>
  </ArenaScroller>
  <ArenaCopyButton text="bun add @dravensoft/arena-react" label="Copy the install command" />
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

**Do**
- Pass the exact string you want pasted. Trim a trailing newline yourself if the reader should not run the command on paste.
- Listen to `onCopied` for analytics or a follow-up step. The button already confirms the copy, so a toast on top says it twice.

**Don't**
- Don't pass an `icon`. The three glyphs are Arena's, so the check and the warning read the same everywhere.
- Don't set `pressed` or swap the `label` to confirm. A toggle that is on, or a control that renames itself, is announced as something else.
- Don't route the confirmation through `ArenaToast`. A toast speaks far from the button, while the region speaks where the press happened.
- Don't put rich content, markup or an image in `text`. The clipboard receives plain text and nothing else.

**By hand, in real Chromium**: run `bun run demos` and open
`/frameworks/react/components/forms/arena-copy-button/ArenaCopyButton.demo.generated.html`:
- Press it on `localhost` and paste somewhere. The check shows, then the copy glyph returns on its own.
- Serve the demo over plain HTTP from another host and press it. The warning and the failure word show.
- With a screen reader, press it once. "Copied" is announced once, and the button keeps its name.
- Press it twice inside the window. The check stays the full window after the second press.
- Put it inside an `arena-fill` container. The button keeps the width of its glyph, because the wrapper does not answer that family.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
