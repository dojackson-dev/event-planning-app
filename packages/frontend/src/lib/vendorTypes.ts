// Shared types and constants for vendor pages

export interface VendorProfile {
  id: string
  business_name: string
  category: string
  bio: string
  address: string
  city: string
  state: string
  zip_code: string
  profile_image_url: string
  cover_image_url: string
  is_verified: boolean
  hourly_rate: number
  flat_rate: number
  rate_description: string
  phone: string
  email: string
  website: string
  instagram: string
  facebook: string
  avgRating?: number
  reviewCount?: number
}

export interface Booking {
  id: string
  event_name: string
  event_date: string
  start_time: string
  end_time: string
  venue_name: string
  status: string
  agreed_amount: number
  deposit_amount: number
  payment_status: string
  notes: string
}

export interface VendorInvoice {
  id: string
  invoice_number: string
  client_name: string
  client_email: string
  total_amount: number
  amount_due: number
  status: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled'
  issue_date: string
  due_date: string
}

export interface Review {
  id: string
  rating: number
  review_text: string
  created_at: string
  reviewer_user_id: string
}
