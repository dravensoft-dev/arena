Guided in-product onboarding (H10). Complements `ArenaEmptyState`: presents features step by step the first time. Controlled: store `index` and whether it was already completed (e.g. in localStorage) so it isn't repeated.

```tsx
const [step, setStep] = useState(0);
<ArenaOnboarding open={showTour} index={step}
  onNext={() => setStep((s) => s + 1)}
  onBack={() => setStep((s) => s - 1)}
  onSkip={endTour} onDone={endTour}
  steps={[
    { eyebrow: 'Welcome', title: 'Your first deployment', body: 'From here you will deploy and roll back with one click.' },
    { title: 'Command palette', body: 'Press ⌘K to run any action without the mouse.' },
    { title: 'All set', body: 'You can reopen this guide from Help anytime.' },
  ]} />
```

<!-- @api GENERATED from contracts/api/components/ArenaOnboarding.json. Edit the contract, not this table. -->

**Members**, in contract order and under this layer's own names. `*` marks a required one.

| Member | Form | Type | Default | What it is |
|---|---|---|---|---|
| `open*` | primitive | `boolean` |  | Whether the tour is shown. Closed renders nothing, scrim included. |
| `steps*` | array | `readonly ArenaOnboardingStep[]` |  | The tour, in order. An empty tour renders nothing. |
| `index` | primitive | `number` | `0` | Which step is current. The host owns it and answers next/back. |
| `anchor` | object | `ArenaOnboardingAnchor` |  | Where to attach the coachmark, as the two viewport coordinates it positions from. Absent floats it bottom-right. |
| `onNext` | event |  |  | Next was activated on a step that is not the last. |
| `onBack` | event |  |  | Back was activated on a step that is not the first. |
| `onSkip` | event |  |  | Skip was activated, or the scrim was clicked. |
| `onDone` | event |  |  | The final step's confirming control was activated. |

<!-- @api end -->

**Behaviour.** The coachmark is a modal dialog and behaves like one. Opening moves focus to the first control inside it, Tab is trapped at both ends of that set, and closing restores focus to whatever had it before. **Escape dismisses through `onSkip`**, the same channel the scrim click uses, so Escape joins the mouse path rather than replacing it. There is no
separate "dismiss" callback to wire.

**The accessible name is a fallback chain**, `step.title ?? step.eyebrow ?? "Step N of M"`,
**A caller who wants a useful name still supplies a
step `title`**: a positional name is a floor, not a substitute. The progress dots inside the panel carry a name of their own, `Progress: step N of M`. An untitled step announces the dialog and its dots as two different things, rather than as the same string twice.

**Checked in Chromium by hand**, because native sequential focus navigation is the browser's and no suite in this repo drives one. With the tour open, Tab repeatedly through Back, Skip and Next, and confirm focus never leaves the coachmark. Then Shift+Tab back through it. The
boundary wraps at either end are covered by a render suite; the interior is this check.

**Do / Don't**
- Max 3–5 steps, and store that it was already completed so it isn't repeated.
- Don't block critical tasks after the tour: "Skip" must always be available.
- Give every step a `title` (or at least an `eyebrow`): without one the dialog names itself
  positionally and tells a screen-reader user nothing about what it is showing them.

## Verifying the focus trap by hand

A suite proves the boundary wrap: Arena's own `.focus()` call. A suite cannot prove the **interior**, meaning that Tab from a middle control reaches the next one. The interior is the browser's native sequential focus navigation, which happy-dom does not implement. A
browser-driven gate stays refused, so this list is the check.

Serve the tree with `bun run demos` and open
`frameworks/react/components/feedback/arena-onboarding/ArenaOnboarding.demo.generated.html`.

**Start by pressing Escape.** That card renders with the tour already open, because a specimen has to show something. Pressing "Start tour" while `open` is already `true` correctly does nothing, because the hook keys its effect on `open` changing. Skipping
this step measures the closed-to-open transition that never happened.

Then, with the tour closed:

1. **Tab to "Start tour" and press Enter.** Focus must land on **Skip**, the first
   focusable in the coachmark. On the first step there is no Back button, so Skip is
   genuinely first; on a middle step it is Back.
2. **Tab once.** Focus moves to **Next**. Native navigation, not Arena's.
3. **Tab again.** Focus wraps back to Skip.
4. **Shift+Tab.** Focus wraps from Skip to Next.
5. **Escape.** The tour closes through `onSkip`, the same channel the Skip button and the scrim click use. One channel is how `dialog-modal`'s `keyboard.Escape` is met without adding a member, and focus returns to "Start tour".

Driving this through CDP: Enter must be `keyDown` with `text: '\r'`; a `rawKeyDown`
does not activate a button.

**Words.** `onboardingBack`, `onboardingSkip`, `onboardingNext` and `onboardingDone` are the buttons. A step with no title and no eyebrow is named by `onboardingStep`, and the dots by `onboardingProgress`, both with `{current}` counting from one and `{total}` the number of steps. Each one is a field of the locale a consumer provides once, in English until one does.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component is not a styling surface, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena-to-prod --audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
