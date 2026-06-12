---
name: hono-openapi
description: Convention for using hono-openapi to generate OpenAPI specs from Hono routes.
---

# Hono OpenAPI (hono-openapi)

[hono-openapi](https://npmjs.com/package/hono-openapi) is a library that auto-generates OpenAPI specifications from Hono apps.
It uses the `describeRoute` middleware to attach OpenAPI metadata directly to routes.

> Reference docs:
>
> - [hono_openapi.route.md](./hono_openapi.route.md) — `validator`, `describeRoute`, `resolver`
> - [hono_openapi.spec.md](./hono_openapi.spec.md) — `openAPIRouteHandler`, Security, Docs UI

---

## Installation

```bash
pnpm add hono-openapi
```

---

## Core Flow

```ts
import { describeRoute, validator, resolver } from "hono-openapi";
import { z } from "zod";

const querySchema = z.object({
    page: z.coerce
        .number()
        .int()
        .positive()
        .default(1)
        .meta({ description: "Page number (starts at 1)" }),
    q: z.string().optional().meta({ description: "Search query" }),
});

const responseSchema = z.object({
    id: z.string().meta({ description: "User ID" }),
    name: z.string().meta({ description: "User name" }),
});

app.get(
    "/users",
    describeRoute({
        tags: ["Users"],
        summary: "List users",
        description: "Returns a paginated list of users.",
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": {
                        schema: resolver(responseSchema),
                    },
                },
            },
        },
    }),
    validator("query", querySchema),
    async (c) => {
        const query = c.req.valid("query"); // typed
        const users = await listUsers(query);
        return c.json(users satisfies z.output<typeof responseSchema>);
    }
);
```

### `describeRoute` and `validator` must come before the route handler

`describeRoute` and `validator` are **middleware**, so they must be placed before the handler.

```ts
// ✅ Correct order
app.get("/path",
  describeRoute({...}),      // 1. OpenAPI metadata
  validator("query", schema), // 2. Request validation
  (c) => { ... },             // 3. Handler
);

// ❌ Wrong order
app.get("/path",
  (c) => { ... },             // Handler first — validation won't apply
  validator("query", schema),
);
```

---

## API Overview

| API                   | Layer   | Role                                               |
| --------------------- | ------- | -------------------------------------------------- |
| `validator`           | Route   | Request validation middleware                      |
| `describeRoute`       | Route   | Middleware that attaches OpenAPI metadata          |
| `resolver`            | Utility | Converts validation schema → OpenAPI Schema Object |
| `openAPIRouteHandler` | Spec    | Creates the `/openapi.json` endpoint               |

---

## Response Type Validation: `satisfies z.output`

Defining a response schema with `describeRoute` creates a risk of mismatch between actual response data and the OpenAPI spec.
Use `satisfies z.output<typeof schema>` to validate responses:

```ts
const userSchema = z.object({
    id: z.string(),
    name: z.string(),
});

app.get(
    "/users/:id",
    describeRoute({
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: resolver(userSchema) },
                },
            },
        },
    }),
    (c) => {
        const user = { id: "1", name: "John" };
        return c.json(user satisfies z.output<typeof userSchema>);
    }
);
```

- `z.output<T>` — The **final output** type after transforms/defaults are applied. Both `c.req.valid()` and response data use `z.output` (after Zod applies defaults and coercion).
- `z.input<T>` — The **input** type before transforms (what you expect when receiving external data).

---

## OpenAPI Field Priority

Each field in `describeRoute` and `openAPIRouteHandler` has the following **priority levels** for documentation quality, independent of OpenAPI spec requirements:

| Priority        | Description                                       | Examples                                                |
| --------------- | ------------------------------------------------- | ------------------------------------------------------- |
| **Required**    | Breaks the OpenAPI spec or produces an empty doc  | `info.title`, `info.version`, `responses.*.description` |
| **Recommended** | Fill actively for quality documentation           | `description`, `summary`, `tags`, `servers`             |
| **Optional**    | Fill only when needed. Default behavior otherwise | `deprecated`, `security` (route-level override)         |

> **`summary` field warning**: The OpenAPI Security Scheme Object (`components.securitySchemes.*`) does **not** have a `summary` field. Including it will cause an error.

---

## Full Structure

```
app ─┬─ .get("/path", describeRoute({...}), validator("query", schema), handler)
     ├─ .post("/path", describeRoute({...}), validator("json", schema), handler)
     ├─ .get("/openapi.json", openAPIRouteHandler(app, { documentation: {...} }))
     └─ .get("/docs", Scalar({ url: "/openapi.json" }))
```
