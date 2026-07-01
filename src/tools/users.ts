import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatError } from "../services/client.js";
import { getRequestClient } from "../services/context.js";

export function registerUserTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // Create User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_create_user",
    {
      title: "Create Org User",
      description: `Creates a new user in the Verkada organization. external_id is required.

Args:
  - external_id (string): Organization-defined unique identifier (required)
  - email (string, optional): User email
  - first_name (string, optional): First name
  - last_name (string, optional): Last name

Returns: { "user_id": string, "external_id": string, ... }

Examples:
  - Use when: "Create a new user for employee John Doe"`,
      inputSchema: z.object({
        external_id: z.string().min(1).describe("Organization-defined external ID (required)"),
        email: z.string().email().optional().describe("User email"),
        first_name: z.string().optional().describe("First name"),
        last_name: z.string().optional().describe("Last name"),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ external_id, email, first_name, last_name }) => {
      try {
        const client = getRequestClient();
        const data = await client.post<unknown>("/core/v1/user", {
          external_id,
          email,
          first_name,
          last_name,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_user",
    {
      title: "Get Org User",
      description: `Returns a user's metadata from the organization.

Args (provide ONE of):
  - user_id (string): Verkada-defined user ID
  - external_id (string): Organization-defined external ID

Returns: { "user_id", "external_id", "email", "first_name", "last_name" }

Examples:
  - Use when: "Get user details for external ID emp123"`,
      inputSchema: z.object({
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ user_id, external_id }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/core/v1/user", { user_id, external_id });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Update User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_update_user",
    {
      title: "Update Org User",
      description: `Updates a user's metadata. Provide user_id or external_id to identify the user, plus fields to update.

Args:
  - user_id (string, optional): Verkada user ID
  - external_id (string, optional): External ID
  - email (string, optional): New email
  - first_name (string, optional): New first name
  - last_name (string, optional): New last name

Returns: Updated user object.

Examples:
  - Use when: "Update email for user emp123 to new@example.com"`,
      inputSchema: z.object({
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
        email: z.string().email().optional().describe("New email"),
        first_name: z.string().optional().describe("New first name"),
        last_name: z.string().optional().describe("New last name"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, external_id, email, first_name, last_name }) => {
      try {
        const client = getRequestClient();
        const data = await client.put<unknown>(
          "/core/v1/user",
          { email, first_name, last_name },
          { user_id, external_id }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Delete User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_delete_user",
    {
      title: "Delete Org User",
      description: `Permanently deletes a user from the organization. This action is destructive and irreversible.

Args (provide ONE of):
  - user_id (string): Verkada user ID
  - external_id (string): External user ID

Examples:
  - Use when: "Delete user emp123 from the org"

WARNING: This permanently removes the user.`,
      inputSchema: z.object({
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    },
    async ({ user_id, external_id }) => {
      try {
        const client = getRequestClient();
        const data = await client.delete<unknown>("/core/v1/user", { user_id, external_id });
        return { content: [{ type: "text" as const, text: JSON.stringify(data ?? { success: true }, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}
