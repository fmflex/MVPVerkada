import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatError, truncate } from "../services/client.js";
import { getRequestClient } from "../services/context.js";
import { CHARACTER_LIMIT } from "../constants.js";

export function registerAccessTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // List Access Users
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_list_access_users",
    {
      title: "List Access Users",
      description: `Returns all access users in the organization, including their user_id, email, name, and employee_id.

Args:
  - include_visitors (boolean, optional): Include visitor users in results (default: false)

Returns:
  { "access_members": [{ "user_id", "email", "first_name", "last_name", "employee_id", "external_id" }] }

Examples:
  - Use when: "List all access control users"
  - Use when: "Find user by email or name"`,
      inputSchema: z.object({
        include_visitors: z.boolean().optional().describe("Include visitor users in results"),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ include_visitors }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/access/v1/access_users", { include_visitors });
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Access User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_access_user",
    {
      title: "Get Access User",
      description: `Returns the Access Information Object for a specific user.

Args (provide ONE of):
  - user_id (string): Verkada-defined user ID
  - external_id (string): Org-defined external ID
  - email (string): User email address
  - employee_id (string): Employee ID

Returns full access info: credentials, groups, BLE status, entry code, access cards, etc.

Examples:
  - Use when: "Get details for user john@example.com"
  - Use when: "What credentials does user_id abc123 have?"`,
      inputSchema: z.object({
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("Organization-defined external ID"),
        email: z.string().email().optional().describe("User email address"),
        employee_id: z.string().optional().describe("Employee ID"),
      }).strict().refine(
        (d) => d.user_id || d.external_id || d.email || d.employee_id,
        "Provide at least one of: user_id, external_id, email, or employee_id"
      ),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ user_id, external_id, email, employee_id }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/access/v1/access_users/user", {
          user_id,
          external_id,
          email,
          employee_id,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Unlock Door as Admin
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_unlock_door_admin",
    {
      title: "Unlock Door (Admin Override)",
      description: `Sends an admin unlock command to a door, bypassing normal user access permissions.
This unlocks the door regardless of access levels.

Args:
  - door_id (string): The ID of the door to unlock

Returns:
  { "door_id": string, "duration": number }   — the door that was unlocked and duration in seconds

Examples:
  - Use when: "Unlock the main entrance door"
  - Use when: "Override lock for door abc123"

WARNING: This is a privileged action that bypasses all access controls.`,
      inputSchema: z.object({
        door_id: z.string().describe("The door ID to unlock"),
      }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ door_id }) => {
      try {
        const client = getRequestClient();
        const data = await client.post<unknown>("/access/v1/door/admin_unlock", { door_id });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Unlock Door as User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_unlock_door_user",
    {
      title: "Unlock Door as User",
      description: `Sends an unlock request for a door as a specific user. Only succeeds if the user has access permissions for that door through an Access Level.

Args:
  - door_id (string): The door ID to unlock
  - user_id (string, optional): Verkada user ID
  - external_id (string, optional): External user ID (provide user_id OR external_id, not both)

Returns:
  { "door_id": string, "duration": number }

Examples:
  - Use when: "Unlock door for user john (user_id: abc)"`,
      inputSchema: z.object({
        door_id: z.string().describe("The door ID to unlock"),
        user_id: z.string().optional().describe("Verkada user ID (use this OR external_id)"),
        external_id: z.string().optional().describe("External user ID (use this OR user_id)"),
      }).strict().refine(
        (d) => Boolean(d.user_id) !== Boolean(d.external_id),
        "Provide exactly one of: user_id or external_id (not both)"
      ),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ door_id, user_id, external_id }) => {
      try {
        const client = getRequestClient();
        const data = await client.post<unknown>("/access/v1/door/user_unlock", {
          door_id,
          ...(user_id ? { user_id } : { external_id }),
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Doors
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_doors",
    {
      title: "Get Doors",
      description: `Returns a list of all doors in the organization. Optionally filter by site_ids or door_ids (not both).

Args:
  - site_ids (string[], optional): Filter to doors within these sites
  - door_ids (string[], optional): Filter to these specific doors

Returns:
  { "doors": [{ "door_id", "name", "site_id", ... }] }

Examples:
  - Use when: "List all doors"
  - Use when: "Get doors in site abc123"`,
      inputSchema: z.object({
        site_ids: z.array(z.string()).optional().describe("Filter to doors within these site IDs"),
        door_ids: z.array(z.string()).optional().describe("Filter to these specific door IDs"),
      }).strict().refine(
        (d) => !(d.site_ids && d.door_ids),
        "Provide only one of site_ids or door_ids, not both"
      ),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ site_ids, door_ids }) => {
      try {
        const client = getRequestClient();
        const params: Record<string, string | undefined> = {};
        if (site_ids) params.site_ids = site_ids.join(",");
        if (door_ids) params.door_ids = door_ids.join(",");
        const data = await client.get<unknown>("/access/v1/doors", params);
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Access Groups
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_list_access_groups",
    {
      title: "List Access Groups",
      description: `Returns all access groups in the organization.

Returns:
  [{ "group_id": string, "name": string, ... }]

Examples:
  - Use when: "What access groups exist?"
  - Use when: "List all security groups"`,
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/access/v1/access_groups");
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Add User to Access Group
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_add_user_to_group",
    {
      title: "Add User to Access Group",
      description: `Adds an access user to an access group.

Args:
  - group_id (string): The access group ID
  - user_id (string, optional): Verkada user ID
  - external_id (string, optional): External user ID (provide user_id OR external_id)

Returns: Updated group membership info.

Examples:
  - Use when: "Add user john to the Contractors group"`,
      inputSchema: z.object({
        group_id: z.string().describe("Access group ID"),
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ group_id, user_id, external_id }) => {
      try {
        const client = getRequestClient();
        const data = await client.put<unknown>(
          "/access/v1/access_groups/group/user",
          user_id ? { user_id } : { external_id },
          { group_id }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Remove User from Access Group
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_remove_user_from_group",
    {
      title: "Remove User from Access Group",
      description: `Removes an access user from an access group.

Args:
  - group_id (string): The access group ID
  - user_id (string, optional): Verkada user ID
  - external_id (string, optional): External user ID

Examples:
  - Use when: "Remove user from the Visitors group"`,
      inputSchema: z.object({
        group_id: z.string().describe("Access group ID"),
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ),
      annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ group_id, user_id, external_id }) => {
      try {
        const client = getRequestClient();
        const params: Record<string, string> = { group_id };
        if (user_id) params.user_id = user_id;
        if (external_id) params.external_id = external_id;
        const data = await client.delete<unknown>(
          "/access/v1/access_groups/group/user",
          params
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Access Events
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_access_events",
    {
      title: "Get Access Events",
      description: `Returns access events for the organization within a time range.

Args:
  - start_time (number, optional): Unix timestamp (seconds). Defaults to 1 hour ago.
  - end_time (number, optional): Unix timestamp (seconds). Defaults to now.
  - device_id (string, optional): Filter to a specific device (door controller), comma-separated
  - site_id (string, optional): Filter to specific sites, comma-separated
  - event_type (string, optional): Filter to specific event types, comma-separated
  - user_id (string, optional): Filter to a specific user, comma-separated
  - page_size (number, optional): Items per page (default 100, max 200)
  - page_token (string, optional): Pagination token

Returns:
  { "events": [{ "user_id", "device_id", "event_type", "timestamp", ... }], "next_page_token" }

Examples:
  - Use when: "Who badged in through the front door today?"
  - Use when: "Show all access events in the last hour"`,
      inputSchema: z.object({
        start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) start (default: 1 hour ago)"),
        end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) end (default: now)"),
        device_id: z.string().optional().describe("Filter to this device (door controller / ACU), comma-separated for multiple"),
        site_id: z.string().optional().describe("Filter to these sites, comma-separated"),
        event_type: z.string().optional().describe("Filter to these event types, comma-separated"),
        user_id: z.string().optional().describe("Filter to this user, comma-separated for multiple"),
        page_size: z.number().int().positive().max(200).optional().describe("Items per page (default 100, max 200)"),
        page_token: z.string().optional().describe("Pagination token"),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ start_time, end_time, device_id, site_id, event_type, user_id, page_size, page_token }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/events/v1/access", {
          start_time,
          end_time,
          device_id,
          site_id,
          event_type,
          user_id,
          page_size,
          page_token,
        });
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Add Access Card to User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_add_access_card",
    {
      title: "Add Access Card to User",
      description: `Creates and adds an access card credential to a user.
Requires a card type, plus facility_code + card_number OR card_number_hex.

Args:
  - user_id (string, optional): Verkada user ID
  - external_id (string, optional): External user ID
  - type (string): Card format, e.g. "Standard 26-bit Wiegand", "HID 37-bit", "Apple Wallet Pass"
  - facility_code (string, optional): Card facility code
  - card_number (string, optional): Card number
  - card_number_hex (string, optional): Card number in hex format
  - active (boolean, optional): Whether the card is active (default: false)

Returns: Created credential information.

Examples:
  - Use when: "Add HID card 1234 with facility code 56 to user abc"`,
      inputSchema: z.object({
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
        type: z.string().describe('Card format, e.g. "Standard 26-bit Wiegand"'),
        facility_code: z.string().optional().describe("Card facility code"),
        card_number: z.string().optional().describe("Card number"),
        card_number_hex: z.string().optional().describe("Card number in hex format"),
        active: z.boolean().optional().describe("Whether the card is active"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ).refine(
        (d) => (d.facility_code !== undefined && d.card_number !== undefined) || d.card_number_hex,
        "Provide facility_code + card_number OR card_number_hex"
      ),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    },
    async ({ user_id, external_id, type, facility_code, card_number, card_number_hex, active }) => {
      try {
        const client = getRequestClient();
        const data = await client.post<unknown>(
          "/access/v1/credentials/card",
          { type, facility_code, card_number, card_number_hex, active },
          { user_id, external_id }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Set Entry Code (PIN) for User
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_set_user_pin",
    {
      title: "Set Entry Code (PIN) for User",
      description: `Sets the entry (PIN) code for an access user.

Args:
  - user_id (string, optional): Verkada user ID
  - external_id (string, optional): External user ID
  - pin (string): 4–16 digit entry code

Returns: Updated Access Information Object.

Examples:
  - Use when: "Set PIN 1234 for user abc"`,
      inputSchema: z.object({
        user_id: z.string().optional().describe("Verkada user ID"),
        external_id: z.string().optional().describe("External user ID"),
        pin: z.string().min(4).max(16).regex(/^\d+$/).describe("4-16 digit entry code"),
      }).strict().refine(
        (d) => d.user_id || d.external_id,
        "Provide at least one of: user_id or external_id"
      ),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ user_id, external_id, pin }) => {
      try {
        const client = getRequestClient();
        const data = await client.put<unknown>(
          "/access/v1/access_users/user/entry_code",
          { entry_code: pin },
          { user_id, external_id }
        );
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}
