import { Controller, Get, Post, Patch, Delete, Body, Param, Headers, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

const DATA_PATH = join(__dirname, '..', '..', 'data', 'local-events.json');

async function readEvents(): Promise<any[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeEvents(events: any[]) {
  const dir = join(__dirname, '..', '..', 'data');
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  await fs.writeFile(DATA_PATH, JSON.stringify(events, null, 2), 'utf8');
}

@Controller('events')
export class DevEventsController {
  private extractToken(authorization?: string): string {
    if (!authorization) {
      throw new UnauthorizedException('No authorization header');
    }
    return authorization.replace('Bearer ', '');
  }

  private getUserId(authorization?: string): string {
    const token = this.extractToken(authorization);
    
    // Handle dev tokens (local-<uuid> format)
    if (token.startsWith('local-')) {
      const userId = token.replace('local-', '');
      if (userId) return userId;
      throw new UnauthorizedException('Invalid dev token format');
    }
    
    throw new UnauthorizedException('Only dev tokens supported in dev mode');
  }

  @Post()
  async create(
    @Headers('authorization') authorization: string,
    @Body() body: any
  ): Promise<any> {
    const userId = this.getUserId(authorization);
    
    if (!body?.name || !body?.date || !body?.startTime || !body?.endTime || !body?.venue) {
      throw new BadRequestException('name, date, startTime, endTime, and venue are required');
    }

    const events = await readEvents();
    const id = parseInt(Math.random().toString().substring(2, 7)); // Simple numeric ID
    const event = {
      id,
      ...body,
      ownerId: userId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    events.push(event);
    await writeEvents(events);

    return event;
  }

  @Get()
  async findAll(@Headers('authorization') authorization: string): Promise<any[]> {
    this.getUserId(authorization);
    const events = await readEvents();
    return events;
  }

  @Get(':id')
  async findOne(
    @Headers('authorization') authorization: string,
    @Param('id') id: string
  ): Promise<any | null> {
    this.getUserId(authorization);
    const events = await readEvents();
    return events.find((e) => e.id === parseInt(id)) || null;
  }

  @Patch(':id')
  async update(
    @Headers('authorization') authorization: string,
    @Param('id') id: string,
    @Body() body: any
  ): Promise<any | null> {
    this.getUserId(authorization);
    const events = await readEvents();
    const index = events.findIndex((e) => e.id === parseInt(id));
    
    if (index === -1) return null;

    const updated = {
      ...events[index],
      ...body,
      updatedAt: new Date().toISOString(),
    };
    events[index] = updated;
    await writeEvents(events);

    return updated;
  }

  @Delete(':id')
  async remove(
    @Headers('authorization') authorization: string,
    @Param('id') id: string
  ): Promise<void> {
    this.getUserId(authorization);
    const events = await readEvents();
    const filtered = events.filter((e) => e.id !== parseInt(id));
    await writeEvents(filtered);
  }
}
