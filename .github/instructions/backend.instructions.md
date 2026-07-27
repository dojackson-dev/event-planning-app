---
applyTo: "packages/backend/**/*.ts"
---

# Backend instructions

- Use NestJS constructor injection for all dependencies — never instantiate services manually.
- Use `SupabaseService.getAdminClient()` for privileged DB operations in webhook/service code.
- Always check resource ownership before returning or mutating data (`assertEventOwner`, promoter account lookup, etc.).
- Stripe webhook handlers must be **idempotent** — check for existing records before inserting.
- Never log secrets, API keys, tokens, or PII (emails, phone numbers in plain text).
- Validate inputs at controller boundaries using DTOs and class-validator.
- Email and SMS sends are non-fatal — wrap in try/catch and do not throw from webhook handlers.
- New public endpoints (`/public/`) must be explicitly marked and must not expose other users' data.
- Use `this.logger.log/warn/error` (NestJS Logger) — not `console.log`.
