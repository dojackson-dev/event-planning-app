import {
  EventSourceConnectorConfig,
  EventSourceStatus,
  EventSourceType,
} from '../connectors/connector.types';

export class CreateEventSourceDto {
  name!: string;
  city?: string;
  state?: string;
  source_type!: EventSourceType;
  endpoint_url!: string;
  sync_frequency_hours?: number;
  attribution_required?: boolean;
  attribution_text?: string;
  connector_config?: EventSourceConnectorConfig;
  notes?: string;
}

export class UpdateEventSourceDto {
  name?: string;
  city?: string;
  state?: string;
  source_type?: EventSourceType;
  endpoint_url?: string;
  active?: boolean;
  sync_frequency_hours?: number;
  status?: EventSourceStatus;
  terms_status?: string;
  attribution_required?: boolean;
  attribution_text?: string;
  connector_config?: EventSourceConnectorConfig;
  notes?: string;
}
