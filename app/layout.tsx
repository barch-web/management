import type { Metadata } from 'next';
import {
  Plus_Jakarta_Sans,
  Public_Sans,
  JetBrains_Mono,
} from 'next/font/google';
import './globals.css';

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-display',
});

const publicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-sans',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
});

export const metadata: Metadata = {
  title: 'Aegis Vanguard — Security Operations & Company Management System',
  description:
    'Enterprise security services management system for manned guarding, industrial security, Cash-in-Transit (CIT), valuable transport, CCTV surveillance, event security, and asset protection with strict RBAC and Supabase RLS architecture.',
  openGraph: {
    title: 'Aegis Vanguard — Security Operations & Company Management System',
    description:
      'Enterprise security services management system for manned guarding, industrial security, Cash-in-Transit (CIT), valuable transport, CCTV surveillance, event security, and asset protection with strict RBAC and Supabase RLS architecture.',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Aegis Vanguard — Security Operations & Company Management System',
    description:
      'Enterprise security services management system for manned guarding, industrial security, Cash-in-Transit (CIT), valuable transport, CCTV surveillance, event security, and asset protection with strict RBAC and Supabase RLS architecture.',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${plusJakarta.variable} ${publicSans.variable} ${jetbrainsMono.variable}`}
    >
      <body
        suppressHydrationWarning
        className="bg-white text-slate-900 antialiased selection:bg-[#0B192C] selection:text-white"
      >
        {children}
      </body>
    </html>
  );
}
