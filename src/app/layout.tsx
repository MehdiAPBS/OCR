import type {Metadata} from 'next';
import { Reem_Kufi } from 'next/font/google'; // Import Reem_Kufi
import './globals.css';
import { Toaster } from "@/components/ui/toaster";

// Load Reem Kufi font with specified weights
const reemKufi = Reem_Kufi({
  subsets: ['latin', 'arabic'], // Include 'arabic' for wider character support
  weight: ['400', '600'],      // Regular (400) and SemiBold (600)
  variable: '--font-reem-kufi', // CSS variable name
});

export const metadata: Metadata = {
  title: 'PDF Data Extractor',
  description: 'Extract data from PDFs using AI and edit it.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      {/* Apply the font variable to the body */}
      <body className={`${reemKufi.variable} font-sans antialiased`}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
