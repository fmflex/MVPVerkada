import { z } from "zod";
import { formatError } from "../services/client.js";
import { getCommandSubdomain, getRequestClient } from "../services/context.js";
import { resolveCommandSubdomain } from "../services/command-subdomain.js";
export function registerOrgTools(server) {
    server.registerTool("verkada_get_org_info", {
        title: "Get Organization Info",
        description: `Returns organization context for the current MCP session and Command deep-link settings.

Use this before verkada_get_camera_history_url to confirm or discover the Command org subdomain
(short-name.command.verkada.com). Subdomain resolution order:
  1. VERKADA_COMMAND_SUBDOMAIN env or x-verkada-command-subdomain header
  2. Auto-discovery via GET /cameras/v1/footage/link (requires at least one camera)

Returns:
  {
    "org_id": string,
    "region": string,
    "command_subdomain": string | null,
    "command_url": string | null,
    "command_subdomain_source": "config" | "cache" | "discovered" | null,
    "note": string
  }

Examples:
  - Use when: "What is our Verkada org subdomain for Command links?"
  - Use when: "Check MCP config before building a history footage URL"`,
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async () => {
        try {
            const client = getRequestClient();
            const configured = getCommandSubdomain();
            let commandSubdomain = configured;
            let source = configured ? "config" : undefined;
            if (!commandSubdomain) {
                const resolved = await resolveCommandSubdomain(client);
                commandSubdomain = resolved.subdomain;
                source = resolved.source;
            }
            const payload = {
                org_id: client.organizationId,
                region: client.apiRegion,
                command_subdomain: commandSubdomain ?? null,
                command_url: commandSubdomain ? `https://${commandSubdomain}.command.verkada.com` : null,
                command_subdomain_source: source ?? null,
                note: commandSubdomain
                    ? "Set VERKADA_COMMAND_SUBDOMAIN (or x-verkada-command-subdomain) to skip rediscovery on future calls."
                    : "Command subdomain not available. Set VERKADA_COMMAND_SUBDOMAIN, pass x-verkada-command-subdomain, or ensure at least one camera exists for auto-discovery.",
            };
            return { content: [{ type: "text", text: JSON.stringify(payload, null, 2) }] };
        }
        catch (err) {
            return {
                content: [{ type: "text", text: `Error: ${formatError(err)}` }],
                isError: true,
            };
        }
    });
}
//# sourceMappingURL=org.js.map