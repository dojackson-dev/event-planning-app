import {
  Controller,
  Headers,
  NotFoundException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { PromoterAccessService } from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { resolveAdminUserId } from './admin-auth';
import { AUCTION_IMAGE_MAX_BYTES, storeAuctionImage } from './auction-image';
import type { MulterFile } from './auction-image';

@Controller('auctions/manage')
export class AuctionUploadController {
  constructor(
    private readonly supabaseService: SupabaseService,
    private readonly access: PromoterAccessService,
  ) {}

  /** POST /auctions/manage/upload/item-image — multipart field `file`; returns the public WebP URL. */
  @Post('upload/item-image')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: AUCTION_IMAGE_MAX_BYTES, files: 1 },
    }),
  )
  async uploadItemImage(
    @UploadedFile() file: MulterFile | undefined,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await resolveAdminUserId(
      this.supabaseService,
      this.access,
      authorization,
      'write',
    );

    const admin = this.supabaseService.getAdminClient();
    const { data: promoter } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!promoter) throw new NotFoundException('Promoter account not found');

    const url = await storeAuctionImage(
      this.supabaseService,
      file,
      `items/${userId}`,
    );
    return { url };
  }
}
