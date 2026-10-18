import {
  BadRequestException,
  Controller,
  Headers,
  NotFoundException,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import { memoryStorage } from 'multer';
import { PromoterAccessService } from '../../promoter-team/promoter-access.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { resolveAdminUserId } from './admin-auth';

interface MulterFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');

const BUCKET = 'auction-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

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
      limits: { fileSize: MAX_BYTES, files: 1 },
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

    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File must be JPEG, PNG, or WebP');
    }
    if (file.size > MAX_BYTES) {
      throw new BadRequestException('Image must be under 5 MB');
    }

    const admin = this.supabaseService.getAdminClient();
    const { data: promoter } = await admin
      .from('promoter_accounts')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!promoter) throw new NotFoundException('Promoter account not found');

    // Decode by content, not the client-declared type; re-encoding also strips metadata.
    let processed: Buffer;
    try {
      const image = sharp(file.buffer, { limitInputPixels: 50_000_000 });
      const meta = await image.metadata();
      if (!meta.format || !ALLOWED_FORMATS.includes(meta.format)) {
        throw new Error('unsupported format');
      }
      processed = await image
        .rotate()
        .resize(MAX_DIMENSION, MAX_DIMENSION, {
          fit: 'inside',
          withoutEnlargement: true,
        })
        .webp({ quality: 82 })
        .toBuffer();
    } catch {
      throw new BadRequestException('Could not read that image file');
    }

    const { error: bucketError } = await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
    });
    if (bucketError && !bucketError.message?.includes('already exists')) {
      throw new BadRequestException('Storage is unavailable right now');
    }

    const path = `items/${userId}/${randomUUID()}.webp`;
    const { error: uploadError } = await admin.storage
      .from(BUCKET)
      .upload(path, processed, { contentType: 'image/webp', upsert: false });
    if (uploadError) throw new BadRequestException('Upload failed');

    const {
      data: { publicUrl },
    } = admin.storage.from(BUCKET).getPublicUrl(path);
    return { url: publicUrl };
  }
}
