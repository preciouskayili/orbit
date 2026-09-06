# Orbit

Computers for agents. Work with your agent in a persistent conversation, give it a fleet of computers, watch their desktops, and work directly alongside them.

Orbit includes a **local interactive frontend prototype** and an optional **real Daytona computer integration**. Agent responses and agent execution are still simulated. In demo mode, provisioning and desktops are simulated too; in Daytona mode, computers run in your Daytona account.

## Run

Use Node 22.12+ (or a newer supported release) and pnpm 11.

```bash
pnpm install
pnpm dev:desktop
```

No API server or credentials are required for the frontend. The renderer runs at http://127.0.0.1:5173 inside Electron.

```bash
pnpm --filter @orbit/desktop test  # store + component interaction tests
pnpm typecheck                   # all packages
pnpm build                       # production builds
pnpm dev:api                     # independent legacy mock API
```

`pnpm dev` starts the Express API at port 4000 and the desktop app. Cloud mode calls that API; demo mode runs without it.

## Real Daytona computers

Orbit now supports real Linux desktops through a local Daytona backend. Conversations and agents remain a local prototype; no agent executes commands on these computers yet.

1. Copy `apps/api/.env.example` to `apps/api/.env`. Set `DAYTONA_API_KEY` and generate `ORBIT_API_TOKEN` with the command in that file.
2. Copy `apps/desktop/.env.example` to `apps/desktop/.env`. Set `VITE_COMPUTER_PROVIDER=daytona` and copy **only the local API token** into `VITE_ORBIT_API_TOKEN`. Never put the Daytona key in the renderer.
3. Run `pnpm dev` (or `pnpm dev:api` and `pnpm dev:desktop` separately). Restart the renderer when changing its environment.
4. Open Computers and create a Linux desktop. Open it for live screen, mouse, and keyboard access. Browser, terminal, and files are the real applications on that desktop. Start/stop and rename use the API.

Cloud mode hides the demo fleet. Creating from chat still opens the computer beside the conversation; opening from Computers uses the standalone tabs. The first cloud defaults are 2 CPU, 4 GB memory, and 10 GB disk. Resource limits depend on your Daytona account. Windows and macOS creation are disabled for this integration.

The API binds to `127.0.0.1` and serves one configured workspace (`ORBIT_WORKSPACE_ID`, default `personal`). It requires a local bearer token and checks installation/workspace labels before every computer operation. `apps/api/.data/instance-id` is its durable installation identity: keep it to reconnect the same fleet. This is a single-user local backend, not hosted multi-user authentication.

Computers keep their filesystem across stop/start. Automatic deletion is disabled, and the default inactivity auto-stop is 30 minutes (`DAYTONA_AUTO_STOP_MINUTES`). Closing a tab disconnects the viewer; it does not stop the computer. Use **Computer actions → Stop computer** when finished. The API keeps Daytona credentials server-side and issues 15-minute signed WebSocket links for noVNC. Reconnect requests a fresh link. Persistent records contain neither those links nor credentials.

Creation requests use durable idempotency labels. If a request times out, retry the same configuration; already-created computers are reused. For a partially created fleet, completed computers remain in the fleet. Errors are surfaced instead of silently falling back to simulated desktops.

API logs are JSON lines. `LOG_LEVEL=info` logs requests, status codes, durations, request IDs, and computer lifecycle operations; `debug` also logs fleet-refresh counts. Request IDs are returned in `X-Request-ID`. Logs deliberately exclude credentials, signed desktop URLs, request bodies, and raw SDK exceptions.

```bash
pnpm --filter @orbit/api test          # API authorization, ownership, lifecycle, logging
pnpm --filter @orbit/desktop test      # frontend regression suite
# LIVE: creates/reuses one billable test computer, verifies persistence and
# a real desktop handshake, then leaves the computer stopped.
pnpm --filter @orbit/api exec tsx scripts/smoke-daytona.ts
```

The live test records its retry ID in `/tmp/orbit-daytona-smoke-request.json`. Its computer stays available as **Orbit integration test**; remove it in Daytona when no longer needed. If the local API is unavailable during cleanup, the test also attempts to stop it directly through Daytona.

