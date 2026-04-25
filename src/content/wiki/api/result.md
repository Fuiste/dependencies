---
title: Result
description: Public Result APIs for success and failure values.
section: API
navTitle: Result
order: 230
---

# Result

`Result` is the small tagged union used by the build APIs and accepted by dependency constructors.

```ts
import { Result } from '@fuiste/dependencies'
```

## Constructors

```ts
const success = Result.ok(42)
const failure = Result.err('nope')
```

## Guards

```ts
if (Result.isOk(result)) {
  result.value
}

if (Result.isErr(result)) {
  result.error
}
```

`Result.isResult(value)` checks whether an unknown value has an `ok` or `err` tag.

## Mapping

```ts
const next = Result.map(result, (value) => value + 1)
const normalized = Result.mapError(result, (error) => String(error))
```

## Matching

```ts
const message = Result.match(result, {
  ok: (value) => `value: ${value}`,
  err: (error) => `error: ${error}`,
})
```

There is no secret monad transformer stack hiding behind the couch. It is just a tagged union with a few helpers.
