import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Put,
  UnauthorizedException,
} from '@nestjs/common';
import {
  MessageTemplateInput,
  MessageTemplatesService,
} from './message-templates.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('message-templates')
export class MessageTemplatesController {
  constructor(
    private readonly messageTemplatesService: MessageTemplatesService,
    private readonly supabaseService: SupabaseService,
  ) {}

  /** Templates belong to an owner account; only its active owner may manage them. */
  private async getOwnerAccountId(authorization?: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');

    const admin = this.supabaseService.getAdminClient();
    const { data: membership } = await admin
      .from('memberships')
      .select('owner_account_id')
      .eq('user_id', user.id)
      .eq('role', 'owner')
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    if (!membership?.owner_account_id)
      throw new UnauthorizedException('Owner account not found');
    return membership.owner_account_id;
  }

  @Get()
  async findAll(@Headers('authorization') auth: string) {
    return this.messageTemplatesService.findAll(
      await this.getOwnerAccountId(auth),
    );
  }

  @Get('active')
  async findActive(@Headers('authorization') auth: string) {
    return this.messageTemplatesService.findAll(
      await this.getOwnerAccountId(auth),
      true,
    );
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.messageTemplatesService.findOne(
      await this.getOwnerAccountId(auth),
      id,
    );
  }

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() body: MessageTemplateInput,
  ) {
    return this.messageTemplatesService.create(
      await this.getOwnerAccountId(auth),
      body,
    );
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: MessageTemplateInput,
  ) {
    return this.messageTemplatesService.update(
      await this.getOwnerAccountId(auth),
      id,
      body,
    );
  }

  @Post(':id/toggle')
  async toggle(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.messageTemplatesService.toggleActive(
      await this.getOwnerAccountId(auth),
      id,
    );
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.messageTemplatesService.remove(
      await this.getOwnerAccountId(auth),
      id,
    );
  }
}
