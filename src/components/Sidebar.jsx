"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const navItems = [
  {
    href: "/portfolio-summary",
    label: "Portfolio",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    href: "/my-properties",
    label: "My Properties",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
      </svg>
    )
  },
  {
    href: "/data",
    label: "Data",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        {/* Database/Storage representation */}
        <rect x="4" y="6" width="16" height="4" rx="1" strokeWidth={2}/>
        <rect x="4" y="12" width="16" height="4" rx="1" strokeWidth={2}/>
        <rect x="4" y="18" width="16" height="4" rx="1" strokeWidth={2}/>
        
        {/* Data flow lines */}
        <path d="M8 8L8 10" strokeWidth={2} strokeLinecap="round"/>
        <path d="M10 8L10 10" strokeWidth={2} strokeLinecap="round"/>
        <path d="M12 8L12 10" strokeWidth={2} strokeLinecap="round"/>
        <path d="M14 8L14 10" strokeWidth={2} strokeLinecap="round"/>
        <path d="M16 8L16 10" strokeWidth={2} strokeLinecap="round"/>
        
        <path d="M8 14L8 16" strokeWidth={2} strokeLinecap="round"/>
        <path d="M10 14L10 16" strokeWidth={2} strokeLinecap="round"/>
        <path d="M12 14L12 16" strokeWidth={2} strokeLinecap="round"/>
        <path d="M14 14L14 16" strokeWidth={2} strokeLinecap="round"/>
        <path d="M16 14L16 16" strokeWidth={2} strokeLinecap="round"/>
        
        <path d="M8 20L8 22" strokeWidth={2} strokeLinecap="round"/>
        <path d="M10 20L10 22" strokeWidth={2} strokeLinecap="round"/>
        <path d="M12 20L12 22" strokeWidth={2} strokeLinecap="round"/>
        <path d="M14 20L14 22" strokeWidth={2} strokeLinecap="round"/>
        <path d="M16 20L16 22" strokeWidth={2} strokeLinecap="round"/>
      </svg>
    )
  },
  {
    href: "/analytics",
    label: "Analytics",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    )
  },
  {
    href: "/calculator",
    label: "Calculators",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
      </svg>
    )
  },
  {
    href: "/mortgages",
    label: "Mortgages",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
        <circle cx="12" cy="12" r="8.8"/>
        <text x="12" y="17.5" fontSize="13.2" textAnchor="middle" fill="currentColor" fontFamily="Arial, sans-serif" fontWeight="900">$</text>
      </svg>
    )
  },
  {
    href: "/calendar",
    label: "Calendar",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    )
  },
];

const adminNavItem = {
  href: "/admin",
  label: "Admin",
  icon: (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  )
};

export default function Sidebar({ isMobileMenuOpen, setIsMobileMenuOpen }) {
  const pathname = usePathname();
  const { isAdmin } = useAuth();

  const handleNavClick = () => {
    // Close mobile menu when navigation link is clicked
    if (setIsMobileMenuOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
        md:sticky md:top-0 md:translate-x-0 md:z-auto
        ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        w-64 bg-white dark:bg-neutral-950 border-r border-black/10 dark:border-white/10
        flex flex-col shadow-lg h-screen
      `}>
        <div className="px-6 py-6 border-b border-black/10 dark:border-white/10">
          <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">Bonzai</h1>
          
          {/* Close Button - Mobile Only */}
          <button
            onClick={() => setIsMobileMenuOpen(false)}
            className="md:hidden absolute top-4 right-4 p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
            aria-label="Close menu"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <nav className="flex-1 px-4 py-4">
          <ul className="space-y-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    prefetch={false}
                    onClick={handleNavClick}
                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                      isActive
                        ? "text-[#205A3E] dark:text-[#4ade80] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                        : "text-[#205A3E] dark:text-[#4ade80] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                    }`}
                  >
                    {item.icon}
                    <span className="font-medium">{item.label}</span>
                  </Link>
                </li>
              );
            })}
            {isAdmin && (
              <li>
                <Link
                  href={adminNavItem.href}
                  prefetch={false}
                  onClick={handleNavClick}
                  className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${
                    pathname === adminNavItem.href || pathname?.startsWith(adminNavItem.href + "/")
                      ? "text-[#205A3E] dark:text-[#4ade80] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                      : "text-[#205A3E] dark:text-[#4ade80] hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-gray-100"
                  }`}
                >
                  {adminNavItem.icon}
                  <span className="font-medium">{adminNavItem.label}</span>
                </Link>
              </li>
            )}
          </ul>
        </nav>
      </aside>
    </>
  );
}


