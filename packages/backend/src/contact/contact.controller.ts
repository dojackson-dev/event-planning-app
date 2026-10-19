import {
  Controller,
  Post,
  Body,
  Req,
  HttpCode,
  HttpException,
  HttpStatus,
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { MailService } from '../mail/mail.service';

export const DEMO_ROLES: Record<string, string> = {
  venue_owner: 'Venue Owner',
  promoter: 'Promoter',
  artist: 'Artist',
  vendor: 'Vendor',
};

const DEMO_WINDOW_MS = 10 * 60_000;
const DEMO_MAX_PER_WINDOW = 5;

class DemoRequestDto {
  name!: string;
  phone!: string;
  roles?: string[];
  /** Single-role form of `roles`, still accepted. */
  role?: string;
  description?: string;
}

class EnterpriseInquiryDto {
  name!: string;
  email!: string;
  company!: string;
  phone?: string;
  message!: string;
}

@Controller('contact')
export class ContactController {
  private readonly demoHits = new Map<string, number[]>();

  constructor(private readonly mailService: MailService) {}

  /** In-process per-IP limit so the public form cannot be used to flood the sales inbox. */
  private checkDemoRate(ip: string): void {
    const now = Date.now();
    const recent = (this.demoHits.get(ip) ?? []).filter(
      (t) => now - t < DEMO_WINDOW_MS,
    );
    if (recent.length >= DEMO_MAX_PER_WINDOW) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    recent.push(now);
    this.demoHits.set(ip, recent);
    if (this.demoHits.size > 5000) {
      for (const [key, times] of this.demoHits) {
        if (!times.some((t) => now - t < DEMO_WINDOW_MS)) {
          this.demoHits.delete(key);
        }
      }
    }
  }

  @Post('demo-request')
  @HttpCode(HttpStatus.OK)
  async demoRequest(
    @Body() body: DemoRequestDto,
    @Req()
    req: {
      ip?: string;
      headers?: Record<string, string | string[] | undefined>;
    },
  ) {
    const name = typeof body?.name === 'string' ? body.name.trim() : '';
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const description =
      typeof body?.description === 'string' ? body.description.trim() : '';

    if (!name || name.length > 100) {
      throw new BadRequestException('Enter your name (up to 100 characters).');
    }
    const phoneDigits = phone.replace(/\D/g, '');
    if (
      !/^[\d\s()+.-]{7,25}$/.test(phone) ||
      phoneDigits.length < 7 ||
      phoneDigits.length > 15
    ) {
      throw new BadRequestException('Enter a valid phone number.');
    }
    const requested: unknown[] = Array.isArray(body?.roles)
      ? body.roles
      : body?.role !== undefined
        ? [body.role]
        : [];
    const roleKeys = [...new Set(requested)];
    const validRoles = roleKeys.every(
      (key) =>
        typeof key === 'string' &&
        Object.prototype.hasOwnProperty.call(DEMO_ROLES, key),
    );
    if (!roleKeys.length || !validRoles) {
      throw new BadRequestException('Choose at least one role that fits you.');
    }
    const roleLabel = (roleKeys as string[])
      .map((k) => DEMO_ROLES[k])
      .join(', ');
    if (description.length > 2000) {
      throw new BadRequestException(
        'Description must be 2000 characters or fewer.',
      );
    }

    // Behind Render's proxy req.ip is the proxy, so prefer the forwarded client address.
    const forwarded = req?.headers?.['x-forwarded-for'];
    const forwardedIp = (Array.isArray(forwarded) ? forwarded[0] : forwarded)
      ?.split(',')[0]
      ?.trim();
    this.checkDemoRate(forwardedIp || req?.ip || 'unknown');

    const sent = await this.mailService.sendDemoRequest({
      name,
      phone,
      role: roleLabel,
      description: description || undefined,
    });
    if (!sent) {
      throw new ServiceUnavailableException(
        'We could not send your request. Please try again shortly.',
      );
    }
    return { success: true };
  }

  @Post('enterprise')
  @HttpCode(HttpStatus.OK)
  async enterpriseInquiry(@Body() body: EnterpriseInquiryDto) {
    const { name, email, company, message } = body;

    if (
      !name?.trim() ||
      !email?.trim() ||
      !company?.trim() ||
      !message?.trim()
    ) {
      throw new BadRequestException(
        'Name, email, company, and message are required',
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      throw new BadRequestException('Invalid email address');
    }

    await this.mailService.sendEnterpriseInquiry({
      name: name.trim(),
      email: email.trim(),
      company: company.trim(),
      phone: body.phone?.trim(),
      message: message.trim(),
    });

    return { success: true };
  }
}
