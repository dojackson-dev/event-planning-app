export class ArtistInvoiceItemDto {
  description!: string;
  quantity!: number;
  unit_price!: number;
}

export class CreateArtistInvoiceDto {
  client_name!: string;
  client_email!: string;
  client_phone?: string;
  issue_date!: string;
  due_date!: string;
  /** Fixed-dollar deposit; the client may pay this before the balance. */
  deposit_amount?: number | null;
  balance_due_date?: string | null;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  items!: ArtistInvoiceItemDto[];
}

export class UpdateArtistInvoiceDto {
  client_name?: string;
  client_email?: string;
  client_phone?: string;
  issue_date?: string;
  due_date?: string;
  deposit_amount?: number | null;
  balance_due_date?: string | null;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  status?: 'draft' | 'sent' | 'viewed' | 'paid' | 'overdue' | 'cancelled';
}
