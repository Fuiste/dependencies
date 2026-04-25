---
title: Build Errors
description: Public BuildError variants returned by build and use.
section: API
navTitle: Build Errors
order: 250
---

# Build Errors

`BuildError<E>` is the normalized error type returned by `build` and `use`.

```ts
import type { BuildError } from '@fuiste/dependencies'
```

## `missing_service`

```ts
type MissingServiceError = {
  readonly _tag: 'missing_service'
  readonly tag: Context.Tag.Any
  readonly path: readonly string[]
}
```

The graph required a service that was not present in the environment.

## `duplicate_service`

```ts
type DuplicateServiceError = {
  readonly _tag: 'duplicate_service'
  readonly tag: Context.Tag.Any
  readonly path: readonly string[]
}
```

Two outputs tried to define the same tag during strict merge.

## `circular_dependency`

```ts
type CircularDependencyError = {
  readonly _tag: 'circular_dependency'
  readonly dependency: string
  readonly path: readonly string[]
}
```

The evaluator encountered the same dependency under the same environment while it was already active.

## `construction_failed`

```ts
type ConstructionFailedError<E> = {
  readonly _tag: 'construction_failed'
  readonly dependency: string
  readonly path: readonly string[]
  readonly cause: 'error' | 'defect'
  readonly error?: E
  readonly defect?: unknown
}
```

`cause: 'error'` means a constructor returned `Result.err`. `cause: 'defect'` means something threw or rejected.
