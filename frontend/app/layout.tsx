import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Muertos.ai — Digital Ofrenda',
  description: 'A Día de los Muertos tribute platform powered by open-source AI. Create living memorials for your loved ones.',
  keywords: 'Día de los Muertos, ofrenda, memorial, AI, open-source, Gemma',
  openGraph: {
    title: 'Muertos.ai — Digital Ofrenda',
    description: 'Honor your loved ones with an AI-generated memorial — fully open-source, private, and forever.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap" rel="stylesheet" />
      </head>
      <body className="bg-altar-bg text-altar-candle min-h-screen">
        {/* Ambient candle glow overlay */}
        <div className="fixed inset-0 pointer-events-none" style={{
          background: 'radial-gradient(ellipse at 50% 80%, rgba(245,158,11,0.06) 0%, transparent 70%)'
        }} />
        {children}
      </body>
    </html>
  );
}
