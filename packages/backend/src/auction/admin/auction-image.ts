import { BadRequestException } from '@nestjs/common';
import { randomUUID } from 'crypto';
import type { SupabaseService } from '../../supabase/supabase.service';

export interface MulterFile {
  mimetype: string;
  size: number;
  buffer: Buffer;
}
// eslint-disable-next-line @typescript-eslint/no-require-imports
const sharp = require('sharp') as typeof import('sharp');

export const AUCTION_IMAGE_BUCKET = 'auction-images';
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_FORMATS = ['jpeg', 'png', 'webp'];
export const AUCTION_IMAGE_MAX_BYTES = 5 * 1024 * 1024;
const MAX_DIMENSION = 1600;

/**
 * Shared by organizer and donor uploads: validates the file, re-encodes it as WebP (stripping metadata),
 * stores it under `folder` in the public auction-images bucket and returns the public URL.
 */
export async function storeAuctionImage(
  supabaseService: SupabaseService,
  file: MulterFile | undefined,
  folder: string,
): Promise<string> {
  if (!file) throw new BadRequestException('No file provided');
  if (!ALLOWED_TYPES.includes(file.mimetype)) {
    throw new BadRequestException('File must be JPEG, PNG, or WebP');
  }
  if (file.size > AUCTION_IMAGE_MAX_BYTES) {
    throw new BadRequestException('Image must be under 5 MB');
  }

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

  const admin = supabaseService.getAdminClient();
  const { error: bucketError } = await admin.storage.createBucket(
    AUCTION_IMAGE_BUCKET,
    { public: true, fileSizeLimit: AUCTION_IMAGE_MAX_BYTES },
  );
  if (bucketError && !bucketError.message?.includes('already exists')) {
    throw new BadRequestException('Storage is unavailable right now');
  }

  const path = `${folder}/${randomUUID()}.webp`;
  const { error: uploadError } = await admin.storage
    .from(AUCTION_IMAGE_BUCKET)
    .upload(path, processed, { contentType: 'image/webp', upsert: false });
  if (uploadError) throw new BadRequestException('Upload failed');

  const {
    data: { publicUrl },
  } = admin.storage.from(AUCTION_IMAGE_BUCKET).getPublicUrl(path);
  return publicUrl;
}
