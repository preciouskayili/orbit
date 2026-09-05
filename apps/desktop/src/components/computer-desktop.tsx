import type { ReactNode } from "react";
import type { Machine } from "@orbit/shared";
import { useOrbit } from "@/hooks/use-orbit";
import { OsLogo } from "./os-logo";
import { FileText, Folder, Globe, Terminal, X } from "./ui/icons";
export type ComputerApp = "Desktop" | "Terminal" | "Files" | "Browser";

// OS chrome remains visible while local demo apps open inside a desktop window.
// Replace this preview with a video/input session adapter for real computers.
export function ComputerDesktop({
  machine,
  app,
  openApp,
  children,
}: {
  machine: Machine;
  app: ComputerApp;
  openApp: (app: ComputerApp) => void;
  children?: ReactNode;
}) {
  const state = useOrbit();
  const files = Object.keys(state.files[machine.id] ?? {});
  const apps = [
    { name: "Files" as const, Icon: Folder },
    { name: "Terminal" as const, Icon: Terminal },
    { name: "Browser" as const, Icon: Globe },
  ];
  const wallpapers = {
    ubuntu:
      "radial-gradient(ellipse at 85% 15%, #783741 0%, transparent 60%), linear-gradient(135deg, #211b38, #361d31 60%, #513122)",
    windows:
      "radial-gradient(ellipse at 20% 80%, #225a80 0%, transparent 65%), linear-gradient(140deg, #122639, #1b3e60 50%, #112e3d)",
    macos:
      "radial-gradient(ellipse at 90% 90%, #625164 0%, transparent 65%), linear-gradient(130deg, #253949, #3d435b 60%, #32343f)",
  };
  const ubuntu = machine.os === "ubuntu";
  const windows = machine.os === "windows";
  return (
    <div
      aria-label={machine.osLabel + " desktop"}
      className="relative flex h-full flex-col overflow-hidden"
      style={{ background: wallpapers[machine.os] }}
    >
      <div className="flex h-7 shrink-0 items-center gap-3 bg-black/35 px-3 text-[10px] text-white/65">
        <OsLogo os={machine.os} className="size-3" />
        <span>{ubuntu ? "Activities" : windows ? machine.name : "Finder"}</span>
        <span className="mx-auto truncate">{machine.osLabel}</span>
        <span>Desktop preview</span>
      </div>
      <div
        className={
          "flex min-h-0 flex-1 items-center justify-center p-5 " +
          (ubuntu ? "pl-20" : "pb-20")
        }
      >
        <div
          className={
            "flex max-h-full w-full flex-col overflow-hidden rounded-xl bg-[#222426]/95 shadow-2xl " +
            (app === "Desktop" ? "max-w-lg" : "h-full")
          }
        >
          <div className="flex h-9 shrink-0 items-center gap-2 bg-white/[0.035] px-3">
            <Folder className="size-3 text-zinc-500" />
            <span className="text-[11px] text-zinc-300">
              {app === "Desktop" ? "Workspace" : app}
            </span>
            <span className="ml-auto text-[10px] text-zinc-600">
              {app === "Desktop" ? "/workspace" : machine.name}
            </span>
            {app !== "Desktop" && (
              <button
                onClick={() => openApp("Desktop")}
                aria-label="Close app window"
                className="ml-2 rounded p-1 hover:bg-white/10"
              >
                <X className="size-3 text-zinc-500" />
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-auto">
            {app === "Desktop" ? (
              <div className="p-3">
                {files.length ? (
                  files.map((name) => (
                    <button
                      key={name}
                      onClick={() => openApp("Files")}
                      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-xs text-zinc-300 hover:bg-white/5"
                    >
                      <FileText className="size-4 text-zinc-500" />
                      <span className="truncate">{name}</span>
                    </button>
                  ))
                ) : (
                  <div className="py-5 text-center">
                    <Folder className="mx-auto size-6 text-zinc-600" />
                    <p className="mt-3 text-xs text-zinc-400">
                      Your workspace is ready
                    </p>
                    <p className="mt-2 text-[10px] text-zinc-600">
                      Files you or your agent create will appear here.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              children
            )}
          </div>
          {app === "Desktop" && (
            <div className="shrink-0 bg-black/10 px-4 py-2 text-[10px] text-zinc-500">
              {files.length} files · persistent storage
            </div>
          )}
        </div>
      </div>
      <div
        className={
          "absolute flex items-center gap-1 bg-black/35 p-1.5 shadow-lg backdrop-blur-xl " +
          (ubuntu
            ? "bottom-0 left-0 top-7 w-14 flex-col pt-4"
            : windows
              ? "bottom-0 left-0 right-0 h-12 justify-center"
              : "bottom-3 left-1/2 -translate-x-1/2 rounded-2xl")
        }
      >
        {windows && <OsLogo os="windows" className="mx-2 size-5" />}
        {apps.map(({ name, Icon }) => (
          <button
            key={name}
            onClick={() => openApp(name)}
            aria-label={"Open " + name}
            title={name}
            className={
              "flex flex-col items-center gap-1 rounded-lg p-2 text-white/70 hover:bg-white/10 " +
              (app === name ? "bg-white/15" : "")
            }
          >
            <Icon className="size-5" />
            {!windows && <span className="text-[9px]">{name}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
