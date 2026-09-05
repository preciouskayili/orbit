import { z } from "zod";

export const attachmentSchema = z.object({
  id: z.string(),
  name: z.string(),
  size: z.number().nonnegative(),
  type: z.string(),
});
export type ChatAttachment = z.infer<typeof attachmentSchema>;
export const MAX_FILES = 8;
export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 25 * 1024 * 1024;

export function validateAttachments(files: File[]) {
  if (files.length > MAX_FILES)
    throw new Error("Attach up to 8 files at a time.");
  if (files.some((file) => file.size > MAX_FILE_BYTES))
    throw new Error("Each file must be 10 MB or smaller.");
  if (files.reduce((total, file) => total + file.size, 0) > MAX_TOTAL_BYTES)
    throw new Error("Attachments must total 25 MB or less.");
}

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("orbit.attachments", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("files");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        new Error(
          "Couldn’t open local file storage. Your message was not sent.",
        ),
      );
    request.onblocked = () =>
      reject(new Error("Close other Orbit windows and try attaching again."));
  });
}

// File bytes live in IndexedDB, not localStorage. No upload or agent access is
// implied. Replace this adapter with authenticated object storage for the backend.
export async function saveAttachments(
  workspaceId: string,
  files: File[],
): Promise<ChatAttachment[]> {
  validateAttachments(files);
  if (!files.length) return [];
  const db = await openDatabase();
  const attachments = files.map((file) => ({
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    type: file.type,
  }));
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () =>
        reject(
          new Error(
            "Couldn’t save the attachments. Check available storage and try again.",
          ),
        );
      attachments.forEach((attachment, index) =>
        tx.objectStore("files").put(files[index], [workspaceId, attachment.id]),
      );
    });
    return attachments;
  } finally {
    db.close();
  }
}

export async function loadAttachment(
  workspaceId: string,
  id: string,
): Promise<Blob> {
  const db = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const request = db
        .transaction("files")
        .objectStore("files")
        .get([workspaceId, id]);
      request.onsuccess = () =>
        request.result instanceof Blob
          ? resolve(request.result)
          : reject(
              new Error(
                "This local file is no longer available. Attach it again.",
              ),
            );
      request.onerror = () =>
        reject(new Error("Couldn’t read this attachment."));
    });
  } finally {
    db.close();
  }
}

export async function removeAttachments(
  workspaceId: string,
  attachments: ChatAttachment[],
) {
  if (!attachments.length) return;
  const db = await openDatabase();
  try {
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction("files", "readwrite");
      tx.oncomplete = () => resolve();
      tx.onerror = tx.onabort = () => reject(tx.error);
      attachments.forEach((file) =>
        tx.objectStore("files").delete([workspaceId, file.id]),
      );
    });
  } finally {
    db.close();
  }
}

export function fileSize(bytes: number) {
  return bytes < 1024
    ? bytes + " B"
    : bytes < 1024 * 1024
      ? Math.ceil(bytes / 1024) + " KB"
      : (bytes / (1024 * 1024)).toFixed(1) + " MB";
}
