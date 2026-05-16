import { spawn } from "node:child_process";

const WELL_KNOWN_ENDPOINTS = {
    remote: "https://placeholder.test/mcp",
    local: "http://localhost:5173/mcp",
} as const;

const [input, toolName = "greet", ...toolArgs] = process.argv.slice(2);

if (!input) {
    console.log("Usage: ");
    console.log("  node inspect.ts <endpoint>");
    console.log("  node inspect.ts <endpoint> <tool-name> [tool-arg...]");
    console.log("  pnpm [run] inspect <endpoint> <tool-name> [tool-arg...]");
    console.log("known endpoint alias:");
    for (const alias in WELL_KNOWN_ENDPOINTS) {
        console.log(
            `  ${alias} -> ${WELL_KNOWN_ENDPOINTS[alias as keyof typeof WELL_KNOWN_ENDPOINTS]}`
        );
    }
    process.exit(1);
}

const endpoint =
    WELL_KNOWN_ENDPOINTS[input as keyof typeof WELL_KNOWN_ENDPOINTS] ??
    (URL.canParse(input) ? input : null);

if (!endpoint) {
    console.error(`❌ Invalid endpoint or unknown alias: "${input}"`);
    process.exit(1);
}

const args = [
    "dlx",
    "@modelcontextprotocol/inspector",
    "--cli",
    endpoint,
    "--transport",
    "http",
    "--method",
    "tools/call",
    "--tool-name",
    toolName,
    ...toolArgs.flatMap((arg) => ["--tool-arg", arg]),
];

console.log(`Launching MCP Inspector for: ${endpoint}`);
console.log(`Tool: ${toolName}`);

const child = spawn("pnpm", args, {
    stdio: "inherit",
});

child.on("error", (err) => {
    console.error("Failed to start inspector:", err);
    process.exit(1);
});

child.on("exit", (code) => process.exit(code ?? 0));
