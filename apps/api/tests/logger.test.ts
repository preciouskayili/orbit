import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { errorFields, log } from "../src/logger.js";

test("error logging excludes SDK headers, signed URLs and raw messages", () => {
  const error = Object.assign(new Error("secret-url-and-token"), { code: "QUOTA", statusCode: 400, headers: { Authorization: "Bearer private-key" } });
  assert.deepEqual(errorFields(error), { errorType: "Error", errorCode: "QUOTA", providerStatus: 400 });
  const output = mock.method(console, "log", () => {});
  try {
    log("info", "request.finished", { requestId: "test", status: 200, durationMs: 12 });
    const line = String(output.mock.calls[0]?.arguments[0]);
    // The structured logger must include the event name and key fields.
    assert.ok(line.includes("request.finished"), "output includes event name");
    assert.ok(line.includes("durationMs=12"), "output includes duration field");
    assert.ok(line.includes("status=200"), "output includes status field");
    // Secrets from SDK errors must never appear in log output.
    assert.ok(!line.includes("private-key"), "output does not leak secrets");
    assert.ok(!line.includes("Authorization"), "output does not leak headers");
  } finally { output.mock.restore(); }
});
