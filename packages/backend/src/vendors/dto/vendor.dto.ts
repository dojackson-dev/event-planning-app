export type VendorCategory = 
  | 'dj'
  | 'decorator'
  | 'planner_coordinator'
  | 'furniture'
  | 'photographer'
  | 'musicians'
  | 'mc_host'
  | 'other';

export const VENDOR_CATEGORIES: { value: VendorCategory; label: string }[] = [
  { value: 'dj', label: 'DJ' },
  { value: 'decorator', label: 'Decorator' },
  { value: 'planner_coordinator', label: 'Planner / Coordinator' },
  { value: 'furniture', label: 'Furniture' },
  { value: 'photographer', label: 'Photographer' },
  { value: 'musicians', label: 'Musicians' },
  { value: 'mc_host', label: 'MC / Host' },
  { value: 'other', label: 'Other' },
];

export class CreateVendorDto {
  businessName: string;
  category: VendorCategory;
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  flatRate?: number;
  rateDescription?: string;
}

export class UpdateVendorDto {
  businessName?: string;
  category?: VendorCategory;
  bio?: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  hourlyRate?: number;
  flatRate?: number;
  rateDescription?: string;
  profileImageUrl?: string;
  coverImageUrl?: string;
}

export class VendorSearchDto {
  lat: number;
  lng: number;
  radiusMiles?: number;
  category?: VendorCategory;
  zipCode?: string;
}

export class CreateVendorBookingDto {
  vendorAccountId: string;
  eventId?: string;
  eventName: string;
  eventDate: string; // ISO date
  startTime?: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  notes?: string;
  agreedAmount?: number;
  depositAmount?: number;
  clientName?: string;
  clientEmail?: string;
  clientPhone?: string;
}

export class UpdateVendorBookingDto {
  status?: 'confirmed' | 'declined' | 'cancelled' | 'completed';
  notes?: string;
  agreedAmount?: number;
  depositAmount?: number;
}

export class CreateVendorReviewDto {
  vendorAccountId: string;
  vendorBookingId?: string;
  rating: number;
  reviewText?: string;
}

// ─── Booking Link DTOs ────────────────────────────────────────────────────────

export class UpsertBookingLinkDto {
  /** URL-safe slug, e.g. "dj-mike-events" */
  slug: string;
  isActive?: boolean;
  customMessage?: string;
  /** e.g. 25 means 25% deposit */
  defaultDepositPercentage?: number;
}

export class SubmitBookingRequestDto {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  eventName?: string;
  eventDate?: string; // ISO date
  startTime?: string;
  endTime?: string;
  venueName?: string;
  venueAddress?: string;
  notes?: string;
}

export class UpdateBookingRequestDto {
  status?: 'confirmed' | 'declined' | 'cancelled';
  quotedAmount?: number;
  notes?: string;
}
