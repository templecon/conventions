# Tools Configuration

This document provides guidelines for configuring the tools in your project. The tools help maintain code quality and consistency by enforcing coding standards and identifying potential issues.

## Linter Configuration

This project uses oxlint for linting.

### oxlint

Fast linter for TypeScript.

It supports:

- Most of the rules of typescript-eslint, including type-aware rules.
- JS plugins, while it might not support all of the plugins.

But doesn't support:

- every single plugin.
- Some of HTML-superset code, which oxlint only checks its `<script>` block.
- Little bit of rules of typescript-eslint.
- Clean rule definition, like ESLint's `somePlugin.configs.recommended`.

#### Instructions

When using new plugins, try oxlint's compatibility layer first.

- Make a config on `scripts/linter/` directory about the plugin.
- Write the rules you want to use in the config. Since oxlint doesn't support `.configs.recommended` or something like that, you should write the rules you want to use in the config. Maybe checking the plugin's code to find out which rules are enabled in the recommended config is helpful.
- Add a TS config under `scripts/linter/` and import it from `oxlint.config.ts`.

### Compatibility

If a plugin or rule is not supported directly, use oxlint-compatible configs instead of adding ESLint back.

## Formatter Configuration

This project uses Prettier for formatting, since it's not super-fast but still acceptable for formatting.
