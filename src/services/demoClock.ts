/**
 * CareLoop Simulation Demo Clock
 * Allows administrative advancement of simulation time by N days.
 * All SLA calculations, outreach triggers, and audit timestamps reference this clock.
 */

export interface DemoClockState {
  offsetDays: number;
  baseDate: string; // ISO String
  simulatedNow: string;
  realNow: string;
  isAdvanced: boolean;
}

// Global in-memory singleton
let clockState = {
  offsetDays: 0,
  baseDate: '2026-08-15T09:00:00.000Z',
};

/**
 * Returns current simulated ISO timestamp based on base date and offset days.
 */
export function getCurrentDemoTime(): string {
  const baseTime = new Date(clockState.baseDate).getTime();
  const simulatedTime = baseTime + clockState.offsetDays * 86400000;
  return new Date(simulatedTime).toISOString();
}

/**
 * Returns real wall-clock ISO timestamp.
 */
export function getWallClockTime(): string {
  return new Date().toISOString();
}

/**
 * Advances the demo clock by N days (can be positive or negative for rewinding).
 */
export function advanceDemoClock(days: number): DemoClockState {
  clockState.offsetDays += days;
  return getDemoClockState();
}

/**
 * Sets the demo clock offset directly.
 */
export function setDemoClockOffset(days: number): DemoClockState {
  clockState.offsetDays = days;
  return getDemoClockState();
}

/**
 * Resets the demo clock to day 0.
 */
export function resetDemoClock(): DemoClockState {
  clockState.offsetDays = 0;
  return getDemoClockState();
}

/**
 * Returns the current status of the demo clock.
 */
export function getDemoClockState(): DemoClockState & {
  simulatedNow: string;
  realNow: string;
  isAdvanced: boolean;
} {
  return {
    offsetDays: clockState.offsetDays,
    baseDate: clockState.baseDate,
    simulatedNow: getCurrentDemoTime(),
    realNow: getWallClockTime(),
    isAdvanced: clockState.offsetDays > 0,
  };
}
