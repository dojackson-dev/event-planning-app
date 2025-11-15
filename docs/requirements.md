# Requirements

## Overview
Build a web app for event centers with multi-tenant architecture, subscription-based model, web UI for customers, and web/iOS admin for owners/planners.

## Customer Features (Web UI)
- User registration and authentication
- Request walk-throughs
- Book events (date, time, venue)
- Select items for events:
  - Setup (tables, chairs, decor)
  - Catering (menus, dietary options)
  - Entertainment (DJ, performers)
- Pay invoices (secure payment processing)
- Chat with owners/planners
- Receive reminders (email/SMS)
- Change event details (pre-event)

## Owner/Planner Features
- Admin panel (web and iOS app)
- Calendar view for events
- Book and schedule walk-throughs
- Schedule and manage events
- Create event pricing and packages
- Create/manage items (setup, catering, entertainment)
- Create/manage caterers and entertainers
- Subscription management (billing per event center)

## General Requirements
- Multi-tenant: Separate front-ends for different event centers, shared backend associating clients with owners
- Subscription-based: Monthly plans for event centers
- Security: Role-based access, data privacy compliance
- Scalability: Handle multiple centers, high traffic
- Real-time features: Chat, notifications
- Integrations: Payment gateway, calendar, email/SMS

## Non-Functional
- Responsive web UI
- iOS app only for owners (customers web-only)
- Performance: Fast loading, real-time updates
- Reliability: Error handling, backups
- Usability: Intuitive UX for all users