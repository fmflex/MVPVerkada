/**
 * Verkada MCP Server
 *
 * Credentials sit with the MCP client (e.g. Claude), not on this server.
 * Pass them as headers on every request:
 *
 *   x-verkada-api-key: vkkey_...          (required)
 *   x-verkada-org-id:  your-org-id        (required)
 *   x-verkada-region:  us|eu|au|oh        (optional, default: us)
 *
 * Fallback: set VERKADA_API_KEY + VERKADA_ORG_ID env vars for local use.
 *
 * Transport:
 *   TRANSPORT=http   → cloud / remote MCP clients
 *   TRANSPORT=stdio  → local / Claude Desktop (env vars required)
 *   PORT             → HTTP port (default 3000)
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";
import { requestContext } from "./services/context.js";
import { registerCameraTools } from "./tools/cameras.js";
import { registerAccessTools } from "./tools/access.js";
import { registerUserTools } from "./tools/users.js";
import { registerAnalyticsTools } from "./tools/analytics.js";
function createServer() {
    const server = new McpServer({ name: "verkada-mcp-server", version: "1.0.0" });
    registerCameraTools(server);
    registerAccessTools(server);
    registerUserTools(server);
    registerAnalyticsTools(server);
    return server;
}
// ---------------------------------------------------------------------------
// stdio transport (local / Claude Desktop — uses env vars for credentials)
// ---------------------------------------------------------------------------
async function runStdio() {
    const server = createServer();
    await server.connect(new StdioServerTransport());
    console.error("[verkada-mcp] Running on stdio (credentials from env vars)");
}
// ---------------------------------------------------------------------------
// HTTP transport (cloud — credentials from request headers)
// ---------------------------------------------------------------------------
async function runHTTP() {
    const app = express();
    app.use(express.json());
    app.post("/mcp", async (req, res) => {
        // Run the entire request handling inside the AsyncLocalStorage context
        // so tool handlers can call getRequestClient() and get this request's headers
        await requestContext.run({ headers: req.headers }, async () => {
            const server = createServer();
            const transport = new StreamableHTTPServerTransport({
                sessionIdGenerator: undefined,
                enableJsonResponse: true,
            });
            res.on("close", () => transport.close());
            await server.connect(transport);
            await transport.handleRequest(req, res, req.body);
        });
    });
    app.get("/health", (_req, res) => {
        res.json({ status: "ok", server: "verkada-mcp-server", version: "1.0.0" });
    });
    const port = parseInt(process.env.PORT ?? "8080", 10);
    app.listen(port, "0.0.0.0", () => {
        console.error(`[verkada-mcp] Listening on http://0.0.0.0:${port}/mcp`);
        console.error(`[verkada-mcp] Pass x-verkada-api-key + x-verkada-org-id headers with each request`);
    });
}
// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
const mode = process.env.TRANSPORT ?? "stdio";
if (mode === "http") {
    runHTTP().catch((err) => { console.error(err); process.exit(1); });
}
else {
    runStdio().catch((err) => { console.error(err); process.exit(1); });
}
//# sourceMappingURL=index.js.map