---
applyTo: "packages/frontend/**/*.{ts,tsx,js,jsx,css}"
---

# Frontend instructions

- Use `'use client'` only when the component uses hooks or browser APIs.
- Use `api` from `@/lib/api` for all HTTP calls — never `fetch` directly.
- Use Tailwind utility classes for styling. No inline `style` objects unless absolutely necessary.
- Use semantic HTML (`<button>`, `<nav>`, `<main>`, etc.).
- Keep UI state local unless it clearly needs to be shared.
- Handle loading, error, and empty states in every data-fetching component.
- Do not hard-code API URLs, secrets, or environment-specific values.
- After a Stripe redirect, check `?success=true` or `?vip_paid=true` query params and show a confirmation banner — do not show a separate success page.
