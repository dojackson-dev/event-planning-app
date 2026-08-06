import InvoiceFormScreen from '@/components/role/InvoiceFormScreen';

export default function NewPromoterInvoiceScreen() {
  return <InvoiceFormScreen apiBase="/promoter-invoices" routeBase="/(tabs)/promoter-invoices" />;
}
