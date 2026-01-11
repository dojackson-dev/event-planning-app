# Auth Architecture Implementation

Complete authentication system with Owner/Client/Admin roles, email/SMS verification, and Stripe subscription management.

## ✅ What's Been Created

### Database Schema
- ✅ `owner_accounts` - Business accounts with Stripe subscription tracking
- ✅ `venues` - Physical venues owned by business accounts
- ✅ `memberships` - User-to-owner-account relationships
- ✅ `client_profiles` - Extended client information
- ✅ `invites` - Client invitation system with tokens
- ✅ `users` table extended with: `email_verified`, `phone_verified`, `sms_opt_in`, `phone_number`, `status`

### Backend Services
- ✅ `AuthFlowService` - Core authentication business logic
- ✅ `AuthFlowController` - REST API endpoints
- ✅ `StripeService` - Payment integration (placeholder with mocks)
- ✅ `SmsService` - SMS verification (placeholder with in-memory OTP)
- ✅ `SubscriptionGuard` - Protect routes requiring active subscription
- ✅ `RoleGuard` - Role-based access control

### DTOs
- ✅ Owner: `OwnerSignupDto`, `OwnerLoginDto`, `VerifyEmailDto`, `VerifyPhoneDto`
- ✅ Client: `CreateInviteDto`, `AcceptInviteDto`, `ClientSmsOptInDto`
- ✅ Admin: `AdminLoginDto`

## 🎯 Current Status

### Test Data
- **Owner**: owner@test.com (subscription: active, plan: test-plan)
- **Admin**: admin@dovenuesuites.com
- **Venue**: Test's Event Center (capacity: 200)

### Active Features (Testing Mode)
- ✅ Owner signup with business/venue creation
- ✅ SMS verification (codes logged to console)
- ✅ Subscription checking (bypassed for testing)
- ✅ Client invites with 7-day expiry
- ✅ SMS consent tracking (IP, user-agent, timestamp)
- ✅ Role-based access control

## 📡 API Endpoints

### Owner Endpoints
```
POST /auth/flow/owner/signup
Body: { email, password, firstName, lastName, businessName, venueName, phone }

POST /auth/flow/owner/login  
Body: { email, password }

POST /auth/flow/owner/verify-phone
Body: { userId, otp }

GET /auth/flow/owner/billing-portal
Headers: { Authorization: Bearer <token> }
```

### Client Endpoints
```
POST /auth/flow/client/invite
Body: { email, phone, ownerAccountId }
Headers: { Authorization: Bearer <token> }

POST /auth/flow/client/accept-invite
Body: { token, password, firstName, lastName, smsOptIn }

POST /auth/flow/client/sms-consent
Body: { userId, phone, ipAddress, userAgent }

POST /auth/flow/client/verify-phone
Body: { userId, otp }
```

### Admin Endpoints
```
POST /auth/flow/admin/login
Body: { email, password }
```

## 🧪 Testing Without Stripe/Twilio

### SMS Testing
1. Call any endpoint that sends SMS
2. Check backend console for OTP code
3. Use logged code to verify

```javascript
// Backend console will show:
📱 SMS OTP for user-id: 123456 (expires in 10 minutes)
```

### Subscription Testing
All existing owners set to `subscription_status='active'` with 1-year expiry.
- SubscriptionGuard allows access
- No Stripe charges
- Billing portal returns mock URL

### Mock Responses
```javascript
// Stripe checkout
{ url: 'http://localhost:3000/mock-checkout', sessionId: 'mock_cs_12345' }

// Stripe billing portal  
{ url: 'http://localhost:3000/mock-portal' }
```

## 🔧 Configuration

### Environment Variables (.env)
```env
# Stripe (Phase 2 - currently mocked)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here
STRIPE_PLAN_ID=price_your_plan_id_here

# Twilio (Phase 3 - currently mocked)
TWILIO_ACCOUNT_SID=your_account_sid_here
TWILIO_AUTH_TOKEN=your_auth_token_here
TWILIO_PHONE_NUMBER=+1234567890
```

## 🚀 Enabling Real Stripe Integration

### Step 1: Add Stripe Keys
1. Get keys from https://dashboard.stripe.com/apikeys
2. Update `.env` with real keys
3. Restart backend

### Step 2: Uncomment Production Code

**packages/backend/src/stripe/stripe.service.ts**
```typescript
// Change isConfigured check:
private isConfigured = Boolean(
  process.env.STRIPE_SECRET_KEY && 
  !process.env.STRIPE_SECRET_KEY.includes('your_key_here')
);
```

