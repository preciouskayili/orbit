import { useEffect, useState } from "react";
import { useLocation, useNavigate, useNavigationType } from "react-router-dom";
import { ArrowLeft, ArrowRight, SidebarSimple } from "./ui/icons";

// Track in-app entries, so Back never accidentally leaves Orbit. Keep this hook
// in the shell: hiding the sidebar must not reset navigation history.
export function useWindowNavigation() {
  const location = useLocation();
  const navigationType = useNavigationType();
  const navigate = useNavigate();
  const [history, setHistory] = useState({ keys: [location.key], index: 0 });
  useEffect(() => {
    setHistory((current) => {
      if (current.keys[current.index] === location.key) return current;
      if (navigationType === "POP") {
        const index = current.keys.indexOf(location.key);
        return index < 0
          ? { keys: [location.key], index: 0 }
          : { ...current, index };
      }
      if (navigationType === "REPLACE") {
        const keys = [...current.keys];
        keys[current.index] = location.key;
        return { ...current, keys };
      }
      return {
        keys: [...current.keys.slice(0, current.index + 1), location.key],
        index: current.index + 1,
      };
    });
  }, [location.key, navigationType]);
  return {
    canBack: history.index > 0,
    canForward: history.index < history.keys.length - 1,
    back: () => navigate(-1),
    forward: () => navigate(1),
  };
}

export function WindowToolbar({
  collapsed,
  onToggle,
  navigation,
}: {
  collapsed: boolean;
  onToggle: () => void;
  navigation: ReturnType<typeof useWindowNavigation>;
}) {
  const button =
    "[&_svg]:pointer-events-none rounded-md p-1.5 text-zinc-400 hover:bg-white/[0.045] hover:text-zinc-200 disabled:pointer-events-none disabled:text-zinc-600 focus-visible:outline focus-visible:outline-2";
  return (
    <div
      aria-label="Window controls"
      className="window-controls absolute left-[88px] top-[7px] z-30 flex items-center gap-0.5"
    >
      <button
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        aria-expanded={!collapsed}
        aria-controls="sidebar-content"
        title="Toggle sidebar"
        onClick={onToggle}
        className={button}
      >
        <SidebarSimple weight="regular" className="size-4" />
      </button>
      <button
        aria-label="Go back"
        title="Back"
        disabled={!navigation.canBack}
        onClick={navigation.back}
        className={button}
      >
        <ArrowLeft className="size-4" />
      </button>
      <button
        aria-label="Go forward"
        title="Forward"
        disabled={!navigation.canForward}
        onClick={navigation.forward}
        className={button}
      >
        <ArrowRight className="size-4" />
      </button>
    </div>
  );
}
