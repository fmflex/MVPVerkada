/**
 * Request context — stores the current HTTP request headers so tool
 * handlers can access them via getClient() without manual prop-drilling.
 *
 * Uses Node's AsyncLocalStorage, which correctly scopes the context
 * to the async call chain of each individual HTTP request.
 */
import { AsyncLocalStorage } from "async_hooks";
import type { VerkadaClient } from "./client.js";
interface RequestContext {
    headers: Record<string, string | string[] | undefined>;
}
export declare const requestContext: AsyncLocalStorage<RequestContext>;
/** Call this inside tool handlers to get a client scoped to the current request's credentials. */
export declare function getRequestClient(): VerkadaClient;
/**
 * Command org subdomain for deep links (e.g. "verkada-sg" → verkada-sg.command.verkada.com).
 * Resolution: x-verkada-command-subdomain header, then VERKADA_COMMAND_SUBDOMAIN env.
 */
export declare function getCommandSubdomain(): string | undefined;
export {};
//# sourceMappingURL=context.d.ts.map