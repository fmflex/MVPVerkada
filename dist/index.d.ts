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
export {};
//# sourceMappingURL=index.d.ts.map