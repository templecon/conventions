import { defineConfig } from "oxlint";
import eslintErrorRules from "./oxlint-eslint-error.ts";
import eslintWarnRules from "./oxlint-eslint-warn.ts";

export default defineConfig({
    extends: [eslintErrorRules, eslintWarnRules],
});
