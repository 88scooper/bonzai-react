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
  icons: {
    icon: "/Bonzai Logo - Alternate 2.png",
    shortcut: "/Bonzai Logo - Alternate 2.png",
    apple: "/Bonzai Logo - Alternate 2.png",
  },
};

export default function RootLayout({ children }) {
  // Temporarily bypass providers to test if they're blocking
  const BYPASS_PROVIDERS = process.env.NEXT_PUBLIC_BYPASS_PROVIDERS === 'true';
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const settings = localStorage.getItem('bonzai_settings');
                  let darkMode = false; // default to light mode
                  if (settings) {
                    const parsed = JSON.parse(settings);
                    if (parsed.darkMode === true) {
                      darkMode = true;
                    } else if (parsed.darkMode === null) {
                      // System preference
                      darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                    }
                    // If darkMode is false or undefined, keep darkMode = false (light mode)
                  }
                  // Apply or remove dark class immediately
                  const root = document.documentElement;
                  if (darkMode) {
                    root.classList.add('dark');
                    console.log('[DarkMode Script] Added .dark class to <html>');
                  } else {
                    root.classList.remove('dark');
                    console.log('[DarkMode Script] Removed .dark class from <html>');
                  }
                  // Verify it was applied
                  console.log('[DarkMode Script] Current classes:', root.className);
                } catch (e) {
                  // Ignore errors, ensure light mode on error
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${plusJakartaSans.variable} antialiased`}
      >
        {BYPASS_PROVIDERS ? children : <Providers>{children}</Providers>}
      </body>
    </html>
  );
}
