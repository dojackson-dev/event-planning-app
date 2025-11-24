import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MessageTemplate } from '../entities/message-template.entity';

@Injectable()
export class MessageTemplatesService {
  constructor(
    @InjectRepository(MessageTemplate)
    private templateRepository: Repository<MessageTemplate>,
  ) {}

  async findAll(): Promise<MessageTemplate[]> {
    return this.templateRepository.find({
      order: { messageType: 'ASC', createdAt: 'DESC' },
    });
  }

  async findActive(): Promise<MessageTemplate[]> {
    return this.templateRepository.find({
      where: { isActive: true },
      order: { messageType: 'ASC' },
    });
  }

  async findOne(id: number): Promise<MessageTemplate | null> {
    return this.templateRepository.findOne({ where: { id } });
  }

  async create(templateData: Partial<MessageTemplate>): Promise<MessageTemplate> {
    const template = this.templateRepository.create(templateData);
    return this.templateRepository.save(template);
  }

  async update(id: number, templateData: Partial<MessageTemplate>): Promise<MessageTemplate | null> {
    await this.templateRepository.update(id, templateData);
    return this.findOne(id);
  }

  async delete(id: number): Promise<void> {
    await this.templateRepository.delete(id);
  }

  async toggleActive(id: number): Promise<MessageTemplate | null> {
    const template = await this.findOne(id);
    if (!template) return null;

    template.isActive = !template.isActive;
    return this.templateRepository.save(template);
  }

  async getTemplatesByType(messageType: string): Promise<MessageTemplate[]> {
    return this.templateRepository.find({
      where: { messageType: messageType as any, isActive: true },
    });
  }
}
