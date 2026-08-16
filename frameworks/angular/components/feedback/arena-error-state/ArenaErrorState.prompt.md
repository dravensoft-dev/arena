Arena failure state, something did not load, and there is a way to try again. Under
the API contract (`contracts/api/components/ArenaErrorState.json`) Arena draws the primary retry
itself, from `retryLabel`/`retry`, the same drawn-from-data shape `ArenaAlert`'s
`actionLabel`/`action` uses, rather than leaving it to a consumer to project. The
`[secondaryAction]` slot stays projected, for whatever a consumer wants beside the
retry (a link to logs, say). The solid `--error` fill is what distinguishes it from
`arena-empty-state`'s dashed neutral border: one apologises and offers a retry, the
other simply has nothing yet. `code` renders the support code as a mono chip: it is
for a support conversation, not for the user to act on, which is why it is muted and
small. The actions wrapper only renders when a retry or a secondary action actually
exists, a bare error state ships no dead space for a retry it does not offer.

```html
<arena-error-state icon="ph-bold ph-plugs"
                   title="Couldn't reach the delivery API"
                   message="The dashboard is showing the last data it cached."
                   code="ERR_UPSTREAM_504"
                   [retryLabel]="'Retry'"
                   (retry)="retry()">
  <a secondaryAction href="/logs">View logs</a>
</arena-error-state>
```

<!-- @api GENERATED from contracts/api/components/ArenaErrorState.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `icon` | primitive | `string` |  | A Phosphor class name for the danger glyph Arena draws. |
| `title` | primitive | `string` | `"Something went wrong"` | The headline: what failed. |
| `message` | primitive | `string` |  | A sentence of detail under the title. |
| `code` | primitive | `string` |  | A diagnostic/support code, shown monospaced. |
| `retryLabel` | primitive | `string` |  | The label of the retry button Arena draws. Absent renders no retry. |
| `retry` | event |  |  | The retry button was activated. |
| `secondaryAction` | slot |  |  | An extra control beside the retry (e.g. a link to logs). |

<!-- @api end -->

Import `ArenaSecondaryAction` from `@dravensoft/arena-angular` alongside `ArenaErrorState`
in the host component's `imports`,
`secondaryAction` is a directive, not a plain attribute, because it is how the error
state detects that a secondary action was projected at all.

**Do / Don't**
- Always pass `retryLabel` when a retry could work. An error state with no retry is a
  dead end the user has to navigate out of.
- Say what still works, if anything does: "showing the last cached data" is more
  useful than "an error occurred".
- Don't put the raw exception in `message`. The code chip is where a machine-readable
  detail goes; the message is for a person.
- Don't use this for a validation failure on a field: that belongs on the field.
- Don't forget to import `ArenaSecondaryAction` when projecting a secondary action,
  without it, the `secondaryAction` attribute is inert and the content silently fails
  to render.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
