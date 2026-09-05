import { AgentOrb } from "./agent-orb";
import { ArrowUpRight, Code, MagnifyingGlass } from "./ui/icons";

const starters = [
  {
    icon: Code,
    label: "Build & test",
    detail: "From an idea to a working app",
    prompt:
      "Help me build and test an app. Start by asking what I want to create.",
  },
  {
    icon: MagnifyingGlass,
    label: "Research & compare",
    detail: "Explore, check sources, bring back answers",
    prompt:
      "Help me research a topic and compare what you find. Ask me what I’m looking into first.",
  },
];

export function AgentWelcome({
  onChoose,
}: {
  onChoose: (prompt: string) => void;
}) {
  return (
    <div>
      <AgentOrb size={64} />
      <h1 className="mt-6 text-2xl font-medium tracking-tight text-zinc-200">
        What are we working on?
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-6 text-zinc-500">
        Start with an idea. We’ll work through it together, with cloud computers
        whenever you need them.
      </p>
      <div className="mt-7 space-y-2">
        {starters.map(({ icon: Icon, label, detail, prompt }) => (
          <button
            key={label}
            onClick={() => onChoose(prompt)}
            className="group flex w-full items-center gap-3 rounded-xl bg-white/[0.025] px-3.5 py-3 text-left transition-colors hover:bg-white/[0.055] focus-visible:outline focus-visible:outline-2 focus-visible:outline-sky-300"
          >
            <Icon className="size-4 shrink-0 text-zinc-500" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm text-zinc-300">{label}</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-500">
                {detail}
              </span>
            </span>
            <ArrowUpRight className="size-3.5 text-zinc-600 group-hover:text-zinc-300" />
          </button>
        ))}
      </div>
      <p className="mt-5 text-xs leading-5 text-zinc-600">
        Have a computer in mind? Type <span className="text-sky-300/80">@</span>{" "}
        to mention it. You approve access.
      </p>
    </div>
  );
}
