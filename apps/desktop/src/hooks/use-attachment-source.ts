import { useEffect, useLayoutEffect, useState } from "react";
import { cachedAttachment, loadAttachment } from "@/lib/chat-attachments";
import type { PreviewFile } from "@/lib/file-preview";

export async function attachmentBlob(file: PreviewFile, workspaceId: string) {
  return "id" in file ? loadAttachment(workspaceId, file.id) : file;
}
export async function downloadAttachment(
  file: PreviewFile,
  workspaceId: string,
) {
  const blob = await attachmentBlob(file, workspaceId);
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = file.name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function useAttachmentSource(
  file: PreviewFile,
  workspaceId: string,
  enabled = true,
) {
  const source = "id" in file ? file.id : file;
  const cached = enabled
    ? "id" in file ? cachedAttachment(workspaceId, file.id) : file
    : undefined;
  const [result, setResult] = useState<{ source?: typeof source; workspaceId?: string; blob?: Blob; error?: string }>({});
  useEffect(() => {
    let active = true;
    setResult({});
    if (enabled && !cached)
      attachmentBlob(file, workspaceId).then(
        (blob) => {
          if (active) setResult({ source, workspaceId, blob });
        },
        (error) => {
          if (active) setResult({ source, workspaceId, error: (error as Error).message });
        },
      );
    return () => {
      active = false;
    };
  }, [source, workspaceId, enabled]);
  return cached ? { blob: cached } : enabled && result.source === source && result.workspaceId === workspaceId ? result : {};
}
export function useBlobUrl(blob?: Blob) {
  const [url, setUrl] = useState<string>();
  useLayoutEffect(() => {
    if (!blob) {
      setUrl(undefined);
      return;
    }
    const value = URL.createObjectURL(blob);
    setUrl(value);
    return () => URL.revokeObjectURL(value);
  }, [blob]);
  return url;
}
