import './globals.css';
import { Toaster } from 'sonner';
import type { Metadata, Viewport } from 'next';
import { VaultProvider } from '@/components/stealth/VaultContext';

export const metadata: Metadata = {
  title: 'Ludo Arena 3D — Classic Dice Game',
  description: 'Play classic Ludo board match online with friends or AI.',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Ludo Arena',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#090d16',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="bg-background text-ink antialiased min-h-dvh">
        <VaultProvider>
          <Toaster richColors position="top-center" theme="dark" />
          {children}
        </VaultProvider>
      </body>
    </html>
  );
}

