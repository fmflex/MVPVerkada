import { beforeEach, describe, expect, it } from "vitest";
import { registerOrgTools } from "../src/tools/org.js";
import {
  clearCommandSubdomainCache,
  parseCommandSubdomainFromUrl,
} from "../src/services/command-subdomain.js";
import { mockClient } from "./helpers.js";
import {
  createHarness,
  expectApiError,
  expectSuccess,
  expectValidationError,
  resetMocks,
} from "./helpers.js";

describe("org tools", () => {
  beforeEach(() => {
    resetMocks();
    clearCommandSubdomainCache();
  });

  describe("parseCommandSubdomainFromUrl", () => {
    it("extracts subdomain from Command footage URL", () => {
      expect(
        parseCommandSubdomainFromUrl(
          "https://verkada-sg.command.verkada.com/cameras/cam-1/history/300/1/?duration=300&initialVideoTime=1000"
        )
      ).toBe("verkada-sg");
    });
  });

  describe("verkada_get_org_info", () => {
    it("returns session org context and discovered subdomain", async () => {
      mockClient.get.mockImplementation(async (path: string) => {
        if (path === "/cameras/v1/devices") return { cameras: [{ camera_id: "cam-1" }] };
        if (path === "/cameras/v1/footage/link") {
          return {
            url: "https://verkada-sg.command.verkada.com/cameras/cam-1/history/86400/1/?duration=86400&initialVideoTime=1000",
          };
        }
        return {};
      });
      const harness = await createHarness(registerOrgTools);

      const result = await harness.callTool("verkada_get_org_info", {});
      expectSuccess(result);
      const body = JSON.parse((result.content?.[0] as { text: string }).text);
      expect(body.org_id).toBe("org-test");
      expect(body.region).toBe("us");
      expect(body.command_subdomain).toBe("verkada-sg");
      expect(body.command_url).toBe("https://verkada-sg.command.verkada.com");
      expect(body.command_subdomain_source).toBe("discovered");
      await harness.close();
    });

    it("accepts empty args and rejects unknown fields", async () => {
      mockClient.get.mockResolvedValue({ cameras: [] });
      const harness = await createHarness(registerOrgTools);

      const ok = await harness.callTool("verkada_get_org_info", {});
      expectSuccess(ok);

      const bad = await harness.callTool("verkada_get_org_info", { extra: true });
      expectValidationError(bad);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("org unavailable"));
      const harness = await createHarness(registerOrgTools);
      const result = await harness.callTool("verkada_get_org_info", {});
      expectApiError(result, "org unavailable");
      await harness.close();
    });
  });
});
