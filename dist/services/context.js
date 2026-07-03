/**
 * Request context — stores the current HTTP request headers so tool
 * handlers can access them via getClient() without manual prop-drilling.
 *
 * Uses Node's AsyncLocalStorage, which correctly scopes the context
 * to the async call chain of each individual HTTP request.
 */
import { AsyncLocalStorage } from "async_hooks";
import { getClient } from "./client.js";
export const requestContext = new AsyncLocalStorage();
/** Call this inside tool handlers to get a client scoped to the current request's credentials. */
export function getRequestClient() {
    const ctx = requestContext.getStore();
    return getClient(ctx?.headers);
}
function firstHeader(val) {
    if (!val)
        return undefined;
    return Array.isArray(val) ? val[0] : val;
}
/**
 * Command org subdomain for deep links (e.g. "verkada-sg" → verkada-sg.command.verkada.com).
 * Resolution: x-verkada-command-subdomain header, then VERKADA_COMMAND_SUBDOMAIN env.
 */
export function getCommandSubdomain() {
    const ctx = requestContext.getStore();
    const fromHeader = firstHeader(ctx?.headers?.["x-verkada-command-subdomain"]);
    return fromHeader ?? process.env.VERKADA_COMMAND_SUBDOMAIN ?? undefined;
}
//# sourceMappingURL=context.js.map