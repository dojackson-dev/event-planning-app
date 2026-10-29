import {
  Controller,
  Get,
  Logger,
  OnApplicationBootstrap,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AdminDbProbe, probeAdminDb } from './admin-db-probe';

const CACHE_MS = 30_000;

@Controller('health')
export class HealthController implements OnApplicationBootstrap {
  private readonly logger = new Logger(HealthController.name);
  private cached: { at: number; result: AdminDbProbe } | null = null;

  constructor(private readonly supabaseService: SupabaseService) {}

  /** Logs the admin connection check at startup so a bad key shows up in the deploy logs. */
  async onApplicationBootstrap(): Promise<void> {
    const result = await this.db();
    if (result.status === 'ok') {
      this.logger.log(
        `Admin database check OK (admin sees ${result.protectedRows.admin} protected rows)`,
      );
    } else {
      this.logger.error(`Admin database check FAILED: ${result.problem}`);
    }
  }

  /** GET /health/db: whether the backend's admin database connection works. Safe to expose: no keys or data. */
  @Get('db')
  async db(): Promise<AdminDbProbe> {
    if (this.cached && Date.now() - this.cached.at < CACHE_MS) {
      return this.cached.result;
    }
    let result: AdminDbProbe;
    try {
      result = await probeAdminDb(
        this.supabaseService.getAdminClient(),
        this.supabaseService.getClient(),
      );
    } catch (err) {
      result = {
        status: 'degraded',
        problem: `The database check failed: ${(err as Error).message}`,
        adminApi: 'rejected',
        protectedRows: { admin: null, anon: null },
      };
    }
    this.cached = { at: Date.now(), result };
    return result;
  }
}
