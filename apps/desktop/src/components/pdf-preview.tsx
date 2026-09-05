import { useEffect, useRef, useState } from "react";
import { getDocument, GlobalWorkerOptions } from "pdfjs-dist/legacy/build/pdf.mjs";
import type { EventBus, PDFViewer } from "pdfjs-dist/legacy/web/pdf_viewer.mjs";
// Keep both PDF.js bundles compatible with the app's Electron runtime.
import workerUrl from "pdfjs-dist/legacy/build/pdf.worker.min.mjs?url";
import "pdfjs-dist/web/pdf_viewer.css";
import { Button } from "./ui/button";
import { MagnifyingGlass, X } from "./ui/icons";
GlobalWorkerOptions.workerSrc = workerUrl;

export default function PdfPreview({ blob }: { blob: Blob }) {
  const container = useRef<HTMLDivElement>(null);
  const pages = useRef<HTMLDivElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const runtime = useRef<{ viewer: PDFViewer; bus: EventBus } | undefined>(undefined);
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [page, setPage] = useState(1);
  const [pageCount, setPageCount] = useState(0);
  const [scale, setScale] = useState(1);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const searchButton = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (searchOpen) searchInput.current?.focus();
  }, [searchOpen]);
  const [matches, setMatches] = useState({ current: 0, total: 0 });
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    let loading: ReturnType<typeof getDocument> | undefined;
    let viewer: PDFViewer | undefined;
    let resize: ResizeObserver | undefined;
    setError("");
    setReady(false);
    setPage(1);
    setPageCount(0);
    setQuery("");
    setSearchOpen(false);
    setMatches({ current: 0, total: 0 });
    setSearching(false);
    void (async () => {
      // The viewer reads pdfjsLib installed by the core import above.
      const { PDFViewer, EventBus, PDFLinkService, PDFFindController } =
        await import("pdfjs-dist/legacy/web/pdf_viewer.mjs");
      if (signal.aborted || !container.current || !pages.current) return;
      const bus = new EventBus();
      const linkService = new PDFLinkService({ eventBus: bus });
      const findController = new PDFFindController({ eventBus: bus, linkService });
      // The runtime supports abortSignal; its published types omit this option.
      const viewerOptions: ConstructorParameters<typeof PDFViewer>[0] & { abortSignal: AbortSignal } = {
        container: container.current,
        viewer: pages.current,
        eventBus: bus,
        linkService,
        findController,
        textLayerMode: 1,
        annotationMode: 0,
        enableAutoLinking: false,
        abortSignal: signal,
      };
      viewer = new PDFViewer(viewerOptions);
      linkService.setViewer(viewer);
      runtime.current = { viewer, bus };
      const options = { signal };
      bus.on("pagesinit", () => {
        if (signal.aborted || !viewer) return;
        viewer.currentScaleValue = "page-width";
        setReady(true);
      }, options);
      bus.on("pagechanging", ({ pageNumber }: { pageNumber: number }) => {
        if (!signal.aborted) setPage(pageNumber);
      }, options);
      bus.on("scalechanging", ({ scale }: { scale: number }) => {
        if (!signal.aborted) setScale(scale);
      }, options);
      bus.on("updatefindmatchescount", ({ matchesCount }: { matchesCount: typeof matches }) => {
        if (!signal.aborted) setMatches(matchesCount);
      }, options);
      bus.on("updatefindcontrolstate", ({ state, matchesCount }: { state: number; matchesCount: typeof matches }) => {
        if (signal.aborted) return;
        setSearching(state === 3);
        setMatches(matchesCount);
      }, options);
      bus.on("pagerendered", ({ error }: { error?: unknown }) => {
        if (!signal.aborted && error) setError("This page could not be rendered. Download the original to open it.");
      }, options);
      resize = new ResizeObserver(() => {
        if (viewer?.currentScaleValue === "page-width") viewer.currentScaleValue = "page-width";
      });
      resize.observe(container.current);
      const data = await blob.arrayBuffer();
      if (signal.aborted) return;
      loading = getDocument({ data, useSystemFonts: true });
      const document = await loading.promise;
      if (signal.aborted) return;
      setPageCount(document.numPages);
      linkService.setDocument(document);
      viewer.setDocument(document);
    })().catch((cause: unknown) => {
      if (signal.aborted) return;
      const name = cause instanceof Error ? cause.name : "";
      setError(name === "PasswordException"
        ? "This PDF requires a password. Download it to open it."
        : name === "InvalidPDFException"
          ? "This file could not be read as a PDF. Download it to check the original."
          : "PDF preview unavailable. Download the original to open it.");
      console.error("PDF preview failed", cause);
    });
    return () => {
      controller.abort();
      resize?.disconnect();
      viewer?.setDocument(null!);
      runtime.current = undefined;
      void loading?.destroy();
    };
  }, [blob]);

  function find(value: string, again = false, previous = false) {
    runtime.current?.bus.dispatch("find", {
      source: searchInput.current,
      type: again ? "again" : "",
      query: value,
      caseSensitive: false,
      entireWord: false,
      highlightAll: true,
      findPrevious: previous,
      matchDiacritics: false,
    });
  }
  function zoom(factor: number) {
    const viewer = runtime.current?.viewer;
    if (viewer) viewer.currentScale = Math.max(0.25, Math.min(4, viewer.currentScale * factor));
  }
  function closeSearch() {
    setSearchOpen(false);
    setQuery("");
    find("");
    runtime.current?.bus.dispatch("findbarclose", { source: searchInput.current });
    searchButton.current?.focus();
  }
  return (
    <div className="flex h-full min-h-0 flex-col" onKeyDown={(event) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "f") {
        event.preventDefault();
        event.stopPropagation();
        setSearchOpen(true);
        searchInput.current?.focus();
        searchInput.current?.select();
      }
    }}>
      <div role="toolbar" aria-label="PDF controls" className="flex h-8 shrink-0 items-center gap-0.5 px-3 text-[10px] text-zinc-500">
        <span className="mr-auto tabular-nums" aria-label={pageCount ? `Page ${page} of ${pageCount}` : "PDF"}>
          {pageCount ? `${page} / ${pageCount}` : "PDF"}
        </span>
        <Button variant="ghost" size="icon-xs" aria-label="Zoom out" title="Zoom out" disabled={!ready || scale <= 0.25} onClick={() => zoom(1 / 1.2)}>−</Button>
        <span className="w-8 text-center tabular-nums" aria-label="Zoom level">{Math.round(scale * 100)}%</span>
        <Button variant="ghost" size="icon-xs" aria-label="Zoom in" title="Zoom in" disabled={!ready || scale >= 4} onClick={() => zoom(1.2)}>+</Button>
        <Button variant="ghost" size="xs" disabled={!ready} onClick={() => { if (runtime.current) runtime.current.viewer.currentScaleValue = "page-width"; }}>Fit width</Button>
        <Button ref={searchButton} variant="ghost" size="icon-xs" aria-label="Find in PDF" title="Find in PDF (⌘/Ctrl+F)" aria-expanded={searchOpen} disabled={!ready}
          onClick={() => searchOpen ? closeSearch() : setSearchOpen(true)}>
          <MagnifyingGlass className="size-3.5" />
        </Button>
      </div>
      {error && <p role="alert" className="p-4 text-sm text-zinc-400">{error}</p>}
      {!ready && !error && <p role="status" className="p-4 text-xs text-zinc-500">Loading PDF…</p>}
      <div className="relative min-h-0 flex-1">
        {searchOpen && (
          <div role="search" aria-label="Find in PDF" className="absolute right-3 top-2 z-10 flex max-w-[calc(100%-24px)] items-center gap-1 rounded-lg bg-[#292a2c] p-1 shadow-lg"
            onKeyDown={(event) => {
              if (event.key === "Escape") { event.stopPropagation(); closeSearch(); }
            }}>
            <input ref={searchInput} type="search" aria-label="Search PDF" placeholder="Find…" disabled={!ready}
              className="h-6 w-36 min-w-0 rounded bg-transparent px-2 text-[11px] text-zinc-200 outline-none focus:ring-1 focus:ring-zinc-500"
              value={query} onChange={(event) => { setQuery(event.target.value); find(event.target.value); }}
              onKeyDown={(event) => {
                if (event.key === "Enter") { event.preventDefault(); find(query, true, event.shiftKey); }
              }} />
            {query && <span role="status" className="whitespace-nowrap px-1 text-[10px] tabular-nums text-zinc-400">{searching ? "…" : matches.total ? `${matches.current}/${matches.total}` : "No matches"}</span>}
            <Button variant="ghost" size="icon-xs" aria-label="Previous match" title="Previous match" disabled={!ready || !query || !matches.total} onClick={() => find(query, true, true)}>↑</Button>
            <Button variant="ghost" size="icon-xs" aria-label="Next match" title="Next match" disabled={!ready || !query || !matches.total} onClick={() => find(query, true)}>↓</Button>
            <Button variant="ghost" size="icon-xs" aria-label="Close PDF search" title="Close search" onClick={closeSearch}><X className="size-3" /></Button>
          </div>
        )}
        <div ref={container} tabIndex={0} aria-label="PDF pages" className="absolute inset-0 overflow-auto outline-none">
          <div ref={pages} className="pdfViewer" />
        </div>
      </div>
    </div>
  );
}
