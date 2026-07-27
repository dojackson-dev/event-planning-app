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

## Quality gates

Before saying a task is complete, run commands that apply:

```
cd packages/backend  && npm run lint && npm run build
cd packages/frontend && npm run lint && npm run build
```

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
