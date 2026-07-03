import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { formatError, truncate } from "../services/client.js";
import { getRequestClient } from "../services/context.js";
import { resolveCommandSubdomain } from "../services/command-subdomain.js";
import { CHARACTER_LIMIT } from "../constants.js";

/** Build a Verkada Command history-player deep link (matches alert video_url and API footage/link shape). */
export function buildCameraHistoryUrl(
  cameraId: string,
  startTimeSeconds: number,
  durationSeconds: number,
  orgSubdomain: string
): string {
  const timestampMs = startTimeSeconds * 1000;
  return (
    `https://${orgSubdomain}.command.verkada.com/cameras/${cameraId}` +
    `/history/${durationSeconds}/${startTimeSeconds}/` +
    `?duration=${durationSeconds}&initialVideoTime=${timestampMs}`
  );
}

/** Rewrite duration/start in a footage link returned by GET /cameras/v1/footage/link. */
export function adjustFootageUrlDuration(
  url: string,
  durationSeconds: number,
  startTimeSeconds: number
): string {
  const timestampMs = startTimeSeconds * 1000;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/");
    const historyIdx = parts.indexOf("history");
    if (historyIdx >= 0 && parts.length > historyIdx + 2) {
      parts[historyIdx + 1] = String(durationSeconds);
      parts[historyIdx + 2] = String(startTimeSeconds);
      parsed.pathname = parts.join("/");
    }
    parsed.searchParams.set("duration", String(durationSeconds));
    parsed.searchParams.set("initialVideoTime", String(timestampMs));
    return parsed.toString();
  } catch {
    return url;
  }
}

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

Alert types: camera_offline, camera_online, tamper, motion, crowd, person_of_interest, license_plate_of_interest, line_crossing, loitering.
Motion alerts include people/vehicle detection. Crowd alerts include threshold and object types. POI and LPOI alerts include labels.

Per-notification camera_id is returned in each alert; the API does not support filtering alerts by camera.

