import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'CardGenius - Smart Credit Card Optimizer',
  description: 'Zero-friction credit card spend analysis with automatic Gmail sync and AI-powered card recommendations',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}

