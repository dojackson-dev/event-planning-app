import { Controller, Get, Post, Put, Patch, Delete, Body, Param, Query, Headers, UnauthorizedException, UseInterceptors, UploadedFile, BadRequestException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { ContractsService } from './contracts.service';
import { SupabaseService } from '../supabase/supabase.service';

interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

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

  @Post('upload')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async uploadContractFile(
    @UploadedFile() file: MulterFile,
    @Headers('authorization') authorization: string,
  ) {
    await this.getUserId(authorization);

    if (!file) throw new BadRequestException('No file provided');

    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('File must be a PDF or Word document (.pdf, .doc, .docx)');
    }
    if (file.size > 10 * 1024 * 1024) {
      throw new BadRequestException('File must be under 10 MB');
    }

    const admin = this.supabaseService.getAdminClient();

    // Ensure bucket exists
    await admin.storage.createBucket('contracts', { public: false }).catch(() => {/* already exists */});

    const ext = file.originalname.split('.').pop() ?? 'pdf';
    const storagePath = `uploads/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error: uploadError } = await admin.storage
      .from('contracts')
      .upload(storagePath, file.buffer, { contentType: file.mimetype, upsert: false });

    if (uploadError) throw new BadRequestException('File upload failed: ' + uploadError.message);

    // Return a signed URL valid for 10 years (contracts need long-lived access)
    const { data: signedData } = await admin.storage
      .from('contracts')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 365 * 10);

    return {
      path: signedData?.signedUrl ?? storagePath,
      storagePath,
      originalname: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
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
