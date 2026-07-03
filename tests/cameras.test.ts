import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { registerCameraTools, buildCameraHistoryUrl, adjustFootageUrlDuration } from "../src/tools/cameras.js";
import { clearCommandSubdomainCache } from "../src/services/command-subdomain.js";
import { mockClient } from "./helpers.js";
import {
  createHarness,
  expectApiError,
  expectSuccess,
  expectValidationError,
  resetMocks,
} from "./helpers.js";

describe("camera tools", () => {
  beforeEach(() => {
    resetMocks();
    clearCommandSubdomainCache();
  });

  afterEach(async () => {
    // no shared harness state
  });

  describe("verkada_get_cameras", () => {
    it("accepts empty args and calls GET /cameras/v1/devices", async () => {
      mockClient.get.mockResolvedValue({ cameras: [{ camera_id: "cam-1" }] });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_cameras", {});
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/devices");
      expect(result.content?.[0]).toMatchObject({ type: "text" });
      await harness.close();
    });

    it("rejects unknown fields (strict schema)", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_cameras", { extra: true });
      expectValidationError(result);
      expect(mockClient.get).not.toHaveBeenCalled();
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("network down"));
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_cameras", {});
      expectApiError(result, "network down");
      await harness.close();
    });
  });

  describe("verkada_get_alerts", () => {
    it("accepts optional filters and calls GET /cameras/v1/alerts", async () => {
      mockClient.get.mockResolvedValue({ notifications: [] });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_alerts", {
        start_time: 1700000000,
        end_time: 1700003600,
        page_token: "next-page",
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/alerts", {
        start_time: 1700000000,
        end_time: 1700003600,
        include_image_url: undefined,
        page_size: undefined,
        page_token: "next-page",
        notification_type: undefined,
      });
      await harness.close();
    });

    it("passes include_image_url, page_size, and notification_type to API", async () => {
      mockClient.get.mockResolvedValue({ notifications: [] });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_alerts", {
        include_image_url: true,
        page_size: 50,
        notification_type: "motion,license_plate_of_interest",
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/alerts", {
        start_time: undefined,
        end_time: undefined,
        include_image_url: true,
        page_size: 50,
        page_token: undefined,
        notification_type: "motion,license_plate_of_interest",
      });
      await harness.close();
    });

    it("rejects page_size over 200", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_alerts", { page_size: 250 });
      expectValidationError(result);
      expect(mockClient.get).not.toHaveBeenCalled();
      await harness.close();
    });

    it("rejects camera_id (not supported by API)", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_alerts", { camera_id: "cam-1" });
      expectValidationError(result);
      expect(mockClient.get).not.toHaveBeenCalled();
      await harness.close();
    });

    it("rejects invalid start_time type", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_alerts", { start_time: "not-a-number" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("alerts unavailable"));
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_alerts", {});
      expectApiError(result, "alerts unavailable");
      await harness.close();
    });
  });

  describe("verkada_get_object_counts", () => {
    it("requires camera_id and calls analytics endpoint", async () => {
      mockClient.get.mockResolvedValue({ object_counts: [] });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_object_counts", { camera_id: "cam-1" });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/analytics/object_counts", {
        camera_id: "cam-1",
        start_time: undefined,
        end_time: undefined,
        page_size: undefined,
        page_token: undefined,
      });
      await harness.close();
    });

    it("passes pagination params to the API", async () => {
      mockClient.get.mockResolvedValue({ object_counts: [], next_page_token: "tok-2" });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_object_counts", {
        camera_id: "cam-1",
        page_size: 50,
        page_token: "tok-1",
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/analytics/object_counts", {
        camera_id: "cam-1",
        start_time: undefined,
        end_time: undefined,
        page_size: 50,
        page_token: "tok-1",
      });
      await harness.close();
    });

    it("rejects missing camera_id", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_object_counts", {});
      expectValidationError(result);
      await harness.close();
    });

    it("rejects page_size over 200", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_object_counts", {
        camera_id: "cam-1",
        page_size: 250,
      });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("counts failed"));
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_object_counts", { camera_id: "cam-1" });
      expectApiError(result, "counts failed");
      await harness.close();
    });
  });

  describe("verkada_get_latest_thumbnail", () => {
    it("calls thumbnails endpoint with default low-res and returns base64", async () => {
      mockClient.getBinary.mockResolvedValue({
        data: Buffer.from("jpeg-bytes"),
        contentType: "image/jpeg",
      });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_latest_thumbnail", { camera_id: "cam-1" });
      expectSuccess(result);
      expect(mockClient.getBinary).toHaveBeenCalledWith("/cameras/v1/footage/thumbnails/latest", {
        camera_id: "cam-1",
        resolution: "low-res",
      });
      const body = JSON.parse((result.content?.[0] as { text: string }).text);
      expect(body.image_base64).toBe(Buffer.from("jpeg-bytes").toString("base64"));
      await harness.close();
    });

    it("maps high alias to hi-res", async () => {
      mockClient.getBinary.mockResolvedValue({
        data: Buffer.from("jpeg-bytes"),
        contentType: "image/jpeg",
      });
      const harness = await createHarness(registerCameraTools);

      await harness.callTool("verkada_get_latest_thumbnail", {
        camera_id: "cam-1",
        resolution: "high",
      });
      expect(mockClient.getBinary).toHaveBeenCalledWith("/cameras/v1/footage/thumbnails/latest", {
        camera_id: "cam-1",
        resolution: "hi-res",
      });
      await harness.close();
    });

    it("rejects missing camera_id", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_latest_thumbnail", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.getBinary.mockRejectedValue(new Error("thumbnail missing"));
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_latest_thumbnail", { camera_id: "cam-1" });
      expectApiError(result, "thumbnail missing");
      await harness.close();
    });
  });

  describe("buildCameraHistoryUrl", () => {
    it("builds Command deep link with duration and initialVideoTime", () => {
      const url = buildCameraHistoryUrl("cam-abc", 1589007600, 300, "verkada-sg");
      expect(url).toBe(
        "https://verkada-sg.command.verkada.com/cameras/cam-abc/history/300/1589007600/?duration=300&initialVideoTime=1589007600000"
      );
    });
  });

  describe("adjustFootageUrlDuration", () => {
    it("rewrites duration and timestamp in API-returned URL", () => {
      const apiUrl =
        "https://verkada-sg.command.verkada.com/cameras/cam-abc/history/86400/1589007600/?duration=86400&initialVideoTime=1589007600000";
      const adjusted = adjustFootageUrlDuration(apiUrl, 300, 1589007600);
      expect(adjusted).toBe(
        "https://verkada-sg.command.verkada.com/cameras/cam-abc/history/300/1589007600/?duration=300&initialVideoTime=1589007600000"
      );
    });
  });

  describe("verkada_get_camera_history_url", () => {
    it("builds URL locally when org_subdomain is provided", async () => {
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_camera_history_url", {
        camera_id: "cam-abc",
        start_time: 1589007600,
        duration_seconds: 300,
        org_subdomain: "verkada-sg",
      });
      expectSuccess(result);
      expect(mockClient.get).not.toHaveBeenCalled();
      const body = JSON.parse((result.content?.[0] as { text: string }).text);
      expect(body.url).toBe(
        "https://verkada-sg.command.verkada.com/cameras/cam-abc/history/300/1589007600/?duration=300&initialVideoTime=1589007600000"
      );
      expect(body.note).toContain("deep-link format");
      await harness.close();
    });

    it("calls footage/link API when org_subdomain is omitted and discovery fails", async () => {
      mockClient.get.mockImplementation(async (path: string) => {
        if (path === "/cameras/v1/devices") return { cameras: [] };
        if (path === "/cameras/v1/footage/link") {
          return {
            url: "https://verkada-sg.command.verkada.com/cameras/cam-abc/history/86400/1589007600/?duration=86400&initialVideoTime=1589007600000",
          };
        }
        return {};
      });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_camera_history_url", {
        camera_id: "cam-abc",
        start_time: 1589007600,
        duration_seconds: 300,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/devices");
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/footage/link", {
        camera_id: "cam-abc",
        timestamp: 1589007600,
      });
      const body = JSON.parse((result.content?.[0] as { text: string }).text);
      expect(body.url).toContain("/history/300/1589007600/");
      expect(body.url).toContain("duration=300");
      expect(body.note).toContain("footage/link");
      await harness.close();
    });

    it("discovers subdomain and builds URL locally when org_subdomain is omitted", async () => {
      mockClient.get.mockImplementation(async (path: string, params?: Record<string, unknown>) => {
        if (path === "/cameras/v1/devices") return { cameras: [{ camera_id: "cam-1" }] };
        if (path === "/cameras/v1/footage/link") {
          return {
            url: "https://verkada-sg.command.verkada.com/cameras/cam-1/history/86400/1589007600/?duration=86400&initialVideoTime=1589007600000",
          };
        }
        return {};
      });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_camera_history_url", {
        camera_id: "cam-abc",
        start_time: 1589007600,
        duration_seconds: 300,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/devices");
      expect(mockClient.get).toHaveBeenCalledWith("/cameras/v1/footage/link", {
        camera_id: "cam-1",
        timestamp: expect.any(Number),
      });
      const body = JSON.parse((result.content?.[0] as { text: string }).text);
      expect(body.url).toBe(
        "https://verkada-sg.command.verkada.com/cameras/cam-abc/history/300/1589007600/?duration=300&initialVideoTime=1589007600000"
      );
      expect(body.note).toContain("deep-link format");
      await harness.close();
    });

    it("requires camera_id and start_time", async () => {
      const harness = await createHarness(registerCameraTools);
      const missingCamera = await harness.callTool("verkada_get_camera_history_url", {
        start_time: 1589007600,
      });
      expectValidationError(missingCamera);

      const missingTime = await harness.callTool("verkada_get_camera_history_url", {
        camera_id: "cam-abc",
      });
      expectValidationError(missingTime);
      await harness.close();
    });

    it("returns isError when API returns no url", async () => {
      mockClient.get.mockImplementation(async (path: string) => {
        if (path === "/cameras/v1/devices") return { cameras: [] };
        return {};
      });
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_camera_history_url", {
        camera_id: "cam-abc",
        start_time: 1589007600,
      });
      expectApiError(result, "Footage link API returned no url");
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockImplementation(async (path: string) => {
        if (path === "/cameras/v1/devices") return { cameras: [] };
        if (path === "/cameras/v1/footage/link") throw new Error("camera not found");
        return {};
      });
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_camera_history_url", {
        camera_id: "cam-offline",
        start_time: 1589007600,
      });
      expectApiError(result, "camera not found");
      await harness.close();
    });
  });

  describe("verkada_get_streaming_token", () => {
    it("calls request GET with useApiKey", async () => {
      mockClient.request.mockResolvedValue({ jwt: "token-abc" });
      const harness = await createHarness(registerCameraTools);

      const result = await harness.callTool("verkada_get_streaming_token", {});
      expectSuccess(result);
      expect(mockClient.request).toHaveBeenCalledWith("GET", "/cameras/v1/footage/token", {
        useApiKey: true,
      });
      await harness.close();
    });

    it("rejects unknown fields", async () => {
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_streaming_token", { jwt: true });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.request.mockRejectedValue(new Error("token denied"));
      const harness = await createHarness(registerCameraTools);
      const result = await harness.callTool("verkada_get_streaming_token", {});
      expectApiError(result, "token denied");
      await harness.close();
    });
  });
});
