import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AssistantService, parseRole } from './assistant.service';

@Controller('assistant')
export class AssistantController {
  constructor(
    private readonly assistantService: AssistantService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  /** GET /assistant/summary — outstanding work and upcoming events for the signed-in owner. */
  @Get('summary')
  async summary(
    @Headers('authorization') authorization: string,
    @Query('role') role?: string,
  ) {
    return this.assistantService.getSummary(
      await this.getUserId(authorization),
      parseRole(role),
    );
  }

  /** GET /assistant/narrative — optional AI-written note; { text: null } when unavailable. */
  @Get('narrative')
  async narrative(
    @Headers('authorization') authorization: string,
    @Query('role') role?: string,
  ) {
    const text = await this.assistantService.getNarrative(
      await this.getUserId(authorization),
      parseRole(role),
    );
    return { text };
  }

  /** POST /assistant/ask — answers a question from the owner's own records, with links. */
  @Post('ask')
  async ask(
    @Headers('authorization') authorization: string,
    @Body() body: { question?: unknown; role?: unknown },
  ) {
    return this.assistantService.ask(
      await this.getUserId(authorization),
      parseRole(body?.role),
      body?.question,
    );
  }

  /** POST /assistant/dismiss — snooze until a date, or mark handled; records are never changed. */
  @Post('dismiss')
  async dismiss(
    @Headers('authorization') authorization: string,
    @Body()
    body: { key?: unknown; kind?: unknown; until?: unknown; role?: unknown },
  ) {
    return this.assistantService.dismiss(
      await this.getUserId(authorization),
      parseRole(body?.role),
      body?.key,
      body?.kind,
      body?.until,
    );
  }

  /** DELETE /assistant/dismiss/:key — bring a hidden line back. */
  @Delete('dismiss/:key')
  async restore(
    @Headers('authorization') authorization: string,
    @Param('key') key: string,
    @Query('role') role?: string,
  ) {
    return this.assistantService.restore(
      await this.getUserId(authorization),
      parseRole(role),
      key,
    );
  }

  /** POST /assistant/draft — a reviewable follow-up message; nothing is sent. */
  @Post('draft')
  async draft(
    @Headers('authorization') authorization: string,
    @Body() body: { type?: unknown; id?: unknown },
  ) {
    return this.assistantService.getDraft(
      await this.getUserId(authorization),
      body?.type,
      body?.id,
    );
  }

  @Get('preferences')
  async preferences(@Headers('authorization') authorization: string) {
    return this.assistantService.getPreferences(
      await this.getUserId(authorization),
    );
  }

  @Put('preferences')
  async setPreferences(
    @Headers('authorization') authorization: string,
    @Body() body: { digestEnabled?: unknown },
  ) {
    return this.assistantService.setPreferences(
      await this.getUserId(authorization),
      body?.digestEnabled,
    );
  }
}
