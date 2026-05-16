import { defineConfig } from "oxlint";
import eslintRules from "./scripts/linter/oxlint-eslint.ts";

export default defineConfig({
    plugins: ["typescript", "unicorn", "import", "vitest", "promise", "eslint"],
    env: {
        builtin: true,
    },
    ignorePatterns: [
        "**/node_modules/**",
        "**/dist/**",
        "**/dist-ts/**",
        "**/coverage/**",
        "**/.cache/**",
        "**/.vscode/**",
        "**/.git/**",
    ],
    overrides: [
        {
            files: ["**/*.d.ts"],
            rules: {
                "no-unused-vars": "off",
            },
        },
    ],
    extends: [eslintRules],
    rules: {
        "@typescript-eslint/require-await": "off",
    },
    options: {
        typeAware: true,
        typeCheck: true,
        reportUnusedDisableDirectives: "error",
    },
});
