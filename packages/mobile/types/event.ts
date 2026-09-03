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
  /** Where this event came from. Defaults to the platform's own listings. */
  source?: 'platform' | 'ticketmaster' | 'external';
  /** External ticketing/details URL, used when source is not 'platform'. */
  externalUrl?: string;
};
