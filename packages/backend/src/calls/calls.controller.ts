import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { CallStaffGuard } from './call-staff.guard';
import { CallIdentity, CallsService } from './calls.service';

type StaffRequest = { callStaff: CallIdentity };

@Controller('calls')
@UseGuards(CallStaffGuard)
export class CallsController {
  constructor(private readonly calls: CallsService) {}

  private requireAdmin(req: StaffRequest) {
    if (req.callStaff.kind !== 'admin') {
      throw new ForbiddenException('Admin access required');
    }
  }

  @Get('me')
  me(@Req() req: StaffRequest) {
    return this.calls.profile(req.callStaff);
  }

  @Post('me/mobile')
  requestCode(@Req() req: StaffRequest, @Body() body: { phone?: string }) {
    return this.calls.startMobileVerification(req.callStaff, body?.phone);
  }

  @Post('me/mobile/verify')
  verifyMobile(@Req() req: StaffRequest, @Body() body: { code?: string }) {
    return this.calls.confirmMobile(req.callStaff, body?.code);
  }

  @Post('outbound')
  outbound(
    @Req() req: StaffRequest,
    @Body() body: { source?: string; id?: string },
  ) {
    return this.calls.startOutbound(req.callStaff, body ?? {});
  }

  @Get('history')
  history(@Req() req: StaffRequest, @Query('limit') limit?: string) {
    return this.calls.history(req.callStaff, Number(limit) || 50);
  }

  @Get('voicemails')
  voicemails(@Req() req: StaffRequest) {
    return this.calls.listVoicemails(req.callStaff);
  }

  @Get('voicemails/:id/audio')
  @Header('Content-Type', 'audio/mpeg')
  @Header('Cache-Control', 'private, no-store')
  async voicemailAudio(@Req() req: StaffRequest, @Param('id') id: string) {
    return new StreamableFile(
      await this.calls.voicemailAudio(req.callStaff, id),
    );
  }

  // ── admin only ──

  @Get('admin/staff')
  adminStaff(@Req() req: StaffRequest) {
    this.requireAdmin(req);
    return this.calls.listStaff();
  }

  @Patch('admin/staff/:userId')
  adminUpdateStaff(
    @Req() req: StaffRequest,
    @Param('userId') userId: string,
    @Body() body: { callingEnabled?: boolean; receivesInbound?: boolean },
  ) {
    this.requireAdmin(req);
    return this.calls.updateStaff(userId, body ?? {});
  }

  @Get('admin/settings')
  adminSettings(@Req() req: StaffRequest) {
    this.requireAdmin(req);
    return this.calls.getSettings();
  }

  @Put('admin/settings')
  adminSaveSettings(
    @Req() req: StaffRequest,
    @Body() body: Record<string, any>,
  ) {
    this.requireAdmin(req);
    return this.calls.saveSettings(body ?? {});
  }

  // ── a single call (registered last so it never shadows the routes above) ──

  @Get(':id')
  getCall(@Req() req: StaffRequest, @Param('id') id: string) {
    return this.calls.getCall(req.callStaff, id);
  }

  @Patch(':id')
  saveNotes(
    @Req() req: StaffRequest,
    @Param('id') id: string,
    @Body() body: { outcome?: string | null; notes?: string | null },
  ) {
    return this.calls.saveNotes(req.callStaff, id, body ?? {});
  }
}
