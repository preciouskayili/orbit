import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions } from "@/lib/orbit-store";
import { Page, Empty, ErrorNotice } from "@/components/flow-ui";
import { TaskComposer } from "@/components/task-composer";
import { Button } from "@/components/ui/button";
export function NewSchedulePage() {
  const state = useOrbit();
  return <Page title="Schedule a task" description="Keep recurring work attached to the right project, agent, and computers."><TaskComposer key={state.workspaceId} scheduled /></Page>;
}
export function ScheduledPage() {
  const state = useOrbit();
  const navigate = useNavigate();
  const [error, setError] = useState("");
  const schedules = state.schedules.filter(s => state.projects.some(p => p.id === s.projectId && p.workspaceId === state.workspaceId));
  return <Page title="Scheduled" description="Recurring work, ready when you are. Schedules are saved locally; automatic execution will be connected with the backend." actions={<Link to="/scheduled/new" className="rounded-lg bg-zinc-200 px-3 py-2 text-xs text-zinc-900">New schedule</Link>}>
    <ErrorNotice message={error} />
    <div className="space-y-3">{schedules.map(s => <div key={s.id} className="rounded-xl bg-white/[0.035] p-5"><h2 className="text-sm text-zinc-200">{s.prompt}</h2><p className="mt-2 text-xs text-zinc-500">{s.cadence} at {s.time} · {s.machineIds.length} computers · {s.enabled ? "Enabled" : "Paused"}</p><div className="mt-4 flex gap-2"><Button variant="secondary" onClick={() => { try { navigate("/tasks/" + orbitActions.runSchedule(s.id)); } catch (e) { setError((e as Error).message); } }}>Run now</Button><Button variant="ghost" onClick={() => orbitActions.toggleSchedule(s.id)}>{s.enabled ? "Pause schedule" : "Enable schedule"}</Button></div></div>)}</div>
    {!schedules.length && <Empty title="No scheduled work yet">Create a schedule for daily research, recurring checks, or weekly reports.</Empty>}
  </Page>;
}
