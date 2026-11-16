import { type ClientOptions, resolveConnection } from "./config.js";
import { Commands } from "./commands.js";
import { SandboxError } from "./errors.js";
import { SandboxHttp } from "./http.js";

export interface SandboxCreateOptions extends ClientOptions {
    name?: string;
    /** Sandbox size slug, for example `s-1vcpu-1gb`. */
    size?: string;
    /** Full session manifest. When set, `name` and `size` are ignored. */
    manifest?: string;
    /** HTTP deadline for create. The sandbox boots after this call returns. */
    timeoutMs?: number;
}

/**
 * One sandbox. Today this is a Hosted Agents session (`/v2/agents/sessions`).
 * The methods stay the same when the adapter moves to `/v2/sandboxes`.
 */
export class Sandbox {
    readonly sandboxId: string;
    readonly commands: Commands;

    private constructor(private readonly http: SandboxHttp, sandboxId: string) {
        this.sandboxId = sandboxId;
        this.commands = new Commands(http, sandboxId);
    }

    /** Create a sandbox. Reads `DIGITALOCEAN_TOKEN` when no token is passed. */
    static async create(opts: SandboxCreateOptions = {}): Promise<Sandbox> {
        const http = new SandboxHttp(resolveConnection(opts));
        const yaml = opts.manifest ?? defaultManifest(opts.name, opts.size);
        const response = await http.request("POST", "/v2/agents/sessions", {
            body: yaml,
            contentType: "application/x-yaml",
            timeoutMs: opts.timeoutMs ?? 120_000,
        });
        const id = response?.session?.session_id ?? response?.session?.id ?? response?.session_id;
        if (!id) {
            throw new SandboxError("create session response did not include a session id");
        }
        return new Sandbox(http, String(id));
    }

    async kill(): Promise<boolean> {
        await this.http.request("DELETE", this.sessionPath());
        return true;
    }

    async pause(): Promise<void> {
        await this.http.request("POST", `${this.sessionPath()}/pause`);
    }

    async resume(): Promise<void> {
        await this.http.request("POST", `${this.sessionPath()}/resume`);
    }

    private sessionPath(): string {
        return `/v2/agents/sessions/${encodeURIComponent(this.sandboxId)}`;
    }
}

function defaultManifest(name?: string, size?: string): string {
    const sandboxName = name ?? `sandbox-${Math.random().toString(16).slice(2, 10)}`;
    // Sessions rejects a manifest with no spec.runtime.adapter. `sandbox` is a
    // bare machine with no agent, which is what Sandbox.create() means.
    const lines = [
        "apiVersion: agents.digitalocean.com/v1alpha1",
        "kind: Agent",
        "metadata:",
        `  name: ${sandboxName}`,
        "spec:",
        "  runtime:",
        "    adapter: sandbox",
    ];
    if (size) {
        lines.push("  sandbox:", `    sizeSlug: ${size}`);
    }
    return `${lines.join("\n")}\n`;
}
