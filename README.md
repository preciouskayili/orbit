# Orbit

Computers for agents. Work with your agent in a persistent conversation, give it a fleet of computers, watch their desktops, and take control whenever you need.

This is a **local interactive frontend prototype**, not a cloud service. Agent responses, provisioning, desktop sessions, and execution are simulated. Projects, conversations, computers, files, schedules, and preferences persist in local storage.

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

`pnpm dev` also starts the legacy Express API at port 4000. The current frontend doesn't call it.

## Try the flow

1. Open **Computers** to see the one shared workspace fleet. Projects show only computers assigned to their active conversations.
2. Start a conversation. Choose a project and agent; no computer is required yet.
3. Use **Attach** for an available computer, or **New computer** to configure an OS, resources, and up to ten computers. Creating from the agent panel automatically attaches the fleet.
4. The computer opens beside the conversation. The OS desktop stays visible; apps open inside it, not in separate Orbit tabs. Choose fitted 16:10, 16:9, or fill. The desktop is an interactive local preview, not a stream.
5. **Continue** starts the demo run. **Preview next step** advances a deterministic three-step example to review. It does not interpret or execute your prompt.
6. **Take control** pauses the agent and unlocks the demo terminal and file editor. Start any stopped computers, hand control back, and continue when ready.
7. Approve the example output or end the run. Computers and files remain available for another conversation.

### Computer mentions and permissions

Type `@` to search your workspace computers, then select one with the keyboard or pointer. Names insert as quoted tokens such as `@"Development"`; messages resolve these to computer IDs. A mention requests access—it does not grant it. Allow or deny access for that conversation in the agent response.

The default policy is **Ask before using computers**. You can explicitly opt into **Allow available workspace computers** for the current conversation. The agent can then select an available machine through **Attach → Let agent choose**, or a subsequent message when none is assigned. Human-controlled computers still require approval, busy computers cannot be reassigned, and the policy can be switched back to asking. Ending a run releases its assignments but preserves the machines and files.

Agent responses render Markdown, lists, code, and tables. Expandable tool cards show demo commands, searches, file actions, inputs, and output. No commands or searches run externally in this prototype.

The demo shell supports `help`, `pwd`, `ls`, `cat <filename>`, `uname`, and `clear`. The browser preview validates an address without loading external pages.

**⌘K / Ctrl+K** searches projects, computers, and conversations, and opens agent skills, scheduled work, and settings. Arrow keys select; Enter opens; Escape dismisses.

The sidebar keeps main navigation, collapsible project folders, recent conversations, and the workspace/profile switcher. The agent panel persists across pages, can collapse, and resizes with a drag or arrow keys on its separator.

## Code map

```text
apps/desktop/
  electron/                     Native window, vibrancy, isolated preload
  src/
    components/
      app-shell.tsx             Sidebar, agent panel, resizable workspace
      sidebar.tsx               Navigation, projects, recents, workspace menu
      agent-panel.tsx           Conversation, composer, permissions, computers
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

### UI conventions

Use the small components in `src/components/ui`. They follow the existing shadcn Base UI direction, **not Radix**. Base UI handles focus and keyboard interactions; Orbit owns the visual styling. Menu labels must be inside `DropdownMenuGroup`.

Use Phosphor icons through `ui/icons.ts`, OS marks through `OsLogo`, and custom `SelectControl` / `Checkbox` components instead of native selects and checkboxes. Favor surface colors over extra borders. SF Pro comes from the macOS system font; variable Inter is bundled as the fallback.

The sidebar's scrollbar stays at the outer edge. Its content padding compensates for the reserved scrollbar width; avoid adding right padding to the scroll container.

### State and backend handoff

All local product mutations go through `orbitActions`. Updates clone and validate state before publishing it, so rejected actions cannot partially update the prototype. Workspace checks apply to reads and mutations; assigned computers cannot be shared between unfinished runs. New computers have `workspaceId`; the legacy `projectId` field is retained for old records, not used as ownership. Project computers are derived from active assignments, not the legacy `machineCount` field. Human takeover and stopping a computer pause its run.

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
