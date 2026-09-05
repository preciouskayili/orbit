import { AttachmentGrid } from "./attachment-grid";
import type { ChatAttachment } from "@/lib/chat-attachments";
export function MessageAttachments({
  files,
  workspaceId,
}: {
  files: ChatAttachment[];
  workspaceId: string;
}) {
  if (!files.length) return null;
  return (
    <div className="mt-3 whitespace-normal">
      <AttachmentGrid files={files} workspaceId={workspaceId} />
    </div>
  );
}
