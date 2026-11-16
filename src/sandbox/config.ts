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
}

export interface Connection {
    token: string;
    apiUrl: string;
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
    return { token, apiUrl };
}
