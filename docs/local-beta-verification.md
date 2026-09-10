# Local beta verification — 10 September 2026

Scope: supervised, single-user local Orbit. Hosting, product authentication, billing, and tenant management are deferred.

## Implemented

- Completion-focused desktop instructions; bounded waits; short keyboard batches with handoff checks; repeated-action termination; stale-screen invalidation after terminal commands; bounded screenshot context; automatic X11 display discovery; startup-readiness recheck.
- OpenAI Responses and Anthropic Messages adapters. Model discovery, per-conversation selection, provider configuration, explicit failures, and provider-specific tool/vision history handling. No silent model substitution.
- HTTP MCP server management, optional bearer credentials, connection testing/tool discovery, profile-scoped attachment, real tool execution and tool cards. Disabling or removing a server blocks subsequent calls from active runs.
- Persisted run snapshots with model/call/time/token diagnostics. Interrupted runs become cancelled on restart; past actions are not replayed automatically.
- Folder deletion, safe cancellation of active sessions, retained computers/files, greeting-aware titles, generated task titles, and manual renaming.
- Bundled local API, runtime renderer token, first-launch provider setup, clean packaging staging, and one packaged instance per data directory.

## Verification evidence

- API suite: 25 passing tests, including actual HTTP MCP discovery/call, provider streaming/conversion, restart recovery, cancellation/deletion, desktop batching, and display discovery.
- Desktop suite: 66 passing tests.
- Browser suite: 2 passing workflows covering model selection, request routing, greeting-to-task title updates, manual rename, profile editing, folder deletion, and MCP setup/attachment. These use controlled API fixtures.
- Type checks passed for all packages. Production renderer/API/Electron builds passed.
- macOS ARM64 packaged app launched, started its bundled local API, and rendered provider/Daytona setup. Apple signing identities are not available on this machine.
- The packaged application/API scan found none of the configured credential values and no `.env` files.

## Live provider evidence

OpenAI model discovery exposed Astra, Sol, Terra, Luna, and other GPT models. A live Astra GUI test created a temporary file, edited/saved it through the desktop, and verified its persisted contents.

A live VS Code evaluation completed twice:

| Case | Total elapsed | Model calls | Tool calls | Outcome |
| --- | ---: | ---: | ---: | --- |
| Cold desktop; VS Code installed but not open | 109.1 s | 7 | 6 | Recovered from an initial desktop-tool failure, launched VS Code, took a final observation, and stopped |
| VS Code already visible | 7.9 s | 2 | 1 | Took one screenshot, reported the visible window, and stopped |

The cold run spent 60.6 seconds in tools and 45.9 seconds in model calls. Display discovery and desktop-readiness handling were improved after this trace. A final rerun with independent window inspection could not start because DNS resolution for `app.daytona.io` failed (`ENOTFOUND`). Do not present the earlier timings as a benchmark of those final changes. Successful earlier tests restored the integration-test computer to stopped; the blocked final evaluation failed at fleet lookup before changing computer state.

A live title request containing a greeting followed by an install/open task returned `Install and Open VS Code on Linux`.

## Remaining external requirements and boundaries

- Configure an Anthropic key in Settings to enable/live-test Fable. Its adapter has automated protocol coverage, but no live Anthropic run was possible without a key.
- Re-run the final desktop evaluation after Daytona DNS connectivity returns.
- The shipped macOS build is local and unsigned. Signing/notarization needs the developer's Apple credentials. No update feed is configured.
- MCP support is Streamable HTTP with optional bearer authentication. Stdio and OAuth-based MCP setup are not offered.
- Windows/Linux packaging targets exist but were not built or tested here.
- Ordinary chat attachments must currently live on an attached computer; the live UI does not advertise local file upload or background scheduling.
