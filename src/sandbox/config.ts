import { AuthenticationError } from "./errors.js";

export const DEFAULT_API_URL = "https://api.digitalocean.com";

export interface ClientOptions {
    /** DigitalOcean API token. `apiKey` is the same value, for ports of E2B snippets. */
    token?: string;
    apiKey?: string;
    /** Selects `https://api-<region>.digitalocean.com` when `apiUrl` is unset. */
    region?: string;
    /** Full API origin. Overrides `region`. */
    apiUrl?: string;
    /**
     * Skip TLS certificate verification (like `curl -k`).
     * For local sandbox-api with a self-signed cert only — never use in production.
     * Also set via `DIGITALOCEAN_TLS_INSECURE=1`.
     */
    tlsInsecure?: boolean;
}

export interface Connection {
    token: string;
    apiUrl: string;
    tlsInsecure: boolean;
}

function envFlagTrue(value: string | undefined): boolean {
    if (!value) {
        return false;
    }
    const v = value.trim().toLowerCase();
    return v === "1" || v === "true" || v === "yes";
}

export function resolveConnection(opts: ClientOptions = {}, env: NodeJS.ProcessEnv = process.env): Connection {
    const token = opts.token ?? opts.apiKey ?? env.DIGITALOCEAN_TOKEN ?? env.DIGITALOCEAN_ACCESS_TOKEN;
    if (!token) {
        throw new AuthenticationError(
            "A token is required: pass token (or apiKey), or set DIGITALOCEAN_TOKEN",
        );
    }
    const region = opts.region ?? env.DIGITALOCEAN_REGION;
    const apiUrl = (opts.apiUrl ?? env.DIGITALOCEAN_API_URL ?? (region ? `https://api-${region}.digitalocean.com` : DEFAULT_API_URL))
        .replace(/\/+$/, "");
    const tlsInsecure = opts.tlsInsecure ?? envFlagTrue(env.DIGITALOCEAN_TLS_INSECURE);
    return { token, apiUrl, tlsInsecure };
}
