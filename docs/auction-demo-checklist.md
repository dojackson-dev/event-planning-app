# Auction Center - demo test checklist

Branch: `auction` (not merged to `main`/`dev`; deploy to `demo` only for testing).

## 1. One-time setup (demo)

1. Run these migrations on the demo Supabase project (`rrljixodciaptldnzeoc`), in order:
   1. `packages/backend/migrations/create-auctions.sql`
   2. `packages/backend/migrations/create-auction-functions.sql`
   3. `packages/backend/migrations/create-auction-bidding-additions.sql`
   4. `packages/backend/migrations/create-auction-payments-additions.sql`
2. Demo backend (Render) env:
   - `AUCTIONS_ENABLED=true`
   - `AUCTION_SESSION_SECRET=<32+ random characters>` (required when enabled in production)
   - `FRONTEND_URL=https://demo.eventecos.com` (pay-link success/cancel URLs are built from it)
   - `STRIPE_TAX_ENABLED` unset/false unless Stripe Tax is configured in the test account
   - Email (Resend/SMTP) and Twilio vars already used by other features (OTP uses both)
3. Demo frontend (Vercel) env: `NEXT_PUBLIC_API_URL` (demo backend) and `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` (`pk_test_...`).
4. Stripe test webhook for the demo backend: add `setup_intent.succeeded`, `payment_intent.succeeded`, `payment_intent.payment_failed`, `checkout.session.completed`, `charge.refunded`, `charge.dispute.created`.
5. The promoter account must be a verified non-profit with an active Stripe Connect account (demo: `marcus@demopromoter.com`, password `Demo@2024!`).

## 2. Promoter flow (`/dashboard/promoter/auctions`)

- [ ] Auctions link shows in the promoter nav only for a verified non-profit.
- [ ] Create auction (end at least 1 hour out) and see it in the list as Draft.
- [ ] Add one auction item (starting bid, increment, reserve, buy-now, fair market value, photo upload) and one fixed-price item.
- [ ] Publish is rejected with a list of issues when an item has no fair market value; succeeds once fixed.
- [ ] After a bid lands: price terms on that item are locked, delete is blocked, withdraw works.
- [ ] Staff team member sees data but no write buttons.
- [ ] Bids, Bidders (block/unblock) and Orders tabs load; CSV exports download.

## 3. Bidder flow (`/auctions`, incognito window)

- [ ] List and auction pages load; countdown follows server time; price updates within about 3 seconds.
- [ ] Register: details + consent, email code, SMS code, then card (Stripe test card `4242 4242 4242 4242`).
- [ ] Bid below the minimum is rejected with the new minimum shown.
- [ ] Manual bid, then a max bid; a second bidder outbids; "You are winning" badge flips.
- [ ] Bid over the large-bid threshold asks for a second confirmation.
- [ ] Soft close: a bid in the final minutes extends the end time.
- [ ] Buy it now and fixed-price purchase charge the saved card.
- [ ] Log in again with an emailed code; My bids shows limit, leading items, orders.
- [ ] Blocked bidder cannot bid; unblocking restores access.

## 4. Close and payment

- [ ] After the end time the closer marks items sold / reserve_not_met / unsold and creates orders.
- [ ] Winner card is charged off-session; order becomes Paid; receipt email sent.
- [ ] Card `4000 0000 0000 9995` (decline): order fails; promoter can Send pay link / Retry / Mark paid offline / Cancel.
- [ ] Card `4000 0025 0000 3155` (3-D Secure): order is requires_action; the pay link completes it.
- [ ] `/auctions/pay/<token>`: summary renders, "Pay securely" opens hosted Checkout, return shows the confirmation banner (hosted Checkout needs a real browser session).
- [ ] Expired or invalid token shows a clear message.
- [ ] Refund in Stripe marks the order refunded (`charge.refunded`).

## 5. Off-switch

- [ ] With `AUCTIONS_ENABLED=false`, every `/auctions/public/*` call returns 404 and `/auctions` shows "not available".

## 6. Security review notes (public surface)

Verified in code:
- Bidder token: HMAC-SHA256 signed, 7-day expiry, per-purpose derived keys, constant-time compare; bidder row re-read on every request so blocks and re-issued tokens apply immediately; token bound to one auction.
- OTP: 6 digits from `crypto.randomInt`, hashed at rest, 5 verify attempts with compare-and-set increment, per-destination limits (3 per 10 min, 10 per day), per-IP limit (20 per hour), global SMS cap (500 per hour default).
- Registration and login responses do not reveal whether an account exists; partial email/phone matches return a generic conflict.
- Public views are explicit whitelists: no reserve amount, leader id, bidder contact data, Stripe ids or error text.
- All routes sit behind `AuctionsEnabledGuard` and throttling; bids are decided inside database functions (`place_auction_bid`, `claim_*`), not in app code.
- Frontend: `next` redirect parameter only accepts `/auctions/...` paths; card data goes directly to Stripe; Checkout redirect only follows `https://` URLs; promoter-supplied text is rendered as text (no HTML injection).

Residual risks (not changed here):
- `clientIp()` trusts the first `x-forwarded-for` entry, so a caller can spoof it to dodge the per-IP OTP limit. Damage is bounded by the per-destination and global SMS caps. Fix once the number of trusted proxies in front of Render is confirmed (use the Nth-from-right entry).
- The bidder token lives in `localStorage` (readable by any XSS). Acceptable for a 7-day, single-auction, revocable token; revisit if an httpOnly cookie is preferred.
- Stripe Tax needs a billing postal code; the Payment Element collects it for cards, but verify tax on a test order before enabling `STRIPE_TAX_ENABLED`.
- Frontend has no automated tests (no test runner in `packages/frontend`); adding `vitest` + Testing Library would need approval as a new dev dependency.

## 7. Organization pages and item donations

One-time setup: run `packages/backend/migrations/create-auction-organizations.sql` in the Supabase SQL editor (idempotent; after the other auction migrations). Until it is applied the public auction pages keep working on their original columns, but the organization, slug and donation features are unavailable.

Organizer (`/dashboard/promoter/auctions`):
- [ ] Create the organization profile: pick a web address (slug), story, goal, gallery images and sponsors. A sponsor appears publicly only after "permission confirmed" is ticked.
- [ ] Turn on "Published" for the organization, then open `/auctions/<org-slug>`; unpublished organizations 404.
- [ ] On a draft auction set a slug, turn on "page published" and "accepts donations" (optionally a donations close time); the page shows "Accepting Item Donations" and a draft auction is still not biddable.
- [ ] Review donations: edit, approve (starting bid + increment create the item) or decline. Approved items keep the donor name/business hidden unless the donor ticked recognition.

Donor (incognito, `/auctions/<org-slug>/<auction-slug>/donate`):
- [ ] SMS code, then submit with up to 6 photos; a second phone/IP is rate limited, and only 5 pending donations per phone per auction.
- [ ] After the donation window closes (or bidding opens) the form answers "not accepting donations".

Checks: bidding only works when the auction status is `live` (enforced in `place_auction_bid`, `claim_item_now`, `claim_fixed_item`; covered by `bidding-requires-live.spec.ts`). Public responses never contain donor email/phone; donor SMS on approve/decline is not sent yet (TODO).
