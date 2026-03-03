# Free Trial + Stripe Integration Guide

## Overview

The system now has a **30-day free trial** before requiring Stripe payment. Owners sign up, get full access for 30 days, then are prompted to upgrade when the trial ends.

## System Architecture

### Database Schema

**New columns in `owner_accounts`:**
- `trial_ends_at` (TIMESTAMP) - When the trial expires
- `trial_days_used` (INTEGER) - Tracking usage (optional)

**New table `app_settings`:**
- Stores configurable settings like `FREE_TRIAL_DAYS` (default: 30)

### Subscription Statuses
- `trial` - Free trial period active
- `active` - Paid subscription active
- `expired` - Trial ended, needs payment
- `cancelled` - Subscription cancelled

## Flow

### 1. Registration
```
Owner signs up → Trial created (30 days) → Full access
```

On `POST /auth-flow/owner-signup`:
- Create auth user
- Create owner_account with `subscription_status: 'trial'`
- Create trial (sets `trial_ends_at` to 30 days from now)
- Create user record, membership, and first venue
- Return user, ownerAccountId, and trial info

### 2. Login
```
Owner logs in → Check if trial active → If expired, redirect to Stripe
```

On every login (or dashboard load):
- Call `GET /trial/info` to check trial status
- If `isActive: false`, show modal: "Your trial has ended"
- Offer Stripe checkout or billing portal

### 3. Trial Active
- Owner has full access
- Optional: Show countdown "12 days remaining"

### 4. Trial Expired
- Access restricted (optional enforcement)
- Modal prompts to upgrade
- Redirect to `POST /stripe/checkout` to create Stripe session

## API Endpoints

### Trial Information
```
GET /trial/info
Returns: { isActive, endsAt, daysRemaining }
Requires: JWT token (owner)
```

### Admin: Get Default Trial Days
```
GET /trial/settings/default-days
Returns: { defaultTrialDays: 30 }
Requires: JWT token (owner/admin)
```

### Admin: Set Default Trial Days
```
POST /trial/settings/default-days
Body: { "days": 45 }
Returns: { message, defaultTrialDays }
Requires: JWT token (admin)
```

## Configuration

### Change Default Trial Days

**Option 1: Direct API Call**
```bash
curl -X POST http://localhost:3001/trial/settings/default-days \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"days": 45}'
```

**Option 2: Database Direct**
```sql
UPDATE app_settings SET value = '45' WHERE key = 'FREE_TRIAL_DAYS';
```

**Option 3: Admin Dashboard** (future)
Add a settings page where admins can change trial days.

## Frontend Implementation

### Login Component
```typescript
const { data: trialInfo } = await api.get('/trial/info');

if (!trialInfo.isActive) {
  showModal('Your trial has ended. Upgrade now to continue.');
  // Redirect to Stripe checkout
  window.location.href = 'https://checkout.stripe.com/...';
}
```

### Dashboard
```typescript
if (trialInfo.isActive) {
  return <TrialCountdown daysRemaining={trialInfo.daysRemaining} />;
}
```

## Stripe Integration

When trial expires:

1. **Call Stripe Checkout**
   ```
   POST /stripe/checkout
   ```

2. **User completes payment**
   - Stripe webhook fires: `checkout.session.completed`
   - Backend creates subscription: `sub_xxxx`
   - Updates `owner_accounts`:
     - `subscription_status: 'active'`
     - `stripe_subscription_id: 'sub_xxxx'`

3. **User redirected to dashboard**
   - Full access restored

## Cost Control

### Free Trial Limitations (optional)
You can restrict features during trial:
- Limit events to 5
- Limit guests to 100
- Limited reporting

Implement in guards:
```typescript
@Injectable()
export class TrialFeatureGuard {
  async canActivate(context) {
    const owner = context.switchToHttp().getRequest().user;
    const trial = await trialService.getTrialInfo(owner.ownerAccountId);
    
    if (trial.isActive && owner.eventCount >= 5) {
      throw new ForbiddenException('Trial limited to 5 events. Upgrade to continue.');
    }
  }
}
```

## Testing

### Create a Test Owner with Trial
```bash
node test-trial-setup.js
```

### Check Trial Status
```bash
curl -H "Authorization: Bearer JWT_TOKEN" \
  http://localhost:3001/trial/info
```

### Manually Expire Trial (for testing)
```bash
psql -U postgres -h localhost -d dovenue \
  -c "UPDATE owner_accounts SET trial_ends_at = NOW() - INTERVAL '1 day' WHERE id = 'owner-id';"
```

## Files Created/Modified

- **New:** `/backend/migrations/add-trial-support.sql`
- **New:** `/backend/src/trial/trial.service.ts`
- **New:** `/backend/src/trial/trial.controller.ts`
- **New:** `/backend/src/trial/trial.module.ts`
- **Modified:** `/backend/src/auth/auth-flow.service.ts` - Added trial creation
- **Modified:** `/backend/src/auth/auth.module.ts` - Import TrialModule

## Next Steps

1. **Run migration** to add trial columns and settings table
2. **Update frontend login** to check trial status
3. **Add trial countdown UI** to dashboard
4. **Create expired trial modal** with Stripe checkout link
5. **Test end-to-end** flow: signup → 30 days → expire → Stripe
