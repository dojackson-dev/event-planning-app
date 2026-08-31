// Shape returned by GET /promoter/profile — raw `promoter_accounts` row
// (PromoterService.getPromoterProfile does `.select('*')`), or null if the
// authenticated user has no promoter_accounts record yet.
export interface PromoterProfile {
  id: string;
  company_name: string | null;
  contact_name: string;
  email: string;
  phone: string | null;
  location: string | null;
  bio: string | null;
  website: string | null;
  instagram: string | null;
}
