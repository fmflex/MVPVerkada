import { vi } from "vitest";

const { mockClient } = vi.hoisted(() => ({
  mockClient: {
    organizationId: "org-test",
    apiRegion: "us" as const,
    get: vi.fn().mockResolvedValue({}),
    post: vi.fn().mockResolvedValue({}),
    put: vi.fn().mockResolvedValue({}),
    patch: vi.fn().mockResolvedValue({}),
    delete: vi.fn().mockResolvedValue({}),
    request: vi.fn().mockResolvedValue({}),
    getBinary: vi.fn().mockResolvedValue({
      data: Buffer.from("fake-jpeg"),
      contentType: "image/jpeg",
    }),
  },
}));

vi.mock("../src/services/context.js", () => ({
  getRequestClient: () => mockClient,
  getCommandSubdomain: () => undefined,
  requestContext: {
    run: <T>(_store: unknown, fn: () => T) => fn(),
    getStore: () => undefined,
  },
}));

(globalThis as typeof globalThis & { __verkadaMockClient: typeof mockClient }).__verkadaMockClient =
  mockClient;
