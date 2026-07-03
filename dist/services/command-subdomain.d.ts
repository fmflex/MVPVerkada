import type { VerkadaClient } from "./client.js";
export type CommandSubdomainSource = "arg" | "config" | "cache" | "discovered";
/** Parse org subdomain from a Command footage URL (e.g. verkada-sg.command.verkada.com). */
export declare function parseCommandSubdomainFromUrl(url: string): string | undefined;
/** Discover Command subdomain via cameras list + GET /cameras/v1/footage/link. */
export declare function discoverCommandSubdomain(client: VerkadaClient): Promise<string | undefined>;
/**
 * Resolve Command org subdomain: explicit arg → config → cache → API discovery.
 */
export declare function resolveCommandSubdomain(client: VerkadaClient, explicit?: string): Promise<{
    subdomain?: string;
    source?: CommandSubdomainSource;
}>;
/** Clear in-memory subdomain cache (for tests). */
export declare function clearCommandSubdomainCache(): void;
//# sourceMappingURL=command-subdomain.d.ts.map