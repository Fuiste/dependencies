---
title: Context
description: Public Context APIs for tags, immutable service maps, and service lookup.
section: API
navTitle: Context
order: 210
---

# Context

The `Context` namespace contains tag constructors and immutable service-map operations.

```ts
import { Context } from '@fuiste/dependencies'
```

## `Context.Tag`

Creates a stable typed service identifier.

```ts
const Logger = Context.Tag<{ log: (message: string) => void }>('app/logger')
```

Tags are cached by key, so repeated calls with the same key return the same runtime tag.

## Constructors

```ts
const empty = Context.empty()
const single = Context.of(Logger, { log: console.log })
```

`empty` creates a context with no services. `of` creates a context with one service.

## Updates

```ts
const next = Context.add(single, Clock, { now: () => new Date() })
const merged = Context.merge(left, right)
const replaced = Context.override(left, right)
```

`add` and `merge` reject duplicate tags. `override` lets the right context win for duplicate tags.

## Lookup

```ts
Context.has(context, Logger)
Context.get(context, Logger)
Context.unsafeGet(context, Logger)
```

`get` is the normal typed lookup. `unsafeGet` throws `MissingServiceLookupError` if the tag is absent.

## Runtime Checks

```ts
Context.isTag(value)
Context.isContext(value)
```

These are useful at dynamic boundaries, such as adapters or test helpers.
