# Verkada MCP Server — Agent Guide

TypeScript MCP server that exposes the [Verkada API](https://apidocs.verkada.com) to AI clients (Cursor, Claude Desktop, etc.).

## What this project does

- Wraps Verkada REST endpoints as MCP tools
- Handles two-layer auth automatically (API key → short-lived token → API calls)
- Supports **stdio** (local) and **HTTP** (remote/cloud) transports
- Keeps credentials on the **client** in HTTP mode — the server can run with zero secrets

## Repository layout

```
src/
  index.ts              # Entry point, transport selection, tool registration
  constants.ts          # Regions, base URLs, token TTL, response size limit
  types.ts              # Shared TypeScript interfaces
  services/
    client.ts           # VerkadaClient, token cache, getClient()
    context.ts          # AsyncLocalStorage for per-request credentials (HTTP mode)
  tools/
    cameras.ts          # Camera, alerts, thumbnails, streaming
    access.ts           # Doors, users, groups, cards, events, unlock
    users.ts            # Core org user CRUD
    analytics.ts        # Audit logs, LPR, POI, sensors
dist/                   # Compiled output (npm run build)
```

## Architecture

```
MCP Client (Cursor / Claude)
    │  stdio or HTTP POST /mcp
    │  credentials: env vars OR x-verkada-* headers
    ▼
index.ts → register*Tools() → tool handler
    │                              │
    │                              ▼
    │                    getRequestClient()  ← context.ts (HTTP)
    │                              │
    │                              ▼
    │                    VerkadaClient.get/post/...
    │                              │
    │                              ▼
    └────────────────────  api[.region].verkada.com
```

### Auth flow

1. Client provides `x-verkada-api-key` + `x-verkada-org-id` (+ optional `x-verkada-region`)
2. `VerkadaClient` exchanges API key for a token via `POST /token`
3. All other calls use `x-verkada-auth: <token>`; token cached ~28 min
4. `org_id` is injected into every request automatically

### Credential resolution order

1. Request headers: `x-verkada-api-key`, `x-verkada-org-id`, `x-verkada-region`
2. Environment variables: `VERKADA_API_KEY`, `VERKADA_ORG_ID`, `VERKADA_REGION`

### Transports

| Mode | Env | Credentials |
|------|-----|-------------|
| `stdio` (default) | `TRANSPORT=stdio` | Env vars required |
| `http` | `TRANSPORT=http`, `PORT` (default 8080) | Per-request headers |

Health check: `GET /health`

## MCP tools in this repo (30 tools, `verkada_*` prefix)

| Module | Tools |
|--------|-------|
| `cameras.ts` | `verkada_get_cameras`, `verkada_get_alerts`, `verkada_get_object_counts`, `verkada_get_latest_thumbnail`, `verkada_get_streaming_token` |
| `access.ts` | `verkada_list_access_users`, `verkada_get_access_user`, `verkada_unlock_door_admin`, `verkada_unlock_door_user`, `verkada_get_doors`, `verkada_list_access_groups`, `verkada_add_user_to_group`, `verkada_remove_user_from_group`, `verkada_get_access_events`, `verkada_add_access_card`, `verkada_set_user_pin` |
| `users.ts` | `verkada_create_user`, `verkada_get_user`, `verkada_update_user`, `verkada_delete_user` |
| `analytics.ts` | `verkada_get_audit_logs`, `verkada_list_license_plates_of_interest`, `verkada_create_license_plate_of_interest`, `verkada_delete_license_plate_of_interest`, `verkada_get_lpr_images`, `verkada_get_lpr_timestamps`, `verkada_list_persons_of_interest`, `verkada_create_person_of_interest`, `verkada_delete_person_of_interest`, `verkada_get_sensor_data` |

**Note:** A connected Cursor MCP server (`user-verkada`) may expose a larger auto-generated tool set (~130 tools, no `verkada_` prefix, nested `query` params). That is a separate deployment surface; this repo is the hand-maintained subset.

## Adding a new tool

1. Pick the right module in `src/tools/` (or create a new one and register it in `index.ts`)
2. Follow the existing `server.registerTool()` pattern:
   - Tool name: `verkada_<verb>_<noun>` (snake_case)
   - Rich `description` with Args, Returns, and Examples
   - Zod `inputSchema` with `.strict()`; use `.refine()` for "provide one of" validation
   - MCP annotations: `readOnlyHint`, `destructiveHint`, `idempotentHint`, `openWorldHint`
   - Handler: `getRequestClient()` → API call → JSON response
   - Wrap in try/catch; return `{ content: [{ type: "text", text }], isError: true }` on failure
   - Use `truncate(..., CHARACTER_LIMIT)` for large list responses (50k chars)
3. Run `npm run build` after changes

## Verkada API regions

| Region code | Base URL |
|-------------|----------|
| `us` (default) | `https://api.verkada.com` |
| `eu` | `https://api.eu.verkada.com` |
| `au` | `https://api.au.verkada.com` |
| `oh` | `https://api.oh.verkada.com` |

## Common API path prefixes

- `/cameras/v1/` — cameras, alerts, analytics, LPR, thumbnails
- `/access/v1/` — access users, doors, groups, cards, unlock
- `/core/v1/` — org users, audit logs
- `/events/v1/` — access events

## Development commands

```bash
npm install
npm run dev      # tsx src/index.ts (stdio)
npm run build    # tsc → dist/
npm start        # node dist/index.js
npm test         # unit tests (mocked, no credentials)
npm run test:integration  # live API (VERKADA_API_KEY + VERKADA_ORG_ID required)

# HTTP mode
TRANSPORT=http PORT=8080 npm run dev
```

## Privileged / destructive actions

These tools bypass or modify security state — treat with care:

- `verkada_unlock_door_admin` — admin override, ignores access levels
- `verkada_unlock_door_user` — unlock as a specific user
- `verkada_delete_user`, `verkada_delete_license_plate_of_interest`, `verkada_delete_person_of_interest`
- `verkada_set_user_pin`, `verkada_add_access_card`

## Dependencies

- `@modelcontextprotocol/sdk` — MCP server, stdio + streamable HTTP transport
- `zod` — tool input schemas
- `express` — HTTP transport only
