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

import { getBaseUrl, TOKEN_TTL_MS, type VerkadaRegion } from "../constants.js";
import type { ApiTokenResponse } from "../types.js";

interface TokenCache {
  token: string;
  expiresAt: number; // epoch ms
}

export class VerkadaClient {
  private readonly apiKey: string;
  private readonly orgId: string;
  private readonly region: VerkadaRegion;
  private tokenCache: TokenCache | null = null;

  constructor(apiKey: string, orgId: string, region: VerkadaRegion = "us") {
    this.apiKey = apiKey;
    this.orgId = orgId;
    this.region = region;
  }

  get baseUrl(): string {
    return getBaseUrl(this.region);
  }

  // -----------------------------------------------------------------------
  // Token management
  // -----------------------------------------------------------------------

  private isTokenValid(): boolean {
    if (!this.tokenCache) return false;
    return Date.now() < this.tokenCache.expiresAt;
  }

  async getToken(): Promise<string> {
    if (this.isTokenValid()) {
      return this.tokenCache!.token;
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
      throw new Error(
        `Failed to obtain Verkada API token (${response.status}): ${body}`
      );
    }

    const data = (await response.json()) as ApiTokenResponse;

    this.tokenCache = {
      token: data.token,
      expiresAt: Date.now() + TOKEN_TTL_MS,
    };

    return data.token;
  }

  // -----------------------------------------------------------------------
  // Generic request helper
  // -----------------------------------------------------------------------

  async request<T>(
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE",
    path: string,
    options: {
      params?: Record<string, string | number | boolean | undefined>;
      body?: unknown;
      /** Use raw API key in x-api-key header instead of the token (for streaming token endpoint) */
      useApiKey?: boolean;
    } = {}
  ): Promise<T> {
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

    const headers: Record<string, string> = {
      accept: "application/json",
      "content-type": "application/json",
    };

    if (options.useApiKey) {
      headers["x-api-key"] = this.apiKey;
    } else {
      headers["x-verkada-auth"] = token!;
    }

    const fetchOptions: RequestInit = {
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

      throw new Error(
        `Verkada API error ${response.status} on ${method} ${path}: ${body}`
      );
    }

    // Some DELETE endpoints return 204 with no body
    if (response.status === 204) {
      return {} as T;
    }

    return response.json() as Promise<T>;
  }

  // -----------------------------------------------------------------------
  // Convenience wrappers
  // -----------------------------------------------------------------------

  get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  post<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>("POST", path, { body, params });
  }

  put<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>("PUT", path, { body, params });
  }

  patch<T>(path: string, body?: unknown, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>("PATCH", path, { body, params });
  }

  delete<T>(path: string, params?: Record<string, string | number | boolean | undefined>): Promise<T> {
    return this.request<T>("DELETE", path, { params });
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

let _envClient: VerkadaClient | null = null;
// Cache clients keyed by "apiKey|orgId|region" so HTTP-mode requests reuse tokens
const _headerClients = new Map<string, VerkadaClient>();

export function getClient(headers?: Record<string, string | string[] | undefined>): VerkadaClient {
  // Try request headers first (client-supplied credentials)
  if (headers) {
    const apiKey = firstHeader(headers["x-verkada-api-key"]);
    const orgId  = firstHeader(headers["x-verkada-org-id"]);
    const region = (firstHeader(headers["x-verkada-region"]) ?? "us") as VerkadaRegion;

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
  const orgId  = process.env.VERKADA_ORG_ID;
  const region = (process.env.VERKADA_REGION ?? "us") as VerkadaRegion;

  if (!apiKey) throw new Error(
    "No Verkada credentials found. " +
    "Pass x-verkada-api-key + x-verkada-org-id headers, " +
    "or set VERKADA_API_KEY + VERKADA_ORG_ID environment variables."
  );
  if (!orgId) throw new Error(
    "No Verkada org ID found. " +
    "Pass x-verkada-org-id header or set VERKADA_ORG_ID environment variable."
  );

  if (!_envClient) {
    _envClient = new VerkadaClient(apiKey, orgId, region);
  }
  return _envClient;
}

function firstHeader(val: string | string[] | undefined): string | undefined {
  if (!val) return undefined;
  return Array.isArray(val) ? val[0] : val;
}

// -----------------------------------------------------------------------
// Shared error formatter
// -----------------------------------------------------------------------

export function formatError(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}

// -----------------------------------------------------------------------
// Truncation helper
// -----------------------------------------------------------------------

export function truncate(text: string, limit: number): string {
  if (text.length <= limit) return text;
  return (
    text.slice(0, limit) +
    `\n\n[Response truncated at ${limit} characters. Use pagination or filters to narrow results.]`
  );
}
