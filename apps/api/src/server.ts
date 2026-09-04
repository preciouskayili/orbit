import cors from "cors";
import express from "express";
import {
  CreateMachineInputSchema,
  MachineSchema,
  type Machine,
  type MachineOS,
} from "@orbit/shared";
import { activity, machines, messages, projects } from "./data.js";

const app = express();
const port = Number(process.env.API_PORT ?? 4000);

app.disable("x-powered-by");
app.use(cors({ origin: true }));
app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({ status: "ok", service: "orbit-api" });
});

app.get("/api/projects", (_request, response) => {
  response.json(projects);
});

app.get("/api/projects/:id", (request, response) => {
  const project = projects.find(
    (candidate) => candidate.id === request.params.id,
  );
  if (!project)
    return response.status(404).json({ message: "Project not found" });
  return response.json(project);
});

app.get("/api/projects/:id/machines", (request, response) => {
  response.json(
    machines.filter((machine) => machine.projectId === request.params.id),
  );
});

app.post("/api/projects/:id/machines", (request, response) => {
  const project = projects.find(
    (candidate) => candidate.id === request.params.id,
  );
  if (!project)
    return response.status(404).json({ message: "Project not found" });

  const parsed = CreateMachineInputSchema.safeParse(request.body);
  if (!parsed.success) {
    return response.status(400).json({
      message: "Invalid machine configuration",
      issues: parsed.error.issues,
    });
  }

  const osLabels: Record<MachineOS, string> = {
    ubuntu: "Ubuntu 24.04",
    windows: "Windows 11",
    macos: "macOS",
  };
  const machine: Machine = MachineSchema.parse({
    id: `${parsed.data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}`,
    projectId: project.id,
    name: parsed.data.name,
    os: parsed.data.os,
    osLabel: osLabels[parsed.data.os],
    status: "stopped",
    cpu: parsed.data.cpu,
    ramGb: parsed.data.ramGb,
    storageGb: parsed.data.storageGb,
    lastSeenAt: new Date().toISOString(),
  });
  machines.push(machine);
  project.machineCount += 1;
  project.updatedAt = new Date().toISOString();
  return response.status(201).json(machine);
});

app.get("/api/machines/:id", (request, response) => {
  const machine = machines.find(
    (candidate) => candidate.id === request.params.id,
  );
  if (!machine)
    return response.status(404).json({ message: "Machine not found" });
  return response.json(machine);
});

app.get("/api/projects/:id/activity", (request, response) => {
  response.json(
    activity.filter((event) => event.projectId === request.params.id),
  );
});

app.get("/api/projects/:id/messages", (request, response) => {
  response.json(
    messages.filter((message) => message.projectId === request.params.id),
  );
});

app.use((_request, response) => {
  response.status(404).json({ message: "Route not found" });
});

app.listen(port, "127.0.0.1", () => {
  console.log(`[orbit-api] listening on http://127.0.0.1:${port}`);
});
