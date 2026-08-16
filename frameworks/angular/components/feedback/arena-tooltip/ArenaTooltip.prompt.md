Arena tooltip, a short label revealed on pointer intent, bone over dark. Standalone, `OnPush`,
signal I/O. Wrap the element the tooltip describes; Arena draws the bubble and names it
from `label`.

The bubble is positioned by `@angular/cdk/overlay`, not by the wrapper, so it escapes an
`overflow: hidden` ancestor and stays anchored while the page scrolls. That is the one thing
Arena does not hand-roll here; focus and roles stay Arena's. The app must import
`frameworks/angular/theme/arena-cdk.css` once, or the bubble renders unpositioned.

```html
<arena-tooltip label="Everything shipped in the last 30 days">
  <button type="button">Deployments</button>
</arena-tooltip>

<arena-tooltip label="95th percentile response time">
  <span tabindex="0">p95</span>
</arena-tooltip>
```

<!-- @api GENERATED from contracts/api/components/ArenaTooltip.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `label*` | primitive | `string` |  | The bubble's text. Arena draws the bubble; the consumer names it. |
| `content*` | slot |  |  | The element the tooltip describes and attaches to. |

<!-- @api end -->

**Do / Don't**
- Project exactly **one** element, and one that can take an attribute. Arena writes
  `aria-describedby` onto the wrapper's first element child, so a bare string or several
  siblings leave the bubble naming nothing. The trigger's own `aria-describedby` is preserved:
  the bubble's id is appended on reveal and removed on withdrawal.
- Project something **focusable**. A tooltip on an unfocusable element is unreachable without a
  pointer, give it `tabindex="0"` if it is not natively focusable, as the `p95` example does.
- A pointer waits `--delay-open` (400 ms) before the bubble appears and `--delay-close` (120 ms)
  before it withdraws, so crossing a toolbar reveals nothing. **Keyboard focus reveals
  immediately**, and that asymmetry is deliberate: a delay on focus reads as an unresponsive
  control. `contracts/design/behaviour.json` states the rule; do not route focus through the
  delays.
- Escape dismisses, and the listener is on the document rather than the host, because a
  pointer-invoked tooltip leaves focus somewhere else entirely.
- Don't put interactive content in a tooltip. It never receives focus, so a button inside it is
  unreachable: that is `focus.never` in the pattern, not a limitation of this implementation.
  Reach for `arena-menu` or a dialog instead.
- Don't use a tooltip to carry information the user needs to complete a task. It is
  supplementary by definition; a field's own `hint` is where a requirement belongs.
- Don't set `label` to the trigger's own text. `aria-describedby` is read **in addition** to the
  name, so a bubble repeating the label just says everything twice.

**By hand, in real Chromium**: none of these is provable in happy-dom. Run `bun run demos` and
open `/frameworks/angular/components/feedback/arena-tooltip/ArenaTooltip.demo.generated.html`, which lays out one
section per item below:
- The bubble sits centred above the trigger with a `--sp-2` gap, and **flips below** when the
  trigger is near the top of the viewport.
- It escapes a scrolling `overflow: hidden` container and stays anchored while that container
  scrolls, which is the whole reason for the overlay.
- The reveal genuinely waits on pointer rest and is instant on Tab; travelling from the trigger
  onto the bubble does not dismiss it.
- Layering: a tooltip on an `arena-menu` item, and one inside an open dialog, both land above
  what they annotate.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page, and no gate reads your application to enforce them.** An Arena component is not a styling surface: put no `class` of your own on it, read every value through its token rather than a raw colour or a bare `16px`, and never wrap it in your router's own link. The rest of the rules are in [`../../../../../SKILL.md`](../../../../../SKILL.md).

<!-- @rules end -->
