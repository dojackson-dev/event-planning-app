import InvoiceFormScreen from '@/components/role/InvoiceFormScreen';

export default function NewArtistInvoiceScreen() {
  return <InvoiceFormScreen apiBase="/artist-invoices" routeBase="/(tabs)/artist-invoices" />;
}
