import { beforeEach, describe, expect, it } from "vitest";
import { registerAccessTools } from "../src/tools/access.js";
import { mockClient } from "./helpers.js";
import {
  createHarness,
  expectApiError,
  expectSuccess,
  expectValidationError,
  resetMocks,
} from "./helpers.js";

describe("access tools", () => {
  beforeEach(() => resetMocks());

  describe("verkada_list_access_users", () => {
    it("lists users via GET /access/v1/access_users", async () => {
      mockClient.get.mockResolvedValue({ access_members: [] });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_list_access_users", {});
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/access/v1/access_users", {
        include_visitors: undefined,
      });
      await harness.close();
    });

    it("rejects invalid include_visitors type", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_list_access_users", {
        include_visitors: "yes",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("list failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_list_access_users", {});
      expectApiError(result, "list failed");
      await harness.close();
    });
  });

  describe("verkada_get_access_user", () => {
    it("gets user by email", async () => {
      mockClient.get.mockResolvedValue({ user_id: "u-1" });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_get_access_user", {
        email: "john@example.com",
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/access/v1/access_users/user", {
        user_id: undefined,
        external_id: undefined,
        email: "john@example.com",
        employee_id: undefined,
      });
      await harness.close();
    });

    it("rejects when no identifier provided", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_access_user", {});
      expectValidationError(result);
      await harness.close();
    });

    it("rejects invalid email format", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_access_user", { email: "bad" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("user missing"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_access_user", { user_id: "u-1" });
      expectApiError(result, "user missing");
      await harness.close();
    });
  });

  describe("verkada_unlock_door_admin", () => {
    it("unlocks door via POST /access/v1/door/admin_unlock", async () => {
      mockClient.post.mockResolvedValue({ door_id: "d-1", duration: 5 });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_unlock_door_admin", { door_id: "d-1" });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith("/access/v1/door/admin_unlock", { door_id: "d-1" });
      await harness.close();
    });

    it("rejects missing door_id", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_unlock_door_admin", {});
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.post.mockRejectedValue(new Error("unlock denied"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_unlock_door_admin", { door_id: "d-1" });
      expectApiError(result, "unlock denied");
      await harness.close();
    });
  });

  describe("verkada_unlock_door_user", () => {
    it("unlocks as user_id via POST /access/v1/door/user_unlock", async () => {
      mockClient.post.mockResolvedValue({ door_id: "d-1", duration: 5 });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_unlock_door_user", {
        door_id: "d-1",
        user_id: "u-1",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith("/access/v1/door/user_unlock", {
        door_id: "d-1",
        user_id: "u-1",
      });
      await harness.close();
    });

    it("unlocks as external_id when user_id omitted", async () => {
      mockClient.post.mockResolvedValue({ door_id: "d-1", duration: 5 });
      const harness = await createHarness(registerAccessTools);

      await harness.callTool("verkada_unlock_door_user", {
        door_id: "d-1",
        external_id: "ext-1",
      });
      expect(mockClient.post).toHaveBeenCalledWith("/access/v1/door/user_unlock", {
        door_id: "d-1",
        external_id: "ext-1",
      });
      await harness.close();
    });

    it("rejects both user_id and external_id", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_unlock_door_user", {
        door_id: "d-1",
        user_id: "u-1",
        external_id: "ext-1",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects neither user_id nor external_id", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_unlock_door_user", { door_id: "d-1" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.post.mockRejectedValue(new Error("user unlock failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_unlock_door_user", {
        door_id: "d-1",
        user_id: "u-1",
      });
      expectApiError(result, "user unlock failed");
      await harness.close();
    });
  });

  describe("verkada_get_doors", () => {
    it("lists doors with no filters", async () => {
      mockClient.get.mockResolvedValue({ doors: [] });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_get_doors", {});
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/access/v1/doors", {});
      await harness.close();
    });

    it("joins site_ids for query param", async () => {
      mockClient.get.mockResolvedValue({ doors: [] });
      const harness = await createHarness(registerAccessTools);

      await harness.callTool("verkada_get_doors", { site_ids: ["s-1", "s-2"] });
      expect(mockClient.get).toHaveBeenCalledWith("/access/v1/doors", { site_ids: "s-1,s-2" });
      await harness.close();
    });

    it("rejects both site_ids and door_ids", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_doors", {
        site_ids: ["s-1"],
        door_ids: ["d-1"],
      });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("doors failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_doors", {});
      expectApiError(result, "doors failed");
      await harness.close();
    });
  });

  describe("verkada_list_access_groups", () => {
    it("lists groups via GET /access/v1/access_groups", async () => {
      mockClient.get.mockResolvedValue([{ group_id: "g-1" }]);
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_list_access_groups", {});
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/access/v1/access_groups");
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("groups failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_list_access_groups", {});
      expectApiError(result, "groups failed");
      await harness.close();
    });
  });

  describe("verkada_add_user_to_group", () => {
    it("adds user via PUT with group_id query param", async () => {
      mockClient.put.mockResolvedValue({ ok: true });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_add_user_to_group", {
        group_id: "g-1",
        user_id: "u-1",
      });
      expectSuccess(result);
      expect(mockClient.put).toHaveBeenCalledWith(
        "/access/v1/access_groups/group/user",
        { user_id: "u-1" },
        { group_id: "g-1" }
      );
      await harness.close();
    });

    it("rejects when no user identifier provided", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_add_user_to_group", { group_id: "g-1" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.put.mockRejectedValue(new Error("add failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_add_user_to_group", {
        group_id: "g-1",
        external_id: "ext-1",
      });
      expectApiError(result, "add failed");
      await harness.close();
    });
  });

  describe("verkada_remove_user_from_group", () => {
    it("removes user via DELETE with query params", async () => {
      mockClient.delete.mockResolvedValue({});
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_remove_user_from_group", {
        group_id: "g-1",
        user_id: "u-1",
      });
      expectSuccess(result);
      expect(mockClient.delete).toHaveBeenCalledWith("/access/v1/access_groups/group/user", {
        group_id: "g-1",
        user_id: "u-1",
      });
      await harness.close();
    });

    it("rejects when no user identifier provided", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_remove_user_from_group", { group_id: "g-1" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.delete.mockRejectedValue(new Error("remove failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_remove_user_from_group", {
        group_id: "g-1",
        external_id: "ext-1",
      });
      expectApiError(result, "remove failed");
      await harness.close();
    });
  });

  describe("verkada_get_access_events", () => {
    it("fetches events via GET /events/v1/access", async () => {
      mockClient.get.mockResolvedValue({ events: [] });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_get_access_events", {
        start_time: 1700000000,
        page_size: 50,
      });
      expectSuccess(result);
      expect(mockClient.get).toHaveBeenCalledWith("/events/v1/access", {
        start_time: 1700000000,
        end_time: undefined,
        device_id: undefined,
        site_id: undefined,
        event_type: undefined,
        user_id: undefined,
        page_size: 50,
        page_token: undefined,
      });
      await harness.close();
    });

    it("rejects page_size over 200", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_access_events", { page_size: 500 });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.get.mockRejectedValue(new Error("events failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_get_access_events", {});
      expectApiError(result, "events failed");
      await harness.close();
    });
  });

  describe("verkada_add_access_card", () => {
    it("adds card via POST with body and query params", async () => {
      mockClient.post.mockResolvedValue({ credential_id: "c-1" });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_add_access_card", {
        user_id: "u-1",
        type: "Standard 26-bit Wiegand",
        facility_code: "56",
        card_number: "1234",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith(
        "/access/v1/credentials/card",
        {
          type: "Standard 26-bit Wiegand",
          facility_code: "56",
          card_number: "1234",
          card_number_hex: undefined,
          active: undefined,
        },
        { user_id: "u-1", external_id: undefined }
      );
      await harness.close();
    });

    it("accepts card_number_hex instead of facility_code + card_number", async () => {
      mockClient.post.mockResolvedValue({ credential_id: "c-1" });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_add_access_card", {
        external_id: "ext-1",
        type: "HID 37-bit",
        card_number_hex: "0xABCD",
      });
      expectSuccess(result);
      expect(mockClient.post).toHaveBeenCalledWith(
        "/access/v1/credentials/card",
        expect.objectContaining({ card_number_hex: "0xABCD" }),
        { user_id: undefined, external_id: "ext-1" }
      );
      await harness.close();
    });

    it("rejects missing user identifier", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_add_access_card", {
        type: "Standard 26-bit Wiegand",
        card_number_hex: "0xABCD",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects missing card number fields", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_add_access_card", {
        user_id: "u-1",
        type: "Standard 26-bit Wiegand",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.post.mockRejectedValue(new Error("card failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_add_access_card", {
        user_id: "u-1",
        type: "Standard 26-bit Wiegand",
        card_number_hex: "0x1",
      });
      expectApiError(result, "card failed");
      await harness.close();
    });
  });

  describe("verkada_set_user_pin", () => {
    it("sets PIN via PUT with entry_code body", async () => {
      mockClient.put.mockResolvedValue({ ok: true });
      const harness = await createHarness(registerAccessTools);

      const result = await harness.callTool("verkada_set_user_pin", {
        user_id: "u-1",
        pin: "1234",
      });
      expectSuccess(result);
      expect(mockClient.put).toHaveBeenCalledWith(
        "/access/v1/access_users/user/entry_code",
        { entry_code: "1234" },
        { user_id: "u-1", external_id: undefined }
      );
      await harness.close();
    });

    it("rejects pin shorter than 4 digits", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_set_user_pin", {
        user_id: "u-1",
        pin: "12",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects non-numeric pin", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_set_user_pin", {
        user_id: "u-1",
        pin: "12ab",
      });
      expectValidationError(result);
      await harness.close();
    });

    it("rejects missing user identifier", async () => {
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_set_user_pin", { pin: "1234" });
      expectValidationError(result);
      await harness.close();
    });

    it("returns isError on API failure", async () => {
      mockClient.put.mockRejectedValue(new Error("pin failed"));
      const harness = await createHarness(registerAccessTools);
      const result = await harness.callTool("verkada_set_user_pin", {
        external_id: "ext-1",
        pin: "5678",
      });
      expectApiError(result, "pin failed");
      await harness.close();
    });
  });
});
