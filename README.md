# Verkada MCP Server

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io) server that exposes the [Verkada API](https://apidocs.verkada.com) to AI assistants like Cursor and Claude Desktop.

The server handles Verkada's two-layer authentication automatically (API key → short-lived token → API calls) and supports both local (stdio) and remote (HTTP) deployments. In HTTP mode, credentials travel with each request from the client — the server itself can run with **zero secrets**.

## Features

- **29 MCP tools** covering cameras, access control, org users, and analytics
- **Automatic token management** — exchanges your API key for a 30-minute token and refreshes as needed
- **Multi-region support** — `us`, `eu`, `au`, `oh`
- **Two transports** — stdio for local use, HTTP for cloud/remote clients
- **Stateless HTTP mode** — pass credentials via headers on every request

## Prerequisites

- Node.js 20+
- A Verkada API key and organization ID ([Verkada API docs](https://apidocs.verkada.com))

## Installation

```bash
git clone <your-repo-url>
cd MCPVerkada
npm install
npm run build
```

## Configuration

### Environment variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VERKADA_API_KEY` | stdio mode | — | Verkada API key (`vkkey_...`) |
| `VERKADA_ORG_ID` | stdio mode | — | Your organization ID |
| `VERKADA_REGION` | No | `us` | API region: `us`, `eu`, `au`, `oh` |
| `TRANSPORT` | No | `stdio` | `stdio` or `http` |
| `PORT` | No | `8080` | HTTP listen port (http mode only) |

### HTTP request headers

When running in HTTP mode, pass credentials on every request instead of using env vars:

| Header | Required | Description |
|--------|----------|-------------|
| `x-verkada-api-key` | Yes | Verkada API key |
| `x-verkada-org-id` | Yes | Organization ID |
| `x-verkada-region` | No | Region code (default: `us`) |

## Getting your API key and Organization ID

You need both values before connecting any MCP client. Only **Organization Admins** can create API keys in Verkada Command.

1. Log in to [Verkada Command](https://command.verkada.com)
2. Go to **All Products → Admin**
3. In the left sidebar, open **Org Settings → Verkada API** (may also appear as **API & Integrations**)
4. Copy your **Organization ID** — it is displayed on that page (UUID format, e.g. `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)
5. Click **+ New API Key** (or **Add API Key**)
   - Give the key a descriptive name
   - Choose **Read-Only** or **Read/Write** permissions based on what you need
   - Select the API endpoints you want to expose (cameras, access control, etc.)
   - Set an expiration date
6. Click **Generate API Key** and **copy the key immediately** — Verkada only shows it once

Store both values somewhere secure (password manager, secrets vault). You will paste them into your MCP client config in the next step.

> **Region:** If your org uses a non-US data region, note whether you are on `us`, `eu`, `au`, or `oh`. This maps to `VERKADA_REGION` in the config below.

## Using with Claude Desktop

Claude Desktop runs the MCP server locally over **stdio**. Your API key and org ID go in the config file as environment variables.

### 1. Build the server

```bash
cd /path/to/MCPVerkada
npm install
npm run build
```

### 2. Edit the Claude Desktop config

| Platform | Config file path |
|----------|------------------|
| **macOS** | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| **Windows** | `%APPDATA%\Claude\claude_desktop_config.json` |
| **Linux** | `~/.config/Claude/claude_desktop_config.json` |

Open the file in a text editor. Add or update the `mcpServers` block:

```json
{
  "mcpServers": {
    "verkada": {
      "command": "node",
      "args": ["/absolute/path/to/MCPVerkada/dist/index.js"],
      "env": {
        "VERKADA_API_KEY": "paste-your-api-key-here",
        "VERKADA_ORG_ID": "paste-your-org-id-here",
        "VERKADA_REGION": "us"
      }
    }
  }
}
```

**Where credentials go:** inside the `"env"` object on the `verkada` server entry.

| Env variable | Value |
|--------------|-------|
| `VERKADA_API_KEY` | The API key you generated in Verkada Command |
| `VERKADA_ORG_ID` | Your Organization ID from Verkada Command |
| `VERKADA_REGION` | `us`, `eu`, `au`, or `oh` (optional, defaults to `us`) |

Replace `/absolute/path/to/MCPVerkada` with the real path on your machine, for example:

```
/Users/jonathanricetti/Documents/MCPVerkada/dist/index.js
```

### 3. Restart Claude Desktop

Fully quit and reopen Claude Desktop (not just close the window). MCP servers load only at startup.

### 4. Verify it works

In a new Claude conversation, you should see a tools/plugins indicator showing the `verkada` server is connected. Try prompts like:

- "List all my Verkada cameras"
- "Show access events from the last hour"
- "Which doors are in my organization?"

## Using with Cursor

Cursor also runs the MCP server locally over **stdio**. Credentials are configured the same way — as environment variables in the MCP config.

### Option A — Cursor Settings UI (recommended)

1. Open **Cursor Settings** (`Cmd + ,` on macOS, `Ctrl + ,` on Windows/Linux)
2. Go to **Features → MCP** (or search for "MCP" in settings)
3. Click **+ Add new MCP server**
4. Choose **stdio** transport and fill in:
   - **Name:** `verkada`
   - **Command:** `node`
   - **Args:** `/absolute/path/to/MCPVerkada/dist/index.js`
   - **Environment variables:**
     - `VERKADA_API_KEY` = your API key
     - `VERKADA_ORG_ID` = your org ID
     - `VERKADA_REGION` = `us` (or your region)
5. Save and restart Cursor

### Option B — Edit the config file directly

| Scope | Config file path |
|-------|------------------|
| **Global (all projects)** | `~/.cursor/mcp.json` |
| **Project-specific** | `.cursor/mcp.json` in the project root |

```json
{
  "mcpServers": {
    "verkada": {
      "command": "node",
      "args": ["/absolute/path/to/MCPVerkada/dist/index.js"],
      "env": {
        "VERKADA_API_KEY": "paste-your-api-key-here",
        "VERKADA_ORG_ID": "paste-your-org-id-here",
        "VERKADA_REGION": "us"
      }
    }
  }
}
```

**Where credentials go:** same as Claude Desktop — the `"env"` block on the server entry.

### Development mode (hot reload)

While editing the server source, point Cursor at `tsx` instead of the compiled `dist/` output:

```json
{
  "mcpServers": {
    "verkada": {
      "command": "npx",
      "args": ["tsx", "/absolute/path/to/MCPVerkada/src/index.ts"],
      "env": {
        "VERKADA_API_KEY": "paste-your-api-key-here",
        "VERKADA_ORG_ID": "paste-your-org-id-here",
        "VERKADA_REGION": "us"
      }
    }
  }
}
```

### Verify in Cursor

1. Restart Cursor after saving the config
2. Open **Cursor Settings → MCP** and confirm `verkada` shows a green/connected status
3. In Agent or Chat mode, ask: "Use the Verkada MCP to list my cameras"

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Server not appearing | Fully restart the app; check the config JSON is valid |
| `No Verkada credentials found` | Ensure `VERKADA_API_KEY` and `VERKADA_ORG_ID` are in the `env` block |
| `Failed to obtain Verkada API token` | API key is invalid or expired — generate a new one in Command |
| Wrong region / timeout | Set `VERKADA_REGION` to match your org (`us`, `eu`, `au`, `oh`) — not `api` |
| `node: command not found` | Use the full path to node, e.g. `/usr/local/bin/node` or `/opt/homebrew/bin/node` |
| Permission errors on tools | API key may be read-only; create a read/write key for unlock/delete operations |

## Remote — HTTP transport

Start the server:

```bash
TRANSPORT=http PORT=8080 npm start
```

Endpoints:

- `POST /mcp` — MCP protocol endpoint (include `x-verkada-*` headers)
- `GET /health` — health check

Example health check:

```bash
curl http://localhost:8080/health
```

## Available tools

All tools use the `verkada_` prefix.

### Cameras (`src/tools/cameras.ts`)

| Tool | Description |
|------|-------------|
| `verkada_get_cameras` | List all cameras and their status |
| `verkada_get_alerts` | Camera alerts (motion, tamper, crowd, POI, offline) |
| `verkada_get_object_counts` | People/vehicle counts for a camera |
| `verkada_get_latest_thumbnail` | Latest thumbnail image for a camera |
| `verkada_get_streaming_token` | Token for live camera streaming |

### Access control (`src/tools/access.ts`)

| Tool | Description |
|------|-------------|
| `verkada_list_access_users` | List access control users |
| `verkada_get_access_user` | Get user credentials and access info |
| `verkada_unlock_door_admin` | Admin door unlock (bypasses access levels) |
| `verkada_unlock_door_user` | Unlock door as a specific user |
| `verkada_get_doors` | List doors |
| `verkada_list_access_groups` | List access groups |
| `verkada_add_user_to_group` | Add user to an access group |
| `verkada_remove_user_from_group` | Remove user from an access group |
| `verkada_get_access_events` | Access events (badge-ins, unlocks, etc.) |
| `verkada_add_access_card` | Add an access card to a user |
| `verkada_set_user_pin` | Set a user's PIN code |

### Org users (`src/tools/users.ts`)

| Tool | Description |
|------|-------------|
| `verkada_create_user` | Create an org user |
| `verkada_get_user` | Get user metadata |
| `verkada_update_user` | Update user metadata |
| `verkada_delete_user` | Delete a user |

### Analytics (`src/tools/analytics.ts`)

| Tool | Description |
|------|-------------|
| `verkada_get_audit_logs` | Organization audit logs |
| `verkada_list_license_plates_of_interest` | List flagged license plates |
| `verkada_create_license_plate_of_interest` | Flag a license plate |
| `verkada_delete_license_plate_of_interest` | Remove a flagged plate |
| `verkada_get_lpr_timestamps` | LPR detection timestamps |
| `verkada_list_persons_of_interest` | List persons of interest |
| `verkada_create_person_of_interest` | Create a person of interest |
| `verkada_delete_person_of_interest` | Delete a person of interest |
| `verkada_get_sensor_data` | Environmental sensor readings |

## Development

```bash
npm run dev      # Run with tsx (stdio, uses env vars)
npm run build    # Compile TypeScript to dist/
npm start        # Run compiled server

# HTTP mode during development
TRANSPORT=http PORT=8080 npm run dev
```

### Project structure

```
src/
  index.ts              # Entry point, transport selection
  constants.ts          # Regions, URLs, limits
  types.ts              # Shared TypeScript types
  services/
    client.ts           # Verkada API client + token cache
    context.ts          # Per-request credential context (HTTP)
  tools/
    cameras.ts          # Camera tools
    access.ts           # Access control tools
    users.ts            # Org user tools
    analytics.ts        # Analytics & audit tools
```

### Adding a new tool

1. Add a `server.registerTool()` call in the appropriate `src/tools/*.ts` file
2. Name it `verkada_<verb>_<noun>` in snake_case
3. Use Zod for `inputSchema`, `getRequestClient()` in the handler, and `truncate()` for large responses
4. Register new modules in `src/index.ts`
5. Run `npm run build`

See [`AGENTS.md`](AGENTS.md) for detailed patterns and architecture notes.

## API regions

| Region | Base URL |
|--------|----------|
| `us` (default) | `https://api.verkada.com` |
| `eu` | `https://api.eu.verkada.com` |
| `au` | `https://api.au.verkada.com` |
| `oh` | `https://api.oh.verkada.com` |

## Security notes

- **Never commit API keys.** Use environment variables or client-side header injection.
- **Privileged tools** (`verkada_unlock_door_admin`, `verkada_delete_user`, etc.) modify physical security state. Restrict which MCP clients and users can access them.
- In HTTP mode, use TLS in production and treat the server as a credential pass-through — it does not persist keys.

## License

Private / unlicensed — update this section as needed.
