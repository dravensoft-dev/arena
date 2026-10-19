A small panel a trigger opens, holding content of your own: a filter form with its Apply button, a pair of dates, a paragraph that explains a figure. The page behind it stays usable. Don't confuse it with `ArenaMenu` (a list of actions), `ArenaTooltip` (a description on hover or focus) or `ArenaDialog` (a modal that takes the whole interaction).

```tsx
const [open, setOpen] = useState(false);

<ArenaPopover label="Filters" open={open} onOpenChange={setOpen}
  trigger={<ArenaButton className="arena-emphasis-secondary">Filters</ArenaButton>}>
  <ArenaInput label="Branch" value={branch} onChange={setBranch} />
  <ArenaButton onClick={() => { apply(branch); setOpen(false); }}>Apply</ArenaButton>
</ArenaPopover>
```

<!-- @api GENERATED from contracts/api/components/ArenaPopover.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `trigger*` | slot |  |  | The control that opens the panel. The consumer draws it -- a secondary ArenaButton, an ArenaIconButton -- so it is a slot, and it carries its own accessible name. The slot holds one element that takes focus. |
| `children*` | slot |  |  | What the panel holds: a short form, a pair of fields, a paragraph. The content fills the panel and never replaces it: the surface, its padding and its edge are Arena's. |
| `label*` | primitive | `string` |  | Names the panel for assistive technology: what it holds, not that it is a panel. Required, and guarded at runtime: a dialog with no accessible name is announced unlabelled, and the trigger's own name says what opens it, never what the panel is for. "Filters", not "Popover". |
| `open` | primitive | `boolean` | `false` | Whether the panel is shown. The consumer owns it: the component asks to change it through openChange and never changes it by itself, so content inside the panel can close it, an Apply button included. |
| `align` | enum | `ArenaMenuAlign` | `"start"` | Which edge of the trigger the panel lines up with. |
| `onOpenChange` | event | `boolean` |  | The panel asks to be shown or hidden, carrying the state it asks for. The trigger was pressed, Escape was pressed while it was the topmost panel, a press landed outside it, or Tab left it. The panel moves only when open does. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`fill`](../../../../VOCABULARY.md#fill): `arena-fill`, `arena-fit` (default). Write one as `className="arena-fill"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`dialog-nonmodal`).
<!-- @keys end -->

**`open` is yours.** The popover never opens or closes by itself. A press on the trigger, Escape, a press outside and Tab out of the panel each report `onOpenChange` with the state they ask for. The panel moves when `open` does, so an Apply button inside can close it.

**Focus goes in and comes back.** Opening moves focus to the first control in the panel, or to the panel itself when it holds none. Escape, and Tab from the last control or Shift+Tab from the first, close the panel and return focus to the trigger. A press outside closes it and leaves focus where the press put it. Nothing is trapped and nothing behind the panel goes inert.

**Escape closes the topmost panel and nothing under it.** A menu or a tooltip opened inside the popover closes first, and the next Escape closes the popover. A popover inside an `ArenaDialog` closes alone, and the dialog stays.

**The panel escapes its container.** The panel opens in the top layer, so no `overflow: hidden` or transformed ancestor clips it. The top layer sits above every other layer, an open dialog and the toast stack included. The panel opens below its trigger and flips above when the room below is too small and the room above larger. The panel stays inside the viewport and follows its trigger on scroll. The panel takes its content's width, up to 92% of the viewport.

**A server render draws the trigger alone.** The panel is placed by script, so it mounts once the page has hydrated, even when `open` starts true.

**The server render carries the popup state.** An `ArenaButton` or `ArenaIconButton` trigger renders `aria-haspopup` and `aria-expanded` before hydration.

**Do / Don't**
- The trigger must have an accessible name, and `label` names the panel: "Filters", not "Popover".
- **The trigger must be a control, not a picture of one.** Pass an `ArenaButton`, an `ArenaIconButton`, or your own element carrying a button role and a tabindex; Arena reports anything else once at runtime.
- Keep one primary button in the panel, and give it the action the panel exists for.
- Don't use it as a menu of actions: that is `ArenaMenu`. Don't open it on hover: a hover-only panel is unreachable from a keyboard, and a description on hover is `ArenaTooltip`.
- Don't make it modal and don't nest a popover in a popover. A menu or a select inside it is fine.

**Check by hand** what a suite cannot see, having no layout. Scroll the page with the panel open and see the panel follow its trigger. Open one from inside a dialog and see the panel above the dialog.

To fill a row, put `className="arena-fill"` on the popover or on a container above it. The trigger is not a boundary, so the class reaches the control inside and both take the row.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
