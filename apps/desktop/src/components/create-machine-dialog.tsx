import { useState, type FormEvent } from "react";
import {
  AppleLogo as Apple,
  Check,
  HardDrives as Server,
  Monitor,
  Plus,
  Terminal,
  X,
} from "@/components/ui/icons";
import type { MachineOS } from "@orbit/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useCreateMachine } from "@/hooks/queries";

const operatingSystems: Array<{ value: MachineOS; label: string; detail: string; icon: typeof Terminal }> = [
  { value: "ubuntu", label: "Ubuntu", detail: "24.04 LTS", icon: Terminal },
  { value: "windows", label: "Windows", detail: "Windows 11", icon: Monitor },
  { value: "macos", label: "macOS", detail: "Apple silicon", icon: Apple },
];

export function CreateMachineDialog({ projectId }: { projectId: string }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("Development Computer");
  const [os, setOS] = useState<MachineOS>("ubuntu");
  const [cpu, setCPU] = useState(4);
  const [ramGb, setRamGb] = useState(8);
  const [storageGb, setStorageGb] = useState(80);
  const createMachine = useCreateMachine(projectId);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    await createMachine.mutateAsync({ name, os, cpu, ramGb, storageGb });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button size="sm" />}>
        <Plus className="size-3" /> New computer
      </DialogTrigger>
      <DialogContent className="w-[520px] max-w-[calc(100vw-2rem)]" showCloseButton={false}>
          <DialogHeader className="border-b border-white/[0.07] px-5 py-4">
            <DialogTitle>Create a computer</DialogTitle>
            <DialogDescription>Add a persistent computer to this project.</DialogDescription>
            <DialogClose render={<Button variant="ghost" size="icon-sm" className="absolute right-3 top-3 text-zinc-500" />}><X className="size-4" /></DialogClose>
          </DialogHeader>

          <form onSubmit={submit}>
            <div className="space-y-5 px-5 py-5">
              <label className="block">
                <span className="mb-1.5 block text-[11px] font-medium text-zinc-400">Computer name</span>
                <input
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  minLength={2}
                  required
                  className="h-9 w-full rounded-md border border-white/[0.08] bg-black/20 px-3 text-[11px] text-zinc-200 outline-none placeholder:text-zinc-700 focus:border-[#ff714e]/40"
                />
              </label>

              <fieldset>
                <legend className="mb-2 text-[10px] font-medium text-zinc-400">Operating system</legend>
                <div className="grid grid-cols-3 gap-2">
                  {operatingSystems.map((item) => {
                    const Icon = item.icon;
                    const selected = item.value === os;
                    return (
                      <button
                        key={item.value}
                        type="button"
                        onClick={() => setOS(item.value)}
                        className={cn(
                          "relative flex items-center gap-2.5 rounded-lg border px-3 py-3 text-left",
                          selected ? "border-[#ff714e]/40 bg-[#ff714e]/[0.07]" : "border-white/[0.07] bg-white/[0.02] hover:bg-white/[0.04]",
                        )}
                      >
                        <Icon className={cn("size-4", selected ? "text-[#ff8c70]" : "text-zinc-600")} />
                        <span>
                          <span className="block text-[10px] font-medium text-zinc-300">{item.label}</span>
                          <span className="block text-[9px] text-zinc-700">{item.detail}</span>
                        </span>
                        {selected && <Check className="absolute right-2 top-2 size-2.5 text-[#ff8c70]" />}
                      </button>
                    );
                  })}
                </div>
              </fieldset>

              <div className="grid grid-cols-3 gap-3">
                <ResourceSelect label="CPU" value={cpu} values={[2, 4, 8, 16]} suffix="cores" onChange={setCPU} />
                <ResourceSelect label="RAM" value={ramGb} values={[4, 8, 16, 32]} suffix="GB" onChange={setRamGb} />
                <ResourceSelect label="Storage" value={storageGb} values={[40, 80, 120, 240]} suffix="GB" onChange={setStorageGb} />
              </div>

              <div className="flex items-center gap-2 rounded-md border border-white/[0.06] bg-white/[0.025] px-3 py-2.5">
                <Server className="size-3.5 text-zinc-600" />
                <p className="text-[11px] leading-5 text-zinc-600">Provisioning is mocked. This computer is added to the in-memory API and starts stopped.</p>
              </div>
              {createMachine.error && <p className="text-[10px] text-rose-300">{createMachine.error.message}</p>}
            </div>

            <DialogFooter className="border-t border-white/[0.07] px-5 py-3.5">
              <DialogClose render={<Button variant="ghost" size="sm" />}>Cancel</DialogClose>
              <Button type="submit" size="sm" disabled={createMachine.isPending || name.trim().length < 2}>
                {createMachine.isPending ? "Creating…" : "Create computer"}
              </Button>
            </DialogFooter>
          </form>
      </DialogContent>
    </Dialog>
  );
}

function ResourceSelect({ label, value, values, suffix, onChange }: { label: string; value: number; values: number[]; suffix: string; onChange: (value: number) => void }) {
  return (
    <label>
      <span className="mb-1.5 block text-[10px] font-medium text-zinc-400">{label}</span>
      <select value={value} onChange={(event) => onChange(Number(event.target.value))} className="h-9 w-full rounded-md border border-white/[0.08] bg-black/20 px-2.5 text-[10px] text-zinc-300 outline-none focus:border-[#ff714e]/40">
        {values.map((option) => <option key={option} value={option}>{option} {suffix}</option>)}
      </select>
    </label>
  );
}
