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
import { VendorCatalogService } from './vendor-catalog.service';
import { SupabaseService } from '../supabase/supabase.service';

@Controller('vendor-catalog')
export class VendorCatalogController {
  constructor(
    private readonly catalog: VendorCatalogService,
    private readonly supabaseService: SupabaseService,
  ) {}

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization)
      throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');

    if (
      token.startsWith('local-') &&
      process.env.ALLOW_LOCAL_DEV_AUTH === 'true'
    )
      return token.replace('local-', '');

    const supabase = this.supabaseService.setAuthContext(token);
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  // ─── Public (clients) ───────────────────────────────────────────────────────

  @Get('public/vendor/:vendorId')
  getPublicByVendor(@Param('vendorId') vendorId: string) {
    return this.catalog.getPublicByVendor(vendorId);
  }

  @Get('public/link/:slug')
  getPublicBySlug(@Param('slug') slug: string) {
    return this.catalog.getPublicBySlug(slug);
  }

  // ─── Vendor ─────────────────────────────────────────────────────────────────

  @Get('mine')
  async list(@Headers('authorization') auth: string) {
    return this.catalog.list(await this.getUserId(auth));
  }

  @Put('settings')
  async settings(
    @Headers('authorization') auth: string,
    @Body() body: { show_to_clients?: unknown },
  ) {
    return this.catalog.setVisibility(
      await this.getUserId(auth),
      body?.show_to_clients,
    );
  }

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalog.create(await this.getUserId(auth), body ?? {});
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() body: Record<string, unknown>,
  ) {
    return this.catalog.update(await this.getUserId(auth), id, body ?? {});
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.catalog.remove(await this.getUserId(auth), id);
  }
}
