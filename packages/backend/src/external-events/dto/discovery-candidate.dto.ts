import { EventSourceType } from '../connectors/connector.types';

export class CreateDiscoveryCandidateDto {
  candidate_url!: string;
  suggested_name?: string;
  city?: string;
  state?: string;
  suggested_source_type?: EventSourceType;
  query?: string;
  notes?: string;
}

export class RunDiscoveryDto {
  queries!: string[];
}
