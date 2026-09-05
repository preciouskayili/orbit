import { useState, type ReactNode, type FormEvent } from "react";
import { Plus } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { orbitActions } from "@/lib/orbit-store";
import { useNavigate } from "react-router-dom";
import { PlusIcon } from "@phosphor-icons/react";

export function Page({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="flex h-full min-w-0 flex-col">
      <div className="window-drag h-[54px] shrink-0" />
      <div className="min-h-0 flex-1 overflow-y-auto p-6">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7 flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-medium text-zinc-100">{title}</h1>
              {description && (
                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
                  {description}
                </p>
              )}
            </div>
            {actions}
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
export function Field({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <label className="block space-y-2 text-xs text-zinc-400">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function Empty({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="rounded-2xl bg-white/[0.025] p-8 text-center">
      <h2 className="text-sm text-zinc-200">{title}</h2>
      <div className="mt-3 text-sm leading-6 text-zinc-500">{children}</div>
    </div>
  );
}
export function ErrorNotice({ message }: { message?: string }) {
  return message ? (
    <p
      role="alert"
      className="rounded-lg bg-rose-400/10 p-3 text-xs text-rose-300"
    >
      {message}
    </p>
  ) : null;
}
export function CreateContainer({
  kind,
  compact = false,
}: {
  kind: "project" | "workspace";
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();
  function submit(event: FormEvent) {
    event.preventDefault();
    try {
      if (kind === "project") {
        const id = orbitActions.createProject(name, description);
        navigate("/projects/" + id);
      } else {
        orbitActions.createWorkspace(name);
        navigate("/projects");
      }
      setOpen(false);
      setName("");
      setDescription("");
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={compact ? "ghost" : "secondary"}
            size={compact ? "icon-sm" : "sm"}
            aria-label={compact ? "New " + kind : undefined}
          />
        }
      >
        {compact ? <PlusIcon className="size-3.5" /> : <>New {kind}</>}
      </DialogTrigger>
      <DialogContent className="p-6">
        <DialogTitle>Create a {kind}</DialogTitle>
        <DialogDescription className="mt-2">
          {kind === "workspace"
            ? "Give a team or a personal space its own projects and agents."
            : "Keep computers, conversations, and files together."}
        </DialogDescription>
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Name">
            <input
              className="flow-input"
              autoFocus
              required
              minLength={2}
              maxLength={60}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={
                kind === "project" ? "e.g. Website launch" : "e.g. Product team"
              }
            />
          </Field>
          {kind === "project" && (
            <Field label="Description">
              <textarea
                className="flow-input min-h-20"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What is this project for?"
              />
            </Field>
          )}
          <ErrorNotice message={error} />
          <div className="flex justify-end gap-2">
            <DialogClose render={<Button variant="ghost" />}>
              Cancel
            </DialogClose>
            <Button type="submit">Create {kind}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