Provider references: [Computer Use](https://www.daytona.io/docs/en/computer-use/), [Persistence](https://www.daytona.io/docs/en/persistence/), [SDK](https://www.daytona.io/docs/en/typescript-sdk/daytona/).

## Try the flow

1. Open **Computers** to see the one shared workspace fleet. Projects show only computers assigned to their active conversations.
2. Start a conversation. Choose a project and agent; no computer is required yet.
3. Use the composer’s **+** menu for an available computer, or **New computer** to configure an OS, resources, and up to ten computers. Creating from the agent panel automatically attaches the fleet.
4. The computer opens beside the conversation. The OS desktop stays visible; apps open inside it, not in separate Orbit tabs. Choose fitted 16:10, 16:9, or fill. The desktop is an interactive local preview, not a stream.
5. **Run preview** walks through three simulated tool events, with working, searching, and composing orbs. **Pause** stops the preview. This does not interpret or execute your prompt.
6. Click or type directly in the desktop. Orbit automatically yields to your input and resumes a previously running preview after the desktop is free. Focused editors and held pointers keep their input lease; a manually paused run stays paused. There is no takeover or hand-back button.
7. Approve the example output or end the run. Computers and files remain available for another conversation.

### File attachments

Use **+ → Attach files** to choose files, then remove any unwanted chips before sending. File-only messages are supported. Up to eight files, 10 MB each and 25 MB total, are saved locally in IndexedDB; conversation metadata stays in the existing store. Attachments appear in a compact grid before and after sending. Images open in a popup; PDFs, DOCX, and text files open in a document pane beside chat. PDF previews include page navigation; DOCX previews show text rather than exact Word formatting. Unsupported formats remain downloadable. Files are workspace-scoped and are **not uploaded or read by an agent** in this prototype. Replace `lib/chat-attachments.ts` with authenticated object storage when connecting the backend.

### Computer mentions and permissions

Type `@` to search your workspace computers, then select one with the keyboard or pointer. Names appear as blue inline mentions such as `@Development` in the composer and soft blue pills in sent messages. Full names (including spaces) resolve to computer IDs; older quoted mentions are still supported. Ambiguous duplicate names never grant access. A mention requests access—it does not grant it. Allow or deny access for that conversation in the agent response.

Open **Conversation settings (···)** for project/agent setup and computer permissions. The default policy is to ask first. You can explicitly opt into **Allow available workspace computers** for the current conversation. The agent can then select an available machine through **+ → Let agent choose**, or a subsequent message when none is assigned. Human-controlled computers still require approval, busy computers cannot be reassigned, and the policy can be switched back to asking. Ending a run releases its assignments but preserves the machines and files.

Agent identity and its activity orb appear within the conversation, not in a duplicate header. Conversation settings live beside the composer. Agent responses render Markdown, lists, code, and tables. Expandable tool cards show demo commands, searches, file actions, inputs, and output. No commands or searches run externally in this prototype.

The demo shell supports `help`, `pwd`, `ls`, `cat <filename>`, `uname`, and `clear`. The browser preview validates an address without loading external pages.

**⌘K / Ctrl+K** searches projects, computers, and conversations, and opens agent skills, scheduled work, and settings. Arrow keys select; Enter opens; Escape dismisses.

Collapse the sidebar with its top toggle or **⌘\\ / Ctrl+\\**. The sidebar disappears completely; a floating window-control button restores it, and ⌘K search remains available. The layout preference is remembered locally. Empty conversations offer editable starter prompts, and sessions without computers offer inline provisioning.

The sidebar keeps New conversation, Computers, and Skills, collapsible projects, Recents, and the workspace/profile switcher. The plus beside each project creates a session immediately; the first message names it. Folders start open; clicking anywhere on a folder row opens or closes it. All sessions appear within their project. When a session uses multiple computers, a compact tab strip switches between just those computers. Skills & instructions is the shared home for editable instruction profiles and available tools. Computers opens a full-width fleet page with visible OS, CPU, memory, and disk specifications; New conversation keeps the available fleet beside chat. The right-panel icon at the chat pane’s top-right hides chat, preserving the draft and attachments. When hidden, a visible right-caret remains in a narrow strip at the chat’s collapsed edge, immediately before the workspace. Click it to reopen chat. Opening a session brings chat back. The agent panel persists across pages and resizes with a drag or arrow keys on its separator.

## Code map

```text
apps/desktop/
  electron/                     Native window, vibrancy, isolated preload
  src/
    components/
      app-shell.tsx             Sidebar, agent panel, resizable workspace
      sidebar.tsx               Navigation, projects, recents, workspace menu
      agent-panel.tsx           Conversation, one composer, contextual settings
      agent-orb.tsx             Thinking Orbs adapter with reduced-motion support
      session-computer-tabs.tsx Session-scoped computer navigation
      attachment-grid.tsx       Compact local file tiles
      file-preview-pane.tsx     Document pane and image popup
      pdf-preview.tsx           Lazy PDF rendering and page navigation
      agent-message.tsx         Markdown responses and structured tool cards
      computer-mention-input.tsx Keyboard-accessible @computer suggestions
      command-palette.tsx       Workspace search and keyboard navigation
      create-machine-dialog.tsx OS/resources/fleet creation
      computer-desktop.tsx      OS chrome and in-desktop app windows
      desktop-frame.tsx         Aspect-ratio fitting; streaming seam
      machine-viewport.tsx      Handoff, lifecycle, demo apps and files
      schedule-composer.tsx     Optional recurring-work configuration
      ui/                       Owned Base UI controls and Phosphor exports
    pages/                      Route-level composition
    hooks/use-agent-preview.ts   Opt-in demo event playback and orb phases
    hooks/use-desktop-interaction.ts Automatic pointer/focus/input coordination
    hooks/use-orbit.ts           Reactive local state subscription
    hooks/queries.ts             Workspace-scoped fleet query hooks
    lib/orbit-store.ts           Validated state + product actions + persistence
    lib/orbit-selectors.ts       Workspace pool and active project assignments
    lib/computer-mentions.ts     Mention tokens → unambiguous computer IDs
    lib/api.ts                  Local adapter for existing query hooks
    lib/demo-seed.ts             Sample projects and computers
    assets/os/                  Downloaded OS logos and attribution
  tests/                        Lifecycle, persistence, menus, chat, GUI controls
packages/shared/                Shared Zod contracts and Electron IPC types
apps/api/                       Legacy in-memory Express scaffold
```

### Brand and app icon

Your supplied SVGs are the sources in `src/assets/brand/`: `orbit-mark.svg` for the white ring, `orbit-app.svg` for the blue app tile. `OrbitLogo` is the reusable UI component. The sidebar uses the white mark; the browser favicon and Electron Dock/window use the blue tile.

`pnpm --filter @orbit/desktop icons:generate` rebuilds the PNGs and, on macOS, `resources/icons/orbit.icns`. Electron builds run this automatically. Restart Electron to update its Dock icon. The ICNS is ready for macOS packaging; this repository does not yet produce a packaged `.app`, so its Finder icon must be configured when packaging is added. Include `resources/icons` in that package.

### UI conventions

Use the small components in `src/components/ui`. They follow the existing shadcn Base UI direction, **not Radix**. Base UI handles focus and keyboard interactions; Orbit owns the visual styling. Menu labels must be inside `DropdownMenuGroup`.

The compact prompt, folded tool rows, approval cards, and screen-first layout take cues from [Beautiful UI](https://www.beautifului.dev/). The MIT-licensed [Thinking Orbs](https://libraries.dev/orbs) package supplies the animated activity indicator; only active preview execution animates, and reduced-motion preferences pause it.

Use Phosphor icons by default through `ui/icons.ts`. Lucide is a fallback only when the desired shape is unavailable in Phosphor; explicitly export each fallback from the same file. New conversation uses Lucide’s `SquarePen`. Use OS marks through `OsLogo`, and custom `SelectControl` / `Checkbox` components instead of native selects and checkboxes. Favor surface colors over extra borders. SF Pro comes from the macOS system font; variable Inter is bundled as the fallback.

The sidebar's scrollbar stays at the outer edge. Its content padding compensates for the reserved scrollbar width; avoid adding right padding to the scroll container.

### State and backend handoff

All local product mutations go through `orbitActions`. Updates clone and validate state before publishing it, so rejected actions cannot partially update the prototype. Workspace checks apply to reads and mutations; assigned computers cannot be shared between unfinished runs. New computers have `workspaceId`; the legacy `projectId` field is retained for old records, not used as ownership. Project computers are derived from active assignments, not the legacy `machineCount` field. Desktop input temporarily yields its run; stopping a computer pauses it. Input leases are ephemeral, token-scoped, and cleared on navigation/unmount or idle. They are not restored after an application restart. The local demonstration waits for all involved desktops to be free; a real backend should arbitrate input per computer so unrelated fleet work can continue.

The storage key is `orbit.prototype.v1`. Older records are accepted with defaults for newly added fields. The persisted `tasks` collection now represents conversations with an optional demo-run lifecycle; the key is retained to preserve existing data. `activeConversations` remembers the selected conversation for each workspace. Storage failures are surfaced in Settings.

For backend work:

- Replace `lib/api.ts` with authenticated requests for fleet reads.
- Replace local `orbitActions` mutations with service calls and reconcile their responses into state. Components that use `useOrbit` need that subscription fed by server state too; changing the adapter alone is not enough.
- Replace the simulated message/preview actions with agent events and streamed responses.
- Mount a remote-session client at `computer-desktop.tsx` / `machine-viewport.tsx`. Keep video transport and input forwarding outside the React presentation code.
- Implement server-enforced workspace authorization, computer ownership, handoff locks, durable file storage, and scheduling. Client checks here are prototype behavior, not a security boundary.

No authentication, billing, OS licensing, real provisioning, remote input, external browser automation, or background scheduling is implemented. macOS availability and licensing need a provider decision before being offered as a real cloud option.

## Verification

Vitest + Testing Library cover workspace menu grouping, keyboard search, custom selection, conversation creation, inline provisioning, desktop/file controls, handoff, run review, persistence, invalid input, and workspace isolation.

Manual visual checks still needed on macOS: native blur, live resizing at minimum window size, long conversation scrolling, and desktop/modal layout. DOM interaction tests do not replace a real-window visual pass.

OS asset sources and trademark notes are in [SOURCES.md](apps/desktop/src/assets/os/SOURCES.md).
