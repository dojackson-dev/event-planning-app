# Backend Structure

This document outlines the key entities, modules, and APIs in the NestJS backend for the Event Planning App.

## Entities

### User
- **Fields**: id, email, password, firstName, lastName, role (customer/owner/planner), tenantId, createdAt, updatedAt
- **Purpose**: Stores user accounts with role-based access.

### Tenant
- **Fields**: id, name, subdomain, ownerId, subscriptionStatus, createdAt, updatedAt
- **Purpose**: Represents each event center for multi-tenancy.

### Event
- **Fields**: id, name, description, date, dayOfWeek, startTime, endTime, setupTime, venue, maxGuests, tenantId, ownerId, status (draft/scheduled/completed), services (caterer, decorator, balloonDecorator, marquee, musicType: dj/band/mc), barOption (type of bar), createdAt, updatedAt
- **Purpose**: Core event details managed by owners/planners.

### Booking
- **Fields**: id, userId, eventId, status (pending/confirmed/cancelled), totalPrice, deposit, paymentStatus, createdAt, updatedAt
- **Relations**: One-to-many with BookingItem
- **Purpose**: Customer bookings for events.

### Item
- **Fields**: id, name, description, type (setup/catering/entertainment), price, tenantId, createdAt, updatedAt
- **Purpose**: Reusable items for events (e.g., tables, DJ services).

### BookingItem
- **Fields**: id, bookingId, itemId, quantity, customPrice
- **Purpose**: Links bookings to selected items.

### Payment
- **Fields**: id, bookingId, amount, currency, status (pending/paid/refunded), stripePaymentIntentId, createdAt, updatedAt
- **Purpose**: Tracks payments via Stripe.

### Message
- **Fields**: id, bookingId, senderId, content, timestamp
- **Purpose**: Chat messages between customers and owners.

### Reminder
- **Fields**: id, bookingId, type (email/sms), message, scheduledAt, sentAt
- **Purpose**: Scheduled notifications.

## Modules

### AuthModule
- **Controllers**: AuthController (login, register, refresh token)
- **Services**: AuthService (JWT handling, password hashing)
- **Guards**: JwtAuthGuard, RolesGuard

### UsersModule
- **Controllers**: UsersController (CRUD for users)
- **Services**: UsersService

### TenantsModule
- **Controllers**: TenantsController (manage tenants, subscriptions)
- **Services**: TenantsService

### EventsModule
- **Controllers**: EventsController (CRUD for events, calendar view)
- **Services**: EventsService

### BookingsModule
- **Controllers**: BookingsController (create booking, add items, confirm)
- **Services**: BookingsService

### ItemsModule
- **Controllers**: ItemsController (manage items for tenants)
- **Services**: ItemsService

### PaymentsModule
- **Controllers**: PaymentsController (integrate with Stripe)
- **Services**: PaymentsService

### ChatModule
- **Controllers**: ChatController (send/receive messages)
- **Services**: ChatService (with Socket.io)

### NotificationsModule
- **Controllers**: NotificationsController (schedule reminders)
- **Services**: NotificationsService

## API Endpoints (Examples)

- `POST /auth/register` - Register user
- `POST /auth/login` - Login
- `GET /users` - List users (admin)
- `GET /events` - List events for tenant
- `POST /bookings` - Create booking
- `POST /payments` - Process payment
- `GET /chat/:bookingId` - Get messages
- `POST /chat` - Send message (via WebSocket)

## Multi-Tenancy Implementation
- Middleware to detect tenant from subdomain (e.g., `center1.app.com`)
- All queries filtered by `tenantId`
- Shared DB with schema separation or row-level security

## Security
- JWT for authentication
- Role-based access (customers vs. owners)
- Input validation with class-validator
- Rate limiting, CORS

This structure provides a solid foundation for the app's features.