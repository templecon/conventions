# Hono OpenAPI — Route Documentation

Route-layer APIs: `describeRoute`, `validator`, `resolver`

---

## 1. `validator` — Request Validation Middleware

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

### Available Targets

| target     | Location             | Example                     |
| ---------- | -------------------- | --------------------------- |
| `"query"`  | URL query parameters | `?name=John&page=1`         |
| `"param"`  | URL path parameters  | `/users/:id`                |
| `"json"`   | JSON Request Body    | `POST` body                 |
| `"form"`   | FormData Body        | `multipart/form-data`       |
| `"header"` | Request headers      | `Authorization`, `X-Custom` |
| `"cookie"` | Cookies              | `sessionId=abc123`          |

### Chaining Multiple Validators

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

### Query Parameter Notes

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

## 2. `describeRoute` — OpenAPI Metadata

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

### `describeRoute` Options

| Option        | Priority    | Description                                           |
| ------------- | ----------- | ----------------------------------------------------- |
| `responses`   | Required    | Response definitions (per status code)                |
| `tags`        | Recommended | OpenAPI tag groups (documentation categorization)     |
| `summary`     | Recommended | Short summary                                         |
| `description` | Recommended | Detailed description                                  |
| `security`    | Optional    | Global security override (empty array `[]` = no auth) |
| `deprecated`  | Optional    | Marks the operation as deprecated when `true`         |

### `resolver()` — Schema Conversion

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

### Adding Field Descriptions with `.meta({description})`

Validation schemas become part of the OpenAPI spec through `resolver()`. Add `.meta({description: ""})` to include field-level descriptions in the OpenAPI documentation:

```ts
const createUserSchema = z.object({
    name: z.string().meta({ description: "User name" }),
    age: z.coerce.number().int().positive().meta({ description: "Age" }),
    email: z.string().email().meta({ description: "Email address" }),
});
```

It is recommended to fill `.meta({description: ""})` on schemas used for both request validation (`validator`) and responses (`resolver`).

### Response Content Type Usage

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

### Route-Level Security

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

### Response Type Validation: `satisfies z.output`

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
