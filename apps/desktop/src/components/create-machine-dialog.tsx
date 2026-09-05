import { useState, type FormEvent } from "react";
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
}: {
  projectId?: string;
  onCreated?: (machineIds: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Development");
  const [os, setOS] = useState<MachineOS>("ubuntu");
  const [cpu, setCPU] = useState(4);
  const [ramGb, setRamGb] = useState(8);
  const [storageGb, setStorageGb] = useState(80);
  const [count, setCount] = useState(1);
  const [error, setError] = useState("");
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      const ids = orbitActions.createComputers(
        { name, os, cpu, ramGb, storageGb },
        count,
      );
      setError("");
      setOpen(false);
      onCreated?.(ids);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>New computer</DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto p-6">
        <DialogTitle>Create computers</DialogTitle>
        <DialogDescription className="mt-2">
          One persistent workspace, or a fleet ready for parallel work.
        </DialogDescription>
        <form onSubmit={submit} className="mt-6 space-y-5">
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
                    {item.detail}
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
              values={[40, 80, 120, 240]}
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
            allocated. Computers and files persist between tasks. Provisioning
            is simulated in this prototype.
          </p>
          <ErrorNotice message={error} />
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">
              Create {count === 1 ? "computer" : "fleet"}
            </Button>
          </div>
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
