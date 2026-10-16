import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { IrsLookupResult, IrsLookupService } from './irs-lookup.service';

export class VerifyNonprofitDto {
  ein!: string;
  legalName?: string;
}

export interface NonprofitStatus {
  isNonprofit: boolean;
  status: 'unverified' | 'verified' | 'rejected';
  ein: string | null;
  legalName: string | null;
  verifiedAt: string | null;
  reason: string | null;
}

@Injectable()
export class NonprofitService {
  private readonly logger = new Logger(NonprofitService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly irs: IrsLookupService,
  ) {}

  private normalizeEin(raw: string | undefined): string {
    const digits = (raw ?? '').replace(/\D/g, '');
    if (digits.length !== 9) {
      throw new BadRequestException('EIN must be 9 digits (e.g. 12-3456789).');
    }
    return digits;
  }

  private async getPromoter(userId: string) {
    const { data } = await this.supabase
      .getAdminClient()
      .from('promoter_accounts')
      .select(
        'id, is_nonprofit, nonprofit_ein, nonprofit_legal_name, nonprofit_status, nonprofit_verified_at, nonprofit_check',
      )
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) throw new NotFoundException('Promoter account not found');
    return data as {
      id: string;
      is_nonprofit: boolean;
      nonprofit_ein: string | null;
      nonprofit_legal_name: string | null;
      nonprofit_status: NonprofitStatus['status'];
      nonprofit_verified_at: string | null;
      nonprofit_check: { reason?: string | null } | null;
    };
  }

  async getStatus(userId: string): Promise<NonprofitStatus> {
    const p = await this.getPromoter(userId);
    return {
      isNonprofit: p.is_nonprofit,
      status: p.nonprofit_status,
      ein: p.nonprofit_ein,
      legalName: p.nonprofit_legal_name,
      verifiedAt: p.nonprofit_verified_at,
      reason: p.nonprofit_check?.reason ?? null,
    };
  }

  /** Checks the EIN against IRS data and records the result on the promoter. */
  async verify(
    userId: string,
    dto: VerifyNonprofitDto,
  ): Promise<NonprofitStatus> {
    const ein = this.normalizeEin(dto?.ein);
    const promoter = await this.getPromoter(userId);
    const admin = this.supabase.getAdminClient();

    const { data: taken } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('nonprofit_ein', ein)
      .eq('nonprofit_status', 'verified')
      .neq('id', promoter.id)
      .maybeSingle();
    if (taken) {
      throw new ConflictException(
        'This EIN is already verified on another account. Contact support if this is your organization.',
      );
    }

    let result: IrsLookupResult;
    try {
      result = await this.irs.lookup(ein);
    } catch (err) {
      throw new ServiceUnavailableException((err as Error).message);
    }

    const verified = result.found && result.eligible;
    const legalName =
      dto.legalName?.trim() || (result.found ? result.name : null) || null;

    const { error } = await admin
      .from('promoter_accounts')
      .update({
        is_nonprofit: true,
        nonprofit_ein: ein,
        nonprofit_legal_name: legalName,
        nonprofit_status: verified ? 'verified' : 'rejected',
        nonprofit_verified_at: verified ? new Date().toISOString() : null,
        nonprofit_check: {
          ...result,
          checkedAt: new Date().toISOString(),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', promoter.id);
    if (error) throw new BadRequestException(error.message);

    this.logger.log(
      `Non-profit check for promoter ${promoter.id}: ${verified ? 'verified' : 'rejected'}`,
    );
    return this.getStatus(userId);
  }

  /** Sponsorship tools are only available to IRS-verified non-profits. */
  async assertVerified(userId: string): Promise<string> {
    const p = await this.getPromoter(userId);
    if (!p.is_nonprofit || p.nonprofit_status !== 'verified') {
      throw new BadRequestException(
        'Verify your non-profit status before using sponsorship tools.',
      );
    }
    return p.id;
  }
}
