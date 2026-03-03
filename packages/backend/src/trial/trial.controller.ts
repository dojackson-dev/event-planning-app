import { Controller, Get, Post, Body, UseGuards, Logger } from '@nestjs/common';
import { TrialService } from './trial.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentOwner } from '../auth/current-owner.decorator';

@Controller('trial')
export class TrialController {
  private readonly logger = new Logger(TrialController.name);

  constructor(private readonly trialService: TrialService) {}

  /**
   * Get trial info for current owner
   * GET /trial/info
   */
  @Get('info')
  @UseGuards(JwtAuthGuard)
  async getTrialInfo(@CurrentOwner() ownerAccountId: string) {
    const trialInfo = await this.trialService.getTrialInfo(ownerAccountId);
    return trialInfo;
  }

  /**
   * Get default trial days (admin only)
   * GET /trial/settings/default-days
   */
  @Get('settings/default-days')
  @UseGuards(JwtAuthGuard)
  async getDefaultTrialDays() {
    const days = await this.trialService.getDefaultTrialDays();
    return { defaultTrialDays: days };
  }

  /**
   * Set default trial days (admin only)
   * POST /trial/settings/default-days
   */
  @Post('settings/default-days')
  @UseGuards(JwtAuthGuard)
  async setDefaultTrialDays(@Body() body: { days: number }) {
    if (body.days < 1 || body.days > 365) {
      throw new Error('Trial days must be between 1 and 365');
    }
    await this.trialService.setDefaultTrialDays(body.days);
    return { message: `Trial days set to ${body.days}`, defaultTrialDays: body.days };
  }
}
