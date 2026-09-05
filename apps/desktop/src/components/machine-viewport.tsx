import { cloudComputers } from "@/lib/cloud-computers";
import { RemoteDesktop } from "./remote-desktop";
import { useState, type FormEvent } from "react";
import type { Machine } from "@orbit/shared";
import { useDesktopInteraction } from "@/hooks/use-desktop-interaction";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Field } from "@/components/flow-ui";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { DesktopFrame, type DesktopAspect } from "./desktop-frame";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "./ui/dropdown-menu";
import { SessionComputerTabs } from "./session-computer-tabs";
import { ComputerDesktop } from "./computer-desktop";
import { Globe, Monitor, DotsThree } from "@/components/ui/icons";

type App = "Desktop" | "Terminal" | "Files" | "Browser";
export function MachineViewport({ machine, openMachineIds, onCloseComputer }: { machine: Machine; openMachineIds?: string[]; onCloseComputer?: (id: string) => void }) {
  const state = useOrbit();
  const [aspect, setAspect] = useState<DesktopAspect>("16:10");
  const [app, setApp] = useState<App>("Desktop");
  const [error, setError] = useState("");
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(machine.name);
  const running = machine.status === "running";
  const remote = machine.provider === "daytona";
  const [busy, setBusy] = useState(false);
  const transitional = machine.status === "starting" || machine.status === "stopping";
  const interaction = useDesktopInteraction(machine.id, running, setError);
  const human = state.control[machine.id] === "human";
  const act = async (fn: () => void | Promise<void>) => {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
      setError("");
    } catch (e) {
      setError((e as Error).message);
    } finally { setBusy(false); }
  };
  const changeStatus = () => remote
    ? cloudComputers.status(machine.id, running ? "stop" : "start")
    : orbitActions.machineStatus(machine.id, running ? "stopped" : "running");
  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="window-drag flex min-h-[64px] shrink-0 items-center gap-2 px-4 py-3">
        <div className="min-w-0 flex-1">
          <SessionComputerTabs machineId={machine.id} openMachineIds={openMachineIds} onCloseComputer={onCloseComputer} />
          <p className="mt-1 text-xs text-zinc-500">
            {remote ? "Live desktop · agent automation is not connected yet" : human
              ? "You’re interacting · agent yields automatically"
              : "Shared desktop · click or type to interact"}
          </p>
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={<Button variant="ghost" size="icon-sm" />}
              aria-label="Computer actions"
            >
              <DotsThree className="size-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <div className="px-2 pb-2 pt-1 text-[11px] text-zinc-500">
                {machine.osLabel} · {machine.cpu} vCPU · {machine.ramGb} GB
              </div>
              {(["16:10", "16:9", "fill"] as DesktopAspect[]).map((value) => (
                <DropdownMenuItem key={value} onClick={() => setAspect(value)}>
                  {aspect === value ? "✓ " : ""}
                  {value === "fill"
                    ? "Fill available space"
                    : value + " · fit desktop"}
                </DropdownMenuItem>
              ))}
              <DropdownMenuItem disabled={busy} onClick={() => setRename(true)}>
                Rename computer
              </DropdownMenuItem>
              <DropdownMenuItem disabled={busy || transitional} onClick={() => void act(changeStatus)}>
                {busy || transitional ? "Updating computer…" : running ? "Stop computer" : "Start computer"}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
      {error && (
        <div className="px-5 pb-3">
          <ErrorNotice message={error} />
        </div>
      )}
      <DesktopFrame aspect={aspect}>
        {remote ? <RemoteDesktop machine={machine} /> : <div {...interaction} className="h-full">
          <ComputerDesktop machine={machine} app={app} openApp={setApp}>
            {app === "Terminal" ? (
              <DemoTerminal machine={machine} enabled={running} />
            ) : app === "Files" ? (
              <FileExplorer machine={machine} enabled={running} />
            ) : (
              <DemoBrowser enabled={running} />
            )}
          </ComputerDesktop>
        </div>}
        {!running && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-black/70 p-6 text-center backdrop-blur-sm">
            <Monitor className="size-7 text-zinc-500" />
            <h2 className="text-sm text-zinc-200">{transitional ? "Computer is " + machine.status + "…" : machine.status === "error" ? "Computer needs attention" : "Computer is stopped"}</h2>
            <p className="max-w-sm text-xs leading-5 text-zinc-400">
              Your desktop and files are retained.
            </p>
            <Button
              size="sm"
              disabled={busy || transitional}
              onClick={() => void act(changeStatus)}
            >
              Start computer
            </Button>
          </div>
        )}
      </DesktopFrame>
      <Dialog open={rename} onOpenChange={setRename}>
        <DialogContent className="p-6">
          <DialogTitle>Rename computer</DialogTitle>
          <DialogDescription className="mt-2">
            The computer's files and tasks stay attached.
          </DialogDescription>
          <form
            className="mt-5 space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              try {
                if (remote) await cloudComputers.rename(machine.id, name);
                else orbitActions.renameMachine(machine.id, name);
                setRename(false);
                setError("");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            <Field label="Name">
              <input
                className="flow-input"
                required
                minLength={2}
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <ErrorNotice message={error} />
            <Button type="submit">Save name</Button>
          </form>
        </DialogContent>
      </Dialog>
    </section>
  );
}
function DemoTerminal({
  machine,
  enabled,
}: {
  machine: Machine;
  enabled: boolean;
}) {
  const state = useOrbit();
  const [input, setInput] = useState("");
  const [lines, setLines] = useState([
    "Orbit demo shell. Type help to see supported commands.",
  ]);
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!enabled) return;
    const command = input.trim();
    const files = state.files[machine.id] ?? {};
    let result = "";
    if (command === "clear") {
      setLines([]);
      setInput("");
      return;
    }
    if (command === "help")
      result =
        "help · pwd · ls · cat <filename> · uname · clear\nCommands operate on this prototype's local workspace.";
    else if (command === "pwd") result = "/workspace";
    else if (command === "ls")
      result = Object.keys(files).join("\n") || "(empty workspace)";
    else if (command === "uname") result = machine.osLabel;
    else if (command.startsWith("cat "))
      result = files[command.slice(4)] ?? "File not found.";
    else result = "Command unavailable in the demo shell. Type help.";
    setLines((current) => [...current, "$ " + command, result]);
    setInput("");
  }
  return (
    <div className="p-5 font-mono text-xs leading-6 text-zinc-400">
      <pre className="whitespace-pre-wrap">{lines.join("\n")}</pre>
      <form onSubmit={submit} className="mt-3 flex gap-2">
        <span className="text-emerald-400">$</span>
        <input
          aria-label="Terminal command"
          disabled={!enabled}
          className="min-w-0 flex-1 bg-transparent text-zinc-200 outline-none"
          placeholder={
            enabled
              ? "Type a command…"
              : "Start the computer to use the terminal"
          }
          value={input}
          onChange={(e) => setInput(e.target.value)}
        />
      </form>
    </div>
  );
}
function FileExplorer({
  machine,
  enabled,
}: {
  machine: Machine;
  enabled: boolean;
}) {
  const state = useOrbit();
  const files = state.files[machine.id] ?? {};
  const [name, setName] = useState(Object.keys(files)[0] ?? "notes.md");
  const [content, setContent] = useState(
    files[Object.keys(files)[0] ?? ""] ?? "",
  );
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  return (
    <div className="p-5">
      <div className="mb-4 flex flex-wrap gap-2">
        {Object.keys(files).map((file) => (
          <button
            key={file}
            onClick={() => {
              setName(file);
              setContent(files[file] ?? "");
              setFeedback("");
            }}
            className={
              "rounded-lg px-3 py-2 text-xs " +
              (file === name
                ? "bg-white/10 text-zinc-200"
                : "bg-white/5 text-zinc-500")
            }
          >
            {file}
          </button>
        ))}
        <Button
          variant="ghost"
          size="sm"
          disabled={!enabled}
          onClick={() => {
            setName("untitled.md");
            setContent("");
            setFeedback("");
          }}
        >
          New file
        </Button>
      </div>
      <div className="space-y-3">
        <Field label="Filename">
          <input
            className="flow-input"
            value={name}
            disabled={!enabled}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <textarea
          aria-label="File contents"
          className="flow-input min-h-64 font-mono !text-xs !leading-6"
          readOnly={!enabled}
          value={content}
          onChange={(e) => {
            setContent(e.target.value);
            setFeedback("");
          }}
        />
        <ErrorNotice message={error} />
        <div className="flex items-center gap-3">
          <Button
            disabled={!enabled || !name.trim()}
            onClick={() => {
              try {
                orbitActions.saveFile(machine.id, name, content);
                setError("");
                setFeedback("Saved");
              } catch (e) {
                setError((e as Error).message);
              }
            }}
          >
            Save file
          </Button>
          <a
            href={
              "data:text/plain;charset=utf-8," + encodeURIComponent(content)
            }
            download={name}
            className="text-xs text-zinc-400 underline"
          >
            Download
          </a>
          <span role="status" className="text-xs text-emerald-300">
            {feedback}
          </span>
        </div>
        {!enabled && (
          <p className="text-xs text-zinc-600">
            Start the computer to edit files.
          </p>
        )}
      </div>
    </div>
  );
}
function DemoBrowser({ enabled }: { enabled: boolean }) {
  const [url, setUrl] = useState("https://example.com");
  const [address, setAddress] = useState("https://example.com");
  const [error, setError] = useState("");
  return (
    <div className="p-5">
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          try {
            const parsed = new URL(url);
            if (!["https:", "http:"].includes(parsed.protocol))
              throw new Error();
            setAddress(parsed.href);
            setError("");
          } catch {
            setError("Enter an http or https address.");
          }
        }}
      >
        <input
          aria-label="Browser address"
          className="flow-input"
          disabled={!enabled}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
        <Button type="submit" disabled={!enabled}>
          Go
        </Button>
      </form>
      <ErrorNotice message={error} />
      <div className="mt-5 rounded-xl bg-[#f4f4f1] p-8 text-[#303030]">
        <Globe className="size-8" />
        <h2 className="mt-5 text-xl">Browser preview</h2>
        <p className="mt-3 break-all text-sm">{address}</p>
        <p className="mt-4 max-w-lg text-sm leading-6 text-[#777]">
          This is the browser surface for your cloud computer. Real pages will
          stream here when remote sessions are connected. This prototype records
          the address without navigating your personal browser.
        </p>
      </div>
    </div>
  );
}
