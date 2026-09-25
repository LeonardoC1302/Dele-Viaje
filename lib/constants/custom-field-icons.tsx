import {
  // Route
  Path,
  Ruler,
  Mountains,
  ArrowUp,
  TrendUp,
  Footprints,
  PersonSimpleHike,
  Compass,
  MapPin,
  Stairs,
  Timer,
  Gauge,
  // Conditions
  Sun,
  CloudRain,
  Wind,
  Thermometer,
  Snowflake,
  Lightning,
  Waves,
  Moon,
  Umbrella,
  // Nature
  Tree,
  Leaf,
  Flower,
  Bird,
  PawPrint,
  Butterfly,
  Fish,
  Cactus,
  Island,
  // Gear
  Backpack,
  Tent,
  Sneaker,
  TShirt,
  Sunglasses,
  FirstAidKit,
  Camera,
  Binoculars,
  Drop,
  BatteryCharging,
  Campfire,
  // Logistics
  Car,
  Van,
  Bus,
  Boat,
  Airplane,
  Bicycle,
  Bed,
  ForkKnife,
  Coffee,
  Money,
  Wallet,
  Ticket,
  WifiHigh,
  Toilet,
  Users,
  Baby,
  Dog,
  ShieldCheck,
  Phone,
  Clock,
  Star,
  Info,
} from '@phosphor-icons/react/dist/ssr';
import type { Icon } from '@phosphor-icons/react';

/**
 * The icon vocabulary a host can attach to a custom detail field
 * (migration 0036).
 *
 * Deliberately a closed set rather than free text. Custom fields are
 * authored by hosts and rendered to everyone, so an open icon name
 * would be an untrusted string steering what we render; and a curated
 * list keeps a trip page looking like this product instead of like a
 * clipart board. Everything here is something a Costa Rican trip
 * actually measures — distance, gain, water, transport, what to wear.
 *
 * Icons come from `/dist/ssr` because custom fields render in a Server
 * Component (the trip page). The `Icon` type is type-only and is erased
 * at compile time, so it never crosses the client boundary. The picker
 * in the form is a Client Component and re-uses these same components,
 * which is fine — an SSR icon is an ordinary React component.
 *
 * Adding an icon: add it to a group below. The DB stores only the key
 * string, so nothing needs migrating. REMOVING one is the case to be
 * careful about — existing rows keep the old key, and `customFieldIcon`
 * returns null for an unknown key, so the field falls back to no icon
 * rather than breaking the page.
 */

export interface CustomFieldIconGroup {
  /** Key into the `customFieldIcons.groups` message namespace. */
  id: string;
  keys: string[];
}

const ICONS: Record<string, Icon> = {
  // Route
  path: Path,
  ruler: Ruler,
  mountains: Mountains,
  'arrow-up': ArrowUp,
  'trend-up': TrendUp,
  footprints: Footprints,
  hike: PersonSimpleHike,
  compass: Compass,
  'map-pin': MapPin,
  stairs: Stairs,
  timer: Timer,
  gauge: Gauge,
  // Conditions
  sun: Sun,
  'cloud-rain': CloudRain,
  wind: Wind,
  thermometer: Thermometer,
  snowflake: Snowflake,
  lightning: Lightning,
  waves: Waves,
  moon: Moon,
  umbrella: Umbrella,
  // Nature
  tree: Tree,
  leaf: Leaf,
  flower: Flower,
  bird: Bird,
  'paw-print': PawPrint,
  butterfly: Butterfly,
  fish: Fish,
  cactus: Cactus,
  island: Island,
  // Gear
  backpack: Backpack,
  tent: Tent,
  sneaker: Sneaker,
  tshirt: TShirt,
  sunglasses: Sunglasses,
  'first-aid-kit': FirstAidKit,
  camera: Camera,
  binoculars: Binoculars,
  drop: Drop,
  battery: BatteryCharging,
  campfire: Campfire,
  // Logistics
  car: Car,
  van: Van,
  bus: Bus,
  boat: Boat,
  airplane: Airplane,
  bicycle: Bicycle,
  bed: Bed,
  'fork-knife': ForkKnife,
  coffee: Coffee,
  money: Money,
  wallet: Wallet,
  ticket: Ticket,
  wifi: WifiHigh,
  toilet: Toilet,
  users: Users,
  baby: Baby,
  dog: Dog,
  'shield-check': ShieldCheck,
  phone: Phone,
  clock: Clock,
  star: Star,
  info: Info,
};

export const CUSTOM_FIELD_ICON_GROUPS: CustomFieldIconGroup[] = [
  {
    id: 'route',
    keys: [
      'path',
      'ruler',
      'mountains',
      'arrow-up',
      'trend-up',
      'footprints',
      'hike',
      'compass',
      'map-pin',
      'stairs',
      'timer',
      'gauge',
    ],
  },
  {
    id: 'conditions',
    keys: [
      'sun',
      'cloud-rain',
      'wind',
      'thermometer',
      'snowflake',
      'lightning',
      'waves',
      'moon',
      'umbrella',
    ],
  },
  {
    id: 'nature',
    keys: ['tree', 'leaf', 'flower', 'bird', 'paw-print', 'butterfly', 'fish', 'cactus', 'island'],
  },
  {
    id: 'gear',
    keys: [
      'backpack',
      'tent',
      'sneaker',
      'tshirt',
      'sunglasses',
      'first-aid-kit',
      'camera',
      'binoculars',
      'drop',
      'battery',
      'campfire',
    ],
  },
  {
    id: 'logistics',
    keys: [
      'car',
      'van',
      'bus',
      'boat',
      'airplane',
      'bicycle',
      'bed',
      'fork-knife',
      'coffee',
      'money',
      'wallet',
      'ticket',
      'wifi',
      'toilet',
      'users',
      'baby',
      'dog',
      'shield-check',
      'phone',
      'clock',
      'star',
      'info',
    ],
  },
];

/** Every key the server will accept — the source of truth for the Zod enum. */
export const CUSTOM_FIELD_ICON_KEYS = Object.keys(ICONS) as [string, ...string[]];

/**
 * Resolves a stored key to its component, or null when the key is
 * unknown — a field whose icon was retired still renders, just without
 * one. (Advisories fall back to a generic Warning instead, because an
 * advisory that renders without its marker is a safety problem; a
 * decorative detail icon is not.)
 */
export function customFieldIcon(key: string | null | undefined): Icon | null {
  if (!key) return null;
  return ICONS[key] ?? null;
}
