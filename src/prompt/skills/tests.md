---
name: tests
description: "Run tests with Vitest. Use when: writing unit tests, CF Workers integration tests, or validating test configurations."
---

## 0. General Guidelines

Tests should follow general TypeScript guidelines. Tests should cover:

- Normal behavior
- Edge cases
- Invalid input
- Boundary values
- Unexpected states
- TypeScript's type check, via Vitest's type assertion features. See [more](https://vitest.dev/guide/testing-types) and [more](https://github.com/mmkal/expect-type)

## Accessing Private Members

When a test needs to access a private field or method for verification (e.g., white-box testing), use **indexed access** (`obj["key"]`) instead of type assertions.

```typescript
// ❌ Avoid: type assertions obscure intent
const privateField = (obj as unknown as { secret: string }).secret;
const privateField = (obj as { secret: string }).secret;

// ✅ Use: indexed access is explicit and avoids assertion
const privateField = obj["secret"];
```

For exposing multiple private members (e.g., passing to a helper), use **spread with indexed access** instead of asserting the whole object:

```typescript
// ❌ Avoid: asserting the whole object bypasses type safety
analyzeShape(obj as { internalProp: number; hiddenFlag: boolean });

// ✅ Use: spread picks only what's needed, no assertion
analyzeShape({
    ...obj,
    internalProp: obj["internalProp"],
    hiddenFlag: obj["hiddenFlag"],
});
```

This avoids the unsafe `unknown` escape hatch, makes the narrowed type explicit, and cherry-picks only the members the test actually needs.

## Mocking & Test Doubles

When creating mock objects, use the `strictObject` helper instead of plain type assertions. This ensures that tests fail (softly via `expect.soft`) when the code under test accesses an unimplemented property — preventing false positives from incomplete mocks.

### `strictObject` Helper

```typescript
// helpers/strict-object.ts
/**
 * Creates a strict object proxy that makes tests fail
 * when accessing unimplemented properties.
 * It doesn't stop execution, but records a soft failure in Vitest.
 * @template Target The target object type, which defines all expected properties.
 * @param obj The partial object to wrap in a strict proxy.
 * @returns A proxy that enforces strict property access.
 */
export function strictObject<const Target extends object>(
    obj: NoInfer<Partial<Target>>
): Target {
    return new Proxy<Target>(obj as Target, {
        get(target: Target, prop, receiver) {
            if (prop in target) {
                return Reflect.get(target, prop, receiver);
            }
            // Allow 'then' property access for proper Promise/await behavior
            // JavaScript checks for 'then' to determine if an object is thenable
            if (prop === "then") {
                return undefined;
            }
            expect
                .soft(
                    false,
                    `Property ${String(prop)} is not implemented on strict object.`
                )
                .toBeTruthy();
        },
    });
}
```

### Usage

```typescript
import { strictObject } from "./helpers/strict-object";

// ❌ Avoid: type assertion masks missing properties
const mock = { get: vi.fn() } as SomeService;

// ✅ Use: strictObject fails the test if an unimplemented property is accessed
const mock = strictObject<SomeService>({
    get: vi.fn(),
});
```

> [!TIP]
> Place `strictObject` in a shared test helper file under `tests/utils/` or equivalent, so it can be reused across test suites.

## Unit Tests

Use these for pure TypeScript utility files. These tests run in Node.js for maximum speed.

### Guidelines:

- File Extension: Use `.test.ts`.
- Location: `tests/` directory.
- Environment: Default (Node.js).
- Concurrency: High. Use `it.concurrent` freely as these should be stateless.

```typescript
// utils.ts (Pure TypeScript logic)
export async function fetchUserList(): Promise<User[]> {
    return [{ id: 1, name: "Ms. Example" }];
}

// utils.test.ts (The Test)
import { describe, it, expect, expectTypeOf } from "vitest";
import { fetchUserList } from "./utils";

describe("User List", () => {
    it.concurrent("should fetch user list", async () => {
        const users = await fetchUserList();
        expectTypeOf(users).toEqualTypeOf<User[]>();
        expect(users).toHaveLength(1);
    });
});
```

## Cloudflare Workers-Specific Tests

> [!NOTE]
> Use this style when you need Cloudflare runtime features such as Workers KV, Durable Objects, R2, or other platform-specific bindings.
>
> - `wrangler.jsonc` or `wrangler.toml` exists
> - `@cloudflare/vitest-pool-workers` is installed
> - the test depends on Cloudflare runtime behavior
>
> Otherwise, prefer Unit Tests or Hono's built-in testing utilities.

## Documentation

- [Vitest docs](https://vitest.dev/guide/)