Args:
  - start_time (number, optional): Unix timestamp (seconds) for start of range. Defaults to 1 hour ago.
  - end_time (number, optional): Unix timestamp (seconds) for end of range. Defaults to now.
  - include_image_url (boolean, optional): Include image URLs in each notification
  - page_size (number, optional): Items per page (max 200)
  - page_token (string, optional): Pagination token from previous response
  - notification_type (string, optional): Comma-separated filter (e.g. "motion,tamper"). Valid values: person_of_interest, license_plate_of_interest, tamper, crowd, motion, camera_offline, camera_online, line_crossing, loitering

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
  - Use when: "Were there any motion alerts today?"
  - Use when: "List license plate of interest alerts this week"`,
      inputSchema: z.object({
        start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) for start of alert range. Defaults to 1 hour ago."),
        end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) for end of range. Defaults to now."),
        include_image_url: z.boolean().optional().describe("Include image URLs in each notification"),
        page_size: z.number().int().positive().max(200).optional().describe("Items per page (max 200)"),
        page_token: z.string().optional().describe("Pagination token from previous response"),
        notification_type: z
          .string()
          .optional()
          .describe(
            'Comma-separated notification types (e.g. "motion,tamper"). Valid: person_of_interest, license_plate_of_interest, tamper, crowd, motion, camera_offline, camera_online, line_crossing, loitering'
          ),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ start_time, end_time, include_image_url, page_size, page_token, notification_type }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/cameras/v1/alerts", {
          start_time,
          end_time,
          include_image_url,
          page_size,
          page_token,
          notification_type,
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
  - page_size (number, optional): Items per page (default 100, max 200)
  - page_token (string, optional): Pagination token from a previous response

Returns:
  {
    "object_counts": [{
      "people_count": number,
      "vehicle_count": number,
      "detected_time": number
    }],
    "next_page_token": string
  }

Examples:
  - Use when: "How many people entered through camera X today?"
  - Use when: "Show vehicle counts for the parking camera last week"`,
      inputSchema: z.object({
        camera_id: z.string().describe("Camera ID to query"),
        start_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) start of range. Defaults to 1 hour ago."),
        end_time: z.number().int().positive().optional().describe("Unix timestamp (seconds) end of range. Defaults to now."),
        page_size: z.number().int().positive().max(200).optional().describe("Items per page (default 100, max 200)"),
        page_token: z.string().optional().describe("Pagination token from previous response"),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ camera_id, start_time, end_time, page_size, page_token }) => {
      try {
        const client = getRequestClient();
        const data = await client.get<unknown>("/cameras/v1/analytics/object_counts", {
          camera_id,
          start_time,
          end_time,
          page_size,
          page_token,
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
      description: `Returns the latest thumbnail image from a camera as base64-encoded JPEG.

Args:
  - camera_id (string): The camera ID
  - resolution (string, optional): "low-res" (default) or "hi-res"

Returns:
  {
    "camera_id": string,
    "resolution": "low-res" | "hi-res",
    "content_type": "image/jpeg",
    "byte_length": number,
    "image_base64": string
  }

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
        const { data, contentType } = await client.getBinary("/cameras/v1/footage/thumbnails/latest", {
          camera_id,
          resolution: apiResolution,
        });
        const payload = {
          camera_id,
          resolution: apiResolution,
          content_type: contentType,
          byte_length: data.length,
          image_base64: data.toString("base64"),
        };
        return { content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }] };
      } catch (err) {
        return { content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }], isError: true };
      }
    }
  );

  // -----------------------------------------------------------------------
  // Get Camera History URL (Command deep link)
  // -----------------------------------------------------------------------
  server.registerTool(
    "verkada_get_camera_history_url",
    {
      title: "Get Camera History URL",
      description: `Returns a shareable Verkada Command deep link to historical footage at a specific time.

Opens the Command history player for the camera at start_time, with a playback window of duration_seconds.

When org_subdomain is configured (tool arg, x-verkada-command-subdomain header, or VERKADA_COMMAND_SUBDOMAIN env),
or discoverable via verkada_get_org_info / GET /cameras/v1/footage/link, the URL is built locally using the Command
deep-link format. Otherwise the official footage/link API is called and duration is adjusted client-side.

Args:
  - camera_id (string): Camera ID
  - start_time (number): Unix timestamp in seconds for playback start
  - duration_seconds (number, optional): Clip window length in seconds. Default 300 (5 minutes).
  - org_subdomain (string, optional): Command org subdomain (e.g. "verkada-sg"). Overrides env/header.

Returns:
  {
    "url": string,
    "note": string
  }

Examples:
  - Use when: "Give me a link to footage from camera X at 3pm yesterday"
  - Use when: "Share a 10-minute clip starting at this alert timestamp"`,
      inputSchema: z.object({
        camera_id: z.string().describe("Camera ID"),
        start_time: z.number().int().positive().describe("Unix timestamp in seconds for playback start"),
        duration_seconds: z
          .number()
          .int()
          .positive()
          .default(300)
          .describe("Playback window length in seconds (default 300)"),
        org_subdomain: z
          .string()
          .optional()
          .describe('Command org subdomain (e.g. "verkada-sg"). Defaults from VERKADA_COMMAND_SUBDOMAIN env or x-verkada-command-subdomain header'),
      }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    },
    async ({ camera_id, start_time, duration_seconds, org_subdomain }) => {
      try {
        const client = getRequestClient();
        const { subdomain } = await resolveCommandSubdomain(client, org_subdomain);
        let url: string;
        let note: string;

        if (subdomain) {
          url = buildCameraHistoryUrl(camera_id, start_time, duration_seconds, subdomain);
          note =
            "URL built from Command deep-link format (documented at apidocs.verkada.com/reference/gethistoryurlviewv1; matches alert video_url fields).";
        } else {
          const data = await client.get<{ url?: string }>("/cameras/v1/footage/link", {
            camera_id,
            timestamp: start_time,
          });
          if (!data.url) {
            throw new Error(
              "Footage link API returned no url. Set VERKADA_COMMAND_SUBDOMAIN or pass org_subdomain to build the link locally."
            );
          }
          url = adjustFootageUrlDuration(data.url, duration_seconds, start_time);
          note =
            "URL from GET /cameras/v1/footage/link; duration and initialVideoTime adjusted to match requested values.";
        }

        return {
          content: [{ type: "text" as const, text: JSON.stringify({ url, note }, null, 2) }],
        };
      } catch (err) {
        return {
          content: [{ type: "text" as const, text: `Error: ${formatError(err)}` }],
          isError: true,
        };
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
