import InvoiceListScreen from '@/components/role/InvoiceListScreen';

export default function PromoterInvoicesScreen() {
  return <InvoiceListScreen apiBase="/promoter-invoices" routeBase="/(tabs)/promoter-invoices" title="Invoices" />;
}
