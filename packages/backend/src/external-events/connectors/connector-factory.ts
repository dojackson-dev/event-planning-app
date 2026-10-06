import { Injectable } from '@nestjs/common';
import { EventConnector, EventSourceType } from './connector.types';
import { RestJsonConnector } from './rest-json.connector';
import { RssConnector } from './rss.connector';
import { IcsConnector } from './ics.connector';
import { XmlConnector } from './xml.connector';
import { CsvConnector } from './csv.connector';

@Injectable()
export class ConnectorFactory {
  constructor(
    private readonly restJson: RestJsonConnector,
    private readonly rss: RssConnector,
    private readonly ics: IcsConnector,
    private readonly xml: XmlConnector,
    private readonly csv: CsvConnector,
  ) {}

  getConnector(sourceType: EventSourceType): EventConnector {
    switch (sourceType) {
      case 'rest_json':
        return this.restJson;
      case 'rss':
        return this.rss;
      case 'ics':
        return this.ics;
      case 'xml':
        return this.xml;
      case 'csv':
        return this.csv;
      default:
        throw new Error(`Unsupported source_type: ${sourceType as string}`);
    }
  }
}
