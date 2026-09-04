import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Sidebar } from "./sidebar";
import { AgentPanel } from "./agent-panel";

const MIN_CONVERSATION_WIDTH = 400;
const MAX_CONVERSATION_WIDTH = 680;
const DEFAULT_CONVERSATION_WIDTH = 480;

export function AppShell() {
  const location = useLocation();
  const [agentCollapsed, setAgentCollapsed] = useState(false);
  const [conversationWidth, setConversationWidth] = useState(
    DEFAULT_CONVERSATION_WIDTH,
  );
  const dragStart = useRef<{ pointerX: number; width: number } | null>(null);
  const projectId =
    location.pathname.match(/^\/projects\/([^/]+)/)?.[1] ?? "trace";

  const resizeConversation = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragStart.current) return;
    const nextWidth =
      dragStart.current.width + event.clientX - dragStart.current.pointerX;
    setConversationWidth(
      Math.min(
        MAX_CONVERSATION_WIDTH,
        Math.max(MIN_CONVERSATION_WIDTH, nextWidth),
      ),
    );
  };

  return (
    <div className="flex h-full w-full bg-transparent text-zinc-100">
      <Sidebar projectId={projectId} />

      <div className="h-full w-full overflow-hidden flex-1">
        <div className="flex min-w-0 flex-1 overflow-hidden h-full">
          <AgentPanel
            projectId={projectId}
            width={conversationWidth}
            collapsed={agentCollapsed}
            onToggle={() => setAgentCollapsed((value) => !value)}
          />

          {!agentCollapsed && (
            <div
              role="separator"
              aria-label="Resize conversation"
              aria-orientation="vertical"
              aria-valuemin={MIN_CONVERSATION_WIDTH}
              aria-valuemax={MAX_CONVERSATION_WIDTH}
              aria-valuenow={conversationWidth}
              tabIndex={0}
              onPointerDown={(event) => {
                dragStart.current = {
                  pointerX: event.clientX,
                  width: conversationWidth,
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
                    MAX_CONVERSATION_WIDTH,
                    Math.max(MIN_CONVERSATION_WIDTH, width + change),
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
