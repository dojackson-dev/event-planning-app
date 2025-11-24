import { Controller, Get, Post, Put, Delete, Body, Param, ParseIntPipe, Query } from '@nestjs/common';
import { InvoicesService } from './invoices.service';
import { Invoice } from '../entities/invoice.entity';

@Controller('invoices')
export class InvoicesController {
  constructor(private readonly invoicesService: InvoicesService) {}

  @Get()
  async findAll(@Query('ownerId') ownerId?: string): Promise<Invoice[]> {
    if (ownerId) {
      return this.invoicesService.findByOwner(parseInt(ownerId));
    }
    return this.invoicesService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Invoice | null> {
    return this.invoicesService.findOne(id);
  }

  @Post()
  async create(@Body() invoice: Partial<Invoice>): Promise<Invoice> {
    return this.invoicesService.create(invoice);
  }

  @Post('generate/:bookingId')
  async generateFromBooking(@Param('bookingId', ParseIntPipe) bookingId: number): Promise<Invoice> {
    return this.invoicesService.generateFromBooking(bookingId);
  }

  @Put(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() invoice: Partial<Invoice>,
  ): Promise<Invoice | null> {
    return this.invoicesService.update(id, invoice);
  }

  @Post(':id/payment')
  async recordPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body('amount') amount: number,
  ): Promise<Invoice | null> {
    return this.invoicesService.recordPayment(id, amount);
  }

  @Delete(':id')
  async delete(@Param('id', ParseIntPipe) id: number): Promise<void> {
    return this.invoicesService.delete(id);
  }
}
