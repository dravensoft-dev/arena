A named row of filter controls placed above the content they narrow, such as a table. Filters in effect appear as chips a person can remove, followed by Clear all, and the host keeps every piece of filter state.

```html
<arena-filter-bar label="Deployment filters" [applied]="applied()" (remove)="drop($event)" (clear)="applied.set([])">
  <arena-select label="Region" [options]="regions" [value]="region()" (change)="region.set($event)" />
  <arena-segmented-control ariaLabel="Status" [options]="statuses" [value]="status()" (change)="status.set($event)" />
</arena-filter-bar>
```

<!-- @api GENERATED from contracts/api/components/ArenaFilterBar.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | Names the group of filters, such as "Deployment filters", never "Filters". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. |
| `content*` | slot |  |  | The filter controls, in order: selects, inputs, segmented controls, comboboxes. Fills the bar's control row and never replaces the bar. Required, and guarded at runtime: a bar with no control filters nothing. |
| `applied` | array | `readonly ArenaAppliedFilter[]` | `[]` | The filters in effect, drawn as chips in a list after the controls. An empty list draws no chip row. |
| `clearable` | primitive | `boolean` | `true` | Whether Clear all is drawn while `applied` holds a filter. Every layer gates on this member and never on whether anything listens for `clear`. |
| `remove` | event | `ArenaAppliedFilter` |  | A chip's remove button was activated; carries the whole filter. Once the host drops it from `applied`, focus moves to the chip now in its place, else the last chip, else the first control. A control the person has moved to since keeps focus. |
| `clear` | event |  |  | Clear all was activated. Once the host empties `applied`, focus moves to the first control. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`group`).
<!-- @keys end -->

- **Controls are projected.** Place the controls inside the element, in order. `[applied]` lists the filters in effect as `{ id, label }` entries, each `label` formatted by the host, such as "Region: Europe West".
- **Removing.** A chip's remove button emits `(remove)` carrying the whole filter. The chip goes once the host drops that filter from `[applied]`. Clear all emits `(clear)`, answered by emptying `[applied]`.
- **Where focus goes.** When `[applied]` loses a chip, focus moves to the chip now in that place, or to the last chip. With no chip left, and after Clear all, focus moves to the first tab stop among the controls. A removal the host refuses moves no focus. Focus never leaves a control the person has moved to since.
- **No keys of its own.** Each projected control keeps its own keyboard, and every remove button is a Tab stop. Tab reaches the controls, then the chips, then Clear all.
- **Clear all.** The control appears only while `[applied]` holds a filter. `[clearable]="false"` keeps it hidden even then.
- **Stacking.** Below `--bp-sm` of its own host, the bar turns into one column at any viewport width. The order of its parts never changes, so Tab still follows the reading order.
- **Names.** The group takes `label` as its name, and a blank `label` throws. The locale's `filterBarApplied` word names the chip list. `filterBarClear` is the text of Clear all and `filterBarClearLabel` its accessible name. Each remove button reads `tagRemove` before the chip's text.
- **Not a store.** Whether a new filter sends a table back to its first page is the host's call.

**Do / Don't**
- Name the group after what it narrows, such as "Deployment filters", and never just "Filters".
- Give every projected control a label, or an `ariaLabel` for a segmented control.
- Don't hand the bar a description of filters to draw; project the real controls.
- Don't colour chips or attach menus to them.
- Don't set `[clearable]="false"` lightly. Many filters nobody can clear at once trap a person.

**By hand.** The wrapping row and the single column at phone width, with a real select, input and segmented control projected. The baselines of the controls align when one lacks a label. After removing a chip from the keyboard, focus is on the next chip. A screen reader announces the group's name and the list's name.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
