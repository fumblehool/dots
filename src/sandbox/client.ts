import { type ClientOptions } from "./config.js";
import {
    Sandbox,
    type SandboxCreateOptions,
    type SandboxGetOptions,
    type SandboxListOptions,
} from "./sandbox.js";
import type { SandboxListResult } from "./types.js";

/**
 * Binds a token (and region or API URL) onto {@link Sandbox}, the same role as
 * `new E2B({ apiKey, domain })` in the E2B JS SDK. Per-call options win.
 */
export class DigitalOcean {
    readonly Sandbox: {
        create(opts?: SandboxCreateOptions): Promise<Sandbox>;
        list(opts?: SandboxListOptions): Promise<SandboxListResult>;
        get(sandboxId: string, opts?: SandboxGetOptions): Promise<Sandbox>;
    };

    constructor(opts: ClientOptions) {
        this.Sandbox = {
            create(callOpts: SandboxCreateOptions = {}) {
                return Sandbox.create({ ...opts, ...callOpts });
            },
            list(callOpts: SandboxListOptions = {}) {
                return Sandbox.list({ ...opts, ...callOpts });
            },
            get(sandboxId: string, callOpts: SandboxGetOptions = {}) {
                return Sandbox.get(sandboxId, { ...opts, ...callOpts });
            },
        };
    }
}
