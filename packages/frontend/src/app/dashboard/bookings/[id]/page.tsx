'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
import Link from 'next/link';

interface Booking {
  id: string;
  user_id: string;
  event_id: string;
  booking_date: string;
  status: string;
  total_amount?: number;
  deposit_amount?: number;
  payment_status?: string;
  notes?: string;
  special_requests?: string;
  contact_name?: string;
  contact_email?: string;
  contact_phone?: string;
  confirmed_at?: string;
  cancelled_at?: string;
  cancellation_reason?: string;
  created_at: string;
  updated_at: string;
}

export default function BookingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const [booking, setBooking] = useState<Booking | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchBooking = async () => {
      try {
        const token = localStorage.getItem('access_token');
        if (!token) {
          setError('Authentication required');
          setLoading(false);
          return;
        }

        const response = await axios.get(
          `http://localhost:3000/bookings/${params.id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        setBooking(response.data);
      } catch (err: any) {
        console.error('Failed to fetch booking:', err);
        if (err.response?.status === 401) {
          setError('Session expired. Please login again.');
        } else {
          setError(err.response?.data?.message || 'Failed to load booking');
        }
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchBooking();
    }
  }, [params.id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading booking details...</div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error || 'Booking not found'}</p>
          <Link
            href="/dashboard/bookings"
            className="text-red-600 hover:text-red-800 underline mt-2 inline-block"
          >
            Back to Bookings
          </Link>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800';
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'completed':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <Link
          href="/dashboard/bookings"
          className="text-primary-600 hover:text-primary-800 mb-4 inline-flex items-center"
        >
          ← Back to Bookings
        </Link>
        <div className="flex justify-between items-start mt-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Booking Details</h1>
            <p className="text-sm text-gray-500 mt-1">ID: {booking.id}</p>
          </div>
          <span
            className={`px-3 py-1 inline-flex text-sm leading-5 font-semibold rounded-full ${getStatusColor(
              booking.status
            )}`}
          >
            {booking.status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Booking Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Booking Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Booking Date</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(booking.booking_date).toLocaleDateString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Event ID</dt>
              <dd className="mt-1 text-sm text-gray-900">{booking.event_id}</dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Created</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(booking.created_at).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Last Updated</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {new Date(booking.updated_at).toLocaleString()}
              </dd>
            </div>
            {booking.confirmed_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Confirmed At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(booking.confirmed_at).toLocaleString()}
                </dd>
              </div>
            )}
            {booking.cancelled_at && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Cancelled At</dt>
                <dd className="mt-1 text-sm text-gray-900">
                  {new Date(booking.cancelled_at).toLocaleString()}
                </dd>
              </div>
            )}
          </dl>
        </div>

        {/* Payment Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Payment Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Total Amount</dt>
              <dd className="mt-1 text-sm text-gray-900">
                ${booking.total_amount?.toFixed(2) ?? '0.00'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Deposit Amount</dt>
              <dd className="mt-1 text-sm text-gray-900">
                ${booking.deposit_amount?.toFixed(2) ?? '0.00'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Payment Status</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {booking.payment_status || 'Not specified'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Contact Information */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Contact Information
          </h2>
          <dl className="space-y-3">
            <div>
              <dt className="text-sm font-medium text-gray-500">Name</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {booking.contact_name || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Email</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {booking.contact_email || 'Not provided'}
              </dd>
            </div>
            <div>
              <dt className="text-sm font-medium text-gray-500">Phone</dt>
              <dd className="mt-1 text-sm text-gray-900">
                {booking.contact_phone || 'Not provided'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Additional Details */}
        <div className="bg-white shadow rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Additional Details
          </h2>
          <dl className="space-y-3">
            {booking.notes && (
              <div>
                <dt className="text-sm font-medium text-gray-500">Notes</dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {booking.notes}
                </dd>
              </div>
            )}
            {booking.special_requests && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Special Requests
                </dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {booking.special_requests}
                </dd>
              </div>
            )}
            {booking.cancellation_reason && (
              <div>
                <dt className="text-sm font-medium text-gray-500">
                  Cancellation Reason
                </dt>
                <dd className="mt-1 text-sm text-gray-900 whitespace-pre-wrap">
                  {booking.cancellation_reason}
                </dd>
              </div>
            )}
            {!booking.notes && !booking.special_requests && !booking.cancellation_reason && (
              <p className="text-sm text-gray-500">No additional details provided</p>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
