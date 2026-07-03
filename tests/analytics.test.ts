import { beforeEach, describe, expect, it } from "vitest";
import { registerAnalyticsTools } from "../src/tools/analytics.js";
import { mockClient } from "./helpers.js";
import {
  createHarness,
  expectApiError,
  expectSuccess,
  expectValidationError,
  resetMocks,
} from "./helpers.js";

describe("analytics tools", () => {
  beforeEach(() => resetMocks());

  describe("verkada_get_audit_logs", () => {
    it("fetches audit logs via GET /core/v1/audit_log", async () => {
      mockClient.get.mockResolvedValue({ audit_logs: [] });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_get_audit_logs", {
        start_time: 1700000000,
        page_size: 100,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/core/v1/audit_log", {
        start_time: 1700000000,
        end_time: undefined,
        page_size: 100,
        page_token: undefined,
      });
      await harness.close();
    });

    it("rejects page_size over 200", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_audit_logs", { page_size: 250 });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("audit failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_audit_logs", {});
      expectApiError(result, "audit failed");
      await harness.close();
    });
  });

  describe("verkada_list_license_plates_of_interest", () => {
    it("lists LPOIs via GET", async () => {
      mockClient.get.mockResolvedValue({ license_plates_of_interest: [] });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_list_license_plates_of_interest", {});
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith(
        "/cameras/v1/analytics/lpr/license_plate_of_interest"
      );
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("lpr list failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_list_license_plates_of_interest", {});
      expectApiError(result, "lpr list failed");
      await harness.close();
    });
  });

  describe("verkada_create_license_plate_of_interest", () => {
    it("creates LPOI via POST", async () => {
      mockClient.post.mockResolvedValue({ license_plate: "ABC123" });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_create_license_plate_of_interest", {
        license_plate: "ABC123",
        description: "Stolen vehicle",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith(
        "/cameras/v1/analytics/lpr/license_plate_of_interest",
        { license_plate: "ABC123", description: "Stolen vehicle" }
      );
      await harness.close();
    });

    it("rejects empty license_plate", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_create_license_plate_of_interest", {
        license_plate: "",
        description: "Stolen vehicle",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects missing description", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_create_license_plate_of_interest", {
        license_plate: "ABC123",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.post.mockRejectedValue(new Error("create lpoi failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_create_license_plate_of_interest", {
        license_plate: "XYZ",
        description: "Test plate",
      });
      expectApiError(result, "create lpoi failed");
      await harness.close();
    });
  });

  describe("verkada_delete_license_plate_of_interest", () => {
    it("deletes LPOI via DELETE with query param", async () => {
      mockClient.delete.mockResolvedValue(undefined);
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_delete_license_plate_of_interest", {
        license_plate: "ABC123",
      });
      expectSuccess(result);
      expect(mockClient.delete).toHaveBeenCalledWith(
        "/cameras/v1/analytics/lpr/license_plate_of_interest",
        { license_plate: "ABC123" }
      );
      await harness.close();
    });

    it("rejects missing license_plate", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_delete_license_plate_of_interest", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.delete.mockRejectedValue(new Error("delete lpoi failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_delete_license_plate_of_interest", {
        license_plate: "ABC123",
      });
      expectApiError(result, "delete lpoi failed");
      await harness.close();
    });
  });

  describe("verkada_get_lpr_images", () => {
    it("fetches seen plates via GET /cameras/v1/analytics/lpr/images", async () => {
      mockClient.get.mockResolvedValue({
        camera_id: "cam-1",
        detections: [{ license_plate: "ABC123", timestamp: 1700000000 }],
      });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_get_lpr_images", {
        camera_id: "cam-1",
        start_time: 1700000000,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/analytics/lpr/images", {
        camera_id: "cam-1",
        license_plate: undefined,
        start_time: 1700000000,
        end_time: undefined,
        page_size: undefined,
        page_token: undefined,
      });
      await harness.close();
    });

    it("passes optional license_plate filter", async () => {
      mockClient.get.mockResolvedValue({ camera_id: "cam-1", detections: [] });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_get_lpr_images", {
        camera_id: "cam-1",
        license_plate: "ABC123",
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/analytics/lpr/images", {
        camera_id: "cam-1",
        license_plate: "ABC123",
        start_time: undefined,
        end_time: undefined,
        page_size: undefined,
        page_token: undefined,
      });
      await harness.close();
    });

    it("rejects missing camera_id", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_lpr_images", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("lpr images failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_lpr_images", { camera_id: "cam-1" });
      expectApiError(result, "lpr images failed");
      await harness.close();
    });
  });

  describe("verkada_get_lpr_timestamps", () => {
    it("fetches timestamps via GET", async () => {
      mockClient.get.mockResolvedValue({
        camera_id: "cam-1",
        license_plate: "ABC123",
        detections: [1700000000],
      });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_get_lpr_timestamps", {
        camera_id: "cam-1",
        license_plate: "ABC123",
        start_time: 1700000000,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/analytics/lpr/timestamps", {
        camera_id: "cam-1",
        license_plate: "ABC123",
        start_time: 1700000000,
        end_time: undefined,
        page_size: undefined,
        page_token: undefined,
      });
      await harness.close();
    });

    it("rejects missing camera_id and license_plate", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_lpr_timestamps", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("timestamps failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_lpr_timestamps", {
        camera_id: "cam-1",
        license_plate: "ABC123",
      });
      expectApiError(result, "timestamps failed");
      await harness.close();
    });
  });

  describe("verkada_list_persons_of_interest", () => {
    it("lists POIs via GET", async () => {
      mockClient.get.mockResolvedValue([{ person_id: "p-1" }]);
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_list_persons_of_interest", {});
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/people/person_of_interest");
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("poi list failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_list_persons_of_interest", {});
      expectApiError(result, "poi list failed");
      await harness.close();
    });
  });

  describe("verkada_create_person_of_interest", () => {
    it("creates POI via POST with base64_image field", async () => {
      mockClient.post.mockResolvedValue({ person_id: "p-1" });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_create_person_of_interest", {
        label: "Shoplifter",
        face_image_base64: "aGVsbG8=",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith("/cameras/v1/people/person_of_interest", {
        label: "Shoplifter",
        base64_image: "aGVsbG8=",
      });
      await harness.close();
    });

    it("rejects missing label", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_create_person_of_interest", {
        face_image_base64: "aGVsbG8=",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.post.mockRejectedValue(new Error("create poi failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_create_person_of_interest", {
        label: "Test",
        face_image_base64: "aGVsbG8=",
      });
      expectApiError(result, "create poi failed");
      await harness.close();
    });
  });

  describe("verkada_delete_person_of_interest", () => {
    it("deletes POI via DELETE with person_id param", async () => {
      mockClient.delete.mockResolvedValue(undefined);
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_delete_person_of_interest", {
        person_id: "p-1",
      });
      expectSuccess(result);
      expect(mockClient.delete).toHaveBeenCalledWith("/cameras/v1/people/person_of_interest", {
        person_id: "p-1",
      });
      await harness.close();
    });

    it("rejects missing person_id", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_delete_person_of_interest", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.delete.mockRejectedValue(new Error("delete poi failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_delete_person_of_interest", { person_id: "p-1" });
      expectApiError(result, "delete poi failed");
      await harness.close();
    });
  });

  describe("verkada_get_sensor_data", () => {
    it("fetches sensor data via GET /environment/v1/data", async () => {
      mockClient.get.mockResolvedValue({ device_id: "s-1", readings: [] });
      const harness = await createHarness(registerAnalyticsTools);

      const result = await harness.callTool("verkada_get_sensor_data", {
        device_id: "s-1",
        start_time: 1700000000,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/environment/v1/data", {
        device_id: "s-1",
        start_time: 1700000000,
        end_time: undefined,
      });
      await harness.close();
    });

    it("rejects missing device_id", async () => {
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_sensor_data", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("sensor failed"));
      const harness = await createHarness(registerAnalyticsTools);
      const result = await harness.callTool("verkada_get_sensor_data", { device_id: "s-1" });
      expectApiError(result, "sensor failed");
      await harness.close();
    });
  });
});
