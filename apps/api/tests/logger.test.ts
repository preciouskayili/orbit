import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { errorFields, log } from "../src/logger.js";

test("error logging excludes SDK headers, signed URLs and raw messages", () => {
  const error = Object.assign(new Error("secret-url-and-token"), { code: "QUOTA", statusCode: 400, headers: { Authorization: "Bearer private-key" } });
  assert.deepEqual(errorFields(error), { errorType: "Error", errorCode: "QUOTA", providerStatus: 400 });
  const output = mock.method(console, "log", () => {});
  try {
    log("info", "request.finished", { requestId: "test", status: 200, durationMs: 12 });
    const record = JSON.parse(String(output.mock.calls[0]?.arguments[0]));
    assert.equal(record.event, "request.finished");
    assert.equal(record.durationMs, 12);
    assert.ok(record.time);
  } finally { output.mock.restore(); }
});
