import { Injectable, Logger } from '@nestjs/common';
import { Resend } from 'resend';
import { usd } from './auction-payments.helpers';

export type MailResult = 'sent' | 'skipped';

export interface ReceiptItem {
  title: string;
  quantity: number;
  priceCents: number;
  fmvCents: number;
}

export interface ReceiptInput {
  to: string;
  buyerName: string;
  auctionTitle: string;
  eventTitle?: string | null;
  orgName?: string | null;
  orgEin?: string | null;
  items: ReceiptItem[];
  subtotalCents: number;
  platformFeeCents: number;
  processingFeeCents: number;
  taxCents: number;
  totalCents: number;
}

export interface PromoterAlertInput {
  to: string;
  subject: string;
  heading: string;
  lines: string[];
  linkUrl?: string;
  linkLabel?: string;
}

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function formatEin(ein: string | null | undefined): string | null {
  if (!ein) return null;
  return /^\d{9}$/.test(ein) ? `${ein.slice(0, 2)}-${ein.slice(2)}` : ein;
}

/** Deductible part of a purchase: what the buyer paid above the value received, never below zero. */
export function deductibleCents(priceCents: number, fmvCents: number): number {
  return Math.max(priceCents - fmvCents, 0);
}

const p = (html: string) =>
  `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;">${html}</p>`;
const row = (label: string, value: string, bold = false) =>
  `<tr><td style="padding:4px 0;color:#6b7280;">${label}</td><td style="padding:4px 0;text-align:right;font-weight:${bold ? 700 : 600};">${value}</td></tr>`;
const button = (url: string, label: string) =>
  `<div style="text-align:center;margin:24px 0;"><a href="${escapeHtml(url)}" style="display:inline-block;background:#7c3aed;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-size:15px;font-weight:600;">${escapeHtml(label)}</a></div>`;

function layout(title: string, body: string): string {
  return `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px 16px;"><div style="background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);"><div style="background:#7c3aed;color:#fff;padding:20px 32px;font-size:18px;font-weight:700;">${escapeHtml(title)}</div><div style="padding:32px;">${body}</div></div></div>`;
}

/** Auction emails over Resend; every interpolated value is escaped. Throws on send failure so the outbox can retry. */
@Injectable()
export class AuctionMailService {
  private readonly logger = new Logger(AuctionMailService.name);

  private get from(): string {
    return process.env.RESEND_FROM || 'EventEcos <noreply@eventecos.com>';
  }

  protected createClient(): Resend | null {
    const key = process.env.RESEND_API_KEY;
    return key ? new Resend(key) : null;
  }

  private async send(
    to: string,
    subject: string,
    html: string,
    text: string,
  ): Promise<MailResult> {
    const client = this.createClient();
    if (!client) {
      this.logger.warn('RESEND_API_KEY not set — auction email skipped');
      return 'skipped';
    }
    const { error } = await client.emails.send({
      from: this.from,
      to,
      subject,
      html,
      text,
    });
    if (error) throw new Error(`Resend: ${error.message}`);
    return 'sent';
  }

  sendOutbid(input: {
    to: string;
    name: string;
    itemTitle: string;
    priceCents: number;
    itemUrl: string;
  }): Promise<MailResult> {
    const html = layout(
      "You've been outbid",
      p(`Hi ${escapeHtml(input.name)},`) +
        p(
          `Someone placed a higher bid on <strong>${escapeHtml(input.itemTitle)}</strong>. The current bid is <strong>${usd(input.priceCents)}</strong>.`,
        ) +
        button(input.itemUrl, 'Bid again'),
    );
    const text = `You've been outbid on ${input.itemTitle}. Current bid: ${usd(input.priceCents)}. Bid again: ${input.itemUrl}`;
    return this.send(
      input.to,
      `You've been outbid on ${input.itemTitle}`,
      html,
      text,
    );
  }

