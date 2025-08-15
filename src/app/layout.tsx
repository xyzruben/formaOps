import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ErrorBoundary } from '@/components/error-boundary';

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  preload: true,
});

export const metadata: Metadata = {
  title: 'FormaOps - AI-Native Prompt Management',
  description:
    'Professional prompt management platform for developers. Create, validate, and execute AI prompts with enterprise-grade monitoring.',
  keywords: ['AI', 'prompts', 'automation', 'development', 'LLM', 'OpenAI'],
  authors: [{ name: 'FormaOps' }],
  openGraph: {
    title: 'FormaOps - AI-Native Prompt Management',
    description: 'Professional prompt management platform for developers',
    type: 'website',
    locale: 'en_US',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
    },
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}): JSX.Element {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <ErrorBoundary>
          <main className="min-h-screen bg-background">{children}</main>
        </ErrorBoundary>
      </body>
    </html>
  );
}
