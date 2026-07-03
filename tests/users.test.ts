import { beforeEach, describe, expect, it } from "vitest";
import { registerUserTools } from "../src/tools/users.js";
import { mockClient } from "./helpers.js";
import {
  createHarness,
  expectApiError,
  expectSuccess,
  expectValidationError,
  resetMocks,
} from "./helpers.js";

describe("user tools", () => {
  beforeEach(() => resetMocks());

  describe("verkada_create_user", () => {
    it("creates user via POST /core/v1/user", async () => {
      mockClient.post.mockResolvedValue({ user_id: "u-1", external_id: "emp-1" });
      const harness = await createHarness(registerUserTools);

      const result = await harness.callTool("verkada_create_user", {
        external_id: "emp-1",
        email: "john@example.com",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith("/core/v1/user", {
        external_id: "emp-1",
        email: "john@example.com",
        first_name: undefined,
        last_name: undefined,
      });
      await harness.close();
    });

    it("rejects missing external_id", async () => {
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_create_user", { email: "a@b.com" });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects invalid email", async () => {
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_create_user", {
        external_id: "emp-1",
        email: "not-an-email",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects external_id only without email, first_name, or last_name", async () => {
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_create_user", { external_id: "emp-1" });
      expectValidationError(result);
      expect(mockClient.post).not.toHaveBeenCalled();
      await harness.close();
    });

    it("accepts external_id with first_name", async () => {
      mockClient.post.mockResolvedValue({ user_id: "u-2", external_id: "emp-2" });
      const harness = await createHarness(registerUserTools);

      const result = await harness.callTool("verkada_create_user", {
        external_id: "emp-2",
        first_name: "Jane",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith("/core/v1/user", {
        external_id: "emp-2",
        email: undefined,
        first_name: "Jane",
        last_name: undefined,
      });
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.post.mockRejectedValue(new Error("create failed"));
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_create_user", {
        external_id: "emp-1",
        email: "john@example.com",
      });
      expectApiError(result, "create failed");
      await harness.close();
    });
  });

  describe("verkada_get_user", () => {
    it("gets user by user_id", async () => {
      mockClient.get.mockResolvedValue({ user_id: "u-1" });
      const harness = await createHarness(registerUserTools);

      const result = await harness.callTool("verkada_get_user", { user_id: "u-1" });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/core/v1/user", {
        user_id: "u-1",
        external_id: undefined,
      });
      await harness.close();
    });

    it("rejects when no identifier provided", async () => {
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_get_user", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("not found"));
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_get_user", { external_id: "emp-1" });
      expectApiError(result, "not found");
      await harness.close();
    });
  });

  describe("verkada_update_user", () => {
    it("updates user via PUT /core/v1/user", async () => {
      mockClient.put.mockResolvedValue({ user_id: "u-1", email: "new@example.com" });
      const harness = await createHarness(registerUserTools);

      const result = await harness.callTool("verkada_update_user", {
        external_id: "emp-1",
        email: "new@example.com",
      });
      expectSuccess(result);
      expect(mockClient.put).toHaveBeenCalledWith(
        "/core/v1/user",
        { email: "new@example.com", first_name: undefined, last_name: undefined },
        { user_id: undefined, external_id: "emp-1" }
      );
      await harness.close();
    });

    it("rejects when no identifier provided", async () => {
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_update_user", { email: "x@y.com" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.put.mockRejectedValue(new Error("update failed"));
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_update_user", { user_id: "u-1" });
      expectApiError(result, "update failed");
      await harness.close();
    });
  });

  describe("verkada_delete_user", () => {
    it("deletes user via DELETE /core/v1/user", async () => {
      mockClient.delete.mockResolvedValue(undefined);
      const harness = await createHarness(registerUserTools);

      const result = await harness.callTool("verkada_delete_user", { user_id: "u-1" });
      expectSuccess(result);
      expect(mockClient.delete).toHaveBeenCalledWith("/core/v1/user", {
        user_id: "u-1",
        external_id: undefined,
      });
      await harness.close();
    });

    it("rejects when no identifier provided", async () => {
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_delete_user", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.delete.mockRejectedValue(new Error("delete failed"));
      const harness = await createHarness(registerUserTools);
      const result = await harness.callTool("verkada_delete_user", { external_id: "emp-1" });
      expectApiError(result, "delete failed");
      await harness.close();
    });
  });
});
