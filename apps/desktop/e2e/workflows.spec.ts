import { test, expect } from "@playwright/test";

test("live model picker, greeting titles, profile editing and folder deletion", async ({
  page,
}) => {
  let run: any;
  const requests: any[] = [];
  await page.route("**/api/workspaces/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const body = route.request().postDataJSON();
    if (path.endsWith("/integrations"))
      return route.fulfill({
        json: {
          models: [
            { id: "gpt-6-astra", name: "GPT-6 Astra", provider: "openai" },
            {
              id: "claude-fable-5",
              name: "Claude Fable 5",
              provider: "anthropic",
            },
          ],
          defaultModel: "gpt-6-astra",
          providers: [
            { id: "openai", configured: true },
            { id: "anthropic", configured: true },
          ],
          servers: [],
        },
      });
    if (path.endsWith("/integrations/title"))
      return route.fulfill({ json: { title: "Open VS Code" } });
    if (path.endsWith("/computers")) return route.fulfill({ json: [] });
    if (path.endsWith("/agent-runs") && body) {
      requests.push(body);
      run = {
        id: body.requestId,
        conversationId: body.conversationId,
        model: body.model,
        status: "completed",
        messages: [{ id: "reply", role: "assistant", content: "Ready." }],
      };
      return route.fulfill({ json: run });
    }
    if (path.includes("/agent-runs"))
      return route.fulfill({
        json: route.request().method() === "DELETE" ? { deleted: true } : run,
      });
    return route.fulfill({
      status: 404,
      json: { message: "Unexpected request" },
    });
  });
  await page.goto("/");
  await page.getByRole("combobox", { name: "Model", exact: true }).click();
  await page.getByRole("option", { name: "Claude Fable 5" }).click();
  await page.getByRole("combobox", { name: "Message your agent" }).fill("hi");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(page.getByText("Ready.", { exact: true })).toBeVisible();
  expect(requests[0].model).toBe("claude-fable-5");
  await expect(
    page.getByRole("link", { name: "New session", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("combobox", { name: "Message your agent" })
    .fill("please open vscode");
  await page.getByRole("button", { name: "Send message" }).click();
  await expect(
    page.getByRole("link", { name: "Open VS Code", exact: true }).first(),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Session actions for Open VS Code" })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Rename session" }).click();
  await page
    .getByRole("textbox", { name: "Session title" })
    .fill("Editor setup");
  await page.getByRole("button", { name: "Save title" }).click();
  await expect(
    page.getByRole("link", { name: "Editor setup", exact: true }).first(),
  ).toBeVisible();
  await page.getByRole("link", { name: "Skills", exact: true }).click();
  await page.getByRole("button", { name: "New profile" }).click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("Desktop helper");
  await page
    .getByRole("textbox", { name: "Instructions", exact: true })
    .fill("Use the shortest verified path and stop after success.");
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Desktop helper" }),
  ).toBeVisible();
  await page.screenshot({ path: "/tmp/orbit-skills.png" });
  await page
    .getByRole("button", { name: /^Folder actions for/ })
    .first()
    .click();
  await page.getByRole("menuitem", { name: "Delete folder" }).click();
  await page
    .getByRole("button", { name: "Delete folder", exact: true })
    .click();
  await expect(
    page.getByRole("link", { name: "Editor setup", exact: true }),
  ).toHaveCount(0);
});
test("MCP connection can be added, tested and attached to a profile", async ({
  page,
}) => {
  const servers: any[] = [];
  let submitted: any;
  await page.route("**/api/workspaces/**", async (route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path.endsWith("/integrations"))
      return route.fulfill({
        json: { models: [], defaultModel: "", providers: [], servers },
      });
    if (path.endsWith("/servers") && method === "POST") {
      submitted = route.request().postDataJSON();
      servers.push({
        ...submitted,
        token: undefined,
        hasToken: true,
        id: "adbb2fbb-adbb-4fbb-adbb-adbbadbbadbb",
      });
      return route.fulfill({ json: servers[0] });
    }
    if (path.endsWith("/test"))
      return route.fulfill({
        json: { tools: [{ name: "Local tools · echo" }] },
      });
    if (path.endsWith("/computers")) return route.fulfill({ json: [] });
    return route.fulfill({
      status: 404,
      json: { message: "Unexpected request" },
    });
  });
  await page.goto("/#/skills");
  await page.getByRole("button", { name: "Add server" }).click();
  await page.getByRole("textbox", { name: "Server name" }).fill("Local tools");
  await page
    .getByRole("textbox", { name: "MCP URL" })
    .fill("http://127.0.0.1:9000/mcp");
  await page.getByLabel("Bearer token (optional)").fill("test-secret");
  await page.getByRole("button", { name: "Save server" }).click();
  await page.getByRole("button", { name: "Test connection" }).click();
  await expect(page.getByText("Connected · 1 tools")).toBeVisible();
  expect(submitted.token).toBe("test-secret");
  await expect(page.getByText("test-secret", { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "New profile" }).click();
  await page
    .getByRole("textbox", { name: "Name", exact: true })
    .fill("MCP helper");
  await page
    .getByRole("textbox", { name: "Instructions", exact: true })
    .fill("Use attached tools.");
  await page.getByRole("checkbox", { name: "Local tools" }).check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await page
    .getByRole("button", { name: /MCP helper Use attached tools/ })
    .click();
  await expect(
    page.getByRole("checkbox", { name: "Local tools" }),
  ).toBeChecked();
});
