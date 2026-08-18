Bulk actions (H7). Appears when there's a selection and operates on the set. Combine it with `ArenaConfirmDialog` for destructive actions. `actions` is an array of `{ id, label, icon?, destructive? }`, where `id` is a stable identity so a host can switch on it rather than on the label, and `icon` is a Phosphor class name Arena draws, never a node. Activating one fires `onRun` with the action; there is no per-action `onClick`.

```tsx
<ArenaBulkActionBar count={selected.length} noun="deployments" onRun={(action) => run(action)} onClear={() => setSelected([])}
  actions={[
    { id: 'retry', label: 'Retry', icon: 'ph-bold ph-arrow-clockwise' },
    { id: 'archive', label: 'Archive', icon: 'ph-bold ph-archive' },
    { id: 'delete', label: 'Delete', icon: 'ph-bold ph-trash', destructive: true },
  ]} />
```

<!-- @api GENERATED from contracts/api/components/ArenaBulkActionBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `count*` | primitive | `number` |  | How many rows are selected. Zero renders no bar at all. |
| `noun` | primitive | `string` | `"items"` | What is being counted, plural: "items", "projects". |
| `actions*` | array | `readonly ArenaBulkAction[]` |  | The actions offered for the current selection. |
| `onRun` | event | `ArenaBulkAction` |  | An action was activated, carrying which one. |
| `layout` | enum | `ArenaBulkActionBarLayout` | `"auto"` | Whether the bar may stack. 'auto' measures its OWN container, not the viewport, and drops the count, the actions and Clear onto separate rows when one row does not fit; 'inline' keeps the single row at every width, for a bar in a place the consumer knows is wide. It is a member rather than something a consumer reaches in with CSS because the alternative is what happens without it: reordering the bar's own children by position, which puts focus order out of step with visual order and breaks the next time anything inside moves. Stacking here reorders nothing, so the tab order and the reading order stay the same order they are wide. |
| `clearable` | primitive | `boolean` | `true` | Whether the Clear control is drawn. Every layer gates on this member and never on whether anything listens for `clear`, because Arena never derives what it draws from what a consumer listens for. |
| `onClear` | event |  |  | The Clear control was activated. |

<!-- @api end -->

`clearable` (default `true`) gates the Clear control; pass `clearable={false}` to hide it entirely.

### It stacks when its own container is narrow

`layout` defaults to `auto`, which measures **the bar's own container** rather than the viewport
and drops the count, the actions and Clear onto separate rows below `--bp-sm`. Set `inline` when
the bar sits somewhere you know is wide.

**Stacking reorders nothing**, and that is the whole reason the member exists rather than a
consumer reaching in with CSS. Reordering the bar's children by position moves what is on screen
and leaves the tab sequence where it was, so the focus order and the reading order stop matching,
and it breaks again the next time anything inside the bar moves. Both layers assert that the
control order is identical in the two shapes.

**Do / Don't**
- Mark `destructive` on irreversible actions and chain it with `ArenaConfirmDialog`.
- Don't fire bulk actions without confirmation or without leaving `onClear` to undo the selection.
- Don't reach for `clearable={false}` casually: a selection whose edges the user cannot see is one they act on by accident.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `className` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md).

<!-- @rules end -->
