import { lazy, Suspense, useEffect, useState } from "react";
import { DownloadSimple, X } from "./ui/icons";
import { Button } from "./ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import {
  filePreview,
  previewKind,
  type FileSelection,
} from "@/lib/file-preview";
import {
  downloadAttachment,
  useAttachmentSource,
  useBlobUrl,
} from "@/hooks/use-attachment-source";
const PdfPreview = lazy(() => import("./pdf-preview"));

function Download({ selection }: { selection: FileSelection }) {
  const [error, setError] = useState("");
  return (
    <>
      <Button
        size="xs"
        variant="ghost"
        onClick={() => {
          void downloadAttachment(selection.file, selection.workspaceId).catch(
            (e) => setError((e as Error).message),
          );
        }}
      >
        <DownloadSimple className="size-3.5" />
        Download
      </Button>
      {error && (
        <span role="alert" className="text-xs text-rose-300">
          {error}
        </span>
      )}
    </>
  );
}
export function FilePreviewPane({ selection }: { selection: FileSelection }) {
  const { blob, error } = useAttachmentSource(
    selection.file,
    selection.workspaceId,
  );
  const kind = previewKind(selection.file);
  return (
    <section
      className="flex h-full min-h-0 flex-col bg-[#1c1c1c]"
      aria-label="Document preview"
    >
      <header className="window-drag flex h-[54px] shrink-0 items-center gap-3 px-4">
        <h2 className="min-w-0 flex-1 truncate text-sm text-zinc-300">
          {selection.file.name}
        </h2>
        <Download selection={selection} />
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Close document preview"
          onClick={filePreview.close}
        >
          <X className="size-4" />
        </Button>
      </header>
      {error ? (
        <p role="alert" className="p-6 text-sm text-zinc-400">
          {error}
        </p>
      ) : !blob ? (
        <p role="status" className="p-6 text-sm text-zinc-500">
          Loading document…
        </p>
      ) : kind === "pdf" ? (
        <Suspense
          fallback={
            <p className="p-6 text-sm text-zinc-500">Loading PDF viewer…</p>
          }
        >
          <PdfPreview blob={blob} />
        </Suspense>
      ) : (
        <TextDocument blob={blob} docx={kind === "docx"} />
      )}
    </section>
  );
}
function TextDocument({ blob, docx }: { blob: Blob; docx: boolean }) {
  const [text, setText] = useState<string>();
  const [error, setError] = useState("");
  const [truncated, setTruncated] = useState(false);
  useEffect(() => {
    let active = true;
    let worker: Worker | undefined;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    setText(undefined);
    setError("");
    setTruncated(false);
    if (docx) {
      try {
        worker = new Worker(
          new URL("../workers/docx-preview.worker.ts", import.meta.url),
          { type: "module" },
        );
      } catch {
        setError(
          "Document preview unavailable. Download the original to open it.",
        );
        return;
      }
      timeout = setTimeout(() => {
        worker?.terminate();
        if (active)
          setError(
            "Document preview timed out. Download the original to open it.",
          );
      }, 10000);
      worker.onmessage = (event) => {
        if (!active) return;
        clearTimeout(timeout);
        setError(event.data.error ?? "");
        setText(event.data.text);
        setTruncated(Boolean(event.data.truncated));
        worker?.terminate();
      };
      worker.onerror = () => {
        clearTimeout(timeout);
        if (active) setError("Document preview unavailable.");
        worker?.terminate();
      };
      void blob
        .arrayBuffer()
        .then((data) => {
          if (active) worker?.postMessage(data, [data]);
        })
        .catch(() => {
          clearTimeout(timeout);
          worker?.terminate();
          if (active) setError("Could not read the document.");
        })
        .catch(() => {
          if (active) setError("Could not read the document.");
        });
    } else {
      void blob
        .slice(0, 200_000)
        .text()
        .then((value) => {
          if (active) {
            setText(value);
            setTruncated(blob.size > 200_000);
          }
        });
    }
    return () => {
      active = false;
      clearTimeout(timeout);
      worker?.terminate();
    };
  }, [blob, docx]);
  return (
    <div className="min-h-0 flex-1 overflow-auto p-6">
      <p className="mb-4 text-center text-[11px] text-zinc-500">
        {docx
          ? "DOCX text preview · original formatting may differ"
          : "Text preview"}
        {truncated && " · first 200 KB"}
      </p>
      {error ? (
        <p role="alert" className="text-sm text-zinc-400">
          {error}
        </p>
      ) : text === undefined ? (
        <p role="status" className="text-sm text-zinc-500">
          Preparing document…
        </p>
      ) : (
        <article className="mx-auto min-h-[70vh] max-w-3xl bg-[#faf9f6] p-8 text-[#282828] shadow-xl">
          <pre
            className={
              "whitespace-pre-wrap break-words text-sm leading-7 " +
              (docx ? "font-sans" : "font-mono")
            }
          >
            {text || "Empty document"}
          </pre>
        </article>
      )}
    </div>
  );
}
export function ImagePreviewDialog({
  selection,
}: {
  selection: FileSelection;
}) {
  const { blob, error } = useAttachmentSource(
    selection.file,
    selection.workspaceId,
  );
  const url = useBlobUrl(blob);
  const [failed, setFailed] = useState(false);
  useEffect(() => setFailed(false), [blob]);
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) filePreview.close();
      }}
    >
      <DialogContent className="max-w-5xl p-4" showCloseButton={false}>
        <div className="mb-4 flex items-center gap-3">
          <DialogTitle className="min-w-0 flex-1 truncate">
            {selection.file.name}
          </DialogTitle>
          <Download selection={selection} />
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Close image preview"
            onClick={filePreview.close}
          >
            <X className="size-4" />
          </Button>
        </div>
        <DialogDescription className="sr-only">
          Local image preview. Escape closes this popup.
        </DialogDescription>
        {error || failed ? (
          <p className="p-8 text-sm text-zinc-400">
            {error || "Image preview unavailable"}
          </p>
        ) : url ? (
          <img
            src={url}
            alt={selection.file.name}
            onError={() => setFailed(true)}
            className="max-h-[78vh] w-full object-contain"
          />
        ) : (
          <p role="status" className="p-8 text-sm text-zinc-500">
            Loading image…
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
