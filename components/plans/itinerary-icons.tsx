import {
  ForkKnife,
  Bed,
  Car,
  Backpack,
  Camera,
  Airplane,
  Mountains,
  Sun,
  Compass,
  MapPin,
} from '@phosphor-icons/react';

export type ItineraryIconKey =
  | 'food'
  | 'lodging'
  | 'transport'
  | 'activity'
  | 'sightseeing'
  | 'flight'
  | 'hike'
  | 'beach'
  | 'explore';

export const ITINERARY_ICON_KEYS: ItineraryIconKey[] = [
  'food',
  'lodging',
  'transport',
  'activity',
  'sightseeing',
  'flight',
  'hike',
  'beach',
  'explore',
];

interface ItineraryIconProps {
  iconKey: string | null;
  size?: number;
  className?: string;
}

// A literal switch (each branch a statically-known JSX tag) rather than a
// lookup table of component references rendered as `<Icon />` — the React
// Compiler's lint rule (react-hooks/static-components) flags the latter as
// "creating a component during render", even though nothing dynamic is
// actually happening here.
export function ItineraryIcon({ iconKey, size = 16, className }: ItineraryIconProps) {
  const props = { size, weight: 'regular' as const, strokeWidth: 1.5, className };
  switch (iconKey) {
    case 'food':
      return <ForkKnife {...props} />;
    case 'lodging':
      return <Bed {...props} />;
    case 'transport':
      return <Car {...props} />;
    case 'activity':
      return <Backpack {...props} />;
    case 'sightseeing':
      return <Camera {...props} />;
    case 'flight':
      return <Airplane {...props} />;
    case 'hike':
      return <Mountains {...props} />;
    case 'beach':
      return <Sun {...props} />;
    case 'explore':
      return <Compass {...props} />;
    default:
      return <MapPin {...props} />;
  }
}