  sendWon(input: {
    to: string;
    name: string;
    itemTitle: string;
    priceCents: number;
    auctionUrl: string;
  }): Promise<MailResult> {
    const html = layout(
      'You won!',
      p(`Hi ${escapeHtml(input.name)},`) +
        p(
          `Congratulations, you won <strong>${escapeHtml(input.itemTitle)}</strong> with a bid of <strong>${usd(input.priceCents)}</strong>. Once the auction is settled, your saved card is charged and you receive a receipt.`,
        ) +
        button(input.auctionUrl, 'View auction'),
    );
    const text = `You won ${input.itemTitle} with a bid of ${usd(input.priceCents)}. Your saved card is charged once the auction is settled. ${input.auctionUrl}`;
    return this.send(input.to, `You won ${input.itemTitle}`, html, text);
  }

  sendOrderCreated(input: {
    to: string;
    name: string;
    auctionTitle: string;
    subtotalCents: number;
    payByAt: string;
  }): Promise<MailResult> {
    const html = layout(
      'Your auction wins',
      p(`Hi ${escapeHtml(input.name)},`) +
        p(
          `The auction <strong>${escapeHtml(input.auctionTitle)}</strong> has ended. Your winning items total <strong>${usd(input.subtotalCents)}</strong>, plus the service fee and any sales tax. We are charging your saved card now and will email your receipt.`,
        ),
    );
    const text = `${input.auctionTitle} has ended. Your winning items total ${usd(input.subtotalCents)} plus the service fee and any sales tax. We are charging your saved card now.`;
    return this.send(
      input.to,
      `${input.auctionTitle}: your winning items`,
      html,
      text,
    );
  }

  /** Payment failed, or promoter-triggered pay link. */
  sendPayLink(input: {
    to: string;
    name: string;
    auctionTitle: string;
    totalOrSubtotalCents: number;
    payUrl: string;
    payByAt: string;
    willRetry: boolean;
    reason: 'failed' | 'requested';
  }): Promise<MailResult> {
    const deadline = new Date(input.payByAt).toUTCString();
    const lead =
      input.reason === 'failed'
        ? `We could not charge your saved card for <strong>${escapeHtml(input.auctionTitle)}</strong>.`
        : `Your payment for <strong>${escapeHtml(input.auctionTitle)}</strong> is ready.`;
    const retry = input.willRetry
      ? ' We will try your card again automatically, or you can pay now.'
      : '';
    const html = layout(
      input.reason === 'failed' ? 'Payment needed' : 'Complete your payment',
      p(`Hi ${escapeHtml(input.name)},`) +
        p(
          `${lead}${retry} Amount: <strong>${usd(input.totalOrSubtotalCents)}</strong> (before any service fee and tax). Please pay by ${escapeHtml(deadline)}.`,
        ) +
        button(input.payUrl, 'Pay now') +
        p(
          '<span style="color:#6b7280;font-size:13px;">This link is personal to you. Do not share it.</span>',
        ),
    );
    const text = `${input.reason === 'failed' ? 'We could not charge your saved card' : 'Your payment is ready'} for ${input.auctionTitle}.${retry} Pay by ${deadline}: ${input.payUrl}`;
    return this.send(
      input.to,
      `Payment needed for ${input.auctionTitle}`,
      html,
      text,
    );
  }

  sendItemWithdrawn(input: {
    to: string;
    name: string;
    itemTitle: string;
    auctionTitle: string;
  }): Promise<MailResult> {
    const html = layout(
      'Item withdrawn',
      p(`Hi ${escapeHtml(input.name)},`) +
        p(
          `<strong>${escapeHtml(input.itemTitle)}</strong> in <strong>${escapeHtml(input.auctionTitle)}</strong> was withdrawn by the organizer. Your bids on it no longer count and you will not be charged for it.`,
        ),
    );
    const text = `${input.itemTitle} in ${input.auctionTitle} was withdrawn by the organizer. Your bids on it no longer count and you will not be charged for it.`;
    return this.send(input.to, `${input.itemTitle} was withdrawn`, html, text);
  }

  /** Receipt with the per-item value received and deductible amount (same disclaimer style as the sponsorship receipt). */
  sendReceipt(input: ReceiptInput): Promise<MailResult> {
    const { html, text, subject } = this.buildReceipt(input);
    return this.send(input.to, subject, html, text);
  }

