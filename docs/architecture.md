# Architecture

## High-Level Design
- **Multi-Tenant Architecture**: Shared backend with tenant isolation via database schemas or row-level security. Each tenant (event center) has a subdomain (e.g., `center1.app.com`) routing to the same app instance.
- **Microservices/Monorepo**: Monorepo with separate packages for backend, web frontend, and mobile app for easier development and shared code.

## Components
- **Backend (NestJS)**:
  - RESTful APIs for all features
  - Modules: Auth, Users, Events, Bookings, Payments, Chat, Notifications, Admin
  - Multi-tenancy middleware for request routing
  - Database: PostgreSQL with tenant-specific schemas
  - Real-time: Socket.io for chat and live updates

- **Frontend Web (Next.js)**:
  - Customer-facing app with pages for registration, booking, dashboard
  - Shared components for forms, calendars
  - API calls to backend

- **Frontend Mobile (React Native)**:
  - iOS app for owners/planners
  - Reuses components from web admin panel
  - API integration

- **Database**:
  - PostgreSQL: Tables for users, events, bookings, items, payments, chats, tenants
  - Multi-tenancy: Tenant ID in every table or schema separation

- **External Services**:
  - Stripe: Payments and subscriptions
  - SendGrid/Twilio: Notifications
  - Google Calendar: Scheduling integration

## Data Flow
1. User accesses subdomain -> Backend identifies tenant
2. Auth via JWT -> Role-based access
3. CRUD operations via APIs
4. Real-time events via WebSockets
5. Payments processed via Stripe webhooks

## Security
- JWT for auth
- HTTPS everywhere
- Input validation, SQL injection prevention
- Data encryption for sensitive info

## Deployment
- Backend: AWS Lambda/Serverless
- Frontend: Vercel
- Mobile: App Store
- CI/CD: GitHub Actions for builds/tests