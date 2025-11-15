import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Event } from '../entities/event.entity';

@Injectable()
export class EventsService {
  constructor(
    @InjectRepository(Event)
    private eventRepository: Repository<Event>,
  ) {}

  async findAll(): Promise<Event[]> {
    return this.eventRepository.find({ relations: ['owner'] });
  }

  async findOne(id: number): Promise<Event | null> {
    return this.eventRepository.findOne({ where: { id }, relations: ['owner'] });
  }

  async create(event: Partial<Event>): Promise<Event> {
    const newEvent = this.eventRepository.create(event);
    return this.eventRepository.save(newEvent);
  }

  async update(id: number, event: Partial<Event>): Promise<Event | null> {
    await this.eventRepository.update(id, event);
    return this.findOne(id);
  }

  async remove(id: number): Promise<void> {
    await this.eventRepository.delete(id);
  }
}
