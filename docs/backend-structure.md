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
- **Fields**: id, name, description, date, dayOfWeek, startTime, endTime, setupTime, venue, maxGuests, tenantId, ownerId, status (draft/scheduled/completed), services (caterer, decorator, balloonDecorator, marquee, musicType: dj/band/mc), barOption (type of bar), eventType (enum), createdAt, updatedAt
- **Purpose**: Core event details managed by owners/planners.

### Booking
- **Fields**: id, userId, eventId, status (pending/confirmed/cancelled), totalPrice, deposit, paymentStatus, clientStatus (enum), totalAmountPaid, contractId (FK), insuranceId (FK), doorListId (FK optional), createdAt, updatedAt
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

### DoorList
- **Fields**: id, bookingId, hostess (string), upload (file ref), deadline (datetime), vipNotes (text), parkingDetails (text), createdAt, updatedAt
- **Relation**: One per Booking (or per Event), created by Customer/Planner
- **Purpose**: Tracks guest-facing door/hostess instructions and attachments.

### SecurityAssignment
- **Fields**: id, bookingId, name, phone, arrivalTime (time), notes (text), createdAt, updatedAt
- **Relation**: Many per Event or Booking
- **Purpose**: Records security personnel and schedule.

### Contract
- **Fields**: id, bookingId, status (sent/signed), documentUpload (file ref), sentAt, signedAt, createdAt, updatedAt
- **Relation**: One per Booking (versioning optional)
- **Purpose**: Manages contract workflow and storage.

### Insurance
- **Fields**: id, bookingId, provided (boolean yes/no), certificateUpload (file ref), verifiedAt (nullable), createdAt, updatedAt
- **Relation**: One per Booking
- **Purpose**: Stores COI (certificate of insurance) evidence.

## Enums

### EventType
- **Values**: wedding_reception, birthday_party, retirement, anniversary, baby_shower, corporate_event, fundraiser_gala, concert_show, conference_meeting, workshop, quinceanera, sweet_16, prom_formal, family_reunion, memorial_service, product_launch, holiday_party, engagement_party, graduation_party
- **Applied To**: Event.eventType (required)

### ClientStatus
- **States**: contacted_by_phone → walkthrough_completed → booked → deposit_paid → completed/cancelled
- **Applied To**: Booking.clientStatus (string enum)
- **Notes**: Enforce valid transitions with service-level checks.

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

### ContractsModule
- **Controllers**: ContractsController (manage contracts, upload/sign)
- **Services**: ContractsService

### InsuranceModule
- **Controllers**: InsuranceController (manage insurance certificates)
- **Services**: InsuranceService

### DoorListModule
- **Controllers**: DoorListController (manage door lists)
- **Services**: DoorListService

### SecurityModule
- **Controllers**: SecurityController (manage security assignments)
- **Services**: SecurityService

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

---

## Notes for Implementation

### File Uploads
- Use a Files table or storage service; store metadata and signed URLs.

### Validation
- Deadlines must be before event start; security arrivalTime within venue access hours.

### Permissions
- Customers can view/upload their own contract/insurance; planners/owners can manage all within tenant.

### Migrations
- Add enums and new tables; backfill existing records with defaults (e.g., `clientStatus = 'contacted_by_phone'`).

### Payment Tracking
- **Total Paid**: compute SUM(payments.amount where status='paid') and sync to `Booking.totalAmountPaid` on webhook/cron.