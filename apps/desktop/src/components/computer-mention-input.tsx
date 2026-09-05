import { useRef, useState } from "react";
import type { Machine } from "@orbit/shared";
import { computerMention } from "@/lib/computer-mentions";
import { OsLogo } from "./os-logo";

export function ComputerMentionInput({
  value,
  onChange,
  onSend,
  computers,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  computers: Machine[];
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [caret, setCaret] = useState(value.length);
  const match = value.slice(0, caret).match(/@([^@"\n]*)$/);
  const results =
    match && !dismissed
      ? computers.filter((m) =>
          m.name.toLowerCase().includes(match[1]!.toLowerCase()),
        )
      : [];
  const open = Boolean(match && !dismissed);
  function select(machine: Machine) {
    const start = caret - (match?.[0].length ?? 0);
    const next =
      value.slice(0, start) +
      computerMention(machine) +
      " " +
      value.slice(caret);
    onChange(next);
    setDismissed(true);
    requestAnimationFrame(() => {
      input.current?.focus();
      input.current?.setSelectionRange(
        start + computerMention(machine).length + 1,
        start + computerMention(machine).length + 1,
      );
    });
  }
  return (
    <div className="relative">
      {open && (
        <div
          className="absolute bottom-full left-0 right-0 z-30 mb-3 max-h-56 overflow-y-auto rounded-xl bg-[#333335] p-1.5 shadow-2xl"
          id="computer-mentions"
          role="listbox"
          aria-label="Mention a computer"
        >
          <p className="px-2.5 py-2 text-[10px] text-zinc-500">
            Workspace computers · access requires permission
          </p>
          {results.map((m, index) => (
            <div
              role="option"
              id={"mention-" + index}
              aria-selected={index === active}
              key={m.id}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => select(m)}
              onMouseMove={() => setActive(index)}
              className={
                "flex cursor-default items-center gap-3 rounded-lg px-2.5 py-2.5 " +
                (index === active ? "bg-white/10" : "")
              }
            >
              <OsLogo os={m.os} className="size-4" />
              <span className="min-w-0 flex-1 truncate text-xs text-zinc-200">
                {m.name}
              </span>
              <span className="text-[10px] text-zinc-500">{m.status}</span>
            </div>
          ))}
          {!results.length && (
            <p className="p-4 text-xs text-zinc-500">
              No computers match. Create one below.
            </p>
          )}
        </div>
      )}
      <textarea
        ref={input}
        role="combobox"
        aria-label="Message your agent"
        aria-expanded={open}
        aria-controls={open ? "computer-mentions" : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[active] ? "mention-" + active : undefined
        }
        className="h-20 w-full resize-none bg-transparent p-1 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-500"
        placeholder="Ask anything, @mention a computer…"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setCaret(e.target.selectionStart);
          setActive(0);
          setDismissed(false);
        }}
        onSelect={(e) => setCaret(e.currentTarget.selectionStart)}
        onKeyDown={(e) => {
          if (e.nativeEvent.isComposing) return;
          if (open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
            e.preventDefault();
            setActive((index) =>
              results.length
                ? (index + (e.key === "ArrowDown" ? 1 : -1) + results.length) %
                  results.length
                : 0,
            );
            return;
          }
          if (open && e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            setDismissed(true);
            return;
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            if (open && results[active]) select(results[active]);
            else onSend();
          }
        }}
      />
    </div>
  );
}
