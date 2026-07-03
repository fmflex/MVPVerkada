import { expect } from "vitest";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { InMemoryTransport } from "@modelcontextprotocol/sdk/inMemory.js";

type MockClient = {
  organizationId: string;
  apiRegion: "us" | "eu" | "au" | "oh";
  get: ReturnType<typeof import("vitest").vi.fn>;
  post: ReturnType<typeof import("vitest").vi.fn>;
  put: ReturnType<typeof import("vitest").vi.fn>;
  patch: ReturnType<typeof import("vitest").vi.fn>;
  delete: ReturnType<typeof import("vitest").vi.fn>;
  request: ReturnType<typeof import("vitest").vi.fn>;
  getBinary: ReturnType<typeof import("vitest").vi.fn>;
};

export const mockClient = (
  globalThis as typeof globalThis & { __verkadaMockClient: MockClient }
).__verkadaMockClient;

export type ToolResult = Awaited<ReturnType<Client["callTool"]>>;

export async function createHarness(registrar: (server: McpServer) => void) {
  const server = new McpServer({ name: "test", version: "1.0.0" });
  registrar(server);

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();
  await server.connect(serverTransport);

  const client = new Client({ name: "test-client", version: "1.0.0" });
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

export function resetMocks(): void {
  mockClient.get.mockReset().mockResolvedValue({});
  mockClient.post.mockReset().mockResolvedValue({});
  mockClient.put.mockReset().mockResolvedValue({});
  mockClient.patch.mockReset().mockResolvedValue({});
  mockClient.delete.mockReset().mockResolvedValue({});
  mockClient.request.mockReset().mockResolvedValue({});
  mockClient.getBinary.mockReset().mockResolvedValue({
    data: Buffer.from("fake-jpeg"),
    contentType: "image/jpeg",
  });
}

export function resultText(result: ToolResult): string {
  const block = result.content?.[0];
  return block && "text" in block ? block.text : "";
}

export function expectSuccess(result: ToolResult): void {
  expect(result.isError).toBeFalsy();
  expect(result.content?.length).toBeGreaterThan(0);
}

export function expectValidationError(result: ToolResult): void {
  expect(result.isError).toBe(true);
  expect(resultText(result)).toMatch(/Invalid arguments for tool/i);
}

export function expectApiError(result: ToolResult, message?: string): void {
  expect(result.isError).toBe(true);
  expect(resultText(result)).toMatch(/^Error:/);
  if (message) {
    expect(resultText(result)).toContain(message);
  }
}
