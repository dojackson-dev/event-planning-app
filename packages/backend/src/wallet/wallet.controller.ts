import { Controller, Get, Param, Res, Logger } from '@nestjs/common';
import type { Response } from 'express';
import { WalletService } from './wallet.service';

@Controller('wallet')
export class WalletController {
  private readonly logger = new Logger(WalletController.name);

  constructor(private readonly walletService: WalletService) {}

  /** Generates and downloads an Apple Wallet .pkpass for a ticket (public — no auth) */
  @Get('apple/:ticketId')
  async appleWallet(@Param('ticketId') ticketId: string, @Res() res: Response): Promise<void> {
    try {
      const buffer = await this.walletService.getAppleWalletPass(ticketId);
      res.setHeader('Content-Type', 'application/vnd.apple.pkpass');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="ticket-${ticketId.substring(0, 8)}.pkpass"`,
      );
      res.send(buffer);
    } catch (err: any) {
      this.logger.error(
        `Apple wallet pass generation failed for ticket ${ticketId.substring(0, 8)}: ${err.message}`,
      );
      res.status(err.status ?? 500).json({ message: err.message });
    }
  }

  /** Redirects to the Google Wallet save URL for a ticket (public — no auth) */
  @Get('google/:ticketId')
  async googleWallet(@Param('ticketId') ticketId: string, @Res() res: Response): Promise<void> {
    try {
      const url = await this.walletService.getGoogleWalletUrl(ticketId);
      res.redirect(url);
    } catch (err: any) {
      this.logger.error(
        `Google wallet URL generation failed for ticket ${ticketId.substring(0, 8)}: ${err.message}`,
      );
      res.status(err.status ?? 500).json({ message: err.message });
    }
  }
}
