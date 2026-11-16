import { type Connection } from "./config.js";
import { AuthenticationError, NotFoundError, SandboxError } from "./errors.js";

const USER_AGENT = "dots-sandbox/1.24.0";

export interface RequestOptions {
    body?: unknown;
    contentType?: string;
    timeoutMs?: number;
}

export class SandboxHttp {
    constructor(private readonly connection: Connection) {}

    async request(method: string, path: string, opts: RequestOptions = {}): Promise<any> {
        const headers: Record<string, string> = {
            Authorization: `Bearer ${this.connection.token}`,
            Accept: "application/json",
            "User-Agent": USER_AGENT,
        };
        let body: string | undefined;
        if (opts.body !== undefined) {
            if (typeof opts.body === "string") {
                body = opts.body;
                headers["Content-Type"] = opts.contentType ?? "text/plain";
            } else {
                body = JSON.stringify(opts.body);
                headers["Content-Type"] = "application/json";
            }
        }
        const response = await fetch(`${this.connection.apiUrl}${path}`, {
            method,
            headers,
            body,
            signal: AbortSignal.timeout(opts.timeoutMs ?? 60_000),
        });
        const text = await response.text();
        if (!response.ok) {
            const message = text || response.statusText;
            if (response.status === 401 || response.status === 403) {
                throw new AuthenticationError(`authentication failed (${response.status}): ${message}`);
            }
            if (response.status === 404) {
                throw new NotFoundError(message);
            }
            throw new SandboxError(`HTTP ${response.status}: ${message}`);
        }
        if (!text) {
            return undefined;
        }
        try {
            return JSON.parse(text);
        } catch {
            return text;
        }
    }
}
