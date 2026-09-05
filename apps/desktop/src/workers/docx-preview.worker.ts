import mammoth from "mammoth";

// Extract text, not HTML: no embedded scripts, images, links, or external files
// are executed. The caller terminates this worker if conversion takes too long.
self.onmessage = async (event: MessageEvent<ArrayBuffer>) => {
  try {
    const result = await mammoth.extractRawText({ arrayBuffer: event.data });
    self.postMessage({
      text: result.value.slice(0, 200_000),
      truncated: result.value.length > 200_000,
    });
  } catch {
    self.postMessage({
      error:
        "This document could not be previewed. You can still download the original.",
    });
  }
};
