# Shared Event RSVP Management

Clients use `/client-portal/rsvp`; venue owners use `/dashboard/rsvp` through
the dashboard's RSVP Manager navigation item. Both render the same manager
and use the same `/rsvp` API and `rsvp_guests` records for a linked intake form.

Owners authenticate with a bearer token and must own the linked event.
Clients authenticate with `x-client-token` and must be the intake form's
contact phone, a team member of the event, or an invoice contact for it (the
same rules as My Events). Public guest replies remain protected by invitation tokens
and phone verification where configured.

## Door List Synchronization

- Attending guests are linked to door-list rows through `guests.rsvp_guest_id`.
- Replies and guest edits synchronize name, phone, and plus-one count.
- Declined/pending RSVP rows are removed from the attending door list.
- Loading either RSVP manager reconciles existing RSVP records.
- Unique legacy name/phone matches are linked without resetting check-in.
- Arrival status is read from the owner's door list by both RSVP managers.
- Refresh the manager to see responses or arrivals recorded in another session.
- The owner door list still supports walk-ins and other non-RSVP guests; these
  are not invitation records and are not automatically added to the RSVP manager.

## Database Requirement

Run `packages/backend/migrations/add-rsvp-guest-link-to-guests.sql` in the
Supabase SQL editor before deploying these changes. It is repeatable and adds
the stable link, unique index, cascading RSVP deletion, and schema-cache reload.

The configured database was checked read-only during this task and already
exposes `rsvp_guest_id`. That does not verify the foreign key's deletion rule.
Run the updated migration even if the previous version was applied: the old
version used `ON DELETE SET NULL`, which leaves orphaned door-list entries.

No schema changes or real guest mutations were performed during verification.

## Verification

The focused suites are `rsvp.service.spec.ts` and `guest-lists.service.spec.ts`.
They cover shared owner reads, foreign-owner rejection, client edit scoping,
restricted edit fields, public response sync, legacy event lookup/import,
stable guest links, preserved arrival status, and database failures.

Both production builds and backend typechecking passed. Scoped frontend lint
passed with existing dashboard image warnings. Scoped backend lint is not clean
due to unsafe database-result typing and formatting findings. Browser smoke
testing was inconclusive because the existing local session stayed on a loader.

After migration/deployment, verify with a real client and owner on the same event:
add an invitation, submit attending with a plus-one, check in from the door list,
refresh both managers, change the reply to declined, and finally delete the RSVP.