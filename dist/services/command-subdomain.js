import { getCommandSubdomain } from "./context.js";
const subdomainCache = new Map();
/** Parse org subdomain from a Command footage URL (e.g. verkada-sg.command.verkada.com). */
export function parseCommandSubdomainFromUrl(url) {
    try {
        const { hostname } = new URL(url);
        const match = hostname.match(/^([^.]+)\.command\.verkada\.com$/i);
        return match?.[1];
    }
    catch {
        return undefined;
    }
}
function cacheKey(client) {
    return `${client.organizationId}|${client.apiRegion}`;
}
/** Discover Command subdomain via cameras list + GET /cameras/v1/footage/link. */
export async function discoverCommandSubdomain(client) {
    const devices = await client.get("/cameras/v1/devices");
    const cameraId = devices.cameras?.[0]?.camera_id;
    if (!cameraId)
        return undefined;
    const timestamp = Math.floor(Date.now() / 1000) - 3600;
    const link = await client.get("/cameras/v1/footage/link", {
        camera_id: cameraId,
        timestamp,
    });
    return link.url ? parseCommandSubdomainFromUrl(link.url) : undefined;
}
/**
 * Resolve Command org subdomain: explicit arg → config → cache → API discovery.
 */
export async function resolveCommandSubdomain(client, explicit) {
    if (explicit)
        return { subdomain: explicit, source: "arg" };
    const configured = getCommandSubdomain();
    if (configured)
        return { subdomain: configured, source: "config" };
    const key = cacheKey(client);
    const cached = subdomainCache.get(key);
    if (cached)
        return { subdomain: cached, source: "cache" };
    const discovered = await discoverCommandSubdomain(client);
    if (discovered) {
        subdomainCache.set(key, discovered);
        return { subdomain: discovered, source: "discovered" };
    }
    return {};
}
/** Clear in-memory subdomain cache (for tests). */
export function clearCommandSubdomainCache() {
    subdomainCache.clear();
}
//# sourceMappingURL=command-subdomain.js.map