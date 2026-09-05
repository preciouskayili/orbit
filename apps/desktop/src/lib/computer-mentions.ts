import type { Machine } from "@orbit/shared";

// Quoted tokens preserve spaces and punctuation without guessing which machine
// a partial name refers to. The backend should receive the resolved IDs.
export const computerMention = (machine: Machine) =>
  "@" + JSON.stringify(machine.name);
export function mentionedComputers(text: string, machines: Machine[]) {
  const names = [
    ...text.matchAll(/@("(?:\\.|[^"\\])*"|[a-zA-Z0-9_-]+)/g),
  ].flatMap((match) => {
    try {
      return [
        match[1]!.startsWith('"')
          ? (JSON.parse(match[1]!) as string)
          : match[1]!,
      ];
    } catch {
      return [];
    }
  });
  return machines
    .filter(
      (m) =>
        names.includes(m.name) &&
        machines.filter((other) => other.name === m.name).length === 1,
    )
    .map((m) => m.id);
}
