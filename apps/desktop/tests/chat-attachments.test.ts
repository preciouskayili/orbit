import { expect, test } from "vitest";
import {
  saveAttachments,
  loadAttachment,
  removeAttachments,
  validateAttachments,
  MAX_FILE_BYTES,
  MAX_TOTAL_BYTES,
} from "../src/lib/chat-attachments";

test("attachment bytes persist across connections and are isolated by workspace", async () => {
  const files = await saveAttachments("workspace-a", [
    new File(["hello"], "notes.txt", { type: "text/plain" }),
  ]);
  expect(files[0].name).toBe("notes.txt");
  expect(await (await loadAttachment("workspace-a", files[0].id)).text()).toBe(
    "hello",
  );
  await expect(loadAttachment("workspace-b", files[0].id)).rejects.toThrow(
    "no longer available",
  );
  await removeAttachments("workspace-a", files);
  await expect(loadAttachment("workspace-a", files[0].id)).rejects.toThrow(
    "no longer available",
  );
});

test("attachment count and size limits are checked before storing anything", () => {
  const file = (size: number) => ({ size }) as File;
  expect(() => validateAttachments(Array(9).fill(file(1)))).toThrow("8 files");
  expect(() => validateAttachments([file(MAX_FILE_BYTES + 1)])).toThrow(
    "10 MB",
  );
  expect(() =>
    validateAttachments([
      file(MAX_FILE_BYTES),
      file(MAX_FILE_BYTES),
      file(MAX_TOTAL_BYTES),
    ]),
  ).toThrow();
  expect(() =>
    validateAttachments([
      file(MAX_FILE_BYTES),
      file(MAX_FILE_BYTES),
      file(MAX_FILE_BYTES),
    ]),
  ).toThrow("25 MB");
});
