// Shape of a row from the `vendor_booking_requests` table, as returned by
// GET /vendors/booking-requests/mine (packages/backend/src/vendors/vendors.service.ts getMyBookingRequests()).
export interface VendorBookingRequest {
  id: string;
  vendor_account_id: string;
  client_name: string;
  client_email: string;
  client_phone: string | null;
  event_name: string | null;
  event_date: string | null;
  start_time: string | null;
  end_time: string | null;
  venue_name: string | null;
  venue_address: string | null;
  notes: string | null;
  status: 'pending' | 'confirmed' | 'declined' | 'cancelled';
  quoted_amount: number | null;
  sms_opt_in?: boolean;
  created_at: string;
  updated_at?: string;
}

// Body for PUT /vendors/booking-requests/:id (UpdateBookingRequestDto).
export interface UpdateBookingRequestBody {
  status?: 'confirmed' | 'declined' | 'cancelled';
  quotedAmount?: number;
  notes?: string;
}
