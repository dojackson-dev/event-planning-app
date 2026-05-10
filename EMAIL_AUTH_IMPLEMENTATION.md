# Email Authentication Implementation Guide

This guide shows how to integrate email confirmation into your existing registration flows.

## 📌 Current State

Your backend (`auth-flow.service.ts`) already:
- ✅ Calls `supabase.auth.signUp()` which sends confirmation emails when enabled
- ✅ Sets `email_verified: false` on new accounts
- ✅ Supports session-based auth

What's needed:
- Frontend redirect to confirmation page
- Email confirmation callback handler
- Update to show appropriate UX

## 🔄 Registration Flow Options

### Option A: Require Email Confirmation (Recommended)

**User Experience:**
1. User fills signup form
2. Backend creates account
3. Supabase sends confirmation email
4. App shows "Check Your Email" page
5. User clicks link in email
6. User is logged in automatically
7. Redirected to dashboard

**Implementation:**

In `packages/frontend/src/app/register/page.tsx`:

```typescript
// In handleSubmit, after successful signup:
setSuccess(true)

// Store the email for the confirm-email page
localStorage.setItem('pending_email', email)

// Redirect to email confirmation page instead of dashboard
setTimeout(() => router.push('/confirm-email'), 1000)
```

### Option B: Allow Immediate Access (Less Secure)

**User Experience:**
1. User fills signup form
2. Backend creates account
3. User is logged in immediately
4. Confirmation email sent in background
5. App may prompt for email verification later

**Implementation:**

Keep your current flow - it already works this way. The confirmation email is still sent, but users aren't forced to verify before accessing the app.

---

## 🔧 Code Changes Required

### Update `packages/frontend/src/app/register/page.tsx`

Replace the success handling section:

```typescript
// BEFORE:
setSuccess(true)
setTimeout(() => router.push('/dashboard'), 2500)

// AFTER (Option A):
localStorage.setItem('pending_email', email)
setSuccess(true)
setTimeout(() => router.push('/confirm-email'), 1000)

// OR AFTER (Option B - keep as is):
setSuccess(true)
setTimeout(() => router.push('/dashboard'), 2500)
```

### Update other registration pages similarly:

These files use similar patterns:
- `packages/frontend/src/app/vendors/register/page.tsx` (vendor signup)
- `packages/frontend/src/app/promoter/register/page.tsx` (promoter signup)
- `packages/frontend/src/app/artist/register/page.tsx` (artist signup)

---

## 🚀 Environment Variables

Make sure these are set in `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://unzfkcmmakyyjgruexpy.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
```

---

## 🧪 Testing

### Step 1: Enable Email Confirmations

1. Go to Supabase Dashboard
2. Authentication → Providers → Email → Enable "Email Confirmations"
3. Authentication → URL Configuration → Add `http://localhost:3000/auth/callback`

### Step 2: Test Signup

1. Go to `http://localhost:3000/signup`
2. Sign up as venue owner
3. Check your email (check spam folder)
4. Click the confirmation link
5. Should be logged in and redirected to dashboard

### Step 3: Test Resend

1. Go through signup again
2. Go to `/confirm-email` page
3. Click "Resend email" button
4. Should receive confirmation email again

---

## 📧 Customization Options

### 1. Email Template

Customize the confirmation email in Supabase Dashboard:
- Authentication → Email Templates → Confirmation email
- Edit HTML and customize branding

### 2. Redirect URL

The callback page (`/auth/callback`) is automatically created and will:
- Exchange the confirmation code for a session
- Redirect to dashboard on success
- Show error message if confirmation fails

### 3. Pending Email Page

The `/confirm-email` page shows:
- Which email to check
- Instructions for confirmation
- Resend email button
- Help links

---

## ✅ Verification Checklist

- [ ] Email confirmations enabled in Supabase
- [ ] Redirect URLs added to Supabase (`/auth/callback`)
- [ ] Updated register page to redirect to `/confirm-email`
- [ ] Tested signup flow locally
- [ ] Checked that confirmation email arrives
- [ ] Tested clicking confirmation link
- [ ] Verified user is logged in after confirmation
- [ ] Tested resend email functionality
- [ ] Customized email template (optional)

---

## 🐛 Troubleshooting

### Email not arriving

```
Check:
- Supabase logs (Authentication → User Management)
- Email address is correct
- Check spam/junk folder
- If using custom SMTP, verify credentials
```

### Confirmation link not working

```
Check:
- /auth/callback route exists
- Redirect URL in Supabase URL Configuration
- Link hasn't expired (24 hours max)
- Try resending email
```

### Session not created after confirmation

```
Check:
- `exchangeCodeForSession()` called in /auth/callback
- localStorage is being set
- No browser console errors
- Supabase client is initialized correctly
```

---

## 📚 Related Files

- [EMAIL_AUTH_SETUP.md](../EMAIL_AUTH_SETUP.md) - Supabase configuration guide
- [packages/frontend/src/app/auth/callback/page.tsx](packages/frontend/src/app/auth/callback/page.tsx) - Email confirmation handler
- [packages/frontend/src/app/confirm-email/page.tsx](packages/frontend/src/app/confirm-email/page.tsx) - Pending confirmation UI
- [packages/backend/src/auth/auth-flow.service.ts](packages/backend/src/auth/auth-flow.service.ts) - Backend signup logic
