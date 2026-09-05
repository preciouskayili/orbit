import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Outlet, useLocation } from "react-router-dom";
import { SidebarSimple } from "./ui/icons";
import { Sidebar } from "./sidebar";
import { AgentPanel } from "./agent-panel";
import { orbitActions } from "@/lib/orbit-store";
import { useOrbit } from "@/hooks/use-orbit";

const MIN_CONVERSATION_WIDTH = 400;
const MAX_CONVERSATION_WIDTH = 680;
const DEFAULT_CONVERSATION_WIDTH = 480;

export function AppShell() {
  const location = useLocation();
  const state = useOrbit();
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
  const [agentCollapsed, setAgentCollapsed] = useState(false);
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
  useEffect(() => {
    if (location.pathname === "/new" || taskId) setAgentCollapsed(false);
  }, [location.key, taskId]);
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

  return (
    <div className="flex h-full w-full bg-transparent text-zinc-100">
      <Sidebar
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed((value) => !value)}
      />

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        {sidebarCollapsed && (
          <div className="window-drag flex h-[54px] shrink-0 items-center pl-24">
            <button
              aria-label="Expand sidebar"
              aria-expanded={false}
              aria-controls="sidebar-content"
              title="Show sidebar"
              onClick={() => setSidebarCollapsed(false)}
              className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 focus-visible:outline focus-visible:outline-2"
            >
              <SidebarSimple className="size-4" />
            </button>
          </div>
        )}
        <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
          <AgentPanel
            projectId={projectId}
            width={visibleWidth}
            collapsed={agentCollapsed}
            onToggle={() => setAgentCollapsed((value) => !value)}
          />

          {!agentCollapsed && (
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
              <span className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2 bg-transparent transition-colors duration-150 group-hover:bg-[#dd583b] group-active:bg-[#dd583b] group-focus-visible:bg-[#dd583b]" />
            </div>
          )}

          <main className="min-w-0 flex-1 bg-[#171818]">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
