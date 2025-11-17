// Enums
export enum UserRole {
  CUSTOMER = 'customer',
  OWNER = 'owner',
  PLANNER = 'planner',
}

export enum EventStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  COMPLETED = 'completed',
}

export enum BookingStatus {
  PENDING = 'pending',
  CONFIRMED = 'confirmed',
  CANCELLED = 'cancelled',
}

export enum ClientStatus {
  CONTACTED_BY_PHONE = 'contacted_by_phone',
  WALKTHROUGH_COMPLETED = 'walkthrough_completed',
  BOOKED = 'booked',
  DEPOSIT_PAID = 'deposit_paid',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum EventType {
  WEDDING_RECEPTION = 'wedding_reception',
  BIRTHDAY_PARTY = 'birthday_party',
  RETIREMENT = 'retirement',
  ANNIVERSARY = 'anniversary',
  BABY_SHOWER = 'baby_shower',
  CORPORATE_EVENT = 'corporate_event',
  FUNDRAISER_GALA = 'fundraiser_gala',
  CONCERT_SHOW = 'concert_show',
  CONFERENCE_MEETING = 'conference_meeting',
  WORKSHOP = 'workshop',
  QUINCEANERA = 'quinceanera',
  SWEET_16 = 'sweet_16',
  PROM_FORMAL = 'prom_formal',
  FAMILY_REUNION = 'family_reunion',
  MEMORIAL_SERVICE = 'memorial_service',
  PRODUCT_LAUNCH = 'product_launch',
  HOLIDAY_PARTY = 'holiday_party',
  ENGAGEMENT_PARTY = 'engagement_party',
  GRADUATION_PARTY = 'graduation_party',
}

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  REFUNDED = 'refunded',
}

export enum ContractStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  CANCELLED = 'cancelled',
}

export enum InsuranceStatus {
  NOT_REQUIRED = 'not_required',
  REQUESTED = 'requested',
  RECEIVED = 'received',
  VERIFIED = 'verified',
  EXPIRED = 'expired',
}

export enum ItemType {
  SETUP = 'setup',
  CATERING = 'catering',
  ENTERTAINMENT = 'entertainment',
}

// User
export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  ownerId?: string // For customers/planners/staff - references their owner
  tenantId?: string // Only for owners who host their website with us (optional)
  createdAt: string
  updatedAt: string
}

// Tenant - Represents owners who host their website with us
export interface Tenant {
  id: string
  name: string // Business/Venue name
  subdomain: string // Subdomain for hosted website
  ownerId: string // Reference to the owner user
  customDomain?: string // Optional custom domain
  subscriptionStatus: string // active, suspended, cancelled, trial
  websiteSettings?: string // JSON string of website customization
  createdAt: string
  updatedAt: string
}

// Event
export interface Event {
  id: string
  name: string
  description?: string
  date: string
  dayOfWeek: string
  startTime: string
  endTime: string
  setupTime?: string
  venue: string
  maxGuests: number
  tenantId: string
  ownerId: string
  status: EventStatus
  eventType: EventType
  services?: {
    caterer?: string
    decorator?: string
    balloonDecorator?: string
    marquee?: string
    musicType?: 'dj' | 'band' | 'mc'
  }
  barOption?: string
  createdAt: string
  updatedAt: string
}

// Booking
export interface Booking {
  id: string
  userId: string
  eventId: string
  status: BookingStatus
  clientStatus: ClientStatus
  totalPrice: number
  deposit: number
  paymentStatus: PaymentStatus
  totalAmountPaid: number
  contractId?: string
  insuranceId?: string
  doorListId?: string
  createdAt: string
  updatedAt: string
  user?: User
  event?: Event
  bookingItems?: BookingItem[]
  contract?: Contract
  insurance?: Insurance
  doorList?: DoorList
}

// Item
export interface Item {
  id: string
  name: string
  description?: string
  type: ItemType
  price: number
  tenantId: string
  createdAt: string
  updatedAt: string
}

// BookingItem
export interface BookingItem {
  id: string
  bookingId: string
  itemId: string
  quantity: number
  customPrice?: number
  item?: Item
}

// Payment
export interface Payment {
  id: string
  bookingId: string
  amount: number
  currency: string
  status: PaymentStatus
  stripePaymentIntentId?: string
  createdAt: string
  updatedAt: string
}

// Contract
export interface Contract {
  id: string
  bookingId: string
  status: ContractStatus
  documentUpload?: string
  sentAt?: string
  signedAt?: string
  createdAt: string
  updatedAt: string
}

// Insurance
export interface Insurance {
  id: string
  bookingId: string
  provided: boolean
  certificateUpload?: string
  verifiedAt?: string
  createdAt: string
  updatedAt: string
}

// DoorList
export interface DoorList {
  id: string
  bookingId: string
  hostess?: string
  upload?: string
  deadline?: string
  vipNotes?: string
  parkingDetails?: string
  createdAt: string
  updatedAt: string
}

// SecurityAssignment
export interface SecurityAssignment {
  id: string
  bookingId: string
  name: string
  phone: string
  arrivalTime: string
  notes?: string
  createdAt: string
  updatedAt: string
}

// Message
export interface Message {
  id: string
  bookingId: string
  senderId: string
  content: string
  timestamp: string
  sender?: User
}

// Reminder
export interface Reminder {
  id: string
  bookingId: string
  type: 'email' | 'sms'
  message: string
  scheduledAt: string
  sentAt?: string
}

// Auth
export interface AuthResponse {
  access_token: string
  user: User
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterData {
  email: string
  password: string
  firstName: string
  lastName: string
  role: UserRole
  tenantId?: string
}
