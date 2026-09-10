import { cloudComputersEnabled, liveAgentsEnabled } from "@/lib/computer-config";
import { liveAgents, agentActive } from "@/lib/live-agents";
import type { AgentControl } from "@orbit/shared";
import { AttachmentGrid } from "./attachment-grid";
import { filePreview } from "@/lib/file-preview";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText,
  ArrowUp,
  DotsThree,
  Monitor,
  Plus,
  Robot,
  SidebarSimple,
} from "./ui/icons";
import { Button } from "./ui/button";
import { SelectControl } from "./ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { CreateMachineDialog } from "./create-machine-dialog";
import { CreateContainer, ErrorNotice, Field } from "./flow-ui";
import { OsLogo } from "./os-logo";
import { ComputerMentionInput } from "./computer-mention-input";
import { AgentMessage } from "./agent-message";
import { AgentWelcome } from "./agent-welcome";
import { useOrbit } from "@/hooks/use-orbit";
import { useAgentPreview } from "@/hooks/use-agent-preview";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { mentionedComputers } from "@/lib/computer-mentions";
import {
  saveAttachments,
  removeAttachments,
  validateAttachments,
  type ChatAttachment,
} from "@/lib/chat-attachments";
import { orbitActions } from "@/lib/orbit-store";

export function AgentPanel({
  projectId: routeProjectId,
  width,
  floatingControls = false,
  onHide,
}: {
  projectId: string;
  width: number;
  floatingControls?: boolean;
  onHide?: () => void;
}) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [sending, setSending] = useState(false);
  const sendingRef = useRef(false);
  const contextRef = useRef("");
  const composer = useRef<HTMLTextAreaElement>(null);
  const state = useOrbit();
  const navigate = useNavigate();
  const projects = state.projects.filter(
    (p) => p.workspaceId === state.workspaceId,
  );
  const agents = state.agents.filter(
    (a) => a.workspaceId === state.workspaceId,
  );
  const conversation = state.tasks.find(
    (t) =>
      t.id === state.activeConversations[state.workspaceId] &&
      projects.some((p) => p.id === t.projectId),
  );
  const [chosenProject, setChosenProject] = useState("");
  const [chosenAgent, setChosenAgent] = useState("");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const bottom = useRef<HTMLDivElement>(null);
  const projectId =
    conversation?.projectId ??
    projects.find((p) => p.id === chosenProject)?.id ??
    projects.find((p) => p.id === routeProjectId)?.id ??
    projects[0]?.id ??
    "";
  const agentId =
    conversation?.agentId ??
    agents.find((a) => a.id === chosenAgent)?.id ??
    agents[0]?.id ??
    "";
  const agentName = agents.find((a) => a.id === agentId)?.name ?? "Orbit agent";
  const allComputers = workspaceComputers(state);
  const computers = allComputers.filter((m) =>
    conversation?.machineIds.includes(m.id),
  );
  const available = allComputers.filter(
    (m) =>
      !state.tasks.some(
        (t) =>
          ["running", "paused", "review"].includes(t.status) &&
          t.machineIds.includes(m.id),
      ),
  );
  const interacting = computers.some((m) => state.control[m.id] === "human");
  const ended = Boolean(
    conversation && ["completed", "cancelled"].includes(conversation.status),
  );
  contextRef.current = state.workspaceId + ":" + (conversation?.id ?? "new");
  useEffect(
    () => () => {
      contextRef.current = "";
    },
    [],
  );
  const pending =
    conversation?.requests.filter((r) => r.status === "pending") ?? [];
  const lastUserMessageIndex =
    conversation?.messages.reduce(
      (last, message, index) => (message.role === "user" ? index : last),
      -1,
    ) ?? -1;
  const preview = useAgentPreview(conversation, setError);
  const liveRun = liveAgentsEnabled ? conversation?.liveRun : undefined;
  const activeRun = liveAgentsEnabled && agentActive(conversation);
  const phase = liveRun ? liveRun.status === "running" ? "working" : activeRun ? "waiting" : "idle" : preview.phase;
  const status = interacting
    ? "You’re interacting · agent is waiting"
    : activeRun
      ? liveRun?.approval ? "Waiting for your confirmation" : liveRun?.status === "paused" ? "Agent paused" : liveRun?.status === "waiting" ? "Agent waiting" : "Agent working"
    : liveRun?.status === "completed" ? "Ready for your next message"
    : liveRun?.status === "failed" ? "Agent stopped · check the error below"
    : preview.playing
      ? {
          working: "Preparing computers",
          searching: "Searching",
          composing: "Collecting results",
        }[preview.phase as "working" | "searching" | "composing"] + " · preview"
      : pending.length
        ? "Waiting for permission"
        : conversation?.status === "review"
          ? "Ready for your review"
          : ended
            ? "Run finished · computers retained"
            : computers.length
              ? computers.length +
                (computers.length === 1
                  ? " computer connected"
                  : " computers connected")
              : "Mention a computer, or add one below";

  useEffect(() => {
    bottom.current?.scrollIntoView?.({ block: "end", behavior: "smooth" });
  }, [conversation?.messages.length, conversation?.messages.at(-1)?.content, conversation?.id]);
  useEffect(() => {
    const selected = filePreview.get();
    if (selected && !("id" in selected.file) && !files.includes(selected.file))
      filePreview.close();
  }, [files]);
  useEffect(() => {
    setDraft("");
    setFiles([]);
    setError("");
    setSettingsOpen(false);
    setCreateOpen(false);
  }, [conversation?.id, state.workspaceId]);
  function act(fn: () => void) {
    try {
      fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  async function runAgent(id: string) {
    try { await liveAgents.start(id); setError(""); }
    catch (cause) { setError((cause as Error).message); }
  }
  async function controlAgent(action: AgentControl) {
    if (!liveRun) return;
    try { await liveAgents.control(state.workspaceId, liveRun.id, action); setError(""); }
    catch (cause) { setError((cause as Error).message); }
  }
  function ensureConversation() {
    return (
      conversation?.id ??
      orbitActions.createConversation(
        projectId,
        agentId,
        "Let’s set up a computer for our work.",
      )
    );
  }
  function attach(ids: string[]) {
    act(() => {
      const id = ensureConversation();
      orbitActions.attachComputers(id, ids);
      navigate("/sessions/" + id + "?computer=" + ids[0]);
    });
  }
  function selectFiles(selected: FileList | null) {
    if (!selected) return;
    try {
      const next = [...files];
      for (const file of Array.from(selected)) {
        if (
          !next.some(
            (existing) =>
              existing.name === file.name &&
              existing.size === file.size &&
              existing.lastModified === file.lastModified,
          )
        )
          next.push(file);
      }
      validateAttachments(next);
      setFiles(next);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
    if (fileInput.current) fileInput.current.value = "";
  }
  async function send() {
    if (
      sendingRef.current ||
      activeRun ||
      ended ||
      (!draft.trim() && !files.length) ||
      !projectId ||
      !agentId
    )
      return;
    const context = contextRef.current;
    const workspaceId = state.workspaceId;
    let saved: ChatAttachment[] = [];
    let committed = false;
    sendingRef.current = true;
    setSending(true);
    try {
      saved = files.length ? await saveAttachments(workspaceId, files) : [];
      if (contextRef.current !== context) {
        await removeAttachments(workspaceId, saved);
        return;
      }
      const content = draft.trim() || "Review the attached files.";
      const mentions = mentionedComputers(content, allComputers);
      let sessionId = conversation?.id;
      if (conversation)
        orbitActions.message(conversation.id, content, mentions, saved);
      else {
        const id = orbitActions.createConversation(
          projectId,
          agentId,
          content,
          mentions,
          saved,
        );
        navigate("/sessions/" + id);
        sessionId = id;
      }
      committed = true;
      setDraft("");
      setFiles([]);
      setError("");
      if (liveAgentsEnabled && sessionId) await runAgent(sessionId);
    } catch (e) {
      if (!committed)
        await removeAttachments(workspaceId, saved).catch(() => {});
      if (contextRef.current === context) setError((e as Error).message);
    } finally {
      sendingRef.current = false;
      setSending(false);
    }
  }
  return (
    <aside
      style={{ width }}
      className="flex min-h-0 min-w-[360px] shrink-0 flex-col bg-[#181818]"
    >
      <div
        className={
          "relative h-[54px] shrink-0 pr-12 " +
          (floatingControls ? "pl-[184px]" : "")
        }
      >
        <div className="window-drag h-full" />
        {onHide && (
          <button
            aria-label="Hide chat"
            aria-expanded={true}
            aria-controls="chat-panel"
            title="Hide chat"
            onClick={onHide}
            className="window-controls absolute right-3 top-[7px] z-30 rounded-md p-1.5 text-zinc-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 [&_svg]:pointer-events-none"
          >
            <SidebarSimple weight="regular" className="size-4 -scale-x-100" />
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-6">
        {!conversation?.messages.length ? (
          <div className="flex min-h-full flex-col justify-center py-10">
            <AgentWelcome
              onChoose={(prompt) => {
                setDraft(prompt);
                requestAnimationFrame(() => composer.current?.focus());
              }}
            />
            {!projects.length && (
              <div className="mt-6">
                <p className="mb-3 text-xs text-zinc-500">
                  Create a project to get started.
                </p>
                <CreateContainer kind="project" />
              </div>
            )}
            {!agents.length && (
              <Button
                variant="secondary"
                className="mt-4"
                onClick={() => navigate("/skills")}
              >
                Set up an agent
              </Button>
            )}
          </div>
        ) : (
          <div
            className="space-y-5 pt-5"
            role="log"
            aria-label="Agent conversation"
          >
            {conversation.messages.map((message, index) => (
              <AgentMessage
                key={index}
                message={message}
                agentName={agentName}
                phase={
                  index > lastUserMessageIndex
                    ? interacting
                      ? "waiting"
                      : phase
                    : "idle"
                }
                showAuthor={
                  index === 0 ||
                  conversation.messages[index - 1]?.role === "user"
                }
              />
            ))}
            {pending.map((request) => (
              <div key={request.id} className="rounded-xl bg-white/[0.055] p-4">
                <div className="flex items-center gap-2">
                  <Monitor className="size-4 text-zinc-500" />
                  <p className="text-sm text-zinc-200">
                    Use{" "}
                    {allComputers.find((m) => m.id === request.machineId)?.name}
                    ?
                  </p>
                </div>
                <p className="mt-2 text-xs leading-5 text-zinc-500">
                  Access for this conversation. You can work alongside the
                  agent.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    aria-label="Allow this conversation"
                    onClick={() =>
                      act(() => {
                        orbitActions.resolveComputerRequest(
                          conversation.id,
                          request.id,
                          true,
                        );
                        navigate("/sessions/" + conversation.id + "?computer=" + request.machineId);
                        if (liveAgentsEnabled) void runAgent(conversation.id);
                      })
                    }
                  >
                    Allow
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(() => {
                        orbitActions.resolveComputerRequest(
                          conversation.id,
                          request.id,
                          false,
                        );
                        if (liveAgentsEnabled) void runAgent(conversation.id);
                      })
                    }
                  >
                    Deny
                  </Button>
                </div>
              </div>
            ))}
            {conversation.artifacts.map((file) => (
              <a
                key={file.name}
                download={file.name}
                href={
                  "data:text/plain;charset=utf-8," +
                  encodeURIComponent(file.content)
                }
                className="block rounded-lg bg-white/[0.035] p-3 text-xs text-zinc-400"
              >
                ↓ {file.name}
              </a>
            ))}
            {liveRun?.approval && (
              <div className="rounded-xl bg-white/[0.055] p-4">
                <p className="text-sm text-zinc-200">Confirm this action</p>
                <p className="mt-2 whitespace-pre-wrap text-xs leading-5 text-zinc-400">{liveRun.approval.description}</p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" onClick={() => void controlAgent({ action: "approve", approvalId: liveRun.approval!.id, allow: true })}>Allow action</Button>
                  <Button size="sm" variant="ghost" onClick={() => void controlAgent({ action: "approve", approvalId: liveRun.approval!.id, allow: false })}>Deny action</Button>
                </div>
              </div>
            )}
          </div>
        )}
        <div ref={bottom} />
      </div>
      <div className="shrink-0 space-y-2 px-4 pb-4">
        {conversation && (
          <div className="flex min-h-9 items-center gap-2 px-1">
            <span
              role="status"
              className="min-w-0 flex-1 text-[11px] text-zinc-500"
            >
              {status}
            </span>
            {activeRun ? (
              <>
                <Button size="sm" variant="ghost" onClick={() => void controlAgent({ action: liveRun?.status === "paused" ? "resume" : "pause" })}>
                  {liveRun?.status === "paused" ? "Resume" : "Pause"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => void controlAgent({ action: "cancel" })}>Stop</Button>
              </>
            ) : liveAgentsEnabled && !ended && conversation.messages.some((m) => m.role === "user") && pending.length === 0 && liveRun?.status !== "completed" ? (
              <Button size="sm" variant="secondary" disabled={sending} onClick={() => void runAgent(conversation.id)}>Run agent</Button>
            ) : preview.playing ? (
              <Button size="sm" variant="ghost" onClick={preview.pause}>
                Pause
              </Button>
            ) : conversation.status === "review" ? (
              <Button
                size="sm"
                onClick={() =>
                  act(() => orbitActions.taskAction(conversation.id, "approve"))
                }
              >
                Approve result
              </Button>
            ) : !cloudComputersEnabled && !ended &&
              !interacting &&
              computers.length > 0 &&
              pending.length === 0 ? (
              <Button size="sm" variant="secondary" onClick={preview.start}>
                Run preview
              </Button>
            ) : null}
          </div>
        )}
        <ErrorNotice message={error} />
        <ErrorNotice message={liveRun?.error ?? ""} />
        <form
          className="rounded-2xl bg-[#262626] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <input
            ref={fileInput}
            type="file"
            multiple
            hidden
            aria-label="Attach files"
            disabled={sending}
            onChange={(event) => selectFiles(event.target.files)}
          />
          {files.length > 0 && (
            <div
              className="mb-3 max-h-56 space-y-1.5 overflow-y-auto"
              aria-label="Pending attachments"
            >
              <AttachmentGrid
                files={files}
                workspaceId={state.workspaceId}
                disabled={sending}
                onRemove={(index) =>
                  setFiles((current) => current.filter((_, i) => i !== index))
                }
              />
              <p className="px-1 text-[10px] text-zinc-500">
                Stored locally · not uploaded to an agent
              </p>
            </div>
          )}
          <ComputerMentionInput
            inputRef={composer}
            disabled={sending}
            value={draft}
            onChange={setDraft}
            onSend={send}
            computers={allComputers}
          />
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    type="button"
                    disabled={sending}
                  />
                }
                aria-label="Add attachments or computers"
              >
                <Plus className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-64">
                <DropdownMenuItem disabled={liveAgentsEnabled} onClick={() => fileInput.current?.click()}>
                  <FileText className="size-4" />
                  Attach files
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!projectId || !agentId || ended || activeRun}
                  onClick={() => setCreateOpen(true)}
                >
                  <Plus className="size-4" />
                  New computer
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!projectId || !agentId || ended || activeRun}
                  onClick={() =>
                    act(() =>
                      orbitActions.requestAvailableComputer(
                        ensureConversation(),
                      ),
                    )
                  }
                >
                  <Robot className="size-4" />
                  Let agent choose
                </DropdownMenuItem>
                {computers.length > 0 && (
                  <DropdownMenuGroup>
                    <DropdownMenuLabel>Connected</DropdownMenuLabel>
                    {computers.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => navigate("/sessions/" + ensureConversation() + "?computer=" + m.id)}
                      >
                        <OsLogo os={m.os} className="size-4" />
                        {m.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                )}
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Available computers</DropdownMenuLabel>
                  {available.length ? (
                    available.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        disabled={!projectId || !agentId || ended || activeRun}
                        onClick={() => attach([m.id])}
                      >
                        <OsLogo os={m.os} className="size-4" />
                        <span className="truncate">{m.name}</span>
                      </DropdownMenuItem>
                    ))
                  ) : (
                    <DropdownMenuItem disabled>
                      No available computers
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            <span className="min-w-0 truncate text-[11px] text-zinc-500">
              {projects.find((p) => p.id === projectId)?.name ?? "No project"}
              {conversation?.computerAccess === "workspace" && (
                <span className="ml-2 text-amber-200/70">Auto access on</span>
              )}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="ml-auto"
              aria-label="Conversation settings"
              onClick={() => setSettingsOpen(true)}
            >
              <DotsThree className="size-5" />
            </Button>
            <Button
              type="submit"
              size="icon-sm"
              className="rounded-full"
              aria-label="Send message"
              disabled={
                sending ||
                activeRun ||
                ended ||
                (!draft.trim() && !files.length) ||
                !projectId ||
                !agentId
              }
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
        <p className="text-center text-[10px] text-zinc-600">
          {liveAgentsEnabled ? "OpenAI · uses attached computers · files stay on the computer" : cloudComputersEnabled ? "Live computers · agent not connected yet" : "Local preview · cloud execution not connected"}
        </p>
      </div>
      <CreateMachineDialog
        hideTrigger
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={attach}
      />
      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent className="p-6">
          <DialogTitle>Conversation settings</DialogTitle>
          <DialogDescription className="mt-2">
            Keep the conversation simple. Adjust its context here.
          </DialogDescription>
          <div className="mt-5 space-y-4">
            <Field label="Project">
              <SelectControl
                label="Conversation project"
                value={projectId}
                onValueChange={setChosenProject}
                options={projects.map((p) => ({ value: p.id, label: p.name }))}
                disabled={Boolean(conversation)}
                className="w-full"
              />
            </Field>
            <Field label="Instruction profile">
              <SelectControl
                label="Agent"
                value={agentId}
                onValueChange={setChosenAgent}
                options={agents.map((a) => ({ value: a.id, label: a.name }))}
                disabled={Boolean(conversation)}
                className="w-full"
              />
            </Field>
            {conversation && !ended && (
              <>
                <Field label="Computer access">
                  <SelectControl
                    label="Computer permissions"
                    value={conversation.computerAccess}
                    onValueChange={(access) =>
                      act(() =>
                        orbitActions.setComputerAccess(conversation.id, access),
                      )
                    }
                    options={[
                      { value: "ask", label: "Ask before using a computer" },
                      {
                        value: "workspace",
                        label: "Allow available workspace computers",
                      },
                    ]}
                    className="w-full"
                  />
                </Field>
                <p className="text-xs leading-5 text-zinc-500">
                  Autonomous access applies only to this conversation.
                  Human-controlled and busy computers are protected.
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={async () => {
                    if (activeRun) {
                      try { await liveAgents.control(state.workspaceId, liveRun!.id, { action: "cancel" }); }
                      catch (cause) { setError((cause as Error).message); return; }
                    }
                    act(() => {
                      orbitActions.taskAction(conversation.id, "cancel");
                      setSettingsOpen(false);
                    });
                  }}
                >
                  End run · keep computers
                </Button>
              </>
            )}
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setSettingsOpen(false);
                navigate("/skills");
              }}
            >
              Skills & instructions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
