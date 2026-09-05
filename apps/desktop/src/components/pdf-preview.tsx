import { useEffect, useRef, useState } from "react";
import {
  getDocument,
  GlobalWorkerOptions,
  type PDFDocumentProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
// Electron 37 needs the compatibility build in both the viewer and worker.
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import { Button } from "./ui/button";
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ blob }: { blob: Blob }) {
  const [document, setDocument] = useState<PDFDocumentProxy>();
  const [page, setPage] = useState(1);
  const [error, setError] = useState("");
  const [rendering, setRendering] = useState(true);
  const canvas = useRef<HTMLCanvasElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(640);
  useEffect(() => {
    const measure = () =>
      setWidth(
        Math.max(160, Math.min(800, (frame.current?.clientWidth || 688) - 48)),
      );
    measure();
    const observer = new ResizeObserver(measure);
    if (frame.current) observer.observe(frame.current);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    let active = true;
    let loading: ReturnType<typeof getDocument> | undefined;
    setDocument(undefined);
    setPage(1);
    setError("");
    void blob
      .arrayBuffer()
      .then((data) => {
        if (!active) return;
        loading = getDocument({
          data,
          useSystemFonts: true,
        });
        return loading.promise.then((doc) => {
          if (active) setDocument(doc);
        });
      })
      .catch((cause: unknown) => {
        if (!active) return;
        const name = cause instanceof Error ? cause.name : "";
        setError(
          name === "PasswordException"
            ? "This PDF requires a password. Download it to open it."
            : name === "InvalidPDFException"
              ? "This file could not be read as a PDF. Download it to check the original."
              : "PDF preview unavailable. Download the original to open it.",
        );
        console.error("PDF preview failed", cause);
      });
    return () => {
      active = false;
      void loading?.destroy();
    };
  }, [blob]);
  useEffect(() => {
    if (!document) return;
    let active = true;
    let render:
      | ReturnType<Awaited<ReturnType<PDFDocumentProxy["getPage"]>>["render"]>
      | undefined;
    setRendering(true);
    void document
      .getPage(page)
      .then((pdfPage) => {
        if (!active || !canvas.current) return;
        const original = pdfPage.getViewport({ scale: 1 });
        const scale = Math.min(width / original.width, 1600 / original.height);
        const viewport = pdfPage.getViewport({ scale });
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        canvas.current.width = Math.floor(viewport.width * ratio);
        canvas.current.height = Math.floor(viewport.height * ratio);
        canvas.current.style.width = viewport.width + "px";
        canvas.current.style.height = viewport.height + "px";
        render = pdfPage.render({
          canvas: canvas.current,
          viewport,
          transform: [ratio, 0, 0, ratio, 0, 0],
        });
        return render.promise;
      })
      .then(() => {
        if (active) setRendering(false);
      })
      .catch(() => {
        if (active) {
          setError("This page could not be rendered.");
          setRendering(false);
        }
      });
    return () => {
      active = false;
      render?.cancel();
    };
  }, [document, page, width]);
  return (
    <div ref={frame} className="flex h-full min-h-0 flex-col">
      {document && (
        <div className="flex shrink-0 items-center justify-center gap-4 py-3 text-xs text-zinc-400">
          <Button
            variant="ghost"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous page
          </Button>
          <span>
            Page {page} of {document.numPages}
          </span>
          <Button
            variant="ghost"
            size="sm"
            disabled={page === document.numPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next page
          </Button>
        </div>
      )}
      <div className="min-h-0 flex-1 overflow-auto p-6">
        {error ? (
          <p role="alert" className="text-sm text-zinc-400">
            {error}
          </p>
        ) : (
          <>
            {rendering && (
              <p role="status" className="mb-3 text-xs text-zinc-500">
                Rendering PDF…
              </p>
            )}
            <canvas
              ref={canvas}
              role="img"
              aria-label={"PDF page " + page}
              className="mx-auto bg-white shadow-xl"
            />
          </>
        )}
      </div>
    </div>
  );
}
