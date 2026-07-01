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
import { getBaseUrl, TOKEN_TTL_MS } from "../constants.js";
export class VerkadaClient {
    apiKey;
    orgId;
    region;
    tokenCache = null;
    constructor(apiKey, orgId, region = "us") {
        this.apiKey = apiKey;
        this.orgId = orgId;
        this.region = region;
    }
    get baseUrl() {
        return getBaseUrl(this.region);
    }
    // -----------------------------------------------------------------------
    // Token management
    // -----------------------------------------------------------------------
    isTokenValid() {
        if (!this.tokenCache)
            return false;
        return Date.now() < this.tokenCache.expiresAt;
    }
    async getToken() {
        if (this.isTokenValid()) {
            return this.tokenCache.token;
        }
        const response = await fetch(`${this.baseUrl}/token`, {
            method: "POST",
            headers: {
                "x-api-key": this.apiKey,
                accept: "application/json",
            },
        });
        if (!response.ok) {
            const body = await response.text();
            throw new Error(`Failed to obtain Verkada API token (${response.status}): ${body}`);
        }
        const data = (await response.json());
        this.tokenCache = {
            token: data.token,
            expiresAt: Date.now() + TOKEN_TTL_MS,
        };
        return data.token;
    }
    // -----------------------------------------------------------------------
    // Generic request helper
    // -----------------------------------------------------------------------
    async request(method, path, options = {}) {
        const token = options.useApiKey ? null : await this.getToken();
        // Build URL with query params
        const url = new URL(`${this.baseUrl}${path}`);
        if (options.params) {
            for (const [key, value] of Object.entries(options.params)) {
                if (value !== undefined) {
                    url.searchParams.set(key, String(value));
                }
            }
        }
        // Always inject org_id
        if (!url.searchParams.has("org_id")) {
            url.searchParams.set("org_id", this.orgId);
        }
        const headers = {
            accept: "application/json",
            "content-type": "application/json",
        };
        if (options.useApiKey) {
            headers["x-api-key"] = this.apiKey;
        }
        else {
            headers["x-verkada-auth"] = token;
        }
        const fetchOptions = {
            method,
            headers,
        };
        if (options.body !== undefined) {
            fetchOptions.body = JSON.stringify(options.body);
        }
        const response = await fetch(url.toString(), fetchOptions);
        if (!response.ok) {
            const body = await response.text();
            // If 401, force token refresh on next call
            if (response.status === 401) {
                this.tokenCache = null;
            }
            throw new Error(`Verkada API error ${response.status} on ${method} ${path}: ${body}`);
        }
        // Some DELETE endpoints return 204 with no body
        if (response.status === 204) {
            return {};
        }
        return response.json();
    }
    // -----------------------------------------------------------------------
    // Convenience wrappers
    // -----------------------------------------------------------------------
    get(path, params) {
        return this.request("GET", path, { params });
    }
    post(path, body, params) {
        return this.request("POST", path, { body, params });
    }
    put(path, body, params) {
        return this.request("PUT", path, { body, params });
    }
    patch(path, body, params) {
        return this.request("PATCH", path, { body, params });
    }
    delete(path, params) {
        return this.request("DELETE", path, { params });
    }
}
// -----------------------------------------------------------------------
// Client factory
//
// Credential resolution order:
//  1. Request headers (x-verkada-api-key, x-verkada-org-id, x-verkada-region)
//     → creates a fresh per-request client (no server-side secrets needed)
//  2. Environment variables (VERKADA_API_KEY, VERKADA_ORG_ID, VERKADA_REGION)
//     → cached singleton (for local / self-hosted deployments)
// -----------------------------------------------------------------------
let _envClient = null;
// Cache clients keyed by "apiKey|orgId|region" so HTTP-mode requests reuse tokens
const _headerClients = new Map();
export function getClient(headers) {
    // Try request headers first (client-supplied credentials)
    if (headers) {
        const apiKey = firstHeader(headers["x-verkada-api-key"]);
        const orgId = firstHeader(headers["x-verkada-org-id"]);
        const region = (firstHeader(headers["x-verkada-region"]) ?? "us");
        if (apiKey && orgId) {
            const cacheKey = `${apiKey}|${orgId}|${region}`;
            let client = _headerClients.get(cacheKey);
            if (!client) {
                client = new VerkadaClient(apiKey, orgId, region);
                _headerClients.set(cacheKey, client);
            }
            return client;
        }
    }
    // Fall back to environment variables (local dev / self-hosted)
    const apiKey = process.env.VERKADA_API_KEY;
    const orgId = process.env.VERKADA_ORG_ID;
    const region = (process.env.VERKADA_REGION ?? "us");
    if (!apiKey)
        throw new Error("No Verkada credentials found. " +
            "Pass x-verkada-api-key + x-verkada-org-id headers, " +
            "or set VERKADA_API_KEY + VERKADA_ORG_ID environment variables.");
    if (!orgId)
        throw new Error("No Verkada org ID found. " +
            "Pass x-verkada-org-id header or set VERKADA_ORG_ID environment variable.");
    if (!_envClient) {
        _envClient = new VerkadaClient(apiKey, orgId, region);
    }
    return _envClient;
}
function firstHeader(val) {
    if (!val)
        return undefined;
    return Array.isArray(val) ? val[0] : val;
}
// -----------------------------------------------------------------------
// Shared error formatter
// -----------------------------------------------------------------------
export function formatError(error) {
    if (error instanceof Error)
        return error.message;
    return String(error);
}
// -----------------------------------------------------------------------
// Truncation helper
// -----------------------------------------------------------------------
export function truncate(text, limit) {
    if (text.length <= limit)
        return text;
    return (text.slice(0, limit) +
        `\n\n[Response truncated at ${limit} characters. Use pagination or filters to narrow results.]`);
}
//# sourceMappingURL=client.js.map