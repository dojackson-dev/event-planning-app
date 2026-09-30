import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { EventSourcesService } from './event-sources.service';

/**
 * Runs hourly, checks which ACTIVE sources are due for a sync (based on
 * their individual sync_frequency_hours vs last_sync_at), and syncs them
 * one at a time so a single failing source can't take down the others.
 */
@Injectable()
export class ExternalEventsSchedulerService {
  private readonly logger = new Logger(ExternalEventsSchedulerService.name);
  private running = false;

  constructor(private readonly eventSourcesService: EventSourcesService) {}

  @Cron(CronExpression.EVERY_HOUR)
  async handleScheduledSync(): Promise<void> {
    if (this.running) {
      this.logger.warn(
        'Skipping scheduled sync run — previous run still in progress.',
      );
      return;
    }
    this.running = true;
    try {
      const dueSources = await this.eventSourcesService.getDueSources();
      if (!dueSources.length) return;
      this.logger.log(`Syncing ${dueSources.length} due event source(s)...`);
      for (const source of dueSources) {
        try {
          const result = await this.eventSourcesService.syncSource(source.id);
          this.logger.log(
            `Synced "${source.name}": fetched=${result.fetched} upserted=${result.upserted} errors=${result.errors.length}`,
          );
        } catch (err) {
          this.logger.error(
            `Unexpected failure syncing "${source.name}": ${err instanceof Error ? err.message : err}`,
          );
        }
      }
    } finally {
      this.running = false;
    }
  }
}
