import { renderAppIcon } from '@/lib/app-icon';

export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

export default function AppleIcon() {
  // No border radius here — iOS applies its own corner mask automatically.
  return renderAppIcon(180);
}
