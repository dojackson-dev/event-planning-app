import { Controller, Post, Body, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { MailService } from '../mail/mail.service';

class EnterpriseInquiryDto {
  name: string;
  email: string;
  company: string;
  phone?: string;
  message: string;
}

@Controller('contact')
export class ContactController {
  constructor(private readonly mailService: MailService) {}

  @Post('enterprise')
  @HttpCode(HttpStatus.OK)
  async enterpriseInquiry(@Body() body: EnterpriseInquiryDto) {
    const { name, email, company, message } = body;

    if (!name?.trim() || !email?.trim() || !company?.trim() || !message?.trim()) {
      throw new BadRequestException('Name, email, company, and message are required');
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
