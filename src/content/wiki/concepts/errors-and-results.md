---
title: Errors And Results
description: How build failures are represented without throwing through normal control flow.
section: Concepts
navTitle: Errors And Results
order: 140
---

# Errors And Results

`build` and `use` return `Result` values. Expected construction failures do not throw through your program.

```ts
const built = await build(graph)

if (Result.isErr(built)) {
  console.error(built.error._tag)
}
```

## Result

`Result<A, E>` is deliberately small.

```ts
type Result<A, E> =
  | { readonly _tag: 'ok'; readonly value: A }
  | { readonly _tag: 'err'; readonly error: E }
```

Use `Result.isOk`, `Result.isErr`, `Result.map`, `Result.mapError`, and `Result.match` for boring control flow. Boring is underrated. Most production incidents are exciting enough already.

## BuildError

Build failures are normalized into four variants.

| Variant | Meaning |
| ------- | ------- |
| `missing_service` | A dependency required a tag absent from the build environment. |
| `duplicate_service` | Two built contexts tried to expose the same output tag. |
| `circular_dependency` | The evaluator detected a cycle through memoized construction. |
| `construction_failed` | A constructor returned `Result.err` or threw/rejected. |

`construction_failed` distinguishes typed errors from defects with a `cause` field:

```ts
if (error._tag === 'construction_failed') {
  if (error.cause === 'error') {
    console.error(error.error)
  } else {
    console.error(error.defect)
  }
}
```

## Paths

Every `BuildError` includes a `path` showing where construction was when the error happened.

Use it for diagnostics, logs, and test assertions. Do not parse it as a public protocol unless you enjoy making your future self mutter at a laptop.
