import BookingDetailScreen from '@/components/role/BookingDetailScreen';

export default function PromoterBookingDetail() {
  return (
    <BookingDetailScreen
      apiBase="/promoter-bookings"
      statusOptions={['inquiry', 'estimate_sent', 'deposit_paid', 'confirmed', 'completed', 'cancelled']}
    />
  );
}
