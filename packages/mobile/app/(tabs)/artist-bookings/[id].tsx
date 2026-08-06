import BookingDetailScreen from '@/components/role/BookingDetailScreen';

export default function ArtistBookingDetail() {
  return (
    <BookingDetailScreen
      apiBase="/artist-bookings"
      statusOptions={['inquiry', 'estimate_sent', 'deposit_paid', 'confirmed', 'completed', 'cancelled']}
    />
  );
}
