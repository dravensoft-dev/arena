One action with a menu of its alternatives, drawn as one control. The primary half runs the action, and the caret half opens the menu.

```html
<arena-split-button label="Deployment" menuLabel="More deploy options" icon="ph-bold ph-rocket-launch"
                    [items]="alternatives" (activate)="deploy()" (select)="run($event.label)">
  Deploy
</arena-split-button>
```

<!-- @api GENERATED from contracts/api/components/ArenaSplitButton.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `content*` | slot |  |  | The primary half's label, such as "Deploy". Required, and guarded at runtime: a primary half with no label names no action. |
| `icon` | primitive | `string` |  | Phosphor class name drawn before the label through ArenaIcon. Replaced by the spinner while loading. |
| `destructive` | primitive | `boolean` | `false` | Whether the primary action destroys or removes something. Both halves draw the danger outline whatever emphasis the split is given: danger is never filled. |
| `loading` | primitive | `boolean` | `false` | Replaces the leading icon with a spinner and blocks the primary half. The caret stays usable, so another action can start while this one runs. |
| `disabled` | primitive | `boolean` | `false` | Blocks both halves and dims the control. |
| `type` | enum | `ArenaButtonType` | `"button"` | The primary half's native button behaviour. Defaults to 'button' so a split inside a form does not submit it by accident. |
| `label*` | primitive | `string` |  | Names the group of both halves, such as "Deployment". Required, and guarded at runtime after trimming: a group with no name announces only that a group began. |
| `menuLabel*` | primitive | `string` |  | Names the caret half, such as "More deploy options". Required, and guarded at runtime after trimming: a caret is a glyph, so this name is all a screen reader hears. |
| `items*` | array | `readonly ArenaMenuItem[]` |  | The menu's entries, in order: activatable rows, dividers and group headers. |
| `align` | enum | `ArenaMenuAlign` | `"end"` | Which edge of the whole split the panel lines up with: start is the primary half's outer edge, end the caret's outer edge. |
| `click` | event |  |  | The primary half was activated, by pointer or by keyboard. Never reported while loading or disabled. |
| `select` | event | `ArenaMenuItem` |  | A menu entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`fill`](../../../../VOCABULARY.md#fill): `arena-fill`, `arena-fit` (default). Write one as `class="arena-fill"` on the component, or on a container whose components should all take it.

**Answers** [`emphasis`](../../../../VOCABULARY.md#emphasis): `arena-emphasis-ghost`, `arena-emphasis-primary` (default), `arena-emphasis-secondary`. Write one as `class="arena-emphasis-ghost"` on the component, or on a container whose components should all take it.

**Answers** [`size`](../../../../VOCABULARY.md#size): `arena-size-lg`, `arena-size-md` (default), `arena-size-sm`. Write one as `class="arena-size-lg"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`menu-button`](../../../../../contracts/behaviour/menu-button.json):
- `Enter`: opens the menu and moves focus to its first item.
- `Space`: opens the menu and moves focus to its first item.
- `Escape`: closes the menu and returns focus to the button.
- `ArrowDown`: moves focus to the next enabled row, wrapping from the last to the first.
- `ArrowUp`: moves focus to the previous enabled row, wrapping from the first to the last.
- `Home`: moves focus to the first enabled row.
- `End`: moves focus to the last enabled row.
- `TypeAhead`: typing a character moves focus to the next enabled row whose label starts with it; characters typed in rapid succession match on the accumulated string.
<!-- @keys end -->

**The split is the view's one primary action.** The default emphasis is `arena-emphasis-primary`, and a view holds one. Write `class="arena-emphasis-secondary"` or `class="arena-emphasis-ghost"` on any other split.

**Two names, both required.** `label` names the group of both halves, and `menuLabel` names the caret. A blank one throws. The primary half is named by its content.

**Two tab stops, primary then caret.** Enter and Space on the caret open the menu with focus on its first entry. Escape closes it and returns focus to the caret. Inside the menu the arrows move between enabled rows and wrap, and Home and End go to the first and the last row. Typing a character moves to the next row whose label starts with it. A disabled row is skipped, Tab closes the menu, and a header names the rows under it. A press on the primary half while the menu is open closes the menu and runs the primary action.

**`loading` blocks the primary half only.** The spinner replaces the leading icon, and the caret stays usable. `disabled` blocks both halves. `activate` never fires while either holds. A caret press opens the menu, reaches the page as a native click, and reports no `activate`.

**`align` measures from the whole split.** `end`, the default, lines the panel up with the caret's outer edge. `start` lines it up with the primary half's outer edge.

**`select` carries the whole item.** A disabled entry reports nothing, and a divider or a header cannot be activated.

**`destructive` draws the danger outline on both halves.** Danger is never filled.

**Don't**
- Don't wrap an `arena-button` and an `arena-menu` to get this look, because the joint is not reachable from a class.
- Don't add a second primary split to a view, or ask for a filled danger half.
- Don't pass a node as the caret or as a name. The glyph is Arena's, and the names are strings.
- Don't put submenus, forms or focusable content in the menu. `arena-menu` refuses them.
- Don't make it a toolbar, or add a roving tab stop between the halves.
- Don't leave the caret unnamed. `menuLabel` is required.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
