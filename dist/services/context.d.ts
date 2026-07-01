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
export {};
//# sourceMappingURL=context.d.ts.map