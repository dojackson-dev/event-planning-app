# Twilio SMS Messaging Setup

This guide will help you set up Twilio SMS messaging for sending reminders, invoice updates, and other notifications to clients and guests.

## Prerequisites

- A Twilio account (sign up at https://www.twilio.com)
- A Twilio phone number

## Setup Steps

### 1. Get Your Twilio Credentials

1. Log in to your [Twilio Console](https://console.twilio.com)
2. From the Dashboard, copy your **Account SID** and **Auth Token**
3. Go to Phone Numbers → Manage → Active numbers
4. Copy your Twilio phone number (including country code, e.g., +12345678900)

### 2. Configure Backend Environment Variables

Add the following to your backend `.env` file:

```env
# Twilio Configuration
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+12345678900
```

**Security Note**: Never commit your `.env` file to version control. It should be in your `.gitignore`.

### 3. Restart Backend Server

After adding the environment variables, restart your backend server:

```bash
cd packages/backend
npm run start:dev
```

## Features

### Message Types

- **Reminder**: Event reminders sent to clients and guests
- **Invoice**: Invoice updates and payment notifications
- **Confirmation**: Booking confirmations
- **Update**: General event updates
- **Custom**: Any custom message

### Recipient Types

- **Client**: Send to registered customers with phone numbers
- **Guest**: Send to guests from a specific event's guest list
- **Security**: Send to security personnel
- **Custom**: Send to any phone number

### Bulk Messaging

You can send messages to multiple recipients at once:
- Send to all clients
- Send to all guests in an event

### Message Tracking

- View all sent messages
- Check delivery status
- Refresh status from Twilio
- Filter by event, status, or message type
- View statistics (total, sent, delivered, failed, pending)

## Database Migration

The messages table has been created in migration `011_create_messages.sql`. Run it if you haven't already:

```sql
-- Tables created:
- messages: Stores all SMS message records
  - recipient_phone, recipient_name, recipient_type
  - user_id, event_id (optional references)
  - message_type, content
  - status (pending, sent, delivered, failed)
  - twilio_sid, error_message
  - sent_at, created_at
```

## Usage Examples

### Send Event Reminder

1. Navigate to Messages → Send Message
2. Select "Client" as recipient type
3. Choose an event
4. Select "Event Reminder" as message type
5. Click "Use template" to auto-fill with event details
6. Click "Send Message"

### Send to All Guests

1. Navigate to Messages → Send Message
2. Select "Guest (from event)" as recipient type
3. Choose an event (this loads the guest list)
4. Check "Send to all guests in selected event"
5. Enter your message
6. Click "Send to Multiple Recipients"

### Send Invoice Update

1. Navigate to Messages → Send Message
2. Select "Client" as recipient type
3. Choose a client from the dropdown
4. Select "Invoice Update" as message type
5. Enter your message (or use template)
6. Click "Send Message"

## API Endpoints

### Send Single Message
```
POST /messages/send
Body: {
  recipientPhone: string
  recipientName: string
  recipientType: 'client' | 'guest' | 'security' | 'custom'
  userId?: number
  eventId?: number
  messageType: 'reminder' | 'invoice' | 'confirmation' | 'update' | 'custom'
  content: string
}
```

### Send Bulk Messages
```
POST /messages/send-bulk
Body: {
  messages: Array<MessageData>
}
```

### Send Event Reminder
```
POST /messages/event-reminder/:eventId
Body: {
  message?: string  // Optional custom message
}
```

### Get All Messages
```
GET /messages
Query params: ?eventId=1&userId=2
```

### Get Message Stats
```
GET /messages/stats
Returns: {
  total: number
  sent: number
  delivered: number
  failed: number
  pending: number
}
```

### Refresh Message Status
```
POST /messages/:id/refresh-status
```

## Troubleshooting

### "Twilio client not configured" Error

Make sure you've added all three environment variables to your `.env` file and restarted the backend server.

### "Failed to send message" Error

1. Check that your Twilio credentials are correct
2. Verify your Twilio phone number is formatted correctly (+1XXXXXXXXXX)
3. Ensure your Twilio account has sufficient balance
4. Check that recipient phone numbers include country codes

### Messages Stuck in "Pending" Status

- Click "Refresh" next to the message to update its status from Twilio
- Check your Twilio console logs for delivery details

### Phone Number Format

Always include the country code:
- ✅ Correct: +12345678900
- ❌ Wrong: 2345678900
- ❌ Wrong: (234) 567-8900

## Cost Considerations

- SMS costs vary by country (typically $0.0075 - $0.01 per message in the US)
- Messages over 160 characters are split into multiple segments
- Check your Twilio pricing at https://www.twilio.com/sms/pricing

## Best Practices

1. **Test First**: Send test messages to your own phone before bulk sending
2. **Respect Timing**: Avoid sending messages late at night or early morning
3. **Opt-Out**: Include opt-out instructions in marketing messages
4. **Character Limit**: Keep messages under 160 characters when possible
5. **Templates**: Use templates for consistency
6. **Error Handling**: Monitor failed messages and retry if needed

## Support

For Twilio-related issues, consult the [Twilio Documentation](https://www.twilio.com/docs/sms) or contact Twilio support.
