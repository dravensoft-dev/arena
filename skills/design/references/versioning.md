# Why a package version may differ from Arena's, and the licence

Why is the latest version of `@dravensoft/arena-react` not the latest version of `@dravensoft/arena-angular`? Which version is Arena's? Which licence does Arena carry? Read this when two Arena packages in a project sit at different versions.

## Why might a package's latest version not match Arena's latest version?

A package is published only when something it carries has changed. Arena's version lives in one place. Every package is stamped from it when the package is assembled. Nobody versions a package by hand, so a published package never disagrees with the tag it was cut from.

What differs is which numbers exist for each package. Suppose a release changes the React layer and nothing in Angular. The React package is published at the new version. The Angular package keeps the version it has, because republishing would ship an identical tree under a new number. The next release that touches Angular goes to the version current by then. That release skips the one in between, and the skipped version never existed for that package.

The newest version of a package is the version of the last Arena release that changed it. A gap in the sequence records a release that left the package alone. Two packages at different versions are two packages that last changed at different times. All of them are built from the same tree.

Install the layer package and the contracts package at the versions you resolved, and pin them. [`contracts.md`](./contracts.md) says why the contracts package wants an exact version.

## Which licence does Arena carry?

MIT. The licence text is in the repository.
