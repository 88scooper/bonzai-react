import { Geist, Geist_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import Providers from "@/context/Providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const plusJakartaSans = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta-sans",
  subsets: ["latin"],
  display: "swap",
  weight: ["300", "400", "500", "600", "700", "800"],
});

export const metadata = {
  title: "Bonzai",
  description: "Real estate investment management, reimagined.",
};

export default function RootLayout({ children }) {
  // Temporarily bypass providers to test if they're blocking
  const BYPASS_PROVIDERS = process.env.NEXT_PUBLIC_BYPASS_PROVIDERS === 'true';
  
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} antialiased`}
      >
        {BYPASS_PROVIDERS ? children : <Providers>{children}</Providers>}
      </body>
    </html>
  );
}
