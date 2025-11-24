# Contract Sending Feature

## Overview

The contract system now supports sending contracts to clients with automatic email notifications. When an owner sends a contract, the client receives a professional email with all contract details and a direct link to review and sign the contract.

## How It Works

### For Owners (Sending Contracts)

1. **Create Contract**
   - Navigate to Contracts → Create New Contract
   - Select a booking/event (which includes the client)
   - Enter contract title and description
   - Upload the contract document (PDF, DOC, or DOCX)
   - Click "Create Contract"

2. **Send Contract to Client**
   - Open the contract from the list
   - Review contract details
   - Click "Send to Client" button
   - Confirm the action
   - System automatically:
     - Changes contract status to "SENT"
     - Records the sent date
     - Sends email notification to client
     - Shows success message

### For Clients (Receiving Contracts)

1. **Email Notification**
   - Client receives professional email with:
     - Contract details (number, title, description)
     - Event information (name, date, time, venue)
     - Client information
     - "View & Sign Contract" button
   
2. **Review and Sign**
   - Click link in email or access via dashboard
   - Review contract document
   - Download contract if needed
   - Click "Sign Contract" button
   - Draw electronic signature
   - Enter full name
   - Submit signature

3. **Confirmation**
   - Contract status changes to "SIGNED"
   - Signature is permanently attached
   - Owner receives email notification
   - Signed date is recorded

## Email Notifications

### When Contract is Sent

**To:** Client email
**Subject:** New Contract Ready for Signature - [Contract Title]

**Email includes:**
- Greeting with client's name
- Contract details (number, title, description)
- Event information (if linked to booking)
- Direct link to view and sign
- Owner's contact information

### When Contract is Signed

**To:** Owner email
**Subject:** Contract Signed - [Contract Title]

**Email includes:**
- Contract details
- Client information
- Signed date and signer name
- Direct link to view signed contract

## Features

✅ **Professional Email Templates**
- HTML formatting with styling
- Plain text fallback for compatibility
- Responsive design (mobile-friendly)
- Call-to-action buttons

✅ **Smart Contract Management**
- Status tracking (Draft → Sent → Signed)
- Date tracking (created, sent, signed)
- Electronic signature capture
- Document download capability

✅ **Event Integration**
- Contracts linked to specific bookings/events
- Event details displayed in emails
- Client automatically selected from booking
- Full context for both parties

✅ **Security Features**
- Role-based access (owners create/send, clients sign)
- Electronic signature with timestamp
- IP address tracking (optional)
- Permanent signature storage

## User Interface

### Contract Detail Page - Owner View

```
┌─────────────────────────────────────────────────┐
│ ← Back to Contracts                             │
│                                                 │
│ Event Service Agreement              [DRAFT]   │
│ Contract #CON-2025-00001                       │
│                                                 │
│ ┌───────────────────────────────────────────┐ │
│ │ Client: John Smith                        │ │
│ │ john@example.com                          │ │
│ │                                           │ │
│ │ Owner: Larry Admin                        │ │
│ │ Created: 11/24/2025                       │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ ┌───────────────────────────────────────────┐ │
│ │ 📄 Event-Contract.pdf                     │ │
│ │ 2.5 MB                    [Download ↓]    │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ [📤 Send to Client]                            │
└─────────────────────────────────────────────────┘
```

### Contract Detail Page - Client View (After Sent)

```
┌─────────────────────────────────────────────────┐
│ ← Back to Contracts                             │
│                                                 │
│ Event Service Agreement              [SENT]    │
│ Contract #CON-2025-00001                       │
│                                                 │
│ ┌───────────────────────────────────────────┐ │
│ │ Contract Document                         │ │
│ │ 📄 Event-Contract.pdf    [Download ↓]    │ │
│ └───────────────────────────────────────────┘ │
│                                                 │
│ [✓ Sign Contract]                              │
└─────────────────────────────────────────────────┘
```

## Technical Details

### Backend Components

- **ContractsService.sendContract()**: Updates status and sends email
- **MailService.sendContractNotification()**: Sends email to client
- **MailService.sendContractSignedNotification()**: Notifies owner when signed

### Frontend Components

- **Send Button**: Only visible to owners when status is DRAFT
- **Loading State**: Shows "Sending..." during API call
- **Confirmation Dialog**: Asks for confirmation before sending
- **Success Message**: Informs user email was sent

### API Endpoint

```
POST /contracts/:id/send
```

**Response:**
```json
{
  "id": 1,
  "contractNumber": "CON-2025-00001",
  "status": "sent",
  "sentDate": "2025-11-24T10:30:00Z",
  ...
}
```

## Configuration

See `EMAIL_SETUP.md` for detailed instructions on:
- Setting up SMTP credentials
- Configuring email service (Gmail, SendGrid, etc.)
- Testing with Ethereal Email
- Troubleshooting email issues

## Best Practices

1. **Review Before Sending**
   - Always review contract details before sending
   - Ensure correct client is selected
   - Verify event information is accurate

2. **Clear Communication**
   - Use descriptive contract titles
   - Include helpful descriptions
   - Add internal notes for your records

3. **Follow Up**
   - Check contract status regularly
   - Follow up if client hasn't signed within reasonable time
   - Keep clients informed of deadlines

4. **Document Management**
   - Use clear file names
   - Keep contracts organized by event/date
   - Download signed contracts for records

## Troubleshooting

### Contract Not Sending
- Check internet connection
- Verify backend server is running
- Check browser console for errors

### Client Not Receiving Email
- Verify client email address in user profile
- Check spam/junk folder
- Verify SMTP configuration in backend `.env`
- Check backend server logs

### Email Configuration Issues
- See `EMAIL_SETUP.md` for configuration help
- Test with Ethereal Email first
- Verify environment variables are set
- Check SMTP credentials are correct

## Future Enhancements

Potential improvements:
- Bulk contract sending
- Contract templates
- Reminder emails for unsigned contracts
- Contract expiration dates
- PDF generation with embedded signature
- Multi-signature support
- Contract versioning
- Audit trail
