# Orbit

Orbit is a desktop-first foundation for persistent cloud-computer workspaces. Projects own durable machines, activity, files, and an attached agent surface. This repository intentionally stops before cloud provisioning, authentication, streaming, and real agent execution.

## Repository structure

```text
orbit/
├── apps/
│   ├── api/           Express + TypeScript mocked API
│   └── desktop/       Electron main/preload + React/Vite renderer
├── packages/
│   ├── shared/        Shared Zod schemas, types, and IPC contracts
│   └── ui/            Small reusable UI primitives
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Requirements

- Node.js 20 or newer
- pnpm 11

## Install and run

```bash
pnpm install
pnpm dev
```

`pnpm dev` builds the two internal packages, starts the API at `http://127.0.0.1:4000`, starts Vite at `http://127.0.0.1:5173`, and opens the Electron app.

Other useful commands:

```bash
pnpm dev:desktop   # renderer + Electron; expects the API separately
pnpm dev:api       # mocked Express API only
pnpm build         # build every workspace package
pnpm typecheck     # typecheck every workspace package
```

Copy the example environment files only when overriding defaults:

```bash
cp apps/api/.env.example apps/api/.env
cp apps/desktop/.env.example apps/desktop/.env
```

## Current architecture

The renderer uses React Router with hash-based desktop-safe routes and TanStack Query for projects, machines, activity, and agent messages. Query hooks call a small API client; page components do not own mocked server data.

The Express service keeps mock records in memory. Creating a machine validates input with the shared Zod contract and adds the result to memory until the API restarts. Replacing this layer with a database and cloud machine provider should not require changing the page-level data model.

Electron uses three layers:

- `electron/main.ts` owns the application window and IPC handlers.
- `electron/preload.ts` exposes a narrow typed API through `contextBridge`.
- `src/` is the sandboxed renderer with context isolation enabled and Node integration disabled.

Native clipboard, filesystem, notification, and window-control features are represented in the IPC contract but intentionally return unavailable placeholders.

## UI map

The desktop surface is intentionally split into a few small components so the
product can grow without turning the main screen into one large file:

- `apps/desktop/src/components/sidebar.tsx` — global navigation, spaces, and setup state
- `apps/desktop/src/components/app-shell.tsx` — rounded workspace frame and resizable split
- `apps/desktop/src/components/agent-panel.tsx` — the task thread and composer
- `apps/desktop/src/components/workspace-header.tsx` — shared search and computer tabs
- `apps/desktop/src/pages/machine-workspace-page.tsx` — loads one computer into the workspace
- `apps/desktop/src/components/machine-viewport.tsx` — the active streamed-computer surface
- `apps/api/src/data.ts` — the current projects, computers, activity, and messages

Interactive primitives use Base UI (`@base-ui/react`) with local Tailwind
styles. Keep that split: Base UI owns accessibility, focus, and keyboard
behavior; Orbit components own appearance and product behavior.

Start with `machine-workspace-page.tsx` when connecting real computer sessions.
Keep streaming/protocol code outside the React view, then pass session state into
`MachineViewport`. Replace the arrays in `data.ts` behind the existing API routes
when durable storage and a provisioning provider are ready.

## Mocked scope

- Projects, machines, activity, and agent messages
- Remote desktop viewport and connection metrics
- Machine lifecycle buttons
- Agent execution and composer responses
- Machine creation/provisioning (the form does update in-memory API data)
- Settings controls

No AWS, OpenAI, Supabase, authentication, billing, WebRTC, remote desktop stream, or real machine provisioning is included.
