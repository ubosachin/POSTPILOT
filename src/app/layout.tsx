import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'PostPilot — AI Social Publisher SaaS',
  description:
    'Multi-tenant AI social publisher for Bluesky, X, and Quora with atomic scheduling, brand voice conditioning, and verified publisher adapters.',
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/favicon.png', sizes: '32x32', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: '/icon-512.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ colorScheme: 'light' }}>
      <head>
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="alternate icon" href="/logo.png" />
        <link rel="apple-touch-icon" href="/icon-512.png" />
      </head>
      <body>{children}</body>
    </html>
  );
}
