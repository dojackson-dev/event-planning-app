export class VendorEstimateItemDto {
  description!: string;
  quantity!: number;
  unit_price!: number;
}

export class CreateVendorEstimateDto {
  client_name!: string;
  client_email?: string;
  client_phone?: string;
  issue_date!: string;
  expiration_date!: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string;
  terms?: string;
  vendor_booking_id?: string;
  items!: VendorEstimateItemDto[];
}

export class UpdateVendorEstimateDto {
  client_name?: string;
  client_email?: string | null;
  client_phone?: string | null;
  issue_date?: string;
  expiration_date?: string;
  tax_rate?: number;
  discount_amount?: number;
  notes?: string | null;
  terms?: string | null;
  /** When present, replaces every line item on the estimate. */
  items?: VendorEstimateItemDto[];
}

export class ConvertVendorEstimateDto {
  due_date?: string;
}
