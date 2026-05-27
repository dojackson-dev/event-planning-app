// VIP Package DTOs

export class CreateVipSectionDto {
  name: string;
  description?: string;
  capacity?: number;
  display_order?: number;
}

export class CreateVipPackageDto {
  name: string;
  package_type?: string;
  description?: string;
  price: number;
  capacity?: number;
  included_tickets?: number;
  table_label?: string;
  inventory?: number;
  requires_concierge?: boolean;
  guest_names_required?: boolean;
  guests_arrive_separately?: boolean;
  service_notes?: string;
  section_id?: string;
}

export class UpdateVipPackageDto {
  name?: string;
  description?: string;
  price?: number;
  capacity?: number;
  included_tickets?: number;
  table_label?: string;
  inventory?: number;
  requires_concierge?: boolean;
  guest_names_required?: boolean;
  guests_arrive_separately?: boolean;
  service_notes?: string;
  section_id?: string;
  status?: string;
}

export class CreateVipServiceItemDto {
  name: string;
  category?: string;
  price?: number;
  inventory?: number;
  requires_approval?: boolean;
  department?: string;
  allow_special_request?: boolean;
  special_request_prompt?: string;
  notes?: string;
}

export class VipCheckoutDto {
  buyer_name?: string;
  buyer_email: string;
  buyer_phone?: string;
  service_items?: { service_item_id: string; quantity: number; special_request?: string }[];
  return_url?: string;
}

export class ScanVipDto {
  qr_code: string;
  check_in_mode?: 'full' | 'single'; // full = check in all guests, single = +1
}

export class AssignConciergeDto {
  concierge_user_id: string;
}

export class CreateVipConciergeDto {
  name: string;
  phone: string;
}

export class UpdateServiceOrderDto {
  status: string;
  assigned_to?: string;
  notes?: string;
}
