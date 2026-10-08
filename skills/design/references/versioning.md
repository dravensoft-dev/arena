# What a version promises, and why a package's may differ from Arena's

Why is the latest version of `@dravensoft/arena-react` not the latest version of `@dravensoft/arena-angular`? Which version is Arena's? What does a version promise? Can two copies of Arena share an app? Which licence does Arena carry? Read this when you choose a range, plan an upgrade, or find two Arena packages at different versions.

## What does a version promise?

Every package follows semantic versioning, measured against what these references name. Only a major renames or removes a component, a member or an export [`exports.md`](./exports.md) names. A class of the vocabulary and a token move only in a major too, and so does a behaviour pattern that asks for more. A new role carries a default your root style plugin takes when silent on it, so a minor may add one. A minor adds anything else, and a patch changes none of it. A new component's classes take a name the build already refuses for a palette or a style plugin, so a minor never lands a class on one of yours. A minor may add a report the `arena` command prints. The scripts `arena init` writes name the rules and kinds that exist when it runs, so a new one is printed and holds nothing until you name it; see [`cli.md`](./cli.md#what-does---strict-hold). A symbol the references do not name carries no promise.

## Can two copies of Arena share an app?

No. One app installs one copy of its layer package. The stylesheet, its classes and the custom properties on `:root` belong to the whole document. So does the `arena-theme` storage key, and two copies overwrite each other in whatever order their sheets load. What a provider hands down, the locale or the themes, reaches only its own copy's components. Move the whole app to a new major at once. The build refuses a name the new version does not ship and says what it ships instead, and that list is the migration.

## Why might a package's latest version not match Arena's latest version?

A package is published only when something it carries has changed. Arena's version lives in one place. Every package is stamped from it when the package is assembled. Nobody versions a package by hand, so a published package never disagrees with the tag it was cut from.

What differs is which numbers exist for each package. Suppose a release changes the React layer and nothing in Angular. The React package is published at the new version. The Angular package keeps the version it has, because republishing would ship an identical tree under a new number. The next release that touches Angular goes to the version current by then. That release skips the one in between, and the skipped version never existed for that package.

The newest version of a package is the version of the last Arena release that changed it. A gap in the sequence records a release that left the package alone. Two packages at different versions are two packages that last changed at different times. All of them are built from the same tree.

Install the layer package and the contracts package at the versions you resolved, and pin them. [`contracts.md`](./contracts.md) says why the contracts package wants an exact version.

## Which licence does Arena carry?

MIT. The licence text is in the repository.
