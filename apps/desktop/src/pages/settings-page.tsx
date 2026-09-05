import { useState } from "react";
import { useOrbit } from "@/hooks/use-orbit";
import { orbitActions, getPersistenceError } from "@/lib/orbit-store";
import { Page, Field, CreateContainer, ErrorNotice } from "@/components/flow-ui";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
export function SettingsPage() {
  const state = useOrbit();
  const navigate = useNavigate();
  const [name, setName] = useState(state.settings.name);
  const [saved, setSaved] = useState(false);
  return <Page title="Settings" description="Your profile, preferences, and workspaces.">
    <div className="max-w-2xl space-y-6">
      <form className="space-y-4 rounded-2xl bg-white/[0.035] p-5" onSubmit={e => { e.preventDefault(); orbitActions.settings({ ...state.settings, name: name.trim() }); setSaved(true); }}>
        <Field label="Display name"><input className="flow-input" required value={name} onChange={e => { setName(e.target.value); setSaved(false); }} /></Field>
        <label className="flex items-center justify-between text-sm text-zinc-400">Show review notification dots<Checkbox checked={state.settings.notifications} onCheckedChange={checked => orbitActions.settings({ ...state.settings, notifications: checked })} /></label>
        <Button type="submit" disabled={!name.trim()}>Save profile</Button>{saved && <span role="status" className="ml-3 text-xs text-emerald-300">Saved</span>}
      </form>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-sm text-zinc-300">Workspaces</h2><CreateContainer kind="workspace" /></div><div className="space-y-2">{state.workspaces.map(w => <button key={w.id} onClick={() => { orbitActions.switchWorkspace(w.id); navigate("/projects"); }} className="flex w-full items-center justify-between rounded-xl bg-white/[0.035] p-4 text-left text-sm text-zinc-300">{w.name}<span className="text-xs text-zinc-500">{w.id === state.workspaceId ? "Current" : "Switch"}</span></button>)}</div></section>
      <section className="rounded-xl bg-white/[0.025] p-5"><h2 className="text-sm text-zinc-300">About this prototype</h2><p className="mt-2 text-sm leading-6 text-zinc-500">Your projects, computers, runs, and files are saved on this device. Cloud provisioning, real agent execution, authentication, and scheduled background runs will be connected in the backend phase.</p></section>
      <ErrorNotice message={getPersistenceError()} />
    </div>
  </Page>;
}
