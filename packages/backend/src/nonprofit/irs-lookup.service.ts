import { Injectable, Logger } from '@nestjs/common';

export type IrsLookupResult =
  | {
      found: true;
      eligible: boolean;
      reason: string | null;
      name: string;
      city: string | null;
      state: string | null;
      rulingDate: string | null;
      subsectionCode: number | null;
      deductibilityCode: number | null;
      statusCode: number | null;
    }
  | { found: false; reason: string };

interface ProPublicaOrganization {
  name?: string | null;
  city?: string | null;
  state?: string | null;
  ruling_date?: string | null;
  subsection_code?: number | null;
  deductibility_code?: number | null;
  exempt_organization_status_code?: number | null;
}

const API = 'https://projects.propublica.org/nonprofits/api/v2/organizations';

/** Looks an EIN up in IRS exempt-organization data (EO BMF) via ProPublica. */
@Injectable()
export class IrsLookupService {
  private readonly logger = new Logger(IrsLookupService.name);

  async lookup(ein: string): Promise<IrsLookupResult> {
    let res: Response;
    try {
      res = await fetch(`${API}/${ein}.json`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'EventEcos/1.0 (https://www.eventecos.com)',
        },
        signal: AbortSignal.timeout(10_000),
      });
    } catch (err) {
      this.logger.warn(`IRS lookup failed: ${(err as Error).message}`);
      throw new Error('IRS lookup is unavailable right now. Try again later.');
    }

    if (res.status === 404) {
      return { found: false, reason: 'EIN not found in IRS records.' };
    }
    if (!res.ok) {
      this.logger.warn(`IRS lookup returned ${res.status}`);
      throw new Error('IRS lookup is unavailable right now. Try again later.');
    }

    const body = (await res.json()) as {
      organization?: ProPublicaOrganization;
    };
    const org = body.organization;
    // An unknown EIN comes back as a placeholder with no exemption codes.
    if (!org || org.subsection_code == null) {
      return { found: false, reason: 'EIN not found in IRS records.' };
    }

    const subsectionCode = org.subsection_code;
    const statusCode = org.exempt_organization_status_code ?? null;
    let reason: string | null = null;
    if (subsectionCode !== 3) {
      reason = 'Organization is not a 501(c)(3).';
    } else if (statusCode !== 1) {
      reason = 'Organization does not have active tax-exempt status.';
    }

    return {
      found: true,
      eligible: reason === null,
      reason,
      name: org.name ?? '',
      city: org.city ?? null,
      state: org.state ?? null,
      rulingDate: org.ruling_date ?? null,
      subsectionCode,
      deductibilityCode: org.deductibility_code ?? null,
      statusCode,
    };
  }
}
