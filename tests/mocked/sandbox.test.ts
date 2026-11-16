import nock from "nock";
import { AuthenticationError, CommandExitError, DigitalOcean, Sandbox, SandboxError } from "../../src/sandbox/index.js";

const BASE = "https://sandbox.test";

function sessionApi() {
    return nock(BASE, {
        reqheaders: { authorization: "Bearer test-token" },
    });
}

describe("Sandbox", () => {
    const env = process.env;

    beforeEach(() => {
        process.env = { ...env };
        delete process.env.DIGITALOCEAN_TOKEN;
        delete process.env.DIGITALOCEAN_ACCESS_TOKEN;
        delete process.env.DIGITALOCEAN_API_URL;
        delete process.env.DIGITALOCEAN_REGION;
    });

    afterEach(() => {
        process.env = env;
        nock.cleanAll();
    });

    it("create and commands.run match the readme snippet", async () => {
        process.env.DIGITALOCEAN_TOKEN = "test-token";
        process.env.DIGITALOCEAN_API_URL = BASE;

        sessionApi()
            .post("/v2/agents/sessions", (body: string) => {
                return body.includes("kind: Agent")
                    && body.includes("adapter: sandbox")
                    && body.includes("sizeSlug: s-1vcpu-1gb");
            })
            .matchHeader("content-type", "application/x-yaml")
            .reply(201, { session: { session_id: "sess-1" } });

        sessionApi()
            .post("/v2/agents/sessions/sess-1/sandbox/exec", {
                argv: ["sh", "-c", 'echo "Hello from DigitalOcean!"'],
                workdir: "/workspace",
            })
            .reply(200, { exit_code: 0, stdout: "Hello from DigitalOcean!\n", stderr: "" });

        sessionApi().delete("/v2/agents/sessions/sess-1").reply(204);

        const sandbox = await Sandbox.create({ size: "s-1vcpu-1gb" });
        const result = await sandbox.commands.run('echo "Hello from DigitalOcean!"', { cwd: "/workspace" });
        expect(sandbox.sandboxId).toBe("sess-1");
        expect(result.stdout).toBe("Hello from DigitalOcean!\n");
        expect(await sandbox.kill()).toBe(true);
        expect(nock.isDone()).toBe(true);
    });

    it("defaults a bare sandbox adapter when the caller only passes a name", async () => {
        sessionApi()
            .post("/v2/agents/sessions", (body: string) => {
                return body.includes("name: daman-local-test")
                    && body.includes("adapter: sandbox")
                    && !body.includes("sizeSlug");
            })
            .reply(201, { session: { session_id: "sess-1" } });

        const sandbox = await Sandbox.create({
            token: "test-token",
            apiUrl: BASE,
            name: "daman-local-test",
        });
        expect(sandbox.sandboxId).toBe("sess-1");
        expect(nock.isDone()).toBe(true);
    });

    it("binds the token on DigitalOcean and lets a per-call token win", async () => {
        const seen: string[] = [];
        nock(BASE)
            .post("/v2/agents/sessions")
            .reply(201, function () {
                seen.push(this.req.headers.authorization as string);
                return { session: { session_id: "from-client" } };
            });

        const client = new DigitalOcean({ token: "client-token", apiUrl: BASE });
        const sandbox = await client.Sandbox.create({ token: "call-token" });
        expect(sandbox.sandboxId).toBe("from-client");
        expect(seen).toEqual(["Bearer call-token"]);
    });

    it("throws CommandExitError and refuses envs", async () => {
        sessionApi()
            .post("/v2/agents/sessions")
            .reply(201, { session: { session_id: "sess-1" } });
        sessionApi()
            .post("/v2/agents/sessions/sess-1/sandbox/exec")
            .times(2)
            .reply(200, { exit_code: 2, stdout: "partial", stderr: "nope" });

        const sandbox = await Sandbox.create({ token: "test-token", apiUrl: BASE, manifest: "kind: Agent\n" });
        await expect(sandbox.commands.run("false")).rejects.toBeInstanceOf(CommandExitError);
        await expect(sandbox.commands.run("false")).rejects.toMatchObject({ stdout: "partial", exitCode: 2 });
        await expect(sandbox.commands.run("echo hi", { envs: { A: "b" } })).rejects.toBeInstanceOf(SandboxError);
    });

    it("requires a token", async () => {
        await expect(Sandbox.create()).rejects.toBeInstanceOf(AuthenticationError);
    });
});
