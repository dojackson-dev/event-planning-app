import {
  Controller,
  Post,
  UseInterceptors,
  UploadedFile,
  Headers,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');
import { SupabaseService } from '../supabase/supabase.service';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_VENDOR_LOGO_BYTES = 2 * 1024 * 1024;   // 2 MB
const MAX_SERVICE_ITEM_BYTES = 5 * 1024 * 1024;  // 5 MB

@Controller('upload')
export class UploadController {
  constructor(private readonly supabaseService: SupabaseService) {}

  // ─────────────────────────────────────────────
  // HELPERS
  // ─────────────────────────────────────────────

  private async getUserId(authorization: string): Promise<string> {
    if (!authorization) throw new UnauthorizedException('No authorization header');
    const token = authorization.replace('Bearer ', '');
    const supabase = this.supabaseService.setAuthContext(token);
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) throw new UnauthorizedException('Invalid token');
    return user.id;
  }

  private async ensureBucket(admin: any, bucket: string): Promise<void> {
    const { error } = await admin.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: MAX_SERVICE_ITEM_BYTES,
    });
    // Ignore "already exists" error
    if (error && !error.message?.includes('already exists')) {
      throw new BadRequestException('Storage bucket error: ' + error.message);
    }
  }

  // ─────────────────────────────────────────────
  // POST /upload/vendor-logo
  // Vendor profile / business logo
  // Recommended: 400×400 px, max 2 MB, JPEG/PNG/WebP
  // ─────────────────────────────────────────────
  @Post('vendor-logo')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadVendorLogo(
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);

    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File must be JPEG, PNG, or WebP');
    }
    if (file.size > MAX_VENDOR_LOGO_BYTES) {
      throw new BadRequestException('Logo must be under 2 MB');
    }

    const admin = this.supabaseService.getAdminClient();
    await this.ensureBucket(admin, 'vendor-images');

    // Resize to 400×400, convert to WebP
    const processed = await sharp(file.buffer)
      .resize(400, 400, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer();

    const path = `logos/${userId}-${Date.now()}.webp`;

    const { error: uploadError } = await admin.storage
      .from('vendor-images')
      .upload(path, processed, { contentType: 'image/webp', upsert: true });

    if (uploadError) throw new BadRequestException('Upload failed: ' + uploadError.message);

    const { data: { publicUrl } } = admin.storage
      .from('vendor-images')
      .getPublicUrl(path);

    return { url: publicUrl };
  }

  // ─────────────────────────────────────────────
  // POST /upload/service-item
  // Owner service item / package image
  // Recommended: 800×600 px (4:3), max 5 MB, JPEG/PNG/WebP
  // ─────────────────────────────────────────────
  @Post('service-item')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadServiceItem(
    @UploadedFile() file: Express.Multer.File,
    @Headers('authorization') authorization: string,
  ) {
    const userId = await this.getUserId(authorization);

    if (!file) throw new BadRequestException('No file provided');
    if (!ALLOWED_TYPES.includes(file.mimetype)) {
      throw new BadRequestException('File must be JPEG, PNG, or WebP');
    }
    if (file.size > MAX_SERVICE_ITEM_BYTES) {
      throw new BadRequestException('Image must be under 5 MB');
    }

    const admin = this.supabaseService.getAdminClient();
    await this.ensureBucket(admin, 'service-item-images');

    // Resize to 800×600 (4:3), convert to WebP
    const processed = await sharp(file.buffer)
      .resize(800, 600, { fit: 'cover', position: 'centre' })
      .webp({ quality: 85 })
      .toBuffer();

    const path = `items/${userId}-${Date.now()}.webp`;

    const { error: uploadError } = await admin.storage
      .from('service-item-images')
      .upload(path, processed, { contentType: 'image/webp', upsert: true });

    if (uploadError) throw new BadRequestException('Upload failed: ' + uploadError.message);

    const { data: { publicUrl } } = admin.storage
      .from('service-item-images')
      .getPublicUrl(path);

    return { url: publicUrl };
  }
}
