---
title: Managing Resources
description: Use scoped dependencies for acquire-use-release workflows.
section: Recipes
navTitle: Managing Resources
order: 330
---

# Managing Resources

For resources with lifetimes, model acquisition and release together.

```ts
const TempDirectory = Context.Tag<{ path: string }>('temp-dir')

const tempDirectory = Dependency.scoped(TempDirectory, async () => {
  const path = await makeTempDirectory()

  return {
    service: { path },
    release: () => removeDirectory(path),
  }
})
```

## Prefer `use` For Short Programs

```ts
const result = await use(tempDirectory, async (context) => {
  const { path } = Context.get(context, TempDirectory)
  return writeReport(path)
})
```

The scope closes after the callback resolves or rejects.

## Use Manual Scope For Longer Lifetimes

```ts
const scope = Scope.make()
const built = await build(tempDirectory, { scope })

try {
  if (Result.isOk(built)) {
    await serve(Context.get(built.value, TempDirectory).path)
  }
} finally {
  await Scope.close(scope)
}
```

Manual scope is appropriate for servers, test suites, or anything whose lifetime is bigger than a single callback.
