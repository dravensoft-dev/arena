Arena menu, a dropdown of actions hanging off a trigger the consumer draws. Standalone,
`OnPush`, signal I/O. The host wraps the trigger and nothing else; the panel lives in a
`@angular/cdk/overlay` pane on `document.body`.

That is the whole reason for the overlay: a menu's canonical home is an overflow row in a table
or a card, and an absolutely-positioned panel is clipped by the first `overflow: hidden`
ancestor. Arena uses the CDK for **position only**: the roles, the keys and the focus are
Arena's. The app must import `frameworks/angular/theme/arena-cdk.css` once, or the panel renders
unpositioned.

```html
<arena-menu [items]="rowActions" align="end" (select)="run($event)">
  <arena-icon-button trigger icon="ph-bold ph-dots-three-vertical" label="More actions" />
</arena-menu>
```

<!-- @api GENERATED from contracts/api/components/ArenaMenu.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `trigger*` | slot |  |  | The element that opens the menu. The consumer draws it -- an ArenaIconButton with ph-dots-three-vertical, a secondary ArenaButton -- so it is a slot, and it carries its own accessible name. |
| `items*` | array | `readonly ArenaMenuItem[]` |  | The entries, in order: activatable rows, dividers and group headers. |
| `align` | enum | `ArenaMenuAlign` | `"start"` | Which edge of the trigger the panel lines up with. |
| `select` | event | `ArenaMenuItem` |  | An entry was activated; carries the whole item. A disabled entry reports nothing, and a divider or a header cannot be activated at all. |

<!-- @api end -->

```ts
protected readonly rowActions: ArenaMenuItem[] = [
  { header: 'Build 482' },
  { label: 'Promote', icon: 'ph-bold ph-rocket-launch', shortcut: 'P' },
  { divider: true },
  { label: 'Delete', destructive: true },
];
```

`trigger` is a **projected slot**, marked with the bare `trigger` attribute, because the consumer
owns what the control looks like and what it is called. Arena writes `aria-haspopup="menu"` and
`aria-expanded` onto it, onto the **focusable element**, resolved by search rather than by
taking the host's first child. That distinction is load-bearing: an `<arena-button>` is
`display: contents`, so it is neither focusable nor in the accessibility tree, and the attributes
on it would reach nobody. It also stops its own native click, so the activation is bound to the
resolved control directly and never to the host.

Enter and Space are intercepted on the trigger and `preventDefault()`ed, so the platform does not
also synthesize a click and open the menu twice. Escape closes and returns focus to the trigger;
a pointer press outside the host **and** outside the pane closes without moving focus. Opening
moves focus to the first enabled row.

`select` carries the **whole item**, not a key, since `ArenaMenuItem` deliberately has no `id`. A divider
and a header are not rows at all and render no `menuitem`; a disabled row renders one and reports
nothing.

**Do / Don't**
- **Do** mark exactly one element with `trigger`, and one that is or contains a focusable
  control. Arena has nothing to hang the menu on otherwise.
- **Do** put the marker on the element `arena-menu` itself receives. Wrapping the control in
  another Arena component, an `arena-tooltip`, say, means the marker goes on the **wrapper**,
  since `<ng-content select="[trigger]">` matches what is projected and not what is nested
  inside it. The focusable control is still found by search, so the attributes land in the right
  place either way; what a misplaced marker loses is the projection, and the menu then renders no
  trigger at all.
- **Do** put destructive entries last, behind a `divider`. `destructive: true` draws the row in
  the danger ink and keeps it **outline**: a menu row is never a filled danger surface.
- **The trigger must be a control, not a picture of one.** An `arena-avatar`, a `<span>` or anything else that takes no focus receives the listeners and answers no key, so the menu
  opens on a pointer and a reader on a keyboard never reaches it. Arena reports that once at
  runtime; project an `arena-icon-button`, an `arena-button`, or your own element carrying a
  button role and a tabindex.
- **Do** reach for `align="end"` when the trigger sits at the right edge of its row, so the panel
  hangs inward instead of off the page. The CDK will flip it above the trigger near the bottom of
  the viewport on its own.
- **Don't** use `shortcut` expecting Arena to bind the key. It is display only, and the contract
  says so; the host binds it or nothing does.
- **Don't** put a form, a submenu or anything focusable beyond the rows into `items`. `ArenaMenuItem`
  is three shapes and none of them projects content; a menu that needs more is a dialog.

**By hand, in real Chromium**: none of this is provable in happy-dom, which has no layout and no
platform activation. Run `bun run demos` and open
`/frameworks/angular/components/navigation/arena-menu/ArenaMenu.demo.generated.html`:
- The panel escapes an `overflow: hidden` ancestor and a scroll container, and repositions while
  that container scrolls.
- Near the bottom of the viewport it flips above its trigger; `align="end"` hangs it from the
  trigger's right edge.
- One Enter opens it **once**, and one Space does too; the double-open is exactly what the
  `preventDefault` is there to stop, and only a browser synthesizes the click that would cause
  it.
- A menu opened from inside an `arena-dialog` paints above the panel, and a tooltip on a row
  paints above the menu.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw hex or a bare `16px`, and never wrap it in your router's own link. The rest of the rules, and the voice they answer to, are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
