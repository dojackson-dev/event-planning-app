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

export enum InvoiceStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

export enum ServiceItemCategory {
  FACILITY = 'facility',
  CATERING = 'catering',
  ITEMS = 'items',
  SECURITY = 'security',
  BAR = 'bar',
  DEPOSIT = 'deposit',
  SOUND_SYSTEM = 'sound_system',
  AV = 'av',
  PLANNING = 'planning',
  DECORATIONS = 'decorations',
  ADDITIONAL_TIME = 'additional_time',
  SALES_TAX = 'sales_tax',
  HOSTING = 'hosting',
  MISC = 'misc',
}

export enum DiscountType {
  NONE = 'none',
  PERCENTAGE = 'percentage',
  FIXED = 'fixed',
}

export enum ContractStatus {
  DRAFT = 'draft',
  SENT = 'sent',
  SIGNED = 'signed',
  CANCELLED = 'cancelled',
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

// Invoice
export interface Invoice {
  id: string
  invoiceNumber: string
  ownerId?: string
  bookingId: string
  booking?: Booking
  subtotal: number
  taxAmount: number
  taxRate: number
  discountAmount: number
  totalAmount: number
  amountPaid: number
  amountDue: number
  status: InvoiceStatus
  issueDate: string
  dueDate: string
  paidDate?: string
  notes?: string
  terms?: string
  items: InvoiceItem[]
  createdAt: string
  updatedAt: string
}

// InvoiceItem
export interface InvoiceItem {
  id: string
  invoiceId: string
  description: string
  quantity: number
  standardPrice: number // Original/standard price
  unitPrice: number // Actual price being charged
  subtotal: number // quantity * unitPrice (before item discount)
  discountType: DiscountType
  discountValue: number // Percentage or fixed amount
  discountAmount: number // Calculated discount
  amount: number // Final amount after discount
  sortOrder: number
}

// ServiceItem
export interface ServiceItem {
  id: string
  name: string
  description: string
  category: ServiceItemCategory
  defaultPrice: number
  isActive: boolean
  sortOrder: number
  tenantId?: string
  createdAt: string
  updatedAt: string
}

// Contract
export interface Contract {
  id: string
  contractNumber: string
  ownerId: string
  owner?: User
  clientId: string
  client?: User
  bookingId?: string
  booking?: Booking
  title: string
  description?: string
  fileUrl: string
  fileName?: string
  fileSize?: number
  status: ContractStatus
  sentDate?: string
  signedDate?: string
  signatureData?: string
  signerName?: string
  signerIpAddress?: string
  notes?: string
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

// Security
export interface Security {
  id: number
  name: string
  phone: string
  eventId?: number
  event?: Event
  arrivalTime?: string
  createdAt: string
  updatedAt: string
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
