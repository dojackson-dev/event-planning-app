import InvoiceListScreen from '@/components/role/InvoiceListScreen';

export default function VendorInvoicesScreen() {
  return <InvoiceListScreen apiBase="/vendor-invoices" routeBase="/(tabs)/vendor-invoices" title="Invoices" />;
}
