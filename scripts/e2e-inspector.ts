import { spawn, spawnSync } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";

const HOST = "127.0.0.1";
const PORT = 5173;
const BASE_URL = `http://${HOST}:${PORT}`;
const MCP_ENDPOINT = `${BASE_URL}/mcp`;
const PNPM = "pnpm";

type InspectorCheck = {
    name: string;
    args: string[];
    validate: (value: unknown) => boolean;
};

const checks: InspectorCheck[] = [
    {
        name: "List tools",
        args: ["--method", "tools/list"],
        validate: (value) =>
            hasNamedItems(value, "tools", ["greet", "ungreet"]),
    },
    {
        name: "Call greet",
        args: [
            "--method",
            "tools/call",
            "--tool-name",
            "greet",
            "--tool-arg",
            "name=Template",
        ],
        validate: (value) =>
            hasNestedString(
                value,
                ["structuredContent", "greeting"],
                "Hello, Template!"
            ),
    },
    {
        name: "Call ungreet",
        args: [
            "--method",
            "tools/call",
            "--tool-name",
            "ungreet",
            "--tool-arg",
            "name=Template",
        ],
        validate: (value) => hasContentText(value, "Goodbye, Template!"),
    },
    {
        name: "List prompts",
        args: ["--method", "prompts/list"],
        validate: (value) => hasNamedItems(value, "prompts", ["nplus1"]),
    },
];

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null;
}

function hasNamedItems(value: unknown, key: string, names: string[]): boolean {
    if (!isRecord(value) || !Array.isArray(value[key])) {
        return false;
    }
    const actualNames = value[key]
        .filter(isRecord)
        .map((item) => item.name)
        .filter((name): name is string => typeof name === "string");
    return names.every((name) => actualNames.includes(name));
}

function hasNestedString(
    value: unknown,
    path: string[],
    expected: string
): boolean {
    let current = value;
    for (const key of path) {
        if (!isRecord(current)) {
            return false;
        }
        current = current[key];
    }
    return current === expected;
}

function hasContentText(value: unknown, expected: string): boolean {
    if (!isRecord(value) || !Array.isArray(value.content)) {
        return false;
    }
    return value.content
        .filter(isRecord)
        .some((item) => item.type === "text" && item.text === expected);
}

function parseInspectorJson(output: string): unknown {
    const start = output.indexOf("{");
    const end = output.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) {
        throw new Error("Inspector did not print a JSON object");
    }
    return JSON.parse(output.slice(start, end + 1)) as unknown;
}

function stopDevServer() {
    if (!devServer.pid) {
        return;
    }
    if (process.platform === "win32") {
        spawnSync("taskkill", ["/pid", String(devServer.pid), "/t", "/f"], {
            stdio: "ignore",
        });
        return;
    }
    try {
        process.kill(-devServer.pid);
    } catch {
        devServer.kill();
    }
}

function runInspector(check: InspectorCheck) {
    const args = [
        "dlx",
        "@modelcontextprotocol/inspector",
        "--cli",
        MCP_ENDPOINT,
        "--transport",
        "http",
        ...check.args,
    ];

    console.log(`\n[inspector] ${check.name}`);
    const result = spawnSync(PNPM, args, {
        encoding: "utf8",
        stdio: "pipe",
    });

    if (result.stdout) {
        console.log(result.stdout.trim());
    }
    if (result.stderr) {
        console.error(result.stderr.trim());
    }

    const output = parseInspectorJson(result.stdout);
    if (!check.validate(output)) {
        throw new Error(`${check.name} returned an unexpected MCP response`);
    }

    if (result.status !== 0) {
        throw new Error(
            `${check.name} returned valid MCP data but exited with ${result.status}`
        );
    }
}

async function waitForServer() {
    const deadline = Date.now() + 60_000;
    while (Date.now() < deadline) {
        try {
            const response = await fetch(BASE_URL);
            if (response.ok) {
                return;
            }
        } catch {
            // Vite may still be starting.
        }
        await delay(500);
    }
    throw new Error(`Dev server did not become ready at ${BASE_URL}`);
}

const devServer = spawn(
    PNPM,
    ["dev", "--host", HOST, "--port", String(PORT), "--strictPort"],
    {
        env: {
            ...process.env,
            CI: "1",
        },
        detached: process.platform !== "win32",
        stdio: "inherit",
    }
);

devServer.on("error", (error) => {
    console.error("Failed to start dev server:", error);
    process.exit(1);
});

try {
    await waitForServer();
    for (const check of checks) {
        runInspector(check);
    }
    console.log("\nInspector E2E smoke test passed.");
} finally {
    stopDevServer();
}
