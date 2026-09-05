import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowUp,
  CaretRight,
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
import { AgentOrb } from "./agent-orb";
import { useOrbit } from "@/hooks/use-orbit";
import { useAgentPreview } from "@/hooks/use-agent-preview";
import { workspaceComputers } from "@/lib/orbit-selectors";
import { mentionedComputers } from "@/lib/computer-mentions";
import { orbitActions } from "@/lib/orbit-store";

export function AgentPanel({
  projectId: routeProjectId,
  width,
  collapsed,
  onToggle,
}: {
  projectId: string;
  width: number;
  collapsed: boolean;
  onToggle: () => void;
}) {
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
  const pending =
    conversation?.requests.filter((r) => r.status === "pending") ?? [];
  const preview = useAgentPreview(conversation, setError);
  const status = interacting
    ? "You’re interacting · agent is waiting"
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
  }, [conversation?.messages.length, conversation?.id]);
  useEffect(() => {
    setDraft("");
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
      orbitActions.attachComputers(ensureConversation(), ids);
      navigate("/computers/" + ids[0]);
    });
  }
  function send() {
    act(() => {
      if (!draft.trim() || !projectId || !agentId) return;
      const mentions = mentionedComputers(draft, allComputers);
      if (conversation) orbitActions.message(conversation.id, draft, mentions);
      else
        navigate(
          "/sessions/" +
            orbitActions.createConversation(
              projectId,
              agentId,
              draft,
              mentions,
            ),
        );
      setDraft("");
    });
  }
  if (collapsed)
    return (
      <aside className="w-12 shrink-0 bg-[#181818] p-2 pt-4">
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Show agent"
        >
          <CaretRight className="size-4" />
        </Button>
      </aside>
    );
  return (
    <aside
      style={{ width }}
      className="flex min-h-0 min-w-[360px] shrink-0 flex-col bg-[#181818]"
    >
      <header className="window-drag flex h-[54px] shrink-0 items-center gap-2.5 px-4">
        {conversation && (
          <AgentOrb phase={interacting ? "waiting" : preview.phase} />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-zinc-300">
          {conversation ? agentName : "Agent"}
        </span>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Conversation settings"
          onClick={() => setSettingsOpen(true)}
        >
          <DotsThree className="size-5" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onToggle}
          aria-label="Hide agent"
        >
          <SidebarSimple className="size-4" />
        </Button>
      </header>
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
                onClick={() => navigate("/agents")}
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
                        navigate("/computers/" + request.machineId);
                      })
                    }
                  >
                    Allow
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      act(() =>
                        orbitActions.resolveComputerRequest(
                          conversation.id,
                          request.id,
                          false,
                        ),
                      )
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
            {preview.playing ? (
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
            ) : !ended &&
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
        <form
          className="rounded-2xl bg-[#262626] p-3"
          onSubmit={(e) => {
            e.preventDefault();
            send();
          }}
        >
          <ComputerMentionInput
            inputRef={composer}
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
                    disabled={!projectId || !agentId || ended}
                  />
                }
                aria-label="Add computer"
              >
                <Plus className="size-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent side="top" className="w-64">
                <DropdownMenuItem onClick={() => setCreateOpen(true)}>
                  <Plus className="size-4" />
                  New computer
                </DropdownMenuItem>
                <DropdownMenuItem
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
                        onClick={() => navigate("/computers/" + m.id)}
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
              type="submit"
              size="icon-sm"
              className="ml-auto rounded-full"
              aria-label="Send message"
              disabled={!draft.trim() || !projectId || !agentId}
            >
              <ArrowUp className="size-4" />
            </Button>
          </div>
        </form>
        <p className="text-center text-[10px] text-zinc-600">
          Local preview · cloud execution not connected
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
            <Field label="Agent">
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
                  onClick={() =>
                    act(() => {
                      orbitActions.taskAction(conversation.id, "cancel");
                      setSettingsOpen(false);
                    })
                  }
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
                navigate("/agents");
              }}
            >
              Manage agents
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </aside>
  );
}
