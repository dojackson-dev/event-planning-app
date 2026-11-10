import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  Res,
  Query,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  Header,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AffiliatesService } from './affiliates.service';
import { LeadsService } from './leads.service';
import { LeadActivitiesService } from './lead-activities.service';
import type { MulterFile } from './lead-activities.service';
import { LeadImportExportService } from './lead-import-export.service';
import { SalesSettingsService } from './sales-settings.service';
import { OutreachService } from './outreach.service';
import { MAX_IMPORT_BYTES } from './lead-csv';
import { AffiliateGuard } from './guards/affiliate.guard';
import {
  RegisterAffiliateDto,
  LoginAffiliateDto,
  UpdateAffiliateDto,
  InviteAffiliateDto,
} from './dto/affiliate.dto';

const ATTACHMENT_FILE_LIMIT = 10 * 1024 * 1024;

@Controller('affiliates')
export class AffiliatesController {
  constructor(
    private readonly affiliatesService: AffiliatesService,
    private readonly leadsService: LeadsService,
    private readonly activitiesService: LeadActivitiesService,
    private readonly importExportService: LeadImportExportService,
    private readonly settingsService: SalesSettingsService,
    private readonly outreachService: OutreachService,
  ) {}

  // ─── Public ──────────────────────────────────────────────────────────────

  /** Validate an invite token before showing the register form */
  @Get('invite/validate')
  async validateInvite(@Query('token') token: string) {
    if (!token) return { valid: false, reason: 'No token provided' };
    return this.affiliatesService.validateInviteToken(token);
  }

  /** Register a new affiliate account (requires a valid invite token) */
  @Post('register')
  async register(@Body() dto: RegisterAffiliateDto) {
    return this.affiliatesService.register(dto);
  }

