import { Injectable, Logger, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { PKPass } from 'passkit-generator';
import * as jwt from 'jsonwebtoken';
import { SupabaseService } from '../supabase/supabase.service';

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

  async getAppleWalletPass(ticketId: string): Promise<Buffer> {
    const wwdr = process.env.APPLE_WALLET_WWDR_CERT;
    const signerCert = process.env.APPLE_WALLET_SIGNER_CERT;
    const signerKey = process.env.APPLE_WALLET_SIGNER_KEY;
    const passTypeIdentifier = process.env.APPLE_WALLET_PASS_TYPE_ID;
    const teamIdentifier = process.env.APPLE_WALLET_TEAM_ID;

    if (!wwdr || !signerCert || !signerKey || !passTypeIdentifier || !teamIdentifier) {
      throw new ServiceUnavailableException(
        'Apple Wallet is not configured on this server. Contact support.',
      );
    }

    const ticket = await this.fetchTicketData(ticketId);
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
      organizationName: 'Eventecos',
      description: event?.title ?? 'Event Ticket',
      foregroundColor: 'rgb(255, 255, 255)',
      backgroundColor: 'rgb(124, 58, 237)',
      labelColor: 'rgb(220, 200, 255)',
      logoText: 'Eventecos',
      eventTicket: {
        primaryFields: [
          { key: 'event', label: 'EVENT', value: event?.title ?? 'Event Ticket' },
        ],
        secondaryFields: [
          { key: 'date', label: 'DATE', value: formattedDate },
          ...(event?.start_time ? [{ key: 'time', label: 'TIME', value: event.start_time }] : []),
        ],
        auxiliaryFields: [
          { key: 'tier', label: 'TICKET TYPE', value: tier?.name ?? 'General Admission' },
          ...(event?.venue_name ? [{ key: 'venue', label: 'VENUE', value: event.venue_name }] : []),
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
      barcode: {
        message: ticket.id,
        format: 'PKBarcodeFormatQR',
        messageEncoding: 'iso-8859-1',
        altText: ticket.id.substring(0, 8).toUpperCase(),
      },
    };

    // Minimal 1×1 white pixel PNG — replace with branded EventEcos icon assets when available
    const minimalPng = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==',
      'base64',
    );

    const pass = new PKPass(
      {
        'pass.json': Buffer.from(JSON.stringify(passJSON)),
        'icon.png': minimalPng,
        'icon@2x.png': minimalPng,
        'logo.png': minimalPng,
        'logo@2x.png': minimalPng,
      },
      {
        wwdr,
        signerCert,
        signerKey: signerKey.replace(/\\n/g, '\n'),
        signerKeyPassphrase: process.env.APPLE_WALLET_SIGNER_KEY_PASSPHRASE || undefined,
      },
    );

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
              defaultValue: { language: 'en-US', value: event?.title ?? 'Event Ticket' },
            },
            ...(event?.venue_name
              ? {
                  venue: {
                    name: { defaultValue: { language: 'en-US', value: event.venue_name } },
                    address: {
                      defaultValue: {
                        language: 'en-US',
                        value: [event.city, event.state].filter(Boolean).join(', ') || '',
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
              defaultValue: { language: 'en-US', value: tier?.name ?? 'General Admission' },
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
