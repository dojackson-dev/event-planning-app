export type UserRole =
  | 'attendee'
  | 'promoter'
  | 'venue_owner'
  | 'vendor'
  | 'concierge'
  | 'admin';

export type UserProfile = {
  id: string;
  email: string;
  fullName?: string;
  phone?: string;
  role: UserRole;
  avatarUrl?: string;
  notificationsEnabled?: boolean;
};
