Arena popover, a small panel a trigger opens, holding content of the consumer's own. A filter form with its Apply button, a pair of dates or a paragraph that explains a figure is what it holds. Standalone, `OnPush`, signal I/O. The host wraps the trigger and nothing else; the panel lives in a `@angular/cdk/overlay` pane on `document.body`, so an `overflow: hidden` ancestor does not clip it. The app must import `@dravensoft/arena-angular/css/arena-cdk.css` once, or the panel renders unpositioned. Don't confuse it with `arena-menu` (a list of actions), `arena-tooltip` (a description on hover or focus) or `arena-dialog` (a modal that takes the whole interaction).

```html
<arena-popover label="Filters" [open]="filtersOpen()" (openChange)="filtersOpen.set($event)">
  <arena-button trigger class="arena-emphasis-secondary">Filters</arena-button>
  <arena-input label="Branch" [value]="branch()" (change)="branch.set($event)" />
  <arena-button (click)="apply(); filtersOpen.set(false)">Apply</arena-button>
</arena-popover>
```

<!-- @api GENERATED from contracts/api/components/ArenaPopover.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `trigger*` | slot |  |  | The control that opens the panel. The consumer draws it -- a secondary ArenaButton, an ArenaIconButton -- so it is a slot, and it carries its own accessible name. The slot holds one element that takes focus. |
| `content*` | slot |  |  | What the panel holds: a short form, a pair of fields, a paragraph. The content fills the panel and never replaces it: the surface, its padding and its edge are Arena's. |
| `label*` | primitive | `string` |  | Names the panel for assistive technology: what it holds, not that it is a panel. Required, and guarded at runtime: a dialog with no accessible name is announced unlabelled, and the trigger's own name says what opens it, never what the panel is for. "Filters", not "Popover". |
| `open` | primitive | `boolean` | `false` | Whether the panel is shown. The consumer owns it: the component asks to change it through openChange and never changes it by itself, so content inside the panel can close it, an Apply button included. |
| `align` | enum | `ArenaMenuAlign` | `"start"` | Which edge of the trigger the panel lines up with. |
| `openChange` | event | `boolean` |  | The panel asks to be shown or hidden, carrying the state it asks for. The trigger was pressed, Escape was pressed while it was the topmost panel, a press landed outside it, or Tab left it. The panel moves only when open does. |

<!-- @api end -->

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers** [`fill`](../../../../VOCABULARY.md#fill): `arena-fill`, `arena-fit` (default). Write one as `class="arena-fill"` on the component, or on a container whose components should all take it.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys:** none (`dialog-nonmodal`).
<!-- @keys end -->

**`open` is yours.** The popover never opens or closes by itself. A press on the trigger, Escape, a press outside and Tab out of the panel each emit `openChange` with the state they ask for. The panel moves when `open` does, so an Apply button inside can close it.

`trigger` is a **projected slot**, marked with the bare `trigger` attribute. Arena writes `aria-haspopup="dialog"` and `aria-expanded` onto the **focusable element** it resolves inside the slot. While the panel is open it writes `aria-controls` there too. An `<arena-button>` is `display: contents`, so an attribute on the host reaches no reader.

**Focus goes in and comes back.** Opening moves focus to the first control in the panel, or to the panel itself when it holds none. The pane sits at the end of the document, so a panel that took no focus would be reached last. Escape, and Tab from the last control or Shift+Tab from the first, close the panel and return focus to the trigger. A press outside the trigger and outside every panel opened above this one closes it and leaves focus where the press put it. Nothing is trapped.

**Escape closes the topmost panel and nothing under it.** A menu or a tooltip opened inside the popover closes first, and the next Escape closes the popover. A popover inside an `arena-dialog` closes alone.

**Where it opens.** Below its trigger, above when the room below is too small and the room above larger, pushed inside the viewport, and following its trigger on scroll. The panel takes its content's width, up to 92% of the viewport. The CDK container sits under the toast layer, so a toast stays above an open popover.

**The content is constructed while the panel is closed.** The content is projected once, into a template the overlay attaches. A component inside it is built when the popover is, and keeps its state across openings. Don't put cost in a popover's content. A server render draws the trigger alone.

**The server render carries the popup state.** Before the page is interactive, the focusable element inside `trigger` carries `aria-haspopup="dialog"` and `aria-expanded="false"`.

**Do / Don't**
- The trigger must have an accessible name, and `label` names the panel: "Filters", not "Popover".
- **The trigger must be a control, not a picture of one.** Project an `arena-button`, an `arena-icon-button`, or your own element carrying a button role and a tabindex; Arena reports anything else once at runtime.
- Keep one primary button in the panel, and give it the action the panel exists for.
- Don't use it as a menu of actions: that is `arena-menu`. Don't open it on hover: a hover-only panel is unreachable from a keyboard.
- Don't make it modal and don't nest a popover in a popover. A menu or a select inside it is fine.

**Check by hand** what a suite cannot see, having no layout. Scroll the page with the panel open and see the panel follow its trigger. Open one from inside a dialog and see the panel above the dialog.

To fill a row, put `class="arena-fill"` on the popover or on a container above it. The trigger is not a boundary, so the class reaches the control inside and both take the row.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `class` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
