import { Injectable } from '@nestjs/common';
import { NormalizedExternalEvent } from './normalizer.service';
import { DedupeStatus } from './dedupe.service';

/**
 * Assigns a 0-1 confidence/quality score based on field completeness, then
 * discounts it if the event was flagged as a possible duplicate. Used to
 * rank/filter events shown on the public events page.
 */
@Injectable()
export class QualityScoreService {
  score(event: NormalizedExternalEvent, dedupeStatus: DedupeStatus): number {
    let score = 0;
    if (event.title) score += 0.2;
    if (event.event_date) score += 0.2;
    if (event.venue_name) score += 0.15;
    if (event.city && event.state) score += 0.15;
    if (event.description) score += 0.1;
    if (event.image_url) score += 0.1;
    if (event.event_url) score += 0.1;

    if (dedupeStatus === 'possible_duplicate') score -= 0.2;
    if (dedupeStatus === 'duplicate') score = 0;

    return Math.max(0, Math.min(1, Number(score.toFixed(3))));
  }
}
