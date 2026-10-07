Error state with a recovery path (H9). Arena draws the retry button itself from
`retryLabel` (absent renders no retry); `onRetry` handles the click. `secondaryAction`
is a slot beside it for a consumer-supplied extra control, and `code` is a diagnostic
exposed as a mono chip.

```tsx
<ArenaErrorState icon="ph-fill ph-warning-octagon" title="Couldn't load the panel"
  message="No connection to the metrics service." code="ERR_UPSTREAM_504"
  retryLabel="Retry" onRetry={reload}
  secondaryAction={<ArenaButton className="arena-emphasis-secondary">View logs</ArenaButton>} />
```

<!-- @api GENERATED from contracts/api/components/ArenaErrorState.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `icon` | primitive | `string` |  | A Phosphor class name for the danger glyph Arena draws. |
| `title` | primitive | `string` |  | The headline: what failed. Absent, the provided locale's errorStateTitle answers it. |
| `headingLevel` | enum | `ArenaHeadingLevel` | `"h3"` | Which rung of the document outline the title takes. Only the element changes: the title's class is the same at every value, so the render is identical and no appearance follows from it. It defaults to `h3`, the card rung of the title ladder, for the reason an empty state does: a failure fills the body of a region something above it already names. `none` takes the headline out of the outline, which is what a failure inside a small surface wants, and it is available here because `title` carries a default rather than being required. |
| `message` | primitive | `string` |  | A sentence of detail under the title. |
| `code` | primitive | `string` |  | A diagnostic/support code, shown monospaced. |
| `retryLabel` | primitive | `string` |  | The label of the retry button Arena draws. Absent renders no retry. |
| `onRetry` | event |  |  | The retry button was activated. |
| `secondaryAction` | slot |  |  | An extra control beside the retry (e.g. a link to logs). |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the behaviour binding and its pattern. Edit the binding or the pattern, not this list. -->

**Keys.** This component binds [`alert`](../../../../../contracts/behaviour/alert.json), which names no key.

<!-- @keys end -->

**Do / Don't**
- Always pass `retryLabel` when a retry could work. An error state with no retry is a
  dead end the user has to navigate out of.
- `icon` is a Phosphor class name (a string), never a JSX node; Arena draws the glyph.
- Don't put the raw exception in `message`. The code chip is where a machine-readable
  detail goes; the message is for a person.
- Don't use this for a validation failure on a field: that belongs on the field.

**Words.** `title` answers first; when it is absent, the locale's `errorStateTitle` does.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
