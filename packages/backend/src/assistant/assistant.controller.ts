import {
  Controller,
  Get,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { AssistantService } from './assistant.service';

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
  async summary(@Headers('authorization') authorization: string) {
    return this.assistantService.getSummary(
      await this.getUserId(authorization),
    );
  }

  /** GET /assistant/narrative — optional AI-written note; { text: null } when unavailable. */
  @Get('narrative')
  async narrative(@Headers('authorization') authorization: string) {
    const text = await this.assistantService.getNarrative(
      await this.getUserId(authorization),
    );
    return { text };
  }
}
