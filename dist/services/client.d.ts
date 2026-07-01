/**
 * Verkada API Client
 *
 * Handles two-layer auth:
 *  1. x-api-key  → POST /token  → short-lived API token (30 min)
 *  2. x-verkada-auth: <token>   → all other endpoints
 *
 * Credential resolution order (per-request):
 *  1. Request headers: x-verkada-api-key, x-verkada-org-id, x-verkada-region
 *  2. Environment variables: VERKADA_API_KEY, VERKADA_ORG_ID, VERKADA_REGION
 *
 * This means you can deploy with zero secrets on the server — Claude holds
 * the API key and passes it via headers on every request.
 */
import { type VerkadaRegion } from "../constants.js";
export declare class VerkadaClient {
    private readonly apiKey;
    private readonly orgId;
    private readonly region;
    private tokenCache;
    constructor(apiKey: string, orgId: string, region?: VerkadaRegion);
    get baseUrl(): string;
    private isTokenValid;
    getToken(): Promise<string>;
    request<T>(method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE", path: string, options?: {
        params?: Record<string, string | number | boolean | undefined>;
        body?: unknown;
        /** Use raw API key in x-api-key header instead of the token (for streaming token endpoint) */
        useApiKey?: boolean;
    }): Promise<T>;
    get<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    post<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    put<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    patch<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
    delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T>;
}
export declare function getClient(headers?: Record<string, string | string[] | undefined>): VerkadaClient;
export declare function formatError(error: unknown): string;
export declare function truncate(text: string, limit: number): string;
//# sourceMappingURL=client.d.ts.map