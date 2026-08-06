import InvoiceFormScreen from '@/components/role/InvoiceFormScreen';

export default function NewVendorInvoiceScreen() {
  return <InvoiceFormScreen apiBase="/vendor-invoices" routeBase="/(tabs)/vendor-invoices" />;
}
