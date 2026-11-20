import { type ClientOptions, resolveConnection } from "./config.js";
import { Commands } from "./commands.js";
import { SandboxError } from "./errors.js";
import { SandboxHttp } from "./http.js";
import {
    parseSandboxInfo,
    type SandboxInfo,
    type SandboxListResult,
    type SandboxState,
} from "./types.js";

/** Default `size_slug` when `size` is omitted. Create requires template + size_slug. */
const DEFAULT_SIZE_SLUG = "s-1vcpu-1gb";

export interface SandboxCreateOptions extends ClientOptions {
    /** Template name (`template`). Required. */
    template?: string;
    /** Size slug (`size_slug`). Default `s-1vcpu-1gb`. */
    size?: string;
    /** When false, egress is limited to the platform file-transfer host. */
    allowInternetAccess?: boolean;
    /** Environment variables (secret values). */
    envVars?: Record<string, string>;
    /** HTTP deadline. Create returns after the sandbox is running. */
    timeoutMs?: number;
}

export interface SandboxListOptions extends ClientOptions {
    pageSize?: number;
    pageToken?: string;
    /** Filter by state. Omit for any returned state. */
    state?: SandboxState;
    timeoutMs?: number;
}

export interface SandboxGetOptions extends ClientOptions {
    timeoutMs?: number;
}

/**
 * SandboxPublic client for `/v2/sandboxes`.
 * Hand-written — `make generate` does not touch this package.
 *
 * Spec: create, list, get, delete, pause, resume.
 */
export class Sandbox {
    readonly sandboxId: string;
    readonly commands: Commands;
    /** Last known resource from create / get / pause / resume. */
    info: SandboxInfo | undefined;

    private constructor(
        private readonly http: SandboxHttp,
        sandboxId: string,
        info?: SandboxInfo,
    ) {
        this.sandboxId = sandboxId;
        this.info = info;
        this.commands = new Commands(http, sandboxId);
    }

    /** POST `/v2/sandboxes`. Body: template, size_slug, allow_internet_access?, env_vars?. */
    static async create(opts: SandboxCreateOptions = {}): Promise<Sandbox> {
        if (!opts.template?.trim()) {
            throw new SandboxError("template is required: Sandbox.create({ template: '...' })");
        }
        const http = new SandboxHttp(resolveConnection(opts));
        const body: Record<string, unknown> = {
            template: opts.template,
            size_slug: opts.size ?? DEFAULT_SIZE_SLUG,
        };
        if (opts.allowInternetAccess !== undefined) {
            body.allow_internet_access = opts.allowInternetAccess;
        }
        if (opts.envVars) {
            body.env_vars = opts.envVars;
        }
        const response = await http.request("POST", "/v2/sandboxes", {
            body,
            timeoutMs: opts.timeoutMs ?? 120_000,
        });
        const info = parseSandboxInfo(response?.sandbox ?? response);
        return new Sandbox(http, info.sandboxId, info);
    }

    /** GET `/v2/sandboxes`. */
    static async list(opts: SandboxListOptions = {}): Promise<SandboxListResult> {
        const http = new SandboxHttp(resolveConnection(opts));
        const query = new URLSearchParams();
        if (opts.pageSize != null) {
            query.set("page_size", String(opts.pageSize));
        }
        if (opts.pageToken) {
            query.set("page_token", opts.pageToken);
        }
        if (opts.state) {
            query.set("state", opts.state);
        }
        const qs = query.toString();
        const path = qs ? `/v2/sandboxes?${qs}` : "/v2/sandboxes";
        const response = await http.request("GET", path, { timeoutMs: opts.timeoutMs });
        const sandboxes = Array.isArray(response?.sandboxes)
            ? response.sandboxes.map(parseSandboxInfo)
            : [];
        const next = response?.next_page_token;
        return {
            sandboxes,
            nextPageToken: next ? String(next) : undefined,
        };
    }

    /** GET `/v2/sandboxes/{sandbox_id}`. */
    static async get(sandboxId: string, opts: SandboxGetOptions = {}): Promise<Sandbox> {
        if (!sandboxId?.trim()) {
            throw new SandboxError("sandboxId is required");
        }
        const http = new SandboxHttp(resolveConnection(opts));
        const response = await http.request(
            "GET",
            `/v2/sandboxes/${encodeURIComponent(sandboxId)}`,
            { timeoutMs: opts.timeoutMs },
        );
        const info = parseSandboxInfo(response?.sandbox ?? response);
        return new Sandbox(http, info.sandboxId, info);
    }

    /** DELETE `/v2/sandboxes/{sandbox_id}`. */
    async kill(): Promise<boolean> {
        await this.http.request("DELETE", this.sandboxPath());
        return true;
    }

    /** POST `/v2/sandboxes/{sandbox_id}/pause`. */
    async pause(): Promise<SandboxInfo> {
        const response = await this.http.request("POST", `${this.sandboxPath()}/pause`);
        this.info = parseSandboxInfo(response?.sandbox ?? response);
        return this.info;
    }

    /** POST `/v2/sandboxes/{sandbox_id}/resume`. */
    async resume(): Promise<SandboxInfo> {
        const response = await this.http.request("POST", `${this.sandboxPath()}/resume`);
        this.info = parseSandboxInfo(response?.sandbox ?? response);
        return this.info;
    }

    /** Refresh via GET `/v2/sandboxes/{sandbox_id}`. */
    async refresh(): Promise<SandboxInfo> {
        const response = await this.http.request("GET", this.sandboxPath());
        this.info = parseSandboxInfo(response?.sandbox ?? response);
        return this.info;
    }

    private sandboxPath(): string {
        return `/v2/sandboxes/${encodeURIComponent(this.sandboxId)}`;
    }
}
