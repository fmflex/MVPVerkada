import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatError, truncate } from "../services/client.js";
import { getRequestClient } from "../services/context.js";
import { CHARACTER_LIMIT } from "../constants.js";

export function registerCameraTools(server: McpServer): void {
  // -----------------------------------------------------------------------
  // Get Camera Data
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_cameras",
    {
      title: "Get All Cameras",
      description: `Returns details for all cameras in the organization.
      
Per camera: name, site, location, model, serial number, camera_id, MAC address, local IP, retention, firmware, status, and GPS coordinates.

Returns:
  JSON array of camera objects:
  {
    "camera_id": string,
    "name": string,
    "site": string,
    "location": string,
    "model": string,
    "serial": string,
    "mac": string,
    "local_ip": string,
    "status": string,       // "online" | "offline"
    "firmware": string
  }

Examples:
  - Use when: "List all my cameras" 
  - Use when: "Which cameras are offline?"
  - Use when: "Find camera by serial number"`,
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async () => {
      try {
        const client = getRequestClient();
        const data = await client.get<{ cameras: unknown[] }>("/cameras/v1/devices");
        const text = truncate(JSON.stringify(data.cameras ?? data, null, 2), CHARACTER_LIMIT);
        return { content: [{ type: "text" as const, text }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Alerts
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_alerts",
    {
      title: "Get Camera Alerts",
      description: `Returns alerts for the organization within a time range.

Alert types: camera offline, camera online, tamper, motion, crowd, Person of Interest.
Motion alerts include people/vehicle detection. Crowd alerts include threshold and object types. POI alerts include the label.

Args:
  - start_time (number): Unix timestamp (seconds) for start of range
  - end_time (number, optional): Unix timestamp (seconds) for end of range. Defaults to now.
  - camera_id (string, optional): Filter to a specific camera

Returns:
  {
    "notifications": [{
      "camera_id": string,
      "created": number,
      "notification_type": string,
      "image_url": string,
      "video_url": string,
      "objects": string[],
      "person_label": string,
      "crowd_threshold": number
    }],
    "next_page_token": string
  }

Examples:
  - Use when: "Show me alerts from the last hour"
  - Use when: "Were there any motion alerts today?"`,
      inputSchema: z.object({
        start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) for start of alert range. Defaults to 1 hour ago."),
        end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) for end of range. Defaults to now."),
        camera_id: z.string().optional().describe("Filter alerts to a specific camera ID"),
        page_token: z.string().optional().describe("Pagination token from previous response"),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ start_time, end_time, camera_id, page_token }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/cameras/v1/alerts", {
          start_time,
          end_time,
          camera_id,
          page_token,
        });
        return { content: [{ type: "text" as const, text: truncate(JSON.stringify(data, null, 2), CHARACTER_LIMIT) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get People/Vehicle Counts
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_object_counts",
    {
      title: "Get People/Vehicle Counts",
      description: `Returns count of people and vehicles within a time range for a camera.

Args:
  - camera_id (string): The camera ID to query
  - start_time (number, optional): Unix timestamp (seconds). Defaults to 1 hour ago.
  - end_time (number, optional): Unix timestamp (seconds). Defaults to now.
  - resolution (string, optional): "hourly" or "daily"

Returns:
  {
    "counts": [{
      "timestamp": number,
      "people": number,
      "vehicles": number
    }]
  }

Examples:
  - Use when: "How many people entered through camera X today?"
  - Use when: "Show vehicle counts for the parking camera last week"`,
      inputSchema: z.object({
        camera_id: z.string().describe("Camera ID to query"),
        start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) start of range. Defaults to 1 hour ago."),
        end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) end of range. Defaults to now."),
        resolution: z.enum(["hourly", "daily"]).optional().describe("Aggregation resolution"),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ camera_id, start_time, end_time, resolution }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/cameras/v1/analytics/object_counts", {
          camera_id,
          start_time,
          end_time,
          resolution,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Thumbnail (latest)
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_latest_thumbnail",
    {
      title: "Get Latest Camera Thumbnail",
      description: `Returns the URL of the latest thumbnail image from a camera.

Args:
  - camera_id (string): The camera ID
  - resolution (string, optional): "low-res" (default) or "hi-res"

Returns:
  { "url": string }   — URL to the thumbnail image

Examples:
  - Use when: "Show me the latest snapshot from camera X"
  - Use when: "What does the entrance camera look like right now?"`,
      inputSchema: z.object({
        camera_id: z.string().describe("Camera ID to get thumbnail for"),
        resolution: z
          .enum(["low-res", "hi-res", "low", "high"])
          .default("low-res")
          .describe('Thumbnail resolution: "low-res" or "hi-res" (aliases "low"/"high" accepted)'),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async ({ camera_id, resolution }) => {
      try {
        const apiResolution = resolution === "hi-res" || resolution === "high" ? "hi-res" : "low-res";
        const client = getRequestClient();
        const data = await client.get<unknown>("/cameras/v1/footage/thumbnails/latest", {
          camera_id,
          resolution: apiResolution,
        });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Streaming Token
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_streaming_token",
    {
      title: "Get Camera Streaming Token (JWT)",
      description: `Returns a JWT required to stream live or historical footage. Valid for 30 minutes.
Uses the top-level API key directly (not the session token).

Returns:
  { "jwt": string }

Use this before calling the streaming URL for live/historical footage.

Examples:
  - Use when: "I need to stream live footage from a camera"`,
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: false, openWorldHint: true },
    },
    async () => {
      try {
        const client = getRequestClient();
        const data = await client.request<unknown>("GET", "/cameras/v1/footage/token", { useApiKey: true });
        return { content: [{ type: "text" as const, text: JSON.stringify(data, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );
}
