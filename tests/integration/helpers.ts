import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";
import { registerCameraTools } from "../../src/tools/cameras.js";
import { registerAccessTools } from "../../src/tools/access.js";
import { registerUserTools } from "../../src/tools/users.js";
import { registerAnalyticsTools } from "../../src/tools/analytics.js";
import type { ToolResult } from "../helpers.js";
import { resultText } from "../helpers.js";

export function hasLiveCredentials(): boolean {
  return Boolean(process.env.VERKADA_API_KEY && process.env.VERKADA_ORG_ID);
}

export function runWriteTests(): boolean {
  return process.env.VERKADA_RUN_WRITE_TESTS === "1";
}

export function runPhysicalTests(): boolean {
  return process.env.VERKADA_RUN_PHYSICAL_TESTS === "1";
}

export async function createLiveHarness() {
  const server = new McpServer({ name: "integration-test", version: "1.0.0" });
  registerCameraTools(server);
  registerAccessTools(server);
  registerUserTools(server);
  registerAnalyticsTools(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "integration-client", version: "1.0.0" });
  await client.connect(clientTransport);

  return {
    callTool: (name: string, args: Record<string, unknown> = {}) =>
      client.callTool({ name, arguments: args }),
    async close() {
      await client.close();
      await server.close();
    },
  };
}

export function parseResultJson(result: ToolResult): unknown {
  const text = resultText(result);
  return JSON.parse(text);
}

export function hourAgoRange(): { start_time: number; end_time: number } {
  const end_time = Math.floor(Date.now() / 1000);
  return { start_time: end_time - 3600, end_time };
}

export interface LiveFixtures {
  cameraId?: string;
  accessUserId?: string;
  accessUserEmail?: string;
  doorId?: string;
  siteId?: string;
  groupId?: string;
  licensePlate?: string;
  personId?: string;
  sensorDeviceId?: string;
}

function firstId(items: unknown[], ...keys: string[]): string | undefined {
  for (const item of items) {
    if (item && typeof item === "object") {
      for (const key of keys) {
        const value = (item as Record<string, unknown>)[key];
        if (typeof value === "string" && value.length > 0) return value;
      }
    }
  }
  return undefined;
}

export async function discoverFixtures(
  callTool: (name: string, args?: Record<string, unknown>) => Promise<ToolResult>
): Promise<LiveFixtures> {
  const fixtures: LiveFixtures = {};

  const camerasResult = await callTool("verkada_get_cameras", {});
  if (!camerasResult.isError) {
    const data = parseResultJson(camerasResult);
    const cameras = Array.isArray(data) ? data : (data as { cameras?: unknown[] }).cameras ?? [];
    fixtures.cameraId = firstId(cameras, "camera_id", "device_id");
  }

  const usersResult = await callTool("verkada_list_access_users", {});
  if (!usersResult.isError) {
    const data = parseResultJson(usersResult) as { access_members?: unknown[] };
    const members = data.access_members ?? [];
    fixtures.accessUserId = firstId(members, "user_id");
    fixtures.accessUserEmail = firstId(members, "email");
  }

  const doorsResult = await callTool("verkada_get_doors", {});
  if (!doorsResult.isError) {
    const data = parseResultJson(doorsResult) as { doors?: unknown[] };
    const doors = data.doors ?? [];
    fixtures.doorId = firstId(doors, "door_id");
    fixtures.siteId = firstId(doors, "site_id");
  }

  const groupsResult = await callTool("verkada_list_access_groups", {});
  if (!groupsResult.isError) {
    const data = parseResultJson(groupsResult);
    const groups = Array.isArray(data) ? data : (data as { access_groups?: unknown[] }).access_groups ?? [];
    fixtures.groupId = firstId(groups, "group_id", "id");
  }

  const lpoiResult = await callTool("verkada_list_license_plates_of_interest", {});
  if (!lpoiResult.isError) {
    const data = parseResultJson(lpoiResult) as { license_plates_of_interest?: unknown[] };
    const plates = data.license_plates_of_interest ?? [];
    fixtures.licensePlate = firstId(plates, "license_plate_number", "license_plate");
  }

  const poiResult = await callTool("verkada_list_persons_of_interest", {});
  if (!poiResult.isError) {
    const data = parseResultJson(poiResult);
    const people = Array.isArray(data) ? data : (data as { persons_of_interest?: unknown[] }).persons_of_interest ?? [];
    fixtures.personId = firstId(people, "person_id", "id");
  }

  return fixtures;
}
