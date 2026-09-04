import { Navigate, createHashRouter } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { MachineWorkspacePage } from "@/pages/machine-workspace-page";
import { ProjectOverviewPage } from "@/pages/project-overview-page";
import { ProjectsPage } from "@/pages/projects-page";
import { SettingsPage } from "@/pages/settings-page";
import { NewTaskPage, TasksPage, TaskDetailPage } from "@/pages/tasks-page";
import { AgentsPage, SkillsPage } from "@/pages/agents-page";
import { NewSchedulePage, ScheduledPage } from "@/pages/scheduled-page";

export const router = createHashRouter([{
  path: "/", element: <AppShell />, children: [
    { index: true, element: <Navigate to="/new" replace /> },
    { path: "new", element: <NewTaskPage /> },
    { path: "tasks", element: <TasksPage /> },
    { path: "tasks/:taskId", element: <TaskDetailPage /> },
    { path: "projects", element: <ProjectsPage /> },
    { path: "projects/:projectId", element: <ProjectOverviewPage /> },
    { path: "projects/:projectId/machines/:machineId", element: <MachineWorkspacePage /> },
    { path: "agents", element: <AgentsPage /> },
    { path: "skills", element: <SkillsPage /> },
    { path: "scheduled", element: <ScheduledPage /> },
    { path: "scheduled/new", element: <NewSchedulePage /> },
    { path: "settings", element: <SettingsPage /> },
    { path: "*", element: <Navigate to="/new" replace /> },
  ],
}]);
