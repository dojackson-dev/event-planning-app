import { Module } from '@nestjs/common';
import { ExternalEventsController } from './external-events.controller';
import { ExternalEventsService } from './external-events.service';
import { EventSourcesService } from './event-sources.service';
import { ExternalEventsSchedulerService } from './external-events-scheduler.service';
import { DiscoveryService } from './discovery.service';
import { NormalizerService } from './normalizer.service';
import { DedupeService } from './dedupe.service';
import { QualityScoreService } from './quality-score.service';
import { ConnectorFactory } from './connectors/connector-factory';
import { RestJsonConnector } from './connectors/rest-json.connector';
import { RssConnector } from './connectors/rss.connector';
import { IcsConnector } from './connectors/ics.connector';
import { XmlConnector } from './connectors/xml.connector';
import { CsvConnector } from './connectors/csv.connector';

@Module({
  controllers: [ExternalEventsController],
  providers: [
    ExternalEventsService,
    EventSourcesService,
    ExternalEventsSchedulerService,
    DiscoveryService,
    NormalizerService,
    DedupeService,
    QualityScoreService,
    ConnectorFactory,
    RestJsonConnector,
    RssConnector,
    IcsConnector,
    XmlConnector,
    CsvConnector,
  ],
  exports: [ExternalEventsService, EventSourcesService],
})
export class ExternalEventsModule {}
