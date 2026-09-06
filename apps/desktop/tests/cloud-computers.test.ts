import { afterEach, expect, test, vi } from "vitest";
import { cloudComputers } from "../src/lib/cloud-computers";
import { getOrbitState, orbitActions } from "../src/lib/orbit-store";

const machine = {
  id: "cloud-race-test", name: "Live computer", workspaceId: "personal", projectId: "",
  provider: "daytona", os: "ubuntu", osLabel: "Linux · Daytona", status: "running",
  cpu: 2, ramGb: 4, storageGb: 10, lastSeenAt: new Date().toISOString(),
};
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
test("an older fleet refresh cannot erase a newly created computer", async () => {
  vi.stubEnv("VITE_ORBIT_API_TOKEN", "local-test-token");
  let finishRefresh!: (response: Response) => void;
  const fetcher = vi.fn()
    .mockImplementationOnce(() => new Promise<Response>((resolve) => { finishRefresh = resolve; }))
    .mockResolvedValueOnce(Response.json(machine));
  vi.stubGlobal("fetch", fetcher);
  const refresh = cloudComputers.refresh("personal");
  const id = await cloudComputers.create("personal", {name:"Live computer",os:"ubuntu",cpu:2,ramGb:4,storageGb:10}, crypto.randomUUID());
  finishRefresh(Response.json([]));
  await refresh;
  expect(getOrbitState().machines.find((value) => value.id === id)?.provider).toBe("daytona");
  expect(fetcher.mock.calls[1]?.[1].headers.Authorization).toBe("Bearer local-test-token");
});
test("cloud responses cannot replace records with another workspace's computers", async () => {
  vi.stubEnv("VITE_ORBIT_API_TOKEN", "local-test-token");
  const before = getOrbitState().machines;
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(Response.json([{...machine,workspaceId:"team"}])));
  await expect(cloudComputers.refresh("personal")).rejects.toThrow("Invalid computer ownership");
  expect(getOrbitState().machines).toBe(before);
});
test("cloud start uses the API, and local lifecycle mutation cannot pretend to start a cloud computer", async () => {
  orbitActions.switchWorkspace("personal");
  vi.stubEnv("VITE_ORBIT_API_TOKEN", "local-test-token");
  const fetcher = vi.fn().mockResolvedValue(Response.json(machine));
  vi.stubGlobal("fetch", fetcher);
  await cloudComputers.status(machine.id, "start");
  expect(fetcher.mock.calls[0]?.[0]).toContain("/personal/computers/cloud-race-test/start");
  expect(() => orbitActions.machineStatus(machine.id, "stopped")).toThrow();
  expect(getOrbitState().machines.find((value) => value.id === machine.id)?.status).toBe("running");
});