**packages/backend/src/auth/guards/subscription.guard.ts**
```typescript
// Uncomment lines 35-38:
const ownerAccount = await this.getOwnerAccount(userId);
if (ownerAccount.subscription_status !== 'active' && 
    ownerAccount.subscription_status !== 'trialing') {
  throw new UnauthorizedException('Active subscription required');
}
```

**packages/backend/src/auth/auth-flow.service.ts**
```typescript
// Uncomment lines in ownerSignup() around line 85:
const checkoutUrl = await this.stripeService.createCheckoutSession({
  userId: user.id,
  email: dto.email,
  planId: process.env.STRIPE_PLAN_ID,
});

return { 
  message: 'Redirect to Stripe checkout', 
  checkoutUrl,
  userId: user.id 
};
```

### Step 3: Set Up Webhook
1. Create webhook in Stripe Dashboard
2. Point to: `https://yourdomain.com/stripe/webhook`
3. Add webhook secret to `.env`
4. Implement handlers in `stripe.service.ts` `handleWebhook()` method

## 🔐 Enabling Real SMS Integration

### Step 1: Add Twilio Credentials
1. Get credentials from https://console.twilio.com
2. Update `.env` with real credentials
3. Restart backend

### Step 2: Update SMS Service

**packages/backend/src/sms/sms.service.ts**
```typescript
// Uncomment lines 7-12 to enable Twilio client:
import twilio from 'twilio';

constructor() {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    this.client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
    this.isConfigured = true;
  }
}

// Uncomment real SMS sending in sendVerificationCode() around line 35:
await this.client.messages.create({
  body: `Your verification code is: ${code}`,
  to: phone,
  from: process.env.TWILIO_PHONE_NUMBER,
});
```

### Step 3: Replace In-Memory Storage
Replace `otpStore` Map with Redis:
```typescript
// Add redis dependency
import { Redis } from 'ioredis';

// Store OTP in Redis with TTL
await redis.setex(`otp:${userId}`, 600, code); // 10 min expiry
```

## 📝 Helper Scripts

### Check Setup Status
```bash
node check-auth-status.js
```
Shows users, owner accounts, venues, memberships, and subscription status.

### Activate Existing Owners
```bash
node set-owners-subscribed.js
```
Sets all existing owners to `subscription_status='active'` for testing.

### Run Migration
```bash
node run-auth-migration.js
```
Creates all auth tables and columns.

## 🎨 Frontend Integration

### Example: Owner Login
```typescript
const response = await fetch('http://localhost:3001/auth/flow/owner/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email, password })
});

const { user, session, ownerAccount } = await response.json();
// Store session.access_token for subsequent requests
```

### Example: Accept Client Invite
```typescript
const response = await fetch('http://localhost:3001/auth/flow/client/accept-invite', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    token: inviteTokenFromUrl,
    password: newPassword,
    firstName: 'Jane',
    lastName: 'Client',
    smsOptIn: true
  })
});

const { user, smsVerificationSent } = await response.json();
// If smsOptIn=true, prompt for OTP verification
```

## 🔒 Security Features

### RLS Policies
- ✅ Users can only see their own data
- ✅ Owners can see all data in their owner_accounts
- ✅ Admins have full access
- ✅ Security/staff roles can access guest lists

### Guards
- `SubscriptionGuard` - Requires active subscription (bypassed for testing)
- `RoleGuard` - Requires specific role(s)

### SMS Consent Tracking
Records for each opt-in:
- Timestamp
- IP address
- User agent
- Explicit consent flag

## 📚 Documentation References

- [Backend Structure](../docs/backend-structure.md)
- [Architecture Overview](../docs/architecture.md)
- [Supabase Setup](../../frontend/SUPABASE_SETUP.md)

## 🐛 Troubleshooting

### "Subscription required" error
Run: `node set-owners-subscribed.js` to activate owners

### Can't find OTP code
Check backend console output for SMS logs

### Stripe errors in testing mode
Normal - Stripe methods return mock data until configured

### RLS policy errors
Ensure user has proper membership and role assignments

## 🎯 Next Steps

1. **Start Backend**: `npm run start:dev`
2. **Test Endpoints**: Use Postman or create frontend pages
3. **Check Console**: SMS OTP codes appear in terminal
4. **Phase 2**: Add Stripe keys when ready
5. **Phase 3**: Add Twilio credentials when ready

---

**Current Branch**: `auth`  
**Created**: January 7, 2026  
**Status**: ✅ Backend complete, ready for testing
