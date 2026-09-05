import { useState, type FormEvent } from "react";
import type { Machine } from "@orbit/shared";
import { Link } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { OsLogo } from "@/components/os-logo";
import { Button } from "@/components/ui/button";
import { ErrorNotice, Field } from "@/components/flow-ui";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { ComputerDesktop } from "./computer-desktop";
import { Globe, Monitor } from "@/components/ui/icons";

type App = "Desktop" | "Terminal" | "Files" | "Browser";
export function MachineViewport({ machine }: { machine: Machine }) {
  const state = useOrbit();
  const [app, setApp] = useState<App>("Desktop");
  const [error, setError] = useState("");
  const [rename, setRename] = useState(false);
  const [name, setName] = useState(machine.name);
  const running = machine.status === "running";
  const human = state.control[machine.id] === "human";
  const task = state.tasks.find(t => t.machineIds.includes(machine.id) && !["completed", "cancelled"].includes(t.status));
  const act = (fn: () => void) => { try { fn(); setError(""); } catch (e) { setError((e as Error).message); } };
  return <section className="flex min-h-0 flex-1 flex-col">
    <div className="flex flex-wrap items-center gap-2 px-5 py-4">
      <OsLogo os={machine.os} /><div className="min-w-0"><h1 className="text-sm text-zinc-200">{machine.name}</h1><p className="mt-1 text-xs text-zinc-500">{machine.osLabel} · {machine.cpu} vCPU · {machine.ramGb} GB memory</p></div>
      <div className="ml-auto flex flex-wrap gap-2">
        <Button variant="ghost" size="sm" onClick={() => setRename(true)}>Rename</Button>
        {running && <Button variant="secondary" size="sm" onClick={() => act(() => orbitActions.setControl(machine.id, human ? "agent" : "human"))}>{human ? "Hand back to agent" : "Take control"}</Button>}
        <Button variant={running ? "secondary" : "default"} size="sm" onClick={() => act(() => orbitActions.machineStatus(machine.id, running ? "stopped" : "running"))}>{running ? "Stop computer" : "Start computer"}</Button>
      </div>
    </div>
    {error && <div className="px-5 pb-3"><ErrorNotice message={error} /></div>}
    {task && <Link to={"/sessions/" + task.id} onClick={() => orbitActions.openConversation(task.id)} className="mx-5 mb-3 flex flex-wrap gap-2 rounded-lg bg-white/[0.035] px-3 py-2 text-xs text-zinc-400"><span className="text-[#db7657]">{task.status}</span><span className="min-w-0 flex-1 truncate">{task.title}</span><span>Conversation →</span></Link>}
    <div className="mx-5 flex flex-wrap items-center gap-1 rounded-t-xl bg-[#242526] p-2">
      {(["Desktop", "Terminal", "Files", "Browser"] as App[]).map(tab => <button key={tab} onClick={() => setApp(tab)} aria-pressed={app === tab} className={"rounded-lg px-3 py-2 text-xs " + (app === tab ? "bg-white/10 text-zinc-200" : "text-zinc-500 hover:bg-white/5")}>{tab}</button>)}
      <span className="ml-auto px-2 text-[11px] text-zinc-500">Demo session · {human ? "Human control" : "Agent control"}</span>
    </div>
    <div className="mx-5 mb-5 min-h-0 flex-1 overflow-auto rounded-b-xl bg-[#111313]">
      {!running ? <div className="flex min-h-[300px] h-full flex-col items-center justify-center gap-4 p-8 text-center"><Monitor className="size-9 text-zinc-600" /><h2 className="text-lg text-zinc-200">Computer is stopped</h2><p className="max-w-sm text-sm leading-6 text-zinc-500">Your files and workspace are retained. Start the computer to continue.</p><Button onClick={() => act(() => orbitActions.machineStatus(machine.id, "running"))}>Start computer</Button></div>
      : app === "Desktop" ? <ComputerDesktop machine={machine} openApp={setApp} />
      : app === "Terminal" ? <DemoTerminal machine={machine} enabled={human} />
      : app === "Files" ? <FileExplorer machine={machine} enabled={human} />
      : <DemoBrowser enabled={human} />}
    </div>
    <Dialog open={rename} onOpenChange={setRename}><DialogContent className="p-6"><DialogTitle>Rename computer</DialogTitle><DialogDescription className="mt-2">The computer's files and tasks stay attached.</DialogDescription><form className="mt-5 space-y-4" onSubmit={e => { e.preventDefault(); try { orbitActions.renameMachine(machine.id, name); setRename(false); setError(""); } catch (e) { setError((e as Error).message); } }}><Field label="Name"><input className="flow-input" required minLength={2} value={name} onChange={e => setName(e.target.value)} /></Field><ErrorNotice message={error} /><Button type="submit">Save name</Button></form></DialogContent></Dialog>
  </section>;
}
function DemoTerminal({ machine, enabled }: { machine: Machine; enabled: boolean }) {
  const state = useOrbit();
  const [input, setInput] = useState("");
  const [lines, setLines] = useState(["Orbit demo shell. Type help to see supported commands."]);
  function submit(e: FormEvent) {
    e.preventDefault(); if (!enabled) return;
    const command = input.trim();
    const files = state.files[machine.id] ?? {};
    let result = "";
    if (command === "clear") { setLines([]); setInput(""); return; }
    if (command === "help") result = "help · pwd · ls · cat <filename> · uname · clear\nCommands operate on this prototype's local workspace.";
    else if (command === "pwd") result = "/workspace";
    else if (command === "ls") result = Object.keys(files).join("\n") || "(empty workspace)";
    else if (command === "uname") result = machine.osLabel;
    else if (command.startsWith("cat ")) result = files[command.slice(4)] ?? "File not found.";
    else result = "Command unavailable in the demo shell. Type help.";
    setLines(current => [...current, "$ " + command, result]); setInput("");
  }
  return <div className="p-5 font-mono text-xs leading-6 text-zinc-400"><pre className="whitespace-pre-wrap">{lines.join("\n")}</pre><form onSubmit={submit} className="mt-3 flex gap-2"><span className="text-emerald-400">$</span><input aria-label="Terminal command" disabled={!enabled} className="min-w-0 flex-1 bg-transparent text-zinc-200 outline-none" placeholder={enabled ? "Type a command…" : "Take control to use the terminal"} value={input} onChange={e => setInput(e.target.value)} /></form></div>;
}
function FileExplorer({ machine, enabled }: { machine: Machine; enabled: boolean }) {
  const state = useOrbit();
  const files = state.files[machine.id] ?? {};
  const [name, setName] = useState(Object.keys(files)[0] ?? "notes.md");
  const [content, setContent] = useState(files[Object.keys(files)[0] ?? ""] ?? "");
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  return <div className="p-5"><div className="mb-4 flex flex-wrap gap-2">{Object.keys(files).map(file => <button key={file} onClick={() => { setName(file); setContent(files[file] ?? ""); setFeedback(""); }} className={"rounded-lg px-3 py-2 text-xs " + (file === name ? "bg-white/10 text-zinc-200" : "bg-white/5 text-zinc-500")}>{file}</button>)}<Button variant="ghost" size="sm" disabled={!enabled} onClick={() => { setName("untitled.md"); setContent(""); setFeedback(""); }}>New file</Button></div>
    <div className="space-y-3"><Field label="Filename"><input className="flow-input" value={name} disabled={!enabled} onChange={e => setName(e.target.value)} /></Field><textarea aria-label="File contents" className="flow-input min-h-64 font-mono !text-xs !leading-6" readOnly={!enabled} value={content} onChange={e => { setContent(e.target.value); setFeedback(""); }} /><ErrorNotice message={error} /><div className="flex items-center gap-3"><Button disabled={!enabled || !name.trim()} onClick={() => { try { orbitActions.saveFile(machine.id, name, content); setError(""); setFeedback("Saved"); } catch (e) { setError((e as Error).message); } }}>Save file</Button><a href={"data:text/plain;charset=utf-8," + encodeURIComponent(content)} download={name} className="text-xs text-zinc-400 underline">Download</a><span role="status" className="text-xs text-emerald-300">{feedback}</span></div>{!enabled && <p className="text-xs text-zinc-600">Take control to edit files.</p>}</div>
  </div>;
}
function DemoBrowser({ enabled }: { enabled: boolean }) {
  const [url, setUrl] = useState("https://example.com");
  const [address, setAddress] = useState("https://example.com");
  const [error, setError] = useState("");
  return <div className="p-5"><form className="flex gap-2" onSubmit={e => { e.preventDefault(); try { const parsed = new URL(url); if (!["https:", "http:"].includes(parsed.protocol)) throw new Error(); setAddress(parsed.href); setError(""); } catch { setError("Enter an http or https address."); } }}><input aria-label="Browser address" className="flow-input" disabled={!enabled} value={url} onChange={e => setUrl(e.target.value)} /><Button type="submit" disabled={!enabled}>Go</Button></form><ErrorNotice message={error} /><div className="mt-5 rounded-xl bg-[#f4f4f1] p-8 text-[#303030]"><Globe className="size-8" /><h2 className="mt-5 text-xl">Browser preview</h2><p className="mt-3 break-all text-sm">{address}</p><p className="mt-4 max-w-lg text-sm leading-6 text-[#777]">This is the browser surface for your cloud computer. Real pages will stream here when remote sessions are connected. This prototype records the address without navigating your personal browser.</p></div></div>;
}
