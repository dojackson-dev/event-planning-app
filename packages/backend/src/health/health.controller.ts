import {
  Controller,
  Get,
  Logger,
  OnApplicationBootstrap,
  OnModuleDestroy,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminDbProbe, probeAdminDb } from './admin-db-probe';
import { SelfHealTracker } from './self-heal';

const CACHE_MS = 30_000;
const WATCHDOG_INTERVAL_MS = 60_000;

@Controller('health')
export class HealthController
  implements OnApplicationBootstrap, OnModuleDestroy
{
  private readonly logger = new Logger(HealthController.name);
  private cached: { at: number; result: AdminDbProbe } | null = null;
  private readonly selfHeal = new SelfHealTracker();
  private watchdog: NodeJS.Timeout | null = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Logs the admin connection check at startup so a bad key shows up in the deploy logs. */
  async onApplicationBootstrap(): Promise<void> {
    const result = await this.check();
    if (result.status === 'ok') {
      this.logger.log(
        `Admin database check OK (admin sees ${result.protectedRows.admin} protected rows)`,
      );
    } else {
      this.logger.error(`Admin database check FAILED: ${result.problem}`);
    }
    this.startWatchdog();
  }

  onModuleDestroy(): void {
    if (this.watchdog) clearInterval(this.watchdog);
  }

  /**
   * In production, re-runs the check every minute. After repeated failures the process exits so the host
   * restarts it, which cured the "admin reads come back empty" outages. Set SELF_HEAL_DISABLED=true to turn off.
   */
  private startWatchdog(): void {
    if (
      !(process.env.NODE_ENV === 'production' || process.env.RENDER) ||
      process.env.SELF_HEAL_DISABLED === 'true'
    ) {
      return;
    }
    this.watchdog = setInterval(() => {
      void this.watchdogTick();
    }, WATCHDOG_INTERVAL_MS);
    this.watchdog.unref();
  }

  private async watchdogTick(): Promise<void> {
    const result = await this.runProbe();
    this.cached = { at: Date.now(), result };
    const healthy = result.status === 'ok';
    const restart = this.selfHeal.record(healthy, process.uptime() * 1000);
    if (!healthy) {
      this.logger.warn(
        `Admin database check failed (${this.selfHeal.consecutiveFailures} in a row): ${result.problem}`,
      );
    }
    if (restart) {
      this.logger.error(
        'Admin database check keeps failing; exiting so the host restarts the backend.',
      );
      process.exit(1);
    }
  }

  /**
   * GET /health/db: whether the backend's admin database connection works. Safe to expose: no keys or data.
   * Answers 503 when degraded so uptime monitors alert without any keyword setup.
   */
  @Get('db')
  async db(): Promise<AdminDbProbe> {
    const result = await this.check();
    if (result.status !== 'ok') throw new ServiceUnavailableException(result);
    return result;
  }

  private async check(): Promise<AdminDbProbe> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) {
      return this.cached.result;
    }
    const result = await this.runProbe();
    this.cached = { at: Date.now(), result };
    return result;
  }

  private async runProbe(): Promise<AdminDbProbe> {
    try {
      return await probeAdminDb(
        this.supabaseService.getAdminClient(),
        this.supabaseService.getClient(),
      );
    } catch (err) {
      return {
        status: 'degraded',
        problem: `The database check failed: ${(err as Error).message}`,
        adminApi: 'rejected',
        protectedRows: { admin: null, anon: null },
      };
    }
  }
}
