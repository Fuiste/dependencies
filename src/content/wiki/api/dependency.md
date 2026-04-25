---
title: Dependency
description: Public Dependency APIs for building and composing service recipes.
section: API
navTitle: Dependency
order: 220
---

# Dependency

The `Dependency` namespace contains constructors and graph combinators.

```ts
import {
  Context,
  Dependency,
  build,
  compose,
  merge,
  override,
  provide,
  use,
} from '@fuiste/dependencies'
```

## Constructors

```ts
const fixed = Dependency.succeed(Tag, service)
const syncDep = Dependency.sync(Tag, [OtherTag], (context) => service)
const asyncDep = Dependency.async(Tag, [OtherTag], async (context) => service)
const scopedDep = Dependency.scoped(Tag, [OtherTag], async (context) => ({
  service,
  release: async () => {},
}))
const fromExisting = Dependency.fromContext(context)
```

The requirements array is optional for `sync`, `async`, and `scoped`. Constructors may return raw values or `Result` values.

## Combinators

```ts
const graph = compose(config, app)
const parallel = merge(logger, clock, random)
const provided = provide(app, database)
const swapped = override(live, test)
```

`compose` carries both sides' outputs forward. `provide` satisfies requirements but only exposes the provided dependency's own outputs. `override` is the intentional replacement mechanism.

## Build

```ts
const result = await build(graph)
```

`build` returns `Result<Context, BuildError>`.

Scoped dependencies require:

```ts
const scope = Scope.make()
const result = await build(graph, { scope })
```

## Use

```ts
const result = await use(graph, async (context) => {
  return runApp(Context.get(context, App))
})
```

`use` builds the graph, passes the context to the consumer, closes the scope, and returns a `Result` for the consumer's value.

## Type Helpers

```ts
type Provides = Dependency.Provides<typeof graph>
type Requires = Dependency.Requires<typeof graph>
type Error = Dependency.Error<typeof graph>
```

These are useful when writing helpers that transform dependency graphs.
