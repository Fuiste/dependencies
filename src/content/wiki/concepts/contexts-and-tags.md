---
title: Contexts And Tags
description: How typed tags identify services inside immutable contexts.
section: Concepts
navTitle: Contexts And Tags
order: 110
---

# Contexts And Tags

A `Context` is an immutable collection of concrete services. Services are addressed by tags, not by string lookups at call sites.

```ts
import { Context } from '@fuiste/dependencies'

const Clock = Context.Tag<{ now: () => Date }>('app/clock')
const context = Context.of(Clock, { now: () => new Date() })

Context.get(context, Clock).now()
```

## Stable Tag Keys

Tags are stable by key.

```ts
const A = Context.Tag<string>('service/name')
const B = Context.Tag<string>('service/name')

A === B
// true
```

This makes tags convenient to share across modules. The type parameter still carries the service type, so the tag is the boundary between runtime identity and TypeScript inference.

## Immutability

Context operations return new contexts.

```ts
const Name = Context.Tag<string>('name')
const Age = Context.Tag<number>('age')

const withName = Context.of(Name, 'Ada')
const withBoth = Context.add(withName, Age, 36)

Context.has(withName, Age)
// false

Context.get(withBoth, Age)
// 36
```

`Context.merge` rejects duplicate service tags. If two contexts intentionally need the same tag with the right side winning, use `Context.override`.

## Safe And Unsafe Reads

`Context.get` is typed for tags known to exist in the context. `Context.unsafeGet` accepts any tag and throws at runtime if the service is missing.

Use `get` in normal application code. Reach for `unsafeGet` only at dynamic boundaries, where the type system has already been politely shown the door.
