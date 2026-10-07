# Arena's own words in your language

How do I translate the words Arena draws itself? Which words are those? What do `ArenaLocaleProvider`, `useArenaLocale`, `provideArenaLocale` and `ARENA_LOCALE` do? Does the locale switch at runtime? Read this when the product ships in a language other than English.

## Which words does Arena draw itself?

A component draws a few words of its own. Examples are a close button's name, `Today` on a calendar, a pager's arrows, a table's empty line and a chart's name. The onboarding step line is one too. The locale answers all of them.

The calendar also formats its dates in the `locale` the value carries. Hour labels keep a 24-hour clock whatever the locale says.

A chart's numbers are not words. Those numbers follow the chart's own `valueFormat.locale`.

## In what order does a word resolve?

A word resolves from the component's own member first. Your locale comes next. The English default comes last.

A field you leave out keeps its default, `ARENA_DEFAULT_LOCALE`. A `{name}` in a field is a value Arena fills. Your language may put it anywhere in the sentence.

## How do I set the locale in React?

Wrap the tree in `ArenaLocaleProvider`.

```tsx
<ArenaLocaleProvider value={{ locale: 'es-ES', calendarToday: 'Hoy', paginationPrevious: 'Anterior', paginationNext: 'Siguiente', onboardingStep: 'Paso {current} de {total}' }}>
  <App />
</ArenaLocaleProvider>
```

A tree with no provider reads `ARENA_DEFAULT_LOCALE`. `useArenaLocale` reads what a subtree was given. `arenaMergeLocale` is the merge the provider applies. The provider renders on a server and switches language on re-render.

## How do I set the locale in Angular?

Provide the locale at bootstrap.

```ts
bootstrapApplication(App, {
  providers: [provideArenaLocale({ locale: 'es-ES', calendarToday: 'Hoy', paginationPrevious: 'Anterior', paginationNext: 'Siguiente', onboardingStep: 'Paso {current} de {total}' })],
});
```

Inject `ARENA_LOCALE` to read what a subtree was given. `arenaMergeLocale` is the merge the provider applies. The value is fixed for the life of its injector, as `LOCALE_ID` is. Switching language means re-creating the subtree.
