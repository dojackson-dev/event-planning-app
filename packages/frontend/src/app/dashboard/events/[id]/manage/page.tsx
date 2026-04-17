'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Calendar,
  Users,
  Clock,
  MapPin,
  DollarSign,
  FileText,
  Shield,
  CheckCircle,
  XCircle,
  AlertCircle,
  Save,
  Eye,
  Edit,
  Phone,
  Mail,
  User,
  Building,
  Music,
  Camera,
  UtensilsCrossed,
  Flower2,
  Car,
  Lock,
  List,
  Briefcase,
  Trash2
} from 'lucide-react';
import api from '@/lib/api';
import { Event, EventType, ClientStatus, ContractStatus, InsuranceStatus } from '@/types';

const formatTime = (timeString: string | undefined): string => {
  if (!timeString) return 'Not set'
  const [hours, minutes] = timeString.split(':')
  const hour = parseInt(hours, 10)
  const ampm = hour >= 12 ? 'PM' : 'AM'
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

const invoiceStatusColors: Record<string, string> = {
  draft:     'bg-gray-100 text-gray-700',
  sent:      'bg-blue-100 text-blue-800',
  paid:      'bg-green-100 text-green-800',
  overdue:   'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500',
};

interface VendorContact {
  id?: string;
  category: 'catering' | 'decoration' | 'music' | 'photography' | 'videography' | 'security' | 'valet' | 'other';
  companyName: string;
  contactPerson: string;
  phone: string;
  email: string;
  contractStatus: 'pending' | 'sent' | 'signed' | 'cancelled';
  estimatedCost: string;
  notes: string;
}

interface EventManagementData {
  // Core Event Info (from intake)
  eventId: string;
  eventType: EventType;
  eventName: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  
  // Client Info
  clientName: string;
  clientEmail: string;
  clientPhone: string;
  clientStatus: ClientStatus;
  
  // Guest Info
  estimatedGuests: number;
  confirmedGuests: number;
  
  // Contract & Legal
  contractStatus: ContractStatus;
  contractSignedDate: string;
  contractAmount: string;
  depositAmount: string;
  depositPaid: boolean;
  depositPaidDate: string;
  balanceDue: string;
  balanceDueDate: string;
  
  // Insurance
  insuranceStatus: InsuranceStatus;
  insuranceProvider: string;
  insurancePolicyNumber: string;
  insuranceExpiryDate: string;
  certificateReceived: boolean;
  
  // Security
  securityRequired: boolean;
  securityCompany: string;
  securityContactName: string;
  securityContactPhone: string;
  numberOfSecurityStaff: number;
  
  // Door List
  doorListLink: string;
  doorListLastUpdated: string;
  
  // Venue Details
  venueSetup: string;
  setupTime: string;
  breakdownTime: string;
  indoorOutdoor: string;
  
  // Vendors
  vendors: VendorContact[];
  
  // Notes & Special Requirements
  specialRequests: string;
  allergies: string;
  accessibility: string;
  internalNotes: string;
}

const contractStatusLabels: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'Draft',
  [ContractStatus.SENT]: 'Sent to Client',
  [ContractStatus.SIGNED]: 'Signed',
  [ContractStatus.CANCELLED]: 'Cancelled',
};

const contractStatusColors: Record<ContractStatus, string> = {
  [ContractStatus.DRAFT]: 'bg-gray-100 text-gray-800',
  [ContractStatus.SENT]: 'bg-blue-100 text-blue-800',
  [ContractStatus.SIGNED]: 'bg-green-100 text-green-800',
  [ContractStatus.CANCELLED]: 'bg-red-100 text-red-800',
};

const insuranceStatusLabels: Record<InsuranceStatus, string> = {
  [InsuranceStatus.NOT_REQUIRED]: 'Not Required',
  [InsuranceStatus.REQUESTED]: 'Requested',
  [InsuranceStatus.RECEIVED]: 'Received',
  [InsuranceStatus.VERIFIED]: 'Verified',
  [InsuranceStatus.EXPIRED]: 'Expired',
};

const insuranceStatusColors: Record<InsuranceStatus, string> = {
  [InsuranceStatus.NOT_REQUIRED]: 'bg-gray-100 text-gray-800',
  [InsuranceStatus.REQUESTED]: 'bg-yellow-100 text-yellow-800',
  [InsuranceStatus.RECEIVED]: 'bg-blue-100 text-blue-800',
  [InsuranceStatus.VERIFIED]: 'bg-green-100 text-green-800',
  [InsuranceStatus.EXPIRED]: 'bg-red-100 text-red-800',
};

