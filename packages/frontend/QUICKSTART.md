# Quick Start Guide - Event Planning Frontend

## Prerequisites
- Node.js 18+ installed
- Backend API running on port 3000 (or update NEXT_PUBLIC_API_URL)

## Installation

```bash
# Navigate to frontend directory
cd packages/frontend

# Install dependencies (already done)
npm install
```

## Running the Application

```bash
# Start development server
npm run dev
```

The application will start on `http://localhost:3001`

## Default Login

Since this is a new project, you'll need to create a user account via your backend API first. The login page expects:
- Email address
- Password

The backend should return a JWT token and user object.

## Available Routes

### Public Routes
- `/login` - Login page

### Protected Routes (require authentication)
- `/dashboard` - Main dashboard with stats
- `/dashboard/calendar` - Calendar view
- `/dashboard/events` - Events list
- `/dashboard/events/new` - Create new event
- `/dashboard/bookings` - Bookings management
- `/dashboard/items` - Items & packages
- `/dashboard/contracts` - Contracts (placeholder)
- `/dashboard/door-lists` - Door lists (placeholder)
- `/dashboard/security` - Security assignments (placeholder)
- `/dashboard/payments` - Payment tracking (placeholder)
- `/dashboard/messages` - Customer messages (placeholder)

## Environment Configuration

The app uses `.env.local` for configuration:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

Update these if your backend runs on a different URL.

## Features Overview

### ✅ Fully Implemented
1. **Authentication** - Login with JWT
2. **Dashboard** - Overview stats and recent bookings
3. **Events** - List, create, and filter events
4. **Calendar** - Monthly view of scheduled events
5. **Bookings** - Manage bookings with client workflow
6. **Items** - CRUD for setup/catering/entertainment items

### 🚧 Structure Ready (Needs Implementation)
1. **Contracts** - Upload and track contracts
2. **Door Lists** - Guest list management
3. **Security** - Security personnel scheduling
4. **Payments** - Payment processing and tracking
5. **Messages** - Real-time customer chat

## Development Tips

### Adding New Features
1. Create page in `src/app/dashboard/[feature]/page.tsx`
2. Add route to navigation in `src/components/DashboardLayout.tsx`
3. Add API calls in your page using the `api` instance from `src/lib/api.ts`
4. Add types to `src/types/index.ts` if needed

### API Calls Example
```typescript
import api from '@/lib/api'

// GET request
const response = await api.get('/events')
const events = response.data

// POST request
await api.post('/events', { name: 'New Event', ... })

// PUT request
await api.put(`/events/${id}`, { name: 'Updated' })

// DELETE request
await api.delete(`/events/${id}`)
```

### Protected Routes
All routes under `/dashboard` are automatically protected. Users will be redirected to `/login` if not authenticated.

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Common Issues

### Port Already in Use
If port 3001 is in use, you can change it:
```bash
npm run dev -- -p 3002
```

### Backend Not Running
Make sure your backend API is running on port 3000, or update `NEXT_PUBLIC_API_URL` in `.env.local`

### Authentication Issues
- Check that backend returns proper JWT token
- Token is stored in localStorage as 'access_token'
- User object is stored as 'user'

## Next Steps

1. **Start Backend**: Ensure your NestJS backend is running
2. **Test Login**: Try logging in with valid credentials
3. **Explore Features**: Navigate through the dashboard
4. **Implement Remaining Features**: Complete placeholder pages
5. **Connect Real Data**: Ensure all API endpoints match backend

## Support

For issues or questions, refer to:
- Frontend README: `packages/frontend/README.md`
- Full Summary: `packages/frontend/FRONTEND_SUMMARY.md`
- Backend Structure: `docs/backend-structure.md`
