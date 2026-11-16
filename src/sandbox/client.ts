import { type ClientOptions } from "./config.js";
import { Sandbox, type SandboxCreateOptions } from "./sandbox.js";

/**
 * Binds a token (and region or API URL) onto {@link Sandbox}, the same role as
 * `new E2B({ apiKey, domain })` in the E2B JS SDK. Per-call options win.
 */
export class DigitalOcean {
    readonly Sandbox: {
        create(opts?: SandboxCreateOptions): Promise<Sandbox>;
    };

    constructor(opts: ClientOptions) {
        this.Sandbox = {
            create(callOpts: SandboxCreateOptions = {}) {
                return Sandbox.create({ ...opts, ...callOpts });
            },
        };
    }
}
