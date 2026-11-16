import { CommandExitError, SandboxError } from "./errors.js";
import { SandboxHttp } from "./http.js";

/** Buffered exec on the public API is clamped at 240 seconds. */
const MAX_EXEC_SECONDS = 240;

export interface CommandResult {
    exitCode: number;
    stdout: string;
    stderr: string;
}

export interface RunOptions {
    cwd?: string;
    /** Command deadline. Milliseconds, matching the E2B JS SDK. */
    timeoutMs?: number;
    envs?: Record<string, string>;
    background?: boolean;
    stdin?: boolean | string;
}

export class Commands {
    constructor(
        private readonly http: SandboxHttp,
        private readonly sandboxId: string,
    ) {}

    /**
     * Run a command and wait for it. A string is `sh -c`. A list is the argv.
     * A non-zero exit throws {@link CommandExitError}.
     */
    async run(cmd: string | string[], opts: RunOptions = {}): Promise<CommandResult> {
        if (opts.envs) {
            throw new SandboxError(
                "envs is not supported: the public exec body has no env field, so values would have to ride in argv",
            );
        }
        if (opts.background) {
            throw new SandboxError("background commands are not on this API yet");
        }
        if (opts.stdin) {
            throw new SandboxError("stdin is not supported on this exec endpoint yet");
        }
        const argv = toArgv(cmd);
        const body: Record<string, unknown> = { argv };
        if (opts.cwd) {
            body.workdir = opts.cwd;
        }
        let timeoutMs = 60_000;
        if (opts.timeoutMs != null) {
            const seconds = Math.ceil(opts.timeoutMs / 1000);
            if (seconds > MAX_EXEC_SECONDS) {
                throw new SandboxError(`timeoutMs is above the ${MAX_EXEC_SECONDS}s exec cap`);
            }
            body.timeout_seconds = seconds;
            timeoutMs = opts.timeoutMs + 5_000;
        }
        const response = await this.http.request(
            "POST",
            `/v2/agents/sessions/${encodeURIComponent(this.sandboxId)}/sandbox/exec`,
            { body, timeoutMs },
        );
        const result: CommandResult = {
            exitCode: Number(response?.exit_code ?? 0),
            stdout: response?.stdout ?? "",
            stderr: response?.stderr ?? "",
        };
        if (result.exitCode !== 0) {
            throw new CommandExitError(result);
        }
        return result;
    }
}

function toArgv(cmd: string | string[]): string[] {
    if (typeof cmd === "string") {
        if (!cmd.trim()) {
            throw new SandboxError("cmd is empty");
        }
        return ["sh", "-c", cmd];
    }
    if (cmd.length === 0) {
        throw new SandboxError("cmd is empty");
    }
    return cmd.map(String);
}
