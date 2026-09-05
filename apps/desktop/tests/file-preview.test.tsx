import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { AttachmentGrid } from "../src/components/attachment-grid";
import {
  FilePreviewPane,
  ImagePreviewDialog,
} from "../src/components/file-preview-pane";
import {
  filePreview,
  previewKind,
  useFilePreview,
} from "../src/lib/file-preview";

function Harness({
  files,
  onRemove,
}: {
  files: File[];
  onRemove?: (index: number) => void;
}) {
  const selection = useFilePreview();
  return (
    <>
      <AttachmentGrid
        files={files}
        workspaceId="personal"
        onRemove={onRemove}
      />
      {selection &&
        (previewKind(selection.file) === "image" ? (
          <ImagePreviewDialog selection={selection} />
        ) : (
          <FilePreviewPane selection={selection} />
        ))}
    </>
  );
}

test("compact grid opens escaped document text in a closeable pane", async () => {
  const file = new File(['<script>alert("hello")</script>'], "notes.html", {
    type: "text/html",
  });
  const { container } = render(<Harness files={[file]} />);
  expect(screen.getByLabelText("Attachments").className).toContain(
    "grid-cols-2",
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview notes.html" }));
  expect(
    await screen.findByText('<script>alert("hello")</script>'),
  ).toBeTruthy();
  expect(container.querySelector("script")).toBeNull();
  expect(container.querySelector("iframe")).toBeNull();
  fireEvent.click(
    screen.getByRole("button", { name: "Close document preview" }),
  );
  expect(screen.queryByRole("region", { name: "Document preview" })).toBeNull();
});

test("images open in a popup and Escape closes it", async () => {
  render(
    <Harness
      files={[new File(["image"], "photo.png", { type: "image/png" })]}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview photo.png" }));
  const dialog = await screen.findByRole("dialog");
  expect(await screen.findByRole("img", { name: "photo.png" })).toBeTruthy();
  fireEvent.keyDown(dialog, { key: "Escape" });
  await waitFor(() => expect(filePreview.get()).toBeNull());
});

test("removing a selected draft closes its preview", async () => {
  const onRemove = vi.fn();
  render(
    <Harness
      files={[new File(["Hello"], "notes.txt", { type: "text/plain" })]}
      onRemove={onRemove}
    />,
  );
  fireEvent.click(screen.getByRole("button", { name: "Preview notes.txt" }));
  await screen.findByText("Hello");
  fireEvent.click(screen.getByRole("button", { name: "Remove notes.txt" }));
  expect(onRemove).toHaveBeenCalledWith(0);
  expect(filePreview.get()).toBeNull();
});

test("preview classification keeps active content as text and unsupported files downloadable", () => {
  expect(previewKind({ name: "drawing.svg", type: "image/svg+xml" })).toBe(
    "text",
  );
  expect(previewKind({ name: "document.pdf", type: "application/pdf" })).toBe(
    "pdf",
  );
  expect(previewKind({ name: "report.docx", type: "" })).toBe("docx");
  expect(
    previewKind({ name: "archive.zip", type: "application/zip" }),
  ).toBeNull();
});
