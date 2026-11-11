export function isSovereignAgentsEnabled(): boolean {
  try {
    return localStorage.getItem("shadowtalk_sovereign_agents") !== "0";
  } catch {
    return true;
  }
}

export function setSovereignAgentsEnabled(enabled: boolean): void {
  try {
    localStorage.setItem("shadowtalk_sovereign_agents", enabled ? "1" : "0");
  } catch {}
}

export function shouldUseLocalAgent(): boolean {
  return isSovereignAgentsEnabled();
}