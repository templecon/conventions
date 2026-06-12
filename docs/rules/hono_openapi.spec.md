# Hono OpenAPI — Spec Generation & Serving

Spec-layer APIs: `openAPIRouteHandler`, Security, Docs UI

---

## 1. `openAPIRouteHandler` — `/openapi.json` Endpoint

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

### `documentation` Options

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

### `includeEmptyPaths`

Includes routes without `describeRoute` in the spec. Useful for debugging/testing.

```ts
openAPIRouteHandler(app, {
    includeEmptyPaths: true,
    documentation: { info: { title: "My API", version: "1.0.0" } },
});
```

---

## 2. Security Definitions

Define authentication methods in OpenAPI. Set them in the `documentation` option of `openAPIRouteHandler`.

### JWT Token

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

### Bearer Token

```ts
securitySchemes: {
  bearerAuth: {
    type: "http",
    scheme: "Bearer",
    description: "HTTP Bearer authentication",
  },
},
```

### API Key (Header)

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

### Combined Auth (OR / AND)

```ts
// Global: jwtAuth OR apiAuth (either one is sufficient)
security: [{ jwtAuth: [] }, { apiAuth: [] }],
```

Security array semantics:

- `[{ A: [] }, { B: [] }]` — A **OR** B (either one)
- `[{ A: [], B: [] }]` — A **AND** B (both required)

> For route-level security override, see [hono_openapi.route.md](./hono_openapi.route.md).

### Complete Security Example

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

## 3. Docs UI

```bash
pnpm add @scalar/hono-api-reference
```

```ts
import { Scalar } from "@scalar/hono-api-reference";

app.get("/docs", Scalar({ url: "/openapi.json" }));
```
