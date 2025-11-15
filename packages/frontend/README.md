# Event Planning App - Frontend (Owner Dashboard)

This is the frontend application for event center owners and planners.

## Features

- **Dashboard**: Overview of events, bookings, and revenue
- **Calendar View**: Visual calendar for managing events and walkthroughs
- **Events Management**: Create, edit, and manage events with full details
- **Bookings Management**: View and manage customer bookings
- **Client Workflow**: Track client status through the booking process
- **Items & Packages**: Manage reusable items (setup, catering, entertainment)
- **Contracts**: Upload and track contract status
- **Insurance**: Manage insurance certificates
- **Door Lists**: Manage guest lists and VIP notes
- **Security Assignments**: Schedule and track security personnel
- **Payments**: Track payments and outstanding balances
- **Messaging**: Real-time chat with customers

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod
- **HTTP Client**: Axios
- **Real-time**: Socket.io

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on port 3000

### Installation

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

The application will be available at `http://localhost:3001`

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_API_URL=http://localhost:3000
NEXT_PUBLIC_WS_URL=http://localhost:3000
```

## Project Structure

```
src/
├── app/                    # Next.js app directory
│   ├── dashboard/         # Dashboard pages
│   ├── login/            # Authentication pages
│   └── layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── DashboardLayout.tsx
│   └── ProtectedRoute.tsx
├── contexts/             # React contexts
│   └── AuthContext.tsx   # Authentication context
├── lib/                  # Utilities
│   └── api.ts           # Axios instance
└── types/               # TypeScript types
    └── index.ts         # All type definitions
```

## Authentication

The app uses JWT-based authentication. Users must log in with their credentials to access the dashboard.

## API Integration

All API calls go through the `api` instance in `src/lib/api.ts`, which automatically:
- Adds JWT token to requests
- Handles 401 errors by redirecting to login
- Sets the base URL from environment variables

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Lint code
npm run lint
```

## Multi-Tenancy

The app supports multi-tenancy through:
- Subdomain detection (e.g., `center1.app.com`)
- Tenant-scoped data filtering
- Tenant-specific branding (future enhancement)
