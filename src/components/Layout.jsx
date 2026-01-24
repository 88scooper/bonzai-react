"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { useAuth } from "@/context/AuthContext";
import Button from "@/components/Button";
import { LogOut, UserCircle, Settings } from "lucide-react";
import Footer from "@/components/Footer";

export default function Layout({ children }) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { user, logOut } = useAuth();
  const userMenuRef = useRef(null);

  // Close mobile menu when screen size changes to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setIsMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Close user menu dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setIsUserMenuOpen(false);
      }
    };

    if (isUserMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 dark:bg-gray-950 dark:text-gray-100">
      <div className="flex min-h-screen">
        <Sidebar isMobileMenuOpen={isMobileMenuOpen} setIsMobileMenuOpen={setIsMobileMenuOpen} />
        <div className="flex-1 flex flex-col bg-gray-50 dark:bg-[#030712]">
          <header className="sticky top-0 z-10 border-b border-gray-200 dark:border-gray-800 bg-white/70 dark:bg-gray-900/70 backdrop-blur-sm">
            <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {/* Hamburger Menu Button - Mobile Only */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5"
                  aria-label="Open menu"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>
                
                <span className="font-semibold tracking-tight">
                  Bonzai
                </span>
              </div>
              
              <div className="flex items-center gap-3">
                {/* User Profile Menu */}
                <div className="relative" ref={userMenuRef}>
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className="p-2 rounded-md hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    aria-label="User menu"
                  >
                    <UserCircle className="w-5 h-5 text-gray-600 dark:text-gray-300" />
                  </button>

                  {/* User Dropdown Menu */}
                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-neutral-900 rounded-lg shadow-lg border border-black/10 dark:border-white/10 py-2 z-50">
                      {/* User Info Section */}
                      <div className="px-4 py-3 border-b border-black/10 dark:border-white/10">
                        <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {user?.email || 'User'}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {user?.email}
                        </div>
                      </div>

                      {/* Menu Items */}
                      <div className="py-1">
                        <Link
                          href="/settings"
                          onClick={() => setIsUserMenuOpen(false)}
                          className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-3 transition-colors"
                        >
                          <Settings className="w-4 h-4" />
                          Settings
                        </Link>
                      </div>

                      {/* Logout Button */}
                      {user && (
                        <div className="px-4 py-2 border-t border-black/10 dark:border-white/10">
                          <button
                            onClick={async () => {
                              setIsUserMenuOpen(false);
                              await logOut();
                              window.location.replace('/');
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 flex items-center gap-3 transition-colors rounded-md"
                          >
                            <LogOut className="w-4 h-4" />
                            Sign Out
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-auto bg-gray-50 dark:bg-[#030712]">
            <div className="mx-auto w-full max-w-7xl px-4 py-6">{children}</div>
          </main>
          <Footer />
        </div>
      </div>
    </div>
  );
}


