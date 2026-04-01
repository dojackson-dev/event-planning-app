import { Injectable } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { Contract } from '../entities/contract.entity';
import { User } from '../entities/user.entity';

@Injectable()
export class MailService {
  private transporter: nodemailer.Transporter;

  constructor() {
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
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">DoVenue Suites</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Client Portal Invitation</p>
              </div>

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
              <div style="background: linear-gradient(135deg, #1e3a5f 0%, #2563eb 100%); padding: 32px 32px 24px; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 26px; font-weight: 700;">DoVenue Suites</h1>
                <p style="color: rgba(255,255,255,0.85); margin: 8px 0 0; font-size: 14px;">Invoice Ready</p>
              </div>
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
}
