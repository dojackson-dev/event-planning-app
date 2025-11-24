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
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.ethereal.email',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
      },
    });
  }

  async sendContractNotification(contract: Contract, client: User, owner: User): Promise<void> {
    try {
      const contractUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/contracts/${contract.id}`;
      
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

  async sendContractSignedNotification(contract: Contract, client: User, owner: User): Promise<void> {
    try {
      const contractUrl = `${process.env.FRONTEND_URL || 'http://localhost:3001'}/dashboard/contracts/${contract.id}`;
      
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
