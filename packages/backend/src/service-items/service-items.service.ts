import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ServiceItem, ServiceItemCategory } from '../entities/service-item.entity';

@Injectable()
export class ServiceItemsService {
  constructor(
    @InjectRepository(ServiceItem)
    private serviceItemRepository: Repository<ServiceItem>,
  ) {}

  async findAll(): Promise<ServiceItem[]> {
    return this.serviceItemRepository.find({
      where: { isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findByCategory(category: ServiceItemCategory): Promise<ServiceItem[]> {
    return this.serviceItemRepository.find({
      where: { category, isActive: true },
      order: { sortOrder: 'ASC', name: 'ASC' },
    });
  }

  async findOne(id: number): Promise<ServiceItem | null> {
    return this.serviceItemRepository.findOne({ where: { id } });
  }

  async create(item: Partial<ServiceItem>): Promise<ServiceItem> {
    const serviceItem = this.serviceItemRepository.create(item);
    return this.serviceItemRepository.save(serviceItem);
  }

  async update(id: number, item: Partial<ServiceItem>): Promise<ServiceItem | null> {
    await this.serviceItemRepository.update(id, item);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.serviceItemRepository.delete(id);
  }

  async seedDefaultItems(): Promise<void> {
    const count = await this.serviceItemRepository.count();
    if (count > 0) {
      return; // Already seeded
    }

    const defaultItems: Partial<ServiceItem>[] = [
      {
        name: 'Facility Rental',
        description: 'Venue space rental for the duration of the event',
        category: ServiceItemCategory.FACILITY,
        defaultPrice: 2500.00,
        sortOrder: 1,
      },
      {
        name: 'Catering Services',
        description: 'Full catering service including food preparation and serving',
        category: ServiceItemCategory.CATERING,
        defaultPrice: 0.00,
        sortOrder: 2,
      },
      {
        name: 'Tables & Chairs',
        description: 'Event furniture rental - tables, chairs, and linens',
        category: ServiceItemCategory.ITEMS,
        defaultPrice: 0.00,
        sortOrder: 3,
      },
      {
        name: 'Security Services',
        description: 'Professional security personnel for event duration',
        category: ServiceItemCategory.SECURITY,
        defaultPrice: 0.00,
        sortOrder: 4,
      },
      {
        name: 'Bar Service',
        description: 'Bar setup and service including bartender',
        category: ServiceItemCategory.BAR,
        defaultPrice: 0.00,
        sortOrder: 5,
      },
      {
        name: 'Security Deposit',
        description: 'Refundable security deposit for venue protection',
        category: ServiceItemCategory.DEPOSIT,
        defaultPrice: 500.00,
        sortOrder: 6,
      },
      {
        name: 'Sound System',
        description: 'Professional audio system with speakers and microphones',
        category: ServiceItemCategory.SOUND_SYSTEM,
        defaultPrice: 500.00,
        sortOrder: 7,
      },
      {
        name: 'A/V Equipment',
        description: 'Audio/Visual equipment including projector, screens, and lighting',
        category: ServiceItemCategory.AV,
        defaultPrice: 750.00,
        sortOrder: 8,
      },
      {
        name: 'Event Planning',
        description: 'Professional event planning and coordination services',
        category: ServiceItemCategory.PLANNING,
        defaultPrice: 1000.00,
        sortOrder: 9,
      },
      {
        name: 'Decorations',
        description: 'Event decorations including centerpieces, balloons, and themed decor',
        category: ServiceItemCategory.DECORATIONS,
        defaultPrice: 0.00,
        sortOrder: 10,
      },
      {
        name: 'Additional Time',
        description: 'Extended rental time beyond standard package (per hour)',
        category: ServiceItemCategory.ADDITIONAL_TIME,
        defaultPrice: 250.00,
        sortOrder: 11,
      },
      {
        name: 'Sales Tax',
        description: 'Applicable sales tax on taxable items and services',
        category: ServiceItemCategory.SALES_TAX,
        defaultPrice: 0.00,
        sortOrder: 12,
      },
      {
        name: 'Event Hosting',
        description: 'Professional host/MC services for event coordination',
        category: ServiceItemCategory.HOSTING,
        defaultPrice: 500.00,
        sortOrder: 13,
      },
      {
        name: 'Miscellaneous',
        description: 'Miscellaneous services or items',
        category: ServiceItemCategory.MISC,
        defaultPrice: 0.00,
        sortOrder: 14,
      },
    ];

    for (const item of defaultItems) {
      await this.create(item);
    }
  }
}
