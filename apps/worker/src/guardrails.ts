/**
 * Kill-switch check — determinístico, fuera del prompt del agente.
 * Se invoca al inicio de cada ciclo del Orchestrator.
 */
export async function isKillSwitchActive(): Promise<boolean> {
  // TODO: consultar DB Guardrails.killSwitchTriggered
  return false;
}
