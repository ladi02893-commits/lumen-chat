import './globals.css';
import { Toaster } from 'sonner';
import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Lumen — Private Conversations',
  description: 'Private, end-to-end authorized one-to-one chat.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Lumen',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#0b0f19',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-ink antialiased min-h-dvh">
        <Toaster richColors position="top-center" theme="dark" />
        {children}
      </body>
    </html>
  );
}
