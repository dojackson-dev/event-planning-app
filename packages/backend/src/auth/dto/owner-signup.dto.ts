export class OwnerSignupDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phoneNumber?: string;
  smsOptIn?: boolean;
  referralCode?: string; // Affiliate referral code (e.g. ?ref=JOHN-AB1C2D)

  // First venue (required)
  venueName: string;
  venueAddress?: string;
  venueCity?: string;
  venueState?: string;
  venueZipCode?: string;
  venuePhone?: string;
  venueEmail?: string;
  venueCapacity?: number;
  venueDescription?: string;
}

export class OwnerLoginDto {
  email: string;
  password: string;
}

export class VerifyEmailDto {
  token: string;
  userId: string;
}

export class VerifyPhoneDto {
  userId: string;
  otp: string;
}
