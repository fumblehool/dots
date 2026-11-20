/**
 * Local stand-in for SandboxPublic `/v2/sandboxes`.
 *
 *   npm run build && node examples/sandbox/run-demo.mjs
 */
import http from "node:http";
import { pathToFileURL } from "node:url";

const sandbox = {
    sandbox_id: "11111111-1111-4111-8111-111111111111",
    template: "coding-base",
    state: "SANDBOX_STATE_RUNNING",
    size_slug: "mars-2vcpu-4gb",
    created_at: "2026-11-18T12:00:00Z",
};

const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    const url = new URL(req.url, "http://127.0.0.1");

    if (!String(req.headers.authorization || "").startsWith("Bearer ")) {
        res.writeHead(401, { "content-type": "application/json" });
        res.end(JSON.stringify({ id: "unauthorized", message: "missing token" }));
        return;
    }

    if (req.method === "POST" && url.pathname === "/v2/sandboxes") {
        const body = JSON.parse(raw || "{}");
        if (!body.template || !body.size_slug) {
            res.writeHead(422, { "content-type": "application/json" });
            res.end(JSON.stringify({ id: "invalid_argument", message: "template and size_slug required" }));
            return;
        }
        const created = { ...sandbox, template: body.template, size_slug: body.size_slug };
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ sandbox: created }));
        return;
    }

    if (req.method === "GET" && url.pathname === "/v2/sandboxes") {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sandboxes: [sandbox], next_page_token: "" }));
        return;
    }

    if (req.method === "GET" && url.pathname === `/v2/sandboxes/${sandbox.sandbox_id}`) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sandbox }));
        return;
    }

    if (req.method === "POST" && url.pathname === `/v2/sandboxes/${sandbox.sandbox_id}/pause`) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sandbox: { ...sandbox, state: "SANDBOX_STATE_PAUSED" } }));
        return;
    }

    if (req.method === "POST" && url.pathname === `/v2/sandboxes/${sandbox.sandbox_id}/resume`) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ sandbox: { ...sandbox, state: "SANDBOX_STATE_RUNNING" } }));
        return;
    }

    if (req.method === "DELETE" && url.pathname === `/v2/sandboxes/${sandbox.sandbox_id}`) {
        res.writeHead(200, { "content-type": "application/json" });
        res.end("{}");
        return;
    }

    res.writeHead(404, { "content-type": "application/json" });
    res.end(JSON.stringify({ id: "not_found", message: "not found" }));
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
process.env.DIGITALOCEAN_TOKEN = "demo-token";
process.env.DIGITALOCEAN_API_URL = `http://127.0.0.1:${port}`;

const { Sandbox } = await import(pathToFileURL(new URL("../../src/sandbox/index.js", import.meta.url).pathname).href);

const created = await Sandbox.create({ template: "coding-base", size: "mars-2vcpu-4gb" });
console.log(`created id=${created.sandboxId} state=${created.info?.state}`);
const listed = await Sandbox.list();
console.log(`listed count=${listed.sandboxes.length}`);
await created.pause();
console.log(`paused state=${created.info?.state}`);
await created.resume();
console.log(`resumed state=${created.info?.state}`);
await created.kill();
console.log("deleted");
server.close();
