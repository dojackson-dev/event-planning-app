export class CreatePromoterBookingDto {
  event_name!: string;
  client_name!: string;
  client_email!: string;
  client_phone?: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  venue_name?: string;
  venue_address?: string;
  agreed_amount?: number;
  deposit_amount?: number;
  notes?: string;
  promoter_invoice_id?: string;
}

export class UpdatePromoterBookingDto {
  event_name?: string;
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  event_date?: string;
  event_start_time?: string;
  event_end_time?: string;
  venue_name?: string;
  venue_address?: string;
  agreed_amount?: number;
  deposit_amount?: number;
  notes?: string;
  status?: 'inquiry' | 'estimate_sent' | 'deposit_paid' | 'confirmed' | 'completed' | 'cancelled';
  promoter_invoice_id?: string | null;
}
