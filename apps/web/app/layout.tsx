import { config } from '@fortawesome/fontawesome-svg-core';
import { Analytics } from '@vercel/analytics/react';
import { GeistMono } from 'geist/font/mono';
import type { Metadata } from 'next';
import { Instrument_Serif, Inter_Tight } from 'next/font/google';
import PlausibleProvider from 'next-plausible';
import { Toaster } from '@/components/ui/toaster';
import '@fortawesome/fontawesome-svg-core/styles.css';
import Footer from '@/components/Footer/Footer';
import Header from '@/components/Header/Header';
import LayoutWrap from '@/components/LayoutWrap/LayoutWrap';
import cn from '@/utils/cn';
import Providers from './providers';
import '@/global.css';

config.autoAddCss = false;

// Register design system fonts.
// Inter Tight = body + all UI/data. Instrument Serif = display headings only.
// Geist Mono = numerics where a mono figure reads better than tabular sans.
const interTight = Inter_Tight({
  subsets: ['latin'],
  variable: '--font-inter-tight',
  display: 'swap',
});

const instrumentSerif = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-instrument-serif',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Outside IR35 Jobs: Explore Top Contract Roles Across the UK',
  description:
    'Discover premier outside IR35 contract opportunities with Outside IR35 Jobs. Navigate the UK job market and connect with ideal contract roles that comply with IR35 regulations. Simplify your job search with tailored listings, streamlined applications, and crucial insights to secure your next contract position. Start your search today and advance your contracting career with confidence!',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <PlausibleProvider domain="outsideir35jobs.com" />
      </head>
      <body
        className={cn(
          'font-sans antialiased',
          interTight.variable,
          instrumentSerif.variable,
          GeistMono.variable,
        )}
      >
        <Providers>
          <LayoutWrap>
            <Header className="row-start-1 row-span-1" />
            <main className="row-start-2 row-span-1">{children}</main>
            <Footer />
          </LayoutWrap>
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
