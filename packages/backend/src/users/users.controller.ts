import { Controller, Get, Param, Headers, UnauthorizedException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { SupabaseService } from '../supabase/supabase.service.js';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getAuth(authHeader: string) {
    if (!authHeader) throw new UnauthorizedException();
    const token = authHeader.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException();
    return { supabase, ownerId: user.id };
  }

  @Get()
  async findAll(@Headers('authorization') authHeader: string) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.usersService.findAll(supabase, ownerId);
  }

  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Headers('authorization') authHeader: string,
  ) {
    const { supabase, ownerId } = await this.getAuth(authHeader);
    return this.usersService.findOne(supabase, ownerId, id);
  }
}
