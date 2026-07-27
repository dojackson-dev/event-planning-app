# Email Authentication Setup with Supabase

This guide walks you through enabling email authentication with confirmation for new user registrations.

## 📋 Overview

When users sign up:
1. They create an account with email/password
2. Supabase sends them a confirmation email
3. They click the link to verify their email
4. They're logged in automatically

## 🔧 Setup Steps

### Step 1: Enable Email Confirmations in Supabase

1. **Go to Supabase Dashboard** → [https://app.supabase.com](https://app.supabase.com)
2. **Select your project** (event-planning-app)
3. **Left sidebar** → **Authentication** → **Providers**
4. **Find "Email"** and click to expand
5. **Enable these settings:**
   - ✅ **Email Confirmations** → Toggle ON (required for sign-ups)
   - ✅ **Secure email change** → Toggle ON (optional, for email changes)
   - ✅ **Double confirm changes** → Toggle OFF (optional)

### Step 2: Set Auth Redirect URLs

1. **Authentication** → **URL Configuration**
2. **Add these redirect URLs:**
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   https://yourdomain.com/auth/callback
   ```
3. **Click Save**

⚠️ **Important**: Your redirect URLs MUST match your email template links below.

### Step 3: Customize Email Template (Optional)

1. **Authentication** → **Email Templates**
2. **Click on "Confirmation email"** template
3. **Customize the email HTML**

#### Example Professional Template

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif; }
      .container { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
      .header { text-align: center; margin-bottom: 30px; }
      .logo { font-size: 24px; font-weight: bold; color: #000; }
      .content { background: #f8f9fa; border-radius: 8px; padding: 40px; text-align: center; }
      .title { font-size: 28px; font-weight: bold; color: #1a1a1a; margin-bottom: 16px; }
      .subtitle { font-size: 16px; color: #666; margin-bottom: 32px; line-height: 1.5; }
      .button { display: inline-block; background: #0066cc; color: white; padding: 14px 40px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 16px; }
      .button:hover { background: #0052a3; }
      .footer { text-align: center; margin-top: 30px; font-size: 12px; color: #999; }
      .link-text { font-size: 12px; color: #999; word-break: break-all; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="header">
        <div class="logo">DoVenueSuite</div>
      </div>
      
      <div class="content">
        <div class="title">Welcome to DoVenueSuite!</div>
        <div class="subtitle">
          Click the button below to confirm your email address and activate your account.
        </div>
        <a href="{{ .ConfirmationURL }}" class="button">Confirm Email Address</a>
        
        <div style="margin-top: 30px; text-align: center;">
          <div class="link-text">Or copy this link:</div>
          <div class="link-text">{{ .ConfirmationURL }}</div>
        </div>
      </div>
      
      <div class="footer">
        <p>This link will expire in 24 hours</p>
        <p>© 2024 DoVenueSuite. All rights reserved.</p>
      </div>
    </div>
  </body>
</html>
```

**Template Variables:**
- `{{ .ConfirmationURL }}` - The full confirmation link
- `{{ .Token }}` - Just the token (to build custom link)
- `{{ .EmailAddress }}` - User's email
- `{{ .SiteURL }}` - Your site URL

## 💻 Frontend Implementation

### Already Created Files:

1. **[packages/frontend/src/app/auth/callback/page.tsx](packages/frontend/src/app/auth/callback/page.tsx)**
   - Handles the email confirmation callback
   - Exchanges the confirmation code for a session
   - Redirects to dashboard on success

2. **[packages/frontend/src/app/confirm-email/page.tsx](packages/frontend/src/app/confirm-email/page.tsx)**
   - Shows pending confirmation screen
   - Allows resending confirmation email
   - Displays email where confirmation was sent

### Update Registration Flow

To use email confirmation, update your register pages to:

1. **After successful signup**, redirect to confirm-email page:
   ```typescript
   // In packages/frontend/src/app/register/page.tsx
   localStorage.setItem('pending_email', email)
   router.push('/confirm-email')
   ```

2. **Update `NEXT_PUBLIC_SUPABASE_URL` redirect** in your `.env.local`:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=https://unzfkcmmakyyjgruexpy.supabase.co
   ```

## 🧪 Testing Email Confirmation

### Local Development with Ethereal Email

For testing without a real email provider:

1. **Create free Ethereal account**: https://ethereal.email/
2. **Enable Ethereal in Supabase**:
   - Authentication → Email Templates
   - Click the SMTP settings link
   - Add Ethereal credentials
3. **Sign up** and check Ethereal inbox to get the confirmation link

### Production with Real Email

Supabase uses its own email service by default. For higher deliverability:

1. **Use SendGrid, Gmail, or AWS SES**
2. **Configure SMTP in Supabase Dashboard** → Authentication → SMTP Settings
3. **Test with a real email address**

## 🔐 Security Considerations

1. **Confirmation links expire in 24 hours** (not configurable in free tier)
2. **Users can resend** the confirmation email if needed
3. **Email must be verified** before accessing sensitive areas
4. **Use `email_verified` field** to track confirmation status:
   ```typescript
   const { data: { user } } = await supabase.auth.getUser()
   if (!user.email_confirmed_at) {
     // Show warning or redirect to confirm-email
   }
   ```

## 🛠️ Common Issues

### Issue: Email not arriving

**Solutions:**
- Check spam/junk folder
- Verify SMTP settings if using custom provider
- Check Supabase logs: Authentication → User Management
- Resend the email

### Issue: Confirmation link not working

**Solutions:**
- Check redirect URL is in URL Configuration
- Verify link hasn't expired (24 hours)
- Try clicking "Resend" in confirm-email page
- Check browser console for errors

### Issue: User not logged in after confirmation

**Solutions:**
- Check `exchangeCodeForSession()` is called in callback page
- Verify session is stored in localStorage
- Check for CORS issues in browser console
- Restart application

## 📱 Mobile & App Implementation

If using with mobile app (packages/mobile):

```typescript
// In your React Native Supabase client
const { data } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123',
})

// User receives email, clicks link from mobile device
// Supabase should redirect to your app with deep link
```

For deep linking, configure your mobile app to handle:
```
myapp://auth/callback?code=...
```

## 📚 Supabase Documentation

- [Email Authentication Guide](https://supabase.com/docs/guides/auth/auth-email)
- [Custom Email Templates](https://supabase.com/docs/guides/auth/email-templates)
- [NextJS Auth Helpers](https://supabase.com/docs/guides/auth/auth-helpers/nextjs)
- [Email OTP](https://supabase.com/docs/guides/auth/auth-email-otp)

## ✅ Checklist

- [ ] Email confirmations enabled in Supabase
- [ ] Redirect URLs configured
- [ ] Email template customized (optional)
- [ ] `auth/callback` page created
- [ ] `confirm-email` page created
- [ ] Register pages updated to redirect to confirm-email
- [ ] SMTP configured (if using custom provider)
- [ ] Tested in development
- [ ] Tested in production
