import { SandboxError } from "./errors.js";
import { SandboxHttp } from "./http.js";

export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface RunOptions {
    cwd?: string;
    timeoutMs?: number;
    envs?: Record<string, string>;
    background?: boolean;
    stdin?: boolean | string;
}

/**
 * SandboxPublic is lifecycle-only. Exec is on the data plane — {@link run} throws.
 */
export class Commands {
    constructor(_http: SandboxHttp, _sandboxId: string) {}

    async run(_cmd: string | string[], _opts: RunOptions = {}): Promise<CommandResult> {
        throw new SandboxError(
            "commands.run is not on SandboxPublic REST (/v2/sandboxes). Use the sandbox data plane for exec.",
        );
    }
}
