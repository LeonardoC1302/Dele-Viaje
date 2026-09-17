import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Dele Viaje',
    short_name: 'Dele Viaje',
    description:
      'Encuentra o crea un viaje con la gente que quieras, por Costa Rica.',
    start_url: '/',
    display: 'standalone',
    background_color: '#FAFAF8',
    theme_color: '#1B4332',
    icons: [
      { src: '/icons/icon-192', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512', sizes: '512x512', type: 'image/png' },
    ],
  };
}
