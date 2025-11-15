import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Booking } from '../entities/booking.entity';

@Injectable()
export class BookingsService {
  constructor(
    @InjectRepository(Booking)
    private bookingRepository: Repository<Booking>,
  ) {}

  async findAll(): Promise<Booking[]> {
    return this.bookingRepository.find({ relations: ['user', 'event'] });
  }

  async findOne(id: number): Promise<Booking | null> {
    return this.bookingRepository.findOne({ where: { id }, relations: ['user', 'event'] });
  }

  async create(booking: Partial<Booking>): Promise<Booking> {
    const newBooking = this.bookingRepository.create(booking);
    return this.bookingRepository.save(newBooking);
  }

  async update(id: number, booking: Partial<Booking>): Promise<Booking | null> {
    await this.bookingRepository.update(id, booking);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.bookingRepository.delete(id);
  }
}
