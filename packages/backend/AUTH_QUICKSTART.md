# Auth Architecture - Quick Start

## ✅ Setup Complete!

Your authentication system is fully implemented and ready for testing.

## 🎯 What You Have

### Database
- 5 new tables: `owner_accounts`, `venues`, `memberships`, `client_profiles`, `invites`
- Users table extended with verification and SMS consent fields
- Row Level Security (RLS) policies configured
- 1 active owner account: **owner@test.com** (password: owner123)

### Backend Services
- Complete auth flow for Owner/Client/Admin roles
- SMS verification (mock - codes log to console)
- Stripe integration (mock - returns test URLs)
- Subscription checking (bypassed for testing)
- Role-based access guards

## 🚀 Quick Test

### 1. Start Backend
```bash
cd packages/backend
npm run start:dev
```

### 2. Test Owner Login
```bash
curl -X POST http://localhost:3001/auth/flow/owner/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@test.com","password":"owner123"}'
```

Expected response:
```json
{
  "user": { "id": "...", "email": "owner@test.com", "role": "owner" },
  "session": { "access_token": "...", "expires_at": "..." },
  "ownerAccount": { 
    "id": "...", 
    "subscription_status": "active",
    "business_name": "Test's Venue" 
  }
}
```

### 3. Check Status
```bash
node check-auth-status.js
```

## 📋 Test User Credentials

| Email | Password | Role | Status |
|-------|----------|------|--------|
| owner@test.com | owner123 | owner | ✅ Active subscription |
| admin@dovenuesuites.com | Admin123! | admin | ✅ Active |

## 🔧 Helper Commands

```bash
# View current setup
node check-auth-status.js

# Re-activate all owners (if needed)
node set-owners-subscribed.js

# View table schemas
node check-schema.js
```

## 📡 Available Endpoints

### Owner Routes
- `POST /auth/flow/owner/signup` - Create new owner account
- `POST /auth/flow/owner/login` - Login existing owner
- `POST /auth/flow/owner/verify-phone` - Verify phone with OTP
- `GET /auth/flow/owner/billing-portal` - Get billing portal URL (mock)

### Client Routes
- `POST /auth/flow/client/invite` - Send invite to client
- `POST /auth/flow/client/accept-invite` - Accept invite and create account
- `POST /auth/flow/client/sms-consent` - Record SMS opt-in
- `POST /auth/flow/client/verify-phone` - Verify client phone

### Admin Routes
- `POST /auth/flow/admin/login` - Admin login (email only)

## 🧪 Testing Features

### SMS Verification
When you call endpoints that send SMS:
1. Check backend console for OTP code
2. Code looks like: `📱 SMS OTP for user-id: 123456`
3. Use that code in verify-phone endpoint

### Subscription Status
- All owners set to `active` subscription
- Expires 1 year from today
- No Stripe charges in testing mode
- Guards allow access without real subscription

### Mock Responses
- Stripe checkout: Returns `http://localhost:3000/mock-checkout`
- Billing portal: Returns `http://localhost:3000/mock-portal`
- SMS: Logs to console instead of sending

## 🔐 Security

- ✅ Row Level Security enabled on all tables
- ✅ Users can only access their own data
- ✅ Owners see all data in their accounts
- ✅ Admins have full access
- ✅ SMS consent tracked with IP/timestamp/user-agent

## 📚 Full Documentation

See [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) for:
- Complete API documentation
- How to enable real Stripe integration
- How to enable real SMS/Twilio
- Frontend integration examples
- Troubleshooting guide

## 🎯 Next Steps

1. **Test the endpoints** using Postman or curl
2. **Create frontend pages** for signup/login/invite
3. **Add Stripe keys** when ready (Phase 2)
4. **Add Twilio credentials** when ready (Phase 3)

## 💡 Tips

- Backend must be running to test endpoints
- SMS codes appear in backend terminal
- Use `check-auth-status.js` to verify data
- All test data is in Supabase database
- Guards are configured but bypassed for testing

## ❓ Questions?

Check [AUTH_IMPLEMENTATION.md](AUTH_IMPLEMENTATION.md) for detailed documentation.

---

**Branch**: `auth`  
**Status**: ✅ Ready for testing  
**Created**: January 7, 2026
