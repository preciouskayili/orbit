import type { Machine } from "@orbit/shared";

export const computerMention = (machine: Machine) => "@" + machine.name;
export type MentionPart = { text: string; machine?: Machine };

// One tokenizer for rendering and permission resolution. Longest exact names win;
// duplicate names never grant access. Old quoted messages remain supported.
export function computerMentionParts(
  text: string,
  machines: Machine[],
): MentionPart[] {
  const candidates = machines
    .flatMap((machine) =>
      [computerMention(machine), "@" + JSON.stringify(machine.name)].map(
        (token) => ({ machine, token }),
      ),
    )
    .sort((a, b) => b.token.length - a.token.length);
  const parts: MentionPart[] = [];
  let start = 0;
  for (let index = 0; index < text.length; index++) {
    if (text[index] !== "@" || (index > 0 && !/[\s([{]/.test(text[index - 1]!)))
      continue;
    const found = candidates.find(
      ({ token }) =>
        text.startsWith(token, index) &&
        (index + token.length === text.length ||
          /[\s.,!?;:)\]}]/.test(text[index + token.length]!)),
    );
    if (!found) continue;
    if (index > start) parts.push({ text: text.slice(start, index) });
    parts.push({
      text: found.token,
      machine:
        machines.filter((m) => m.name === found.machine.name).length === 1
          ? found.machine
          : undefined,
    });
    index += found.token.length - 1;
    start = index + 1;
  }
  if (start < text.length) parts.push({ text: text.slice(start) });
  return parts;
}

export function mentionedComputers(text: string, machines: Machine[]) {
  return [
    ...new Set(
      computerMentionParts(text, machines).flatMap((p) =>
        p.machine ? [p.machine.id] : [],
      ),
    ),
  ];
}
