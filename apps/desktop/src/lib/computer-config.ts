export const cloudComputersEnabled = Boolean(window.orbitConnection) || import.meta.env.VITE_COMPUTER_PROVIDER === "daytona";
export const liveAgentsEnabled = cloudComputersEnabled && import.meta.env.VITE_AGENT_PROVIDER !== "demo";
