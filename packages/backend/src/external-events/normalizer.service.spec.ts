import { NormalizerService } from './normalizer.service';
import {
  EventSourceRecord,
  RawExternalEvent,
} from './connectors/connector.types';

const source = {
  id: 's1',
  city: 'Jackson',
  state: 'MS',
} as unknown as EventSourceRecord;

const raw = (over: Partial<RawExternalEvent> = {}): RawExternalEvent =>
  ({
    externalId: 'x',
    title: 'Open Mic',
    eventDate: '2026-11-04',
    ...over,
  }) as RawExternalEvent;

describe('NormalizerService undated events', () => {
  const normalizer = new NormalizerService();

  it('keeps a dated event', () => {
    expect(normalizer.normalize(source, raw())?.event_date).toBe('2026-11-04');
  });

  it('drops records with no date, which could never be shown', () => {
    expect(normalizer.normalize(source, raw({ eventDate: null }))).toBeNull();
    expect(
      normalizer.normalize(source, raw({ eventDate: undefined })),
    ).toBeNull();
  });
});
