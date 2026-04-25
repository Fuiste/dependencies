---
title: Scoped Resources
description: Acquire resources with finalizers and release them deterministically.
section: Concepts
navTitle: Scoped Resources
order: 130
---

# Scoped Resources

`Dependency.scoped` is for services that need cleanup: database connections, subscriptions, temporary directories, workers, and anything else with a receipt from the side-effect store.

```ts
const Connection = Context.Tag<{ id: string }>('scope/connection')

const connection = Dependency.scoped(Connection, async () => ({
  service: { id: 'conn-1' },
  release: async () => {
    await closeConnection()
  },
}))
```

## Manual Scope

When calling `build` with scoped dependencies, pass an explicit scope.

```ts
const scope = Scope.make()
const built = await build(connection, { scope })

try {
  if (Result.isOk(built)) {
    Context.get(built.value, Connection).id
  }
} finally {
  await Scope.close(scope)
}
```

If a scoped dependency is built without a scope, construction fails with a `construction_failed` `BuildError`.

## Automatic Scope With `use`

`use` creates and closes the scope for you.

```ts
await use(connection, async (context) => {
  return Context.get(context, Connection).id
})
```

Finalizers run after the consumer completes. If the consumer throws, `use` still closes the scope and returns a `construction_failed` result.

## Finalizer Order

Finalizers close in last-in-first-out order.

That mirrors nested acquisition: if service B depends on service A, B should usually release before A. It is just stack discipline, the ancient technology that keeps us from summoning undefined behavior for sport.
