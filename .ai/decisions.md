# Decisions

Record architectural and product decisions here so agents and developers don't relitigate them.

## Format

```
## [date] Short title
**Decision:** What was decided.
**Reason:** Why.
**Alternatives considered:** What else was evaluated.
**Impact:** Files or areas affected.
```

---

## 2026-06-03 VIP purchase redirects to event page
**Decision:** After a successful VIP checkout, Stripe redirects to `/events/[id]?vip_paid=true`.
**Reason:** Keeps the user on a familiar page; confirmation banner shown at top.
**Alternatives considered:** Separate `/vip/success` page.
**Impact:** `packages/frontend/src/app/events/[id]/vip/page.tsx`, `packages/frontend/src/app/events/[id]/page.tsx`

## 2026-06-03 VIP email + SMS on purchase
**Decision:** After VIP checkout completes (Stripe webhook), send confirmation email via Resend and SMS via Twilio.
**Reason:** Buyers need the QR code delivered immediately.
**Alternatives considered:** Email only.
**Impact:** `packages/backend/src/vip/vip.service.ts`, `packages/backend/src/mail/mail.service.ts`, `packages/backend/src/messaging/sms-notifications.service.ts`
