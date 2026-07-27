export class PromoterInvoiceItemDto {
  description!: string;
  quantity!: number;
  unit_price!: number;
}

export class CreatePromoterInvoiceDto {
  client_name!: string;
  client_email!: string;
  client_phone?: string;
  issue_date!: string;
  due_date!: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  items!: PromoterInvoiceItemDto[];
}

export class UpdatePromoterInvoiceDto {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  issue_date?: string;
  due_date?: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
}
