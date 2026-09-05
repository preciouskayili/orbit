import { useState } from "react";
import { FileText } from "./ui/icons";
import {
  fileSize,
  loadAttachment,
  type ChatAttachment,
} from "@/lib/chat-attachments";

export function MessageAttachments({
  files,
  workspaceId,
}: {
  files: ChatAttachment[];
  workspaceId: string;
}) {
  const [error, setError] = useState("");
  async function download(file: ChatAttachment) {
    try {
      const blob = await loadAttachment(workspaceId, file.id);
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = file.name;
      link.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }
  if (!files.length) return null;
  return (
    <div className="mt-3 space-y-2 whitespace-normal">
      {files.map((file) => (
        <button
          key={file.id}
          onClick={() => void download(file)}
          title="Download local attachment"
          className="flex w-full items-center gap-2 rounded-lg bg-white/5 px-3 py-2 text-left text-xs hover:bg-white/10"
        >
          <FileText className="size-4 shrink-0 text-zinc-500" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <span className="shrink-0 text-[10px] text-zinc-500">
            {fileSize(file.size)} · Local
          </span>
        </button>
      ))}
      {error && (
        <p role="alert" className="text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
