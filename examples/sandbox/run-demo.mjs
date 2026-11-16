/**
 * Local stand-in for /v2/agents/sessions, then the README snippet.
 * Run from the dots repo after `npm run build` (emits src/sandbox/*.js).
 *
 *   node examples/sandbox/run-demo.mjs
 */
import http from "node:http";
import { pathToFileURL } from "node:url";

const server = http.createServer(async (req, res) => {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const raw = Buffer.concat(chunks).toString("utf8");
    const url = new URL(req.url, "http://127.0.0.1");

    if (req.method === "POST" && url.pathname === "/v2/agents/sessions") {
        if (!String(req.headers.authorization || "").startsWith("Bearer ")) {
            res.writeHead(401).end("missing token");
            return;
        }
        if (!String(req.headers["content-type"] || "").includes("yaml")) {
            res.writeHead(415).end("expected yaml");
            return;
        }
        res.writeHead(201, { "content-type": "application/json" });
        res.end(JSON.stringify({ session: { session_id: "demo-session" } }));
        return;
    }

    if (req.method === "POST" && url.pathname === "/v2/agents/sessions/demo-session/sandbox/exec") {
        const body = JSON.parse(raw);
        const command = body.argv?.slice(2).join(" ") ?? "";
        res.writeHead(200, { "content-type": "application/json" });
        res.end(JSON.stringify({ exit_code: 0, stdout: `Hello from DigitalOcean!\n(ran: ${command})\n`, stderr: "" }));
        return;
    }

    if (req.method === "DELETE" && url.pathname === "/v2/agents/sessions/demo-session") {
        res.writeHead(204).end();
        return;
    }

    res.writeHead(404).end("not found");
});

await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const { port } = server.address();
process.env.DIGITALOCEAN_TOKEN = "demo-token";
process.env.DIGITALOCEAN_API_URL = `http://127.0.0.1:${port}`;

const { Sandbox } = await import(pathToFileURL(new URL("../../src/sandbox/index.js", import.meta.url).pathname).href);

const sandbox = await Sandbox.create({ name: "readme-demo", size: "s-1vcpu-1gb" });
const result = await sandbox.commands.run('echo "Hello from DigitalOcean!"');
console.log(result.stdout.trim());
console.log(`sandboxId=${sandbox.sandboxId} exitCode=${result.exitCode}`);
await sandbox.kill();
server.close();
