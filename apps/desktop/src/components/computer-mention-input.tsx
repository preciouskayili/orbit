import { useRef, useState, type RefObject } from "react";
import type { Machine } from "@orbit/shared";
import { computerMention, computerMentionParts } from "@/lib/computer-mentions";
import { OsLogo } from "./os-logo";

export function ComputerMentionInput({
  value,
  onChange,
  onSend,
  computers,
  inputRef,
  disabled = false,
}: {
  disabled?: boolean;
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  computers: Machine[];
  inputRef?: RefObject<HTMLTextAreaElement | null>;
}) {
  const localInput = useRef<HTMLTextAreaElement>(null);
  const input = inputRef ?? localInput;
  const highlight = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [caret, setCaret] = useState(value.length);
  const query = value.slice(0, caret).match(/@([^@"\n]*)$/);
  const completed = query && computerMentionParts(query[0], computers)[0];
  const match =
    completed?.machine && query![0].length > completed.text.length
      ? null
      : query;
  const results =
    match && !dismissed
      ? computers.filter((m) =>
          m.name.toLowerCase().includes(match[1]!.toLowerCase()),
        )
      : [];
  const open = Boolean(match && !dismissed && !disabled);
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
      <div
        aria-hidden="true"
        ref={highlight}
        className="pointer-events-none absolute inset-0 h-20 overflow-hidden whitespace-pre-wrap break-words p-1 text-sm leading-6 text-zinc-200 [scrollbar-gutter:stable]"
      >
        {computerMentionParts(value, computers).map((part, index) => (
          <span
            key={index}
            className={part.machine ? "text-sky-300" : undefined}
          >
            {part.text}
          </span>
        ))}
        {"\n"}
      </div>
      <textarea
        ref={input}
        disabled={disabled}
        role="combobox"
        aria-label="Message your agent"
        aria-expanded={open}
        aria-controls={open ? "computer-mentions" : undefined}
        aria-autocomplete="list"
        aria-activedescendant={
          open && results[active] ? "mention-" + active : undefined
        }
        className="h-20 w-full resize-none bg-transparent p-1 text-sm leading-6 relative text-transparent caret-zinc-200 outline-none placeholder:text-zinc-500 [scrollbar-gutter:stable] selection:bg-sky-400/25 forced-colors:text-[CanvasText]"
        placeholder="Ask anything, @mention a computer…"
        value={value}
        onScroll={(e) => {
          if (highlight.current)
            highlight.current.scrollTop = e.currentTarget.scrollTop;
        }}
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
