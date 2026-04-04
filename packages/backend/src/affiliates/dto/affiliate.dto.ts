export class RegisterAffiliateDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export class LoginAffiliateDto {
  email: string;
  password: string;
}

export class UpdateAffiliateDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
}
