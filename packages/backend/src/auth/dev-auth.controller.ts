import { Controller, Post, Body, BadRequestException, UnauthorizedException } from '@nestjs/common';
import { promises as fs } from 'fs';
import { join } from 'path';
import * as bcrypt from 'bcrypt';
import { randomUUID } from 'crypto';

const DATA_PATH = join(__dirname, '..', '..', 'data', 'local-users.json');

async function readUsers(): Promise<any[]> {
  try {
    const raw = await fs.readFile(DATA_PATH, 'utf8');
    return JSON.parse(raw || '[]');
  } catch (err: any) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
}

async function writeUsers(users: any[]) {
  const dir = join(__dirname, '..', '..', 'data');
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {}
  await fs.writeFile(DATA_PATH, JSON.stringify(users, null, 2), 'utf8');
}

@Controller('auth')
export class DevAuthController {
  @Post('dev-register')
  async register(@Body() body: { email: string; password: string; firstName?: string; lastName?: string; role?: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email and password are required');
    }

    const users = await readUsers();
    const exists = users.find((u) => u.email === body.email.toLowerCase());
    if (exists) throw new BadRequestException('User already exists');

    const hash = await bcrypt.hash(body.password, 10);
    const id = randomUUID();
    const user = {
      id,
      email: body.email.toLowerCase(),
      passwordHash: hash,
      user_metadata: {
        first_name: body.firstName || '',
        last_name: body.lastName || '',
        role: body.role || 'owner',
      },
      created_at: new Date().toISOString(),
    };
    users.push(user);
    await writeUsers(users);

    return {
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      },
      session: {
        access_token: `local-${id}`,
      },
    };
  }

  @Post('dev-login')
  async login(@Body() body: { email: string; password: string }) {
    if (!body?.email || !body?.password) {
      throw new BadRequestException('email and password are required');
    }

    const users = await readUsers();
    const user = users.find((u) => u.email === body.email.toLowerCase());
    if (!user) throw new UnauthorizedException('Invalid credentials');

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');

    return {
      access_token: `local-${user.id}`,
      user: {
        id: user.id,
        email: user.email,
        user_metadata: user.user_metadata,
        created_at: user.created_at,
      },
    };
  }
}
