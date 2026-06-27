import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'IHSI Client',
    short_name: 'IHSI',
    start_url: '/login',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#003087',
    orientation: 'portrait',
    icons: [
      { src: '/logo.svg', sizes: '192x192', type: 'image/svg+xml' },
      { src: '/logo.svg', sizes: '512x512', type: 'image/svg+xml' },
    ],
  };
}
