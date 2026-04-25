---
title: Introduction
description: Type-safe functional dependency composition for TypeScript.
section: Guides
navTitle: Introduction
order: 10
---

# Introduction

`@fuiste/dependencies` is a small TypeScript library for wiring programs with typed service tags, immutable contexts, and composable dependency recipes.

It is inspired by Effect's `Layer`, but it keeps the local surface area narrow:

<div class="api-grid">
  <div class="api-card"><strong>Context</strong><p>An immutable map of services addressed by typed tags.</p></div>
  <div class="api-card"><strong>Dependency</strong><p>A recipe that builds one or more services from declared requirements.</p></div>
  <div class="api-card"><strong>Scope</strong><p>A finalizer stack for resources that need deterministic release.</p></div>
  <div class="api-card"><strong>Result</strong><p>A tiny success-or-failure value for build and use outcomes.</p></div>
</div>

The point is not to make TypeScript pretend it has a runtime module system. The point is to make application construction explicit, typed, replaceable, and hostile to spooky mutable globals.

```ts
import { Context, Dependency, Result, compose, use } from '@fuiste/dependencies'

const Config = Context.Tag<{ appName: string }>('docs/config')
const Greeter = Context.Tag<{ greet: () => string }>('docs/greeter')

const config = Dependency.succeed(Config, { appName: 'Dependencies' })
const greeter = Dependency.sync(Greeter, [Config], (context) => ({
  greet: () => `hello from ${Context.get(context, Config).appName}`,
}))

const result = await use(compose(config, greeter), (context) => {
  return Context.get(context, Greeter).greet()
})

if (Result.isOk(result)) {
  console.log(result.value)
}
```

## What This Library Optimizes For

- Service wiring that is explicit at the value level.
- Type inference for provided and required services.
- Test substitution without mutating global containers.
- Scoped resources that release in last-in-first-out order.
- Small primitives that compose without a framework-shaped invoice.

## Install

```bash
pnpm add @fuiste/dependencies
```

Use npm, yarn, or bun if that is your chosen package manager weather.
