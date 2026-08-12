-- Fix: vendor_bookings.booked_by_user_id was NOT NULL, but auto-created bookings
-- from confirmed public/client-portal booking requests (vendors.service.ts
-- updateBookingRequest) insert booked_by_user_id: null (there is no platform
-- user for a client who booked via a public booking link/inquiry). This caused
-- every such insert to fail silently (error caught and only logged as a
-- warning), so the vendor's booking/calendar list never showed the booking.
ALTER TABLE vendor_bookings ALTER COLUMN booked_by_user_id DROP NOT NULL;
