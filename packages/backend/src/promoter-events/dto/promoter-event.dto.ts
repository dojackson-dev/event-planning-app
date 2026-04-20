export class CreatePromoterEventDto {
  title: string;
  description?: string;
  event_date: string; // YYYY-MM-DD
  start_time?: string; // HH:MM
  end_time?: string;
  venue_name?: string;
  venue_address?: string;
  city?: string;
  state?: string;
  category?: string; // concert, festival, club_night, comedy, etc.
  image_url?: string;
  status?: 'draft' | 'published' | 'cancelled'; // default draft
  age_restriction?: string; // 18+, 21+, all_ages
  ticket_tiers?: CreateTicketTierDto[];
}

export class UpdatePromoterEventDto {
  title?: string;
  description?: string;
  event_date?: string;
  start_time?: string;
  end_time?: string;
  venue_name?: string;
  venue_address?: string;
  city?: string;
  state?: string;
  category?: string;
  image_url?: string;
  status?: 'draft' | 'published' | 'cancelled';
  age_restriction?: string;
}

export class CreateTicketTierDto {
  name: string; // e.g. "General Admission", "VIP"
  price: number; // in dollars
  quantity: number; // total available
  description?: string;
}

export class UpdateTicketTierDto {
  name?: string;
  price?: number;
  quantity?: number;
  description?: string;
}
