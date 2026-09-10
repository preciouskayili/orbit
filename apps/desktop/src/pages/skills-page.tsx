import { IntegrationSettings } from "@/components/integration-settings";
import { useIntegrations } from "@/lib/integrations";
import { useState, type FormEvent } from "react";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions, type OrbitAgent } from "@/lib/orbit-store";
import { Page, Field, ErrorNotice } from "@/components/flow-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { FileText, CaretRight, Plus } from "@/components/ui/icons";
import { CircleDashedIcon } from "@phosphor-icons/react";
export const toolCatalog = [
  {
    id: "terminal",
    name: "Terminal",
    description:
      "Run commands, install dependencies, and test code on assigned computers.",
  },
  {
    id: "browser",
    name: "Desktop & browser",
    description:
      "Navigate sites and work with web applications on a cloud computer.",
  },
  {
    id: "files",
    name: "Files",
    description: "Read, write, and organize persistent workspace files.",
  },
];
export function SkillsPage() {
  const state = useOrbit();
  const [editing, setEditing] = useState<OrbitAgent | null | undefined>();
  return (
    <Page
      title="Skills & tools"
      description="Save reusable instructions and choose which tools your agent can use."
      actions={
        <Button onClick={() => setEditing(null)}>
          <Plus className="size-4" />
          New instructions
        </Button>
      }
    >
      <h2 className="text-sm font-medium text-zinc-200">Saved instructions</h2>
      <p className="mb-6 mt-2 max-w-xl text-xs leading-6 text-zinc-500">
        Each set combines instructions, computer permissions, and connections.
        Select one in conversation settings to apply it to your agent.
      </p>
      <div className="max-w-full">
        {state.agents
          .filter((a) => a.workspaceId === state.workspaceId)
          .map((agent) => (
            <button
              key={agent.id}
              onClick={() => setEditing(agent)}
              className="group flex w-full items-start gap-4 px-5 py-5 text-left transition-colors hover:bg-white/[0.03] bg-white/[0.025] rounded-2xl"
            >
              <CircleDashedIcon className="size-5 text-zinc-400" />
              <div className="min-w-0 flex-1">
                <h2 className="text-sm font-medium text-zinc-200">
                  {agent.name}
                </h2>
                <p className="mt-2 line-clamp-2 text-xs leading-6 text-zinc-500">
                  {agent.instructions}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {agent.skills.map((s) => (
                    <span
                      key={s}
                      className="rounded-md bg-white/5 px-2 py-1 text-[11px] capitalize text-zinc-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>
              <CaretRight className="mt-3 size-4 text-zinc-600 group-hover:text-zinc-300" />
            </button>
          ))}
      </div>
      <div className="mt-10 max-w-full">
        <IntegrationSettings section="mcp" />
      </div>
      <Dialog
        open={editing !== undefined}
        onOpenChange={(open) => {
          if (!open) setEditing(undefined);
        }}
      >
        <DialogContent className="max-h-[85vh] overflow-y-auto p-6">
          <DialogTitle>
            {editing ? "Edit instructions" : "New instructions"}
          </DialogTitle>
          <DialogDescription className="mt-2">
            Choose these instructions in conversation settings. They control how
            the agent works and which tools it can call.
          </DialogDescription>
          {editing !== undefined && (
            <ProfileEditor
              key={editing?.id ?? "new"}
              agent={editing}
              onSaved={() => setEditing(undefined)}
            />
          )}
        </DialogContent>
      </Dialog>
    </Page>
  );
}
function ProfileEditor({
  agent,
  onSaved,
}: {
  agent: OrbitAgent | null;
  onSaved: () => void;
}) {
  const state = useOrbit();
  const integrations = useIntegrations(state.workspaceId);
  const [mcpServerIds, setMcpServerIds] = useState(agent?.mcpServerIds ?? []);
  const [name, setName] = useState(agent?.name ?? "");
  const [instructions, setInstructions] = useState(agent?.instructions ?? "");
  const [skills, setSkills] = useState(
    agent?.skills ?? ["terminal", "browser", "files"],
  );
  const [error, setError] = useState("");
  function submit(e: FormEvent) {
    e.preventDefault();
    try {
      orbitActions.saveAgent(
        { name, instructions, skills, mcpServerIds },
        agent?.id,
      );
      onSaved();
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <form onSubmit={submit} className="mt-5 space-y-4">
      <Field label="Name">
        <input
          className="flow-input"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label="Instructions">
        <textarea
          className="flow-input min-h-28"
          required
          value={instructions}
          onChange={(e) => setInstructions(e.target.value)}
          placeholder="What should this agent specialize in? When should it ask for help?"
        />
      </Field>
      <fieldset>
        <legend className="mb-3 text-xs text-zinc-400">Available tools</legend>
        {toolCatalog.map((skill) => (
          <label
            key={skill.id}
            className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 p-3 text-sm text-zinc-300"
          >
            <Checkbox
              checked={skills.includes(skill.id)}
              onCheckedChange={(checked) =>
                setSkills((s) =>
                  checked
                    ? [...s, skill.id]
                    : s.filter((id) => id !== skill.id),
                )
              }
            />
            {skill.name}
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend className="mb-3 text-xs text-zinc-400">MCP servers</legend>
        {integrations.data?.servers
          .filter(
            (server) => server.enabled || mcpServerIds.includes(server.id),
          )
          .map((server) => (
            <label
              key={server.id}
              className="mb-2 flex items-center gap-3 rounded-lg bg-white/5 p-3 text-sm text-zinc-300"
            >
              <Checkbox
                checked={mcpServerIds.includes(server.id)}
                onCheckedChange={(checked) =>
                  setMcpServerIds((ids) =>
                    checked
                      ? [...ids, server.id]
                      : ids.filter((id) => id !== server.id),
                  )
                }
              />
              {server.name}
              {!server.enabled && " · disabled"}
            </label>
          ))}
        {mcpServerIds
          .filter(
            (id) =>
              integrations.data &&
              !integrations.data.servers.some((s) => s.id === id),
          )
          .map((id) => (
            <label
              key={id}
              className="flex items-center gap-2 text-xs text-amber-300"
            >
              <Checkbox
                checked
                onCheckedChange={() =>
                  setMcpServerIds((ids) => ids.filter((s) => s !== id))
                }
              />
              Removed server · uncheck to detach
            </label>
          ))}
        {!integrations.data?.servers.length && (
          <p className="text-xs text-zinc-500">
            Add a connection on the Skills & tools page to enable its tools
            here.
          </p>
        )}
      </fieldset>
      <ErrorNotice message={error} />
      <div className="flex gap-2">
        <Button type="submit">Save instructions</Button>
        {agent && (
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              try {
                orbitActions.deleteAgent(agent.id);
                onSaved();
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Delete instructions
          </Button>
        )}
      </div>
    </form>
  );
}
