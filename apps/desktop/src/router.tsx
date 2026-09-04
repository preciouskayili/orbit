import { Navigate, createHashRouter } from "react-router-dom";
import { AppShell } from "@/components/app-shell";
import { MachineWorkspacePage } from "@/pages/machine-workspace-page";
import { ProjectOverviewPage } from "@/pages/project-overview-page";
import { ProjectsPage } from "@/pages/projects-page";
import { SettingsPage } from "@/pages/settings-page";

export const router = createHashRouter([
  {
    path: "/",
    element: <AppShell />,
    children: [
      { index: true, element: <Navigate to="/projects/trace/machines/ubuntu-dev" replace /> },
      { path: "projects", element: <ProjectsPage /> },
      { path: "projects/:projectId", element: <ProjectOverviewPage /> },
      {
        path: "projects/:projectId/machines/:machineId",
        element: <MachineWorkspacePage />,
      },
      { path: "settings", element: <SettingsPage /> },
      { path: "*", element: <Navigate to="/projects/trace/machines/ubuntu-dev" replace /> },
    ],
  },
]);
