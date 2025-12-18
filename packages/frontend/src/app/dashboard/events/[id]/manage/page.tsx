'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
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
import DashboardLayout from '@/components/DashboardLayout';
import api from '@/lib/api';
import { Event, EventType, ClientStatus, ContractStatus, InsuranceStatus } from '@/types';

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
      // Load event and associated management data
      const response = await api.get(`/events/${eventId}/management`);
      setFormData(response.data);
    } catch (error) {
      console.error('Error loading event management data:', error);
      // For now, set demo data
      setFormData({
        ...formData,
        eventId: eventId,
        eventName: 'Johnson Wedding Reception',
        eventType: EventType.WEDDING_RECEPTION,
        eventDate: '2025-12-15',
        startTime: '18:00',
        endTime: '23:00',
        clientName: 'Sarah Johnson',
        clientEmail: 'sarah.johnson@email.com',
        clientPhone: '555-0123',
        clientStatus: ClientStatus.DEPOSIT_PAID,
        estimatedGuests: 150,
        confirmedGuests: 142,
        contractStatus: ContractStatus.SIGNED,
        contractSignedDate: '2025-11-01',
        contractAmount: '$15,000',
        depositAmount: '$5,000',
        depositPaid: true,
        depositPaidDate: '2025-11-05',
        balanceDue: '$10,000',
        balanceDueDate: '2025-12-08',
        insuranceStatus: InsuranceStatus.VERIFIED,
        insuranceProvider: 'State Farm',
        insurancePolicyNumber: 'POL-12345',
        insuranceExpiryDate: '2025-12-31',
        certificateReceived: true,
        securityRequired: true,
        securityCompany: 'Elite Security Services',
        securityContactName: 'Mike Peterson',
        securityContactPhone: '555-0199',
        numberOfSecurityStaff: 2,
        doorListLink: '/dashboard/door-list/' + eventId,
        doorListLastUpdated: '2025-11-14',
        venueSetup: 'Round tables with dance floor',
        setupTime: '14:00',
        breakdownTime: '01:00',
        indoorOutdoor: 'Indoor',
        vendors: [
          {
            id: '1',
            category: 'catering',
            companyName: 'Gourmet Catering Co',
            contactPerson: 'Chef Antonio',
            phone: '555-0145',
            email: 'antonio@gourmetcatering.com',
            contractStatus: 'signed',
            estimatedCost: '$4,500',
            notes: 'Menu finalized - Italian cuisine'
          },
          {
            id: '2',
            category: 'music',
            companyName: 'DJ Premier Events',
            contactPerson: 'DJ Marcus',
            phone: '555-0167',
            email: 'marcus@djpremier.com',
            contractStatus: 'signed',
            estimatedCost: '$1,200',
            notes: 'Playing from 7pm-11pm'
          },
          {
            id: '3',
            category: 'photography',
            companyName: 'Moments Photography',
            contactPerson: 'Lisa Chen',
            phone: '555-0189',
            email: 'lisa@momentsphotos.com',
            contractStatus: 'signed',
            estimatedCost: '$2,800',
            notes: '8 hours coverage + album'
          }
        ],
        specialRequests: 'Gluten-free meal options for 12 guests',
        allergies: 'Nut allergies - 3 guests',
        accessibility: 'Wheelchair accessible entrance required',
        internalNotes: 'VIP client - previous booking last year. Extra attention to detail.'
      });
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

  return (
    <DashboardLayout>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{formData.eventName || 'Event Management'}</h1>
            <p className="text-sm text-gray-500 mt-1">Complete event planning and vendor coordination</p>
          </div>
          
          <div className="flex gap-2">
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

        {/* Status Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
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
                    <p className="text-gray-900">{formData.startTime} - {formData.endTime}</p>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
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
                  <button
                    onClick={addVendor}
                    className="px-3 py-1 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                  >
                    + Add Vendor
                  </button>
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
                <p className="text-sm text-gray-600">
                  Last Updated: {formData.doorListLastUpdated}
                </p>
                
                <a
                  href={formData.doorListLink}
                  className="block w-full px-4 py-2 bg-primary-600 text-white text-center rounded-lg hover:bg-primary-700"
                >
                  View Door List
                </a>

                {isEditing && (
                  <input
                    type="text"
                    name="doorListLink"
                    value={formData.doorListLink}
                    onChange={handleChange}
                    placeholder="Door list link"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                )}
              </div>
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
    </DashboardLayout>
  );
}
