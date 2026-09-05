import userEvent from "@testing-library/user-event";
import { beforeEach, expect, test } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { AppShell } from "../src/components/app-shell";
import { Sidebar } from "../src/components/sidebar";
import { SelectControl } from "../src/components/ui/select";
import { AgentPanel } from "../src/components/agent-panel";
import { orbitActions, getOrbitState } from "../src/lib/orbit-store";
import { MachineViewport } from "../src/components/machine-viewport";
import { useState } from "react";

function Location() { return <output data-testid="location">{useLocation().pathname}</output>; }
beforeEach(() => { orbitActions.switchWorkspace("personal"); orbitActions.newConversation(); });

test("workspace menu labels have a group context and workspace switching works", async () => {
  render(<MemoryRouter><Sidebar /><Location /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: /Precious Kayili/ }));
  expect(await screen.findByText("Workspaces", { exact: true })).toBeTruthy();
  fireEvent.click(screen.getByRole("menuitem", { name: "Orbit team" }));
  await waitFor(() => expect(getOrbitState().workspaceId).toBe("team"));
  expect(screen.getByTestId("location").textContent).toBe("/projects");
});
test("sidebar has only essential navigation, a plus project action, and collapsible folders", () => {
  render(<MemoryRouter><Sidebar /></MemoryRouter>);
  expect(screen.getByRole("navigation", { name: "Main navigation" }).textContent).toBe("New conversationComputersAgents");
  const add = screen.getByRole("button", { name: "New project" });
  expect(add.textContent).toBe("");
  const project = screen.getAllByRole("button", { expanded: true })[0];
  fireEvent.click(project);
  expect(project.getAttribute("aria-expanded")).toBe("false");
  fireEvent.click(project);
  expect(project.getAttribute("aria-expanded")).toBe("true");
});
test("Cmd K searches, Enter navigates, and Escape dismisses", async () => {
  render(<MemoryRouter><Sidebar /><Location /></MemoryRouter>);
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("combobox", { name: "Search commands" });
  fireEvent.change(search, { target: { value: "Agent skills" } });
  fireEvent.keyDown(search, { key: "Enter" });
  await waitFor(() => expect(screen.getByTestId("location").textContent).toBe("/skills"));
  fireEvent.keyDown(window, { key: "k", ctrlKey: true });
  const reopened = await screen.findByRole("combobox", { name: "Search commands" });
  fireEvent.keyDown(reopened, { key: "Escape" });
  await waitFor(() => expect(screen.queryByRole("combobox", { name: "Search commands" })).toBeNull());
});
test("custom Base UI select changes value without a native select", async () => {
  function Example() {
    const [value, setValue] = useState(4);
    return <><SelectControl label="CPU" value={value} onValueChange={setValue} options={[{ value: 4, label: "4 vCPU" }, { value: 8, label: "8 vCPU" }]} /><output data-testid="cpu">{value}</output></>;
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
  render(<MemoryRouter><AgentPanel width={480} collapsed={false} projectId={projectId} onToggle={() => {}} /><Location /></MemoryRouter>);
  fireEvent.change(screen.getByRole("textbox", { name: "Message your agent" }), { target: { value: "Help me build an app" } });
  fireEvent.click(screen.getByRole("button", { name: "Send message" }));
  const conversationId = getOrbitState().activeConversations.personal;
  expect(screen.getByTestId("location").textContent).toBe("/sessions/" + conversationId);
  expect(screen.getByRole("log").textContent).toContain("Help me build an app");
  fireEvent.click(screen.getByRole("button", { name: "New computer" }));
  fireEvent.click(await screen.findByRole("button", { name: "Create computer", exact: true }));
  await waitFor(() => expect(getOrbitState().tasks.find(t => t.id === conversationId)?.machineIds.length).toBe(1));
  expect(screen.getByTestId("location").textContent).toContain("/machines/");
  expect(screen.getByRole("button", { name: "Continue", exact: true })).toBeTruthy();
});
test("computer desktop opens files; takeover enables editing and handback protects them", async () => {
  const projectId = orbitActions.createProject("Desktop testing", "");
  const [mid] = orbitActions.createFleet(projectId, { name: "GUI test", os: "ubuntu", cpu: 4, ramGb: 8, storageGb: 80 });
  const machine = getOrbitState().machines.find(m => m.id === mid)!;
  render(<MemoryRouter><MachineViewport machine={machine} /></MemoryRouter>);
  fireEvent.click(screen.getByRole("button", { name: "Open Files", exact: true }));
  expect(screen.getByRole("button", { name: "Save file" }).hasAttribute("disabled")).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "Take control" }));
  fireEvent.change(screen.getByRole("textbox", { name: "File contents" }), { target: { value: "Written in the GUI" } });
  fireEvent.click(screen.getByRole("button", { name: "Save file" }));
  expect(getOrbitState().files[mid]["README.md"]).toBe("Written in the GUI");
  fireEvent.click(screen.getByRole("button", { name: "Hand back to agent" }));
  expect(screen.getByRole("button", { name: "Save file" }).hasAttribute("disabled")).toBe(true);
});

test("agent stays alongside other pages; collapse, restore and keyboard resizing work", async () => {
  render(<MemoryRouter initialEntries={["/new"]}><Routes><Route element={<AppShell />}><Route path="new" element={<Link to="/agents">Visit agents</Link>} /><Route path="agents" element={<p>Agent settings canvas</p>} /></Route></Routes></MemoryRouter>);
  expect(screen.getByRole("textbox", { name: "Message your agent" })).toBeTruthy();
  const separator = screen.getByRole("separator", { name: "Resize conversation" });
  const before = Number(separator.getAttribute("aria-valuenow"));
  fireEvent.keyDown(separator, { key: "ArrowLeft" });
  expect(Number(separator.getAttribute("aria-valuenow"))).toBe(before - 16);
  fireEvent.click(screen.getByRole("button", { name: "Hide agent" }));
  expect(screen.queryByRole("textbox", { name: "Message your agent" })).toBeNull();
  fireEvent.click(screen.getByRole("button", { name: "Show agent" }));
  fireEvent.click(screen.getByRole("link", { name: "Visit agents" }));
  expect(screen.getByText("Agent settings canvas")).toBeTruthy();
  expect(screen.getByRole("textbox", { name: "Message your agent" })).toBeTruthy();
});

test("palette arrow keys select commands and empty search has a clear result", async () => {
  render(<MemoryRouter><Sidebar /><Location /></MemoryRouter>);
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  const search = await screen.findByRole("combobox", { name: "Search commands" });
  fireEvent.keyDown(search, { key: "ArrowDown" });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(screen.getByTestId("location").textContent).toBe("/projects");
  fireEvent.keyDown(window, { key: "k", metaKey: true });
  fireEvent.change(await screen.findByRole("combobox", { name: "Search commands" }), { target: { value: "xyznoresult" } });
  expect(screen.queryAllByRole("option")).toHaveLength(0);
  expect(screen.getByText('No results for “xyznoresult”')).toBeTruthy();
});
