import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Security } from '../entities/security.entity';

@Injectable()
export class SecurityService {
  constructor(
    @InjectRepository(Security)
    private securityRepository: Repository<Security>,
  ) {}

  async findAll(): Promise<Security[]> {
    return this.securityRepository.find({
      relations: ['event'],
      order: { createdAt: 'DESC' },
    });
  }

  async findOne(id: number): Promise<Security | null> {
    return this.securityRepository.findOne({
      where: { id },
      relations: ['event'],
    });
  }

  async findByEvent(eventId: number): Promise<Security[]> {
    return this.securityRepository.find({
      where: { eventId },
      relations: ['event'],
      order: { arrivalTime: 'ASC' },
    });
  }

  async create(securityData: Partial<Security>): Promise<Security> {
    const security = this.securityRepository.create(securityData);
    return this.securityRepository.save(security);
  }

  async update(id: number, securityData: Partial<Security>): Promise<Security | null> {
    const security = await this.findOne(id);
    
    if (!security) {
      return null;
    }

    await this.securityRepository.update(id, securityData);
    return this.findOne(id);
  }

  async recordArrival(id: number): Promise<Security | null> {
    const security = await this.findOne(id);
    
    if (!security) {
      return null;
    }

    await this.securityRepository.update(id, {
      arrivalTime: new Date(),
    });

    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.securityRepository.delete(id);
  }
}
