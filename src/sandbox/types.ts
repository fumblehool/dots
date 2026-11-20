/**
 * Types for SandboxPublic (`sandboxpublicSandbox` / `sandboxpublicSandboxState`).
 */

import { SandboxError } from "./errors.js";

export type SandboxState =
    | "SANDBOX_STATE_UNSPECIFIED"
    | "SANDBOX_STATE_RUNNING"
    | "SANDBOX_STATE_PAUSED"
    | "SANDBOX_STATE_CREATING";

export interface SandboxInfo {
    sandboxId: string;
    template: string;
    state: SandboxState;
    sizeSlug?: string;
    createdAt: string;
}

export interface SandboxListResult {
    sandboxes: SandboxInfo[];
    nextPageToken?: string;
}

export function parseSandboxInfo(raw: any): SandboxInfo {
    if (!raw?.sandbox_id) {
        throw new SandboxError("sandbox object missing sandbox_id");
    }
    return {
        sandboxId: String(raw.sandbox_id),
        template: String(raw.template ?? ""),
        state: (raw.state ?? "SANDBOX_STATE_UNSPECIFIED") as SandboxState,
        sizeSlug: raw.size_slug != null ? String(raw.size_slug) : undefined,
        createdAt: String(raw.created_at ?? ""),
    };
}
