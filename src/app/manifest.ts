import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Alvoun Field Operations',
    short_name: 'Alvoun',
    description: 'Field sales and route management app for Alvoun salesmen.',
    start_url: '/login',
    display: 'standalone',
    background_color: '#02060D',
    theme_color: '#02060D',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
