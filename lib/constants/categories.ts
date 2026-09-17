export const CATEGORY_KEYS = [
  'hiking',
  'beach',
  'waterfalls',
  'volcanoes',
  'wildlife',
  'surfing',
  'camping',
  'culture',
] as const;

export type CategoryKey = (typeof CATEGORY_KEYS)[number];
