import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query, UseInterceptors, UploadedFile } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { extname } from 'path';
import { ContractsService } from './contracts.service';
import { Contract } from '../entities/contract.entity';

// Type for multer file
interface MulterFile {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
  size: number;
  destination: string;
  filename: string;
  path: string;
  buffer: Buffer;
}

@Controller('contracts')
export class ContractsController {
  constructor(private readonly contractsService: ContractsService) {}

  @Get()
  async findAll(@Query('ownerId') ownerId?: string, @Query('clientId') clientId?: string): Promise<Contract[]> {
    if (ownerId) {
      return this.contractsService.findByOwner(parseInt(ownerId));
    }
    if (clientId) {
      return this.contractsService.findByClient(parseInt(clientId));
    }
    return this.contractsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Contract | null> {
    return this.contractsService.findOne(id);
  }

  @Post()
  async create(@Body() contract: Partial<Contract>): Promise<Contract> {
    return this.contractsService.create(contract);
  }

  @Post('upload')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/contracts',
        filename: (req, file, cb) => {
          const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
          cb(null, `contract-${uniqueSuffix}${extname(file.originalname)}`);
        },
      }),
      limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
    }),
  )
  async uploadFile(@UploadedFile() file: MulterFile) {
    return {
      filename: file.filename,
      originalname: file.originalname,
      size: file.size,
      path: `/uploads/contracts/${file.filename}`,
    };
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() contract: Partial<Contract>,
  ): Promise<Contract | null> {
    return this.contractsService.update(id, contract);
  }

  @Post(':id/sign')
  async signContract(
    @Param('id', ParseIntPipe) id: number,
    @Body() signatureData: { signatureData: string; signerName: string; ipAddress?: string },
  ): Promise<Contract | null> {
    return this.contractsService.signContract(id, signatureData);
  }

  @Post(':id/send')
  async sendContract(@Param('id', ParseIntPipe) id: number): Promise<Contract | null> {
    return this.contractsService.sendContract(id);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.contractsService.delete(id);
  }
}
