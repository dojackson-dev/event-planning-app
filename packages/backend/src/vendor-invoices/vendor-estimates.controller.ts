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
import { VendorEstimatesService } from './vendor-estimates.service';
import { SupabaseService } from '../supabase/supabase.service';
import {
  ConvertVendorEstimateDto,
  CreateVendorEstimateDto,
  UpdateVendorEstimateDto,
} from './dto/vendor-estimate.dto';

@Controller('vendor-estimates')
export class VendorEstimatesController {
  constructor(
    private readonly estimates: VendorEstimatesService,
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

  // ─── Public (client) routes: the unguessable link is the credential ─────────

  @Get('public/:token')
  getPublic(@Param('token') token: string) {
    return this.estimates.getPublic(token);
  }

  @Post('public/:token/approve')
  approve(@Param('token') token: string) {
    return this.estimates.respond(token, true);
  }

  @Post('public/:token/decline')
  decline(@Param('token') token: string) {
    return this.estimates.respond(token, false);
  }

  // ─── Vendor routes ──────────────────────────────────────────────────────────

  @Post()
  async create(
    @Headers('authorization') auth: string,
    @Body() dto: CreateVendorEstimateDto,
  ) {
    return this.estimates.create(await this.getUserId(auth), dto);
  }

  @Get('mine')
  async list(@Headers('authorization') auth: string) {
    return this.estimates.list(await this.getUserId(auth));
  }

  @Get(':id')
  async get(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.estimates.get(await this.getUserId(auth), id);
  }

  @Put(':id')
  async update(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: UpdateVendorEstimateDto,
  ) {
    return this.estimates.update(await this.getUserId(auth), id, dto);
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
  ) {
    return this.estimates.remove(await this.getUserId(auth), id);
  }

  @Post(':id/send')
  async send(@Headers('authorization') auth: string, @Param('id') id: string) {
    return this.estimates.send(await this.getUserId(auth), id);
  }

  @Post(':id/convert')
  async convert(
    @Headers('authorization') auth: string,
    @Param('id') id: string,
    @Body() dto: ConvertVendorEstimateDto,
  ) {
    return this.estimates.convertToInvoice(await this.getUserId(auth), id, dto);
  }
}
