import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Deal Analyzer - CRE Evaluation Tool',
  description: 'Commercial real estate deal evaluation with AI-powered proforma analysis',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
