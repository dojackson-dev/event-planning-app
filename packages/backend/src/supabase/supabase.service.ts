import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { createAdminClient } from './admin-client';
import { checkServiceRoleKey, describeServiceKey } from './service-key-check';

@Injectable()
export class SupabaseService {
  private readonly logger = new Logger(SupabaseService.name);
  private supabase!: SupabaseClient;
  private supabaseAdmin!: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');
    const supabaseServiceKey = this.configService.get<string>(
      'SUPABASE_SERVICE_ROLE_KEY',
    );

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error(
        'Missing Supabase configuration. Please check SUPABASE_URL and SUPABASE_ANON_KEY in .env',
      );
    }

    // Refuse to start on a wrong admin key so a bad deploy fails instead of silently returning empty data.
    const keyProblem = checkServiceRoleKey({
      url: supabaseUrl,
      anonKey: supabaseAnonKey,
      serviceKey: supabaseServiceKey,
      production: process.env.NODE_ENV === 'production' || !!process.env.RENDER,
    });
    if (keyProblem) {
      throw new Error(`Invalid Supabase admin configuration: ${keyProblem}`);
    }
    if (supabaseServiceKey) {
      const { role, projectRef } = describeServiceKey(supabaseServiceKey);
      this.logger.log(
        `Supabase admin key verified${role ? ` (${role}` : ''}${projectRef ? `, project ${projectRef}` : ''}${role ? ')' : ''}`,
      );
    }

    // Regular client for user operations (respects RLS)
    this.supabase = createClient(supabaseUrl, supabaseAnonKey, {
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Admin client for bypassing RLS (use carefully!). Pinned to the service key so a signUp/signIn on it
    // can never turn later admin reads into user reads.
    if (supabaseServiceKey) {
      this.supabaseAdmin = createAdminClient(supabaseUrl, supabaseServiceKey);
    }
  }

  getClient(): SupabaseClient {
    return this.supabase;
  }

  getAdminClient(): SupabaseClient {
    if (!this.supabaseAdmin) {
      throw new Error(
        'Supabase admin client not configured. Please set SUPABASE_SERVICE_ROLE_KEY in .env',
      );
    }
    return this.supabaseAdmin;
  }

  // Helper method to set auth context for a specific user
  setAuthContext(accessToken: string) {
    const supabaseUrl = this.configService.get<string>('SUPABASE_URL');
    const supabaseAnonKey = this.configService.get<string>('SUPABASE_ANON_KEY');

    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error('Missing Supabase configuration');
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
      db: {
        schema: 'public',
      },
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }
}