  /** Login and receive a JWT session */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body() dto: LoginAffiliateDto) {
    return this.affiliatesService.login(dto.email, dto.password);
  }

  // ─── Authenticated ────────────────────────────────────────────────────────

  /** Get own affiliate profile */
  @Get('me')
  @UseGuards(AffiliateGuard)
  async getMe(@Req() req: any) {
    return this.affiliatesService.getMe(req.affiliate.id);
  }

  /** Update own profile */
  @Patch('me')
  @UseGuards(AffiliateGuard)
  async updateMe(@Req() req: any, @Body() dto: UpdateAffiliateDto) {
    return this.affiliatesService.updateMe(req.affiliate.id, dto);
  }

  /** Dashboard stats — total recruits, conversions, earnings */
  @Get('dashboard')
  @UseGuards(AffiliateGuard)
  async getDashboard(@Req() req: any) {
    return this.affiliatesService.getDashboard(req.affiliate.id);
  }

  /** List of all owners recruited */
  @Get('referrals')
  @UseGuards(AffiliateGuard)
  async getReferrals(@Req() req: any) {
    return this.affiliatesService.getReferrals(req.affiliate.id);
  }

  /** Commission history */
  @Get('commissions')
  @UseGuards(AffiliateGuard)
  async getCommissions(@Req() req: any) {
    return this.affiliatesService.getCommissions(req.affiliate.id);
  }

  /** Sales manager: all platform users with subscription status */
  @Get('manager/users')
  @UseGuards(AffiliateGuard)
  async getManagerUsers(
    @Req() req: any,
    @Query('search') search = '',
    @Query('role') role = '',
  ) {
    return this.affiliatesService.getManagerUsers(
      req.affiliate.email,
      search,
      role,
    );
  }

  /** Sales manager: full detail for a single platform user */
  @Get('manager/users/:id')
  @UseGuards(AffiliateGuard)
  async getManagerUserDetail(@Req() req: any, @Param('id') id: string) {
    return this.affiliatesService.getManagerUserDetail(req.affiliate.email, id);
  }

  /** Sales manager: invite a new affiliate by email */
  @Post('manager/invite')
  @UseGuards(AffiliateGuard)
  async inviteAffiliate(@Req() req: any, @Body() dto: InviteAffiliateDto) {
    return this.affiliatesService.inviteAffiliate(
      dto.email,
      req.affiliate.email,
    );
  }

  /** Sales manager: all registered affiliates with stats */
  @Get('manager/affiliates')
  @UseGuards(AffiliateGuard)
  async getManagerAffiliates(@Req() req: any) {
    return this.affiliatesService.getManagerAffiliates(req.affiliate.email);
  }

  // ─── Leads (Book a Demo requests) ────────────────────────────────────────

  /** Unclaimed leads plus the agent's own (the manager sees all). */
  @Get('leads')
  @UseGuards(AffiliateGuard)
  async listLeads(@Req() req: any) {
    return this.leadsService.list(req.affiliate);
  }

  @Post('leads/:id/claim')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async claimLead(@Req() req: any, @Param('id') id: string) {
    return this.leadsService.claim(id, req.affiliate);
  }

  @Post('leads/:id/release')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async releaseLead(@Req() req: any, @Param('id') id: string) {
    return this.leadsService.release(id, req.affiliate);
  }

  /** Update a lead you claimed: status, notes, contact details, follow-up date or custom fields. */
  @Patch('leads/:id')
  @UseGuards(AffiliateGuard)
  async updateLead(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.leadsService.update(id, req.affiliate, body ?? {});
  }

  /** Add a lead by hand. Agents own what they add; the manager can leave it in the pool or assign it. */
  @Post('leads')
  @UseGuards(AffiliateGuard)
  async createLead(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.leadsService.create(req.affiliate, body ?? {});
  }

  /** Check a phone, email or business name against existing leads. */
  @Post('leads/check-duplicates')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async checkLeadDuplicates(
    @Req() req: any,
    @Body() body: Record<string, unknown>,
  ) {
    return this.leadsService.checkDuplicates(req.affiliate, body ?? {});
  }

  /** Download the leads you can see in full as CSV (every lead for the manager). */
  @Get('leads/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @UseGuards(AffiliateGuard)
  async exportLeads(
    @Req() req: any,
    @Res({ passthrough: true })
    res: { setHeader(name: string, value: string): void },
  ) {
    const { filename, csv } = await this.importExportService.exportCsv(
      req.affiliate,
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return csv;
  }

  /** Import leads from a CSV. Send dry_run=true to check the file without saving. */
  @Post('leads/import')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_IMPORT_BYTES + 1024 },
    }),
  )
  async importLeads(
    @Req() req: any,
    @UploadedFile() file: MulterFile,
    @Body() body: { dry_run?: string; assign_to?: string },
  ) {
    return this.importExportService.importCsv(req.affiliate, file, {
      dryRun: body?.dry_run === 'true',
      assignTo: body?.assign_to || undefined,
    });
  }

  /** Manager: active sales agents to assign leads to. */
  @Get('leads/agents')
  @UseGuards(AffiliateGuard)
  async listLeadAgents(@Req() req: any) {
    return this.leadsService.listAgents(req.affiliate);
  }

  /** Manager: assign many leads to one agent, or spread them across all agents. */
  @Post('leads/assign-bulk')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async assignLeads(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.leadsService.assignBulk(req.affiliate, body ?? {});
  }

  @Get('leads/custom-fields')
  @UseGuards(AffiliateGuard)
  async listCustomFields() {
    return this.settingsService.listCustomFields();
  }

  @Post('leads/custom-fields')
  @UseGuards(AffiliateGuard)
  async createCustomField(
    @Req() req: any,
    @Body() body: Record<string, unknown>,
  ) {
    return this.settingsService.createCustomField(req.affiliate, body ?? {});
  }

  @Delete('leads/custom-fields/:id')
  @UseGuards(AffiliateGuard)
  async deleteCustomField(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deleteCustomField(req.affiliate, id);
  }

  /** Manager: hand a lead to an agent, or return it to the pool. */
  @Post('leads/:id/assign')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async assignLead(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: { affiliate_id?: unknown },
  ) {
    return this.leadsService.assign(id, req.affiliate, body ?? {});
  }

  /** Manager: delete a lead with its activity and attachments. */
  @Delete('leads/:id')
  @UseGuards(AffiliateGuard)
  async deleteLead(@Req() req: any, @Param('id') id: string) {
    return this.leadsService.remove(id, req.affiliate);
  }

  @Get('leads/:id/activities')
  @UseGuards(AffiliateGuard)
  async listLeadActivities(@Req() req: any, @Param('id') id: string) {
    return this.activitiesService.list(id, req.affiliate);
  }

  /** Log a call, email, text, meeting or note on a lead. */
  @Post('leads/:id/activities')
  @UseGuards(AffiliateGuard)
  async addLeadActivity(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.activitiesService.add(id, req.affiliate, body ?? {});
  }

  @Get('leads/:id/attachments')
  @UseGuards(AffiliateGuard)
  async listLeadAttachments(@Req() req: any, @Param('id') id: string) {
    return this.activitiesService.listAttachments(id, req.affiliate);
  }

  @Post('leads/:id/attachments')
  @UseGuards(AffiliateGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: ATTACHMENT_FILE_LIMIT + 1024 },
    }),
  )
  async addLeadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @UploadedFile() file: MulterFile,
  ) {
    return this.activitiesService.addAttachment(id, req.affiliate, file);
  }

  /** A short-lived download link for an attachment. */
  @Get('leads/:id/attachments/:attachmentId/url')
  @UseGuards(AffiliateGuard)
  async leadAttachmentUrl(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.activitiesService.attachmentUrl(
      id,
      attachmentId,
      req.affiliate,
    );
  }

  @Delete('leads/:id/attachments/:attachmentId')
  @UseGuards(AffiliateGuard)
  async deleteLeadAttachment(
    @Req() req: any,
    @Param('id') id: string,
    @Param('attachmentId') attachmentId: string,
  ) {
    return this.activitiesService.removeAttachment(
      id,
      attachmentId,
      req.affiliate,
    );
  }

  // ─── Call scripts ────────────────────────────────────────────────────────

  // ─── Outreach (cold email) ───────────────────────────────────────────────

  @Get('outreach/config')
  @UseGuards(AffiliateGuard)
  async outreachConfig(@Req() req: any) {
    return this.outreachService.config(req.affiliate);
  }

  /** The email as it will be sent, for the compose screen. */
  @Post('outreach/preview')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  outreachPreview(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.outreachService.preview(req.affiliate, body ?? {});
  }

  /** Send a copy to yourself. */
  @Post('outreach/test')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async outreachTest(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.outreachService.sendTest(req.affiliate, body ?? {});
  }

  /** Send to leads, platform users (manager only) or typed addresses. */
  @Post('outreach/send')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AffiliateGuard)
  async outreachSend(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.outreachService.send(req.affiliate, body ?? {});
  }

  @Get('outreach/history')
  @UseGuards(AffiliateGuard)
  async outreachHistory(@Req() req: any) {
    return this.outreachService.history(req.affiliate);
  }

  // ─── Call scripts ────────────────────────────────────────────────────────

  @Get('scripts')
  @UseGuards(AffiliateGuard)
  async listScripts(@Req() req: any) {
    return this.settingsService.listScripts(req.affiliate);
  }

  @Post('scripts')
  @UseGuards(AffiliateGuard)
  async createScript(@Req() req: any, @Body() body: Record<string, unknown>) {
    return this.settingsService.createScript(req.affiliate, body ?? {});
  }

  @Patch('scripts/:id')
  @UseGuards(AffiliateGuard)
  async updateScript(
    @Req() req: any,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.settingsService.updateScript(req.affiliate, id, body ?? {});
  }

  @Delete('scripts/:id')
  @UseGuards(AffiliateGuard)
  async deleteScript(@Req() req: any, @Param('id') id: string) {
    return this.settingsService.deleteScript(req.affiliate, id);
  }
}
