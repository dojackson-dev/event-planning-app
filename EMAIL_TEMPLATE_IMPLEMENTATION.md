# EventEcos Email Template Implementation Guide

This guide is for the **Supabase project owner** to implement the custom EventEcos email confirmation template.

---

## 📋 What's Included

- **HTML Email Template**: `EVENTECOS_EMAIL_TEMPLATE.html`
- **Implementation Steps**: Below
- **Full Setup Instructions**: [EMAIL_AUTH_SETUP.md](EMAIL_AUTH_SETUP.md)

---

## 🚀 Quick Setup (5 minutes)

### Step 1: Open the Template File
1. In this repository, find: `EVENTECOS_EMAIL_TEMPLATE.html`
2. Open it with a text editor (VS Code, Sublime, etc.)
3. Select all text: **Ctrl+A** (Windows) or **Cmd+A** (Mac)
4. Copy it: **Ctrl+C** or **Cmd+C**

### Step 2: Apply to Supabase
1. Go to **[Supabase Dashboard](https://app.supabase.com)**
2. Select your **event-planning-app** project
3. Click **Authentication** (left sidebar)
4. Click **Email Templates**
5. Click **"Confirm sign up"** (the confirmation email template)

### Step 3: Replace the Template
1. You'll see the email editor with default Supabase template
2. Click the **Source** tab (not Preview)
3. Select all the current HTML: **Ctrl+A**
4. Delete it: **Delete** or **Backspace**
5. Paste the EventEcos template: **Ctrl+V**
6. Click **Save** button

### Step 4: Verify It Worked
1. Click **Preview** tab
2. You should see the EventEcos branded email template
3. The purple gradient header with "EventEcos" logo
4. "Confirm Your Email" button
5. All the features listed

✅ **Done!** The email template is now active.

---

## 🧪 Test the Email

1. Go to your frontend app: `http://localhost:3000/signup`
2. Create a test account with a real email you can access
3. You should receive the **EventEcos branded confirmation email**
4. Click the confirmation link
5. You'll be logged in automatically

---

## ⚙️ Enable Email Confirmations

Before the template is used, you need to enable email confirmations in Supabase:

1. **Authentication** → **Providers**
2. Find **Email** and expand it
3. Toggle **"Email Confirmations"** to ON
   - *If toggle is grayed out:* You need to configure SMTP first
   - See [EMAIL_AUTH_SETUP.md](EMAIL_AUTH_SETUP.md) for SMTP setup

4. **Authentication** → **URL Configuration**
5. Add these redirect URLs:
   ```
   http://localhost:3000/auth/callback
   http://localhost:3001/auth/callback
   https://yourdomain.com/auth/callback
   ```
   (Replace `yourdomain.com` with your actual production domain)

6. Click **Save**

---

## 🎨 Customizing the Template

If you want to customize colors, text, or links:

1. Open `EVENTECOS_EMAIL_TEMPLATE.html` in a text editor
2. **Find and replace** these common elements:
   - **Brand colors**: Search for `#667eea` and `#764ba2` (purple)
   - **Company name**: Search for `EventEcos`
   - **Support email**: Search for `support@eventecos.com`
   - **Website URL**: Search for `https://eventecos.com`
   - **Feature list**: Edit the bullet points under "What you can do with EventEcos"

3. Save your changes
4. Re-paste into Supabase following **Step 2-3** above
5. Test in the Preview tab

---

## 📧 Important Template Variables

**These must stay unchanged** - Supabase replaces them automatically:

```html
{{ .ConfirmationURL }}      ← The full confirmation link
{{ .Token }}                 ← Just the token (if building custom link)
{{ .EmailAddress }}          ← User's email address
{{ .SiteURL }}               ← Your site URL
```

**Example:** When sent to user, `{{ .ConfirmationURL }}` becomes:
```
https://unzfkcmmakyyjgruexpy.supabase.co/auth/v1/verify?token=...&type=signup
```

---

## 🔒 What Happens When User Signs Up

1. ✅ User creates account on signup page
2. ✅ Backend validates and stores user
3. ✅ Supabase sends **EventEcos email template** automatically
4. ✅ Email contains confirmation link ({{ .ConfirmationURL }})
5. ✅ User clicks link → redirected to `/auth/callback`
6. ✅ Session created automatically
7. ✅ User logged in and redirected to dashboard

---

## ❓ Troubleshooting

### Email not arriving
- Check spam/junk folder
- Verify SMTP is configured in Supabase
- Check Supabase logs: **Authentication** → **User Management**
- Try resending email using `/confirm-email` page

### Template looks wrong in preview
- Make sure you're in the **Source** tab when pasting
- Not the **Preview** tab
- Refresh the page after saving

### Users see plain text instead of HTML
- Check email client (some strip HTML)
- Verify the template is saved in Supabase
- Test with different email providers (Gmail, Outlook, etc.)

### Confirmation link not working
- Verify redirect URL is added: **Authentication** → **URL Configuration**
- Check `/auth/callback` page exists in frontend code
- Link expires in 24 hours - test within that window

---

## 📚 Related Files in Repository

- **Frontend Pages:**
  - `packages/frontend/src/app/auth/callback/page.tsx` - Handles email confirmation
  - `packages/frontend/src/app/confirm-email/page.tsx` - "Check your email" page
  - `packages/frontend/src/app/register/page.tsx` - Signup form

- **Backend Services:**
  - `packages/backend/src/auth/auth-flow.service.ts` - Creates accounts + sends emails
  - `packages/backend/src/supabase/supabase.service.ts` - Supabase client

- **Documentation:**
  - `EMAIL_AUTH_SETUP.md` - Complete Supabase setup guide
  - `EMAIL_AUTH_IMPLEMENTATION.md` - Code implementation details

---

## ✅ Verification Checklist

- [ ] Email confirmations enabled in Supabase
- [ ] SMTP configured (or using Supabase's built-in)
- [ ] Redirect URLs added to Supabase
- [ ] `EVENTECOS_EMAIL_TEMPLATE.html` pasted into "Confirm sign up" template
- [ ] Template preview shows EventEcos branding
- [ ] Test signup completed
- [ ] Confirmation email received
- [ ] Clicked confirmation link
- [ ] User logged in automatically
- [ ] Redirected to dashboard

---

## 📞 Support

If issues arise:
1. Check the **Troubleshooting** section above
2. Review `EMAIL_AUTH_SETUP.md` for detailed Supabase configuration
3. Check Supabase logs for error messages
4. Check browser console (F12) for frontend errors

---

**All set! Your EventEcos email confirmation is ready to go.** 🚀
