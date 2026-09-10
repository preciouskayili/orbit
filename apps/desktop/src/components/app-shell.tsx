import { CloudComputerSync } from "./cloud-computer-sync";
import { LiveAgentSync } from "./live-agent-sync";
import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Outlet, useLocation } from "react-router-dom";
import { WindowToolbar, useWindowNavigation } from "./window-toolbar";
import { CaretRight } from "./ui/icons";
import { filePreview, previewKind, useFilePreview } from "@/lib/file-preview";
import { FilePreviewPane, ImagePreviewDialog } from "./file-preview-pane";
import { Sidebar } from "./sidebar";
import { AgentPanel } from "./agent-panel";
import { orbitActions } from "@/lib/orbit-store";
import { useOrbit } from "@/hooks/use-orbit";

const MIN_CONVERSATION_WIDTH = 400;
const MAX_CONVERSATION_WIDTH = 680;
const DEFAULT_CONVERSATION_WIDTH = 480;

export function AppShell() {
  const location = useLocation();
  const navigation = useWindowNavigation();
  const fullPage =
    location.pathname.startsWith("/computers/") ||
    ["/computers", "/skills", "/settings"].includes(location.pathname);
  const state = useOrbit();
  const selectedFile = useFilePreview();
  const selection =
    selectedFile?.workspaceId === state.workspaceId ? selectedFile : null;
  const documentOpen = selection && previewKind(selection.file) !== "image";
  useEffect(() => {
    filePreview.close();
  }, [location.key, state.workspaceId]);
  const taskId = location.pathname.match(/^\/(?:tasks|sessions)\/([^/]+)/)?.[1];
  const task = state.tasks.find(
    (t) =>
      t.id === (taskId ?? state.activeConversations[state.workspaceId]) &&
      state.projects.some(
        (p) => p.id === t.projectId && p.workspaceId === state.workspaceId,
      ),
  );
  useEffect(() => {
    if (taskId && task) orbitActions.openConversation(taskId);
  }, [taskId, state.workspaceId]);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try {
      return localStorage.getItem("orbit.sidebar-collapsed") === "true";
    } catch {
      return false;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem("orbit.sidebar-collapsed", String(sidebarCollapsed));
    } catch {
      /* Layout still works when storage is unavailable. */
    }
  }, [sidebarCollapsed]);
  useEffect(() => {
    const toggle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "\\") {
        event.preventDefault();
        setSidebarCollapsed((value) => !value);
      }
    };
    window.addEventListener("keydown", toggle);
    return () => window.removeEventListener("keydown", toggle);
  }, []);
  const [chatHidden, setChatHidden] = useState(false);
  useEffect(() => {
    if (location.pathname === "/new" || taskId) setChatHidden(false);
  }, [location.key, taskId]);
  const [conversationWidth, setConversationWidth] = useState(
    DEFAULT_CONVERSATION_WIDTH,
  );
  const [windowWidth, setWindowWidth] = useState(window.innerWidth);
  const maxWidth = Math.max(
    MIN_CONVERSATION_WIDTH,
    Math.min(
      MAX_CONVERSATION_WIDTH,
      windowWidth - (sidebarCollapsed ? 360 : 648),
    ),
  );
  const visibleWidth = Math.min(conversationWidth, maxWidth);
  useEffect(() => {
    const resize = () => setWindowWidth(window.innerWidth);
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, []);
  const dragStart = useRef<{ pointerX: number; width: number } | null>(null);
  const projectId =
    location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ??
    new URLSearchParams(location.search).get("project") ??
    task?.projectId ??
    "";

  const resizeConversation = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const nextWidth =
      dragStart.current.width + event.clientX - dragStart.current.pointerX;
    setConversationWidth(
      Math.min(maxWidth, Math.max(MIN_CONVERSATION_WIDTH, nextWidth)),
    );
  };

  const toolbar = (
    <WindowToolbar
      collapsed={sidebarCollapsed}
      onToggle={() => setSidebarCollapsed((value) => !value)}
      navigation={navigation}
    />
  );

  return (
    <div className="relative flex h-full w-full bg-transparent text-zinc-100">
      <Sidebar collapsed={sidebarCollapsed} />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <CloudComputerSync />
        <LiveAgentSync />
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <div
            id="chat-panel"
            hidden={chatHidden || fullPage}
            className={chatHidden || fullPage ? "hidden" : "contents"}
          >
            <AgentPanel
              projectId={projectId}
              width={visibleWidth}
              floatingControls={sidebarCollapsed}
              onHide={() => setChatHidden(true)}
            />

            <div
              role="separator"
              aria-label="Resize conversation"
              aria-orientation="vertical"
              aria-valuemin={MIN_CONVERSATION_WIDTH}
              aria-valuemax={maxWidth}
              aria-valuenow={visibleWidth}
              tabIndex={0}
              onPointerDown={(event) => {
                dragStart.current = {
                  pointerX: event.clientX,
                  width: visibleWidth,
                };
                event.currentTarget.setPointerCapture(event.pointerId);
              }}
              onPointerMove={resizeConversation}
              onPointerUp={(event) => {
                dragStart.current = null;
                event.currentTarget.releasePointerCapture(event.pointerId);
                event.currentTarget.blur();
              }}
              onPointerCancel={(event) => {
                dragStart.current = null;
                event.currentTarget.blur();
              }}
              onKeyDown={(event) => {
                if (event.key !== "ArrowLeft" && event.key !== "ArrowRight")
                  return;
                event.preventDefault();
                const change = event.key === "ArrowLeft" ? -16 : 16;
                setConversationWidth((width) =>
                  Math.min(
                    maxWidth,
                    Math.max(
                      MIN_CONVERSATION_WIDTH,
                      Math.min(width, maxWidth) + change,
                    ),
                  ),
                );
              }}
              className="group relative z-20 -mx-[3px] w-[7px] shrink-0 cursor-col-resize touch-none outline-none"
            >
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-zinc-500/60 group-active:bg-zinc-400/70 group-focus-visible:bg-zinc-400/70" />
            </div>
          </div>
          {chatHidden && !fullPage && (
            <div
              aria-label="Collapsed chat"
              className={
                "window-no-drag flex w-9 shrink-0 justify-center bg-[#181818] " +
                (sidebarCollapsed ? "pt-14" : "pt-[7px]")
              }
            >
              <button
                aria-label="Show chat"
                aria-expanded={false}
                aria-controls="chat-panel"
                title="Show chat"
                onClick={() => setChatHidden(false)}
                className="window-controls relative z-30 h-7 rounded-md p-1.5 text-zinc-300 hover:bg-white/5 focus-visible:outline focus-visible:outline-2 [&_svg]:pointer-events-none"
              >
                <CaretRight weight="regular" className="size-4" />
              </button>
            </div>
          )}
          <main
            className={
              "min-w-0 flex-1 bg-[#171818] " +
              (sidebarCollapsed && (chatHidden || fullPage)
                ? // Move the actual drag rectangle past the floating controls.
                  // Padding still overlaps them; no-drag disables the whole header.
                  fullPage
                  ? "[&_.window-drag]:ml-[184px]"
                  : "[&_.window-drag]:ml-[148px]"
                : "")
            }
          >
            <div
              hidden={Boolean(documentOpen)}
              className={documentOpen ? "hidden" : "h-full"}
            >
              <Outlet />
            </div>
            {documentOpen && selection && (
              <FilePreviewPane
                key={
                  "id" in selection.file
                    ? selection.file.id
                    : selection.file.name
                }
                selection={selection}
              />
            )}
          </main>
        </div>
      </div>
      {selection && previewKind(selection.file) === "image" && (
        <ImagePreviewDialog
          key={"id" in selection.file ? selection.file.id : selection.file.name}
          selection={selection}
        />
      )}
      {toolbar}
    </div>
  );
}
