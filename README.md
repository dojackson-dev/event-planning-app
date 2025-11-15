# Event Planning App

A multi-tenant web application for event centers, allowing customers to book events, select items, and manage bookings, while owners/planners manage via web and iOS admin panels.

## Tech Stack
- **Backend**: NestJS (Node.js/TypeScript)
- **Frontend Web**: Next.js (React/TypeScript)
- **Mobile**: React Native (iOS for owners)
- **Database**: PostgreSQL
- **Payments**: Stripe
- **Real-time**: Socket.io
- **Hosting**: Vercel/AWS

## Structure
- `packages/backend/`: NestJS API server
- `packages/frontend-web/`: Next.js customer web app
- `packages/frontend-mobile/`: React Native iOS app
- `docs/`: Documentation
- `scripts/`: Build/deployment scripts

## Getting Started
1. Clone the repo.
2. Run `npm install` at root.
3. Set up PostgreSQL database.
4. Configure environment variables.
5. Run `npm run dev` to start all services.

## Features
- Customer registration and booking
- Item selection (setup, catering, entertainment)
- Payments and invoices
- Real-time chat
- Reminders and notifications
- Admin panel for owners/planners
- Multi-tenancy for multiple event centers
- Subscription management