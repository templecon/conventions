# Tsconfig Rules

These notes capture the intent behind non-base `tsconfig` files.

## Node Config Includes

- Keep the root-level JS/TS/MJS globs explicit in `tsconfig.node.json`.
- Include dotfiles that are part of the repo tooling, such as `.simple-git-hooks.mjs`.
- Keep `worker-configuration.d.ts` excluded from the node config.
