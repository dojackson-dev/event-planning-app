import BookingDetailScreen from '@/components/role/BookingDetailScreen';

export default function VendorBookingDetail() {
  return (
    <BookingDetailScreen
      apiBase="/vendors/bookings"
      statusOptions={['pending', 'confirmed', 'declined', 'completed', 'cancelled']}
    />
  );
}
