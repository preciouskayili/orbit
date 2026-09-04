import type { MachineOS } from "@orbit/shared";
import ubuntu from "@/assets/os/ubuntu.svg";
import windows from "@/assets/os/windows.svg";
import macos from "@/assets/os/macos.svg";

const logos = { ubuntu, windows, macos };
const names = { ubuntu: "Ubuntu", windows: "Windows", macos: "macOS" };
export function OsLogo({ os, className = "size-5" }: { os: MachineOS; className?: string }) {
  return <img src={logos[os]} alt={names[os]} className={className + " shrink-0 object-contain " + (os === "macos" ? "invert" : "")} />;
}
