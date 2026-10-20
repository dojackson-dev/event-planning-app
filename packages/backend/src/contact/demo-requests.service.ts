import { Injectable, Logger } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class DemoRequestsService {
  private readonly logger = new Logger(DemoRequestsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  /** Stores the request as a sales lead. Returns false (and logs) on failure so the caller can still email sales. */
  async create(params: {
    name: string;
    phone: string;
    roles: string[];
    description?: string;
  }): Promise<boolean> {
    const { error } = await this.supabase
      .getAdminClient()
      .from('demo_requests')
      .insert({
        name: params.name,
        phone: params.phone,
        roles: params.roles,
        description: params.description ?? null,
      });
    if (error) {
      this.logger.error(`Could not save demo request: ${error.message}`);
      return false;
    }
    return true;
  }
}
