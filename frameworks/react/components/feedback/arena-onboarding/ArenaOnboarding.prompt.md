Guided in-product onboarding. Complements `ArenaEmptyState`: presents features step by step the first time. Controlled: store `index` and whether it was already completed (e.g. in localStorage) so it isn't repeated.

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

<!-- @answers GENERATED from the vocabulary and the manifests. Edit a family or a manifest's answers, not this line. -->

**Answers.** No family of the [vocabulary](../../../../VOCABULARY.md) decides anything in this component's own box.

<!-- @answers end -->

<!-- @keys GENERATED from the binding. -->
**Keys**, from [`modal-focus`](../../../../../contracts/behaviour/modal-focus.json):
- `Escape`: close.
<!-- @keys end -->

**Behaviour.** The coachmark is a modal dialog and behaves like one. Opening moves focus
to the first control inside it, Tab is trapped at both ends of that set, and closing
restores focus to whatever had it before. Removing the tour while it is open counts as
closing it for focus, though the removal reports no `onSkip`. The rule holds only while
focus is inside the tour or nowhere and the element that opened it is still on the page.
**Escape dismisses through `onSkip`**, the same channel the scrim click uses, so Escape
joins the mouse path rather than replacing it. There is no separate "dismiss" callback to
wire.

**The accessible name is a fallback chain**, `step.title ?? step.eyebrow ?? "Step N of M"`,
**A caller who wants a useful name still supplies a
step `title`**: a positional name is a floor, not a substitute. The progress dots inside the panel carry a name of their own, `Progress: step N of M`. An untitled step announces the dialog and its dots as two different things, rather than as the same string twice.

Tab moves through Back, Skip and Next without focus leaving the coachmark, and Shift+Tab walks back through it, wrapping at either end. Opening the tour lands focus on the first focusable in the coachmark: Skip on the first step, which has no Back button, and Back on a later one. Escape closes the tour through `onSkip`, the same channel the Skip button and the scrim click use, and focus returns to the control that started it.

**Do / Don't**
- Max 3–5 steps, and store that it was already completed so it isn't repeated.
- Don't block critical tasks after the tour: "Skip" must always be available.
- Give every step a `title` (or at least an `eyebrow`): without one the dialog names itself
  positionally and tells a screen-reader user nothing about what it is showing them.

**Words.** `onboardingBack`, `onboardingSkip`, `onboardingNext` and `onboardingDone` are the buttons. A step with no title and no eyebrow is named by `onboardingStep`, and the dots by `onboardingProgress`, both with `{current}` counting from one and `{total}` the number of steps.

<!-- @rules GENERATED for every prompt from one source. Edit it there, not here. -->

**The rules of the language hold in the code you write from this page.** An Arena component takes a class of the vocabulary and no other, so put no `className` of your own on it. Read every value through its token, never a raw colour and never a bare `16px`. Never wrap it in your router's own link. `arena audit` reports these three in your sources. The rest are in [`../../../../../skills/design/SKILL.md`](../../../../../skills/design/SKILL.md), which marks the ones it reports.

<!-- @rules end -->
