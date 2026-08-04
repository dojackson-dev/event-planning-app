export type EventCategory =
  | 'Music'
  | 'Festival'
  | 'Kid Friendly'
  | 'Sports'
  | 'Community'
  | 'Nightlife'
  | 'Arts & Culture'
  | 'Food & Drink';

export type Event = {
  id: string;
  title: string;
  description?: string;
  category: string;
  imageUrl?: string;
  startDate: string;
  endDate?: string;
  venueId?: string;
  venueName?: string;
  address?: string;
  city?: string;
  state?: string;
  priceMin?: number;
  priceMax?: number;
  isFree?: boolean;
  hasVip?: boolean;
};
