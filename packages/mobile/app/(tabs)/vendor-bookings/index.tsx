import BookingListScreen from '@/components/role/BookingListScreen';

export default function VendorBookingsScreen() {
  return (
    <BookingListScreen
      listPath="/vendors/bookings/mine"
      routeBase="/(tabs)/vendor-bookings"
      title="Bookings"
      emptyText="Booking requests from clients will show up here."
    />
  );
}
