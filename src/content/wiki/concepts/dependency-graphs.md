---
title: Dependency Graphs
description: How dependency recipes compose, merge, provide, and override services.
section: Concepts
navTitle: Dependency Graphs
order: 120
---

# Dependency Graphs

A `Dependency` is a value that describes how to construct services. It records what it provides, what it requires, and what errors its construction may return.

```ts
const Logger = Context.Tag<{ log: (message: string) => void }>('graph/logger')

const logger = Dependency.sync(Logger, () => ({
  log: (message) => console.log(message),
}))
```

## Constructors

Use the constructor that matches the kind of work being described.

| Constructor   | Use it for                                     |
| ------------- | ---------------------------------------------- |
| `succeed`     | An already constructed service.                |
| `sync`        | Synchronous construction from a context.       |
| `async`       | Promise-based construction from a context.     |
| `scoped`      | Construction that must register a finalizer.   |
| `fromContext` | Turning an existing context into a dependency. |

`sync`, `async`, and `scoped` can return either a raw service value or a `Result`.

## Composition

Use `compose(left, right)` when `right` needs outputs from `left`.

```ts
const graph = compose(config, compose(logger, app))
```

The resulting dependency keeps the outputs of both sides and removes requirements satisfied by the left side.

Use `merge(a, b)` when dependencies are independent and can build concurrently.

```ts
const infrastructure = merge(clock, random, logger)
```

`merge` is strict about duplicate output tags. That is a feature. Silent service replacement is how configuration bugs get tenure.

## Providing Requirements

Use `provide(self, source)` to satisfy requirements without exposing the source outputs as outputs of the final graph.

```ts
const runnableApp = provide(app, liveDatabase)
```

The source can be another dependency or an existing `Context`.

## Overrides

Use `override(live, test)` when one dependency should replace or supplement another.

```ts
const testGraph = override(liveApp, inMemoryDatabase)
```

The test dependency is evaluated first, feeds the live graph, and wins for duplicate output tags in the final context.
