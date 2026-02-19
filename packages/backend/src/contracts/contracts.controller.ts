import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Headers, UnauthorizedException } from '@nestjs/common';
import { ContractsService } from './contracts.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('contracts')
export class ContractsController {
  constructor(
    private readonly contractsService: ContractsService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private extractToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private async getUserId(authorization?: string): Promise<string> {
    const token = this.extractToken(authorization);

    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }

    const supabaseWithAuth = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabaseWithAuth.auth.getUser();

    if (error || !user) {
      throw new UnauthorizedException('Invalid token');
    }

    return user.id;
  }

  @Get()
  async findAll(
    @Headers('authorization') authorization: string,
    @Query('ownerId') ownerId?: string,
    @Query('clientId') clientId?: string,
  ): Promise<any[]> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);

    if (ownerId) return this.contractsService.findByOwner(supabase, ownerId);
    if (clientId) return this.contractsService.findByClient(supabase, clientId);
    return this.contractsService.findByOwner(supabase, userId);
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.contractsService.findOne(supabase, id);
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() contractData: any,
  ): Promise<any> {
    const userId = await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.contractsService.create(supabase, { ...contractData, owner_id: userId });
  }

  @Put(':id')
  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() contractData: any,
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.contractsService.update(supabase, id, contractData);
  }

  @Post(':id/sign')
  async signContract(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() signatureData: { signatureData: string; signerName: string; ipAddress?: string },
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.contractsService.signContract(supabase, id, signatureData);
  }

  @Post(':id/send')
  async sendContract(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<any | null> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.contractsService.sendContract(supabase, id);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
  ): Promise<void> {
    await this.getUserId(authorization);
    const token = this.extractToken(authorization);
    const supabase = this.supabaseService.setAuthContext(token);
    return this.contractsService.delete(supabase, id);
  }
}
