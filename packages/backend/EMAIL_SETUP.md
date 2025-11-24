# Email Notifications for Contracts

The contract system now includes automatic email notifications when contracts are sent to clients and when clients sign contracts.

## Setup Instructions

### 1. Configure Email Settings

Copy `.env.example` to `.env` and configure your email settings:

```bash
cp .env.example .env
```

### 2. Email Service Options

#### Option A: Development/Testing with Ethereal Email (Recommended for Development)

1. Go to https://ethereal.email/
2. Click "Create Ethereal Account"
3. Copy the SMTP credentials
4. Update your `.env` file:

```env
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_ethereal_user@ethereal.email
SMTP_PASS=your_ethereal_password
SMTP_FROM=noreply@dovenue.com
FRONTEND_URL=http://localhost:3001
```

**Note:** Ethereal Email doesn't actually send emails - it captures them so you can preview them in a test inbox. Perfect for development!

#### Option B: Production with Gmail

1. Enable 2-Factor Authentication on your Gmail account
2. Generate an App Password: https://myaccount.google.com/apppasswords
3. Update your `.env` file:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=your-email@gmail.com
FRONTEND_URL=https://your-production-domain.com
```

#### Option C: Production with SendGrid

1. Create a SendGrid account: https://sendgrid.com/
2. Create an API key
3. Update your `.env` file:

```env
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=your_sendgrid_api_key
SMTP_FROM=noreply@yourdomain.com
FRONTEND_URL=https://your-production-domain.com
```

## Features

### When Contract is Sent to Client

- **Trigger:** Owner clicks "Send to Client" button
- **Action:** 
  - Contract status changes to "SENT"
  - Client receives email notification with:
    - Contract details (number, title, description)
    - Event information (if linked to a booking)
    - Direct link to view and sign the contract
    - Owner's contact information

### When Contract is Signed

- **Trigger:** Client signs the contract electronically
- **Action:**
  - Contract status changes to "SIGNED"
  - Owner receives email notification with:
    - Confirmation that contract was signed
    - Signer's name and signature date
    - Direct link to view the signed contract

## Email Templates

The emails include:

1. **Professional HTML formatting** with styling
2. **Plain text fallback** for email clients that don't support HTML
3. **Contract details** clearly displayed
4. **Event information** if the contract is linked to a booking
5. **Call-to-action buttons** for easy navigation
6. **Responsive design** that works on mobile and desktop

## Testing

To test email notifications in development:

1. Set up Ethereal Email credentials in `.env`
2. Start the backend server
3. Create a contract and send it
4. Check the server console for the preview URL
5. Open the preview URL to see the email

Example console output:
```
Contract notification sent: <message-id>
Preview URL: https://ethereal.email/message/xxxxx
```

## Troubleshooting

### Emails Not Sending

1. Check that all SMTP environment variables are set correctly
2. Verify SMTP credentials are valid
3. Check server console for error messages
4. For Gmail, ensure you're using an App Password, not your regular password
5. Check spam folder on recipient's email

### Email Sent but Not Received

1. Check spam/junk folder
2. Verify the recipient email address is correct in the user profile
3. For Gmail, check "Less secure app access" is enabled (or use App Password)

## Future Enhancements

Potential improvements for the email system:

- Email template customization through admin panel
- Reminder emails for unsigned contracts
- Contract expiration notifications
- Attachment of contract PDF to emails
- Email tracking (opened, clicked)
- Customizable email branding
