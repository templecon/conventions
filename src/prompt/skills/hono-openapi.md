---
name: hono-openapi
description: "Generate OpenAPI specs from Hono routes using hono-openapi. Use when: adding OpenAPI documentation to Hono routes, validating request/response schemas, setting up /openapi.json and API docs UI."
---

# Hono OpenAPI (hono-openapi)

[hono-openapi](https://npmjs.com/package/hono-openapi) is a library that auto-generates OpenAPI specifications from Hono apps.
It uses the `describeRoute` middleware to attach OpenAPI metadata directly to routes.

> Reference docs:
>
> - [hono-openapi.route.md](../../docs/rules/hono_openapi.route.md) — `validator`, `describeRoute`, `resolver`
> - [hono-openapi.spec.md](../../docs/rules/hono_openapi.spec.md) — `openAPIRouteHandler`, Security, Docs UI

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

---

## Route Documentation

Route-layer APIs: `describeRoute`, `validator`, `resolver`

### 1. `validator` — Request Validation Middleware

`validator(target, schema)` validates a specific part of the request (query, param, json, etc.) and makes the validated value available via `c.req.valid(target)`.

```ts
import { validator } from "hono-openapi";
import { z } from "zod";

app.get(
    "/hello",
    validator("query", z.object({ name: z.string().optional() })),
    (c) => {
        const query = c.req.valid("query"); // typed
        return c.text(`Hello ${query.name ?? "Hono"}!`);
    }
);
```

#### Available Targets

| target     | Location             | Example                     |
| ---------- | -------------------- | --------------------------- |
| `"query"`  | URL query parameters | `?name=John&page=1`         |
| `"param"`  | URL path parameters  | `/users/:id`                |
| `"json"`   | JSON Request Body    | `POST` body                 |
| `"form"`   | FormData Body        | `multipart/form-data`       |
| `"header"` | Request headers      | `Authorization`, `X-Custom` |
| `"cookie"` | Cookies              | `sessionId=abc123`          |

#### Chaining Multiple Validators

You can use multiple `validator` calls on a single route, each validating a different target.

```ts
app.patch(
    "/users/:id",
    validator("param", z.object({ id: z.string().uuid() })),
    validator("query", z.object({ fields: z.string().optional() })),
    validator("header", z.object({ "If-Match": z.string().optional() })),
    validator(
        "cookie",
        z.object({ token: z.string().optional().default("asdf") })
    ),
    validator("json", updateBodySchema),
    (c) => {
        const param = c.req.valid("param");
        const query = c.req.valid("query");
        const header = c.req.valid("header");
        const cookie = c.req.valid("cookie"); // { token: string } (default applied)
        const body = c.req.valid("json");
        // ...
    }
);
```

#### Query Parameter Notes

HTTP query strings are always strings, so use `z.coerce.number()` for numeric values:

```ts
const querySchema = z.object({
    page: z.coerce.number().int().positive().default(1), // "1" → 1
    role: z.enum(["admin", "user", "guest"]), // Required parameter
    status: z.enum(["active", "inactive"]).default("active"),
});
```

Without `.optional()`, the parameter is **required** — missing values return 400.

---

### 2. `describeRoute` — OpenAPI Metadata

Add `describeRoute({...})` middleware to define the OpenAPI documentation for a route.

```ts
import { describeRoute, resolver } from "hono-openapi";

app.get(
    "/users",
    describeRoute({
        tags: ["Users"],
        summary: "User list",
        description: "Markdown **description** supported",
        deprecated: false,
        security: [{ bearerAuth: [] }], // Global security override
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": {
                        schema: resolver(userListSchema),
                    },
                },
            },
        },
    }),
    validator("query", listUsersQuery),
    (c) =>
        c.json([
            /* ... */
        ])
);
```

#### `describeRoute` Options

| Option        | Priority    | Description                                           |
| ------------- | ----------- | ----------------------------------------------------- |
| `responses`   | Required    | Response definitions (per status code)                |
| `tags`        | Recommended | OpenAPI tag groups (documentation categorization)     |
| `summary`     | Recommended | Short summary                                         |
| `description` | Recommended | Detailed description                                  |
| `security`    | Optional    | Global security override (empty array `[]` = no auth) |
| `deprecated`  | Optional    | Marks the operation as deprecated when `true`         |

#### `resolver()` — Schema Conversion

`resolver(schema)` takes a Standard Schema (Zod, etc.) and converts it to an OpenAPI Schema Object.

```ts
responses: {
  200: {
    content: {
      "application/json": {
        schema: resolver(z.array(userSchema)),  // ← conversion
      },
    },
  },
}
```

#### Adding Field Descriptions with `.meta({description})`

Validation schemas become part of the OpenAPI spec through `resolver()`. Add `.meta({description: ""})` to include field-level descriptions in the OpenAPI documentation:

```ts
const createUserSchema = z.object({
    name: z.string().meta({ description: "User name" }),
    age: z.coerce.number().int().positive().meta({ description: "Age" }),
    email: z.string().email().meta({ description: "Email address" }),
});
```

It is recommended to fill `.meta({description: ""})` on schemas used for both request validation (`validator`) and responses (`resolver`).

#### Response Content Type Usage

```ts
responses: {
  200: {
    description: "JSON response",
    content: { "application/json": { schema: resolver(mySchema) } },
  },
  201: {
    description: "Text response",
    content: { "text/plain": {} },  // Empty object without schema
  },
}
```

#### Route-Level Security

Use `describeRoute`'s `security` to override global security settings.

```ts
// Global: [{ bearerAuth: [] }, { apiAuth: [] }]  (OR: bearer or apiKey)

// 1) This route requires no auth
describeRoute({
    security: [],
    responses: { 200: { description: "public" } },
});

// 2) This route requires both bearer AND apiKey
describeRoute({
    security: [{ apiAuth: [], bearerAuth: [] }],
    responses: { 200: { description: "private" } },
});
```

- `security: [{ A: [], B: [] }]` — A **AND** B (both required)
- `security: [{ A: [] }, { B: [] }]` — A **OR** B (either one)
- `security: []` — No authentication (ignores global)

#### Response Type Validation: `satisfies z.output`

Validate that the actual response data matches the schema defined in `describeRoute`'s `responses.*.content.*.schema`. Use `z.output` since it represents the final output type after transforms/defaults:

```ts
const responseSchema = z.object({
    id: z.string(),
    name: z.string(),
    createdAt: z.date().default(() => new Date()),
});

app.get(
    "/",
    describeRoute({
        responses: {
            200: {
                description: "Success",
                content: {
                    "application/json": { schema: resolver(responseSchema) },
                },
            },
        },
    }),
    (c) => {
        // z.output: type with defaults applied (createdAt is Date)
        return c.json({
            id: "123",
            name: "John",
            createdAt: new Date(),
        } satisfies z.output<typeof responseSchema>);
    }
);
```

---

## Spec Generation & Serving

Spec-layer APIs: `openAPIRouteHandler`, Security, Docs UI

### 1. `openAPIRouteHandler` — `/openapi.json` Endpoint

Creates a handler that analyzes all routes and serves the OpenAPI JSON spec.

```ts
import { openAPIRouteHandler } from "hono-openapi";

const app = new Hono().route("/users", userRoutes).route("/posts", postRoutes);

app.get(
    "/openapi.json",
    openAPIRouteHandler(app, {
        documentation: {
            info: {
                title: "My API",
                version: "1.0.0",
                description: "API description",
            },
            servers: [
                {
                    url: "https://api.example.com",
                    description: "Production server",
                },
            ],
            tags: [
                { name: "Users", description: "User-related APIs" },
                { name: "Posts", description: "Post-related APIs" },
            ],
            // ...components.securitySchemes, security
        },
    })
);
```

#### `documentation` Options

| Field                        | Priority    | Description                         |
| ---------------------------- | ----------- | ----------------------------------- |
| `info.title`                 | Required    | API title                           |
| `info.version`               | Required    | API version                         |
| `info.description`           | Optional    | API description                     |
| `info.contact`               | Optional    | Contact information (`{}` is valid) |
| `servers`                    | Recommended | Server URL list                     |
| `tags`                       | Recommended | Tag metadata (name + description)   |
| `components.securitySchemes` | Optional    | Security scheme definitions         |
| `security`                   | Optional    | Global security requirements        |

#### `includeEmptyPaths`

Includes routes without `describeRoute` in the spec. Useful for debugging/testing.

```ts
openAPIRouteHandler(app, {
    includeEmptyPaths: true,
    documentation: { info: { title: "My API", version: "1.0.0" } },
});
```

---

### 2. Security Definitions

Define authentication methods in OpenAPI. Set them in the `documentation` option of `openAPIRouteHandler`.

#### JWT Token

```ts
openAPIRouteHandler(app, {
    documentation: {
        components: {
            securitySchemes: {
                jwtAuth: {
                    type: "http",
                    scheme: "Bearer",
                    bearerFormat: "JWT",
                    description: "HTTP Bearer authentication (JWT)",
                },
            },
        },
        // Global: requires jwtAuth
        security: [{ jwtAuth: [] }],
    },
});
```

#### Bearer Token

```ts
securitySchemes: {
  bearerAuth: {
    type: "http",
    scheme: "Bearer",
    description: "HTTP Bearer authentication",
  },
},
```

#### API Key (Header)

```ts
securitySchemes: {
  apiAuth: {
    type: "apiKey",
    in: "header",
    name: "X-API-Key",
    description: "API Key authentication",
  },
},
```

#### Combined Auth (OR / AND)

```ts
// Global: jwtAuth OR apiAuth (either one is sufficient)
security: [{ jwtAuth: [] }, { apiAuth: [] }],
```

Security array semantics:

- `[{ A: [] }, { B: [] }]` — A **OR** B (either one)
- `[{ A: [], B: [] }]` — A **AND** B (both required)

> For route-level security override, see the `describeRoute` section above.

#### Complete Security Example

```ts
openAPIRouteHandler(app, {
    documentation: {
        components: {
            securitySchemes: {
                jwtAuth: {
                    type: "http",
                    scheme: "Bearer",
                    bearerFormat: "JWT",
                    description: "JWT Bearer token authentication",
                },
                apiAuth: {
                    type: "apiKey",
                    in: "header",
                    name: "X-API-Key",
                    description: "API Key authentication",
                },
            },
        },
        // jwtAuth OR apiAuth
        security: [{ jwtAuth: [] }, { apiAuth: [] }],
        // ... info, servers ...
    },
});
```

### 3. Docs UI

```bash
pnpm add @scalar/hono-api-reference
```

```ts
import { Scalar } from "@scalar/hono-api-reference";

app.get("/docs", Scalar({ url: "/openapi.json" }));
```
