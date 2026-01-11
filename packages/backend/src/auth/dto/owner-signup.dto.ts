export class OwnerSignupDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  businessName: string;
  phoneNumber?: string;
  
  // First venue (required)
  venueName: string;
  venueAddress?: string;
  venueCapacity?: number;
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
