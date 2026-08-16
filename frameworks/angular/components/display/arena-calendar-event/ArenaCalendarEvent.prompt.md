One event on an `arena-calendar`'s schedule. It is content of a calendar and nothing else: its top, its height, the column it shares with its overlaps, its ramp colour and its place in the grid's keyboard order all come from the calendar it pulls them out of. **Outside one it throws `NG0201`**: `ArenaCalendarState` is not optional, and an unplaced chip is not a thing worth rendering.

```html
<arena-calendar timeZone="Europe/Madrid">
  @for (c of classes(); track c.id) {
    <arena-calendar-event [id]="c.id" [title]="c.name" [start]="c.start" [end]="c.end"
                          [colorId]="c.room" (click)="open(c)" />
  }
</arena-calendar>
```

<!-- @api GENERATED from contracts/api/components/ArenaCalendarEvent.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `id*` | primitive | `string` |  | Stable identity, so a host can switch on it rather than on the title. |
| `title*` | primitive | `string` |  | What the chip reads. |
| `start*` | primitive | `string` |  | ISO datetime the event begins. |
| `end*` | primitive | `string` |  | ISO datetime the event ends. |
| `colorId` | enum | `ArenaCatSlot` |  | Identity colour. Give the same entity the same slot everywhere and it keeps its colour across views. |
| `interactive` | primitive | `boolean` | `false` | Whether the chip can be activated. A boolean rather than "is `click` bound?", because Arena never derives what it draws from what a consumer listens for, and the same member `ArenaTableRow.interactive` is for the same reason. An interactive chip is a <button> a keyboard user reaches with Enter from the hour cell it overlaps; a non-interactive one draws the same chip with no role and no activation, so a read-only schedule announces events rather than a screenful of buttons that do nothing. |
| `actionsEnabled` | primitive | `boolean` | `false` | Whether the chip shows its action button. A boolean rather than "is the actions slot filled?": Arena never derives what it draws from what a consumer listens for, because projected content is not inspectable in at least one platform, so gating the drawing on it is a divergence waiting to happen. |
| `actions` | slot |  |  | The action panel's content, revealed by the chip's action button. Rendered only while the panel is open, so a consumer's own controls never sit permanently in the grid's Tab sequence. |
| `disabled` | primitive | `boolean` | `false` | Whether the chip is drawn but cannot be activated: an event a consumer's rules lock, such as one already past or owned by someone else. It reflects through `aria-disabled` rather than the native `disabled` attribute, so the chip keeps its place in the grid's roving Tab sequence and is announced as unavailable instead of disappearing from it. With `interactive` false there is nothing to activate and the chip is inert already. |
| `click` | event |  |  | The chip was activated. No payload: the consumer wrote this element, so they already hold the event this is about. Never emitted while `disabled`. |

<!-- @api end -->

`id`, `title`, `start` and `end` are all required and **throw** when blank, `input.required` proves only that something was bound. `start` and `end` are ISO datetimes, read in the calendar's `timeZone` and never the reader's.

**`click` carries no payload, deliberately.** You wrote this element, so your handler already closes over the record it came from.

**`interactive` is what makes the chip a button, not `(click)`.** The shape cannot be derived from whether anything is subscribed, so activation is a member you declare, the same one `arena-table-row` carries. **Bind `interactive` alongside `(click)`, or the chip is inert**: a `<div>` with no role, nothing to activate and nothing to disable, which is what a read-only schedule wants.

**A `(click)` binding on `<arena-calendar-event>` is the DOM event, not the output.** Angular binds a native event name to the DOM even when the component declares an output of that name, so a click that bubbles out of an inert chip still reaches your handler. An interactive chip stops propagation before it can; an inert one does not, because it claims nothing and the click belongs to the day underneath it. Listen for activation on a chip you have declared `interactive`.

**An interactive chip is not a page-level tab stop, and that is on purpose.** The grid is one tab stop; Enter from the hour cell an event overlaps steps into the chip, Escape steps back out to the cell.

What "into the chip" means depends on the shape. A chip with no action panel *is* the button. A chip with one cannot be, a kebab nested inside a button is invalid HTML, so the chip is a `<div>`, the title and time move into a body `<button>` inside it, and that body is what Enter focuses. The focus target registered with the calendar has to follow that element; a target left pointing at the chip sends Enter on a paneled chip nowhere at all.

**The kebab is reachable by arrows rather than Tab.** With focus on a chip, `ArrowRight` steps to its kebab and `ArrowLeft` steps back. Tab has to *leave* a composite, and a tabbable kebab is precisely what would stop the calendar's grid being the single tab stop its `grid` binding claims. Activating the kebab opens the panel and moves focus into it; `Escape` closes the panel and returns focus to the kebab, and stops there rather than also returning focus to the hour cell.

**`actionsEnabled` draws a kebab; `[actions]` is what the panel behind it holds.**

```html
<arena-calendar-event [id]="c.id" [title]="c.name" [start]="c.start" [end]="c.end"
                      (click)="open(c)" actionsEnabled>
  <arena-button actions size="sm" variant="ghost" icon="ph-bold ph-pencil">Edit</arena-button>
  <arena-button actions size="sm" variant="ghost" icon="ph-bold ph-trash">Delete</arena-button>
</arena-calendar-event>
```

**The boolean is what draws the kebab, not the slot being filled**, and unlike the calendar's toolbar this slot needs no marker directive: `select="[actions]"` is a plain CSS selector, and only `contentChild` detection would need `ArenaActions` imported. `actionsEnabled` with nothing projected draws a kebab over an empty panel; that is a consumer mistake rather than a state Arena hides, and it is the same call `arena-alert`'s and `arena-toast`'s `dismissible` already record.

**The panel's content is in the tree only while the panel is open.** That is what keeps the grid at one tab stop. It also means the panel is not a place to keep state, it is created and destroyed with every open.

**Do**
- Give the same entity the same `colorId` everywhere it appears.
- Preformat the `title`. Arena does no locale formatting and no truncation beyond the chip's own ellipsis.
- Keep the panel to a couple of controls. It opens over the schedule at the chip's own width.
- Project `[actions]` whenever you set `actionsEnabled`. The two travel together.
- Reach for `disabled` when the event is drawn but must not be opened, one already past, or one owned by someone else. It reflects through `aria-disabled`, so the chip keeps its place in the grid's roving sequence and is announced as unavailable instead of disappearing from it, and `click` never fires while it is set.

**Don't**
- Don't project content into it other than `[actions]`. The title and the time line are the chip body, and Arena draws both.
- Don't render one outside an `arena-calendar`. It has no position of its own and will throw.
- Don't use `disabled` to make a chip inert. In this layer nothing does (see the divergence above), and `disabled` means "a button that announces it cannot be pressed right now", which reads differently to a screen reader.
- Don't reach past `colorId: 8`. There are eight ramp slots and they never cycle.
- Don't reach for `style` or `class` to place it. Its geometry is the calendar's, and a `class` on the host lands on an element that declares `display: contents`.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
