import { SelfHealTracker } from './self-heal';

const opts = { failuresBeforeRestart: 3, minUptimeMs: 600_000 };
const OLD = 700_000;

describe('SelfHealTracker', () => {
  it('restarts after the configured number of consecutive failures', () => {
    const t = new SelfHealTracker(opts);
    expect(t.record(false, OLD)).toBe(false);
    expect(t.record(false, OLD)).toBe(false);
    expect(t.record(false, OLD)).toBe(true);
  });

  it('a healthy check resets the count', () => {
    const t = new SelfHealTracker(opts);
    t.record(false, OLD);
    t.record(false, OLD);
    expect(t.record(true, OLD)).toBe(false);
    expect(t.consecutiveFailures).toBe(0);
    expect(t.record(false, OLD)).toBe(false);
    expect(t.record(false, OLD)).toBe(false);
  });

  it('never restarts a young process, so a persistent fault cannot loop', () => {
    const t = new SelfHealTracker(opts);
    for (let i = 0; i < 10; i++) expect(t.record(false, 60_000)).toBe(false);
    expect(t.record(false, OLD)).toBe(true);
  });
});
