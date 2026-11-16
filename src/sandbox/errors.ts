/**
 * Hand-written. `make generate` does not touch `src/sandbox/`.
 */

export class SandboxError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "SandboxError";
    }
}

export class AuthenticationError extends SandboxError {
    constructor(message: string) {
        super(message);
        this.name = "AuthenticationError";
    }
}

export class NotFoundError extends SandboxError {
    constructor(message: string) {
        super(message);
        this.name = "NotFoundError";
    }
}

export class CommandExitError extends SandboxError {
    readonly exitCode: number;
    readonly stdout: string;
    readonly stderr: string;

    constructor(result: { exitCode: number; stdout: string; stderr: string }) {
        super(`command exited with code ${result.exitCode}`);
        this.name = "CommandExitError";
        this.exitCode = result.exitCode;
        this.stdout = result.stdout;
        this.stderr = result.stderr;
    }
}
