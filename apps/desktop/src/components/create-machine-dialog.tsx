import { cloudComputersEnabled } from "@/lib/computer-config";
import { cloudComputers } from "@/lib/cloud-computers";
import { getOrbitState } from "@/lib/orbit-store";
import { useRef, useState, type FormEvent } from "react";
import type { MachineOS } from "@orbit/shared";
import { SelectControl } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { OsLogo } from "@/components/os-logo";
import { ErrorNotice, Field } from "@/components/flow-ui";
import { orbitActions } from "@/lib/orbit-store";
const operatingSystems = [
  { value: "ubuntu" as const, label: "Ubuntu", detail: "24.04 LTS" },
  { value: "windows" as const, label: "Windows", detail: "Windows 11" },
  { value: "macos" as const, label: "macOS", detail: "Apple silicon" },
];
export function CreateMachineDialog({
  onCreated,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: {
  projectId?: string;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
  onCreated?: (machineIds: string[]) => void;
}) {
  const [localOpen, setLocalOpen] = useState(false);
  const open = controlledOpen ?? localOpen;
  const setOpen = onOpenChange ?? setLocalOpen;
  const [name, setName] = useState("Development");
  const [os, setOS] = useState<MachineOS>("ubuntu");
  const [cpu, setCPU] = useState(cloudComputersEnabled ? 2 : 4);
  const [ramGb, setRamGb] = useState(cloudComputersEnabled ? 4 : 8);
  const [storageGb, setStorageGb] = useState(cloudComputersEnabled ? 10 : 80);
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const attempt = useRef<{ signature: string; requestIds: string[] } | undefined>(undefined);
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (creating) return;
    setCreating(true);
    try {
      let ids: string[];
      if (cloudComputersEnabled) {
        const workspaceId = getOrbitState().workspaceId;
        const signature = JSON.stringify({ workspaceId, name, os, cpu, ramGb, storageGb, count });
        if (attempt.current?.signature !== signature) attempt.current = { signature, requestIds: Array.from({ length: count }, () => crypto.randomUUID()) };
        ids = [];
        for (let index = 0; index < count; index++) {
          ids.push(await cloudComputers.create(workspaceId, { name: count > 1 ? `${name} ${index + 1}` : name, os, cpu, ramGb, storageGb }, attempt.current.requestIds[index]!));
        }
        attempt.current = undefined;
        if (getOrbitState().workspaceId !== workspaceId) return;
      } else ids = orbitActions.createComputers(
        { name, os, cpu, ramGb, storageGb },
        count,
      );
      setError("");
      setOpen(false);
      onCreated?.(ids);
    } catch (e) {
      setError((e as Error).message);
    } finally { setCreating(false); }
  }
  return (
    <Dialog open={open} onOpenChange={(value) => { if (!creating) setOpen(value); }}>
      {!hideTrigger && (
        <DialogTrigger render={<Button size="sm" />}>
          New computer
        </DialogTrigger>
      )}
      <DialogContent className="max-h-[90vh] overflow-y-auto p-6">
        <DialogTitle>Create computers</DialogTitle>
        <DialogDescription className="mt-2">
          One persistent workspace, or a fleet ready for parallel work.
        </DialogDescription>
        <form onSubmit={submit} className="mt-6 space-y-5">
          <fieldset disabled={creating} className="space-y-5">
          <Field label="Computer name">
            <input
              className="flow-input"
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </Field>
          <fieldset>
            <legend className="mb-2 text-xs text-zinc-400">
              Operating system
            </legend>
            <div className="grid grid-cols-3 gap-2">
              {operatingSystems.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  disabled={cloudComputersEnabled && item.value !== "ubuntu"}
                  aria-pressed={os === item.value}
                  onClick={() => setOS(item.value)}
                  className={
                    "flex flex-col items-start gap-2 rounded-xl p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-zinc-400 " +
                    (os === item.value
                      ? "bg-white/[0.12]"
                      : "bg-white/[0.035] hover:bg-white/[0.065]")
                  }
                >
                  <OsLogo os={item.value} className="size-6" />
                  <span className="text-sm text-zinc-200">{item.label}</span>
                  <span className="text-[11px] text-zinc-500">
                    {cloudComputersEnabled ? item.value === "ubuntu" ? "Linux desktop" : "Not available yet" : item.detail}
                  </span>
                </button>
              ))}
            </div>
          </fieldset>
          <div className="grid grid-cols-3 gap-3">
            <Resource
              label="CPU"
              value={cpu}
              values={[2, 4, 8, 16]}
              suffix="vCPU"
              change={setCPU}
            />
            <Resource
              label="Memory"
              value={ramGb}
              values={[4, 8, 16, 32]}
              suffix="GB"
              change={setRamGb}
            />
            <Resource
              label="Disk"
              value={storageGb}
              values={cloudComputersEnabled ? [5, 10] : [40, 80, 120, 240]}
              suffix="GB"
              change={setStorageGb}
            />
          </div>
          <Field label="Number of computers">
            <input
              className="flow-input"
              type="number"
              min={1}
              max={10}
              required
              value={count}
              onChange={(e) => setCount(Number(e.target.value))}
            />
          </Field>
          <p className="rounded-xl bg-white/[0.035] p-3 text-xs leading-5 text-zinc-500">
            {count} computers · {count * cpu} vCPU · {count * ramGb} GB memory
            allocated. {cloudComputersEnabled ? "Creates real Daytona computers. Files remain when stopped; running computers use your Daytona credits." : "Computers and files persist between tasks. Provisioning is simulated in this prototype."}
          </p>
          <ErrorNotice message={error} />
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">
              {creating ? "Creating…" : `Create ${count === 1 ? "computer" : "fleet"}`}
            </Button>
          </div>
          </fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );
}
function Resource({
  label,
  value,
  values,
  suffix,
  change,
}: {
  label: string;
  value: number;
  values: number[];
  suffix: string;
  change: (value: number) => void;
}) {
  return (
    <Field label={label}>
      <SelectControl
        label={label}
        className="w-full"
        value={value}
        onValueChange={change}
        options={values.map((v) => ({ value: v, label: v + " " + suffix }))}
      />
    </Field>
  );
}
