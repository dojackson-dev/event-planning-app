export interface SelfHealOptions {
  /** Consecutive failed checks before the process asks to be restarted. */
  failuresBeforeRestart: number;
  /** A process younger than this never restarts, so a persistent fault cannot cause a restart loop. */
  minUptimeMs: number;
}

export const DEFAULT_SELF_HEAL: SelfHealOptions = {
  failuresBeforeRestart: 3,
  minUptimeMs: 10 * 60_000,
};

/** Decides when repeated failed admin-database checks should end in a restart. Holds no timers or I/O. */
export class SelfHealTracker {
  private failures = 0;

  constructor(private readonly options: SelfHealOptions = DEFAULT_SELF_HEAL) {}

  get consecutiveFailures(): number {
    return this.failures;
  }

  /** Records one check result and returns true when the process should restart. */
  record(healthy: boolean, uptimeMs: number): boolean {
    if (healthy) {
      this.failures = 0;
      return false;
    }
    this.failures += 1;
    return (
      this.failures >= this.options.failuresBeforeRestart &&
      uptimeMs >= this.options.minUptimeMs
    );
  }
}
