import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
/** Build a Verkada Command history-player deep link (matches alert video_url and API footage/link shape). */
export declare function buildCameraHistoryUrl(cameraId: string, startTimeSeconds: number, durationSeconds: number, orgSubdomain: string): string;
/** Rewrite duration/start in a footage link returned by GET /cameras/v1/footage/link. */
export declare function adjustFootageUrlDuration(url: string, durationSeconds: number, startTimeSeconds: number): string;
export declare function registerCameraTools(server: McpServer): void;
//# sourceMappingURL=cameras.d.ts.map