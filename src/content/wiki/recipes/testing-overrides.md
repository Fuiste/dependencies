---
title: Testing Overrides
description: Replace live services with test services without mutable containers.
section: Recipes
navTitle: Testing Overrides
order: 320
---

# Testing Overrides

Use `override` to replace requirements or outputs with test services.

```ts
const Repository = Context.Tag<{ find: (id: string) => Promise<string> }>(
  'repo',
)
const App = Context.Tag<{ load: (id: string) => Promise<string> }>('app')

const app = Dependency.sync(App, [Repository], (context) => ({
  load: (id) => Context.get(context, Repository).find(id),
}))

const inMemoryRepository = Dependency.succeed(Repository, {
  find: async (id) => `memory:${id}`,
})

const testGraph = override(app, inMemoryRepository)
```

Then build or use the graph in a test.

```ts
const built = await build(testGraph)

if (Result.isOk(built)) {
  await Context.get(built.value, App).load('1')
}
```

## Why Override Instead Of Merge

`merge` rejects duplicate output tags. `override` is the explicit "yes, replace this" operation.

That distinction matters. The type system can help with many things, but it cannot tell whether two loggers with the same tag are an accident or a bit. Make the replacement visible.
