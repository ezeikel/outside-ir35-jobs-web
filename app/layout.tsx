import type { Metadata } from 'next';
import { Analytics } from '@vercel/analytics/react';
import { Open_Sans, Montserrat } from 'next/font/google';
import { config } from '@fortawesome/fontawesome-svg-core';
import PlausibleProvider from 'next-plausible';
import { Toaster } from '@/components/ui/toaster';
import '@fortawesome/fontawesome-svg-core/styles.css';
import cn from '@/utils/cn';
import Header from '@/components/Header/Header';
import LayoutWrap from '@/components/LayoutWrap/LayoutWrap';
import Providers from './providers';
import '@/global.css';

config.autoAddCss = false;

const openSans = Open_Sans({
  subsets: ['latin'],
  variable: '--font-open-sans',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  variable: '--font-montserrat',
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
        <PlausibleProvider domain="outsideir35.jobs" />
      </head>
      <body
        className={cn(
          'font-montserrat antialiased',
          openSans.variable,
          montserrat.variable,
        )}
      >
        <Providers>
          <LayoutWrap>
            <Header className="row-start-1 row-span-1" />
            <main className="row-start-2 row-span-1">{children}</main>
          </LayoutWrap>
        </Providers>
        <Toaster />
        <Analytics />
      </body>
    </html>
  );
}
