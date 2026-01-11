export class CreateInviteDto {
  email: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  ownerAccountId: string;
}

export class AcceptInviteDto {
  inviteToken: string;
  password?: string; // If creating new account
  smsOptIn: boolean; // Required consent
}

export class ClientSmsOptInDto {
  userId: string;
  phoneNumber: string;
  consentGiven: boolean;
  ipAddress?: string;
  userAgent?: string;
}
