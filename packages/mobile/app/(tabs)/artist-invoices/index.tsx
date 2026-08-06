import InvoiceListScreen from '@/components/role/InvoiceListScreen';

export default function ArtistInvoicesScreen() {
  return <InvoiceListScreen apiBase="/artist-invoices" routeBase="/(tabs)/artist-invoices" title="Invoices" />;
}