  buildReceipt(input: ReceiptInput): {
    subject: string;
    html: string;
    text: string;
  } {
    const org = input.orgName ? escapeHtml(input.orgName) : 'the organization';
    const ein = formatEin(input.orgEin);
    const serviceFee = input.platformFeeCents + input.processingFeeCents;
    const totalDeductible = input.items.reduce(
      (sum, i) => sum + deductibleCents(i.priceCents, i.fmvCents),
      0,
    );
    const totalFmv = input.items.reduce((sum, i) => sum + i.fmvCents, 0);

    const itemRows = input.items
      .map((i) => {
        const label = `${escapeHtml(i.title)}${i.quantity > 1 ? ` &times; ${i.quantity}` : ''}`;
        return `<tr><td style="padding:6px 0;color:#374151;">${label}</td><td style="padding:6px 0;text-align:right;">${usd(i.priceCents)}</td><td style="padding:6px 0;text-align:right;">${usd(i.fmvCents)}</td><td style="padding:6px 0;text-align:right;font-weight:600;">${usd(deductibleCents(i.priceCents, i.fmvCents))}</td></tr>`;
      })
      .join('');

    const html = layout(
      'Thank you for your purchase',
      p(`Hi ${escapeHtml(input.buyerName)},`) +
        p(
          `Thank you for supporting ${org} at <strong>${escapeHtml(input.eventTitle || input.auctionTitle)}</strong>. Your payment was received.`,
        ) +
        `<table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">${row('Items', usd(input.subtotalCents))}${row('Service fee (not deductible)', usd(serviceFee))}${row('Sales tax (not deductible)', usd(input.taxCents))}${row('Total charged', usd(input.totalCents), true)}</table>` +
        `<h3 style="color:#1f2937;font-size:16px;margin:24px 0 8px;">Tax receipt</h3>` +
        p(
          `${org}${ein ? ` (EIN ${escapeHtml(ein)})` : ''} is a tax-exempt organization under section 501(c)(3) of the Internal Revenue Code.`,
        ) +
        `<table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151;"><tr style="color:#6b7280;"><th style="text-align:left;">Item</th><th style="text-align:right;">You paid</th><th style="text-align:right;">Fair market value</th><th style="text-align:right;">Deductible</th></tr>${itemRows}<tr><td style="padding-top:8px;font-weight:700;">Total</td><td style="text-align:right;font-weight:700;">${usd(input.subtotalCents)}</td><td style="text-align:right;font-weight:700;">${usd(totalFmv)}</td><td style="text-align:right;font-weight:700;">${usd(totalDeductible)}</td></tr></table>` +
        `<p style="color:#6b7280;font-size:12px;line-height:1.6;margin:12px 0 0;">The deductible amount for each item is what you paid minus the good-faith estimate of its fair market value. The service fee and sales tax are not deductible. This is not tax advice; please consult your tax advisor.</p>`,
    );

    const textItems = input.items
      .map(
        (i) =>
          `- ${i.title}${i.quantity > 1 ? ` x ${i.quantity}` : ''}: paid ${usd(i.priceCents)}, fair market value ${usd(i.fmvCents)}, deductible ${usd(deductibleCents(i.priceCents, i.fmvCents))}`,
      )
      .join('\n');
    const text = `Thank you for your purchase from ${input.auctionTitle}.\n\nItems: ${usd(input.subtotalCents)}\nService fee (not deductible): ${usd(serviceFee)}\nSales tax (not deductible): ${usd(input.taxCents)}\nTotal charged: ${usd(input.totalCents)}\n\nTax receipt: ${input.orgName ?? 'The organization'}${ein ? ` (EIN ${ein})` : ''} is a 501(c)(3) tax-exempt organization.\n${textItems}\nTotal that may be tax-deductible: ${usd(totalDeductible)}\n(The service fee and sales tax are not deductible. This is not tax advice.)`;

    return {
      subject: `Your receipt for ${input.auctionTitle}`,
      html,
      text,
    };
  }

  sendPromoterAlert(input: PromoterAlertInput): Promise<MailResult> {
    const html = layout(
      input.heading,
      input.lines.map((l) => p(escapeHtml(l))).join('') +
        (input.linkUrl
          ? button(input.linkUrl, input.linkLabel ?? 'Open dashboard')
          : ''),
    );
    const text = `${input.heading}\n\n${input.lines.join('\n')}${input.linkUrl ? `\n\n${input.linkUrl}` : ''}`;
    return this.send(input.to, input.subject, html, text);
  }
}
