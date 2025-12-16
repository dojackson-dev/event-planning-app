# Invoice/Quote System Implementation

## Overview
Complete invoice and quote system allowing owners to create quotes for customers in intake, with ability to add service items from catalog.

## Changes Made

### 1. Database Migration
**File:** `packages/backend/migrations/update-invoices-with-intake-forms.sql`

- Adds `intake_form_id` column to invoices (optional, for quotes without bookings)
- Adds `service_item_id` column to invoice_items (links to service catalog)
- Creates indexes for performance
- Updates RLS policies:
  - Owners OR intake form recipients can view invoices
  - Owners can create/update/delete their invoices
  - Invoice items inherit invoice permissions

**To apply:** Run this migration in Supabase SQL Editor

### 2. Backend Service Layer
**File:** `packages/backend/src/invoices/invoices-supabase.service.ts`

Complete Supabase-based invoice service with methods:
- `findAll` - Get all invoices for user (owner or client)
- `findByOwner` - Get invoices by owner ID
- `findByIntakeForm` - Get invoices by intake form ID
- `findOne` - Get single invoice with items and related data
- `findInvoiceItems` - Get items for an invoice
- `create` - Create invoice with items and auto-calculated totals
- `createQuoteFromIntakeForm` - Create draft invoice (quote) from intake form
- `createInvoiceItems` - Add multiple items to invoice
- `addItemFromServiceItem` - Add service item from catalog to invoice
- `update` - Update invoice with recalculated totals
- `updateStatus` - Change invoice status (draft → sent → paid)
- `updateInvoiceItem` - Update item quantity, price, or discounts
- `recordPayment` - Record payment and update status
- `delete` - Delete invoice and all items
- `deleteInvoiceItem` - Delete single item and recalculate invoice

All methods use authenticated Supabase client with owner-based RLS enforcement.

### 3. Backend Controller
**File:** `packages/backend/src/invoices/invoices-supabase.controller.ts`

REST API endpoints:
- `GET /invoices` - List invoices (supports ?ownerId and ?intakeFormId filters)
- `GET /invoices/:id` - Get invoice with items
- `GET /invoices/:id/items` - Get invoice items only
- `POST /invoices` - Create invoice with items
- `POST /invoices/quote/intake-form/:intakeFormId` - Create quote from intake form
- `POST /invoices/:id/items` - Add multiple items to invoice
- `POST /invoices/:id/items/service-item/:serviceItemId` - Add catalog item to invoice
- `PUT /invoices/:id` - Update invoice
- `PUT /invoices/:id/status` - Update invoice status
- `PUT /invoices/items/:itemId` - Update invoice item
- `POST /invoices/:id/payment` - Record payment
- `DELETE /invoices/:id` - Delete invoice
- `DELETE /invoices/items/:itemId` - Delete invoice item

All endpoints require JWT authentication and enforce owner-based access.

### 4. Module Configuration
**File:** `packages/backend/src/invoices/invoices.module.ts`

Updated to use:
- `InvoicesSupabaseController` (new)
- `InvoicesService` from `invoices-supabase.service.ts` (new)
- `SupabaseModule` for database access

### 5. Frontend Types
**File:** `packages/frontend/src/types/index.ts`

Updated interfaces:
- `Invoice` - Added `intakeFormId?: string` and `intakeForm?: any`
- `Invoice` - Made `bookingId` optional (supports quotes without bookings)
- `InvoiceItem` - Added `serviceItemId?: string` and `serviceItem?: ServiceItem`

## Key Features

### Quote System
- Draft invoices serve as quotes
- Can be created from intake forms without bookings
- Status flow: draft (quote) → sent → paid/overdue

### Service Item Integration
- Link catalog items to invoice items via `service_item_id`
- Automatically populate description and pricing from catalog
- Support custom items (no `service_item_id`)
- Both owners and customers can add items

### Owner-Based Isolation
- Each owner's invoices are isolated (multi-tenant)
- RLS policies enforce owner-based access
- Owners see their invoices, clients see invoices for their intake forms

### Automatic Calculations
- Subtotal = sum of item amounts
- Tax = subtotal × tax rate
- Total = subtotal + tax - discount
- Amount due = total - amount paid
- Item amount = (quantity × unit price) - item discount

## Next Steps

### 1. Apply Database Migration
```sql
-- Run in Supabase SQL Editor:
-- packages/backend/migrations/update-invoices-with-intake-forms.sql
```

### 2. Test Backend API
```bash
# Backend is already running on port 3000
# Test with Postman or frontend:

# Create quote from intake form
POST http://localhost:3000/invoices/quote/intake-form/{intakeFormId}
Authorization: Bearer {token}

# Add service item to invoice
POST http://localhost:3000/invoices/{invoiceId}/items/service-item/{serviceItemId}
Authorization: Bearer {token}
Body: { "quantity": 2 }

# Update invoice status (send quote)
PUT http://localhost:3000/invoices/{invoiceId}/status
Authorization: Bearer {token}
Body: { "status": "sent" }
```

### 3. Create Frontend UI (Recommended)
Create these pages/components:
- `/dashboard/invoices` - List invoices with filters (draft/sent/paid)
- `/dashboard/invoices/[id]` - View/edit invoice with items
- `/dashboard/invoices/new` - Create new invoice/quote
- `ServiceItemPicker` component - Select items from catalog
- `InvoiceItemsList` component - Display and edit items

### 4. Integration with Intake Forms
Update intake form detail page:
- Add "Create Quote" button
- Show linked invoices/quotes
- Allow viewing/editing quote from intake form context

## API Examples

### Create Quote from Intake Form
```typescript
const response = await axios.post(
  `${API_URL}/invoices/quote/intake-form/${intakeFormId}`,
  {},
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Add Service Item to Invoice
```typescript
const response = await axios.post(
  `${API_URL}/invoices/${invoiceId}/items/service-item/${serviceItemId}`,
  { quantity: 2 },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Update Invoice Item
```typescript
const response = await axios.put(
  `${API_URL}/invoices/items/${itemId}`,
  {
    quantity: 3,
    unitPrice: 150.00,
    discountType: 'percentage',
    discountValue: 10
  },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

### Send Quote to Customer
```typescript
const response = await axios.put(
  `${API_URL}/invoices/${invoiceId}/status`,
  { status: 'sent' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

## Status Values
- `draft` - Quote/invoice being prepared (not sent)
- `sent` - Quote/invoice sent to customer
- `paid` - Fully paid
- `overdue` - Past due date and unpaid
- `cancelled` - Cancelled/voided

## Discount Types
- `none` - No discount
- `percentage` - Discount as percentage (e.g., 10%)
- `fixed` - Fixed amount discount (e.g., $50)

Discounts can be applied at:
- Invoice level (affects total)
- Item level (affects individual items)

## Notes
- Backend server must be restarted after module changes: `npx nest start --watch`
- RLS policies automatically enforce owner isolation
- Invoice numbers are auto-generated as `INV-{timestamp}`
- All monetary values stored as numeric(10,2) in database
- Dates use ISO 8601 format (YYYY-MM-DD)
