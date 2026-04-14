export class CreatePromoterDto {
  companyName?: string;
  contactName: string;
  email: string;
  phone?: string;
  location?: string;
  bio?: string;
  website?: string;
  instagram?: string;
}

export class UpdatePromoterDto {
  companyName?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  location?: string;
  bio?: string;
  website?: string;
  instagram?: string;
}
