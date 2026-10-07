# Using the contracts package

What does `@dravensoft/arena-contracts` hold? How do I read a design value, a component statement or a behaviour pattern from it? How do I version it? Read this when you write a platform target other than React or Angular, or when you generate a surface from Arena's values.

If you build a screen with Arena on the web, this is not the package you want. `@dravensoft/arena-react` and `@dravensoft/arena-angular` carry the components and the compiled stylesheet. Install the contracts package when you write the layer itself.

## What arrives

```
arena.contracts.json          every path below, sorted, with the version that produced them
contracts/design/*.json       one file per group: palette.<polarity>, typography, spacing, density.<name>,
                              effects, layering, chart, icon, component, behaviour (delays and
                              limits) and roles (the style kernel's questions)
contracts/api/components/*    one capability statement per component, in neutral member forms
contracts/api/types/*         the shared enums and objects those members take
contracts/behaviour/*.json    one accessibility pattern per file, cited to its source
```

`arena.contracts.json` is the entry point and the manifest at once. Read it first. The manifest lists what the installed version holds. A generator iterates that list and never globs a directory and hopes.

The package holds no code, no stylesheet and no dependency. Nothing in it assumes a browser is reading. Values are strict [DTCG 2025.10](https://tr.designtokens.org/format/).

## How do I read a design value?

Every design value is a DTCG token. A dimension is `{ "value": 16, "unit": "px" }`, and the unit is present even at zero. A colour is a structured sRGB object and never a hex string. A duration is milliseconds. An easing is four numbers. Nothing is a CSS string, and there is no CSS in the package at all.

```json
{
  "$value": { "value": 48, "unit": "px" },
  "$description": "48px clears WCAG 2.5.8's enhanced 44px target, which the 40px base does not"
}
```

A target decides some things for itself, because a value and a unit cannot say them.

- **What the reader's text setting does to a value.** Every dimension declares it as `$extensions["com.dravensoft.arena"].userScale`. The set is closed. `scales` grows with the platform's text scale. `follows` is a multiplier that scales for free. `fixed` stays put while the box around it grows. A group declares for the leaves under it, and a leaf overrides its group.
- **How a composed value is composed.** Runtime colour derivations, font loading and the device's safe-area insets are held nowhere in this package. None of them has a value until there is a device. What is here is what they compose from.
- **The one type that is not DTCG's.** `keyword` is a single bare word carrying the closed set it may take, in the same extension key. A target maps it by hand, since it inherits no DTCG transform.

## How do I read a component contract?

An API contract states the members a component presents, under neutral names. The contract says nothing about the syntax a platform binds them with. A slot is a slot whether the platform spells it as a child, a projection or a builder.

A behaviour contract states what a kind of component must **do**. Such a contract names the role the component carries, the keys it answers, where focus goes and what dismisses it. Each contract cites the source it was adopted from, mostly the [WAI-ARIA Authoring Practices Guide](https://www.w3.org/WAI/ARIA/apg/patterns/). A pattern that requires a role names that role in an `element` field beside the prose. A target applies the role without parsing a sentence.

**A requirement a browser meets through an element's own semantics is an explicit obligation everywhere else.** A native `<button>` answers a role, two keys and a disabled state while the component asserts nothing. A platform with no such mapping owes every one of them by hand. Know that asymmetry before you implement a pattern from this package.

Two patterns carry no requirements. `none` is for a component a user cannot act on. `absent` is for a component a layer does not ship at all. Both exist to be declared and never implemented.

## How do I version the contracts package?

The version is Arena's own. The contract levels move with the libraries built on them. A change to what a member is called, or to what a pattern requires, is a breaking change and arrives in a major.

Pin an exact version and raise it deliberately. A generator that follows a range emits a different surface without anybody asking it to.
