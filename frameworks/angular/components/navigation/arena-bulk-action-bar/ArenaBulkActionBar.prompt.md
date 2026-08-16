Arena bulk actions bar. It renders only when `count` is above zero, states the size of
the selection in mono, and offers actions that operate on the set. A destructive
action stays outline in `--error` -- transparent at rest, the soft `--danger-soft`
tint only on hover -- like every risk trigger but one; the filled danger surface stays
`arena-confirm-dialog`'s alone. `count` and `actions` are required. Import `ArenaBulkAction`
from `@dravensoft/arena-angular` for the `actions` input's element type.

```html
<arena-bulk-action-bar [count]="selected().length" noun="deployments"
                       [actions]="[
                         { id: 'rerun', label: 'Re-run', icon: 'ph-bold ph-arrow-clockwise' },
                         { id: 'archive', label: 'Archive', icon: 'ph-bold ph-archive' },
                         { id: 'delete', label: 'Delete', icon: 'ph-bold ph-trash', destructive: true }
                       ]"
                       (run)="apply($event)" (clear)="selected.set([])" />
```

<!-- @api GENERATED from contracts/api/components/ArenaBulkActionBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `count*` | primitive | `number` |  | How many rows are selected. Zero renders no bar at all. |
| `noun` | primitive | `string` | `"items"` | What is being counted, plural: "items", "projects". |
| `actions*` | array | `readonly ArenaBulkAction[]` |  | The actions offered for the current selection. |
| `run` | event | `ArenaBulkAction` |  | An action was activated, carrying which one. |
| `layout` | enum | `ArenaBulkActionBarLayout` | `"auto"` | Whether the bar may stack. 'auto' measures its OWN container, not the viewport, and drops the count, the actions and Clear onto separate rows when one row does not fit; 'inline' keeps the single row at every width, for a bar in a place the consumer knows is wide. It is a member rather than something a consumer reaches in with CSS because the alternative is what happens without it: reordering the bar's own children by position, which puts focus order out of step with visual order and breaks the next time anything inside moves. Stacking here reorders nothing, so the tab order and the reading order stay the same order they are wide. |
| `clearable` | primitive | `boolean` | `true` | Whether the Clear control is drawn. Every layer gates on this member and never on whether anything listens for `clear`, because Arena never derives what it draws from what a consumer listens for. |
| `clear` | event |  |  | The Clear control was activated. |

<!-- @api end -->

`clearable` (default `true`) gates whether Clear is drawn. Every layer gates on this member
and never on whether anything listens for `clear`.

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
- Always offer Clear. A selection the user cannot see the edges of is a selection they
  will act on by accident.
- Put the destructive action last, and confirm it with `arena-confirm-dialog` -- the bar
  starts the action, it does not finish it.
- Don't hide the bar behind a menu. Its whole job is to be visible the moment a
  selection exists.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
