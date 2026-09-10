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
test("skills profiles save reusable instructions", async () => {
  const { SkillsPage } = await import("../src/pages/skills-page");
  render(<MemoryRouter><SkillsPage /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "New instructions" }));
  fireEvent.change(screen.getByRole("textbox", { name: "Name" }), { target: { value: "Careful reviewer" } });
  fireEvent.change(screen.getByRole("textbox", { name: "Instructions" }), { target: { value: "Ask before modifying production files." } });
  fireEvent.click(screen.getByRole("button", { name: "Save instructions" }));
  await waitFor(() => expect(getOrbitState().agents.some((a) => a.name === "Careful reviewer" && a.instructions === "Ask before modifying production files.")).toBe(true));
});

test("Computers is full width while New conversation keeps chat beside the fleet", async () => {
  const { ComputerFleet } = await import("../src/pages/project-overview-page");
  render(<MemoryRouter initialEntries={["/computers"]}><Routes><Route element={<AppShell />}><Route path="computers" element={<ComputerFleet />} /><Route path="new" element={<ComputerFleet />} /></Route></Routes></MemoryRouter>);
  expect(screen.queryByRole("combobox", { name: "Message your agent" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Show chat" })).toBeNull();
  expect(screen.getAllByText(/vCPU · .* GB memory · .* GB disk/).length).toBeGreaterThan(0);
  fireEvent.click(screen.getByRole("link", { name: "New conversation" }));
  expect(await screen.findByRole("combobox", { name: "Message your agent" })).toBeTruthy();
});
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
  ).toBe("New conversationComputersSkills");
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
  fireEvent.change(search, { target: { value: "Skills & instructions" } });
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
      <AgentPanel width={480} projectId={projectId} />
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
  fireEvent.click(
    screen.getByRole("button", { name: "Add attachments or computers" }),
  );
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
  expect(screen.getByTestId("location").textContent).toBe("/sessions/" + conversationId);
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

test("agent stays alongside other pages with one sidebar toggle and keyboard resizing", async () => {
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
  expect(screen.queryByRole("button", { name: "Hide agent" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Show agent" })).toBeNull();
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
    <MemoryRouter initialEntries={["/projects/" + projectId]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="projects/:projectId" element={<p>Project computers</p>} />
          <Route path="sessions/:taskId" element={<ConversationWorkspacePage />} />
        </Route>
      </Routes>
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
  expect(screen.getByTestId("location").textContent).toBe("/sessions/" + cid);
  expect(screen.getByRole("combobox", { name: "Message your agent" })).toBeTruthy();
  const tabs = screen.getByRole("navigation", { name: "Session computers" });
  expect(tabs.querySelector('[aria-current="page"]')?.getAttribute("href")).toBe("/sessions/" + cid + "?computer=" + mid);
  expect(screen.getByRole("separator", { name: "Resize conversation" })).toBeTruthy();
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

  view.rerender(
    <AgentMessage
      agentName="Orbit agent"
      message={{
        role: "assistant",
        content: "Using desktop",
        tool: {
          name: "computer",
          input: JSON.stringify({ machineId: "mine", action: { type: "click", x: 300, y: 400, button: "left", double: true } }),
          output: "Click completed",
          status: "completed",
        },
      }}
    />,
  );
  expect(screen.getByText("click (300, 400) double [left]")).toBeTruthy();
  expect(screen.getByText("Completed")).toBeTruthy();

  view.rerender(
    <AgentMessage
      agentName="Orbit agent"
      message={{
        role: "assistant",
        content: "Running command",
        tool: {
          name: "terminal",
          input: JSON.stringify({ machineId: "mine", command: "uname -a" }),
          output: "",
          status: "running",
        },
      }}
    />,
  );
  expect(screen.getByText("$ uname -a")).toBeTruthy();
  expect(screen.getByText("Running")).toBeTruthy();
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
        <AgentPanel width={480} projectId={projectId} />
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
      <AgentPanel width={480} projectId={projectId} />
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
  expect(
    screen.getByRole("button", { name: "Skills & instructions" }),
  ).toBeTruthy();
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
    "/sessions/" + sessionId,
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
      <AgentPanel projectId={projectId} width={480} />
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
  await screen.findByRole("navigation", { name: "Session computers" });
  expect(
    getOrbitState().tasks.find((t) => t.id === id)?.machineIds,
  ).toHaveLength(1);
});
test("window toolbar navigates back and forward and survives hiding the sidebar", () => {
  render(
    <MemoryRouter initialEntries={["/new"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="new"
            element={<Link to="/agents">Open agent settings</Link>}
          />
          <Route path="agents" element={<p>Agent settings destination</p>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  expect(
    (screen.getByRole("button", { name: "Go back" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  expect(
    (screen.getByRole("button", { name: "Go forward" }) as HTMLButtonElement)
      .disabled,
  ).toBe(true);
  fireEvent.click(screen.getByRole("link", { name: "Open agent settings" }));
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  fireEvent.click(screen.getByRole("button", { name: "Go back" }));
  expect(
    screen.getByRole("link", { name: "Open agent settings" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Go forward" }));
  expect(screen.getByText("Agent settings destination")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Expand sidebar" }));
  expect(
    (screen.getByRole("button", { name: "Go back" }) as HTMLButtonElement)
      .disabled,
  ).toBe(false);
});
test("the plus menu opens the file picker, supports removal, and sends local attachments without text", async () => {
  const projectId = orbitActions.createProject("Attachments testing", "");
  render(
    <MemoryRouter>
      <AgentPanel projectId={projectId} width={480} />
    </MemoryRouter>,
  );
  const input = screen.getByLabelText("Attach files") as HTMLInputElement;
  const picker = vi.spyOn(input, "click");
  fireEvent.click(
    screen.getByRole("button", { name: "Add attachments or computers" }),
  );
  fireEvent.click(
    await screen.findByRole("menuitem", { name: "Attach files" }),
  );
  expect(picker).toHaveBeenCalledOnce();
  picker.mockRestore();
  const user = userEvent.setup();
  await user.upload(
    input,
    new File(["first"], "remove-me.txt", { type: "text/plain" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Remove remove-me.txt" }));
  expect(screen.queryByText("remove-me.txt")).toBeNull();
  await user.upload(
    input,
    new File(["Keep the contents"], "brief.txt", { type: "text/plain" }),
  );
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  await waitFor(() => {
    const id = getOrbitState().activeConversations.personal;
    expect(
      getOrbitState().tasks.find((t) => t.id === id)?.messages[0]
        .attachments?.[0].name,
    ).toBe("brief.txt");
  });
  expect(screen.queryByRole("button", { name: "Remove brief.txt" })).toBeNull();
  expect(
    screen.getByRole("button", { name: "Preview brief.txt" }),
  ).toBeTruthy();
  const id = getOrbitState().activeConversations.personal;
  const attachment = getOrbitState().tasks.find((t) => t.id === id)!.messages[0]
    .attachments![0];
  const { loadAttachment } = await import("../src/lib/chat-attachments");
  expect(await (await loadAttachment("personal", attachment.id)).text()).toBe(
    "Keep the contents",
  );
});

test("attachment errors keep the draft and do not send a message", async () => {
  const projectId = orbitActions.createProject("Attachment limit testing", "");
  render(
    <MemoryRouter>
      <AgentPanel projectId={projectId} width={480} />
    </MemoryRouter>,
  );
  const input = screen.getByLabelText("Attach files") as HTMLInputElement;
  const files = Array.from(
    { length: 9 },
    (_, index) => new File(["x"], index + ".txt"),
  );
  await userEvent.setup().upload(input, files);
  expect(screen.getByText("Attach up to 8 files at a time.")).toBeTruthy();
  expect(getOrbitState().activeConversations.personal).toBeUndefined();
});
test("a local storage failure preserves the attachment and draft for retry", async () => {
  const projectId = orbitActions.createProject("Attachment retry testing", "");
  render(
    <MemoryRouter>
      <AgentPanel projectId={projectId} width={480} />
    </MemoryRouter>,
  );
  fireEvent.change(
    screen.getByRole("combobox", { name: "Message your agent" }),
    { target: { value: "Please review this" } },
  );
  await userEvent
    .setup()
    .upload(
      screen.getByLabelText("Attach files"),
      new File(["contents"], "retry.txt"),
    );
  const fail = vi.spyOn(indexedDB, "open").mockImplementationOnce(() => {
    throw new Error("Local storage unavailable");
  });
  try {
    fireEvent.click(screen.getByRole("button", { name: "Send message" }));
    await screen.findByText("Local storage unavailable");
    expect(
      (
        screen.getByRole("combobox", {
          name: "Message your agent",
        }) as HTMLTextAreaElement
      ).value,
    ).toBe("Please review this");
    expect(
      screen.getByRole("button", { name: "Remove retry.txt" }),
    ).toBeTruthy();
    expect(getOrbitState().activeConversations.personal).toBeUndefined();
  } finally {
    fail.mockRestore();
  }
});

test("folder names toggle all sessions and the plain plus reopens a closed folder", () => {
  const projectId = orbitActions.createProject("Open folder testing", "");
  for (let index = 0; index < 7; index++) orbitActions.createSession(projectId);
  render(
    <MemoryRouter>
      <Sidebar />
    </MemoryRouter>,
  );
  const folder = screen.getByRole("button", {
    name: "Toggle Open folder testing",
  });
  const region = () => document.getElementById("project-sessions-" + projectId);
  expect(folder.getAttribute("aria-expanded")).toBe("true");
  expect(region()?.querySelectorAll("a")).toHaveLength(7);
  fireEvent.click(screen.getByText("Open folder testing"));
  expect(folder.getAttribute("aria-expanded")).toBe("false");
  expect(region()).toBeNull();
  fireEvent.click(screen.getByText("Open folder testing"));
  expect(region()?.querySelectorAll("a")).toHaveLength(7);
  fireEvent.click(folder);
  const plus = screen.getByRole("button", {
    name: "New session in Open folder testing",
  });
  expect(plus.className).toContain("bg-transparent");
  expect(plus.className).not.toContain("hover:bg");
  fireEvent.click(plus);
  expect(folder.getAttribute("aria-expanded")).toBe("true");
  expect(region()?.querySelectorAll("a")).toHaveLength(8);
});

test("agent identity lives inside the conversation and only the window sidebar toggle remains", () => {
  const projectId = orbitActions.createProject("Inline identity testing", "");
  orbitActions.createConversation(projectId, "fleet-agent", "Work with me");
  const agentName = getOrbitState().agents.find(
    (agent) => agent.id === "fleet-agent",
  )!.name;
  render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  );
  const log = screen.getByRole("log", { name: "Agent conversation" });
  expect(log.textContent).toContain(agentName);
  expect(log.querySelector('[data-orb-phase="idle"]')).toBeTruthy();
  expect(screen.getAllByText(agentName, { exact: true })).toHaveLength(1);
  expect(
    screen.getAllByRole("button", { name: /Collapse sidebar/ }),
  ).toHaveLength(1);
  expect(screen.queryByRole("button", { name: "Hide agent" })).toBeNull();
  expect(
    screen
      .getByRole("button", { name: "Conversation settings" })
      .closest("form"),
  ).toBeTruthy();
});

test("chat can hide completely and reopen without losing its draft", () => {
  render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  );
  const input = screen.getByRole("combobox", { name: "Message your agent" });
  fireEvent.change(input, { target: { value: "Keep this chat draft" } });
  fireEvent.click(screen.getByRole("button", { name: "Hide chat" }));
  expect(
    screen.queryByRole("combobox", { name: "Message your agent" }),
  ).toBeNull();
  expect(
    screen.queryByRole("separator", { name: "Resize conversation" }),
  ).toBeNull();
  expect(
    screen.getByRole("navigation", { name: "Main navigation" }),
  ).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  expect(screen.getByRole("button", { name: "Show chat" })).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Show chat" }));
  expect(
    (
      screen.getByRole("combobox", {
        name: "Message your agent",
      }) as HTMLTextAreaElement
    ).value,
  ).toBe("Keep this chat draft");
  expect(
    screen.getByRole("separator", { name: "Resize conversation" }),
  ).toBeTruthy();
  expect(
    screen.queryByRole("navigation", { name: "Main navigation" }),
  ).toBeNull();
});

test("collapsing chat leaves a visible caret at the chat edge rather than the far workspace corner", () => {
  render(
    <MemoryRouter>
      <AppShell />
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Hide chat" }));
  const restore = screen.getByRole("button", { name: "Show chat" });
  expect(restore.parentElement?.getAttribute("aria-label")).toBe(
    "Collapsed chat",
  );
  expect(restore.parentElement?.nextElementSibling?.tagName).toBe("MAIN");
  expect(restore.closest("[hidden]")).toBeNull();
  fireEvent.click(restore);
  expect(
    screen.getByRole("combobox", { name: "Message your agent" }),
  ).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Show chat" })).toBeNull();
});

test("hiding both panels keeps the computer header draggable without covering window controls", async () => {
  const [id] = orbitActions.createComputers({
    name: "Drag testing",
    os: "ubuntu",
    cpu: 4,
    ramGb: 8,
    storageGb: 80,
  });
  const machine = getOrbitState().machines.find((m) => m.id === id)!;
  render(
    <MemoryRouter initialEntries={["/computer"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route
            path="computer"
            element={<MachineViewport machine={machine} />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Collapse sidebar" }));
  fireEvent.click(screen.getByRole("button", { name: "Hide chat" }));
  const main = screen.getByRole("main");
  expect(main.className).toContain("[&_.window-drag]:ml-[148px]");
  expect(main.className).not.toContain("no-drag");
  expect(main.querySelector(".window-drag")).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Computer actions" }));
  expect(
    await screen.findByRole("menuitem", { name: "Rename computer" }),
  ).toBeTruthy();
});

test("fleet opens a standalone desktop and the plus picker adds computers without duplicates", async () => {
  const projectId = orbitActions.createProject("Standalone desktop", "");
  const sessionId = orbitActions.createSession(projectId);
  const ids = orbitActions.createComputers(
    { name: "Standalone", os: "ubuntu", cpu: 4, ramGb: 8, storageGb: 80 },
    2,
  );
  orbitActions.attachComputers(sessionId, [ids[0]]);
  const { ComputerFleet } = await import("../src/pages/project-overview-page");
  const { MachineWorkspacePage } = await import("../src/pages/machine-workspace-page");
  render(
    <MemoryRouter initialEntries={["/computers"]}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="computers" element={<ComputerFleet />} />
          <Route path="computers/:machineId" element={<MachineWorkspacePage />} />
        </Route>
      </Routes>
      <Location />
    </MemoryRouter>,
  );
  const machines = getOrbitState().machines.filter((m) => ids.includes(m.id));
  fireEvent.click(screen.getByRole("link", { name: "Open " + machines[0].name }));
  expect(screen.getByTestId("location").textContent).toBe("/computers/" + ids[0]);
  expect(screen.queryByRole("combobox", { name: "Message your agent" })).toBeNull();
  expect(screen.queryByRole("button", { name: "Show chat" })).toBeNull();
  const tabs = () => screen.getByRole("navigation", { name: "Workspace computers" });
  expect(tabs().querySelectorAll("a")).toHaveLength(1);
  fireEvent.click(screen.getByRole("button", { name: "Open another computer" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(machines[1].name) }));
  expect(screen.getByTestId("location").textContent).toBe("/computers/" + ids[1]);
  expect(tabs().querySelectorAll("a")).toHaveLength(2);
  fireEvent.click(screen.getByRole("button", { name: "Open another computer" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(machines[0].name) }));
  expect(tabs().querySelectorAll("a")).toHaveLength(2);
  expect(tabs().querySelector('[aria-current="page"]')?.textContent).toBe(machines[0].name);
  fireEvent.click(screen.getByRole("button", { name: "Close " + machines[1].name }));
  expect(tabs().querySelectorAll("a")).toHaveLength(1);
  expect(screen.getByTestId("location").textContent).toBe("/computers/" + ids[0]);
  fireEvent.click(screen.getByRole("button", { name: "Open another computer" }));
  fireEvent.click(await screen.findByRole("menuitem", { name: new RegExp(machines[1].name) }));
  fireEvent.click(screen.getByRole("button", { name: "Close " + machines[1].name }));
  expect(tabs().querySelectorAll("a")).toHaveLength(1);
  expect(screen.getByTestId("location").textContent).toBe("/computers/" + ids[0]);
  fireEvent.click(screen.getByRole("button", { name: "Close " + machines[0].name }));
  expect(screen.getByTestId("location").textContent).toBe("/computers");
  expect(screen.getByRole("link", { name: "Open " + machines[0].name })).toBeTruthy();
  expect(getOrbitState().activeConversations.personal).toBe(sessionId);
  expect(getOrbitState().tasks.find((t) => t.id === sessionId)?.machineIds).toEqual([ids[0]]);
});

test("session rows show running spinners and allow deleting the open session", async () => {
  const projectId = orbitActions.createProject("Session deletion", "");
  const id = orbitActions.createConversation(projectId, "fleet-agent", "Delete this session");
  const [computer] = orbitActions.createComputers({name:"Session deletion computer",os:"ubuntu",cpu:2,ramGb:4,storageGb:40});
  orbitActions.attachComputers(id, [computer!]);
  orbitActions.taskAction(id, "resume");
  render(<MemoryRouter initialEntries={["/sessions/" + id]}><Sidebar /><Location /></MemoryRouter>);
  expect(screen.getAllByRole("status", {name:"Delete this session is running"})).toHaveLength(2);
  act(() => orbitActions.taskAction(id, "pause"));
  expect(screen.queryByRole("status", {name:"Delete this session is running"})).toBeNull();
  fireEvent.click(screen.getAllByRole("button", {name:"Session actions for Delete this session"})[0]!);
  fireEvent.click(await screen.findByRole("menuitem", {name:"Delete session"}));
  fireEvent.click(await screen.findByRole("button", {name:"Cancel"}));
  expect(getOrbitState().tasks.some((t) => t.id === id)).toBe(true);
  fireEvent.click(screen.getAllByRole("button", {name:"Session actions for Delete this session"})[0]!);
  fireEvent.click(await screen.findByRole("menuitem", {name:"Delete session"}));
  fireEvent.click(await screen.findByRole("button", {name:"Delete session",exact:true}));
  await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/new"));
  expect(screen.queryByRole("link", {name:"Delete this session"})).toBeNull();
  expect(getOrbitState().machines.some((m) => m.id === computer)).toBe(true);
});
