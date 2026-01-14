# Owner Onboarding System Implementation

## Overview
A complete owner registration and onboarding flow has been implemented that captures venue owner details, collects facility information with the ability to add multiple facilities, processes payment, and provides demo access options.

## Components Created

### Frontend

**Onboarding Page** (`/src/app/onboarding/page.tsx`)
- 3-step form: Details → Payment → Activation
- Step 1 (Details):
  - Owner personal info (first/last name)
  - Company information (name, type, contact details, address)
  - Multiple facilities management with add/remove buttons
  - Facility details: name, address, city, state, zip
- Step 2 (Payment):
  - $500/month subscription pricing display
  - Stripe payment placeholder
  - Demo mode option
- Step 3 (Activation):
  - Choose between demo mode (free 30-day trial) or paid access
  - Redirects to dashboard after activation

**Auth Flow Updates**:
- `AuthContext.tsx`: Updated login function to accept optional `redirectPath` parameter
- `login/page.tsx`: Added support for `redirect=onboarding` query parameter
- `register/page.tsx`: Redirects new registrations to `/login?redirect=onboarding`

### Backend

**Owners Module** (`/src/owners/`)
- `owners.controller.ts`: REST API endpoints
  - `POST /owners/onboarding` - Save owner details and facilities
  - `POST /owners/activate` - Activate account in demo or paid mode
  - `POST /owners/check-status` - Check onboarding completion status
- `owners.service.ts`: Database operations for owner profiles
- `owners.module.ts`: NestJS module with dependencies

**Database Migration** (`/migrations/create-owner-profiles-table.sql`)
- `owner_profiles` table schema with:
  - Personal info fields (first_name, last_name)
  - Company info (company_name, email, phone, address, city, state, zip)
  - Business type
  - Facilities data (stored as JSONB array)
  - Account status tracking (pending_payment, demo_active, active)
  - Payment status
  - Timestamps and activation date
- RLS policies for data security
- Unique constraints on user_id and company_email

## Flow Diagram

```
New User Registration
    ↓
    → /register (collect email, password, name, role)
    ↓
Success Message (3 second redirect)
    ↓
    → /login?redirect=onboarding (user logs in)
    ↓
    → /onboarding (Step 1: Details)
       - Personal info
       - Company info
       - Facilities (add multiple with +button)
       - Submit to backend
    ↓
    → /onboarding (Step 2: Payment)
       - Display $500/month pricing
       - Option to proceed with payment or try demo
    ↓
    → /onboarding (Step 3: Activation)
       - Choose demo (30-day free) or full access (paid)
       - Save activation preference to database
    ↓
    → /dashboard (Account fully activated)

Note: If user closes browser or doesn't complete onboarding,
they return to where they left off when logging in again.
```

## Data Persistence

All onboarding data is saved to Supabase:
- Step 1 data saved via `POST /owners/onboarding` (upsert)
- Step 2 leads to Step 3 (no separate save)
- Step 3 final activation via `POST /owners/activate`

Upsert pattern allows users to revisit and update their details.

## Key Features

✅ Multi-facility support with add/remove buttons
✅ Progressive form with step-by-step guidance
✅ Payment placeholder ($500/month)
✅ Free demo mode option (30-day trial)
✅ Session persistence (redirects to last step on re-login)
✅ RLS-protected database (owners can only access their own data)
✅ Stripe-ready payment infrastructure
✅ One-time onboarding (doesn't appear after first setup)

## Database Schema

```sql
owner_profiles {
  id: UUID (primary key)
  user_id: UUID (foreign key to auth.users)
  first_name: TEXT
  last_name: TEXT
  company_name: TEXT (required)
  company_email: TEXT (required, unique)
  company_phone: TEXT (required)
  company_address: TEXT
  company_city: TEXT
  company_state: TEXT
  company_zip: TEXT
  business_type: TEXT
  number_of_facilities: INTEGER
  facilities_data: JSONB (array of facility objects)
  status: TEXT (pending_payment, demo_active, active)
  payment_status: TEXT (pending, completed)
  activated_at: TIMESTAMPTZ
  created_at: TIMESTAMPTZ
  updated_at: TIMESTAMPTZ
}
```

## Next Steps

1. **Run migration** in Supabase SQL Editor:
   - Execute `migrations/create-owner-profiles-table.sql`

2. **Test the flow**:
   - Register new owner account
   - Add facilities (test add/remove button)
   - Choose demo or payment
   - Verify redirect to dashboard
   - Log out and back in to verify persistence

3. **Implement Stripe integration**:
   - Replace payment placeholder with real Stripe checkout
   - Handle webhook confirmations
   - Update database on successful payment

4. **Add demo limits** (optional):
   - Limit events/team members in demo mode
   - Set 30-day expiration for demo accounts
   - Send trial expiration reminder emails

5. **Email notifications** (optional):
   - Welcome email on account activation
   - Trial expiration warnings
   - Payment confirmation emails
