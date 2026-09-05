import { useSyncExternalStore } from "react";
import type { ChatAttachment } from "./chat-attachments";
export type PreviewFile = File | ChatAttachment;
export type FileSelection = { file: PreviewFile; workspaceId: string };
export function previewKind(file: { name: string; type: string }) {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (
    /^image\/(png|jpeg|webp|gif|avif|bmp)$/.test(file.type) ||
    (!file.type && /^(png|jpe?g|webp|gif|avif|bmp)$/.test(ext))
  )
    return "image";
  if (file.type === "application/pdf" || ext === "pdf") return "pdf";
  if (
    ext === "docx" ||
    file.type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  )
    return "docx";
  if (
    file.type.startsWith("text/") ||
    /^(txt|md|mdx|json|csv|tsv|log|js|jsx|ts|tsx|css|html|xml|svg|py|rb|go|rs|sh|sql|yaml|yml|toml|ini)$/.test(
      ext,
    ) ||
    ["application/json", "application/xml", "image/svg+xml"].includes(file.type)
  )
    return "text";
  return null;
}
let selection: FileSelection | null = null;
const listeners = new Set<() => void>();
export const filePreview = {
  open(value: FileSelection) {
    selection = value;
    listeners.forEach((fn) => fn());
  },
  close() {
    if (!selection) return;
    selection = null;
    listeners.forEach((fn) => fn());
  },
  get: () => selection,
};
export function useFilePreview() {
  return useSyncExternalStore((callback) => {
    listeners.add(callback);
    return () => {
      listeners.delete(callback);
    };
  }, filePreview.get);
}
