# AGENTS.md

## Project mission

This is an event planning app (EventEcos / DoVenueSuite) built with NestJS backend, Next.js frontend, and React Native mobile. Work in small, reviewable changes. Multiple AI agents may work at the same time — every agent must avoid overlapping edits unless explicitly assigned.

## Agent coordination rules

1. Check `.ai/agent-board.md` before starting work.
2. Claim a task before editing files.
3. Do not edit files claimed by another agent.
4. Keep changes small and focused.
5. Prefer adding tests with each code change.
6. Run the relevant lint, typecheck, and test commands before marking work complete.
7. Summarize changed files, commands run, and remaining risks.

## File ownership protocol

Before editing, add an entry to `.ai/agent-board.md`:

```
Agent:
Task:
Branch/worktree:
Files claimed:
Status: planned | working | blocked | ready-for-review | done
```

If a file is already claimed, do not edit it. Leave a note in the board instead.

## Branch and worktree rules

Use one branch or git worktree per agent/task.

Branch naming:
```
agent/<area>/<task>
```

Examples:
```
agent/frontend/vip-page
agent/backend/stripe-webhook
agent/tester/vip-checkout-tests
```

## Commit style

```
feat: add VIP confirmation email
fix: redirect to event page after VIP purchase
test: add VIP checkout webhook tests
docs: update setup instructions
```

## Project structure

```
packages/backend/   — NestJS API (src/)
packages/frontend/  — Next.js app (src/app/)
packages/mobile/    — React Native / Expo
```

Key backend modules: `stripe`, `vip`, `promoter-events`, `mail`, `messaging`, `guest-lists`, `vendors`, `invoices`

## Mobile app rules (packages/mobile)

Stack: Expo (SDK 54) + Expo Router + React Native + TypeScript + Supabase JS client.

Current structure (do not restructure into a `src/features/` layout without an
explicit task to do so):

```
packages/mobile/
  app/          — Expo Router screens/routes (file-based routing)
  components/   — shared UI components (AppButton, EventCard, VenueCard, etc.)
  lib/          — Supabase client, API helpers
  types/        — shared TypeScript types
```

Roles actually used across the backend (source of truth: `role` column /
`UserRole` checks in `packages/backend/src`): `owner`, `admin`, `promoter`,
`artist`, `vendor`, `client` (client-portal). Don't invent new role names —
confirm against backend usage first.

Rules specific to mobile work:

1. Reuse an existing component from `components/` before creating a new one.
2. Never hardcode or bundle a Supabase service-role key in the mobile app —
   only the anon/public key belongs client-side. Service-role logic stays in
   `packages/backend`.
3. Every list/detail screen must handle loading, empty, error, and success
   states — don't assume the happy path.
4. Data access must be scoped to the authenticated user's ownership
   (`user_id` / `venue_id` / `tenant_id`, whichever applies to that table) —
   never trust a client-supplied ID alone; rely on Supabase RLS policies plus
   backend ownership checks, not client-side filtering alone.
5. Auth, Stripe/payment flows, and RLS policies are high-risk — do not modify
   them as a side effect of an unrelated UI task.
6. Before adding a new npm dependency to `packages/mobile`, check it's
   Expo-compatible (`npx expo install <pkg>` over plain `npm install` when a
   native module is involved).
7. Don't touch `packages/mobile/ios/` generated native project files directly;
   regenerate via `expo prebuild` if a native change is truly required, and
   say so explicitly in the task summary.

## Quality gates

Before saying a task is complete, run commands that apply:

```
cd packages/backend  && npm run lint && npm run build
cd packages/frontend && npm run lint && npm run build
cd packages/mobile    && npx tsc --noEmit
```

`packages/mobile` currently has no `lint`, `build`, or `test` npm script — use
`npx tsc --noEmit` for type-checking and say so in the final task note instead
of claiming lint/build ran.

If a command does not exist, say so in the final task note.

## Security rules

- Do not commit secrets, API keys, tokens, credentials, or `.env` files.
- Do not add new dependencies without explaining why.
- Do not disable tests, lint rules, or type checks unless explicitly approved.
- Treat Stripe webhooks, authentication, payments, user data, and RLS policies as high-risk areas.
- All public API endpoints must validate ownership before returning data.

## Final response format for every agent

```
## Summary
- What changed

## Files changed
- path/to/file

## Validation
- Commands run
- Results

## Risks / follow-up
- Anything uncertain or incomplete
```
