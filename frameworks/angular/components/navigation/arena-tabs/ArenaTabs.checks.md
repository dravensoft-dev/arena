# ArenaTabs by hand (Angular)

Serve the tree with `bun run demos`, open `/frameworks/angular/components/navigation/arena-tabs/ArenaTabs.demo.generated.html`, and check in a real browser:

- Tab into the strip once: the ring lands on the selected tab, and Tab again leaves the strip rather than walking the tabs.
- Tab from a tab reaches the panel rather than the next tab. happy-dom has no sequential focus navigation, so no suite asserts it.
- Left and Right walk the strip and wrap at both ends, and the panel below changes with them.
- The selected rule sits flush on the strip's own hairline rule rather than floating above it.
- The panel's top gap does not change when switching tabs, because the layout must not shift.
- Two strips on the page switch independently, which is the generated id base working.

The keyboard is asserted for real by the compliance suite in `frameworks/angular/components/navigation/arena-tabs/ArenaTabs.compliance.test.ts`, but the ink and the ring are not. The CDK reads the deprecated `event.keyCode`, so any suite dispatching a key at this component must set `keyCode`: happy-dom leaves it `0`, and a suite that sets only `key` asserts nothing and passes.
