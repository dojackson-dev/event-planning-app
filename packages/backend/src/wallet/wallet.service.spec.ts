import { execSync } from 'child_process';
import { mkdtempSync, readFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { inflateRawSync } from 'zlib';
import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { formatPassTime, WalletService } from './wallet.service';

const TICKET_ID = '0b8f2c3e-1d4a-4e5b-9c6d-7e8f9a0b1c2d';

function ticketRow(overrides: Record<string, unknown> = {}) {
  return {
    id: TICKET_ID,
    status: 'valid',
    ticket_tiers: { name: 'General Admission', price: 0 },
    public_events: {
      id: 'e1',
      title: 'Folk Festival Happy Hour',
      event_date: '2026-11-13',
      start_time: '19:30:00',
      venue_name: 'The Rookery',
      city: 'Jackson',
      state: 'MS',
    },
    ...overrides,
  };
}

function serviceFor(row: Record<string, unknown> | null) {
  const db = {
    from: () => {
      const q: any = {};
      q.select = () => q;
      q.eq = () => q;
      q.maybeSingle = () => Promise.resolve({ data: row, error: null });
      return q;
    },
  };
  return new WalletService({ getAdminClient: () => db } as any);
}

/** Reads one file out of an (uncompressed or deflated) zip such as a .pkpass. */
function readZipEntry(zip: Buffer, name: string): Buffer | null {
  let offset = 0;
  while (offset + 30 <= zip.length && zip.readUInt32LE(offset) === 0x04034b50) {
    const method = zip.readUInt16LE(offset + 8);
    const compressed = zip.readUInt32LE(offset + 18);
    const nameLength = zip.readUInt16LE(offset + 26);
    const extraLength = zip.readUInt16LE(offset + 28);
    const entryName = zip.toString(
      'utf8',
      offset + 30,
      offset + 30 + nameLength,
    );
    const start = offset + 30 + nameLength + extraLength;
    if (entryName === name) {
      const data = zip.subarray(start, start + compressed);
      return method === 8 ? inflateRawSync(data) : Buffer.from(data);
    }
    offset = start + compressed;
  }
  return null;
}

const APPLE_VARS = [
  'APPLE_WALLET_WWDR_CERT',
  'APPLE_WALLET_SIGNER_CERT',
  'APPLE_WALLET_SIGNER_KEY',
  'APPLE_WALLET_PASS_TYPE_ID',
  'APPLE_WALLET_TEAM_ID',
] as const;

describe('formatPassTime', () => {
  it('shows a friendly 12-hour time', () => {
    expect(formatPassTime('19:30:00')).toBe('7:30 PM');
    expect(formatPassTime('09:05')).toBe('9:05 AM');
    expect(formatPassTime('00:15:00')).toBe('12:15 AM');
    expect(formatPassTime('12:00:00')).toBe('12:00 PM');
    expect(formatPassTime(null)).toBeNull();
    expect(formatPassTime('soon')).toBeNull();
  });
});

describe('WalletService', () => {
  const saved: Record<string, string | undefined> = {};
  beforeEach(() => APPLE_VARS.forEach((k) => (saved[k] = process.env[k])));
  afterEach(() =>
    APPLE_VARS.forEach((k) => {
      if (saved[k] === undefined) delete process.env[k];
      else process.env[k] = saved[k];
    }),
  );

  it('says which wallets are set up', () => {
    APPLE_VARS.forEach((k) => delete process.env[k]);
    expect(serviceFor(null).status().apple).toBe(false);
    APPLE_VARS.forEach((k) => (process.env[k] = 'x'));
    expect(serviceFor(null).status().apple).toBe(true);
    delete process.env.APPLE_WALLET_TEAM_ID;
    expect(serviceFor(null).status().apple).toBe(false);
  });

  it('is unavailable (not a crash) when Apple Wallet is not configured', async () => {
    APPLE_VARS.forEach((k) => delete process.env[k]);
    await expect(
      serviceFor(ticketRow()).getAppleWalletPass(TICKET_ID),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  describe('with a signing certificate', () => {
    let opensslOk = true;
    beforeAll(() => {
      try {
        const dir = mkdtempSync(join(tmpdir(), 'wallet-'));
        execSync(
          `openssl req -x509 -newkey rsa:2048 -nodes -keyout "${dir}/k.pem" -out "${dir}/c.pem" -days 2 -subj "/CN=Pass Type ID: pass.test"`,
          { stdio: 'ignore' },
        );
        process.env.APPLE_WALLET_WWDR_CERT = readFileSync(
          `${dir}/c.pem`,
          'utf8',
        );
        process.env.APPLE_WALLET_SIGNER_CERT = readFileSync(
          `${dir}/c.pem`,
          'utf8',
        );
        process.env.APPLE_WALLET_SIGNER_KEY = readFileSync(
          `${dir}/k.pem`,
          'utf8',
        );
        process.env.APPLE_WALLET_PASS_TYPE_ID = 'pass.test';
        process.env.APPLE_WALLET_TEAM_ID = 'TEAM123456';
      } catch {
        opensslOk = false;
      }
    });

    it('builds a pass whose QR code is the ticket id the door scanner reads', async () => {
      if (!opensslOk) return;
      const buffer =
        await serviceFor(ticketRow()).getAppleWalletPass(TICKET_ID);
      const pass = JSON.parse(readZipEntry(buffer, 'pass.json')!.toString());

      expect(pass).toMatchObject({
        passTypeIdentifier: 'pass.test',
        teamIdentifier: 'TEAM123456',
        serialNumber: TICKET_ID,
        description: 'Folk Festival Happy Hour',
      });
      expect(pass.barcodes).toEqual([
        expect.objectContaining({
          format: 'PKBarcodeFormatQR',
          message: TICKET_ID,
        }),
      ]);
      const secondary = pass.eventTicket.secondaryFields;
      expect(secondary).toContainEqual(
        expect.objectContaining({ key: 'time', value: '7:30 PM' }),
      );
      for (const file of [
        'icon.png',
        'icon@2x.png',
        'logo.png',
        'signature',
        'manifest.json',
      ]) {
        expect(readZipEntry(buffer, file)).not.toBeNull();
      }
    });

    it('does not issue a pass for a ticket that was already scanned', async () => {
      if (!opensslOk) return;
      await expect(
        serviceFor(ticketRow({ status: 'used' })).getAppleWalletPass(TICKET_ID),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('says not found for an unknown ticket', async () => {
      if (!opensslOk) return;
      await expect(
        serviceFor(null).getAppleWalletPass(TICKET_ID),
      ).rejects.toThrow('Ticket not found');
    });
  });
});
