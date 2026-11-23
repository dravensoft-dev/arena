# ArenaSideNavCollapsible by hand (React)

Serve the tree with `bun run demos`, open `/frameworks/react/components/navigation/arena-side-nav-collapsible/ArenaSideNavCollapsible.demo.generated.html`, and check in a real browser.

**Two halves of this component are not machine-checkable, and neither is unverified because it is unimportant.** happy-dom does not synthesise a click from a keydown on a native button. No suite can prove Enter and Space actually toggle the region. What is proved instead is that the trigger is a native `<button type="button">`, that no handler of ours cancels either key, and that a click toggles. Together those make the platform's activation the only remaining link. And happy-dom has no sequential focus navigation at all, so a Tab keypress plus `document.activeElement` would pass identically against a correct implementation and against none. That suite asserts the structural half instead: the links sit inside `[hidden]` while collapsed, and nothing adds a `tabindex`.

Check all of:

1. The `Deployments` group is **already open** on first paint. `active="prod"` names an
   item inside it, so this is the auto-expand, not a `defaultExpanded`. A probe testing
   an *opening* transition has to close it first.
2. Click into the page, Tab to the `Deployments` trigger, and press **Enter**. The region
   closes: the caret flips from `ph-caret-down` to `ph-caret-right`, `aria-expanded` goes
   to `false`, and the two links vanish. Press Enter again and all three reverse. Check
   the caret and `aria-expanded` *together*, because a caret driven by a second piece of state
   could disagree with the attribute and only the eye would catch it.
3. Repeat step 2 with **Space**. The layer beside this one behaves identically. Space activates a native
   button on key*up* rather than key*down*, so a handler that intercepted only one of the
   two keys would show up here and nowhere else.
4. With the group **expanded**, Tab forward from the trigger. Focus must go
   `Deployments` -> `Production` -> `Staging` -> `Settings` -> and only then leave the
   bar. Reaching something behind the sidebar before `Settings` means focus escaped.
5. With the group **collapsed**, Tab forward from the trigger. Focus must go
   `Deployments` -> `Settings` directly, skipping both hidden links. Landing on
   `Production` while it is invisible is the defect this step exists for.
6. The indent compounds with depth, and it is real measurable padding rather than a margin trick. The root item sits at 12px, the trigger one step in at 24px, and the items inside it at 36px. Each step is one `pad-row-indent`.

All six hold in Chromium. Steps 2 through 5 can be driven through CDP with real `Input.dispatchKeyEvent` key events, and the observed sequences are the ones written above.
