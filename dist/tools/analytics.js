import { z } from "zod";
import { formatError, truncate } from "../services/client.js";
import { getRequestClient } from "../services/context.js";
import { CHARACTER_LIMIT } from "../constants.js";
export function registerAnalyticsTools(server) {
    // -----------------------------------------------------------------------
    // Get Audit Logs
    // -----------------------------------------------------------------------
    server.registerTool("verkada_get_audit_logs", {
        title: "Get Audit Logs",
        description: `Returns audit logs for the organization within a time range.
Each log includes timestamp (ISO 8601), user info, IP address, event info, and device info.

Args:
  - start_time (number, optional): Unix timestamp (seconds). Defaults to 1 hour ago.
  - end_time (number, optional): Unix timestamp (seconds). Defaults to now.
  - page_size (number, optional): Items per page (default 100, max 200)
  - page_token (string, optional): Pagination token

Returns:
  { "audit_logs": [{ "timestamp", "user_email", "ip_address", "event_info", "device_info" }], "next_page_token" }

Examples:
  - Use when: "Show all admin actions in the last 24 hours"
  - Use when: "Who changed door settings today?"`,
        inputSchema: z.object({
            start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) start (default: 1 hour ago)"),
            end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) end (default: now)"),
            page_size: z.number().int().positive().max(200).optional().describe("Items per page (default 100, max 200)"),
            page_token: z.string().optional().describe("Pagination token"),
        }).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ start_time, end_time, page_size, page_token }) => {
        try {
            const client = getRequestClient();
            const data = await client.get("/core/v1/audit_log", { start_time, end_time, page_size, page_token });
            return { content: [{ type: "text", text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Get License Plates of Interest
    // -----------------------------------------------------------------------
    server.registerTool("verkada_list_license_plates_of_interest", {
        title: "List License Plates of Interest",
        description: `Returns all License Plates of Interest (LPOIs) for the organization.

Returns:
  { "license_plates_of_interest": [{ "license_plate_number", "description", "created" }] }

Examples:
  - Use when: "Show all flagged license plates"
  - Use when: "List vehicles of interest"`,
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async () => {
        try {
            const client = getRequestClient();
            const data = await client.get("/cameras/v1/analytics/lpr/license_plate_of_interest");
            return { content: [{ type: "text", text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Create License Plate of Interest
    // -----------------------------------------------------------------------
    server.registerTool("verkada_create_license_plate_of_interest", {
        title: "Create License Plate of Interest",
        description: `Creates a new License Plate of Interest in the organization.

Args:
  - license_plate_number (string): License plate number (alphanumeric)
  - description (string, optional): Description or reason for flagging

Returns: Created LPOI object.

Examples:
  - Use when: "Flag license plate ABC123 as suspicious"`,
        inputSchema: z.object({
            license_plate_number: z.string().min(1).describe("License plate number"),
            description: z.string().optional().describe("Description/reason for this LPOI"),
        }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    }, async ({ license_plate_number, description }) => {
        try {
            const client = getRequestClient();
            const data = await client.post("/cameras/v1/analytics/lpr/license_plate_of_interest", {
                license_plate_number,
                description,
            });
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Delete License Plate of Interest
    // -----------------------------------------------------------------------
    server.registerTool("verkada_delete_license_plate_of_interest", {
        title: "Delete License Plate of Interest",
        description: `Removes a License Plate of Interest from the organization.

Args:
  - license_plate_number (string): The license plate number to remove

Examples:
  - Use when: "Remove license plate ABC123 from the flagged list"`,
        inputSchema: z.object({
            license_plate_number: z.string().min(1).describe("License plate number to remove"),
        }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: true, openWorldHint: false },
    }, async ({ license_plate_number }) => {
        try {
            const client = getRequestClient();
            const data = await client.delete("/cameras/v1/analytics/lpr/license_plate_of_interest", {
                license_plate_number,
            });
            return { content: [{ type: "text", text: JSON.stringify(data ?? { success: true }, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Get LPR Timestamps
    // -----------------------------------------------------------------------
    server.registerTool("verkada_get_lpr_timestamps", {
        title: "Get License Plate Timestamps",
        description: `Returns all timestamps when a specific license plate was seen by LPR-enabled cameras.

Args:
  - license_plate_number (string): The license plate to look up
  - start_time (number, optional): Unix timestamp (seconds)
  - end_time (number, optional): Unix timestamp (seconds)
  - page_token (string, optional): Pagination token

Returns:
  { "timestamps": [number], "next_page_token": string }

Examples:
  - Use when: "When was license plate ABC123 last seen?"
  - Use when: "Track visits by vehicle XYZ789"`,
        inputSchema: z.object({
            license_plate_number: z.string().min(1).describe("License plate number to look up"),
            start_time: z.number().int().positive().optional().describe("Unix timestamp start"),
            end_time: z.number().int().positive().optional().describe("Unix timestamp end"),
            page_token: z.string().optional().describe("Pagination token"),
        }).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ license_plate_number, start_time, end_time, page_token }) => {
        try {
            const client = getRequestClient();
            const data = await client.get("/cameras/v1/analytics/lpr/timestamps", {
                license_plate_number,
                start_time,
                end_time,
                page_token,
            });
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Get Persons of Interest
    // -----------------------------------------------------------------------
    server.registerTool("verkada_list_persons_of_interest", {
        title: "List Persons of Interest",
        description: `Returns all Persons of Interest (POIs) for the organization.

Returns:
  [{ "person_id", "label", "created", "last_seen" }]

Examples:
  - Use when: "Show all persons of interest"
  - Use when: "List all flagged individuals"`,
        inputSchema: z.object({}).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async () => {
        try {
            const client = getRequestClient();
            const data = await client.get("/cameras/v1/people/person_of_interest");
            return { content: [{ type: "text", text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Create Person of Interest
    // -----------------------------------------------------------------------
    server.registerTool("verkada_create_person_of_interest", {
        title: "Create Person of Interest",
        description: `Creates a Person of Interest using a face image and a label.

Args:
  - label (string): Display label for this POI (e.g., "Trespasser - John Doe")
  - face_image_base64 (string): Base64-encoded face image for recognition

Returns: Created POI object with person_id.

Examples:
  - Use when: "Add this person as a POI with label 'Shoplifter'"`,
        inputSchema: z.object({
            label: z.string().min(1).describe("Label for this person of interest"),
            face_image_base64: z.string().min(1).describe("Base64-encoded face image"),
        }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: false, openWorldHint: false },
    }, async ({ label, face_image_base64 }) => {
        try {
            const client = getRequestClient();
            const data = await client.post("/cameras/v1/people/person_of_interest", {
                label,
                base64_image: face_image_base64,
            });
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Delete Person of Interest
    // -----------------------------------------------------------------------
    server.registerTool("verkada_delete_person_of_interest", {
        title: "Delete Person of Interest",
        description: `Deletes a Person of Interest from the organization by person_id.

Args:
  - person_id (string): The POI's person ID

Examples:
  - Use when: "Remove person of interest ID abc123"`,
        inputSchema: z.object({
            person_id: z.string().min(1).describe("Person of interest ID to delete"),
        }).strict(),
        annotations: { readOnlyHint: false, destructiveHint: true, idempotentHint: false, openWorldHint: false },
    }, async ({ person_id }) => {
        try {
            const client = getRequestClient();
            const data = await client.delete("/cameras/v1/people/person_of_interest", { person_id });
            return { content: [{ type: "text", text: JSON.stringify(data ?? { success: true }, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
    // -----------------------------------------------------------------------
    // Get Sensor Data
    // -----------------------------------------------------------------------
    server.registerTool("verkada_get_sensor_data", {
        title: "Get Sensor Readings",
        description: `Returns sensor readings for a specific sensor over a time range.

Args:
  - device_id (string): Sensor device ID
  - start_time (number, optional): Unix timestamp (seconds). Defaults to 1 hour ago.
  - end_time (number, optional): Unix timestamp (seconds). Defaults to now.

Returns:
  { "device_id", "serial", "readings": [{ "timestamp", "value", "unit" }] }

Examples:
  - Use when: "Show temperature readings from sensor X today"
  - Use when: "Get air quality data for the last week"`,
        inputSchema: z.object({
            device_id: z.string().describe("Sensor device ID"),
            start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) start (default: 1 hour ago)"),
            end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) end (default: now)"),
        }).strict(),
        annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    }, async ({ device_id, start_time, end_time }) => {
        try {
            const client = getRequestClient();
            const data = await client.get("/environment/v1/data", {
                device_id,
                start_time,
                end_time,
            });
            return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
        }
        catch (err) {
            return { content: [{ type: "text", text: `Error: ${formatError(err)}` }], isError: true };
        }
    });
}
//# sourceMappingURL=analytics.js.map