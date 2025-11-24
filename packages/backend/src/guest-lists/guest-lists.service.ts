import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { GuestList } from '../entities/guest-list.entity';
import { Guest } from '../entities/guest.entity';
import * as crypto from 'crypto';

@Injectable()
export class GuestListsService {
  constructor(
    @InjectRepository(GuestList)
    private guestListRepository: Repository<GuestList>,
    @InjectRepository(Guest)
    private guestRepository: Repository<Guest>,
  ) {}

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateAccessCode(): string {
    // Generate a 6-character alphanumeric code
    const characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Exclude similar characters
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return code;
  }

  async findAll(): Promise<GuestList[]> {
    return this.guestListRepository.find({
      relations: ['client', 'event', 'guests'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByClient(clientId: number): Promise<GuestList[]> {
    return this.guestListRepository.find({
      where: { clientId },
      relations: ['client', 'event', 'guests'],
      order: { createdAt: 'DESC' },
    });
  }

  async findByEvent(eventId: number): Promise<GuestList | null> {
    return this.guestListRepository.findOne({
      where: { eventId },
      relations: ['client', 'event', 'guests'],
    });
  }

  async findOne(id: number): Promise<GuestList | null> {
    return this.guestListRepository.findOne({
      where: { id },
      relations: ['client', 'event', 'guests'],
    });
  }

  async findByShareToken(token: string): Promise<GuestList | null> {
    return this.guestListRepository.findOne({
      where: { shareToken: token },
      relations: ['client', 'event', 'guests'],
    });
  }

  async findByAccessCode(code: string): Promise<GuestList | null> {
    return this.guestListRepository.findOne({
      where: { accessCode: code.toUpperCase() },
      relations: ['client', 'event', 'guests'],
    });
  }

  async findByArrivalToken(token: string): Promise<GuestList | null> {
    return this.guestListRepository.findOne({
      where: { arrivalToken: token },
      relations: ['client', 'event', 'guests'],
    });
  }

  async create(guestListData: Partial<GuestList>): Promise<GuestList> {
    const guestList = this.guestListRepository.create({
      ...guestListData,
      accessCode: this.generateAccessCode(),
      shareToken: this.generateToken(),
      arrivalToken: this.generateToken(),
    });
    return this.guestListRepository.save(guestList);
  }

  async update(id: number, guestListData: Partial<GuestList>): Promise<GuestList | null> {
    const guestList = await this.findOne(id);
    
    if (!guestList) {
      return null;
    }

    await this.guestListRepository.update(id, guestListData);
    return this.findOne(id);
  }

  async lock(id: number): Promise<GuestList | null> {
    return this.update(id, { isLocked: true });
  }

  async unlock(id: number): Promise<GuestList | null> {
    return this.update(id, { isLocked: false });
  }

  async delete(id: number): Promise<void> {
    await this.guestRepository.delete({ guestListId: id });
    await this.guestListRepository.delete(id);
  }

  // Guest management
  async addGuest(guestListId: number, guestData: Partial<Guest>): Promise<Guest> {
    const guest = this.guestRepository.create({
      ...guestData,
      guestListId,
    });
    return this.guestRepository.save(guest);
  }

  async updateGuest(guestId: number, guestData: Partial<Guest>): Promise<Guest | null> {
    const guest = await this.guestRepository.findOne({ where: { id: guestId } });
    
    if (!guest) {
      return null;
    }

    await this.guestRepository.update(guestId, guestData);
    return this.guestRepository.findOne({ where: { id: guestId } });
  }

  async deleteGuest(guestId: number): Promise<void> {
    await this.guestRepository.delete(guestId);
  }

  async markArrival(guestId: number): Promise<Guest | null> {
    const guest = await this.guestRepository.findOne({ where: { id: guestId } });
    
    if (!guest) {
      return null;
    }

    await this.guestRepository.update(guestId, {
      hasArrived: true,
      arrivedAt: new Date(),
    });

    return this.guestRepository.findOne({ where: { id: guestId } });
  }

  async unmarkArrival(guestId: number): Promise<Guest | null> {
    const guest = await this.guestRepository.findOne({ where: { id: guestId } });
    
    if (!guest) {
      return null;
    }

    await this.guestRepository.update(guestId, {
      hasArrived: false,
      arrivedAt: undefined,
    });

    return this.guestRepository.findOne({ where: { id: guestId } });
  }
}