const clientStatusLabels: Record<ClientStatus, string> = {
  [ClientStatus.CONTACTED_BY_PHONE]: 'Contacted by Phone',
  [ClientStatus.WALKTHROUGH_COMPLETED]: 'Walkthrough Completed',
  [ClientStatus.BOOKED]: 'Booked',
  [ClientStatus.DEPOSIT_PAID]: 'Deposit Paid',
  [ClientStatus.COMPLETED]: 'Completed',
  [ClientStatus.CANCELLED]: 'Cancelled',
};

export default function EventManagementPage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showVendorPicker, setShowVendorPicker] = useState(false);
  const [vendorPickerList, setVendorPickerList] = useState<any[]>([]);
  const [vendorPickerSearch, setVendorPickerSearch] = useState('');
  const [vendorPickerLoading, setVendorPickerLoading] = useState(false);
  const [eventInvoices, setEventInvoices] = useState<any[]>([]);
  const [eventEstimates, setEventEstimates] = useState<any[]>([]);
  const [eventContracts, setEventContracts] = useState<any[]>([]);
  const [intakeFormActivated, setIntakeFormActivated] = useState(false);
  const [intakeFormId, setIntakeFormId] = useState<string | null>(null);
  const [guestListId, setGuestListId] = useState<number | null>(null);
  const [formData, setFormData] = useState<EventManagementData>({
    eventId: '',
    eventType: EventType.WEDDING_RECEPTION,
    eventName: '',
    eventDate: '',
    startTime: '',
    endTime: '',
    clientName: '',
    clientEmail: '',
    clientPhone: '',
    clientStatus: ClientStatus.CONTACTED_BY_PHONE,
    estimatedGuests: 0,
    confirmedGuests: 0,
    contractStatus: ContractStatus.DRAFT,
    contractSignedDate: '',
    contractAmount: '',
    depositAmount: '',
    depositPaid: false,
    depositPaidDate: '',
    balanceDue: '',
    balanceDueDate: '',
    insuranceStatus: InsuranceStatus.NOT_REQUIRED,
    insuranceProvider: '',
    insurancePolicyNumber: '',
    insuranceExpiryDate: '',
    certificateReceived: false,
    securityRequired: false,
    securityCompany: '',
    securityContactName: '',
    securityContactPhone: '',
    numberOfSecurityStaff: 0,
    doorListLink: '',
    doorListLastUpdated: '',
    venueSetup: '',
    setupTime: '',
    breakdownTime: '',
    indoorOutdoor: '',
    vendors: [],
    specialRequests: '',
    allergies: '',
    accessibility: '',
    internalNotes: '',
  });

  useEffect(() => {
    loadEventData();
  }, [eventId]);

  const loadEventData = async () => {
    try {
      const [eventResponse, managementResponse] = await Promise.all([
        api.get(`/events/${eventId}`),
        api.get(`/events/${eventId}/management`).catch(() => ({ data: {} })),
      ]);
      const event = eventResponse.data;
      const mgmt = managementResponse.data || {};
      setFormData(prev => ({
        ...prev,
        eventId: eventId,
        eventName: event.intakeEventName || event.name || '',
        clientName: event.clientName || prev.clientName || '',
        eventType: event.eventType || EventType.WEDDING_RECEPTION,
        eventDate: event.date || '',
        startTime: event.startTime || '',
        endTime: event.endTime || '',
        venue: event.venue || '',
        // Restore saved management fields
        vendors: mgmt.vendors || [],
        clientEmail: mgmt.clientEmail || '',
        clientPhone: mgmt.clientPhone || '',
        clientStatus: mgmt.clientStatus || ClientStatus.CONTACTED_BY_PHONE,
        estimatedGuests: mgmt.estimatedGuests || 0,
        confirmedGuests: mgmt.confirmedGuests || 0,
        contractStatus: mgmt.contractStatus || ContractStatus.DRAFT,
        contractSignedDate: mgmt.contractSignedDate || '',
        contractAmount: mgmt.contractAmount || '',
        depositAmount: mgmt.depositAmount || '',
        depositPaid: mgmt.depositPaid || false,
        depositPaidDate: mgmt.depositPaidDate || '',
        balanceDue: mgmt.balanceDue || '',
        balanceDueDate: mgmt.balanceDueDate || '',
        insuranceStatus: mgmt.insuranceStatus || InsuranceStatus.NOT_REQUIRED,
        insuranceProvider: mgmt.insuranceProvider || '',
        insurancePolicyNumber: mgmt.insurancePolicyNumber || '',
        insuranceExpiryDate: mgmt.insuranceExpiryDate || '',
        certificateReceived: mgmt.certificateReceived || false,
        securityRequired: mgmt.securityRequired || false,
        securityCompany: mgmt.securityCompany || '',
        securityContactName: mgmt.securityContactName || '',
        securityContactPhone: mgmt.securityContactPhone || '',
        numberOfSecurityStaff: mgmt.numberOfSecurityStaff || 0,
        doorListLink: mgmt.doorListLink || '',
        doorListLastUpdated: mgmt.doorListLastUpdated || '',
        venueSetup: mgmt.venueSetup || '',
        setupTime: mgmt.setupTime || '',
        breakdownTime: mgmt.breakdownTime || '',
        indoorOutdoor: mgmt.indoorOutdoor || '',
        specialRequests: mgmt.specialRequests || '',
        allergies: mgmt.allergies || '',
        accessibility: mgmt.accessibility || '',
        internalNotes: mgmt.internalNotes || '',
      }));
      setIntakeFormId(event.intakeFormId || null);
      // Activate step is done when the intake form has been converted (lead activated),
      // or if this event has no linked intake form (created directly)
      setIntakeFormActivated(!event.intakeFormId || event.intakeFormStatus === 'converted');
      loadEventInvoices(event.bookingId, event.clientName, event.intakeFormId);
      loadEventEstimates(event.intakeFormId);
      loadEventContracts(event.intakeFormId);
      loadGuestList();
    } catch (error) {
      console.error('Error loading event data:', error);
      alert('Unable to load event data. Please try again.');
    }
  };

  const loadGuestList = async () => {
    try {
      const res = await api.get('/guest-lists');
      const all: any[] = res.data || [];
      const match = all.find((gl: any) => String(gl.event_id) === String(eventId));
      setGuestListId(match ? match.id : null);
    } catch {
      // guest list is supplementary
    }
  };

  const loadEventEstimates = async (intakeFormId?: string) => {
    try {
      if (intakeFormId) {
        const res = await api.get('/estimates', { params: { intakeFormId } });
        setEventEstimates(res.data || []);
      } else {
        // No intake form — fetch all estimates and filter by booking.event_id
        const res = await api.get('/estimates');
        const all: any[] = res.data || [];
        setEventEstimates(all.filter((e: any) => e.booking?.event_id === eventId));
      }
    } catch {
      // estimates are supplementary
    }
  };

  const loadEventContracts = async (intakeFormId?: string) => {
    try {
      const res = await api.get('/contracts');
      const all: any[] = res.data || [];
      const matched = all.filter((c: any) =>
        c.event_id === eventId || (intakeFormId && c.intake_form_id === intakeFormId)
      );
      setEventContracts(matched);
    } catch {
      // ignore — contract status is supplementary
    }
  };

  const loadEventInvoices = async (bookingId?: string, clientName?: string, intakeFormId?: string) => {
    try {
      const res = await api.get('/invoices');
      const all: any[] = res.data || [];
      let matched: any[] = [];
      // 1. Match by event_id (most accurate)
      matched = all.filter((inv) => inv.event_id && inv.event_id === eventId);
      // 2. Match by intake_form_id
      if (matched.length === 0 && intakeFormId) {
        matched = all.filter((inv) => inv.intake_form_id === intakeFormId);
      }
      // 3. Fall back to booking_id
      if (matched.length === 0 && bookingId) {
        matched = all.filter((inv) => inv.booking_id === bookingId);
      }
      // 4. Fall back to client name (event name contains client name)
      if (matched.length === 0 && clientName) {
        matched = all.filter((inv) =>
          inv.client_name && clientName.toLowerCase().includes((inv.client_name || '').toLowerCase())
        );
      }
      setEventInvoices(matched);
    } catch {
      // ignore — invoice status is supplementary
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleVendorChange = (index: number, field: keyof VendorContact, value: string) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.map((vendor, i) => 
        i === index ? { ...vendor, [field]: value } : vendor
      )
    }));
  };

  const addVendor = () => {
    setFormData(prev => ({
      ...prev,
      vendors: [
        ...prev.vendors,
        {
          category: 'other',
          companyName: '',
          contactPerson: '',
          phone: '',
          email: '',
          contractStatus: 'pending',
          estimatedCost: '',
          notes: ''
        }
      ]
    }));
  };

  const removeVendor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vendors: prev.vendors.filter((_, i) => i !== index)
    }));
  };

  const openVendorPicker = async () => {
    setShowVendorPicker(true);
    setVendorPickerSearch('');
    setVendorPickerLoading(true);
    try {
      const res = await api.get('/vendors/search?limit=100');
      setVendorPickerList(res.data?.vendors || res.data || []);
    } catch {
      setVendorPickerList([]);
    } finally {
      setVendorPickerLoading(false);
    }
  };

  const addVendorFromDirectory = (v: any) => {
    const categoryMap: Record<string, VendorContact['category']> = {
      catering: 'catering', decoration: 'decoration', decor: 'decoration',
      music: 'music', dj: 'music', photography: 'photography', photo: 'photography',
      videography: 'videography', video: 'videography', security: 'security',
      valet: 'valet',
    };
    const cat = categoryMap[(v.category || '').toLowerCase()] || 'other';
    setFormData(prev => ({
      ...prev,
      vendors: [
        ...prev.vendors,
        {
          category: cat,
          companyName: v.business_name || '',
          contactPerson: v.contact_name || '',
          phone: v.phone || '',
          email: v.email || '',
          contractStatus: 'pending',
          estimatedCost: '',
          notes: '',
        },
      ],
    }));
    setShowVendorPicker(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await api.put(`/events/${eventId}/management`, formData);
      setIsEditing(false);
      alert('Event management data saved successfully!');
    } catch (error) {
      console.error('Error saving event management data:', error);
      alert('Error saving data. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
      return;
    }
    setIsDeleting(true);
    try {
      await api.delete(`/events/${eventId}`);
      alert('Event deleted successfully!');
      router.push('/dashboard/events');
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Error deleting event. Please try again.');
      setIsDeleting(false);
    }
  };

  const getVendorIcon = (category: string) => {
    switch (category) {
      case 'catering': return <UtensilsCrossed className="h-5 w-5" />;
      case 'decoration': return <Flower2 className="h-5 w-5" />;
      case 'music': return <Music className="h-5 w-5" />;
      case 'photography': return <Camera className="h-5 w-5" />;
      case 'videography': return <Camera className="h-5 w-5" />;
      case 'security': return <Shield className="h-5 w-5" />;
      case 'valet': return <Car className="h-5 w-5" />;
      default: return <Briefcase className="h-5 w-5" />;
    }
  };

  const filteredPickerVendors = vendorPickerList.filter(v =>
    !vendorPickerSearch ||
    (v.business_name || '').toLowerCase().includes(vendorPickerSearch.toLowerCase()) ||
    (v.category || '').toLowerCase().includes(vendorPickerSearch.toLowerCase())
  );

  return (
    <div className="max-w-7xl mx-auto">
      {/* Vendor Directory Picker Modal */}
      {showVendorPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 flex flex-col max-h-[80vh]">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="font-bold text-gray-900 text-lg">Pick from Vendor Directory</h3>
              <button onClick={() => setShowVendorPicker(false)} className="text-gray-400 hover:text-gray-600 text-2xl leading-none">&times;</button>
            </div>
            <div className="p-4 border-b">
              <input
                type="text"
                placeholder="Search by name or category..."
                value={vendorPickerSearch}
                onChange={e => setVendorPickerSearch(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                autoFocus
              />
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {vendorPickerLoading ? (
                <div className="text-center py-8 text-gray-400">Loading vendors...</div>
              ) : filteredPickerVendors.length === 0 ? (
                <div className="text-center py-8 text-gray-400">No vendors found</div>
              ) : (
                filteredPickerVendors.map(v => (
                  <button
                    key={v.id}
                    onClick={() => addVendorFromDirectory(v)}
                    className="w-full text-left px-4 py-3 rounded-lg hover:bg-primary-50 border border-transparent hover:border-primary-200 transition-colors mb-1"
                  >
                    <p className="font-semibold text-gray-900 text-sm">{v.business_name}</p>
                    <p className="text-xs text-gray-500 capitalize">{v.category}{v.phone ? ` · ${v.phone}` : ''}{v.email ? ` · ${v.email}` : ''}</p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => router.push('/dashboard/events')}
            className="inline-flex items-center text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Events
          </button>
          {formData.clientName && (
            <>
              <p className="text-xs font-medium text-gray-400 uppercase tracking-widest text-center">Client</p>
              <p className="text-lg font-semibold text-primary-700 text-center">{formData.clientName}</p>
            </>
          )}
          <p className="text-xs font-medium text-gray-400 uppercase tracking-widest text-center mt-1">Event</p>
          <h1 className="text-2xl font-bold text-gray-900 text-center">{formData.eventName || 'Event Management'}</h1>
          <div className="flex justify-center gap-2 mt-4">
            {!isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(true)}
                  className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="inline-flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Booking Progress Bar */}
        {(() => {
          const estimateAccepted = eventEstimates.some(e => ['approved', 'converted'].includes(e.status));
          const contractSigned =
            formData.contractStatus === ContractStatus.SIGNED ||
            eventContracts.some((c: any) => c.status === 'signed');
          const invoiceSent = eventInvoices.some(inv => ['sent', 'partial', 'paid', 'overdue'].includes(inv.status));
          const invoicePaid = eventInvoices.some(inv => inv.status === 'paid');
          const booked = formData.depositPaid ||
            invoicePaid ||
            [ClientStatus.BOOKED, ClientStatus.DEPOSIT_PAID, ClientStatus.COMPLETED].includes(formData.clientStatus);

          const steps = [
            { label: 'Activate',  done: intakeFormActivated },
            { label: 'Estimate',  done: estimateAccepted },
            { label: 'Contract',  done: contractSigned },
            { label: 'Invoice',   done: invoiceSent },
            { label: 'Booked',    done: booked },
          ];

          const currentStepIndex = steps.findIndex(s => !s.done);

          const handleProgressAction = () => {
            if (!estimateAccepted) {
              router.push(`/dashboard/estimates/new?eventId=${eventId}${intakeFormId ? `&clientId=${intakeFormId}` : ''}`);
            } else if (!contractSigned) {
              router.push(`/dashboard/contracts/new${intakeFormId ? `?intakeFormId=${intakeFormId}` : ''}`);
            } else if (!invoiceSent) {
              router.push(`/dashboard/invoices/new?eventId=${eventId}`);
            }
          };

          const actionLabels = ['', 'Send Estimate', 'Send Contract', 'Send Invoice', ''];
          const actionLabel = currentStepIndex > 0 && currentStepIndex < 4 ? actionLabels[currentStepIndex] : null;

          return (
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-5 mb-6">
              <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-4">Booking Progress</h2>
              <div className="flex items-center w-full">
                {steps.map((step, i) => {
                  const isLast = i === steps.length - 1;
                  const isCurrent = i === currentStepIndex;
                  return (
                    <React.Fragment key={step.label}>
                      <div className="flex flex-col items-center min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center flex-shrink-0
                          ${step.done ? 'bg-green-500 text-white' : isCurrent ? 'bg-primary-600 text-white ring-4 ring-primary-100' : 'bg-gray-200 text-gray-400'}`}>
                          {step.done
                            ? <CheckCircle className="h-4 w-4" />
                            : <span className="text-xs font-bold">{i + 1}</span>}
                        </div>
                        <span className={`text-xs mt-1.5 font-medium text-center leading-tight
                          ${step.done ? 'text-green-600' : isCurrent ? 'text-primary-600' : 'text-gray-400'}`}>
                          {step.label}
                        </span>
                      </div>
                      {!isLast && (
                        <div className={`flex-1 h-1 mx-1 rounded-full mb-4
                          ${step.done ? 'bg-green-400' : 'bg-gray-200'}`} />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
              {actionLabel && (
                <div className="mt-4 flex justify-center">
                  <button
                    onClick={handleProgressAction}
                    className="inline-flex items-center px-5 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 font-medium text-sm shadow-sm"
                  >
                    {actionLabel} →
                  </button>
                </div>
              )}
              {currentStepIndex === 4 && !booked && (
                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <Clock className="h-3.5 w-3.5 mr-1.5" /> Awaiting Deposit Payment
                  </span>
                </div>
              )}
              {booked && (
                <div className="mt-4 flex justify-center">
                  <span className="inline-flex items-center px-4 py-1.5 rounded-full text-sm font-medium bg-green-100 text-green-700">
                    <CheckCircle className="h-3.5 w-3.5 mr-1.5" /> Booked!
                  </span>
                </div>
              )}
            </div>
          );
        })()}

        {/* Status Overview Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Client Status</p>
                <p className="text-lg font-semibold mt-1">{clientStatusLabels[formData.clientStatus]}</p>
              </div>
              <Users className="h-8 w-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Contract</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${contractStatusColors[formData.contractStatus]}`}>
                  {contractStatusLabels[formData.contractStatus]}
                </span>
              </div>
              <FileText className="h-8 w-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Insurance</p>
                <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 ${insuranceStatusColors[formData.insuranceStatus]}`}>
                  {insuranceStatusLabels[formData.insuranceStatus]}
                </span>
              </div>
              <Shield className="h-8 w-8 text-purple-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Balance Due</p>
                <p className="text-lg font-semibold mt-1">{formData.balanceDue}</p>
                <p className="text-xs text-gray-500">Due: {formData.balanceDueDate}</p>
              </div>
              <DollarSign className="h-8 w-8 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-100 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Invoice</p>
                {eventInvoices.length > 0 ? (
                  <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium mt-1 capitalize ${invoiceStatusColors[eventInvoices[0].status] || 'bg-gray-100 text-gray-700'}`}>
                    {eventInvoices[0].status}
                  </span>
                ) : (
                  <p className="text-sm text-gray-400 mt-1">None</p>
                )}
                {eventInvoices.length > 1 && (
                  <p className="text-xs text-gray-400">{eventInvoices.length} invoices</p>
                )}
              </div>
              <FileText className="h-8 w-8 text-teal-600" />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Left Column (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Event Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2 text-primary-600" />
                Event Details
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Name</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="eventName"
                      value={formData.eventName}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.eventName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Type</label>
                  <p className="text-gray-900">{formData.eventType.replace(/_/g, ' ')}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Event Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="eventDate"
                      value={formData.eventDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.eventDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Time</label>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input
                        type="time"
                        name="startTime"
                        value={formData.startTime}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                      <input
                        type="time"
                        name="endTime"
                        value={formData.endTime}
                        onChange={handleChange}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  ) : (
                    <p className="text-gray-900">{formatTime(formData.startTime)} - {formatTime(formData.endTime)}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Guests</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="estimatedGuests"
                      value={formData.estimatedGuests}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.estimatedGuests}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmed Guests</label>
                  {isEditing ? (
                    <input
                      type="number"
                      name="confirmedGuests"
                      value={formData.confirmedGuests}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.confirmedGuests}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Setup Time</label>
                  {isEditing ? (
                    <input
                      type="time"
                      name="setupTime"
                      value={formData.setupTime}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.setupTime}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Breakdown Time</label>
                  {isEditing ? (
                    <input
                      type="time"
                      name="breakdownTime"
                      value={formData.breakdownTime}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.breakdownTime}</p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Venue Setup</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="venueSetup"
                      value={formData.venueSetup}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.venueSetup}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Client Information */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <User className="h-5 w-5 mr-2 text-primary-600" />
                Client Information
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Name</label>
                  <p className="text-gray-900">{formData.clientName}</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Client Status</label>
                  {isEditing ? (
                    <select
                      name="clientStatus"
                      value={formData.clientStatus}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      {Object.values(ClientStatus).map((status) => (
                        <option key={status} value={status}>
                          {clientStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-gray-900">{clientStatusLabels[formData.clientStatus]}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <Mail className="h-4 w-4 mr-1" />
                    Email
                  </label>
                  <p className="text-gray-900">{formData.clientEmail}</p>
                </div>

                <div>
                  <label className="flex items-center text-sm font-medium text-gray-700 mb-1">
                    <Phone className="h-4 w-4 mr-1" />
                    Phone
                  </label>
                  <p className="text-gray-900">{formData.clientPhone}</p>
                </div>
              </div>
            </div>

            {/* Contract & Payment */}
            <div id="contract-section" className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Contract & Payment
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Status</label>
                  {isEditing ? (
                    <select
                      name="contractStatus"
                      value={formData.contractStatus}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      {Object.values(ContractStatus).map((status) => (
                        <option key={status} value={status}>
                          {contractStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${contractStatusColors[formData.contractStatus]}`}>
                      {contractStatusLabels[formData.contractStatus]}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Signed Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="contractSignedDate"
                      value={formData.contractSignedDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.contractSignedDate || 'Not signed'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contract Amount</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="contractAmount"
                      value={formData.contractAmount}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900 font-semibold">{formData.contractAmount}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Deposit Amount</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="depositAmount"
                      value={formData.depositAmount}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.depositAmount}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        name="depositPaid"
                        checked={formData.depositPaid}
                        onChange={handleChange}
                        className="mr-2 h-4 w-4"
                      />
                    ) : (
                      <span className="mr-2">
                        {formData.depositPaid ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </span>
                    )}
                    <span className="text-sm font-medium">Deposit Paid</span>
                  </label>
                  {formData.depositPaid && (
                    <p className="text-xs text-gray-500 mt-1">Paid: {formData.depositPaidDate}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Balance Due Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="balanceDueDate"
                      value={formData.balanceDueDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.balanceDueDate}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Insurance */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2 text-primary-600" />
                Insurance
              </h2>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Status</label>
                  {isEditing ? (
                    <select
                      name="insuranceStatus"
                      value={formData.insuranceStatus}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    >
                      {Object.values(InsuranceStatus).map((status) => (
                        <option key={status} value={status}>
                          {insuranceStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${insuranceStatusColors[formData.insuranceStatus]}`}>
                      {insuranceStatusLabels[formData.insuranceStatus]}
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Provider</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="insuranceProvider"
                      value={formData.insuranceProvider}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.insuranceProvider || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Policy Number</label>
                  {isEditing ? (
                    <input
                      type="text"
                      name="insurancePolicyNumber"
                      value={formData.insurancePolicyNumber}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.insurancePolicyNumber || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date</label>
                  {isEditing ? (
                    <input
                      type="date"
                      name="insuranceExpiryDate"
                      value={formData.insuranceExpiryDate}
                      onChange={handleChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.insuranceExpiryDate || 'N/A'}</p>
                  )}
                </div>

                <div>
                  <label className="flex items-center">
                    {isEditing ? (
                      <input
                        type="checkbox"
                        name="certificateReceived"
                        checked={formData.certificateReceived}
                        onChange={handleChange}
                        className="mr-2 h-4 w-4"
                      />
                    ) : (
                      <span className="mr-2">
                        {formData.certificateReceived ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600" />
                        )}
                      </span>
                    )}
                    <span className="text-sm font-medium">Certificate Received</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Vendor Contacts */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900 flex items-center">
                  <Briefcase className="h-5 w-5 mr-2 text-primary-600" />
                  Vendor Contacts
                </h2>
                {isEditing && (
                  <div className="flex gap-2">
                    <button
                      onClick={openVendorPicker}
                      className="px-3 py-1 bg-white border border-primary-600 text-primary-600 text-sm rounded-lg hover:bg-primary-50"
                    >
                      From Directory
                    </button>
                    <button
                      onClick={addVendor}
                      className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                    >
                      + Add Manual
                    </button>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                {formData.vendors.map((vendor, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center">
                        {getVendorIcon(vendor.category)}
                        <h3 className="ml-2 font-semibold text-gray-900">
                          {isEditing ? (
                            <select
                              value={vendor.category}
                              onChange={(e) => handleVendorChange(index, 'category', e.target.value)}
                              className="px-2 py-1 border border-gray-300 rounded"
                            >
                              <option value="catering">Catering</option>
                              <option value="decoration">Decoration</option>
                              <option value="music">Music/DJ</option>
                              <option value="photography">Photography</option>
                              <option value="videography">Videography</option>
                              <option value="security">Security</option>
                              <option value="valet">Valet</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            vendor.category.charAt(0).toUpperCase() + vendor.category.slice(1)
                          )}
                        </h3>
                      </div>
                      {isEditing && (
                        <button
                          onClick={() => removeVendor(index)}
                          className="text-red-600 hover:text-red-700 text-sm"
                        >
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Company Name</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={vendor.companyName}
                            onChange={(e) => handleVendorChange(index, 'companyName', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{vendor.companyName}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Contact Person</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={vendor.contactPerson}
                            onChange={(e) => handleVendorChange(index, 'contactPerson', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{vendor.contactPerson}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Phone</label>
                        {isEditing ? (
                          <input
                            type="tel"
                            value={vendor.phone}
                            onChange={(e) => handleVendorChange(index, 'phone', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{vendor.phone}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Email</label>
                        {isEditing ? (
                          <input
                            type="email"
                            value={vendor.email}
                            onChange={(e) => handleVendorChange(index, 'email', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-sm text-gray-900">{vendor.email}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Contract Status</label>
                        {isEditing ? (
                          <select
                            value={vendor.contractStatus}
                            onChange={(e) => handleVendorChange(index, 'contractStatus', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          >
                            <option value="pending">Pending</option>
                            <option value="sent">Sent</option>
                            <option value="signed">Signed</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        ) : (
                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                            vendor.contractStatus === 'signed' ? 'bg-green-100 text-green-800' :
                            vendor.contractStatus === 'sent' ? 'bg-blue-100 text-blue-800' :
                            vendor.contractStatus === 'cancelled' ? 'bg-red-100 text-red-800' :
                            'bg-yellow-100 text-yellow-800'
                          }`}>
                            {vendor.contractStatus}
                          </span>
                        )}
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Estimated Cost</label>
                        {isEditing ? (
                          <input
                            type="text"
                            value={vendor.estimatedCost}
                            onChange={(e) => handleVendorChange(index, 'estimatedCost', e.target.value)}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-sm text-gray-900 font-semibold">{vendor.estimatedCost}</p>
                        )}
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                        {isEditing ? (
                          <textarea
                            value={vendor.notes}
                            onChange={(e) => handleVendorChange(index, 'notes', e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1 text-sm border border-gray-300 rounded"
                          />
                        ) : (
                          <p className="text-sm text-gray-600">{vendor.notes || 'No notes'}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {formData.vendors.length === 0 && (
                  <p className="text-center text-gray-500 py-4">No vendors added yet</p>
                )}
              </div>
            </div>

            {/* Special Requirements */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <AlertCircle className="h-5 w-5 mr-2 text-primary-600" />
                Special Requirements
              </h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Special Requests</label>
                  {isEditing ? (
                    <textarea
                      name="specialRequests"
                      value={formData.specialRequests}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.specialRequests || 'None'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Allergies / Dietary Restrictions</label>
                  {isEditing ? (
                    <textarea
                      name="allergies"
                      value={formData.allergies}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.allergies || 'None'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Accessibility Needs</label>
                  {isEditing ? (
                    <textarea
                      name="accessibility"
                      value={formData.accessibility}
                      onChange={handleChange}
                      rows={2}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                    />
                  ) : (
                    <p className="text-gray-900">{formData.accessibility || 'None'}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes (Not visible to client)</label>
                  {isEditing ? (
                    <textarea
                      name="internalNotes"
                      value={formData.internalNotes}
                      onChange={handleChange}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 bg-yellow-50"
                    />
                  ) : (
                    <p className="text-gray-900 bg-yellow-50 p-3 rounded">{formData.internalNotes || 'No internal notes'}</p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Security Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <Lock className="h-5 w-5 mr-2 text-primary-600" />
                Security
              </h2>

              <div className="space-y-4">
                <label className="flex items-center">
                  {isEditing ? (
                    <input
                      type="checkbox"
                      name="securityRequired"
                      checked={formData.securityRequired}
                      onChange={handleChange}
                      className="mr-2 h-4 w-4"
                    />
                  ) : (
                    <span className="mr-2">
                      {formData.securityRequired ? (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-400" />
                      )}
                    </span>
                  )}
                  <span className="text-sm font-medium">Security Required</span>
                </label>

                {formData.securityRequired && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Security Company</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="securityCompany"
                          value={formData.securityCompany}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{formData.securityCompany}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                      {isEditing ? (
                        <input
                          type="text"
                          name="securityContactName"
                          value={formData.securityContactName}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{formData.securityContactName}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                      {isEditing ? (
                        <input
                          type="tel"
                          name="securityContactPhone"
                          value={formData.securityContactPhone}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{formData.securityContactPhone}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Number of Staff</label>
                      {isEditing ? (
                        <input
                          type="number"
                          name="numberOfSecurityStaff"
                          value={formData.numberOfSecurityStaff}
                          onChange={handleChange}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        />
                      ) : (
                        <p className="text-sm text-gray-900">{formData.numberOfSecurityStaff}</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Door List */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <List className="h-5 w-5 mr-2 text-primary-600" />
                Door List
              </h2>

              <div className="space-y-3">
                {guestListId ? (
                  <button
                    onClick={() => router.push(`/dashboard/guest-lists/${guestListId}`)}
                    className="block w-full px-4 py-2 bg-primary-600 text-white text-center rounded-lg hover:bg-primary-700"
                  >
                    View Door List
                  </button>
                ) : (
                  <>
                    <p className="text-sm text-gray-500">No door list created for this event yet.</p>
                    <button
                      onClick={() => router.push(`/dashboard/guest-lists/new?eventId=${eventId}${intakeFormId ? `&intakeFormId=${intakeFormId}` : ''}`)}
                      className="block w-full px-4 py-2 bg-gray-100 text-gray-700 text-center rounded-lg hover:bg-gray-200 border border-gray-300"
                    >
                      Create Door List
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* Invoices */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
                <FileText className="h-5 w-5 mr-2 text-primary-600" />
                Invoices
              </h2>

              {eventInvoices.length > 0 ? (
                <div className="space-y-2 mb-3">
                  {eventInvoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                        <p className="text-xs text-gray-500">${Number(inv.total_amount || 0).toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${invoiceStatusColors[inv.status] || 'bg-gray-100 text-gray-700'}`}>
                          {inv.status}
                        </span>
                        <button
                          onClick={() => router.push(`/dashboard/invoices/${inv.id}`)}
                          className="text-primary-600 hover:text-primary-700 text-xs font-medium"
                        >
                          View
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-gray-500 mb-3">No invoices found for this event.</p>
              )}

              <button
                onClick={() => router.push(`/dashboard/invoices/new?eventId=${eventId}`)}
                className="w-full px-4 py-2 bg-teal-600 text-white text-sm rounded-lg hover:bg-teal-700 font-medium"
              >
                + Create Invoice
              </button>
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Quick Actions</h2>
              
              <div className="space-y-2">
                <button className="w-full px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 text-sm font-medium">
                  Send Contract
                </button>
                <button className="w-full px-4 py-2 bg-green-50 text-green-700 rounded-lg hover:bg-green-100 text-sm font-medium">
                  Request Insurance
                </button>
                <button className="w-full px-4 py-2 bg-purple-50 text-purple-700 rounded-lg hover:bg-purple-100 text-sm font-medium">
                  Send Payment Reminder
                </button>
                <button className="w-full px-4 py-2 bg-orange-50 text-orange-700 rounded-lg hover:bg-orange-100 text-sm font-medium">
                  Email Client
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );
}
