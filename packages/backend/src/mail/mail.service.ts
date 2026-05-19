import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Resend } from 'resend';
import * as QRCode from 'qrcode';
import { Contract } from '../entities/contract.entity';
import { User } from '../entities/user.entity';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor(private readonly supabaseService: SupabaseService) {
    // Configure email transporter
    // In development, you can use a service like Ethereal Email for testing
    // In production, use a real SMTP service (Gmail, SendGrid, AWS SES, etc.)
    const port = parseInt(process.env.SMTP_PORT || '587');
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port,
      secure: port === 465, // true for SSL (465), false for STARTTLS (587)
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  /**
   * Generate a consistent email header with EventEcos logo and branding
   */
  private getEmailHeader(title: string, subtitle: string = ''): string {
    const frontendUrl = process.env.FRONTEND_URL || 'https://eventecos.com';
    const logoUrl = `${frontendUrl}/lib/EventEcos-Logo-Only.jpg`;
    
    return `
      <div style="background: linear-gradient(135deg, #00BFA5 0%, #26C485 50%, #1E3A7F 100%); padding: 32px 32px 24px; text-align: center;">
        <img src="${logoUrl}" alt="EventEcos" style="max-width: 80px; height: auto; margin-bottom: 16px; display: inline-block;" />
        <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">${title}</h1>
        ${subtitle ? `<p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">${subtitle}</p>` : ''}
      </div>
    `;
  }

  async sendContractNotification(contract: Contract, client: User, owner: User): Promise<void> {
    try {
      const contractUrl = `${process.env.FRONTEND_URL || 'https://dovenuesuite.com'}/dashboard/contracts/${contract.id}`;
      
      const mailOptions = {
        from: `"${owner.firstName} ${owner.lastName}" <${process.env.SMTP_FROM || 'noreply@dovenue.com'}>`,
        to: client.email,
        subject: `New Contract Ready for Signature - ${contract.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Contract Ready for Your Signature</h2>
            
            <p>Hello ${client.firstName},</p>
            
            <p>${owner.firstName} ${owner.lastName} has sent you a contract to review and sign.</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #555;">Contract Details</h3>
              <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
              <p><strong>Title:</strong> ${contract.title}</p>
              ${contract.description ? `<p><strong>Description:</strong> ${contract.description}</p>` : ''}
              <p><strong>Created:</strong> ${new Date(contract.createdAt).toLocaleDateString()}</p>
            </div>
            
            ${contract.booking?.event ? `
              <div style="background-color: #e8f4f8; padding: 20px; margin: 20px 0; border-radius: 8px;">
                <h3 style="margin-top: 0; color: #555;">Event Information</h3>
                <p><strong>Event:</strong> ${contract.booking.event.name}</p>
                ${contract.booking.event.date ? `<p><strong>Date:</strong> ${new Date(contract.booking.event.date).toLocaleDateString()}</p>` : ''}
                ${contract.booking.event.startTime && contract.booking.event.endTime ? `<p><strong>Time:</strong> ${contract.booking.event.startTime} - ${contract.booking.event.endTime}</p>` : ''}
                ${contract.booking.event.venue ? `<p><strong>Venue:</strong> ${contract.booking.event.venue}</p>` : ''}
              </div>
            ` : ''}
            
            <p>Please review the contract and provide your electronic signature to proceed.</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractUrl}" 
                 style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View & Sign Contract
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If you have any questions about this contract, please contact ${owner.firstName} ${owner.lastName}.
            </p>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from DoVenueSuite. Please do not reply to this email.
            </p>
          </div>
        `,
        text: `
          Contract Ready for Your Signature
          
          Hello ${client.firstName},
          
          ${owner.firstName} ${owner.lastName} has sent you a contract to review and sign.
          
          Contract Details:
          - Contract Number: ${contract.contractNumber}
          - Title: ${contract.title}
          ${contract.description ? `- Description: ${contract.description}` : ''}
          - Created: ${new Date(contract.createdAt).toLocaleDateString()}
          
          ${contract.booking?.event ? `
          Event Information:
          - Event: ${contract.booking.event.name}
          ${contract.booking.event.date ? `- Date: ${new Date(contract.booking.event.date).toLocaleDateString()}` : ''}
          ${contract.booking.event.startTime && contract.booking.event.endTime ? `- Time: ${contract.booking.event.startTime} - ${contract.booking.event.endTime}` : ''}
          ${contract.booking.event.venue ? `- Venue: ${contract.booking.event.venue}` : ''}
          ` : ''}
          
          Please review the contract and provide your electronic signature to proceed.
          
          View and sign the contract here: ${contractUrl}
          
          If you have any questions about this contract, please contact ${owner.firstName} ${owner.lastName}.
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Contract notification sent:', info.messageId);
      
      // In development with Ethereal Email, log the preview URL
      if (process.env.NODE_ENV !== 'production' && process.env.SMTP_HOST?.includes('ethereal')) {
        console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('Failed to send contract notification email:', error);
      // Don't throw error - sending email failure shouldn't break the contract sending process
    }
  }

  /**
   * Send a client intake-form invitation email.
   * The link directs the client to the invite page where they confirm their event via SMS OTP.
   */
  async sendClientInvitation(params: {
    clientName: string;
    clientEmail: string;
    inviteToken: string;
    eventType: string;
    eventDate: string;
    eventTime?: string | null;
    guestCount?: number | null;
    ownerName?: string;
  }): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
      const inviteUrl = `${frontendUrl}/invite?token=${params.inviteToken}`;
      const formattedDate = params.eventDate
        ? new Date(params.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : 'TBD';

      const mailOptions = {
        from: `"DoVenue Suites" <${process.env.SMTP_FROM || 'noreply@dovenue.com'}>`,
        to: params.clientEmail,
        subject: `You're Invited – Confirm Your Event at DoVenue Suites`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              ${this.getEmailHeader('EventEcos', 'Client Portal Invitation')}

              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hello <strong>${params.clientName}</strong>,</p>
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">
                  ${params.ownerName ? `<strong>${params.ownerName}</strong> has` : 'Your event planner has'} submitted your event details and is requesting your confirmation.
                  Please review the information below and confirm your event.
                </p>

                <div style="background: #f0f4ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                  <h3 style="margin: 0 0 12px; color: #1e3a5f; font-size: 16px;">Event Details</h3>
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr><td style="padding: 4px 0; color: #6b7280; width: 110px;">Event Type</td><td style="padding: 4px 0; font-weight: 600;">${params.eventType}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Date</td><td style="padding: 4px 0; font-weight: 600;">${formattedDate}</td></tr>
                    ${params.eventTime ? `<tr><td style="padding: 4px 0; color: #6b7280;">Time</td><td style="padding: 4px 0; font-weight: 600;">${params.eventTime}</td></tr>` : ''}
                    ${params.guestCount ? `<tr><td style="padding: 4px 0; color: #6b7280;">Guests</td><td style="padding: 4px 0; font-weight: 600;">${params.guestCount}</td></tr>` : ''}
                  </table>
                </div>

                <p style="color: #374151; font-size: 14px; line-height: 1.6;">
                  Click the button below to confirm your event. You will be asked to verify your identity via a text message sent to your phone number on file.
                </p>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${inviteUrl}"
                     style="display: inline-block; background: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">
                    Confirm My Event
                  </a>
                </div>

                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                  If you did not expect this email, please disregard it. This link is unique to you.
                </p>
              </div>
            </div>
          </div>
        `,
        text: `Hello ${params.clientName},\n\nYou have been invited to confirm your event at DoVenue Suites.\n\nEvent: ${params.eventType}\nDate: ${formattedDate}${params.eventTime ? `\nTime: ${params.eventTime}` : ''}\n\nConfirm here: ${inviteUrl}\n\nDoVenue Suites`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Client invitation sent:', info.messageId);

      if (process.env.NODE_ENV !== 'production' && process.env.SMTP_HOST?.includes('ethereal')) {
        const nodemailer = await import('nodemailer');
        console.log('[DEV] Invite email preview URL:', nodemailer.getTestMessageUrl(info));
      }
    } catch (error) {
      console.error('Failed to send client invitation email:', error);
      // Non-fatal — don't break the intake form submission
    }
  }

  async sendInvoiceCreated(params: {
    clientName: string;
    clientEmail: string;
    invoiceNumber: string;
    totalAmount: number;
    dueDate: string;
    invoiceUrl: string;
  }): Promise<void> {
    try {
      const formattedAmount = `$${Number(params.totalAmount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
      const formattedDue = new Date(params.dueDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

      const mailOptions = {
        from: `"DoVenue Suites" <${process.env.SMTP_FROM || 'noreply@dovenue.com'}>`,
        to: params.clientEmail,
        subject: `Invoice ${params.invoiceNumber} is Ready – View & Pay Online`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              ${this.getEmailHeader('EventEcos', 'Invoice Ready')}
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 16px; margin-bottom: 8px;">Hi <strong>${params.clientName}</strong>,</p>
                <p style="color: #374151; font-size: 15px; line-height: 1.6;">Your invoice is ready. Please review the details below and make your payment at your earliest convenience.</p>

                <div style="background: #f0f4ff; border-left: 4px solid #2563eb; border-radius: 8px; padding: 20px 24px; margin: 24px 0;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr><td style="padding: 6px 0; color: #6b7280; width: 130px;">Invoice #</td><td style="padding: 6px 0; font-weight: 600;">${params.invoiceNumber}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Amount Due</td><td style="padding: 6px 0; font-weight: 700; font-size: 18px; color: #2563eb;">${formattedAmount}</td></tr>
                    <tr><td style="padding: 6px 0; color: #6b7280;">Due Date</td><td style="padding: 6px 0; font-weight: 600;">${formattedDue}</td></tr>
                  </table>
                </div>

                <div style="text-align: center; margin: 32px 0;">
                  <a href="${params.invoiceUrl}"
                     style="display: inline-block; background: #2563eb; color: white; padding: 14px 40px; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; letter-spacing: 0.3px;">
                    View &amp; Pay Invoice
                  </a>
                </div>

                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">If you did not expect this invoice, please contact us directly.</p>
              </div>
            </div>
          </div>
        `,
        text: `Hi ${params.clientName},\n\nYour invoice ${params.invoiceNumber} for ${formattedAmount} is ready.\nDue: ${formattedDue}\n\nView and pay here: ${params.invoiceUrl}\n\nDoVenue Suites`,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Invoice created notification sent:', info.messageId);
    } catch (error) {
      console.error('Failed to send invoice created email:', error);
      // Non-fatal
    }
  }

  async sendContractSignedNotification(contract: Contract, client: User, owner: User): Promise<void> {
    try {
      const contractUrl = `${process.env.FRONTEND_URL || 'https://dovenuesuite.com'}/dashboard/contracts/${contract.id}`;
      
      const mailOptions = {
        from: `"DoVenueSuite" <${process.env.SMTP_FROM || 'noreply@dovenue.com'}>`,
        to: owner.email,
        subject: `Contract Signed - ${contract.title}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">Contract Has Been Signed</h2>
            
            <p>Hello ${owner.firstName},</p>
            
            <p>${client.firstName} ${client.lastName} has signed the contract "${contract.title}".</p>
            
            <div style="background-color: #f5f5f5; padding: 20px; margin: 20px 0; border-radius: 8px;">
              <h3 style="margin-top: 0; color: #555;">Contract Details</h3>
              <p><strong>Contract Number:</strong> ${contract.contractNumber}</p>
              <p><strong>Title:</strong> ${contract.title}</p>
              <p><strong>Client:</strong> ${client.firstName} ${client.lastName}</p>
              <p><strong>Signed Date:</strong> ${new Date(contract.signedDate || new Date()).toLocaleString()}</p>
              ${contract.signerName ? `<p><strong>Signed By:</strong> ${contract.signerName}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${contractUrl}" 
                 style="background-color: #2196F3; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
                View Contract
              </a>
            </div>
            
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            
            <p style="color: #999; font-size: 12px; text-align: center;">
              This is an automated email from DoVenueSuite. Please do not reply to this email.
            </p>
          </div>
        `,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('Contract signed notification sent:', info.messageId);
    } catch (error) {
      console.error('Failed to send contract signed notification email:', error);
    }
  }

  /**
   * Send a contract-ready-for-signature email using Resend.
   * Called whenever an owner marks a contract as "sent" to the client.
   */
  async sendContractWithResend(params: {
    clientName: string;
    clientEmail: string;
    ownerName: string;
    contractNumber: string;
    contractTitle: string;
    contractDescription?: string;
    contractUrl: string;
    eventName?: string;
    eventDate?: string;
    eventVenue?: string;
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[MailService] RESEND_API_KEY not set — skipping Resend contract email');
      return;
    }
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const formattedDate = params.eventDate
        ? new Date(params.eventDate + 'T12:00:00').toLocaleDateString('en-US', {
            weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
          })
        : null;

      const eventBlock = (params.eventName || formattedDate || params.eventVenue)
        ? `
          <div style="background:#e8f4f8;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:20px 0;">
            <h3 style="margin:0 0 12px;color:#1e3a5f;font-size:15px;">Event Information</h3>
            <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
              ${params.eventName ? `<tr><td style="padding:4px 0;color:#6b7280;width:80px;">Event</td><td style="padding:4px 0;font-weight:600;">${params.eventName}</td></tr>` : ''}
              ${formattedDate ? `<tr><td style="padding:4px 0;color:#6b7280;">Date</td><td style="padding:4px 0;font-weight:600;">${formattedDate}</td></tr>` : ''}
              ${params.eventVenue ? `<tr><td style="padding:4px 0;color:#6b7280;">Venue</td><td style="padding:4px 0;font-weight:600;">${params.eventVenue}</td></tr>` : ''}
            </table>
          </div>`
        : '';

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;background:#f9fafb;padding:32px 16px;">
          <div style="background:white;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
            ${this.getEmailHeader('EventEcos', 'Contract Ready for Your Signature')}
            <div style="padding:32px;">
              <p style="color:#374151;font-size:16px;margin:0 0 8px;">Hello <strong>${params.clientName}</strong>,</p>
              <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 20px;">
                <strong>${params.ownerName}</strong> has sent you a contract to review and sign.
              </p>
              <div style="background:#f0f4ff;border-left:4px solid #2563eb;border-radius:8px;padding:20px 24px;margin:0 0 20px;">
                <h3 style="margin:0 0 12px;color:#1e3a5f;font-size:15px;">Contract Details</h3>
                <table style="width:100%;border-collapse:collapse;font-size:14px;color:#374151;">
                  <tr><td style="padding:4px 0;color:#6b7280;width:140px;">Contract Number</td><td style="padding:4px 0;font-weight:600;">${params.contractNumber}</td></tr>
                  <tr><td style="padding:4px 0;color:#6b7280;">Title</td><td style="padding:4px 0;font-weight:600;">${params.contractTitle}</td></tr>
                  ${params.contractDescription ? `<tr><td style="padding:4px 0;color:#6b7280;">Description</td><td style="padding:4px 0;">${params.contractDescription}</td></tr>` : ''}
                </table>
              </div>
              ${eventBlock}
              <p style="color:#374151;font-size:14px;line-height:1.6;">
                Please review the contract carefully and provide your electronic signature to proceed.
              </p>
              <div style="text-align:center;margin:28px 0;">
                <a href="${params.contractUrl}"
                   style="display:inline-block;background:#2563eb;color:white;padding:14px 40px;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px;">
                  View &amp; Sign Contract
                </a>
              </div>
              <p style="color:#6b7280;font-size:13px;">
                If you have any questions, please contact ${params.ownerName}.
              </p>
              <hr style="border:none;border-top:1px solid #e5e7eb;margin:24px 0;">
              <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">
                This is an automated message from DoVenue Suites. Please do not reply to this email.
              </p>
            </div>
          </div>
        </div>
      `;

      await resend.emails.send({
        from: `DoVenue Suites <noreply@dovenue.com>`,
        to: params.clientEmail,
        subject: `Contract Ready for Signature – ${params.contractNumber}`,
        html,
      });

      console.log('[MailService] Resend contract email sent to', params.clientEmail);
    } catch (error) {
      console.error('[MailService] Resend contract email failed:', error);
      // Non-fatal — SMS is already sent; don't break the contract send flow
    }
  }

  /** Send a team associate invitation email */
  async sendTeamInvitation(params: {
    toEmail: string;
    inviteUrl: string;
    ownerName: string;
    businessName: string;
  }): Promise<void> {
    try {
      const mailOptions = {
        from: `"DoVenueSuite" <${process.env.SMTP_FROM || 'noreply@dovenue.com'}>`,
        to: params.toEmail,
        subject: `You've been invited to join ${params.businessName} on DoVenueSuite`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #333;">You're Invited!</h2>
            <p>${params.ownerName} has invited you to join <strong>${params.businessName}</strong> as an associate on DoVenueSuite.</p>
            <p>As an associate, you'll be able to view events, clients, calendars, and more.</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${params.inviteUrl}"
                 style="background-color: #6366f1; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; display: inline-block; font-size: 16px;">
                Accept Invitation
              </a>
            </div>
            <p style="color: #666; font-size: 14px;">This invitation expires in 7 days. If you didn't expect this email, you can safely ignore it.</p>
            <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
            <p style="color: #999; font-size: 12px; text-align: center;">DoVenueSuite – Venue Management Made Simple</p>
          </div>
        `,
      };
      await this.transporter.sendMail(mailOptions);
      console.log('[MailService] Team invite sent to', params.toEmail);
    } catch (error) {
      console.error('[MailService] Team invite email failed:', error);
      // Non-fatal
    }
  }

  async sendReminderEmail(params: {
    toEmail: string;
    toName: string;
    subject: string;
    body: string;
  }): Promise<void> {
    const htmlBody = params.body.replace(/\n/g, '<br>');
    const mailOptions = {
      from: `"DoVenueSuite" <${process.env.SMTP_FROM || 'noreply@dovenue.com'}>`,
      to: params.toEmail,
      subject: params.subject,
      html: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#1f2937;">
          <p>Hi ${params.toName},</p>
          <p>${htmlBody}</p>
          <p style="margin-top:32px;color:#6b7280;font-size:13px;">— The DoVenueSuite Team</p>
        </div>
      `,
    };
    try {
      await this.transporter.sendMail(mailOptions);
      console.log('[MailService] Reminder sent to', params.toEmail, '—', params.subject);
    } catch (error) {
      console.error('[MailService] Reminder email failed:', error);
      // Non-fatal — cron jobs should not crash on email failure
    }
  }

  /**
   * Sends a confirmation email to a customer who just purchased event tickets.
   * Includes QR codes for each ticket and Eventecos disclaimer.
   * Triggered from the Stripe webhook after `checkout.session.completed`.
   */
  async sendTicketConfirmation(params: {
    toEmail: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string | null;
    venueName?: string | null;
    tierName: string;
    quantity: number;
    amountTotal: number;
    eventId: string;
    promoterName?: string | null;
    sessionId?: string;
  }): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
      const eventUrl = `${frontendUrl}/events/${params.eventId}`;
      const formattedDate = params.eventDate
        ? new Date(params.eventDate + (params.eventDate.includes('T') ? '' : 'T12:00:00'))
            .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'TBD';
      const isFree = params.amountTotal === 0;
      const amountStr = isFree ? 'Free' : `$${params.amountTotal.toFixed(2)}`;
      const fromName = params.promoterName ? `${params.promoterName} via Eventecos` : 'Eventecos Tickets';

      // Fetch tickets by session ID if available and generate QR codes as base64
      let ticketQRItems: Array<{ id: string; base64: string }> = [];
      if (params.sessionId) {
        try {
          const admin = this.supabaseService.getAdminClient();
          const { data: tickets, error } = await admin
            .from('tickets')
            .select('id')
            .eq('stripe_checkout_session_id', params.sessionId)
            .order('created_at', { ascending: true });

          if (!error && tickets && tickets.length > 0) {
            for (const ticket of tickets) {
              const ticketUrl = `${frontendUrl}/ticket/${ticket.id}`;
              const qrBuffer = await QRCode.toBuffer(ticketUrl, {
                errorCorrectionLevel: 'H',
                type: 'png',
                margin: 1,
                width: 300,
              });
              ticketQRItems.push({ id: ticket.id, base64: qrBuffer.toString('base64') });
            }
          }
        } catch (ticketError) {
          console.warn('[MailService] Could not fetch tickets for QR codes:', ticketError);
        }
      }

      // Build QR codes HTML using base64 data URIs (works with Resend)
      const qrCodesHtml = ticketQRItems.length > 0
        ? `
            <div style="margin: 32px 0;">
              <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 16px;">Your Tickets</h3>
              ${ticketQRItems.map((ticket, index) => `
                <div style="background: white; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Ticket ${index + 1}</p>
                  <img src="data:image/png;base64,${ticket.base64}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto 12px;" />
                  <p style="color: #9ca3af; font-size: 11px; margin: 0; font-family: monospace; word-break: break-all;">${ticket.id}</p>
                </div>
              `).join('')}
              <p style="color: #6b7280; font-size: 13px; background: #f3f4f6; border-radius: 8px; padding: 12px; margin: 16px 0 0; line-height: 1.5;">
                📱 <strong>Show the QR code above at the door.</strong> Each code can only be scanned once. You can also view your tickets anytime by visiting your ticket page.
              </p>
            </div>
          `
        : '';

      if (!process.env.RESEND_API_KEY) {
        console.warn('[MailService] RESEND_API_KEY not set — skipping ticket confirmation email');
        return;
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      const html = `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              ${this.getEmailHeader('You\'re going!', 'Your tickets are confirmed')}
              <div style="padding: 32px;">
                <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px;">${params.eventTitle}</h2>
                <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr><td style="padding: 4px 0; color: #6b7280; width: 110px;">Date</td><td style="padding: 4px 0; font-weight: 600;">${formattedDate}</td></tr>
                    ${params.eventTime ? `<tr><td style="padding: 4px 0; color: #6b7280;">Time</td><td style="padding: 4px 0; font-weight: 600;">${params.eventTime}</td></tr>` : ''}
                    ${params.venueName ? `<tr><td style="padding: 4px 0; color: #6b7280;">Venue</td><td style="padding: 4px 0; font-weight: 600;">${params.venueName}</td></tr>` : ''}
                    <tr><td style="padding: 4px 0; color: #6b7280;">Ticket</td><td style="padding: 4px 0; font-weight: 600;">${params.tierName}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Quantity</td><td style="padding: 4px 0; font-weight: 600;">${params.quantity}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Total</td><td style="padding: 4px 0; font-weight: 700;">${amountStr}</td></tr>
                  </table>
                </div>

                ${qrCodesHtml}

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
                    <strong>Important Notice:</strong> Eventecos is not responsible for event cancellations, postponements, or refunds. The event organizer is solely liable for these matters. Please contact the event organizer for questions about event policies, cancellations, or refunds. We are only responsible for ticket delivery and access management.
                  </p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                  <a href="${eventUrl}"
                     style="display: inline-block; background: #7c3aed; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    View Event Details
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                  Questions? Reply to this email${params.promoterName ? ` and ${params.promoterName} will get back to you.` : '.'}
                </p>
              </div>
            </div>
          </div>
        `;

      await resend.emails.send({
        from: `${fromName} <${process.env.RESEND_FROM || 'noreply@eventecos.com'}>`,
        to: params.toEmail,
        subject: `Your tickets to ${params.eventTitle} are confirmed`,
        html,
        text: `Your tickets are confirmed!\n\n${params.eventTitle}\nDate: ${formattedDate}${params.eventTime ? `\nTime: ${params.eventTime}` : ''}${params.venueName ? `\nVenue: ${params.venueName}` : ''}\nTicket: ${params.tierName}\nQuantity: ${params.quantity}\nTotal: ${amountStr}\n\nIMPORTANT: Eventecos is not responsible for event cancellations, postponements, or refunds.\n\nView event: ${eventUrl}`,
      });
      console.log('[MailService] Ticket confirmation sent via Resend to', params.toEmail);
    } catch (error) {
      console.error('[MailService] Ticket confirmation email failed:', error);
      // Non-fatal — webhook must not throw
    }
  }

  /** Sends a ticket forward email with the claim code to the recipient */
  async sendTicketForwardEmail(params: {
    toEmail: string;
    eventTitle: string;
    code: string;
    claimUrl: string;
  }): Promise<void> {
    if (!process.env.RESEND_API_KEY) {
      console.warn('[MailService] RESEND_API_KEY not set — skipping ticket forward email');
      return;
    }
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `Eventecos Tickets <${process.env.RESEND_FROM || 'noreply@eventecos.com'}>`,
        to: params.toEmail,
        subject: `You've received a ticket to ${params.eventTitle}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              ${this.getEmailHeader("You've got a ticket!", `To: ${params.eventTitle}`)}
              <div style="padding: 32px;">
                <p style="color: #374151; font-size: 15px; margin: 0 0 24px;">
                  Someone has forwarded you a ticket to <strong>${params.eventTitle}</strong>.
                  Use the code below to access your ticket.
                </p>

                <div style="background: #f5f3ff; border: 2px dashed #7c3aed; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px;">
                  <p style="color: #6b7280; font-size: 13px; margin: 0 0 8px; text-transform: uppercase; letter-spacing: 1px;">Your Access Code</p>
                  <p style="color: #1f2937; font-size: 40px; font-weight: 900; letter-spacing: 6px; margin: 0; font-family: monospace;">${params.code}</p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                  <a href="${params.claimUrl}"
                     style="display: inline-block; background: #7c3aed; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    View My Ticket
                  </a>
                </div>

                <p style="color: #6b7280; font-size: 12px; text-align: center; margin: 16px 0 0;">
                  Or visit <a href="${params.claimUrl}" style="color: #7c3aed;">${params.claimUrl}</a>
                  and enter the code above. This code expires in 7 days.
                </p>

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0 0;">
                  <p style="color: #92400e; font-size: 13px; margin: 0;">
                    <strong>Important:</strong> Eventecos is not responsible for event cancellations or refunds.
                    Please contact the event organizer for those matters.
                  </p>
                </div>
              </div>
            </div>
          </div>
        `,
        text: `You've received a ticket to ${params.eventTitle}!\n\nYour access code: ${params.code}\n\nClaim your ticket at: ${params.claimUrl}\n\nThis code expires in 7 days.`,
      });
      console.log('[MailService] Ticket forward email sent via Resend to', params.toEmail);
    } catch (error) {
      console.error('[MailService] Ticket forward email failed:', error);
    }
  }

  async sendCompTicketEmail(params: {
    toEmail: string;
    toName: string;
    eventTitle: string;
    eventDate?: string;
    eventTime?: string | null;
    venueName?: string;
    tierName: string;
    ticketUrl: string;
    ticketId: string;
    promoterName: string;
    eventId: string;
  }): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
      const formattedDate = params.eventDate
        ? new Date(params.eventDate + (params.eventDate.includes('T') ? '' : 'T12:00:00'))
            .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'TBD';
      const fromName = `${params.promoterName} via Eventecos`;

      // Generate QR code as base64 data URI (works with Resend)
      let qrHtml = '';
      try {
        const qrBuffer = await QRCode.toBuffer(params.ticketUrl, {
          errorCorrectionLevel: 'H',
          type: 'png',
          margin: 1,
          width: 300,
        });
        const base64 = qrBuffer.toString('base64');
        qrHtml = `
          <div style="margin: 32px 0;">
            <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 16px;">Your Ticket</h3>
            <div style="background: white; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; text-align: center;">
              <img src="data:image/png;base64,${base64}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto 12px;" />
              <p style="color: #9ca3af; font-size: 11px; margin: 0; font-family: monospace; word-break: break-all;">${params.ticketId}</p>
            </div>
            <p style="color: #6b7280; font-size: 13px; background: #f3f4f6; border-radius: 8px; padding: 12px; margin: 16px 0 0; line-height: 1.5;">
              📱 <strong>Show this QR code at the door.</strong> You can also view your ticket anytime at the link below.
            </p>
          </div>
        `;
      } catch (qrErr) {
        console.warn('[MailService] QR generation failed for comp ticket:', qrErr);
      }

      if (!process.env.RESEND_API_KEY) {
        console.warn('[MailService] RESEND_API_KEY not set — skipping comp ticket email');
        return;
      }
      const resend = new Resend(process.env.RESEND_API_KEY);
      await resend.emails.send({
        from: `${fromName} <${process.env.RESEND_FROM || 'noreply@eventecos.com'}>`,
        to: params.toEmail,
        subject: `Your complimentary ticket to ${params.eventTitle} is confirmed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              ${this.getEmailHeader("You've got a comp ticket! 🎟️", 'Your complimentary ticket is confirmed')}
              <div style="padding: 32px;">
                <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px;">${params.eventTitle}</h2>
                <p style="color: #374151; font-size: 15px; margin: 0 0 20px;">
                  Hi ${params.toName}, <strong>${params.promoterName}</strong> has sent you a complimentary ticket.
                </p>
                <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr><td style="padding: 4px 0; color: #6b7280; width: 110px;">Date</td><td style="padding: 4px 0; font-weight: 600;">${formattedDate}</td></tr>
                    ${params.eventTime ? `<tr><td style="padding: 4px 0; color: #6b7280;">Time</td><td style="padding: 4px 0; font-weight: 600;">${params.eventTime}</td></tr>` : ''}
                    ${params.venueName ? `<tr><td style="padding: 4px 0; color: #6b7280;">Venue</td><td style="padding: 4px 0; font-weight: 600;">${params.venueName}</td></tr>` : ''}
                    <tr><td style="padding: 4px 0; color: #6b7280;">Ticket</td><td style="padding: 4px 0; font-weight: 600;">${params.tierName}</td></tr>
                    <tr><td style="padding: 4px 0; color: #6b7280;">Total</td><td style="padding: 4px 0; font-weight: 700; color: #059669;">Complimentary</td></tr>
                  </table>
                </div>

                ${qrHtml}

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
                    <strong>Important Notice:</strong> Eventecos is not responsible for event cancellations, postponements, or refunds. The event organizer is solely liable for these matters.
                  </p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                  <a href="${params.ticketUrl}"
                     style="display: inline-block; background: #7c3aed; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    View My Ticket
                  </a>
                </div>
              </div>
            </div>
          </div>
        `,
        text: `Your complimentary ticket to ${params.eventTitle} is confirmed!\n\nIssued by: ${params.promoterName}\nDate: ${formattedDate}${params.eventTime ? `\nTime: ${params.eventTime}` : ''}${params.venueName ? `\nVenue: ${params.venueName}` : ''}\nTier: ${params.tierName}\nTotal: Complimentary\n\nView your ticket: ${params.ticketUrl}`,
      });
      console.log('[MailService] Comp ticket email sent via Resend to', params.toEmail);
    } catch (error) {
      console.error('[MailService] Comp ticket email failed:', error);
    }
  }

  /**
   * Sends a single consolidated email with multiple ticket tiers
   */
  async sendConsolidatedTicketConfirmation(params: {
    toEmail: string;
    eventTitle: string;
    eventDate: string;
    eventTime?: string | null;
    venueName?: string | null;
    tiers: { tier_id: string; quantity: number; tier_name: string }[];
    amountTotal: number;
    eventId: string;
    promoterName?: string | null;
    sessionId?: string;
  }): Promise<void> {
    try {
      const frontendUrl = process.env.FRONTEND_URL || 'https://dovenuesuite.com';
      const eventUrl = `${frontendUrl}/events/${params.eventId}`;
      const formattedDate = params.eventDate
        ? new Date(params.eventDate + (params.eventDate.includes('T') ? '' : 'T12:00:00'))
            .toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
        : 'TBD';
      const isFree = params.amountTotal === 0;
      const amountStr = isFree ? 'Free' : `$${params.amountTotal.toFixed(2)}`;
      const fromName = params.promoterName ? `${params.promoterName} via Eventecos` : 'Eventecos Tickets';

      // Fetch tickets by session ID if available
      let ticketQRCodes: Array<{ id: string; buffer: Buffer; cid: string }> = [];
      let attachments: any[] = [];
      if (params.sessionId) {
        try {
          const admin = this.supabaseService.getAdminClient();
          const { data: tickets, error } = await admin
            .from('tickets')
            .select('id')
            .eq('stripe_checkout_session_id', params.sessionId)
            .order('created_at', { ascending: true });

          if (!error && tickets && tickets.length > 0) {
            // Generate QR code for each ticket
            for (const ticket of tickets) {
              const ticketUrl = `${frontendUrl}/ticket/${ticket.id}`;
              const qrBuffer = await QRCode.toBuffer(ticketUrl, {
                errorCorrectionLevel: 'H',
                type: 'png',
                margin: 1,
                width: 300,
              });
              const cid = `qr-${ticket.id}@eventecos`;
              ticketQRCodes.push({ id: ticket.id, buffer: qrBuffer, cid });
              attachments.push({
                filename: `ticket-qr-${ticket.id.substring(0, 8)}.png`,
                content: qrBuffer,
                cid: cid,
              });
            }
          }
        } catch (ticketError) {
          console.warn('[MailService] Could not fetch tickets for QR codes:', ticketError);
        }
      }

      // Build QR codes HTML
      const qrCodesHtml = ticketQRCodes.length > 0
        ? `
            <div style="margin: 32px 0;">
              <h3 style="color: #1f2937; font-size: 16px; font-weight: 600; margin: 0 0 16px;">Your Tickets</h3>
              ${ticketQRCodes.map((ticket, index) => `
                <div style="background: white; border: 2px dashed #e5e7eb; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 16px;">
                  <p style="color: #6b7280; font-size: 12px; margin: 0 0 12px; text-transform: uppercase; letter-spacing: 0.5px;">Ticket ${index + 1}</p>
                  <img src="cid:${ticket.cid}" alt="QR Code" style="width: 200px; height: 200px; display: block; margin: 0 auto 12px;" />
                  <p style="color: #9ca3af; font-size: 11px; margin: 0; font-family: monospace; word-break: break-all;">${ticket.id}</p>
                </div>
              `).join('')}
              <p style="color: #6b7280; font-size: 13px; background: #f3f4f6; border-radius: 8px; padding: 12px; margin: 16px 0 0; line-height: 1.5;">
                📱 <strong>Show the QR code above at the door.</strong> Each code can only be scanned once. You can also view your tickets anytime by visiting your ticket page.
              </p>
            </div>
          `
        : '';

      // Build ticket tier summary HTML
      const tierSummaryHtml = `
        <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
          ${params.tiers.map(tier => `
            <tr>
              <td style="padding: 8px 0; color: #6b7280; border-bottom: 1px solid #e5e7eb;">${tier.tier_name}</td>
              <td style="padding: 8px 0; font-weight: 600; text-align: right; border-bottom: 1px solid #e5e7eb;">${tier.quantity} ${tier.quantity === 1 ? 'ticket' : 'tickets'}</td>
            </tr>
          `).join('')}
          <tr>
            <td style="padding: 12px 0; color: #1f2937; font-weight: 700;">Total</td>
            <td style="padding: 12px 0; font-weight: 700; text-align: right;">${params.tiers.reduce((s, t) => s + t.quantity, 0)} ${params.tiers.reduce((s, t) => s + t.quantity, 0) === 1 ? 'ticket' : 'tickets'}</td>
          </tr>
        </table>
      `;

      const mailOptions = {
        from: `"${fromName}" <${process.env.SMTP_FROM || 'noreply@eventecos.com'}>`,
        to: params.toEmail,
        subject: `Your tickets to ${params.eventTitle} are confirmed`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #f9fafb; padding: 32px 16px;">
            <div style="background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 4px rgba(0,0,0,0.08);">
              ${this.getEmailHeader('You\'re going!', 'Your tickets are confirmed')}
              <div style="padding: 32px;">
                <h2 style="margin: 0 0 16px; color: #1f2937; font-size: 20px;">${params.eventTitle}</h2>
                <div style="background: #f5f3ff; border-left: 4px solid #7c3aed; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
                  <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #374151;">
                    <tr><td style="padding: 4px 0; color: #6b7280; width: 110px;">Date</td><td style="padding: 4px 0; font-weight: 600;">${formattedDate}</td></tr>
                    ${params.eventTime ? `<tr><td style="padding: 4px 0; color: #6b7280;">Time</td><td style="padding: 4px 0; font-weight: 600;">${params.eventTime}</td></tr>` : ''}
                    ${params.venueName ? `<tr><td style="padding: 4px 0; color: #6b7280;">Venue</td><td style="padding: 4px 0; font-weight: 600;">${params.venueName}</td></tr>` : ''}
                  </table>
                  <div style="margin-top: 16px; border-top: 1px solid rgba(124, 58, 237, 0.2); padding-top: 16px;">
                    <h4 style="margin: 0 0 12px; color: #374151; font-size: 13px; font-weight: 600;">Tickets Ordered</h4>
                    ${tierSummaryHtml}
                  </div>
                  <div style="margin-top: 16px; padding-top: 16px; border-top: 1px solid rgba(124, 58, 237, 0.2);">
                    <table style="width: 100%;">
                      <tr><td style="color: #6b7280; font-size: 14px;">Total Amount:</td><td style="text-align: right; font-weight: 700; font-size: 16px; color: #1f2937;">${amountStr}</td></tr>
                    </table>
                  </div>
                </div>

                ${qrCodesHtml}

                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 24px 0;">
                  <p style="color: #92400e; font-size: 13px; margin: 0; line-height: 1.6;">
                    <strong>Important Notice:</strong> Eventecos is not responsible for event cancellations, postponements, or refunds. The event organizer is solely liable for these matters. Please contact the event organizer for questions about event policies, cancellations, or refunds. We are only responsible for ticket delivery and access management.
                  </p>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                  <a href="${eventUrl}"
                     style="display: inline-block; background: #7c3aed; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-size: 15px; font-weight: 600;">
                    View Event Details
                  </a>
                </div>
                <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 24px;">
                  Questions? Reply to this email${params.promoterName ? ` and ${params.promoterName} will get back to you.` : '.'}
                </p>
              </div>
            </div>
          </div>
        `,
        text: `Your tickets are confirmed!\n\n${params.eventTitle}\nDate: ${formattedDate}${params.eventTime ? `\nTime: ${params.eventTime}` : ''}${params.venueName ? `\nVenue: ${params.venueName}` : ''}\n\nTickets:\n${params.tiers.map(t => `- ${t.tier_name}: ${t.quantity}`).join('\n')}\n\nTotal: ${params.tiers.reduce((s, t) => s + t.quantity, 0)} tickets - ${amountStr}\n\nShow the QR code above at the door. Each code can only be scanned once.\n\nIMPORTANT: Eventecos is not responsible for event cancellations, postponements, or refunds. The event organizer is solely liable for these matters.\n\nView event: ${eventUrl}`,
        attachments: attachments,
      };

      const info = await this.transporter.sendMail(mailOptions);
      console.log('[MailService] Consolidated ticket confirmation sent to', params.toEmail, '—', info.messageId);
    } catch (error) {
      console.error('[MailService] Consolidated ticket confirmation email failed:', error);
      // Non-fatal — webhook must not throw
    }
  }

  async sendRiderEmail(params: {
    to: string;
    artistName: string;
    eventName: string;
    eventDate?: string;
    rider: Record<string, any>;
  }): Promise<void> {
    const { to, artistName, eventName, eventDate, rider } = params;
    const formattedDate = eventDate
      ? new Date(eventDate + 'T12:00:00').toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
      : null;

    const section = (title: string, content: string) =>
      `<div style="margin-bottom:20px;">
        <h3 style="color:#1f2937;font-size:14px;font-weight:700;margin:0 0 8px;text-transform:uppercase;letter-spacing:0.05em;">${title}</h3>
        <p style="color:#374151;font-size:14px;margin:0;white-space:pre-wrap;line-height:1.6;">${content}</p>
      </div>`;

    const boolItem = (label: string, val: boolean) =>
      val ? `<li style="color:#374151;font-size:14px;margin:0 0 4px;">${label}</li>` : '';

    const sections: string[] = [];

    // Contacts
    const contactLines: string[] = [];
    if (rider.artist_manager) contactLines.push(`Manager: ${rider.artist_manager}${rider.manager_phone ? ` · ${rider.manager_phone}` : ''}${rider.manager_email ? ` · ${rider.manager_email}` : ''}`);
    if (rider.tour_manager) contactLines.push(`Tour Manager: ${rider.tour_manager}${rider.tour_manager_phone ? ` · ${rider.tour_manager_phone}` : ''}${rider.tour_manager_email ? ` · ${rider.tour_manager_email}` : ''}`);
    if (rider.production_manager) contactLines.push(`Production Manager: ${rider.production_manager}${rider.production_manager_phone ? ` · ${rider.production_manager_phone}` : ''}${rider.production_manager_email ? ` · ${rider.production_manager_email}` : ''}`);
    if (contactLines.length) sections.push(section('Contacts', contactLines.join('\n')));

    // Travel
    const travelLines: string[] = [];
    if (rider.traveling_party_size) travelLines.push(`Party size: ${rider.traveling_party_size}`);
    if (rider.transport_required) travelLines.push(`Transport: ${rider.transport_required}`);
    if (rider.hotel_requirements) travelLines.push(`Hotel: ${rider.hotel_requirements}`);
    if (travelLines.length) sections.push(section('Travel & Accommodation', travelLines.join('\n')));

    // Dressing Room
    const dressingItems: string[] = [];
    if (rider.dressing_rooms_count) dressingItems.push(`Rooms required: ${rider.dressing_rooms_count}`);
    if (rider.dressing_room_notes) dressingItems.push(rider.dressing_room_notes);
    const dressingBools = [
      boolItem('Private access required', rider.requires_private_access),
      boolItem('Mirrors required', rider.requires_mirrors),
      boolItem('Clothing rack', rider.requires_clothing_rack),
      boolItem('Seating', rider.requires_seating),
      boolItem('Wi-Fi', rider.requires_wifi),
      boolItem('Climate control', rider.requires_climate_control),
    ].filter(Boolean);
    if (dressingItems.length || dressingBools.length) {
      const content = [...dressingItems].join('\n') + (dressingBools.length ? `\n<ul style="margin:8px 0 0;padding-left:18px;">${dressingBools.join('')}</ul>` : '');
      sections.push(section('Dressing Room', content));
    }

    // Hospitality
    const hospLines: string[] = [];
    if (rider.bottled_water) hospLines.push(`Water: ${rider.bottled_water}`);
    if (rider.soft_drinks) hospLines.push(`Soft drinks: ${rider.soft_drinks}`);
    if (rider.snacks) hospLines.push(`Snacks: ${rider.snacks}`);
    if (rider.hot_meal) hospLines.push(`Hot meal required${rider.hot_meal_notes ? `: ${rider.hot_meal_notes}` : ''}`);
    if (rider.dietary_restrictions) hospLines.push(`Dietary restrictions: ${rider.dietary_restrictions}`);
    if (hospLines.length) sections.push(section('Hospitality', hospLines.join('\n')));

    // Technical
    const techLines: string[] = [];
    if (rider.stage_size_min) techLines.push(`Stage size: ${rider.stage_size_min}`);
    if (rider.power_requirements) techLines.push(`Power: ${rider.power_requirements}`);
    if (rider.sound_system) techLines.push(`Sound: ${rider.sound_system}`);
    if (rider.dj_setup) techLines.push(`DJ setup: ${rider.dj_setup}`);
    if (rider.microphones) techLines.push(`Microphones: ${rider.microphones}`);
    if (rider.monitors) techLines.push(`Monitors: ${rider.monitors}`);
    if (rider.lighting) techLines.push(`Lighting: ${rider.lighting}`);
    if (rider.video_playback) techLines.push(`Video/playback: ${rider.video_playback}`);
    if (rider.technical_notes) techLines.push(rider.technical_notes);
    if (techLines.length) sections.push(section('Technical Requirements', techLines.join('\n')));

    // Schedule
    const schedLines: string[] = [];
    if (rider.load_in_time) schedLines.push(`Load-in: ${rider.load_in_time}`);
    if (rider.soundcheck_time) schedLines.push(`Soundcheck: ${rider.soundcheck_time}`);
    if (rider.performance_duration) schedLines.push(`Performance duration: ${rider.performance_duration}`);
    if (rider.load_out_time) schedLines.push(`Load-out: ${rider.load_out_time}`);
    if (schedLines.length) sections.push(section('Schedule', schedLines.join('\n')));

    // Security
    const secLines: string[] = [];
    if (rider.backstage_access_control) secLines.push(`Access control: ${rider.backstage_access_control}`);
    if (rider.crowd_barrier) secLines.push('Crowd barrier required');
    if (rider.stage_escort) secLines.push('Stage escort required');
    if (rider.security_notes) secLines.push(rider.security_notes);
    if (secLines.length) sections.push(section('Security', secLines.join('\n')));

    // Merch
    const merchLines: string[] = [];
    if (rider.merch_table_required) merchLines.push('Merch table required');
    if (rider.merch_staffing) merchLines.push(`Staffing: ${rider.merch_staffing}`);
    if (rider.merch_split_percentage) merchLines.push(`Merch split: ${rider.merch_split_percentage}%`);
    if (rider.merch_settlement) merchLines.push(`Settlement: ${rider.merch_settlement}`);
    if (merchLines.length) sections.push(section('Merchandise', merchLines.join('\n')));

    // Special Notes
    const specialLines: string[] = [];
    if (rider.photography_policy) specialLines.push(`Photography: ${rider.photography_policy}`);
    if (rider.recording_policy) specialLines.push(`Recording: ${rider.recording_policy}`);
    if (rider.guest_list_comps) specialLines.push(`Guest list comps: ${rider.guest_list_comps}`);
    if (rider.promoter_obligations) specialLines.push(`Promoter obligations: ${rider.promoter_obligations}`);
    if (rider.special_notes) specialLines.push(rider.special_notes);
    if (specialLines.length) sections.push(section('Special Notes', specialLines.join('\n')));

    if (!sections.length) sections.push('<p style="color:#6b7280;font-size:14px;">No specific requirements listed.</p>');

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;">
        <div style="max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,.1);">
          ${this.getEmailHeader(`Artist Rider — ${artistName}`, `For: ${eventName}${formattedDate ? ` · ${formattedDate}` : ''}`)}
          <div style="padding:32px;">
            <p style="color:#374151;font-size:15px;margin:0 0 24px;line-height:1.5;">
              <strong>${artistName}</strong> has sent you their artist rider for <strong>${eventName}</strong>${formattedDate ? ` on <strong>${formattedDate}</strong>` : ''}.
              Please review the requirements below and confirm all arrangements are in place.
            </p>
            <div style="border-top:1px solid #e5e7eb;padding-top:24px;">
              ${sections.join('<hr style="border:none;border-top:1px solid #f3f4f6;margin:16px 0;">')}
            </div>
            <p style="color:#9ca3af;font-size:12px;margin:24px 0 0;border-top:1px solid #f3f4f6;padding-top:16px;">
              Sent via EventEcos · If you have questions, reply directly to ${artistName}.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    if (!process.env.RESEND_API_KEY) {
      console.warn('[MailService] RESEND_API_KEY not set — skipping rider email');
      throw new Error('Email service not configured. Please set RESEND_API_KEY in your environment.');
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from: `EventEcos <${process.env.RESEND_FROM || 'noreply@eventecos.com'}>`,
      to,
      subject: `Artist Rider: ${artistName} — ${eventName}`,
      html,
    });
    if (error) throw new Error(error.message);
    console.log('[MailService] Rider email sent via Resend to', to);
  }
}
