// src/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'RenewalRadar — Client Churn Prediction for Social Media Agencies',
  description:
    'Know which clients are about to quit before they do. Daily risk scores, AI intervention scripts, and revenue-at-risk calculations — delivered every morning at 8am.',
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://renewalradar.vercel.app'
  ),
  openGraph: {
    title: 'RenewalRadar',
    description: 'Client churn prediction for social media agencies.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=JetBrains+Mono:wght@400;500;600&family=Instrument+Serif:ital@0;1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}
