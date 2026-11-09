import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { PKPass } from 'passkit-generator';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';
import { WALLET_ASSETS } from './wallet-assets';

/** PEM values pasted into a hosting dashboard often arrive with literal backslash-n instead of line breaks. */
const pem = (value: string) => value.replace(/\\n/g, '\n');

/** '19:30:00' -> '7:30 PM' */
export function formatPassTime(time: string | null | undefined): string | null {
  const match = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  if (!match) return null;
  const hours = Number(match[1]);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  return `${hours % 12 === 0 ? 12 : hours % 12}:${match[2]} ${suffix}`;
}

@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private async fetchTicketData(ticketId: string) {
    const admin = this.supabase.getAdminClient();
    const { data, error } = await admin
      .from('tickets')
      .select(
        'id, status, ticket_tiers(name, price), public_events(id, title, event_date, start_time, venue_name, city, state)',
      )
      .eq('id', ticketId)
      .maybeSingle();
    if (error || !data) throw new NotFoundException('Ticket not found');
    return data;
  }

  /** Which wallets are set up on this server, so the ticket page only offers buttons that will work. */
  status() {
    return {
      apple: !!(
        process.env.APPLE_WALLET_WWDR_CERT &&
        process.env.APPLE_WALLET_SIGNER_CERT &&
        process.env.APPLE_WALLET_SIGNER_KEY &&
        process.env.APPLE_WALLET_PASS_TYPE_ID &&
        process.env.APPLE_WALLET_TEAM_ID
      ),
      google: !!(
        process.env.GOOGLE_WALLET_ISSUER_ID &&
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL &&
        process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY
      ),
    };
  }

  async getAppleWalletPass(ticketId: string): Promise<Buffer> {
    const wwdr = process.env.APPLE_WALLET_WWDR_CERT;
    const signerCert = process.env.APPLE_WALLET_SIGNER_CERT;
    const signerKey = process.env.APPLE_WALLET_SIGNER_KEY;
    const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_ID;
    const teamIdentifier = process.env.APPLE_WALLET_TEAM_ID;

    if (
      !wwdr ||
      !signerCert ||
      !signerKey ||
      !passTypeIdentifier ||
      !teamIdentifier
    ) {
      throw new ServiceUnavailableException(
        'Apple Wallet is not configured on this server. Contact support.',
      );
    }

    const ticket = await this.fetchTicketData(ticketId);
    if (ticket.status !== 'valid') {
      throw new BadRequestException(
        'This ticket has already been used or is no longer valid.',
      );
    }
    const event = ticket.public_events as any;
    const tier = ticket.ticket_tiers as any;

    const formattedDate = event?.event_date
      ? new Date(event.event_date + 'T12:00:00').toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        })
      : 'TBD';

    const passJSON = {
      formatVersion: 1,
      passTypeIdentifier,
      serialNumber: ticket.id,
      teamIdentifier,
      organizationName: 'EventEcos',
      description: event?.title ?? 'Event Ticket',
      foregroundColor: 'rgb(17, 24, 39)',
      backgroundColor: 'rgb(255, 255, 255)',
      labelColor: 'rgb(43, 52, 148)',
      logoText: 'EventEcos',
      eventTicket: {
        primaryFields: [
          {
            key: 'event',
            label: 'EVENT',
            value: event?.title ?? 'Event Ticket',
          },
        ],
        secondaryFields: [
          { key: 'date', label: 'DATE', value: formattedDate },
          ...(formatPassTime(event?.start_time)
            ? [
                {
                  key: 'time',
                  label: 'TIME',
                  value: formatPassTime(event.start_time),
                },
              ]
            : []),
        ],
        auxiliaryFields: [
          {
            key: 'tier',
            label: 'TICKET TYPE',
            value: tier?.name ?? 'General Admission',
          },
          ...(event?.venue_name
            ? [{ key: 'venue', label: 'VENUE', value: event.venue_name }]
            : []),
        ],
        backFields: [
          { key: 'ticketId', label: 'TICKET ID', value: ticket.id },
          {
            key: 'terms',
            label: 'IMPORTANT',
            value:
              'Each QR code can only be scanned once. Eventecos is not responsible for event cancellations, postponements, or refunds. Contact the event organizer for those matters.',
          },
        ],
      },
    };

    const images = Object.fromEntries(
      Object.entries(WALLET_ASSETS).map(([name, data]) => [
        name,
        Buffer.from(data, 'base64'),
      ]),
    );

    const pass = new PKPass(
      { 'pass.json': Buffer.from(JSON.stringify(passJSON)), ...images },
      {
        wwdr: pem(wwdr),
        signerCert: pem(signerCert),
        signerKey: pem(signerKey),
        signerKeyPassphrase:
          process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE || undefined,
      },
    );

    // The library drops a barcode written into pass.json, so it has to be set on the pass itself.
    // The code is the same ticket id the ticket page shows, which is what the door scanner reads.
    pass.setBarcodes({
      message: ticket.id,
      format: 'PKBarcodeFormatQR',
      messageEncoding: 'iso-8859-1',
      altText: ticket.id.substring(0, 8).toUpperCase(),
    });

    return pass.getAsBuffer();
  }

  async getGoogleWalletUrl(ticketId: string): Promise<string> {
    const issuerId = process.env.GOOGLE_WALLET_ISSUER_ID;
    const serviceAccountEmail = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
    const serviceAccountKey = process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_KEY;

    if (!issuerId || !serviceAccountEmail || !serviceAccountKey) {
      throw new ServiceUnavailableException(
        'Google Wallet is not configured on this server. Contact support.',
      );
    }

    const ticket = await this.fetchTicketData(ticketId);
    const event = ticket.public_events as any;
    const tier = ticket.ticket_tiers as any;

    // Stable class ID per issuer — defines the pass template
    const classId = `${issuerId}.eventecos_event_ticket`;
    const objectId = `${issuerId}.ticket_${ticket.id.replace(/-/g, '_')}`;
    const now = Math.floor(Date.now() / 1000);

    const googlePayload = {
      iss: serviceAccountEmail,
      aud: 'google',
      typ: 'savetowallet',
      iat: now,
      payload: {
        eventTicketClasses: [
          {
            id: classId,
            issuerName: 'Eventecos',
            reviewStatus: 'underReview',
            eventName: {
              defaultValue: {
                language: 'en-US',
                value: event?.title ?? 'Event Ticket',
              },
            },
            ...(event?.venue_name
              ? {
                  venue: {
                    name: {
                      defaultValue: {
                        language: 'en-US',
                        value: event.venue_name,
                      },
                    },
                    address: {
                      defaultValue: {
                        language: 'en-US',
                        value:
                          [event.city, event.state]
                            .filter(Boolean)
                            .join(', ') || '',
                      },
                    },
                  },
                }
              : {}),
            ...(event?.event_date
              ? {
                  dateTime: {
                    start:
                      event.event_date +
                      (event.start_time ? `T${event.start_time}` : 'T00:00:00'),
                  },
                }
              : {}),
          },
        ],
        eventTicketObjects: [
          {
            id: objectId,
            classId,
            state: ticket.status === 'used' ? 'EXPIRED' : 'ACTIVE',
            ticketNumber: ticket.id.substring(0, 8).toUpperCase(),
            ticketType: {
              defaultValue: {
                language: 'en-US',
                value: tier?.name ?? 'General Admission',
              },
            },
            barcode: {
              type: 'QR_CODE',
              value: ticket.id,
              alternateText: ticket.id.substring(0, 8).toUpperCase(),
            },
          },
        ],
      },
    };

    const privateKey = serviceAccountKey.replace(/\\n/g, '\n');
    const token = jwt.sign(googlePayload, privateKey, { algorithm: 'RS256' });
    return `https://pay.google.com/gp/v/save/${token}`;
  }
}
