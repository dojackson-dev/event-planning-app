export const EVENT_CATEGORIES = [
  'Music',
  'Festival',
  'Kid Friendly',
  'Sports',
  'Community',
  'Nightlife',
  'Arts & Culture',
  'Food & Drink',
] as const;

export const CATEGORY_ICONS: Record<string, string> = {
  Music: 'musical-notes',
  Festival: 'ribbon',
  'Kid Friendly': 'happy',
  Sports: 'football',
  Community: 'people',
  Nightlife: 'moon',
  'Arts & Culture': 'color-palette',
  'Food & Drink': 'restaurant',
};

export const APP_NAME = 'EventEcos';
export const SUPPORT_EMAIL = 'support@eventecos.com';
