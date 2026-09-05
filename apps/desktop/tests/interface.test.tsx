import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test, vi } from "vitest";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  act,
} from "@testing-library/react";
import {
  MemoryRouter,
  Routes,
  Route,
  Link,
  useLocation,
} from "react-router-dom";
import { ConversationWorkspacePage } from "../src/pages/conversation-workspace-page";
import { SessionComputerTabs } from "../src/components/session-computer-tabs";
import { AgentOrb } from "../src/components/agent-orb";
import { AgentMessage } from "../src/components/agent-message";
import { fitDesktop } from "../src/components/desktop-frame";
import { AppShell } from "../src/components/app-shell";
import { Sidebar } from "../src/components/sidebar";
import { SelectControl } from "../src/components/ui/select";
import { AgentPanel } from "../src/components/agent-panel";
import { orbitActions, getOrbitState } from "../src/lib/orbit-store";
import { MachineViewport } from "../src/components/machine-viewport";
import { useState } from "react";

function Location() {
  return <output data-testid="location">{useLocation().pathname}</output>;
}
beforeEach(() => {
  localStorage.removeItem("orbit.sidebar-collapsed");
  orbitActions.switchWorkspace("personal");
  orbitActions.newConversation();
});

test("workspace menu labels have a group context and workspace switching works", async () => {
  render(
    <MemoryRouter>
      <Sidebar />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Precious Kayili/ }));
  expect(await screen.findByText("Workspaces", { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole("menuitem", { name: "Orbit team" }));
  await waitFor(() => expect(getOrbitState().workspaceId).toBe("team"));
  expect(screen.getByTestId("location").textContent).toBe("/computers");
});
test("sidebar has only essential navigation, a plus project action, and collapsible folders", () => {
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("navigation", { name: "Main navigation" }).textContent,
  ).toBe("New conversationComputers");
  const add = screen.getByRole("button", { name: "New project" });
  expect(add.textContent).toBe("");
  const project = screen.getAllByRole("button", { expanded: true })[0];
  fireEvent.click(project);
  expect(project.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(project);
  expect(project.getAttribute("aria-expanded")).toBe("true");
});
test("Cmd K searches, Enter navigates, and Escape dismisses", async () => {
  render(
    <MemoryRouter>
      <Sidebar />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("combobox", {
    name: "Search commands",
  });
  fireEvent.change(search, { target: { value: "Agent skills" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() =>
    expect(screen.getByTestId("location").textContent).toBe("/skills"),
  );
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const reopened = await screen.findByRole("combobox", {
    name: "Search commands",
  });
  fireEvent.keyDown(reopened, { key: "Escape" });
  await waitFor(() =>
    expect(
      screen.queryByRole("combobox", { name: "Search commands" }),
    ).toBeNull(),
  );
});
test("custom Base UI select changes value without a native select", async () => {
  function Example() {
    const [value, setValue] = useState(4);
    return (
      <>
        <SelectControl
          label="CPU"
          value={value}
          onValueChange={setValue}
          options={[
            { value: 4, label: "4 vCPU" },
            { value: 8, label: "8 vCPU" },
          ]}
        />
        <output data-testid="cpu">{value}</output>
      </>
    );
  }
  const view = render(<Example />);
  expect(view.container.querySelector("select")).toBeNull();
  const user = userEvent.setup();
  await user.click(screen.getByRole("combobox", { name: "CPU" }));
  await user.click(await screen.findByRole("option", { name: "8 vCPU" }));
  await waitFor(() => expect(screen.getByTestId("cpu").textContent).toBe("8"));
});
test("agent can begin a conversation and provision a computer inline", async () => {
  const projectId = orbitActions.createProject("Chat testing", "");
  render(
    <MemoryRouter>
      <AgentPanel
        width={480}
        collapsed={false}
        projectId={projectId}
        onToggle={() => {}}
      />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Message your agent" }),
    { target: { value: "Help me build an app" } },
  );
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  const conversationId = getOrbitState().activeConversations.personal;
  expect(screen.getByTestId("location").textContent).toBe(
    "/sessions/" + conversationId,
  );
  expect(screen.getByRole("log").textContent).toContain("Help me build an app");
  fireEvent.click(screen.getByRole("button", { name: "Add computer" }));
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "New computer" }),
  );
  fireEvent.click(
    await screen.findByRole("button", { name: "Create computer", exact: true }),
  );
  await waitFor(() =>
    expect(
      getOrbitState().tasks.find((t) => t.id === conversationId)?.machineIds
        .length,
    ).toBe(1),
  );
  expect(screen.getByTestId("location").textContent).toContain("/computers/");
  expect(
    screen.getByRole("button", { name: "Run preview", exact: true }),
  ).toBeTruthy();
});
test("desktop editing needs no takeover button and releases input automatically", () => {
  vi.useFakeTimers();
  try {
    const [mid] = orbitActions.createComputers({
      name: "Direct input",
      os: "ubuntu",
      cpu: 4,
      ramGb: 8,
      storageGb: 80,
    });
    const machine = getOrbitState().machines.find((m) => m.id === mid)!;
    const view = render(
      <MemoryRouter>
        <MachineViewport machine={machine} />
      </MemoryRouter>,
    );
    expect(screen.queryByRole("button", { name: "Take control" })).toBeNull();
    const files = screen.getByRole("button", {
      name: "Open Files",
      exact: true,
    });
    fireEvent.pointerDown(files);
    fireEvent.pointerUp(files);
    fireEvent.click(files);
    const editor = screen.getByRole("textbox", { name: "File contents" });
    act(() => editor.focus());
    fireEvent.change(editor, { target: { value: "Directly edited" } });
    fireEvent.click(screen.getByRole("button", { name: "Save file" }));
    expect(getOrbitState().files[mid]["README.md"]).toBe("Directly edited");
    act(() => vi.advanceTimersByTime(2500));
    expect(getOrbitState().control[mid]).toBe("human");
    act(() => editor.blur());
    act(() => vi.advanceTimersByTime(1800));
    expect(getOrbitState().control[mid]).toBe("agent");
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});

test("agent stays alongside other pages; collapse, restore and keyboard resizing work", async () => {
  render(
    <MemoryRouter initialEntries={["/new"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="new" element={<Link to="/agents">Visit agents</Link>} />
          <Route path="agents" element={<p>Agent settings canvas</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(
    screen.getByRole("combobox", { name: "Message your agent" }),
  ).toBeTruthy();
  const separator = screen.getByRole("separator", {
    name: "Resize conversation",
  });
  const before = Number(separator.getAttribute("aria-valuenow"));
  fireEvent.keyDown(separator, { key: "ArrowLeft" });
  expect(Number(separator.getAttribute("aria-valuenow"))).toBe(
    Math.max(400, before - 16),
  );
  fireEvent.click(screen.getByRole("button", { name: "Hide agent" }));
  expect(
    screen.queryByRole("combobox", { name: "Message your agent" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show agent" }));
  fireEvent.click(screen.getByRole("link", { name: "Visit agents" }));
  expect(screen.getByText("Agent settings canvas")).toBeTruthy();
  expect(
    screen.getByRole("combobox", { name: "Message your agent" }),
  ).toBeTruthy();
});

test("palette arrow keys select commands and empty search has a clear result", async () => {
  render(
    <MemoryRouter>
      <Sidebar />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("combobox", {
    name: "Search commands",
  });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(screen.getByTestId("location").textContent).toBe("/computers");
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  fireEvent.change(
    await screen.findByRole("combobox", { name: "Search commands" }),
    { target: { value: "xyznoresult" } },
  );
  expect(screen.queryAllByRole("option")).toHaveLength(0);
  expect(screen.getByText("No results for “xyznoresult”")).toBeTruthy();
});

test("computer mentions use keyboard selection and ask for permission before attaching", async () => {
  const projectId = orbitActions.createProject("Mention testing", "");
  const [mid] = orbitActions.createComputers({
    name: "Mention machine",
    os: "ubuntu",
    cpu: 4,
    ramGb: 8,
    storageGb: 80,
  });
  render(
    <MemoryRouter>
      <AgentPanel
        width={480}
        collapsed={false}
        projectId={projectId}
        onToggle={() => {}}
      />
      <Location />
    </MemoryRouter>,
  );
  const input = screen.getByRole("combobox", { name: "Message your agent" });
  fireEvent.change(input, {
    target: { value: "Build on @Mention", selectionStart: 17 },
  });
  expect(
    await screen.findByRole("option", { name: /Mention machine/ }),
  ).toBeTruthy();
  fireEvent.keyDown(input, { key: "Enter" });
  expect((input as HTMLTextAreaElement).value).toContain("@Mention machine");
  expect(screen.getByText("@Mention machine").className).toContain(
    "text-sky-300",
  );
  const draft = "Build on @Mention machine please";
  fireEvent.change(input, {
    target: { value: draft, selectionStart: draft.length },
  });
  expect(
    screen.queryByRole("listbox", { name: "Mention a computer" }),
  ).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  const cid = getOrbitState().activeConversations.personal;
  expect(getOrbitState().tasks.find((t) => t.id === cid)?.machineIds).toEqual(
    [],
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Allow this conversation" }),
  );
  expect(getOrbitState().tasks.find((t) => t.id === cid)?.machineIds).toEqual([
    mid,
  ]);
  expect(screen.getByTestId("location").textContent).toBe("/computers/" + mid);
});

test("agent responses render markdown and tool details without raw HTML execution", () => {
  const view = render(
    <AgentMessage
      agentName="Orbit agent"
      message={{
        role: "assistant",
        content:
          "**Ready**\n\n- First item\n- Second item\n\n<script>alert(1)</script>",
      }}
    />,
  );
  expect(view.container.querySelector("strong")?.textContent).toBe("Ready");
  expect(view.container.querySelectorAll("li")).toHaveLength(2);
  expect(view.container.querySelector("script")).toBeNull();
  view.rerender(
    <AgentMessage
      agentName="Orbit agent"
      message={{
        role: "assistant",
        content: "Run command",
        tool: { name: "terminal", input: "pwd", output: "/workspace" },
      }}
    />,
  );
  expect(screen.getByText("$ pwd")).toBeTruthy();
  expect(screen.getByText("/workspace")).toBeTruthy();
});

test("desktop fitting preserves the chosen aspect ratio within the available pane", () => {
  expect(fitDesktop(1000, 500, "16:10")).toEqual({ width: 800, height: 500 });
  expect(fitDesktop(800, 900, "16:9")).toEqual({ width: 800, height: 450 });
  expect(fitDesktop(800, 900, "fill")).toEqual({ width: 800, height: 900 });
});

test("preview orbs follow execution and automatic input yielding", () => {
  vi.useFakeTimers();
  try {
    const projectId = orbitActions.createProject("Orb testing", "");
    const cid = orbitActions.createConversation(
      projectId,
      "fleet-agent",
      "Preview the work",
    );
    const [mid] = orbitActions.createComputers({
      name: "Orb computer",
      os: "ubuntu",
      cpu: 4,
      ramGb: 8,
      storageGb: 80,
    });
    orbitActions.attachComputers(cid, [mid]);
    const view = render(
      <MemoryRouter>
        <AgentPanel
          width={480}
          collapsed={false}
          projectId={projectId}
          onToggle={() => {}}
        />
      </MemoryRouter>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Run preview" }));
    expect(
      view.container.querySelector('[data-orb-phase="working"]'),
    ).toBeTruthy();
    act(() => vi.advanceTimersByTime(1100));
    expect(
      view.container.querySelector('[data-orb-phase="searching"]'),
    ).toBeTruthy();
    let token = "";
    act(() => {
      token = orbitActions.beginInteraction(mid);
    });
    act(() => vi.advanceTimersByTime(2500));
    expect(getOrbitState().tasks.find((t) => t.id === cid)!.step).toBe(1);
    expect(
      view.container.querySelector('[data-orb-phase="waiting"]'),
    ).toBeTruthy();
    act(() => orbitActions.endInteraction(mid, token));
    act(() => vi.advanceTimersByTime(1100));
    expect(
      view.container.querySelector('[data-orb-phase="composing"]'),
    ).toBeTruthy();
    act(() => vi.advanceTimersByTime(1100));
    expect(screen.getByRole("button", { name: "Approve result" })).toBeTruthy();
    expect(view.container.querySelectorAll("details[open]")).toHaveLength(0);
    view.unmount();
  } finally {
    vi.useRealTimers();
  }
});

test("conversation setup is tucked away without hiding access choices", async () => {
  const projectId = orbitActions.createProject("Settings testing", "");
  orbitActions.createConversation(projectId, "fleet-agent", "A conversation");
  render(
    <MemoryRouter>
      <AgentPanel
        width={480}
        collapsed={false}
        projectId={projectId}
        onToggle={() => {}}
      />
    </MemoryRouter>,
  );
  expect(
    screen.queryByRole("combobox", { name: "Computer permissions" }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Conversation settings" }),
  );
  expect(
    await screen.findByRole("combobox", { name: "Computer permissions" }),
  ).toBeTruthy();
  expect(screen.getByRole("button", { name: "Manage agents" })).toBeTruthy();
});

test("each project can create a session directly and its first message names it", async () => {
  const projectId = orbitActions.createProject("Project session test", "");
  render(
    <MemoryRouter>
      <Sidebar />
      <Location />
    </MemoryRouter>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "New session in Project session test" }),
  );
  const session = getOrbitState().tasks[0]!;
  expect(session.projectId).toBe(projectId);
  expect(session.title).toBe("New session");
  expect(screen.getByTestId("location").textContent).toBe(
    "/sessions/" + session.id,
  );
  expect(
    screen.getAllByRole("link", { name: "New session" }).length,
  ).toBeGreaterThan(0);
  act(() => orbitActions.message(session.id, "Build our landing page"));
  expect(getOrbitState().tasks[0].title).toBe("Build our landing page");
});

test("computer tabs stay scoped to the current session and keep its conversation selected", () => {
  const projectId = orbitActions.createProject("Tab testing", "");
  const sessionId = orbitActions.createSession(projectId);
  const ids = orbitActions.createComputers(
    { name: "Session tab", os: "ubuntu", cpu: 4, ramGb: 8, storageGb: 80 },
    2,
  );
  const [unrelated] = orbitActions.createComputers({
    name: "Not in session",
    os: "windows",
    cpu: 4,
    ramGb: 8,
    storageGb: 80,
  });
  orbitActions.attachComputers(sessionId, ids);
  render(
    <MemoryRouter>
      <SessionComputerTabs machineId={ids[0]} />
      <Location />
    </MemoryRouter>,
  );
  const nav = screen.getByRole("navigation", { name: "Session computers" });
  expect(nav.querySelectorAll("a")).toHaveLength(2);
  expect(nav.textContent).not.toContain("Not in session");
  fireEvent.click(nav.querySelectorAll("a")[1]);
  expect(screen.getByTestId("location").textContent).toBe(
    "/computers/" + ids[1],
  );
  expect(getOrbitState().activeConversations.personal).toBe(sessionId);
});
test("sidebar collapses without losing the draft, keeps search accessible, and remembers the preference", async () => {
  const view = render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  );
  const input = screen.getByRole("combobox", { name: "Message your agent" });
  fireEvent.change(input, { target: { value: "Keep my draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(
    screen.queryByRole("navigation", { name: "Main navigation" }),
  ).toBeNull();
  expect(
    screen.queryByRole("navigation", { name: "Quick navigation" }),
  ).toBeNull();
  expect(
    screen.queryByRole("complementary", { name: "Workspace sidebar" }),
  ).toBeNull();
  expect((input as HTMLTextAreaElement).value).toBe("Keep my draft");
  expect(localStorage.getItem("orbit.sidebar-collapsed")).toBe("true");
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("combobox", {
    name: "Search commands",
  });
  fireEvent.keyDown(search, { key: "Escape" });
  await waitFor(() =>
    expect(
      screen.queryByRole("combobox", { name: "Search commands" }),
    ).toBeNull(),
  );
  fireEvent.keyDown(window, { key: "\\", ctrlKey: true });
  expect(screen.getByRole("button", { name: "Collapse sidebar" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  view.unmount();
  render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  );
  expect(screen.getByRole("button", { name: "Expand sidebar" })).toBeTruthy();
});

test("welcome suggestions populate the composer without sending or provisioning", async () => {
  const projectId = orbitActions.createProject("Welcome testing", "");
  render(
    <MemoryRouter>
      <AgentPanel
        projectId={projectId}
        width={480}
        collapsed={false}
        onToggle={() => {}}
      />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: /Build & test/ }));
  const input = screen.getByRole("combobox", { name: "Message your agent" });
  expect((input as HTMLTextAreaElement).value).toContain(
    "Help me build and test",
  );
  await waitFor(() => expect(document.activeElement).toBe(input));
  expect(getOrbitState().activeConversations.personal).toBeUndefined();
});

test("a session without a computer has an actionable empty state and opens its new desktop", async () => {
  const projectId = orbitActions.createProject("Empty session testing", "");
  const id = orbitActions.createSession(projectId);
  render(
    <MemoryRouter initialEntries={["/sessions/" + id]}>
      <Routes>
        <Route
          path="/sessions/:taskId"
          element={<ConversationWorkspacePage />}
        />
        <Route
          path="/computers/:machineId"
          element={<p>Desktop destination</p>}
        />
      </Routes>
    </MemoryRouter>,
  );
  expect(screen.getByText("Your workspace is ready")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "New computer" }));
  fireEvent.click(
    await screen.findByRole("button", { name: "Create computer", exact: true }),
  );
  await screen.findByText("Desktop destination");
  expect(
    getOrbitState().tasks.find((t) => t.id === id)?.machineIds,
  ).toHaveLength(1);
});
