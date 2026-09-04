import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { CreateMachineInput } from "@orbit/shared";
import { orbitApi } from "@/lib/api";

export const queryKeys = {
  projects: ["projects"] as const,
  project: (projectId: string) => ["projects", projectId] as const,
  machines: (projectId: string) => ["projects", projectId, "machines"] as const,
  machine: (machineId: string) => ["machines", machineId] as const,
  activity: (projectId: string) => ["projects", projectId, "activity"] as const,
  messages: (projectId: string) => ["projects", projectId, "messages"] as const,
};

export function useProjects() {
  return useQuery({ queryKey: queryKeys.projects, queryFn: orbitApi.projects });
}

export function useProject(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.project(projectId ?? ""),
    queryFn: () => orbitApi.project(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useMachines(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.machines(projectId ?? ""),
    queryFn: () => orbitApi.machines(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useMachine(machineId?: string) {
  return useQuery({
    queryKey: queryKeys.machine(machineId ?? ""),
    queryFn: () => orbitApi.machine(machineId!),
    enabled: Boolean(machineId),
  });
}

export function useActivity(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.activity(projectId ?? ""),
    queryFn: () => orbitApi.activity(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useAgentMessages(projectId?: string) {
  return useQuery({
    queryKey: queryKeys.messages(projectId ?? ""),
    queryFn: () => orbitApi.messages(projectId!),
    enabled: Boolean(projectId),
  });
}

export function useCreateMachine(projectId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateMachineInput) => orbitApi.createMachine(projectId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.projects }),
        queryClient.invalidateQueries({ queryKey: queryKeys.project(projectId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.machines(projectId) }),
      ]);
    },
  });
}
