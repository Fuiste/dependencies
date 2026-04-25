---
title: Scope
description: Public Scope APIs for registering and closing finalizers.
section: API
navTitle: Scope
order: 240
---

# Scope

`Scope` tracks finalizers for scoped dependencies.

```ts
import { Scope } from '@fuiste/dependencies'
```

## Create

```ts
const scope = Scope.make()
```

## Add Finalizers

```ts
Scope.addFinalizer(scope, async () => {
  await release()
})
```

Normally `Dependency.scoped` registers finalizers for you. Manual finalizers are useful in adapters or tests.

## Close

```ts
await Scope.close(scope)
```

Finalizers run in reverse registration order. Closing an already closed scope is a no-op.

If one finalizer fails, `close` throws that error. If several fail, it throws an aggregate `Error` with an `errors` property.

## Runtime Check

```ts
Scope.isScope(value)
```

Use it when accepting unknown values at a boundary.
