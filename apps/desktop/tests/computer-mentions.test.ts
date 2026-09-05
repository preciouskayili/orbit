import { expect, test } from "vitest";
import type { Machine } from "@orbit/shared";
import {
  computerMention,
  computerMentionParts,
  mentionedComputers,
} from "../src/lib/computer-mentions";

const machine = (id: string, name: string) => ({ id, name }) as Machine;
const computers = [
  machine("dev", "Dev"),
  machine("box", "Dev box"),
  machine("mac", "Design / Mac"),
];

test("mentions display without quotes and resolve full names with spaces or punctuation", () => {
  expect(computerMention(computers[1])).toBe("@Dev box");
  const text = "Use @Dev box, then @Design / Mac. Check @Dev box again.";
  expect(mentionedComputers(text, computers)).toEqual(["box", "mac"]);
  expect(
    computerMentionParts(text, computers)
      .map((p) => p.text)
      .join(""),
  ).toBe(text);
  expect(mentionedComputers('Use @"Dev box" and @Dev.', computers)).toEqual([
    "box",
    "dev",
  ]);
});

test("partial names, emails, and ambiguous duplicates cannot select a different computer", () => {
  expect(mentionedComputers("@Developer user@Dev @Unknown", computers)).toEqual(
    [],
  );
  expect(
    mentionedComputers("@Dev box", [
      ...computers,
      machine("duplicate", "Dev box"),
    ]),
  ).toEqual([]);
});
