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
    icon: "/icon.png",
    shortcut: "/icon.png",
    apple: "/icon.png",
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
                  let darkMode = false;
                  
                  // This logic MUST match applyDarkMode() in settings-storage.js exactly
                  if (settings) {
                    const parsed = JSON.parse(settings);
                    if (parsed.darkMode === true) {
                      // Explicit dark mode
                      darkMode = true;
                    } else if (parsed.darkMode === null) {
                      // System preference - check matchMedia
                      darkMode = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
                    }
                    // If parsed.darkMode === false, darkMode remains false
                  }
                  
                  const root = document.documentElement;
                  if (darkMode) {
                    root.classList.add('dark');
                    root.setAttribute('data-dark-mode-applied', 'true');
                  } else {
                    root.classList.remove('dark');
                    root.setAttribute('data-dark-mode-applied', 'false');
                  }
                } catch (e) {
                  // On error, default to light mode
                  const root = document.documentElement;
                  root.classList.remove('dark');
                  root.setAttribute('data-dark-mode-applied', 'false');
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
