import {
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { VendorDoorListsService } from './vendor-door-lists.service';

@Controller('vendors/door-lists')
export class VendorDoorListsController {
  constructor(
    private readonly doorLists: VendorDoorListsService,
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

  /** GET /vendors/door-lists/events - events this security vendor is assigned to. */
  @Get('events')
  async list(@Headers('authorization') authorization: string) {
    return this.doorLists.listEvents(await this.getUserId(authorization));
  }

  /** GET /vendors/door-lists/event/:eventId - check-in view of that event's door list. */
  @Get('event/:eventId')
  async get(
    @Headers('authorization') authorization: string,
    @Param('eventId') eventId: string,
  ) {
    return this.doorLists.getDoorList(
      await this.getUserId(authorization),
      eventId,
    );
  }

  @Post('guests/:guestId/arrive')
  async arrive(
    @Headers('authorization') authorization: string,
    @Param('guestId', ParseIntPipe) guestId: number,
  ) {
    return this.doorLists.setArrival(
      await this.getUserId(authorization),
      guestId,
      true,
    );
  }

  @Post('guests/:guestId/unarrive')
  async unarrive(
    @Headers('authorization') authorization: string,
    @Param('guestId', ParseIntPipe) guestId: number,
  ) {
    return this.doorLists.setArrival(
      await this.getUserId(authorization),
      guestId,
      false,
    );
  }
}
