import { afterAll, beforeAll, describe, expect, it, type TestContext } from "vitest";
import { expectSuccess, resultText } from "../helpers.js";
import {
  createLiveHarness,
  discoverFixtures,
  hasLiveCredentials,
  hourAgoRange,
  parseResultJson,
  runPhysicalTests,
  runWriteTests,
  type LiveFixtures,
} from "./helpers.js";

function skipWithout(ctx: TestContext, value: unknown, label: string): void {
  if (!value) ctx.skip(`No ${label} in org — skipping`);
}

describe.skipIf(!hasLiveCredentials())("Verkada live API integration", () => {
  let harness: Awaited<ReturnType<typeof createLiveHarness>>;
  let fixtures: LiveFixtures = {};

  beforeAll(async () => {
    harness = await createLiveHarness();
    fixtures = await discoverFixtures((name, args) => harness.callTool(name, args));
  }, 120_000);

  afterAll(async () => {
    await harness?.close();
  });

  // -------------------------------------------------------------------------
  // Cameras (5)
  // -------------------------------------------------------------------------
  describe("cameras", () => {
    it("verkada_get_cameras", async () => {
      const result = await harness.callTool("verkada_get_cameras", {});
      expectSuccess(result);
      expect(parseResultJson(result)).toBeTruthy();
    });

    it("verkada_get_alerts", async () => {
      const result = await harness.callTool("verkada_get_alerts", {
        ...hourAgoRange(),
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_object_counts", async (ctx) => {
      skipWithout(ctx, fixtures.cameraId, "camera");
      const result = await harness.callTool("verkada_get_object_counts", {
        camera_id: fixtures.cameraId!,
        ...hourAgoRange(),
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_latest_thumbnail", async (ctx) => {
      skipWithout(ctx, fixtures.cameraId, "camera");
      const result = await harness.callTool("verkada_get_latest_thumbnail", {
        camera_id: fixtures.cameraId!,
        resolution: "low",
      });
      expectSuccess(result);
      const data = parseResultJson(result) as { image_base64?: string; content_type?: string };
      expect(data.image_base64).toBeTypeOf("string");
      expect(data.content_type).toMatch(/image/);
    });

    it("verkada_get_streaming_token", async () => {
      const result = await harness.callTool("verkada_get_streaming_token", {});
      expectSuccess(result);
      const data = parseResultJson(result) as { jwt?: string };
      expect(data.jwt).toBeTypeOf("string");
    });
  });

  // -------------------------------------------------------------------------
  // Access — read-only (6)
  // -------------------------------------------------------------------------
  describe("access (read-only)", () => {
    it("verkada_list_access_users", async () => {
      const result = await harness.callTool("verkada_list_access_users", {});
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_access_user by user_id", async (ctx) => {
      skipWithout(ctx, fixtures.accessUserId, "access user");
      const result = await harness.callTool("verkada_get_access_user", {
        user_id: fixtures.accessUserId!,
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_access_user by email", async (ctx) => {
      skipWithout(ctx, fixtures.accessUserEmail, "access user email");
      const result = await harness.callTool("verkada_get_access_user", {
        email: fixtures.accessUserEmail!,
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_doors", async () => {
      const result = await harness.callTool("verkada_get_doors", {});
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_doors filtered by site_ids", async (ctx) => {
      skipWithout(ctx, fixtures.siteId, "site");
      const result = await harness.callTool("verkada_get_doors", {
        site_ids: [fixtures.siteId!],
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_list_access_groups", async () => {
      const result = await harness.callTool("verkada_list_access_groups", {});
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_access_events", async () => {
      const result = await harness.callTool("verkada_get_access_events", {
        ...hourAgoRange(),
        page_size: 10,
      });
      expectSuccess(result);
      parseResultJson(result);
    });
  });

  // -------------------------------------------------------------------------
  // Access — physical (2, opt-in)
  // -------------------------------------------------------------------------
  describe.skipIf(!runPhysicalTests())("access (physical — unlock)", () => {
    it("verkada_unlock_door_admin", async (ctx) => {
      skipWithout(ctx, fixtures.doorId, "door");
      const result = await harness.callTool("verkada_unlock_door_admin", {
        door_id: fixtures.doorId!,
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_unlock_door_user", async (ctx) => {
      skipWithout(ctx, fixtures.doorId, "door");
      skipWithout(ctx, fixtures.accessUserId, "access user");
      const result = await harness.callTool("verkada_unlock_door_user", {
        door_id: fixtures.doorId!,
        user_id: fixtures.accessUserId!,
      });
      expectSuccess(result);
      parseResultJson(result);
    });
  });

  // -------------------------------------------------------------------------
  // Users — read-only (1)
  // -------------------------------------------------------------------------
  describe("users (read-only)", () => {
    it("verkada_get_user", async (ctx) => {
      skipWithout(ctx, fixtures.accessUserId, "user");
      const result = await harness.callTool("verkada_get_user", {
        user_id: fixtures.accessUserId!,
      });
      expectSuccess(result);
      parseResultJson(result);
    });
  });

  // -------------------------------------------------------------------------
  // Analytics — read-only (6)
  // -------------------------------------------------------------------------
  describe("analytics (read-only)", () => {
    it("verkada_get_audit_logs", async () => {
      const result = await harness.callTool("verkada_get_audit_logs", {
        ...hourAgoRange(),
        page_size: 10,
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_list_license_plates_of_interest", async () => {
      const result = await harness.callTool("verkada_list_license_plates_of_interest", {});
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_lpr_images", async (ctx) => {
      skipWithout(ctx, fixtures.cameraId, "camera");
      const result = await harness.callTool("verkada_get_lpr_images", {
        camera_id: fixtures.cameraId!,
        ...hourAgoRange(),
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_lpr_timestamps", async (ctx) => {
      skipWithout(ctx, fixtures.cameraId, "camera");
      skipWithout(ctx, fixtures.licensePlate, "license plate of interest");
      const result = await harness.callTool("verkada_get_lpr_timestamps", {
        camera_id: fixtures.cameraId!,
        license_plate: fixtures.licensePlate!,
        ...hourAgoRange(),
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_list_persons_of_interest", async () => {
      const result = await harness.callTool("verkada_list_persons_of_interest", {});
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_get_sensor_data", async (ctx) => {
      skipWithout(ctx, fixtures.sensorDeviceId, "sensor device");
      const result = await harness.callTool("verkada_get_sensor_data", {
        device_id: fixtures.sensorDeviceId!,
        ...hourAgoRange(),
      });
      expectSuccess(result);
      parseResultJson(result);
    });
  });

  // -------------------------------------------------------------------------
  // Write lifecycle tests (opt-in) — create → verify → cleanup
  // -------------------------------------------------------------------------
  describe.skipIf(!runWriteTests())("write operations (create / update / delete)", () => {
    const suffix = Date.now().toString(36);
    const testExternalId = `mcp-integration-${suffix}`;
    const testPlate = `MCP${suffix.toUpperCase().slice(0, 6)}`;

    it("verkada_create_user → verkada_get_user → verkada_update_user → verkada_delete_user", async () => {
      const createResult = await harness.callTool("verkada_create_user", {
        external_id: testExternalId,
        first_name: "MCP",
        last_name: "Test",
      });
      expectSuccess(createResult);
      const created = parseResultJson(createResult) as { user_id?: string };
      expect(created.user_id).toBeTypeOf("string");

      const getResult = await harness.callTool("verkada_get_user", {
        external_id: testExternalId,
      });
      expectSuccess(getResult);

      const updateResult = await harness.callTool("verkada_update_user", {
        external_id: testExternalId,
        last_name: "Updated",
      });
      expectSuccess(updateResult);

      const deleteResult = await harness.callTool("verkada_delete_user", {
        external_id: testExternalId,
      });
      expectSuccess(deleteResult);
    });

    it("verkada_create_license_plate_of_interest → verkada_delete_license_plate_of_interest", async () => {
      const createResult = await harness.callTool("verkada_create_license_plate_of_interest", {
        license_plate: testPlate,
        description: "MCP integration test — safe to delete",
      });
      expectSuccess(createResult);

      const listResult = await harness.callTool("verkada_list_license_plates_of_interest", {});
      expectSuccess(listResult);

      const deleteResult = await harness.callTool("verkada_delete_license_plate_of_interest", {
        license_plate: testPlate,
      });
      expectSuccess(deleteResult);
    });

    it("verkada_create_person_of_interest → verkada_delete_person_of_interest", async () => {
      // Minimal 1×1 PNG — API may reject if not a face; documents real endpoint behavior.
      const tinyPng =
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
      const label = `mcp-poi-${suffix}`;

      const createResult = await harness.callTool("verkada_create_person_of_interest", {
        label,
        face_image_base64: tinyPng,
      });

      if (createResult.isError) {
        // Some orgs reject non-face images — still a valid live API check.
        expect(resultText(createResult)).toMatch(/^Error:/);
        return;
      }

      expectSuccess(createResult);
      const created = parseResultJson(createResult) as { person_id?: string };
      expect(created.person_id).toBeTypeOf("string");

      const deleteResult = await harness.callTool("verkada_delete_person_of_interest", {
        person_id: created.person_id!,
      });
      expectSuccess(deleteResult);
    });

    it("verkada_add_user_to_group → verkada_remove_user_from_group", async (ctx) => {
      skipWithout(ctx, fixtures.groupId, "access group");
      skipWithout(ctx, fixtures.accessUserId, "access user");

      const addResult = await harness.callTool("verkada_add_user_to_group", {
        group_id: fixtures.groupId!,
        user_id: fixtures.accessUserId!,
      });
      expectSuccess(addResult);

      const removeResult = await harness.callTool("verkada_remove_user_from_group", {
        group_id: fixtures.groupId!,
        user_id: fixtures.accessUserId!,
      });
      expectSuccess(removeResult);
    });

    it("verkada_set_user_pin", async (ctx) => {
      skipWithout(ctx, fixtures.accessUserId, "access user");
      const result = await harness.callTool("verkada_set_user_pin", {
        user_id: fixtures.accessUserId!,
        pin: "9876",
      });
      expectSuccess(result);
      parseResultJson(result);
    });

    it("verkada_add_access_card", async (ctx) => {
      skipWithout(ctx, fixtures.accessUserId, "access user");
      const result = await harness.callTool("verkada_add_access_card", {
        user_id: fixtures.accessUserId!,
        type: "Standard 26-bit Wiegand",
        facility_code: "1",
        card_number: String(Math.floor(Math.random() * 90000) + 10000),
        active: false,
      });
      expectSuccess(result);
      parseResultJson(result);
    });
  });
});
