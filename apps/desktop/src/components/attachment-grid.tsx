import { useState } from "react";
import { FileText, X } from "./ui/icons";
import { fileSize } from "@/lib/chat-attachments";
import { filePreview, previewKind, type PreviewFile } from "@/lib/file-preview";
import {
  downloadAttachment,
  useAttachmentSource,
  useBlobUrl,
} from "@/hooks/use-attachment-source";

export function AttachmentGrid({
  files,
  workspaceId,
  onRemove,
  disabled,
}: {
  files: PreviewFile[];
  workspaceId: string;
  onRemove?: (index: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="grid grid-cols-2 gap-2" aria-label="Attachments">
      {files.map((file, index) => (
        <AttachmentTile
          key={
            "id" in file ? file.id : file.name + file.size + file.lastModified
          }
          file={file}
          workspaceId={workspaceId}
          disabled={disabled}
          onRemove={
            onRemove
              ? () => {
                  if (filePreview.get()?.file === file) filePreview.close();
                  onRemove(index);
                }
              : undefined
          }
        />
      ))}
    </div>
  );
}
function AttachmentTile({
  file,
  workspaceId,
  onRemove,
  disabled,
}: {
  file: PreviewFile;
  workspaceId: string;
  onRemove?: () => void;
  disabled?: boolean;
}) {
  const kind = previewKind(file);
  const { blob } = useAttachmentSource(file, workspaceId, kind === "image");
  const url = useBlobUrl(blob);
  const [error, setError] = useState("");
  const [imageFailed, setImageFailed] = useState(false);
  async function open() {
    if (kind) {
      filePreview.open({ file, workspaceId });
      return;
    }
    try {
      await downloadAttachment(file, workspaceId);
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <div className="relative min-w-0">
      <button
        type="button"
        aria-label={(kind ? "Preview " : "Download ") + file.name}
        onClick={() => void open()}
        className="flex h-16 w-full min-w-0 items-center gap-2.5 rounded-xl bg-white/[0.045] px-3 text-left hover:bg-white/[0.075] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
      >
        {url && !imageFailed ? (
          <img
            src={url}
            alt=""
            loading="lazy"
            onError={() => setImageFailed(true)}
            className="size-10 shrink-0 rounded-md object-cover"
          />
        ) : (
          <FileText
            className={
              "size-6 shrink-0 " +
              (kind === "pdf"
                ? "text-rose-400"
                : kind === "docx"
                  ? "text-sky-400"
                  : "text-zinc-500")
            }
          />
        )}
        <span className="min-w-0 flex-1">
          <span
            className="block truncate pr-2 text-xs font-medium text-zinc-300"
            title={file.name}
          >
            {file.name}
          </span>
          <span className="mt-1 block text-[10px] uppercase text-zinc-500">
            {file.name.split(".").pop()} · {fileSize(file.size)}
          </span>
        </span>
      </button>
      {onRemove && (
        <button
          type="button"
          aria-label={"Remove " + file.name}
          disabled={disabled}
          onClick={onRemove}
          className="absolute right-1 top-1 rounded-full bg-[#303030] p-1 text-zinc-400 hover:text-white"
        >
          <X className="size-3" />
        </button>
      )}
      {error && (
        <p role="alert" className="mt-1 text-xs text-rose-300">
          {error}
        </p>
      )}
    </div>
  );
}
